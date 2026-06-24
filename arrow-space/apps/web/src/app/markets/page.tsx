import type { Metadata } from "next";
import { Markets } from "@/components/markets";
import { Section, Eyebrow, SectionTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Markets",
  description: "Defense-first: Defense & Government → Airlines & Operators → MRO/Part-145 → GA tail.",
};

export default function MarketsPage() {
  return (
    <>
      <Section className="pb-0">
        <div className="max-w-2xl">
          <Eyebrow>Markets</Eyebrow>
          <SectionTitle>Who we serve, in order of priority.</SectionTitle>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Defense and government come first — in access, in documentation discipline, and in
            export-control rigour. The general-aviation tail is served self-serve and demoted by
            design; it is not the headline.
          </p>
        </div>
      </Section>
      <Markets />
    </>
  );
}
