import { describe, it, expect } from "vitest";
import { z } from "zod";
import { RfqSchema, type Part } from "@arrow-space/schema";
import { buildReorderRfq } from "../src/lib/reorder";

const parts: Record<string, Part> = {
  part_us: {
    id: "part_us",
    oem_part_number: "US-1000",
    manufacturer: "Honeywell",
    ata_chapter: 24,
    ata_subchapter: "24-30",
    description: "US GCU",
    applicable_aircraft: ["Beechcraft King Air B200"],
    conditions_available: ["NEW", "OH"],
    lead_time_tier: "stock",
    us_origin: true,
  },
  part_fr: {
    id: "part_fr",
    oem_part_number: "FR-2000",
    manufacturer: "Safran",
    ata_chapter: 32,
    ata_subchapter: "32-40",
    description: "Brake unit",
    applicable_aircraft: ["Hawker 850XP"],
    conditions_available: ["OH", "SV"],
    lead_time_tier: "quote",
    us_origin: false,
  },
};
const getPart = (id: string): Part | undefined => parts[id];
const fixed = { now: new Date("2026-06-24T00:00:00.000Z"), idSuffix: "abc123" };

describe("buildReorderRfq — reorder is an RFQ on the portal channel", () => {
  it("produces a schema-valid RFQ with channel=portal and status=new", () => {
    const { rfq } = buildReorderRfq(
      { lines: [{ part_id: "part_fr", qty: 2, condition: "OH" }] },
      { customerId: "cust_0001", endUserType: "operator", getPart, ...fixed },
    );
    expect(() => RfqSchema.parse(rfq)).not.toThrow();
    expect(rfq.channel).toBe("portal");
    expect(rfq.status).toBe("new");
    expect(rfq.customer_id).toBe("cust_0001");
    expect(rfq.urgency).toBe("routine");
    expect(rfq.lines[0].part_number).toBe("FR-2000");
    expect(rfq.lines[0].ata_chapter).toBe(32);
  });

  it("is deterministic given injected clock + suffix", () => {
    const a = buildReorderRfq({ lines: [{ part_id: "part_fr", qty: 1, condition: "OH" }] }, { customerId: "c", endUserType: "mro", getPart, ...fixed });
    const b = buildReorderRfq({ lines: [{ part_id: "part_fr", qty: 1, condition: "OH" }] }, { customerId: "c", endUserType: "mro", getPart, ...fixed });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("buildReorderRfq — non-negotiables", () => {
  it("flags export-control for US-origin → defense", () => {
    const { rfq } = buildReorderRfq(
      { lines: [{ part_id: "part_us", qty: 1, condition: "NEW" }] },
      { customerId: "c", endUserType: "defense", getPart, ...fixed },
    );
    expect(rfq.export_control_review).toBe(true);
  });

  it("does not flag US-origin → commercial operator", () => {
    const { rfq } = buildReorderRfq(
      { lines: [{ part_id: "part_us", qty: 1, condition: "NEW" }] },
      { customerId: "c", endUserType: "operator", getPart, ...fixed },
    );
    expect(rfq.export_control_review).toBe(false);
  });

  it("never includes a price anywhere in the result", () => {
    const result = buildReorderRfq(
      { lines: [{ part_id: "part_fr", qty: 1, condition: "OH" }] },
      { customerId: "c", endUserType: "operator", getPart, ...fixed },
    );
    expect(JSON.stringify(result)).not.toMatch(/price|unit_price|total|margin/i);
  });
});

describe("buildReorderRfq — validation", () => {
  it("rejects an empty reorder with a ZodError", () => {
    expect(() =>
      buildReorderRfq({ lines: [] }, { customerId: "c", endUserType: "operator", getPart }),
    ).toThrow(z.ZodError);
  });

  it("throws on an unknown part id", () => {
    expect(() =>
      buildReorderRfq(
        { lines: [{ part_id: "nope", qty: 1, condition: "NEW" }] },
        { customerId: "c", endUserType: "operator", getPart, ...fixed },
      ),
    ).toThrow(/Unknown part/);
  });
});
