"use client";

import { useState, useRef, useEffect } from "react";
import type { ToolCallResult } from "@/types";

const TOOL_LABELS: Record<string, string> = {
  list_applications: "Listando aplicações",
  get_application: "Buscando detalhes da aplicação",
  sync_application: "Sincronizando aplicação",
  rollback_application: "Fazendo rollback",
  get_application_logs: "Buscando logs",
  get_resource_tree: "Buscando árvore de recursos",
  get_managed_resources: "Buscando recursos gerenciados",
  get_application_events: "Buscando eventos",
  terminate_operation: "Cancelando operação",
  delete_application: "Deletando aplicação",
  restart_application: "Reiniciando aplicação",
  list_projects: "Listando projetos",
  get_project: "Buscando detalhes do projeto",
  list_clusters: "Listando clusters",
  list_repositories: "Listando repositórios",
};

const TOOL_ICONS: Record<string, string> = {
  list_applications: "📋",
  get_application: "🔍",
  sync_application: "🔄",
  rollback_application: "⏪",
  get_application_logs: "📜",
  get_resource_tree: "🌳",
  get_managed_resources: "📦",
  get_application_events: "📡",
  terminate_operation: "⛔",
  delete_application: "🗑️",
  restart_application: "🔁",
  list_projects: "📁",
  get_project: "📂",
  list_clusters: "🖥️",
  list_repositories: "📚",
};

interface ToolCallDisplayProps {
  toolCall: ToolCallResult;
  onSuggestionClick?: (prompt: string) => void;
}

export default function ToolCallDisplay({ toolCall, onSuggestionClick }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const isExecuting = !toolCall.output;
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;
  const icon = TOOL_ICONS[toolCall.name] || "🔧";

  const startTime = useRef(Date.now());
  const [elapsed, setElapsed] = useState<string | null>(null);

  useEffect(() => {
    if (!isExecuting && !elapsed) {
      const ms = Date.now() - startTime.current;
      setElapsed((ms / 1000).toFixed(1) + "s");
    }
  }, [isExecuting, elapsed]);

  const borderColor = toolCall.isError
    ? "border-l-danger"
    : isExecuting
    ? "border-l-primary"
    : "border-l-success";

  return (
    <div
      className={`my-2 border-l-[3px] ${borderColor} rounded-r-lg overflow-hidden bg-surface/50 border border-border`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-hover transition-colors"
      >
        <svg
          className={`w-3 h-3 text-text-muted transition-transform flex-shrink-0 ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <span className="text-sm">{icon}</span>

        {isExecuting ? (
          <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : toolCall.isError ? (
          <span className="text-danger text-xs">✗</span>
        ) : (
          <span className="text-success text-xs">✓</span>
        )}

        <span className="text-text">{label}</span>

        {typeof toolCall.input?.name === "string" && (
          <span className="text-text-muted font-code text-xs">
            ({toolCall.input.name})
          </span>
        )}

        <span className="ml-auto flex items-center gap-2">
          {elapsed && (
            <span className="text-xs text-text-muted font-code">{elapsed}</span>
          )}
          {isExecuting && (
            <span className="text-xs text-primary animate-pulse">
              executando...
            </span>
          )}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 py-2 space-y-2">
          <div>
            <span className="text-xs text-text-muted uppercase font-code">
              Ferramenta: {toolCall.name}
            </span>
            <pre className="text-xs text-text mt-1 overflow-x-auto whitespace-pre-wrap font-code">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <span className="text-xs text-text-muted uppercase font-code">Resultado</span>
              <pre className="text-xs text-text mt-1 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto font-code">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}

      {toolCall.suggestions && toolCall.suggestions.length > 0 && !isExecuting && (
        <div className="border-t border-border px-3 py-2 flex flex-wrap gap-2">
          {toolCall.suggestions.map((s) => (
            <button
              key={s.label}
              onClick={(e) => {
                e.stopPropagation();
                onSuggestionClick?.(s.prompt);
              }}
              className="px-2.5 py-1 text-xs rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/15 text-primary transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
