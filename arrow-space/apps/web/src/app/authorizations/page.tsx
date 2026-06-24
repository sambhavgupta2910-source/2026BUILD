import type { Metadata } from "next";
import { TrustSpine } from "@/components/trust-spine";
import { Section, Eyebrow, SectionTitle, Card } from "@/components/ui";
import { AUTHORIZATIONS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Authorizations & Quality",
  description:
    "Authorization lineage, traceability standards (8130-3 / EASA Form 1 / CoC / ATA106), and export-control discipline.",
};

export default function AuthorizationsPage() {
  return (
    <>
      <Section className="pb-0">
        <div className="max-w-2xl">
          <Eyebrow>Authorizations & Quality</Eyebrow>
          <SectionTitle>The lineage is the moat.</SectionTitle>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Arrow's standing comes from real authorizations and the discipline behind them — not from
            the size of a catalogue.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {AUTHORIZATIONS.map((a) => (
            <Card key={a.title}>
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="text-base font-semibold text-ink">{a.title}</h3>
                {a.since ? <span className="font-mono text-xs text-gold">since {a.since}</span> : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{a.detail}</p>
            </Card>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-sm text-muted">
          Distribution records are kept AS9120-aligned. (Formal AS9120 / ASA listing status is being
          confirmed and will be stated precisely here.)
        </p>
      </Section>
      <TrustSpine />
    </>
  );
}
