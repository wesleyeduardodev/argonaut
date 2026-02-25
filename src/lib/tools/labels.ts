import type { ToolCallResult } from "@/types";

export const TOOL_LABELS: Record<string, string> = {
  list_applications: "Listar aplicações",
  get_application: "Detalhes",
  sync_application: "Sync",
  rollback_application: "Rollback",
  get_application_logs: "Logs",
  get_resource_tree: "Recursos",
  get_managed_resources: "Recursos gerenciados",
  get_application_events: "Eventos",
  terminate_operation: "Cancelar operação",
  delete_application: "Deletar",
  restart_application: "Restart",
  list_projects: "Listar projetos",
  get_project: "Detalhes projeto",
  list_clusters: "Listar clusters",
  list_repositories: "Listar repositórios",
  batch_sync: "Batch Sync",
};

export function generateTitle(toolCalls: ToolCallResult[], userMessage: string): string {
  if (toolCalls.length === 0) return userMessage.slice(0, 60);

  const first = toolCalls[0];
  const label = TOOL_LABELS[first.name] || first.name;
  const appName = (first.input as { name?: string })?.name;
  return appName ? `${label} ${appName}` : label;
}
