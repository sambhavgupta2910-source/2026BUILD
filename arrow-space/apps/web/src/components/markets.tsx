import { Section, Eyebrow, SectionTitle } from "./ui";
import { MARKETS } from "@/lib/content";

export function Markets() {
  return (
    <Section id="markets" className="bg-paper">
      <div className="max-w-2xl">
        <Eyebrow>Markets — defense-first</Eyebrow>
        <SectionTitle>Ordered by the buyers we serve first.</SectionTitle>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Priority runs Defense & Government → Airlines & Operators → MRO / Part-145 → Business & GA.
          The general-aviation tail is served self-serve and sits last by design.
        </p>
      </div>

      <ol className="mt-10 divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
        {MARKETS.map((m) => (
          <li key={m.title} className="flex items-start gap-5 p-6">
            <span className="mt-0.5 font-mono text-sm text-gold">
              {String(m.priority).padStart(2, "0")}
            </span>
            <div>
              <h3 className="text-base font-semibold text-ink">{m.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{m.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
