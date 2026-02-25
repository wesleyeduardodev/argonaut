"use client";

import { useState, useRef, useCallback } from "react";
import type { ChatMessage, ToolCallResult } from "@/types";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import ProviderSelector from "./ProviderSelector";
import ArgoSelector from "./ArgoSelector";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          providerId: providerRef.current.id,
          model: providerRef.current.model,
          argoServerId: argoRef.current,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Request failed" }));
        setMessages([
          ...newMessages,
          { role: "assistant", content: `Error: ${err.error}` },
        ]);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let assistantText = "";
      const toolCalls: ToolCallResult[] = [];
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        let eventType = "";
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            try {
              const data = JSON.parse(dataStr);

              switch (eventType) {
                case "text":
                  assistantText += data.text;
                  break;
                case "tool_call_start":
                  toolCalls.push({
                    id: data.id,
                    name: data.name,
                    input: data.input,
                  });
                  break;
                case "tool_call_result":
                  {
                    const tc = toolCalls.find((t) => t.id === data.id);
                    if (tc) {
                      tc.output = data.output;
                      tc.isError = data.output?.includes('"error"');
                    }
                  }
                  break;
                case "error":
                  assistantText += `\n\nError: ${data.error}`;
                  break;
              }

              // Update messages in real-time
              setMessages([
                ...newMessages,
                {
                  role: "assistant",
                  content: assistantText,
                  toolCalls: [...toolCalls],
                },
              ]);
            } catch {
              // Ignore parse errors for partial data
            }
          }
        }
      }

      // Final update
      if (assistantText || toolCalls.length > 0) {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: assistantText,
            toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          },
        ]);
      }
    } catch (error) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `Error: ${error instanceof Error ? error.message : "Network error"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
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

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full">
        <MessageList messages={messages} />
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}
