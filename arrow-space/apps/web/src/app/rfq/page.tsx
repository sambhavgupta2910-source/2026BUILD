import type { Metadata } from "next";
import { Section, Eyebrow, SectionTitle } from "@/components/ui";
import { IntakeForm } from "@/components/intake-form";

export const metadata: Metadata = {
  title: "Request a quote (RFQ)",
  description:
    "Send Arrow a structured request for quote. No auto-pricing — a specialist reviews and responds.",
};

export default function RfqPage() {
  return (
    <Section>
      <div className="max-w-2xl">
        <Eyebrow>Request a quote</Eyebrow>
        <SectionTitle>Tell us exactly what you need.</SectionTitle>
        <p className="mt-4 text-base leading-relaxed text-muted">
          A structured RFQ goes straight into our queue. We confirm part numbers, conditions and
          traceability, and respond with a quote — reviewed and priced by a person, never automated.
          US-origin parts for defense or government users are routed through export-control review.
        </p>
      </div>
      <div className="mt-10 max-w-3xl">
        <IntakeForm variant="rfq" />
      </div>
    </Section>
  );
}
