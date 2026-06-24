import { Hero } from "@/components/hero";
import { TrustSpine } from "@/components/trust-spine";
import { Capabilities } from "@/components/capabilities";
import { Markets } from "@/components/markets";
import { Section, SectionTitle, ButtonLink } from "@/components/ui";

export default function HomePage() {
  return (
    <>
      <Hero />
      <TrustSpine />
      <Capabilities />
      <Markets />

      <Section className="border-t border-line bg-navy text-white">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <SectionTitle>
              <span className="text-white">Send us the requirement.</span>
            </SectionTitle>
            <p className="mt-3 text-white/80">
              Structured RFQ in, structured response back — no auto-pricing, no obligation. AOG
              enquiries take the fast path.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/rfq">Request a quote</ButtonLink>
            <ButtonLink href="/aog" variant="ghost" className="border-white/25 text-white hover:bg-white/10">
              AOG desk
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
