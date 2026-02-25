"use client";

import { useState } from "react";
import type { DebugLogEntry } from "@/types";

function LogRow({ entry }: { entry: DebugLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isSent = entry.direction === "sent";

  return (
    <div
      className="border-l-2 pl-3 py-1"
      style={{ borderColor: isSent ? "var(--color-primary)" : "var(--color-success)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left text-xs hover:bg-surface-hover rounded px-1 -ml-1 transition-colors"
      >
        <span className={`font-code font-bold text-[10px] w-4 ${isSent ? "text-primary" : "text-success"}`}>
          {isSent ? "→" : "←"}
        </span>
        <span className="text-text-muted font-code">{entry.timestamp}</span>
        <span className="text-text truncate flex-1">{entry.label}</span>
        <svg
          className={`w-3 h-3 text-text-muted transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <pre className="text-[11px] text-text-muted mt-1 ml-6 p-2 bg-surface rounded overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto font-code">
          {typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function MessageDebugLog({ logs }: { logs: DebugLogEntry[] }) {
  return (
    <div className="mt-2 bg-bg/80 border border-border rounded-lg p-3 space-y-0.5">
      <div className="flex items-center gap-3 mb-2 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="text-primary font-bold">→</span> Enviado ao server
        </span>
        <span className="flex items-center gap-1">
          <span className="text-success font-bold">←</span> Recebido do server
        </span>
      </div>
      {logs.map((entry, i) => (
        <LogRow key={i} entry={entry} />
      ))}
    </div>
  );
}
