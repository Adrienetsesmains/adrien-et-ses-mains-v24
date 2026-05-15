import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Adrien et ses mains - Tableau de bord",
  description: "Application devis et factures Adrien et ses mains",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}