# Argonaut — Design & Feature Roadmap

## Direção Estética: "Mission Control"

Inspiração: terminal de controle naval/espacial. O nome Argo vem dos Argonautas (exploradores gregos). Dark UI refinada com toques de cyan/emerald, remetendo ao ecossistema Kubernetes.

---

## Paleta de Cores

```
Background:      #0a0e17   (deep navy — substitui o cinza genérico)
Surface:         #111827   (cards, sidebar, inputs)
Surface Hover:   #1a2332   (hover states)
Border:          #1e293b   (divisores sutis)
Border Active:   #2d3a4d   (foco, seleção)

Primary:         #06b6d4   (cyan-500 — Kubernetes/Docker vibe)
Primary Hover:   #0891b2   (cyan-600)
Primary Muted:   #06b6d4/15 (backgrounds com opacity)

Success:         #10b981   (emerald — ArgoCD Healthy/Synced)
Warning:         #f59e0b   (amber — OutOfSync/Progressing)
Danger:          #ef4444   (red — Degraded/Error)
Info:            #8b5cf6   (violet — operações informativas)

Text:            #e2e8f0   (slate-200 — principal)
Text Secondary:  #94a3b8   (slate-400 — secundário)
Text Muted:      #64748b   (slate-500 — hints, timestamps)
```

### Mapeamento com status ArgoCD

| Status ArgoCD | Cor | Uso |
|---------------|-----|-----|
| Healthy | `#10b981` emerald | Badge, ícone |
| Synced | `#10b981` emerald | Badge |
| OutOfSync | `#f59e0b` amber | Badge, alerta |
| Progressing | `#06b6d4` cyan | Badge, spinner |
| Degraded | `#ef4444` red | Badge, alerta |
| Missing | `#64748b` slate | Badge |
| Unknown | `#64748b` slate | Badge |

---

## Tipografia

```
Logo/Display:    "JetBrains Mono"   (monospace com personalidade — DevOps vibe)
Body:            "DM Sans"          (moderna, boa legibilidade, clean)
Code/Data/JSON:  "JetBrains Mono"   (consistência, boa para tabelas e logs)
```

Carregar via Google Fonts no layout.tsx:
```
https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap
```

---

## Layout — Redesign

### Atual
```
┌──────────────────────────────────────────────────────┐
│  Header: Logo + Dropdowns + Settings/Logout          │
├──────────────────────────────────────────────────────┤
│                                                      │
│                    Chat Messages                     │
│                                                      │
├──────────────────────────────────────────────────────┤
│  Input Field                                  [Send] │
└──────────────────────────────────────────────────────┘
```

### Proposto
```
┌────────────┬─────────────────────────────────────────┐
│  Sidebar   │  Header                                 │
│            │  ⎈ Argonaut   [Claude ▾] [Sonnet 4 ▾]  │
│  ── Today  │  ● Devquote Prod (connected)        ⚙  │
│  ● Restart │├─────────────────────────────────────────┤
│    backend ││                                         │
│  ● List    ││         Chat Messages                   │
│    apps    ││                                         │
│            ││                                         │
│  ── Ontem  ││  ┌─ ⟳ Reiniciando ── devquote ───────┐ │
│  ● Sync    ││  │  ✓ backend restarted               │ │
│    all     ││  └────────────────────────────────────┘ │
│            │├─────────────────────────────────────────┤
│            ││ [⟳ Apps] [📊 Health] [🔄 Sync] [📋 Logs]│
│  [+ Nova]  ││ [Input field]                   [Send] │
└────────────┴─────────────────────────────────────────┘
```

### Sidebar (240px, colapsável)
- Logo no topo
- Botão "+ Nova conversa"
- Histórico agrupado por data (Hoje, Ontem, Esta semana, Anteriores)
- Cada item mostra preview da primeira mensagem (truncada)
- Hover com botão de deletar conversa
- No mobile: vira drawer (hamburger menu)

