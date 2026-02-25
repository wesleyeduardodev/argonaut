"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, onStop, disabled }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled) textareaRef.current?.focus();
  }, [disabled]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleInput() {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }

  const hasText = input.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="p-4 pb-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-2 rounded-3xl bg-surface border border-border px-4 py-2 input-glow">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleInput();
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              disabled
                ? "Aguardando resposta..."
                : "Pergunte sobre suas aplicações..."
            }
            rows={1}
            className="flex-1 bg-transparent text-text placeholder-text-muted resize-none focus:outline-none disabled:opacity-50 py-1 text-sm leading-relaxed"
          />
          {disabled && onStop ? (
            <button
              type="button"
              onClick={onStop}
              className="flex-shrink-0 p-2 rounded-full transition-colors hover:bg-danger/10"
              title="Parar geração"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className="text-danger"
              >
                <rect
                  x="6"
                  y="6"
                  width="12"
                  height="12"
                  rx="2"
                  fill="currentColor"
                />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={disabled || !hasText}
              className="flex-shrink-0 p-2 rounded-full transition-colors disabled:opacity-30"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                className={`transition-colors ${
                  hasText ? "text-primary" : "text-text-muted"
                }`}
              >
                <path
                  d="M5 12h14M12 5l7 7-7 7"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
