import type { Metadata } from "next";
import "./globals.css";
import { Container, Link } from "@/components/ui";

export const metadata: Metadata = {
  title: { default: "Arrow Space — Operator Console", template: "%s — Arrow Console" },
  description: "Internal operator console: one RFQ queue, draft quotes, human approval, vendor handoff.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <div className="bg-navy text-center text-xs text-white/80">
          <div className="mx-auto max-w-6xl px-5 py-1.5">
            Internal operator console — <strong>synthetic data</strong>. Pricing here is a DRAFT; a human
            approves before anything is sent.
          </div>
        </div>
        <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
          <Container className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <span aria-hidden className="block h-5 w-5 rotate-45 border-2 border-navy" />
              <span className="text-base font-semibold tracking-tight text-ink">
                Arrow Space <span className="ml-2 hidden text-xs font-normal text-muted sm:inline">Operator Console</span>
              </span>
            </Link>
            <Link href="/" className="text-sm font-medium text-steel hover:text-ink">
              RFQ queue
            </Link>
          </Container>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
