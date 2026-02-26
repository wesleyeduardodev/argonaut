export interface GitServerConfig {
  platform: string;
  url: string;
  token: string;
  defaultOwner?: string;
}

export interface Repository {
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  defaultBranch: string;
  url: string;
  language: string | null;
  updatedAt: string;
}

export interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

export interface PullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  mergeable: boolean | null;
  draft: boolean;
}

export interface PullRequestDetail extends PullRequest {
  body: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  merged: boolean;
  mergedAt: string | null;
  mergedBy: string | null;
  reviewers: string[];
  labels: string[];
}

export interface WorkflowRun {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  branch: string;
  event: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  actor: string;
}

export interface GitProvider {
  searchRepositories(query: string, owner?: string): Promise<Repository[]>;
  listBranches(owner: string, repo: string): Promise<Branch[]>;
  listPullRequests(owner: string, repo: string, state?: string): Promise<PullRequest[]>;
  getPullRequest(owner: string, repo: string, number: number): Promise<PullRequestDetail>;
  createPullRequest(owner: string, repo: string, title: string, head: string, base: string, body?: string): Promise<PullRequest>;
  mergePullRequest(owner: string, repo: string, number: number, method?: string): Promise<{ merged: boolean; message: string }>;
  listWorkflowRuns(owner: string, repo: string, branch?: string): Promise<WorkflowRun[]>;
  getWorkflowRun(owner: string, repo: string, runId: number): Promise<WorkflowRun>;
}
