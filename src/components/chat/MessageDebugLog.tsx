"use client";

import { useState } from "react";
import type { DebugLogEntry } from "@/types";

function LogRow({ entry }: { entry: DebugLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isSent = entry.direction === "sent";

  return (
    <div className="border-l-2 pl-3 py-1" style={{ borderColor: isSent ? "#3b82f6" : "#22c55e" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 text-left text-xs hover:bg-gray-700/30 rounded px-1 -ml-1 transition-colors"
      >
        <span className={`font-mono font-bold text-[10px] w-4 ${isSent ? "text-blue-400" : "text-green-400"}`}>
          {isSent ? "→" : "←"}
        </span>
        <span className="text-gray-500 font-mono">{entry.timestamp}</span>
        <span className="text-gray-300 truncate flex-1">{entry.label}</span>
        <svg
          className={`w-3 h-3 text-gray-500 transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {expanded && (
        <pre className="text-[11px] text-gray-400 mt-1 ml-6 p-2 bg-gray-800/80 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
          {typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function MessageDebugLog({ logs }: { logs: DebugLogEntry[] }) {
  return (
    <div className="mt-2 bg-gray-900/80 border border-gray-700/50 rounded-lg p-3 space-y-0.5">
      <div className="flex items-center gap-3 mb-2 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="text-blue-400 font-bold">→</span> Enviado ao server
        </span>
        <span className="flex items-center gap-1">
          <span className="text-green-400 font-bold">←</span> Recebido do server
        </span>
      </div>
      {logs.map((entry, i) => (
        <LogRow key={i} entry={entry} />
      ))}
    </div>
  );
}
