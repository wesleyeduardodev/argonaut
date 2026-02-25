import { ArgoClient } from "@/lib/argocd/client";
import type { BatchSyncProgress } from "@/lib/argocd/client";

export type OnToolProgress = (progress: BatchSyncProgress) => void;

const MAX_OUTPUT_LENGTH = 4000;

function truncate(data: unknown): string {
  const str = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  if (str.length <= MAX_OUTPUT_LENGTH) return str;
  return str.slice(0, MAX_OUTPUT_LENGTH) + "\n\n... [output truncated]";
}

export async function executeTool(
  client: ArgoClient,
  toolName: string,
  args: Record<string, unknown>,
  onProgress?: OnToolProgress
): Promise<string> {
  try {
    let result: unknown;

    switch (toolName) {
      case "list_applications":
        result = await client.listApplications();
        break;
      case "get_application":
        result = await client.getApplication(args.name as string);
        break;
      case "sync_application":
        result = await client.syncApplication(args.name as string);
        break;
      case "rollback_application":
        result = await client.rollbackApplication(
          args.name as string,
          Number(args.id)
        );
        break;
      case "get_application_logs":
        result = await client.getApplicationLogs(
          args.name as string,
          args.container as string | undefined,
          args.tail_lines ? Number(args.tail_lines) : undefined
        );
        break;
      case "get_resource_tree":
        result = await client.getResourceTree(args.name as string);
        break;
      case "get_managed_resources":
        result = await client.getManagedResources(args.name as string);
        break;
      case "get_application_events":
        result = await client.getApplicationEvents(args.name as string);
        break;
      case "terminate_operation":
        result = await client.terminateOperation(args.name as string);
        break;
      case "delete_application":
        result = await client.deleteApplication(args.name as string);
        break;
      case "restart_application":
        result = await client.restartApplication(
          args.name as string,
          args.resource_name as string | undefined,
          args.resource_kind as string | undefined,
          args.wait_healthy === "true",
          args.health_timeout_seconds ? Number(args.health_timeout_seconds) : undefined
        );
        break;
      case "list_projects":
        result = await client.listProjects();
        break;
      case "get_project":
        result = await client.getProject(args.name as string);
        break;
      case "list_clusters":
        result = await client.listClusters();
        break;
      case "list_repositories":
        result = await client.listRepositories();
        break;
      case "batch_sync": {
        const appsList = args.apps
          ? (args.apps as string).split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;
        const maxAttempts = args.max_attempts ? Number(args.max_attempts) : undefined;
        const maxRetries = maxAttempts !== undefined ? Math.max(0, maxAttempts - 1) : undefined;
        result = await client.batchSync(
          args.pattern as string | undefined,
          args.batch_size ? Number(args.batch_size) : undefined,
          maxRetries,
          args.health_timeout_seconds ? Number(args.health_timeout_seconds) : undefined,
          onProgress,
          appsList
        );
        break;
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    return truncate(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return JSON.stringify({ error: message });
  }
}
