import type { ArgoServerConfig } from "./types";

export interface BatchSyncProgress {
  phase:
    | "resolving"
    | "batch_start"
    | "syncing"
    | "polling"
    | "batch_complete"
    | "batch_failed"
    | "retrying"
    | "complete"
    | "aborted";
  totalApps: number;
  totalBatches: number;
  currentBatch: number;
  batchApps: string[];
  appStatuses: Record<string, { syncStatus: string; healthStatus: string }>;
  attempt: number;
  maxRetries: number;
  message: string;
}

export type OnBatchProgress = (progress: BatchSyncProgress) => void;

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

function globToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i");
}

export class ArgoClient {
  private baseUrl: string;
  private config: ArgoServerConfig;

  constructor(config: ArgoServerConfig) {
    this.baseUrl = config.url.replace(/\/+$/, "");
    this.config = config;
  }

  private async getToken(): Promise<string> {
    if (this.config.authType === "token" && this.config.token) {
      return this.config.token;
    }

    const cacheKey = `${this.baseUrl}:${this.config.username}`;
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const res = await this.rawFetch("/api/v1/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    if (!res.ok) {
      throw new Error(`ArgoCD login failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    tokenCache.set(cacheKey, {
      token: data.token,
      expiresAt: Date.now() + 23 * 60 * 60 * 1000,
    });

    return data.token;
  }

  private async rawFetch(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, { ...init });
  }

  private async request(path: string, init?: RequestInit): Promise<Response> {
    const token = await this.getToken();
    const res = await this.rawFetch(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`ArgoCD API error ${res.status}: ${text.slice(0, 500)}`);
    }

    return res;
  }

  // ─── Health Check ───

  async ping(): Promise<{ ok: boolean; latency: number }> {
    const start = Date.now();
    try {
      const result = await Promise.race([
        this.doPing(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 5000)
        ),
      ]);
      return { ok: result, latency: Date.now() - start };
    } catch {
      return { ok: false, latency: Date.now() - start };
    }
  }

  private async doPing(): Promise<boolean> {
    // Use /api/v1/applications with minimal fields — same endpoint
    // that chat tools and the test route use, so guaranteed to work
    // if the server is reachable and credentials are valid.
    await this.request("/api/v1/applications?fields=items.metadata.name");
    return true;
  }

  // ─── Applications ───

  async listApplications(): Promise<unknown> {
    const res = await this.request("/api/v1/applications");
    const data = await res.json();
    return (data.items || []).map((app: Record<string, unknown>) => {
      const meta = app.metadata as Record<string, unknown>;
      const spec = app.spec as Record<string, unknown>;
      const status = app.status as Record<string, unknown>;
      const sync = status?.sync as Record<string, unknown>;
      const health = status?.health as Record<string, unknown>;
      return {
        name: meta?.name,
        project: spec?.project,
        syncStatus: sync?.status,
        healthStatus: health?.status,
        healthMessage: health?.message,
      };
    });
  }

  async getApplication(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}`
    );
    return res.json();
  }

  // Ref: ApplicationSyncRequest { name, revision?, dryRun?, prune?, strategy?, ... }
  async syncApplication(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/sync`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          prune: false,
          dryRun: false,
        }),
      }
    );
    return res.json();
  }

  // Ref: ApplicationRollbackRequest { name, id, dryRun?, prune? }
  async rollbackApplication(name: string, id: number): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/rollback`,
      {
        method: "POST",
        body: JSON.stringify({
          name,
          id: String(id),
          dryRun: false,
          prune: false,
        }),
      }
    );
    return res.json();
  }

