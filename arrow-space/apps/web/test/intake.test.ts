import { describe, it, expect } from "vitest";
import { z } from "zod";
import { RfqSchema, AogEventSchema } from "@arrow-space/schema";
import { buildIntakeRfq } from "../src/lib/intake";

// Origin lookup stub: a known US-origin part, a known non-US part, everything
// else unknown.
const origin = (pn: string): boolean | undefined => {
  if (pn === "US-123") return true;
  if (pn === "FR-999") return false;
  return undefined;
};

const base = {
  organisation: "Test Operator",
  end_user_type: "operator",
  contact_email: "ops@test.example.com",
  lines: [{ part_number: "FR-999", qty: 2, condition: "NEW", ata_chapter: 32 }],
};

const fixed = { now: new Date("2026-06-24T00:00:00.000Z"), idSuffix: "abc123" };

describe("buildIntakeRfq — structure", () => {
  it("produces a schema-valid RFQ with channel=form and status=new", () => {
    const { rfq } = buildIntakeRfq(base, { usOrigin: origin, ...fixed });
    expect(() => RfqSchema.parse(rfq)).not.toThrow();
    expect(rfq.channel).toBe("form");
    expect(rfq.status).toBe("new");
    expect(rfq.urgency).toBe("routine");
    expect(rfq.customer_id).toBe("prospect:test-operator");
  });

  it("is deterministic given injected clock + suffix", () => {
    const a = buildIntakeRfq(base, { usOrigin: origin, ...fixed });
    const b = buildIntakeRfq(base, { usOrigin: origin, ...fixed });
    expect(a.rfq.id).toBe(b.rfq.id);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("buildIntakeRfq — urgency", () => {
  it("AOG route forces urgency=aog and opens an AogEvent", () => {
    const { rfq, aogEvent } = buildIntakeRfq(base, { usOrigin: origin, isAog: true, ...fixed });
    expect(rfq.urgency).toBe("aog");
    expect(aogEvent).toBeDefined();
    expect(() => AogEventSchema.parse(aogEvent)).not.toThrow();
    expect(aogEvent?.rfq_id).toBe(rfq.id);
  });

  it("honours 'grounded' language even on the RFQ route", () => {
    const { rfq, aogEvent } = buildIntakeRfq(
      { ...base, message: "Aircraft is grounded in Delhi since this morning" },
      { usOrigin: origin, ...fixed },
    );
    expect(rfq.urgency).toBe("aog");
    expect(aogEvent).toBeDefined();
  });

  it("bumps to critical on urgent language", () => {
    const { rfq } = buildIntakeRfq(
      { ...base, message: "Need this ASAP please" },
      { usOrigin: origin, ...fixed },
    );
    expect(rfq.urgency).toBe("critical");
  });
});

describe("buildIntakeRfq — export control (never bypasses)", () => {
  it("flags US-origin to defense", () => {
    const { rfq } = buildIntakeRfq(
      { ...base, end_user_type: "defense", lines: [{ part_number: "US-123", qty: 1, condition: "NEW", ata_chapter: 24 }] },
      { usOrigin: origin, ...fixed },
    );
    expect(rfq.export_control_review).toBe(true);
  });

  it("fail-safe flags UNKNOWN origin to government + adds a clarification", () => {
    const { rfq } = buildIntakeRfq(
      { ...base, end_user_type: "govt", lines: [{ part_number: "MYSTERY-1", qty: 1, condition: "NEW", ata_chapter: 24 }] },
      { usOrigin: origin, ...fixed },
    );
    expect(rfq.export_control_review).toBe(true);
    expect(rfq.clarifications_needed.some((c) => c.includes("country-of-origin"))).toBe(true);
  });

  it("does not flag US-origin to a commercial operator", () => {
    const { rfq } = buildIntakeRfq(
      { ...base, end_user_type: "operator", lines: [{ part_number: "US-123", qty: 1, condition: "NEW", ata_chapter: 24 }] },
      { usOrigin: origin, ...fixed },
    );
    expect(rfq.export_control_review).toBe(false);
  });
});

describe("buildIntakeRfq — clarifications & validation", () => {
  it("records a clarification when ATA chapter is missing and defaults it to 0", () => {
    const { rfq } = buildIntakeRfq(
      { ...base, lines: [{ part_number: "FR-999", qty: 1, condition: "NEW" }] },
      { usOrigin: origin, ...fixed },
    );
    expect(rfq.lines[0].ata_chapter).toBe(0);
    expect(rfq.clarifications_needed.some((c) => c.includes("ATA chapter"))).toBe(true);
  });

  it("notes when no contact is provided", () => {
    const { organisation, end_user_type, lines } = base;
    const { rfq } = buildIntakeRfq({ organisation, end_user_type, lines }, { usOrigin: origin, ...fixed });
    expect(rfq.clarifications_needed.some((c) => c.toLowerCase().includes("contact"))).toBe(true);
  });

  it("rejects an empty submission with a ZodError (field errors)", () => {
    expect(() => buildIntakeRfq({ organisation: "", end_user_type: "operator", lines: [] }, { usOrigin: origin })).toThrow(z.ZodError);
  });

  it("never includes a price field in the result", () => {
    const result = buildIntakeRfq(base, { usOrigin: origin, ...fixed });
    expect(JSON.stringify(result)).not.toMatch(/price|unit_price|total|margin/i);
  });
});
