 Análise honesta da Fase 3:                                                                                                                                                                                  
  O problema: as 4 features não formam uma fase coerente                                                                                                                                                                                                                                                                                                                                                                      ┌───────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────┬────────────────┐                                                       │        Feature        │                                          Alinhada com chat-first?                                          │    Veredito    │                                                       ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤                                                       │ 3.1 Status de conexão │ Parcial — é polish visual, não "inteligência"                                                              │ OK mas é minor │                                                       ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ 3.2 Dashboard de apps │ Não — é uma segunda interface competindo com o chat. O ArgoCD já tem UI; o valor do Argonaut é o chat      │ Desalinhada    │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ 3.3 Notificações      │ Não — precisa de polling background, jobs, event bus. A arquitetura atual é stateless/request-response     │ Prematura      │
  ├───────────────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────┼────────────────┤
  │ 3.4 Favoritos         │ Parcial — em chat puro o user só digita o nome do app. Favoritos brilham em dashboard/lista, que não temos │ Baixo impacto  │
  └───────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────┴────────────────┘

  O nome é "Inteligência e Contexto" mas nenhuma feature torna a IA mais inteligente. Dashboard e Notificações são features de monitoring tool, não de chat assistant.

  O que FARIA sentido como "Inteligência e Contexto"

  Features que tornam o chat mais esperto:

  1. Título inteligente — IA gera título da conversa (em vez de truncar a primeira mensagem)
  2. Cache de apps — Ao iniciar conversa, buscar lista de apps do ArgoCD pra IA já saber o que existe sem precisar chamar list_applications toda vez
  3. Histórico de operações — IA sabe que "acabamos de fazer sync no app-X" e sugere próximos passos
  4. Sugestões contextuais — Após cada operação, sugerir follow-ups ("Quer ver os logs?" / "Verificar health?")
  5. Status de conexão — Manter o 3.1 como polish rápido


