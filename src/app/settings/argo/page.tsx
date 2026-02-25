import ArgoServerList from "@/components/settings/ArgoServerList";
import Link from "next/link";

export default function ArgoServersPage() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 text-text-muted hover:text-primary rounded-xl hover:bg-surface transition-all"
            title="Voltar ao chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-text tracking-tight">Servidores ArgoCD</h1>
            <p className="text-sm text-text-muted mt-0.5">Gerencie conexões com servidores ArgoCD</p>
          </div>
        </div>
        <Link
          href="/settings/providers"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border rounded-xl transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a4 4 0 0 0-4 4c0 2 2 3 2 6H8a2 2 0 0 0-2 2v2h12v-2a2 2 0 0 0-2-2h-2c0-3 2-4 2-6a4 4 0 0 0-4-4z" />
            <path d="M9 18v1a3 3 0 0 0 6 0v-1" />
          </svg>
          Provedores de IA
        </Link>
      </div>

      <ArgoServerList />
    </div>
  );
}
