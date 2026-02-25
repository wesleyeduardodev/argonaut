"use client";

import { useState, useEffect, useCallback } from "react";
import ArgoServerForm from "./ArgoServerForm";

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

  async function handleDelete(id: number) {
    if (!confirm("Delete this server?")) return;
    await fetch(`/api/argo-servers?id=${id}`, { method: "DELETE" });
    fetchServers();
  }

  function handleSave() {
    setShowForm(false);
    setEditing(null);
    fetchServers();
  }

  if (loading) {
    return <div className="text-gray-400">Loading servers...</div>;
  }

  return (
    <div className="space-y-4">
      {!showForm && !editing && (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add Server
        </button>
      )}

      {(showForm || editing) && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">
            {editing ? "Edit Server" : "New Server"}
          </h3>
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

      {servers.length === 0 && !showForm ? (
        <p className="text-gray-500">No ArgoCD servers configured. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {servers.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{s.name}</span>
                  {s.isDefault && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      default
                    </span>
                  )}
                  {s.insecure && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">
                      insecure
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {s.url} &middot; {s.authType}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(s)}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="px-3 py-1 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
