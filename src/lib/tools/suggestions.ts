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
};

export function getSuggestions(toolName: string): Suggestion[] {
  return SUGGESTIONS[toolName] || [];
}
