import type { Metadata } from "next";
import Navigation from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "Register účtovných závierok - Výskumný nástroj",
  description:
    "Webová aplikácia pre filtrovanie, prehľadávanie a export finančných výkazov účtovných jednotiek. Nástroj určený na podporu akademického výskumu.",
  keywords: [
    "účtovné závierky",
    "financie",
    "výkazy",
    "registeruz",
    "Slovensko",
  ],
  authors: [{ name: "NIVEN OÜ" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className="h-full antialiased scroll-smooth">
      <body className="min-h-full flex flex-col bg-slate-50">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
