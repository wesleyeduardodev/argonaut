import ProviderList from "@/components/settings/ProviderList";
import Link from "next/link";

export default function ProvidersPage() {
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
            <h1 className="font-display text-2xl font-bold text-text tracking-tight">AI Providers</h1>
            <p className="text-sm text-text-muted mt-0.5">Configure os provedores de inteligência artificial</p>
          </div>
        </div>
        <Link
          href="/settings/argo"
          className="flex items-center gap-2 px-4 py-2 text-sm bg-surface hover:bg-surface-hover text-text-muted hover:text-text border border-border rounded-xl transition-all"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          ArgoCD Servers
        </Link>
      </div>

      <ProviderList />
    </div>
  );
}
