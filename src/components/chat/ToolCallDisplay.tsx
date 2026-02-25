"use client";

import { useState } from "react";
import type { ToolCallResult } from "@/types";

export default function ToolCallDisplay({ toolCall }: { toolCall: ToolCallResult }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="my-2 border border-gray-700 rounded-lg overflow-hidden bg-gray-800/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700/50 transition-colors"
      >
        <span
          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>
        <span className="font-mono text-blue-400">{toolCall.name}</span>
        {toolCall.isError && (
          <span className="text-xs text-red-400 bg-red-500/10 px-1.5 rounded">
            error
          </span>
        )}
        {!toolCall.output && (
          <span className="text-xs text-gray-500 animate-pulse">
            executing...
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-700 px-3 py-2 space-y-2">
          <div>
            <span className="text-xs text-gray-500 uppercase">Input</span>
            <pre className="text-xs text-gray-300 mt-1 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <span className="text-xs text-gray-500 uppercase">Output</span>
              <pre className="text-xs text-gray-300 mt-1 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
