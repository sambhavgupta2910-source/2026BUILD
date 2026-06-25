import type { Metadata } from "next";
import "./globals.css";
import { PortalHeader } from "@/components/portal-header";

export const metadata: Metadata = {
  title: {
    default: "Arrow Space — Customer Portal",
    template: "%s — Arrow Space Portal",
  },
  description: "Gated customer portal: fleet, inventory, and one-click reorder (Arrow Space).",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <div className="bg-gold/10 text-center text-xs text-ink">
          <div className="mx-auto max-w-6xl px-5 py-1.5">
            Demo portal — <strong>synthetic accounts &amp; data</strong>. Not real customer data.
          </div>
        </div>
        <PortalHeader />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
