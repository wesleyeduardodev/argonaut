"use client";

import { useState, useRef, useEffect } from "react";
import type { ToolCallResult, BatchSyncProgress } from "@/types";

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
  batch_sync: "Sync em lote",
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
  batch_sync: "🚀",
};

// ─── Batch Progress Display ───

const PHASE_COLORS: Record<string, string> = {
  resolving: "text-primary",
  batch_start: "text-primary",
  syncing: "text-primary",
  polling: "text-primary",
  batch_complete: "text-success",
  complete: "text-success",
  retrying: "text-warning",
  batch_failed: "text-warning",
  aborted: "text-danger",
};

const PHASE_BORDER: Record<string, string> = {
  resolving: "border-primary/30",
  batch_start: "border-primary/30",
  syncing: "border-primary/30",
  polling: "border-primary/30",
  batch_complete: "border-success/30",
  complete: "border-success/30",
  retrying: "border-warning/30",
  batch_failed: "border-warning/30",
  aborted: "border-danger/30",
};

const PHASE_BG: Record<string, string> = {
  resolving: "bg-primary/5",
  batch_start: "bg-primary/5",
  syncing: "bg-primary/5",
  polling: "bg-primary/5",
  batch_complete: "bg-success/5",
  complete: "bg-success/5",
  retrying: "bg-warning/5",
  batch_failed: "bg-warning/5",
  aborted: "bg-danger/5",
};

const PHASE_BAR: Record<string, string> = {
  resolving: "bg-primary",
  batch_start: "bg-primary",
  syncing: "bg-primary",
  polling: "bg-primary",
  batch_complete: "bg-success",
  complete: "bg-success",
  retrying: "bg-warning",
  batch_failed: "bg-warning",
  aborted: "bg-danger",
};

function statusIcon(healthStatus: string): string {
  switch (healthStatus) {
    case "Healthy":
      return "✓";
    case "Progressing":
      return "⟳";
    case "Degraded":
    case "Suspended":
      return "⚠";
    case "Missing":
    case "Unknown":
      return "?";
    default:
      return "…";
  }
}

function statusColor(healthStatus: string): string {
  switch (healthStatus) {
    case "Healthy":
      return "text-success";
    case "Progressing":
      return "text-primary";
    case "Degraded":
    case "Suspended":
      return "text-warning";
    case "Missing":
      return "text-danger";
    default:
      return "text-text-muted";
  }
}

function BatchProgressDisplay({ progress }: { progress: BatchSyncProgress }) {
  const { phase, totalBatches, currentBatch, batchApps, appStatuses, attempt, maxRetries, message } = progress;

  const completedBatches = phase === "complete"
    ? totalBatches
    : phase === "batch_complete"
    ? currentBatch
    : Math.max(0, currentBatch - 1);
  const pct = totalBatches > 0 ? Math.round((completedBatches / totalBatches) * 100) : 0;

  const phaseColor = PHASE_COLORS[phase] || "text-text-muted";
  const phaseBorder = PHASE_BORDER[phase] || "border-border";
  const phaseBg = PHASE_BG[phase] || "bg-surface/50";
  const phaseBar = PHASE_BAR[phase] || "bg-primary";

  const isActive = ["syncing", "polling", "batch_start", "resolving"].includes(phase);

  return (
    <div className={`my-2 rounded-lg border ${phaseBorder} ${phaseBg} overflow-hidden`}>
      {/* Header */}
      <div className="px-3 py-2 flex items-center gap-2">
        <span className="text-sm">🚀</span>
        {isActive && (
          <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
        )}
        <span className={`text-sm font-medium ${phaseColor}`}>
          Sync em lote
        </span>
        {totalBatches > 0 && (
          <span className="text-xs text-text-muted ml-auto">
            Batch {currentBatch}/{totalBatches}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalBatches > 0 && (
        <div className="px-3 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-surface-hover overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${phaseBar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-xs text-text-muted font-code w-8 text-right">{pct}%</span>
          </div>
        </div>
      )}

      {/* Message */}
      <div className="px-3 py-1">
        <p className="text-xs text-text-muted">{message}</p>
      </div>

      {/* App statuses */}
      {batchApps.length > 0 && Object.keys(appStatuses).length > 0 && (
        <div className="px-3 pb-2">
          <div className="space-y-0.5">
            {batchApps.map((name) => {
              const status = appStatuses[name];
              if (!status) return null;
              const icon = statusIcon(status.healthStatus);
              const color = statusColor(status.healthStatus);
              return (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className={`${color} w-3 text-center flex-shrink-0`}>{icon}</span>
                  <span className="text-text truncate flex-1 font-code">{name}</span>
                  <span className="text-text-muted font-code flex-shrink-0">
                    {status.syncStatus}/{status.healthStatus}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attempt indicator */}
      {attempt > 0 && maxRetries > 0 && (
        <div className="px-3 pb-2">
          <span className="text-xs text-text-muted">
            Tentativa {attempt}/{maxRetries + 1}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main ToolCallDisplay ───

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

  // Show batch progress display for batch_sync
  if (toolCall.name === "batch_sync" && toolCall.progress) {
    return (
      <>
        <BatchProgressDisplay progress={toolCall.progress} />
        {toolCall.suggestions && toolCall.suggestions.length > 0 && !isExecuting && (
          <div className="px-3 py-2 flex flex-wrap gap-2">
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
      </>
    );
  }

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
