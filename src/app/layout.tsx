import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Argonaut AI — Controle de ArgoCD",
  description: "Interface de chat com IA para gerenciamento de ArgoCD",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-bg text-text antialiased font-body">
        {children}
      </body>
    </html>
  );
}
