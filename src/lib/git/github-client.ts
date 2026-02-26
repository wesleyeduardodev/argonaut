import type {
  GitProvider,
  GitServerConfig,
  Repository,
  Branch,
  PullRequest,
  PullRequestDetail,
  WorkflowRun,
} from "./types";

export class GitHubClient implements GitProvider {
  private baseUrl: string;
  private token: string;
  private defaultOwner?: string;

  constructor(config: GitServerConfig) {
    this.baseUrl = config.url.replace(/\/+$/, "");
    this.token = config.token;
    this.defaultOwner = config.defaultOwner;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 300)}`);
    }

    return res.json();
  }

  async searchRepositories(query: string, owner?: string): Promise<Repository[]> {
    const o = owner || this.defaultOwner;
    const q = o ? `${query}+org:${o}` : query;

    const data = await this.request<{ items: Array<Record<string, unknown>> }>(
      `/search/repositories?q=${encodeURIComponent(q)}&per_page=20&sort=updated`
    );

    return data.items.map((r) => ({
      name: r.name as string,
      fullName: r.full_name as string,
      description: (r.description as string) || null,
      private: r.private as boolean,
      defaultBranch: r.default_branch as string,
      url: r.html_url as string,
      language: (r.language as string) || null,
      updatedAt: r.updated_at as string,
    }));
  }

  async listBranches(owner: string, repo: string): Promise<Branch[]> {
    const data = await this.request<Array<Record<string, unknown>>>(
      `/repos/${owner}/${repo}/branches?per_page=100`
    );

    return data.map((b) => ({
      name: b.name as string,
      sha: (b.commit as Record<string, unknown>).sha as string,
      protected: b.protected as boolean,
    }));
  }

  async listPullRequests(owner: string, repo: string, state = "open"): Promise<PullRequest[]> {
    const data = await this.request<Array<Record<string, unknown>>>(
      `/repos/${owner}/${repo}/pulls?state=${state}&per_page=30&sort=updated&direction=desc`
    );

    return data.map((pr) => this.mapPullRequest(pr));
  }

  async getPullRequest(owner: string, repo: string, number: number): Promise<PullRequestDetail> {
    const pr = await this.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/pulls/${number}`
    );

    const base = this.mapPullRequest(pr);
    const requestedReviewers = pr.requested_reviewers as Array<Record<string, unknown>> || [];

    return {
      ...base,
      body: (pr.body as string) || null,
      additions: pr.additions as number,
      deletions: pr.deletions as number,
      changedFiles: pr.changed_files as number,
      merged: pr.merged as boolean,
      mergedAt: (pr.merged_at as string) || null,
      mergedBy: pr.merged_by ? ((pr.merged_by as Record<string, unknown>).login as string) : null,
      reviewers: requestedReviewers.map((r) => r.login as string),
      labels: ((pr.labels as Array<Record<string, unknown>>) || []).map((l) => l.name as string),
    };
  }

  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<PullRequest> {
    const pr = await this.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/pulls`,
      {
        method: "POST",
        body: JSON.stringify({ title, head, base, body: body || "" }),
      }
    );

    return this.mapPullRequest(pr);
  }

  async mergePullRequest(
    owner: string,
    repo: string,
    number: number,
    method = "merge"
  ): Promise<{ merged: boolean; message: string }> {
    const data = await this.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/pulls/${number}/merge`,
      {
        method: "PUT",
        body: JSON.stringify({ merge_method: method }),
      }
    );

    return {
      merged: data.merged as boolean,
      message: data.message as string,
    };
  }

  async listWorkflowRuns(owner: string, repo: string, branch?: string): Promise<WorkflowRun[]> {
    const params = branch ? `&branch=${encodeURIComponent(branch)}` : "";
    const data = await this.request<{ workflow_runs: Array<Record<string, unknown>> }>(
      `/repos/${owner}/${repo}/actions/runs?per_page=20${params}`
    );

    return data.workflow_runs.map((r) => this.mapWorkflowRun(r));
  }

  async getWorkflowRun(owner: string, repo: string, runId: number): Promise<WorkflowRun> {
    const r = await this.request<Record<string, unknown>>(
      `/repos/${owner}/${repo}/actions/runs/${runId}`
    );

    return this.mapWorkflowRun(r);
  }

  private mapPullRequest(pr: Record<string, unknown>): PullRequest {
    const user = pr.user as Record<string, unknown>;
    const base = pr.base as Record<string, unknown>;
    const head = pr.head as Record<string, unknown>;

    return {
      number: pr.number as number,
      title: pr.title as string,
      state: pr.state as string,
      author: user.login as string,
      baseBranch: base.ref as string,
      headBranch: head.ref as string,
      createdAt: pr.created_at as string,
      updatedAt: pr.updated_at as string,
      mergeable: pr.mergeable as boolean | null,
      draft: (pr.draft as boolean) || false,
    };
  }

  private mapWorkflowRun(r: Record<string, unknown>): WorkflowRun {
    const actor = r.actor as Record<string, unknown>;
    return {
      id: r.id as number,
      name: r.name as string,
      status: r.status as string,
      conclusion: (r.conclusion as string) || null,
      branch: r.head_branch as string,
      event: r.event as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
      url: r.html_url as string,
      actor: actor.login as string,
    };
  }
}