### Header (compacto)
- Dropdowns de provider e model agrupados lado a lado
- Server ArgoCD com indicador de conexão (dot verde/vermelho)
- Botão de settings (ícone gear) sem texto
- Sem botão "Logout" visível (mover para dropdown do avatar ou settings)

### Chat Area
- Max-width: 768px centralizado (mais narrow = melhor legibilidade)
- Quick actions acima do input (chips horizontais com scroll)
- Input com border-radius maior, sombra sutil, ícone de send

---

## Componentes — Redesign

### Mensagens do Usuário
```
                                    ┌──────────────────┐
                                    │ reinicie o       │  WS
                                    │ backend do wesley│
                                    └──────────────────┘
```
- Alinhadas à direita
- Background: gradient sutil de cyan-600 para cyan-700 (em vez de blue flat)
- Avatar com iniciais do usuário (círculo, à direita)
- Border-radius: 16px com canto inferior-direito menor (4px)

### Mensagens do Assistente
```
  ⎈  ┌────────────────────────────────────────┐
     │ Backend reiniciado com sucesso.         │
     │                                         │
     │ | Recurso | Status    | Tipo       |    │
     │ |---------|-----------|------------|    │
     │ | backend | restarted | Deployment |    │
     └────────────────────────────────────────┘
```
- Alinhadas à esquerda
- Sem background (ou surface muito sutil)
- Ícone ⎈ como avatar (cyan)
- **Markdown renderizado** (tabelas, code blocks, bold, listas)

### Tool Call Cards
```
  ┌─ ✓ ─ Listando aplicações ──────────────────────────┐
  │       3 apps encontradas                    0.8s    │
  └─────────────────────────────────────────────────────┘

  ┌─ ⟳ ─ Reiniciando aplicação ── devquote-wesley ─────┐
  │       ████████████░░░░░░░░  executando...           │
  └─────────────────────────────────────────────────────┘

  ┌─ ✗ ─ Buscando recursos ── wesley ──────────────────┐
  │       permission denied (403)               1.2s    │
  │       ▸ Ver detalhes                                │
  └─────────────────────────────────────────────────────┘
```

Cores da borda esquerda por status:
- Executando: cyan (`#06b6d4`) + progress bar animada
- Sucesso: emerald (`#10b981`) + checkmark
- Erro: red (`#ef4444`) + X icon

Informações exibidas:
- Ícone de status (spinner/check/x)
- Label traduzido da operação
- Nome do recurso (se houver)
- Tempo de execução (ex: "0.8s")
- Expandível para ver input/output JSON

### Empty State (primeira visita)
```
         ⎈

      Argonaut
  Mission control para ArgoCD

  O que você quer fazer?

  [⟳ Listar aplicações]  [📊 Status geral]
  [🔄 Sincronizar app]   [📋 Ver logs]
```
- Logo grande com animação sutil (glow pulse em cyan)
- Subtítulo conciso
- Quick actions como botões grandes para primeira interação
- Desaparece após primeira mensagem

