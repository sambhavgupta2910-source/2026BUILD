import type { Metadata } from "next";
import Link from "next/link";
import { Section, Eyebrow, SectionTitle, Card } from "@/components/ui";
import { STORE_ITEMS } from "@/lib/content";

export const metadata: Metadata = {
  title: "Headset store (enquire)",
  description:
    "Browse the David Clark and Bose aviation headset lines. Enquire for pricing — no checkout. This is a self-serve tail, not the headline.",
};

export default function StorePage() {
  return (
    <Section>
      <div className="max-w-2xl">
        <Eyebrow>Self-serve · demoted tail</Eyebrow>
        <SectionTitle>Aviation headsets — David Clark & Bose.</SectionTitle>
        <p className="mt-4 text-base leading-relaxed text-muted">
          A browsable catalogue for the general-aviation tail. Arrow is the sole authorized David
          Clark distributor in India. There is no cart and no checkout here — pricing is provided on
          request so we can confirm availability and traceability.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STORE_ITEMS.map((item) => (
          <Card key={`${item.brand}-${item.model}`} className="flex flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-steel">{item.brand}</p>
            <h3 className="mt-1 text-lg font-semibold text-ink">{item.model}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{item.note}</p>
            <Link
              href={`/rfq?item=${encodeURIComponent(`${item.brand} ${item.model}`)}`}
              className="mt-4 inline-flex items-center text-sm font-semibold text-azure hover:underline"
            >
              Request pricing →
            </Link>
          </Card>
        ))}
      </div>

      <p className="mt-8 text-xs text-muted">
        No payment-card processing, no online checkout. Enquiries route into the same structured RFQ
        queue as every other request.
      </p>
    </Section>
  );
}
