import type { Metadata } from "next";
import { Capabilities } from "@/components/capabilities";
import { Section, Eyebrow, SectionTitle, ButtonLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Capabilities",
  description: "24/7 AOG, sourcing & distribution, repairs/overhaul/exchange, quality docs, logistics.",
};

export default function CapabilitiesPage() {
  return (
    <>
      <Section className="pb-0">
        <div className="max-w-2xl">
          <Eyebrow>Capabilities</Eyebrow>
          <SectionTitle>Distribution, support, and the paperwork to back it.</SectionTitle>
          <p className="mt-4 text-base leading-relaxed text-muted">
            Arrow operates as the institutional layer on top of authorized distribution: sourcing,
            repair management, quality documentation and logistics — with export-control discipline
            where it matters.
          </p>
        </div>
      </Section>
      <Capabilities />
      <Section className="bg-paper">
        <div className="flex flex-wrap items-center gap-3">
          <ButtonLink href="/rfq">Request a quote</ButtonLink>
          <ButtonLink href="/authorizations" variant="ghost">Authorizations & quality</ButtonLink>
        </div>
      </Section>
    </>
  );
}
