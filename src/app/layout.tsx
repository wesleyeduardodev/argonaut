import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Argonaut",
  description: "AI-powered chat interface for ArgoCD management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-950 text-gray-100 antialiased">
        {children}
      </body>
    </html>
  );
}
