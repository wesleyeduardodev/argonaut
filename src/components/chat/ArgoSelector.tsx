"use client";

import { useState, useEffect, useCallback } from "react";

interface ArgoServer {
  id: number;
  name: string;
  url: string;
  isDefault: boolean;
}

interface ArgoSelectorProps {
  onSelect: (serverId: number) => void;
}

export default function ArgoSelector({ onSelect }: ArgoSelectorProps) {
  const [servers, setServers] = useState<ArgoServer[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchServers = useCallback(async () => {
    const res = await fetch("/api/argo-servers");
    if (res.ok) {
      const data = await res.json();
      setServers(data);
      const defaultServer = data.find((s: ArgoServer) => s.isDefault) || data[0];
      if (defaultServer) {
        setSelectedId(defaultServer.id);
        onSelect(defaultServer.id);
      }
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  function handleChange(id: number) {
    setSelectedId(id);
    onSelect(id);
  }

  if (servers.length === 0) {
    return (
      <span className="text-sm text-warning">
        Nenhum servidor ArgoCD configurado
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
      <select
        value={selectedId || ""}
        onChange={(e) => handleChange(Number(e.target.value))}
        className="px-2 py-1 text-sm bg-surface border border-border rounded-lg text-text focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {servers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