### Input Field
```
┌──────────────────────────────────────────────────┐
│ 📎  Pergunte sobre suas aplicações...        ➤  │
└──────────────────────────────────────────────────┘
```
- Border-radius: 24px (pill shape)
- Background: surface (#111827) com border sutil
- Ícone de send (seta) que muda de cor quando há texto (muted → cyan)
- Placeholder contextual
- Focus: glow sutil em cyan (box-shadow)

---

## Quick Actions

Chips clicáveis acima do input. Ao clicar, inserem o texto no input e enviam automaticamente.

```
[⟳ Listar apps] [📊 Health check] [🔄 Sync app] [📋 Ver logs] [🔍 Recursos]
```

Cada chip:
- Background: surface com border
- Hover: primary muted background
- Ícone + texto curto
- Scroll horizontal no mobile

Implementação: array de objetos `{ icon, label, prompt }` que ao clicar chamam `onSend(prompt)`.

---

## Features — Roadmap por Fase

### Fase 1 — Visual Polish (sem mudança de banco)

| # | Feature | Descrição | Esforço |
|---|---------|-----------|---------|
| 1.1 | Nova paleta + tipografia | Trocar cores e fontes conforme spec acima | Baixo |
| 1.2 | Markdown rendering | `react-markdown` + `remark-gfm` no MessageBubble | Baixo |
| 1.3 | Avatares nas mensagens | Ícone ⎈ para assistente, iniciais para usuário | Baixo |
| 1.4 | Tool call cards redesign | Nova visual com border-left colorida, tempo, expand | Médio |
| 1.5 | Empty state redesenhado | Logo, subtítulo, quick action buttons | Baixo |
| 1.6 | Quick actions (chips) | Atalhos acima do input | Baixo |
| 1.7 | Input redesign | Pill shape, ícone send, glow focus | Baixo |
| 1.8 | Header compacto | Reorganizar dropdowns, status de conexão | Médio |

### Fase 2 — Histórico e Sidebar

| # | Feature | Descrição | Esforço |
|---|---------|-----------|---------|
| 2.1 | Model ChatSession + ChatMessage | Novo schema Prisma para persistir conversas | Médio |
| 2.2 | API de sessões | CRUD de sessões (criar, listar, deletar, carregar) | Médio |
| 2.3 | Sidebar de histórico | Componente com lista de conversas agrupadas por data | Médio |
| 2.4 | Mobile responsive | Sidebar como drawer, layout adaptado | Médio |

### Fase 3 — Inteligência e Contexto

| # | Feature | Descrição | Esforço |
|---|---------|-----------|---------|
| 3.1 | Status de conexão | Ping ao ArgoCD server, badge no header | Baixo |
| 3.2 | Dashboard de apps | Tela alternativa com cards visuais de cada app (health/sync) | Alto |
| 3.3 | Notificações | Polling que alerta quando app fica OutOfSync/Degraded | Alto |
| 3.4 | Favoritos | Marcar apps como favoritas para menção rápida | Médio |

### Fase 4 — Enterprise

| # | Feature | Descrição | Esforço |
|---|---------|-----------|---------|
| 4.1 | RBAC | Roles (admin/operator/viewer) com permissões granulares | Alto |
| 4.2 | Audit log | Registrar toda ação executada (quem, o quê, quando, resultado) | Médio |
| 4.3 | Multi-server na mesma conversa | Comparar apps entre servers ("compare prod com staging") | Alto |
| 4.4 | Webhooks inbound | Receber eventos do ArgoCD e notificar no chat | Alto |
| 4.5 | SSO / OIDC | Login via Google, GitHub, LDAP | Alto |

---

## Schema Prisma — Fase 2 (Histórico)

```prisma
model ChatSession {
  id        Int            @id @default(autoincrement())
  title     String         @default("Nova conversa")
  userId    Int
  user      User           @relation(fields: [userId], references: [id])
  messages  ChatMessage[]
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
}

model ChatMessage {
  id        Int          @id @default(autoincrement())
  sessionId Int
  session   ChatSession  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role      String       // "user" | "assistant"
  content   String
  toolCalls String?      // JSON stringified tool calls
  createdAt DateTime     @default(now())
}
```

---

## Referência de Ícones por Operação

| Tool | Ícone | Label PT-BR |
|------|-------|-------------|
| list_applications | ⟳ | Listando aplicações |
| get_application | 🔍 | Buscando aplicação |
| sync_application | 🔄 | Sincronizando |
| rollback_application | ⏪ | Revertendo |
| get_application_logs | 📋 | Buscando logs |
| get_resource_tree | 🌳 | Árvore de recursos |
| get_managed_resources | 📦 | Recursos gerenciados |
| get_application_events | 📡 | Buscando eventos |
| terminate_operation | ⛔ | Cancelando operação |
| delete_application | 🗑 | Deletando aplicação |
| restart_application | ♻️ | Reiniciando |
| list_projects | 📁 | Listando projetos |
| get_project | 📂 | Buscando projeto |
| list_clusters | 🖥 | Listando clusters |
| list_repositories | 📚 | Listando repositórios |
