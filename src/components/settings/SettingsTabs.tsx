"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Provedores IA", href: "/settings/providers" },
  { label: "ArgoCD", href: "/settings/argo" },
  { label: "Git", href: "/settings/git" },
];

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 p-1 bg-surface border border-border rounded-xl">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              active
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-text-muted hover:text-text hover:bg-surface-hover"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
