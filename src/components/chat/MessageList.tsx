"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/types";
import MessageBubble from "./MessageBubble";

const EMPTY_ACTIONS = [
  { label: "⟳ Listar aplicações", prompt: "Liste todas as aplicações ArgoCD com status de sync e health" },
  { label: "📊 Verificar saúde", prompt: "Faça um health check de todas as aplicações e me diga quais estão com problemas" },
  { label: "🔄 Sincronizar app", prompt: "Qual aplicação você gostaria de sincronizar?" },
  { label: "📋 Ver logs", prompt: "De qual aplicação você gostaria de ver os logs?" },
];

interface MessageListProps {
  messages: ChatMessage[];
  onQuickAction: (prompt: string) => void;
  onSuggestionClick?: (prompt: string) => void;
  loading?: boolean;
}

export default function MessageList({ messages, onQuickAction, onSuggestionClick, loading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center space-y-4 sm:space-y-6 w-full max-w-sm">
          <div className="text-5xl sm:text-6xl animate-glow-pulse text-primary select-none">⎈</div>
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold text-text">Argonaut <span className="text-primary">AI</span></h2>
            <p className="text-text-muted text-xs sm:text-sm mt-1">Controle inteligente para ArgoCD</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EMPTY_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => onQuickAction(action.prompt)}
                className="px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-muted hover:text-text transition-colors text-left active:scale-[0.98]"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
      {messages.map((msg, i) => (
        <MessageBubble key={i} message={msg} onSuggestionClick={onSuggestionClick} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
