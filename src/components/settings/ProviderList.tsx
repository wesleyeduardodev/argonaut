"use client";

import { useState, useEffect, useCallback } from "react";
import ProviderForm from "./ProviderForm";

interface Provider {
  id: number;
  name: string;
  provider: string;
  apiKey: string;
  defaultModel: string;
  isDefault: boolean;
}

export default function ProviderList() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/providers");
      if (res.ok) setProviders(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  async function handleDelete(id: number) {
    if (!confirm("Delete this provider?")) return;
    await fetch(`/api/providers?id=${id}`, { method: "DELETE" });
    fetchProviders();
  }

  function handleSave() {
    setShowForm(false);
    setEditing(null);
    fetchProviders();
  }

  if (loading) {
    return <div className="text-gray-400">Loading providers...</div>;
  }

  return (
    <div className="space-y-4">
      {!showForm && !editing && (
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          + Add Provider
        </button>
      )}

      {(showForm || editing) && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-4">
            {editing ? "Edit Provider" : "New Provider"}
          </h3>
          <ProviderForm
            initial={editing || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
          />
        </div>
      )}

      {providers.length === 0 && !showForm ? (
        <p className="text-gray-500">No providers configured. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {providers.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{p.name}</span>
                  {p.isDefault && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                      default
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {p.provider} &middot; {p.defaultModel} &middot; Key: {p.apiKey}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(p)}
                  className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(p.id)}
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
