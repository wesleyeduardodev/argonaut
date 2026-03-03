# Anexos de Imagens no Chat

## Contexto
Usuários do Argonaut precisam enviar screenshots de erros, dashboards, ou configs para a IA analisar. Hoje o chat aceita apenas texto. Os 3 SDKs (Claude, OpenAI, Gemini) já suportam imagens nativamente — o gargalo é o pipeline de mensagens.

## Decisões de design
- **Escopo MVP**: Apenas imagens (PNG, JPG, GIF, WebP) — YAML/logs podem ser colados como texto
- **Storage**: Base64 em campo JSON no PostgreSQL (mesmo padrão do `toolCalls`)
- **Upload**: Inline no request body (sem endpoint separado)
- **Limites**: 5MB por imagem, máximo 3 por mensagem
- **Formato**: Campo `attachments` separado (não altera `content: string`)

## Implementação em 4 fases

### Fase 1: Camada de dados
1. **`src/lib/ai/types.ts`** — Adicionar tipo `Attachment` e `attachments?: Attachment[]` em `AIMessage`
2. **`src/types/index.ts`** — Adicionar `attachments` em `ChatMessage` e `ChatMessageDTO`
3. **`prisma/schema.prisma`** — Adicionar `attachments String? @map("attachments")` no model `ChatMessage`
4. **`src/lib/attachments.ts`** (NOVO) — Validação: MIME type, tamanho, quantidade
5. Rodar `npm run db:migrate`

```typescript
// types.ts
export interface Attachment {
  id: string;
  mimeType: string;  // image/png, image/jpeg, image/gif, image/webp
  data: string;      // base64 sem prefixo data:
  filename: string;
}
```

### Fase 2: API backend (backward-compatible)
6. **`src/app/api/sessions/[id]/messages/route.ts`** — POST: salvar attachments (JSON.stringify); GET: retornar (JSON.parse)
7. **`src/app/api/chat/route.ts`** — Passar `attachments` do request body para os providers; validar com `validateAttachments()`

### Fase 3: Providers multimodal (só ativa quando tem attachments)
8. **`src/lib/ai/claude-provider.ts`** — Converter para `ImageBlockParam[]` content blocks
9. **`src/lib/ai/openai-provider.ts`** — Converter para `ChatCompletionContentPart[]` com `image_url`
10. **`src/lib/ai/gemini-provider.ts`** — Converter para `Part[]` com `inlineData`

Lógica em cada provider: se `m.attachments` existe, montar array multimodal; senão, manter `content: string` (zero breaking change).

### Fase 4: Frontend
11. **`src/components/chat/ChatInput.tsx`** — Botão de clip (📎), `<input type="file" accept="image/*" multiple>`, preview strip com thumbnails, paste de clipboard (`onPaste`), drag-and-drop
12. **`src/components/chat/ChatInterface.tsx`** — Atualizar `handleSend(content, attachments?)`, passar attachments no request body e no `saveMessage`
13. **`src/components/chat/MessageBubble.tsx`** — Renderizar thumbnails clicáveis nas mensagens do usuário

Layout do input:
```
┌──────────────────────────────────────────┐
│ [thumb1 ×] [thumb2 ×]                   │  ← preview strip (condicional)
├──────────────────────────────────────────┤
│ [📎] [digite sua mensagem...    ] [➤]   │  ← clip button + textarea + send
└──────────────────────────────────────────┘
```

## Arquivos impactados (13 total)

| # | Arquivo | Ação |
|---|---------|------|
| 1 | `src/lib/ai/types.ts` | MODIFICAR — tipo Attachment + AIMessage |
| 2 | `src/types/index.ts` | MODIFICAR — ChatMessage + ChatMessageDTO |
| 3 | `prisma/schema.prisma` | MODIFICAR — campo attachments |
| 4 | `src/lib/attachments.ts` | CRIAR — validação |
| 5 | `src/app/api/sessions/[id]/messages/route.ts` | MODIFICAR — persistir/retornar attachments |
| 6 | `src/app/api/chat/route.ts` | MODIFICAR — passar attachments + validação |
| 7 | `src/lib/ai/claude-provider.ts` | MODIFICAR — ImageBlockParam |
| 8 | `src/lib/ai/openai-provider.ts` | MODIFICAR — image_url parts |
| 9 | `src/lib/ai/gemini-provider.ts` | MODIFICAR — inlineData parts |
| 10 | `src/components/chat/ChatInput.tsx` | MODIFICAR — file picker + preview + paste |
| 11 | `src/components/chat/ChatInterface.tsx` | MODIFICAR — wiring attachments |
| 12 | `src/components/chat/MessageBubble.tsx` | MODIFICAR — render thumbnails |
| 13 | `next.config.ts` | MODIFICAR — body size limit (se necessário) |

## Verificação
1. `npm run db:migrate` sem erros
2. `npx next build` sem erros
3. Testar: enviar imagem no chat → thumbnail aparece na mensagem → IA descreve a imagem
4. Testar: carregar histórico de sessão → imagens persistem
5. Testar: cada provider (Claude, OpenAI, Gemini) recebe e processa a imagem
6. Testar: limites (>5MB rejeitado, >3 imagens rejeitado, tipo não-imagem rejeitado)
7. Testar: paste screenshot do clipboard → imagem adicionada
8. Testar mobile: botão clip abre camera/galeria no PWA
