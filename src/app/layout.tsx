import type { Metadata } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "GrantFlow AI",
  description: "Analisi bandi e finanziamenti agevolati",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-gray-950 text-white antialiased">{children}</body>
    </html>
  );
}