  // Ref: query params: podName?, container?, tailLines?, follow?, sinceSeconds?, ...
  async getApplicationLogs(
    name: string,
    container?: string,
    tailLines?: number
  ): Promise<string> {
    const params = new URLSearchParams();
    if (container) params.set("container", container);
    params.set("tailLines", String(tailLines || 100));
    params.set("follow", "false");

    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/logs?${params}`
    );
    const text = await res.text();
    // Logs come as NDJSON
    const lines = text
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          const parsed = JSON.parse(line);
          const result = parsed.result;
          if (result) {
            const ts = result.timeStamp
              ? new Date(result.timeStamp).toISOString().slice(11, 19)
              : "";
            const pod = result.podName || "";
            return `[${ts}] ${pod}: ${result.content || ""}`;
          }
          return line;
        } catch {
          return line;
        }
      });
    return lines.join("\n");
  }

  async getResourceTree(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/resource-tree`
    );
    return res.json();
  }

  async getManagedResources(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/managed-resources`
    );
    return res.json();
  }

  async getApplicationEvents(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/events`
    );
    return res.json();
  }

  async terminateOperation(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}/operation`,
      { method: "DELETE" }
    );
    return res.json();
  }

  // Ref: DELETE query params: cascade?, propagationPolicy?
  async deleteApplication(name: string): Promise<unknown> {
    const params = new URLSearchParams({ cascade: "true" });
    const res = await this.request(
      `/api/v1/applications/${encodeURIComponent(name)}?${params}`,
      { method: "DELETE" }
    );
    return res.json();
  }

  // ─── Restart (resource actions) ───
  // Ref: ResourceActionRunRequest { name, namespace, resourceName, version, group, kind, action }
  // v1 endpoint (body = plain string), v2 endpoint (body = object)
  async restartApplication(
    name: string,
    resourceName?: string,
    resourceKind?: string,
    waitHealthy?: boolean,
    healthTimeoutSeconds = 300
  ): Promise<unknown> {
    const app = (await this.getApplication(name)) as {
      metadata: { name: string };
      spec: { destination: { namespace: string } };
    };
    const namespace = app.spec?.destination?.namespace || "default";

    const tree = (await this.getResourceTree(name)) as {
      nodes: Array<{
        kind: string;
        group: string;
        name: string;
        namespace: string;
      }>;
    };

    let restartTargets = (tree.nodes || []).filter(
      (n) => n.kind === "Deployment" || n.kind === "StatefulSet"
    );

    // Filter by resource kind if specified
    if (resourceKind) {
      restartTargets = restartTargets.filter((n) => n.kind === resourceKind);
    }

    // Filter by resource name if specified (case-insensitive partial match)
    if (resourceName) {
      const search = resourceName.toLowerCase();
      restartTargets = restartTargets.filter((n) =>
        n.name.toLowerCase().includes(search)
      );
    }

    if (restartTargets.length === 0) {
      const filters = [];
      if (resourceName) filters.push(`name containing "${resourceName}"`);
      if (resourceKind) filters.push(`kind "${resourceKind}"`);
      const filterMsg = filters.length > 0
        ? ` matching ${filters.join(" and ")}`
        : "";
      throw new Error(
        `No Deployments or StatefulSets found${filterMsg} in application "${name}"`
      );
    }

    const results = [];
    for (const target of restartTargets) {
      const group = target.group || "apps";
      const ns = target.namespace || namespace;

      // Try v2 endpoint first (object body), fallback to v1 (string body)
      const params = new URLSearchParams({
        name: target.name,
        namespace: ns,
        resourceName: target.name,
        group,
        kind: target.kind,
        version: "v1",
      });

      try {
        // v2: body is JSON object with action field
        await this.request(
          `/api/v1/applications/${encodeURIComponent(name)}/resource/actions/v2?${params}`,
          {
            method: "POST",
            body: JSON.stringify({ action: "restart" }),
          }
        );
      } catch {
        // v1 fallback: body is plain string
        await this.request(
          `/api/v1/applications/${encodeURIComponent(name)}/resource/actions?${params}`,
          {
            method: "POST",
            body: JSON.stringify("restart"),
          }
        );
      }

      results.push({
        kind: target.kind,
        name: target.name,
        namespace: ns,
        status: "restarted",
      });
    }

    // If wait_healthy, poll until app is Healthy
    if (waitHealthy) {
      const POLL_INTERVAL = 10_000;
      const deadline = Date.now() + healthTimeoutSeconds * 1000;
      let healthy = false;

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        try {
          const appStatus = (await this.getApplication(name)) as {
            status: { health: { status: string } };
          };
          if (appStatus.status?.health?.status === "Healthy") {
            healthy = true;
            break;
          }
        } catch {
          // keep polling
        }
      }

      return {
        restarted: results,
        healthy,
        message: healthy
          ? `Application "${name}" restarted and healthy`
          : `Application "${name}" restarted but not healthy after ${healthTimeoutSeconds}s`,
      };
    }

    return { restarted: results };
  }

  // ─── Projects ───

  async listProjects(): Promise<unknown> {
    const res = await this.request("/api/v1/projects");
    const data = await res.json();
    return (data.items || []).map((p: Record<string, unknown>) => {
      const meta = p.metadata as Record<string, unknown>;
      const spec = p.spec as Record<string, unknown>;
      return {
        name: meta?.name,
        description: spec?.description || "",
      };
    });
  }

  async getProject(name: string): Promise<unknown> {
    const res = await this.request(
      `/api/v1/projects/${encodeURIComponent(name)}`
    );
    return res.json();
  }

  // ─── Clusters & Repos ───

  async listClusters(): Promise<unknown> {
    const res = await this.request("/api/v1/clusters");
    const data = await res.json();
    return (data.items || []).map((c: Record<string, unknown>) => {
      const conn = c.connectionState as Record<string, unknown>;
      const info = c.info as Record<string, unknown>;
      return {
        server: c.server,
        name: c.name,
        status: conn?.status,
        serverVersion: info?.serverVersion,
        applicationsCount: info?.applicationsCount,
      };
    });
  }

  async listRepositories(): Promise<unknown> {
    const res = await this.request("/api/v1/repositories");
    const data = await res.json();
    return (data.items || []).map((r: Record<string, unknown>) => {
      const conn = r.connectionState as Record<string, unknown>;
      return {
        repo: r.repo,
        type: r.type,
        status: conn?.status,
      };
    });
  }

  // ─── Batch Sync ───

  async batchSync(
    pattern: string | undefined,
    batchSize = 3,
    maxRetries = 2,
    healthTimeoutSeconds = 300,
    onProgress?: OnBatchProgress,
    apps?: string[]
  ): Promise<unknown> {
    const POLL_INTERVAL = 10_000; // 10s

    let appNames: string[];

    if (apps && apps.length > 0) {
      // Explicit app list — validate they exist
      const allApps = (await this.listApplications()) as Array<{
        name: string;
        syncStatus: string;
        healthStatus: string;
      }>;
      const allNames = new Set(allApps.map((a) => a.name));
      const notFound = apps.filter((a) => !allNames.has(a));
      if (notFound.length > 0) {
        return {
          success: false,
          error: `Applications not found: ${notFound.join(", ")}`,
          matchedApps: [],
        };
      }
      // Preserve the order the user specified
      appNames = apps;
    } else if (pattern) {
      // Glob pattern match
      const allApps = (await this.listApplications()) as Array<{
        name: string;
        syncStatus: string;
        healthStatus: string;
      }>;
      const regex = globToRegex(pattern);
      const matched = allApps
        .filter((a) => regex.test(a.name))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (matched.length === 0) {
        return {
          success: false,
          error: `No applications matching pattern "${pattern}"`,
          matchedApps: [],
        };
      }
      appNames = matched.map((a) => a.name);
    } else {
      return {
        success: false,
        error: "Either 'pattern' or 'apps' must be provided",
        matchedApps: [],
      };
    }

    const totalApps = appNames.length;

    // 2. Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < appNames.length; i += batchSize) {
      batches.push(appNames.slice(i, i + batchSize));
    }
    const totalBatches = batches.length;

    const emit = (
      phase: BatchSyncProgress["phase"],
      currentBatch: number,
      batchApps: string[],
      appStatuses: Record<string, { syncStatus: string; healthStatus: string }>,
      attempt: number,
      message: string
    ) => {
      onProgress?.({
        phase,
        totalApps,
        totalBatches,
        currentBatch,
        batchApps,
        appStatuses,
        attempt,
        maxRetries,
        message,
      });
    };

    emit("resolving", 0, [], {}, 0, `Found ${totalApps} apps matching "${pattern}", ${totalBatches} batches of ${batchSize}`);

    const completedApps: string[] = [];
    const failedApps: string[] = [];

    // 3. Process each batch
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchNum = batchIdx + 1;
      let batchSuccess = false;

      emit("batch_start", batchNum, batch, {}, 0, `Starting batch ${batchNum}/${totalBatches}: ${batch.join(", ")}`);

      for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        // Sync all apps in batch in parallel
        emit("syncing", batchNum, batch, {}, attempt, `Syncing batch ${batchNum}/${totalBatches} (attempt ${attempt}/${maxRetries + 1})`);

        const syncResults = await Promise.allSettled(
          batch.map((name) => this.syncApplication(name))
        );

        // Build initial statuses from sync results
        const appStatuses: Record<string, { syncStatus: string; healthStatus: string }> = {};
        for (let i = 0; i < batch.length; i++) {
          const name = batch[i];
          if (syncResults[i].status === "rejected") {
            const reason = syncResults[i] as PromiseRejectedResult;
            appStatuses[name] = {
              syncStatus: "SyncError",
              healthStatus: reason.reason?.message || "Sync failed",
            };
          } else {
            appStatuses[name] = { syncStatus: "Syncing", healthStatus: "Progressing" };
          }
        }

        emit("polling", batchNum, batch, appStatuses, attempt, `Waiting for batch ${batchNum} to become healthy...`);

        // Poll health until timeout
        const deadline = Date.now() + healthTimeoutSeconds * 1000;
        let allHealthy = false;

        while (Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL));

          // Check each app's health
          for (const name of batch) {
            try {
              const app = (await this.getApplication(name)) as {
                status: {
                  sync: { status: string };
                  health: { status: string };
                };
              };
              appStatuses[name] = {
                syncStatus: app.status?.sync?.status || "Unknown",
                healthStatus: app.status?.health?.status || "Unknown",
              };
            } catch {
              appStatuses[name] = { syncStatus: "Unknown", healthStatus: "Unknown" };
            }
          }

          const healthyCount = batch.filter(
            (n) => appStatuses[n].healthStatus === "Healthy"
          ).length;

          emit(
            "polling",
            batchNum,
            batch,
            appStatuses,
            attempt,
            `Batch ${batchNum}: ${healthyCount}/${batch.length} healthy`
          );

          if (healthyCount === batch.length) {
            allHealthy = true;
            break;
          }
        }

        if (allHealthy) {
          completedApps.push(...batch);
          emit("batch_complete", batchNum, batch, appStatuses, attempt, `Batch ${batchNum}/${totalBatches} complete — all healthy`);
          batchSuccess = true;
          break;
        }

        // Not all healthy — retry or fail
        if (attempt <= maxRetries) {
          emit("retrying", batchNum, batch, appStatuses, attempt, `Batch ${batchNum} not healthy after ${healthTimeoutSeconds}s — retrying (${attempt}/${maxRetries})`);
        } else {
          const unhealthy = batch.filter((n) => appStatuses[n].healthStatus !== "Healthy");
          failedApps.push(...unhealthy);
          emit("batch_failed", batchNum, batch, appStatuses, attempt, `Batch ${batchNum} failed after ${maxRetries + 1} attempts. Unhealthy: ${unhealthy.join(", ")}`);
        }
      }

      if (!batchSuccess) {
        // Abort remaining batches
        const remaining = batches.slice(batchIdx + 1).flat();
        emit("aborted", batchNum, batch, {}, maxRetries + 1, `Aborted at batch ${batchNum}/${totalBatches}. ${remaining.length} apps not attempted: ${remaining.join(", ")}`);

        return {
          success: false,
          completedApps,
          failedApps,
          skippedApps: remaining,
          totalApps,
          completedBatches: batchIdx,
          totalBatches,
          message: `Stopped at batch ${batchNum}/${totalBatches}. ${completedApps.length} apps synced, ${failedApps.length} failed, ${remaining.length} skipped.`,
        };
      }
    }

    // All batches completed successfully
    emit("complete", totalBatches, [], {}, 0, `All ${totalBatches} batches complete — ${totalApps} apps synced successfully`);

    return {
      success: true,
      completedApps,
      failedApps: [],
      skippedApps: [],
      totalApps,
      completedBatches: totalBatches,
      totalBatches,
      message: `All ${totalBatches} batches complete. ${totalApps} apps synced and healthy.`,
    };
  }
}
