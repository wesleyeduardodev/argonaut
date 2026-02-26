import GitServerList from "@/components/settings/GitServerList";
import SettingsTabs from "@/components/settings/SettingsTabs";
import Link from "next/link";

export default function GitServersPage() {
  return (
    <div className="min-h-screen px-6 py-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
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
            <h1 className="font-display text-2xl font-bold text-text tracking-tight">Configuracoes</h1>
            <p className="text-sm text-text-muted mt-0.5">Gerencie servidores Git</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <SettingsTabs />
      </div>

      <GitServerList />
    </div>
  );
}
