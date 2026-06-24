import { Section, Eyebrow, SectionTitle, Card, Badge } from "./ui";
import { TRACE_STANDARDS } from "@/lib/content";

export function TrustSpine() {
  return (
    <Section id="quality" className="bg-paper">
      <div className="max-w-2xl">
        <Eyebrow>Authorizations & Quality</Eyebrow>
        <SectionTitle>A credential rail, not a catalogue.</SectionTitle>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Every part leaves with its paperwork. Material is released against recognised airworthiness
          and conformance standards, kept to AS9120-aligned distribution records, and assembled into a
          clean trace pack for your records and audits.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TRACE_STANDARDS.map((s) => (
          <Card key={s.code}>
            <Badge>{s.code}</Badge>
            <p className="mt-3 text-sm font-medium text-ink">{s.label}</p>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-sm text-muted">
        US-origin parts destined for defense or government end-users are routed through an
        export-control review (end-use statement, ITAR/EAR classification) with human sign-off. We
        assist the paperwork; we never bypass a control.
      </p>
    </Section>
  );
}
