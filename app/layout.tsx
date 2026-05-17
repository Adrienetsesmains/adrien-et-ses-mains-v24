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
      <body>{children}</body>
    </html>
  );
}