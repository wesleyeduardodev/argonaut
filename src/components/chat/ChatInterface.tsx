"use client";

import { useState, useRef, useCallback } from "react";
import type { ChatMessage, ToolCallResult, DebugLogEntry } from "@/types";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ProviderSelector from "./ProviderSelector";
import ArgoSelector from "./ArgoSelector";
import Link from "next/link";
import { useRouter } from "next/navigation";

const QUICK_ACTIONS = [
  { label: "⟳ Listar apps", prompt: "Liste todas as aplicações ArgoCD com status de sync e health" },
  { label: "📊 Health check", prompt: "Faça um health check de todas as aplicações e me diga quais estão com problemas" },
  { label: "🔄 Sync app", prompt: "Qual aplicação você gostaria de sincronizar?" },
  { label: "📋 Ver logs", prompt: "De qual aplicação você gostaria de ver os logs?" },
];

function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("overloaded") || lower.includes("529"))
    return "A API está sobrecarregada no momento. Tente novamente em alguns segundos.";
  if (lower.includes("credit balance") || lower.includes("too low"))
    return "Créditos insuficientes na API. Adicione créditos no console do provider.";
  if (lower.includes("invalid_api_key") || lower.includes("401"))
    return "API Key inválida. Verifique a chave nas configurações do provider.";
  if (lower.includes("rate_limit") || lower.includes("429"))
    return "Limite de requisições atingido. Aguarde um momento e tente novamente.";
  if (lower.includes("argocd api error"))
    return `Erro ao conectar com ArgoCD: ${message}`;
  return message;
}

function now() {
  return new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function ChatInterface() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const providerRef = useRef<{ id: number; model: string } | null>(null);
  const argoRef = useRef<number | null>(null);

  const handleProviderSelect = useCallback((id: number, model: string) => {
    providerRef.current = { id, model };
  }, []);

  const handleArgoSelect = useCallback((id: number) => {
    argoRef.current = id;
  }, []);

  async function handleLogout() {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
  }

  async function handleSend(content: string) {
    if (!providerRef.current || !argoRef.current) return;

    const userMessage: ChatMessage = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    const logs: DebugLogEntry[] = [];
    function log(direction: "sent" | "received", label: string, data: unknown) {
      logs.push({ timestamp: now(), direction, label, data });
    }

    const requestBody = {
      messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
      providerId: providerRef.current.id,
      model: providerRef.current.model,
      argoServerId: argoRef.current,
    };

    log("sent", "POST /api/chat", requestBody);

    setMessages([
      ...newMessages,
      { role: "assistant", content: "", status: "thinking" },
    ]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      log("received", `HTTP ${response.status}`, { status: response.status });

      if (!response.ok) {
        const errText = await response.text();
        log("received", "Error body", errText);

        let errorMsg: string;
        try {
          const parsed = JSON.parse(errText);
          errorMsg = parsed?.error?.message || parsed?.error || parsed?.message || errText;
        } catch {
          errorMsg = errText;
        }

        setMessages([
          ...newMessages,
          { role: "assistant", content: friendlyError(errorMsg), isError: true, status: "error", debugLogs: logs },
        ]);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantText = "";
      const toolCalls: ToolCallResult[] = [];
      let buffer = "";
      let currentStatus: ChatMessage["status"] = "thinking";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              log("received", `SSE ${eventType}`, data);

              switch (eventType) {
                case "text":
                  assistantText += data.text;
                  currentStatus = "done";
                  break;
                case "tool_call_start":
                  toolCalls.push({ id: data.id, name: data.name, input: data.input });
                  currentStatus = "tool_executing";
                  break;
                case "tool_call_result":
                  {
                    const tc = toolCalls.find((t) => t.id === data.id);
                    if (tc) {
                      tc.output = data.output;
                      tc.isError = data.output?.includes('"error"');
                    }
                    currentStatus = "thinking";
                  }
                  break;
                case "error":
                  {
                    const errMsg = friendlyError(data.error || "Erro desconhecido");
                    assistantText += assistantText ? `\n\n${errMsg}` : errMsg;
                    currentStatus = "error";
                  }
                  break;
                case "done":
                  currentStatus = "done";
                  break;
              }

              setMessages([
                ...newMessages,
                {
                  role: "assistant",
                  content: assistantText,
                  toolCalls: [...toolCalls],
                  status: currentStatus,
                  isError: currentStatus === "error",
                  debugLogs: [...logs],
                },
              ]);
            } catch {
              // partial data
            }
          }
        }
      }

      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: assistantText,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          status: "done",
          debugLogs: logs,
        },
      ]);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Network error";
      log("received", "Fetch error", { message: raw });

      setMessages([
        ...newMessages,
        { role: "assistant", content: friendlyError(raw), isError: true, status: "error", debugLogs: logs },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-border px-4 py-2">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-primary font-semibold text-lg tracking-tight">
              ⎈ Argonaut
            </h1>
            <ProviderSelector onSelect={handleProviderSelect} />
            <ArgoSelector onSelect={handleArgoSelect} />
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/settings/providers"
              className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors"
              title="Configurações"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-text-muted hover:text-text rounded-lg hover:bg-surface-hover transition-colors"
              title="Sair"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col max-w-3xl mx-auto w-full">
        <MessageList messages={messages} onQuickAction={handleSend} />

        {messages.length > 0 && !isLoading && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSend(action.prompt)}
                  className="px-3 py-1.5 text-xs rounded-full border border-border bg-surface hover:bg-surface-hover text-text-muted hover:text-text transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
