import { describe, it, expect } from "vitest";
import { QuoteSchema, canQuoteBeSent, type Rfq, type SupplierPath } from "@arrow-space/schema";
import { buildDraftQuote } from "../src/index";

const rfq: Rfq = {
  id: "rfq_t1",
  received_at: "2026-06-01T00:00:00.000Z",
  channel: "portal",
  customer_id: "cust_1",
  end_user_type: "operator",
  lines: [
    { part_number: "PN-A", qty: 2, condition: "NEW", ata_chapter: 24 },
    { part_number: "PN-B", qty: 1, condition: "OH", ata_chapter: 32 },
  ],
  urgency: "routine",
  export_control_review: false,
  clarifications_needed: [],
  status: "new",
};

const paths: Record<string, SupplierPath[]> = {
  part_a: [
    { id: "sp_a1", part_id: "part_a", source_type: "authorized", unit_cost: 1000, currency: "USD", lead_time_days: 10 },
    { id: "sp_a2", part_id: "part_a", source_type: "usm_broker", unit_cost: 800, currency: "USD", lead_time_days: 5 },
  ],
  part_b: [
    { id: "sp_b1", part_id: "part_b", source_type: "gse_alliance", unit_cost: 500, currency: "USD", lead_time_days: 7 },
  ],
};

const deps = {
  partIdByNumber: (pn: string) => (pn === "PN-A" ? "part_a" : pn === "PN-B" ? "part_b" : undefined),
  supplierPathsFor: (id: string) => paths[id] ?? [],
  marginPctFor: () => 0.2,
  now: new Date("2026-06-24T00:00:00.000Z"),
  idSuffix: "fixed1",
};

describe("buildDraftQuote", () => {
  it("drafts a schema-valid quote, choosing the cheapest supplier path", () => {
    const { quote, chosen } = buildDraftQuote(rfq, deps);
    expect(quote).not.toBeNull();
    expect(() => QuoteSchema.parse(quote)).not.toThrow();
    // cheapest path for part_a is sp_a2 (800)
    expect(quote!.lines[0].supplier_path_id).toBe("sp_a2");
    expect(quote!.lines[0].unit_price).toBe(960); // 800 * 1.2
    // total = 960*2 + 600*1 = 2520
    expect(quote!.total).toBe(2520);
    expect(chosen[0]?.supplier_path.id).toBe("sp_a2");
  });

  it("never auto-approves; a draft can't be sent until a human approves", () => {
    const { quote } = buildDraftQuote(rfq, deps);
    expect(quote!.approved_by_human).toBe(false);
    expect(canQuoteBeSent(quote!)).toBe(false);
  });

  it("is deterministic with injected clock + suffix", () => {
    expect(JSON.stringify(buildDraftQuote(rfq, deps))).toBe(JSON.stringify(buildDraftQuote(rfq, deps)));
  });

  it("flags margin_floor_ok=false when the margin is below the floor", () => {
    const { quote } = buildDraftQuote(rfq, { ...deps, marginPctFor: () => 0.05 });
    expect(quote!.margin_floor_ok).toBe(false);
  });

  it("warns and skips a line with no supplier path", () => {
    const { quote, warnings } = buildDraftQuote(
      { ...rfq, lines: [{ part_number: "PN-A", qty: 1, condition: "NEW", ata_chapter: 24 }, { part_number: "PN-X", qty: 1, condition: "NEW", ata_chapter: 0 }] },
      deps,
    );
    expect(quote!.lines).toHaveLength(1);
    expect(warnings.some((w) => w.includes("PN-X"))).toBe(true);
  });

  it("returns null when nothing can be priced", () => {
    const { quote, warnings } = buildDraftQuote(
      { ...rfq, lines: [{ part_number: "PN-X", qty: 1, condition: "NEW", ata_chapter: 0 }] },
      deps,
    );
    expect(quote).toBeNull();
    expect(warnings.some((w) => w.includes("No priceable lines"))).toBe(true);
  });
});
