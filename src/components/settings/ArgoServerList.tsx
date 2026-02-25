"use client";

import { useState, useEffect, useCallback } from "react";
import ArgoServerForm from "./ArgoServerForm";
import ConfirmModal from "@/components/ui/ConfirmModal";

interface ArgoServer {
  id: number;
  name: string;
  url: string;
  authType: string;
  username: string | null;
  insecure: boolean;
  isDefault: boolean;
}

export default function ArgoServerList() {
  const [servers, setServers] = useState<ArgoServer[]>([]);
  const [editing, setEditing] = useState<ArgoServer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/argo-servers");
      if (res.ok) setServers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  async function confirmDelete() {
    if (deleteTarget === null) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    await fetch(`/api/argo-servers?id=${id}`, { method: "DELETE" });
    fetchServers();
  }

  function handleSave() {
    setShowForm(false);
    setEditing(null);
    fetchServers();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-text-muted">Carregando servidores...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add button */}
      {!showForm && !editing && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-bg font-semibold rounded-xl transition-all text-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:shadow-[0_0_25px_rgba(6,182,212,0.25)]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Adicionar Servidor
        </button>
      )}

      {/* Form */}
      {(showForm || editing) && (
        <div className="card-gradient p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary text-lg">
              ⎈
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-text">
                {editing ? "Editar Servidor" : "Novo Servidor"}
              </h3>
              <p className="text-xs text-text-muted">
                {editing ? "Atualize as configurações do servidor" : "Configure uma nova conexão com ArgoCD"}
              </p>
            </div>
          </div>
          <ArgoServerForm
            initial={editing || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {servers.length === 0 && !showForm ? (
        <div className="text-center py-16 border border-dashed border-border rounded-2xl">
          <div className="text-5xl mb-4 opacity-50">⎈</div>
          <p className="text-text font-medium">Nenhum servidor configurado</p>
          <p className="text-text-muted text-sm mt-1 max-w-xs mx-auto">
            Conecte-se a um servidor ArgoCD para gerenciar suas aplicações
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {servers.map((s) => (
            <div
              key={s.id}
              className="group relative bg-surface border border-border rounded-2xl p-4 hover:border-border-focus transition-all"
            >
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {/* Server icon */}
                  <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-bg border border-border flex items-center justify-center shadow-sm">
                    <div className="relative">
                      <span className="text-primary text-lg">⎈</span>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-surface" />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-semibold text-text">{s.name}</span>
                      {s.isDefault && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold border border-primary/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          padrão
                        </span>
                      )}
                      {s.insecure && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-warning/10 text-warning px-2 py-0.5 rounded-full font-semibold border border-warning/20">
                          inseguro
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-muted mt-1">
                      <span className="font-code">{s.url}</span>
                      <span className="text-border">·</span>
                      <span className="capitalize">{s.authType === "userpass" ? "user/pass" : "token"}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => setEditing(s)}
                    className="p-2.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    title="Editar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s.id)}
                    className="p-2.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                    title="Deletar"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title="Excluir servidor"
        description="O servidor ArgoCD e suas configurações serão removidos permanentemente."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
