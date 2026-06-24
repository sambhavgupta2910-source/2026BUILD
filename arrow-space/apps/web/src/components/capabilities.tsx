import { Section, Eyebrow, SectionTitle, Card } from "./ui";
import { CAPABILITIES } from "@/lib/content";

export function Capabilities() {
  return (
    <Section id="capabilities">
      <div className="max-w-2xl">
        <Eyebrow>Capabilities</Eyebrow>
        <SectionTitle>What Arrow does, end to end.</SectionTitle>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CAPABILITIES.map((c) => (
          <Card key={c.title}>
            <h3 className="text-base font-semibold text-ink">{c.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
          </Card>
        ))}
      </div>
    </Section>
  );
}
