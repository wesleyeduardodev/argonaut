"use client";

import type { ChatMessage } from "@/types";
import ToolCallDisplay from "./ToolCallDisplay";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] ${
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-2"
            : "text-gray-100"
        }`}
      >
        {message.content && (
          <div className="whitespace-pre-wrap break-words">
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
      </div>
    </div>
  );
}
