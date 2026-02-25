export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export const ARGOCD_TOOLS: ToolDefinition[] = [
  {
    name: "list_applications",
    description: "List all ArgoCD applications with their sync and health status",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_application",
    description: "Get detailed information about a specific ArgoCD application including spec, status, sync info, and history",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
      },
      required: ["name"],
    },
  },
  {
    name: "sync_application",
    description: "Trigger a sync (deploy) for an application to match the desired state from Git",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name to sync" },
      },
      required: ["name"],
    },
  },
  {
    name: "rollback_application",
    description: "Rollback an application to a previous deployment version. Use get_application first to see the deployment history and available IDs.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
        id: { type: "string", description: "The history ID to rollback to (from deployment history)" },
      },
      required: ["name", "id"],
    },
  },
  {
    name: "get_application_logs",
    description: "Get logs from the pods of an application. Returns the most recent log lines.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
        container: { type: "string", description: "Specific container name (optional)" },
        tail_lines: { type: "string", description: "Number of log lines to return (default: 100)" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_resource_tree",
    description: "Get the Kubernetes resource tree (hierarchy) of an application showing all resources and their relationships",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_managed_resources",
    description: "Get the managed resources of an application with their diffs between desired and live state",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
      },
      required: ["name"],
    },
  },
  {
    name: "get_application_events",
    description: "Get Kubernetes events related to an application",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
      },
      required: ["name"],
    },
  },
  {
    name: "terminate_operation",
    description: "Terminate (cancel) an ongoing operation on an application, such as a sync that is stuck",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
      },
      required: ["name"],
    },
  },
  {
    name: "delete_application",
    description: "Delete an ArgoCD application. WARNING: This is a destructive operation that will also delete the Kubernetes resources managed by this application.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name to delete" },
      },
      required: ["name"],
    },
  },
  {
    name: "restart_application",
    description: "Rolling restart of Deployments/StatefulSets in an application. Targets specific resources when resource_name or resource_kind is provided; restarts all if omitted.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The application name" },
        resource_name: { type: "string", description: "Specific resource name to restart (e.g. 'backend', 'frontend'). Supports partial match. If omitted, restarts all." },
        resource_kind: { type: "string", description: "Filter by resource kind", enum: ["Deployment", "StatefulSet"] },
      },
      required: ["name"],
    },
  },
  {
    name: "list_projects",
    description: "List all ArgoCD projects",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_project",
    description: "Get detailed information about a specific ArgoCD project including allowed source repos and destinations",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The project name" },
      },
      required: ["name"],
    },
  },
  {
    name: "list_clusters",
    description: "List all clusters registered in ArgoCD with their connection status",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "list_repositories",
    description: "List all Git repositories registered in ArgoCD",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "batch_sync",
    description:
      "Sync multiple applications in controlled batches. Filters apps by glob pattern, syncs N at a time, waits for all in a batch to become Healthy before moving to the next. Stops everything if a batch fails after retries. This is a long-running operation.",
    parameters: {
      type: "object",
      properties: {
        pattern: {
          type: "string",
          description:
            "Glob pattern to match application names (e.g. 'my-app-*', '*-production', 'frontend-*')",
        },
        batch_size: {
          type: "string",
          description:
            "Number of apps to sync per batch (default: 3)",
        },
        max_retries: {
          type: "string",
          description:
            "Max retry attempts per batch before aborting (default: 2). Total attempts = max_retries + 1",
        },
        health_timeout_seconds: {
          type: "string",
          description:
            "Seconds to wait for each batch to become healthy per attempt (default: 300)",
        },
      },
      required: ["pattern"],
    },
  },
];
