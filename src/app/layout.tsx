import type { Metadata } from "next";
import { Baloo_2, Geist_Mono, Quicksand } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const quicksand = Quicksand({ variable: "--font-quicksand", subsets: ["latin"], weight: ["500", "600", "700"] });
const baloo = Baloo_2({ variable: "--font-baloo", subsets: ["latin"], weight: ["800"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "Lucid · Tableau de bord", description: "Cockpit interne de LUCID" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body className={`${quicksand.variable} ${baloo.variable} ${geistMono.variable} antialiased min-h-screen`}><>{children}</><Toaster theme="dark" position="top-right" /></body></html>;
}
