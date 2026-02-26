export interface Suggestion {
  label: string;
  prompt: string;
}

const SUGGESTIONS: Record<string, Suggestion[]> = {
  sync_application: [
    { label: "Ver logs", prompt: "Mostre os logs dessa aplicação" },
    { label: "Verificar status", prompt: "Qual o status atual dessa aplicação?" },
  ],
  restart_application: [
    { label: "Ver logs", prompt: "Mostre os logs depois do restart" },
    { label: "Health check", prompt: "A aplicação está saudável?" },
  ],
  get_application_logs: [
    { label: "Reiniciar", prompt: "Reinicie essa aplicação" },
    { label: "Ver eventos", prompt: "Mostre os eventos dessa aplicação" },
  ],
  list_applications: [
    { label: "Health check", prompt: "Quais aplicações têm problemas?" },
  ],
  get_application: [
    { label: "Sync", prompt: "Sincronize essa aplicação" },
    { label: "Ver logs", prompt: "Mostre os logs dessa aplicação" },
  ],
  rollback_application: [
    { label: "Verificar status", prompt: "Qual o status após o rollback?" },
    { label: "Ver logs", prompt: "Mostre os logs dessa aplicação" },
  ],
  get_application_events: [
    { label: "Ver logs", prompt: "Mostre os logs dessa aplicação" },
    { label: "Reiniciar", prompt: "Reinicie essa aplicação" },
  ],
  get_resource_tree: [
    { label: "Reiniciar componente", prompt: "Reinicie um componente específico" },
    { label: "Ver logs", prompt: "Mostre os logs dessa aplicação" },
  ],
  delete_application: [
    { label: "Listar apps", prompt: "Liste todas as aplicações" },
  ],
  batch_sync: [
    { label: "Ver problemas", prompt: "Quais aplicações estão com problemas?" },
    { label: "Ver logs", prompt: "Mostre os logs das aplicações com erro" },
    { label: "Listar apps", prompt: "Liste todas as aplicações com status atualizado" },
  ],
  // Git tools
  search_repositories: [
    { label: "Ver branches", prompt: "Liste as branches desse repositório" },
    { label: "Ver PRs", prompt: "Liste os pull requests abertos desse repositório" },
  ],
  list_branches: [
    { label: "Criar PR", prompt: "Crie um pull request a partir dessa branch" },
    { label: "Ver workflows", prompt: "Mostre os workflows dessa branch" },
  ],
  list_pull_requests: [
    { label: "Detalhes PR", prompt: "Mostre detalhes do pull request mais recente" },
  ],
  get_pull_request: [
    { label: "Fazer merge", prompt: "Faça o merge desse pull request" },
    { label: "Ver CI/CD", prompt: "Mostre o status do CI/CD dessa branch" },
  ],
  create_pull_request: [
    { label: "Ver CI/CD", prompt: "Acompanhe o CI/CD do pull request criado" },
    { label: "Verificar conflitos", prompt: "O PR tem conflitos de merge?" },
  ],
  merge_pull_request: [
    { label: "Acompanhar CI/CD", prompt: "Mostre o status do pipeline após o merge" },
    { label: "Sync ArgoCD", prompt: "Sincronize a aplicação no ArgoCD para deployar" },
  ],
  list_workflow_runs: [
    { label: "Detalhes run", prompt: "Mostre detalhes do workflow mais recente" },
  ],
  get_workflow_run: [
    { label: "Ver logs app", prompt: "Mostre os logs da aplicação no ArgoCD" },
    { label: "Sync ArgoCD", prompt: "Sincronize a aplicação no ArgoCD" },
  ],
};

export function getSuggestions(toolName: string): Suggestion[] {
  return SUGGESTIONS[toolName] || [];
}
