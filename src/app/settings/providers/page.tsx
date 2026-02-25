import ProviderList from "@/components/settings/ProviderList";
import Link from "next/link";

export default function ProvidersPage() {
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">AI Providers</h1>
        <div className="flex gap-2">
          <Link
            href="/settings/argo"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            ArgoCD Servers
          </Link>
          <Link
            href="/"
            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
          >
            Back to Chat
          </Link>
        </div>
      </div>
      <ProviderList />
    </div>
  );
}
