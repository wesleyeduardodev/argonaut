"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ChatMessage } from "@/types";
import ToolCallDisplay from "./ToolCallDisplay";
import MessageDebugLog from "./MessageDebugLog";

const STATUS_LABELS: Record<string, string> = {
  thinking: "Pensando...",
  tool_executing: "Executando ação no ArgoCD...",
};

function AssistantAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center text-primary text-sm">
      ⎈
    </div>
  );
}

function UserAvatar() {
  return (
    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-bg text-sm font-semibold">
      U
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const label = STATUS_LABELS[status];
  if (!label) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-text-muted py-1">
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:300ms]" />
      </span>
      {label}
    </div>
  );
}

export default function MessageBubble({ message, onSuggestionClick }: { message: ChatMessage; onSuggestionClick?: (prompt: string) => void }) {
  const isUser = message.role === "user";
  const [showLogs, setShowLogs] = useState(false);
  const showStatus =
    message.status === "thinking" || message.status === "tool_executing";
  const hasLogs = message.debugLogs && message.debugLogs.length > 0;

  if (isUser) {
    return (
      <div className="flex justify-end gap-3">
        <div className="max-w-[80%] bg-gradient-to-br from-cyan-600 to-cyan-700 text-white rounded-2xl rounded-br-sm px-4 py-2">
          <div className="whitespace-pre-wrap break-words text-sm">{message.content}</div>
        </div>
        <UserAvatar />
      </div>
    );
  }

  return (
    <div className="flex justify-start gap-3">
      <AssistantAvatar />
      <div className="max-w-[80%] min-w-0">
        {message.isError && message.content && (
          <div className="bg-danger/10 border border-danger/30 text-danger px-4 py-3 rounded-lg text-sm">
            {message.content}
          </div>
        )}

        {!message.isError && message.content && (
          <div className="prose-chat text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} onSuggestionClick={onSuggestionClick} />
            ))}
          </div>
        )}

        {showStatus && <StatusIndicator status={message.status!} />}

        {hasLogs && !showStatus && (
          <div className="mt-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text transition-colors"
            >
              <svg
                className={`w-3 h-3 transition-transform ${showLogs ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              {showLogs ? "Ocultar logs" : `Ver logs (${message.debugLogs!.length})`}
            </button>

            {showLogs && <MessageDebugLog logs={message.debugLogs!} />}
          </div>
        )}
      </div>
    </div>
  );
}
