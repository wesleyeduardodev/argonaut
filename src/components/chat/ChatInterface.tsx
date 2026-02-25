"use client";

import { useState, useRef, useCallback } from "react";
import type { ChatMessage, ToolCallResult, DebugLogEntry } from "@/types";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ProviderSelector from "./ProviderSelector";
import ArgoSelector from "./ArgoSelector";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
      <header className="border-b border-gray-800 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-white">Argonaut</h1>
            <ProviderSelector onSelect={handleProviderSelect} />
            <ArgoSelector onSelect={handleArgoSelect} />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings/providers"
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
            >
              Settings
            </Link>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <MessageList messages={messages} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
