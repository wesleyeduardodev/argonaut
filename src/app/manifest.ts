import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Argonaut AI — Controle de ArgoCD",
    short_name: "Argonaut",
    description: "Interface de chat com IA para gerenciamento de ArgoCD",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0a0e17",
    theme_color: "#0a0e17",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
