import type { Metadata } from "next";
import { Container, Section, Eyebrow, SectionTitle, Card } from "@/components/ui";
import { IntakeForm } from "@/components/intake-form";

export const metadata: Metadata = {
  title: "AOG desk — 24/7",
  description:
    "Aircraft on ground? Open a fast-path request. Response-time targets, traceable material, human-confirmed.",
};

const SLA = [
  { who: "Defense & Government", target: "30 min" },
  { who: "Airlines & Operators", target: "60 min" },
  { who: "MRO / Part-145", target: "60 min" },
];

export default function AogPage() {
  return (
    <>
      <div className="border-b border-line bg-navy text-white">
        <Container className="py-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold">24/7 AOG desk</p>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Aircraft on ground? Start here.
          </h1>
          <p className="mt-4 max-w-2xl text-white/80">
            Open a fast-path request and we engage immediately — sourcing against your condition and
            lead-time needs, with full traceability. Pricing and release are confirmed by a person.
          </p>
        </Container>
      </div>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>Response targets</Eyebrow>
            <SectionTitle>What "fast" means here.</SectionTitle>
            <div className="mt-6 space-y-3">
              {SLA.map((s) => (
                <Card key={s.who} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-ink">{s.who}</span>
                  <span className="font-mono text-sm text-gold">{s.target}</span>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted">
              Targets are response-time goals for first engagement, not delivery guarantees.
            </p>
          </div>

          <div>
            <Eyebrow>Fast-path intake</Eyebrow>
            <SectionTitle>Open an AOG request</SectionTitle>
            <div className="mt-6">
              <IntakeForm variant="aog" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
