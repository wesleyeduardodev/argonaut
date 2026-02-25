"use client";

import { useState } from "react";
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

export default function ToolCallDisplay({ toolCall }: { toolCall: ToolCallResult }) {
  const [expanded, setExpanded] = useState(false);
  const isExecuting = !toolCall.output;
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;

  return (
    <div
      className={`my-2 border rounded-lg overflow-hidden ${
        toolCall.isError
          ? "border-red-500/30 bg-red-500/5"
          : isExecuting
          ? "border-blue-500/30 bg-blue-500/5"
          : "border-gray-700 bg-gray-800/50"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700/30 transition-colors"
      >
        <span
          className={`text-xs transition-transform ${expanded ? "rotate-90" : ""}`}
        >
          ▶
        </span>

        {isExecuting ? (
          <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        ) : toolCall.isError ? (
          <span className="text-red-400 text-xs">✗</span>
        ) : (
          <span className="text-green-400 text-xs">✓</span>
        )}

        <span className="text-gray-300">{label}</span>

        {typeof toolCall.input?.name === "string" && (
          <span className="text-gray-500 font-mono text-xs">
            ({toolCall.input.name})
          </span>
        )}

        {isExecuting && (
          <span className="text-xs text-blue-400 animate-pulse ml-auto">
            executando...
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-gray-700 px-3 py-2 space-y-2">
          <div>
            <span className="text-xs text-gray-500 uppercase">
              Tool: {toolCall.name}
            </span>
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
