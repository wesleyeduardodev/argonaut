"use client";

import { useState, useEffect, useCallback } from "react";
import type { ChatSessionSummary } from "@/types";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  currentSessionId: number | null;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  refreshKey: number;
}

type DateGroup = "Hoje" | "Ontem" | "Últimos 7 dias" | "Últimos 30 dias" | "Mais antigos";

function getDateGroup(dateStr: string): DateGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const week = new Date(today);
  week.setDate(week.getDate() - 7);
  const month = new Date(today);
  month.setDate(month.getDate() - 30);

  if (date >= today) return "Hoje";
  if (date >= yesterday) return "Ontem";
  if (date >= week) return "Últimos 7 dias";
  if (date >= month) return "Últimos 30 dias";
  return "Mais antigos";
}

const GROUP_ORDER: DateGroup[] = ["Hoje", "Ontem", "Últimos 7 dias", "Últimos 30 dias", "Mais antigos"];

export default function Sidebar({
  open,
  onClose,
  currentSessionId,
  onSelectSession,
  onNewChat,
  refreshKey,
}: SidebarProps) {
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        setSessions(await res.json());
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, refreshKey]);

  async function confirmDelete() {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    const res = await fetch(`/api/sessions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSessionId === id) onNewChat();
    }
  }

  const grouped = new Map<DateGroup, ChatSessionSummary[]>();
  for (const session of sessions) {
    const group = getDateGroup(session.updatedAt);
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(session);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-background border-r border-border">
      <div className="p-3 border-b border-border">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border bg-surface hover:bg-surface-hover text-text transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nova conversa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {sessions.length === 0 && (
          <p className="text-sm text-text-muted text-center mt-8">
            Nenhuma conversa ainda
          </p>
        )}
        {GROUP_ORDER.map((group) => {
          const items = grouped.get(group);
          if (!items || items.length === 0) return null;
          return (
            <div key={group}>
              <p className="px-2 py-1 text-xs font-medium text-text-muted uppercase tracking-wider">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center rounded-lg cursor-pointer transition-colors ${
                      session.id === currentSessionId
                        ? "bg-surface-hover text-text"
                        : "text-text-muted hover:bg-surface-hover hover:text-text"
                    }`}
                  >
                    <button
                      onClick={() => onSelectSession(session.id)}
                      className="flex-1 min-w-0 px-2 py-2 text-left"
                    >
                      <p className="text-sm truncate">{session.title}</p>
                      {session.preview && (
                        <p className="text-xs text-text-muted truncate mt-0.5">
                          {session.preview}
                        </p>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(session.id);
                      }}
                      className="p-2 mr-1 rounded opacity-100 sm:opacity-0 group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400 transition-all active:scale-90"
                      title="Excluir conversa"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div
        className={`hidden md:block shrink-0 h-full transition-all duration-200 ${
          open ? "w-72" : "w-0"
        } overflow-hidden`}
      >
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[85vw] h-full animate-slide-in-left shadow-2xl shadow-black/50">
            {sidebarContent}
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Excluir conversa"
        description="Essa conversa e todas as suas mensagens serão excluídas permanentemente."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}
