import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "Arrow Space — institutional aviation parts & AOG support",
    template: "%s — Arrow Space",
  },
  description:
    "Arrow Space is the institutional operations platform of Arrow Aviation Services: authorized Hawker Beechcraft / Textron distribution, sole David Clark India, DGCA propeller overhaul, 24/7 AOG, full traceability and export-control discipline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
