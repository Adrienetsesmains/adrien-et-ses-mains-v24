import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adrien et ses mains - Tableau de bord",
  description: "Tableau de bord Adrien et ses mains",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
  <html lang="fr">
    <head>
      <link rel="manifest" href="/manifest.json" />
      <meta name="theme-color" content="#1e293b" />
      <link rel="apple-touch-icon" href="/icon-192.png" />
    </head>
    <body>{children}</body>
  </html>
);
}