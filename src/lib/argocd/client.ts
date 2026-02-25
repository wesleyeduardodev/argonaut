import type { ArgoServerConfig } from "./types";

const tokenCache = new Map<string, { token: string; expiresAt: number }>();

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
  async restartApplication(name: string): Promise<unknown> {
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

    const restartTargets = (tree.nodes || []).filter(
      (n) => n.kind === "Deployment" || n.kind === "StatefulSet"
    );

    if (restartTargets.length === 0) {
      throw new Error(
        `No Deployments or StatefulSets found in application "${name}"`
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
}
