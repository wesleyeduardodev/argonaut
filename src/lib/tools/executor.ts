import { ArgoClient } from "@/lib/argocd/client";
import type { BatchSyncProgress } from "@/lib/argocd/client";
import type { GitProvider } from "@/lib/git/types";

export type OnToolProgress = (progress: BatchSyncProgress) => void;

export interface ToolContext {
  argoClient: ArgoClient;
  gitClient?: GitProvider;
}

const MAX_OUTPUT_LENGTH = 4000;

function truncate(data: unknown): string {
  const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  if (str.length <= MAX_OUTPUT_LENGTH) return str;
  return str.slice(0, MAX_OUTPUT_LENGTH) + "\n\n... [output truncated]";
}

export async function executeTool(
  context: ToolContext,
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: OnToolProgress
): Promise<string> {
  try {
    let result: unknown;
    const { argoClient, gitClient } = context;

    switch (toolName) {
      // ArgoCD tools
      case "list_applications":
        result = await argoClient.listApplications();
        break;
      case "get_application":
        result = await argoClient.getApplication(args.name as string);
        break;
      case "sync_application":
        result = await argoClient.syncApplication(args.name as string);
        break;
      case "rollback_application":
        result = await argoClient.rollbackApplication(
          args.name as string,
          Number(args.id)
        );
        break;
      case "get_application_logs":
        result = await argoClient.getApplicationLogs(
          args.name as string,
          args.container as string | undefined,
          args.tail_lines ? Number(args.tail_lines) : undefined
        );
        break;
      case "get_resource_tree":
        result = await argoClient.getResourceTree(args.name as string);
        break;
      case "get_managed_resources":
        result = await argoClient.getManagedResources(args.name as string);
        break;
      case "get_application_events":
        result = await argoClient.getApplicationEvents(args.name as string);
        break;
      case "terminate_operation":
        result = await argoClient.terminateOperation(args.name as string);
        break;
      case "delete_application":
        result = await argoClient.deleteApplication(args.name as string);
        break;
      case "restart_application":
        result = await argoClient.restartApplication(
          args.name as string,
          args.resource_name as string | undefined,
          args.resource_kind as string | undefined,
          args.wait_healthy === "true",
          args.health_timeout_seconds ? Number(args.health_timeout_seconds) : undefined
        );
        break;
      case "list_projects":
        result = await argoClient.listProjects();
        break;
      case "get_project":
        result = await argoClient.getProject(args.name as string);
        break;
      case "list_clusters":
        result = await argoClient.listClusters();
        break;
      case "list_repositories":
        result = await argoClient.listRepositories();
        break;
      case "batch_sync": {
        const appsList = args.apps
          ? (args.apps as string).split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;
        const maxAttempts = args.max_attempts ? Number(args.max_attempts) : undefined;
        const maxRetries = maxAttempts !== undefined ? Math.max(0, maxAttempts - 1) : undefined;
        result = await argoClient.batchSync(
          args.pattern as string | undefined,
          args.batch_size ? Number(args.batch_size) : undefined,
          maxRetries,
          args.health_timeout_seconds ? Number(args.health_timeout_seconds) : undefined,
          onProgress,
          appsList
        );
        break;
      }

      // Git tools
      case "search_repositories":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.searchRepositories(
          args.query as string,
          args.owner as string | undefined
        );
        break;
      case "list_branches":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.listBranches(
          args.owner as string,
          args.repo as string
        );
        break;
      case "list_pull_requests":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.listPullRequests(
          args.owner as string,
          args.repo as string,
          args.state as string | undefined
        );
        break;
      case "get_pull_request":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.getPullRequest(
          args.owner as string,
          args.repo as string,
          Number(args.number)
        );
        break;
      case "create_pull_request":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.createPullRequest(
          args.owner as string,
          args.repo as string,
          args.title as string,
          args.head as string,
          args.base as string,
          args.body as string | undefined
        );
        break;
      case "merge_pull_request":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.mergePullRequest(
          args.owner as string,
          args.repo as string,
          Number(args.number),
          args.method as string | undefined
        );
        break;
      case "list_workflow_runs":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.listWorkflowRuns(
          args.owner as string,
          args.repo as string,
          args.branch as string | undefined
        );
        break;
      case "get_workflow_run":
        if (!gitClient) return JSON.stringify({ error: "Nenhum servidor Git configurado" });
        result = await gitClient.getWorkflowRun(
          args.owner as string,
          args.repo as string,
          Number(args.run_id)
        );
        break;

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    return truncate(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({ error: message });
  }
}
