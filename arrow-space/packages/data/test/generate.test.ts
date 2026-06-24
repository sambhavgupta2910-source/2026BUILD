import { describe, it, expect } from "vitest";
import { z } from "zod";
import {
  AircraftSchema,
  AogEventSchema,
  CustomerInventorySchema,
  CustomerSchema,
  OrderSchema,
  PartSchema,
  QuoteSchema,
  RfqSchema,
  SupplierPathSchema,
  TraceDocSchema,
  exportControlRequired,
  marginFloorOk,
} from "@arrow-space/schema";
import { generateDataset } from "../src/generate";

const data = generateDataset(42);

describe("dataset validates against the schema", () => {
  it("every entity array parses with its zod schema", () => {
    expect(() => z.array(PartSchema).parse(data.parts)).not.toThrow();
    expect(() => z.array(SupplierPathSchema).parse(data.supplierPaths)).not.toThrow();
    expect(() => z.array(CustomerSchema).parse(data.customers)).not.toThrow();
    expect(() => z.array(AircraftSchema).parse(data.aircraft)).not.toThrow();
    expect(() => z.array(RfqSchema).parse(data.rfqs)).not.toThrow();
    expect(() => z.array(QuoteSchema).parse(data.quotes)).not.toThrow();
    expect(() => z.array(OrderSchema).parse(data.orders)).not.toThrow();
    expect(() => z.array(TraceDocSchema).parse(data.traceDocs)).not.toThrow();
    expect(() => z.array(AogEventSchema).parse(data.aogEvents)).not.toThrow();
    expect(() => z.array(CustomerInventorySchema).parse(data.customerInventory)).not.toThrow();
  });

  it("produces the expected dataset sizes", () => {
    expect(data.parts).toHaveLength(150);
    expect(data.customers).toHaveLength(24);
    expect(data.rfqs).toHaveLength(300);
    expect(data.supplierPaths.length).toBeGreaterThanOrEqual(150);
  });
});

describe("determinism", () => {
  it("same seed ⇒ identical output", () => {
    expect(JSON.stringify(generateDataset(42))).toBe(JSON.stringify(generateDataset(42)));
  });

  it("different seed ⇒ different output", () => {
    expect(JSON.stringify(generateDataset(42))).not.toBe(JSON.stringify(generateDataset(7)));
  });
});

describe("referential integrity", () => {
  const partIds = new Set(data.parts.map((p) => p.id));
  const partNumbers = new Set(data.parts.map((p) => p.oem_part_number));
  const customerIds = new Set(data.customers.map((c) => c.id));
  const rfqIds = new Set(data.rfqs.map((r) => r.id));
  const quoteIds = new Set(data.quotes.map((q) => q.id));
  const orderIds = new Set(data.orders.map((o) => o.id));
  const pathIds = new Set(data.supplierPaths.map((s) => s.id));

  it("supplier paths reference real parts", () => {
    expect(data.supplierPaths.every((s) => partIds.has(s.part_id))).toBe(true);
  });

  it("RFQ lines reference real part numbers and a real customer", () => {
    expect(data.rfqs.every((r) => customerIds.has(r.customer_id))).toBe(true);
    expect(data.rfqs.every((r) => r.lines.every((l) => partNumbers.has(l.part_number)))).toBe(true);
  });

  it("quotes reference real RFQs, parts, and supplier paths", () => {
    expect(
      data.quotes.every(
        (q) =>
          rfqIds.has(q.rfq_id) &&
          q.lines.every((l) => partIds.has(l.part_id) && pathIds.has(l.supplier_path_id)),
      ),
    ).toBe(true);
  });

  it("orders reference a won quote, the RFQ, and a real customer", () => {
    expect(
      data.orders.every((o) => quoteIds.has(o.quote_id) && rfqIds.has(o.rfq_id) && customerIds.has(o.customer_id)),
    ).toBe(true);
  });

  it("trace docs point back to a real order, and orders list their trace docs", () => {
    expect(data.traceDocs.every((t) => orderIds.has(t.order_id))).toBe(true);
    const traceIds = new Set(data.traceDocs.map((t) => t.id));
    expect(data.orders.every((o) => o.trace_doc_ids.every((tid) => traceIds.has(tid)))).toBe(true);
  });

  it("customer inventory references real customers, parts, and (when set) source orders", () => {
    expect(
      data.customerInventory.every(
        (inv) =>
          customerIds.has(inv.customer_id) &&
          partIds.has(inv.part_id) &&
          (inv.source_order_id === null || orderIds.has(inv.source_order_id)),
      ),
    ).toBe(true);
  });
});

describe("non-negotiables hold in the data", () => {
  const partByOem = new Map(data.parts.map((p) => [p.oem_part_number, p]));

  it("export_control_review is exactly the rule applied to each RFQ", () => {
    for (const rfq of data.rfqs) {
      const anyUs = rfq.lines.some((l) => partByOem.get(l.part_number)?.us_origin ?? false);
      expect(rfq.export_control_review).toBe(exportControlRequired(rfq.end_user_type, anyUs));
    }
  });

  it("flags at least some export-control RFQs (US-origin → defense/govt exists)", () => {
    expect(data.rfqs.some((r) => r.export_control_review)).toBe(true);
  });

  it("margin_floor_ok matches the floor applied to the quote's line margins", () => {
    for (const q of data.quotes) {
      expect(q.margin_floor_ok).toBe(marginFloorOk(q.lines.map((l) => l.margin_pct)));
    }
  });

  it("no synthetic quote is pre-approved by a human", () => {
    expect(data.quotes.every((q) => q.approved_by_human === false)).toBe(true);
  });

  it("shipped/delivered/closed orders carry traceability", () => {
    const shipped = data.orders.filter((o) => ["shipped", "delivered", "closed"].includes(o.status));
    expect(shipped.every((o) => o.trace_doc_ids.length > 0)).toBe(true);
  });
});
