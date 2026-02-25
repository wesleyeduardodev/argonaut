"use client";

import { useState } from "react";
import type { ChatMessage } from "@/types";
import ToolCallDisplay from "./ToolCallDisplay";
import MessageDebugLog from "./MessageDebugLog";

const STATUS_LABELS: Record<string, string> = {
  thinking: "Pensando...",
  tool_executing: "Executando ação no ArgoCD...",
};

function StatusIndicator({ status }: { status: string }) {
  const label = STATUS_LABELS[status];
  if (!label) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
      <span className="flex gap-1">
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
      </span>
      {label}
    </div>
  );
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const [showLogs, setShowLogs] = useState(false);
  const showStatus =
    message.status === "thinking" || message.status === "tool_executing";
  const hasLogs = message.debugLogs && message.debugLogs.length > 0;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2"
            : ""
        }`}
      >
        {message.isError && message.content && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
            {message.content}
          </div>
        )}

        {!message.isError && message.content && (
          <div className="whitespace-pre-wrap break-words text-gray-100">
            {message.content}
          </div>
        )}

        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mt-1">
            {message.toolCalls.map((tc) => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}

        {showStatus && <StatusIndicator status={message.status!} />}

        {/* Debug logs button */}
        {!isUser && hasLogs && !showStatus && (
          <div className="mt-2">
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
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
