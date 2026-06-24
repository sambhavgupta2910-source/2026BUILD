import Link from "next/link";
import { Container } from "./ui";
import { ORG, TRACE_STANDARDS } from "@/lib/content";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <Container className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="block h-4 w-4 rotate-45 border-2 border-navy" />
            <span className="font-semibold text-ink">Arrow Space</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">{ORG.tagline}</p>
          <p className="mt-3 text-xs text-muted">{ORG.parent}</p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-steel">Offices</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-ink">
            {ORG.locations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-steel">Traceability</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-ink">
            {TRACE_STANDARDS.map((s) => (
              <li key={s.code}>
                <span className="font-mono text-xs text-steel">{s.code}</span> — {s.label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-steel">Engage</h3>
          <ul className="mt-3 space-y-1.5 text-sm">
            <li>
              <Link href="/rfq" className="text-ink hover:text-azure">
                Request a quote (RFQ)
              </Link>
            </li>
            <li>
              <Link href="/aog" className="text-ink hover:text-azure">
                AOG desk
              </Link>
            </li>
            <li>
              <Link href="/authorizations" className="text-ink hover:text-azure">
                Authorizations & quality
              </Link>
            </li>
            <li>
              <Link href="/store" className="text-ink hover:text-azure">
                Headset store (enquire)
              </Link>
            </li>
          </ul>
        </div>
      </Container>

      <div className="border-t border-line">
        <Container className="flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {ORG.parent}. Institutional. Not white-label.</p>
          <p>Pricing and compliance release are confirmed by Arrow — never auto-quoted.</p>
        </Container>
      </div>
    </footer>
  );
}
