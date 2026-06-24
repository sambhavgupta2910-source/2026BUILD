import { describe, it, expect } from "vitest";
import {
  PartSchema,
  SupplierPathSchema,
  RfqSchema,
  QuoteSchema,
  TraceDocSchema,
  AogEventSchema,
  CustomerSchema,
  AircraftSchema,
  CustomerInventorySchema,
  OrderSchema,
  syntheticOf,
  isSynthetic,
  assertRfq,
} from "../src/index";

// --- valid fixtures (one per entity) ---------------------------------------

const part = {
  id: "part_000001",
  oem_part_number: "50-3825-01",
  manufacturer: "David Clark",
  ata_chapter: 23,
  ata_subchapter: "23-50",
  description: "H10-13.4 headset",
  applicable_aircraft: ["Beechcraft King Air B200"],
  conditions_available: ["NEW", "OH"],
  lead_time_tier: "stock",
  us_origin: true,
};

const supplierPath = {
  id: "sp_000001",
  part_id: "part_000001",
  source_type: "david_clark",
  unit_cost: 320.5,
  currency: "USD",
  lead_time_days: 0,
};

const rfq = {
  id: "rfq_000001",
  received_at: "2026-06-01T09:30:00.000Z",
  channel: "portal",
  customer_id: "cust_000001",
  end_user_type: "defense",
  lines: [{ part_number: "50-3825-01", qty: 4, condition: "NEW", ata_chapter: 23 }],
  urgency: "aog",
  export_control_review: true,
  clarifications_needed: [],
  status: "new",
};

const quote = {
  id: "quote_000001",
  rfq_id: "rfq_000001",
  lines: [
    { part_id: "part_000001", supplier_path_id: "sp_000001", unit_price: 410, margin_pct: 0.22 },
  ],
  total: 1640,
  margin_floor_ok: true,
  approved_by_human: false,
  outcome: "pending",
  lost_reason: null,
};

const traceDoc = {
  id: "trace_000001",
  order_id: "order_000001",
  type: "8130-3",
  issued_by: "Arrow Aviation Services",
  file_ref: "vault://trace/order_000001/8130-3.pdf",
};

const aogEvent = {
  id: "aog_000001",
  rfq_id: "rfq_000001",
  opened_at: "2026-06-01T09:31:00.000Z",
  responded_at: null,
  sla_minutes: 30,
  resolved: false,
};

const customer = {
  id: "cust_000001",
  name: "Example Defense Wing",
  type: "defense",
  country: "IN",
  contacts: [{ name: "A. Singh", email: "a.singh@example.mil", phone: "+910000000000", role: "Procurement" }],
  portal_enabled: true,
};

const aircraft = {
  id: "ac_000001",
  customer_id: "cust_000001",
  registration: "VT-ABC",
  type_model: "Beechcraft King Air B200",
  serial_number: "BB-1234",
  in_service: true,
};

const customerInventory = {
  id: "inv_000001",
  customer_id: "cust_000001",
  part_id: "part_000001",
  aircraft_id: "ac_000001",
  condition: "NEW",
  qty_on_hand: 2,
  last_purchased_at: "2026-05-01T00:00:00.000Z",
  source_order_id: "order_000001",
};

const order = {
  id: "order_000001",
  quote_id: "quote_000001",
  rfq_id: "rfq_000001",
  customer_id: "cust_000001",
  lines: [{ part_id: "part_000001", qty: 4, unit_price: 410, condition: "NEW" }],
  status: "delivered",
  placed_at: "2026-05-01T00:00:00.000Z",
  trace_doc_ids: ["trace_000001"],
};

const cases: [string, { parse: (x: unknown) => unknown }, unknown][] = [
  ["Part", PartSchema, part],
  ["SupplierPath", SupplierPathSchema, supplierPath],
  ["RFQ", RfqSchema, rfq],
  ["Quote", QuoteSchema, quote],
  ["TraceDoc", TraceDocSchema, traceDoc],
  ["AogEvent", AogEventSchema, aogEvent],
  ["Customer", CustomerSchema, customer],
  ["Aircraft", AircraftSchema, aircraft],
  ["CustomerInventory", CustomerInventorySchema, customerInventory],
  ["Order", OrderSchema, order],
];

describe("data contract — all ten entities", () => {
  it.each(cases)("%s accepts a valid record", (_name, schema, fixture) => {
    expect(() => schema.parse(fixture)).not.toThrow();
  });

  it("rejects an unknown enum value", () => {
    expect(() => PartSchema.parse({ ...part, lead_time_tier: "someday" })).toThrow();
  });

  it("rejects a missing required field", () => {
    const { customer_id: _omit, ...withoutCustomer } = rfq;
    expect(() => RfqSchema.parse(withoutCustomer)).toThrow();
  });

  it("rejects a malformed datetime", () => {
    expect(() => RfqSchema.parse({ ...rfq, received_at: "yesterday" })).toThrow();
  });

  it("rejects a bad currency code", () => {
    expect(() => SupplierPathSchema.parse({ ...supplierPath, currency: "Dollars" })).toThrow();
  });

  it("requires at least one RFQ line", () => {
    expect(() => RfqSchema.parse({ ...rfq, lines: [] })).toThrow();
  });
});

describe("part ↔ traceability loop", () => {
  it("Order.trace_doc_ids references the TraceDoc.order_id back to the order", () => {
    const o = OrderSchema.parse(order);
    const t = TraceDocSchema.parse(traceDoc);
    expect(o.trace_doc_ids).toContain(t.id);
    expect(t.order_id).toBe(o.id);
  });
});

describe("synthetic provenance marker", () => {
  it("syntheticOf stamps and validates the marker", () => {
    const SyntheticPart = syntheticOf(PartSchema);
    const stamped = SyntheticPart.parse({ ...part, _synthetic: true, _dataset: "v1" });
    expect(isSynthetic(stamped)).toBe(true);
  });

  it("a plain real record is not flagged synthetic", () => {
    expect(isSynthetic(PartSchema.parse(part))).toBe(false);
  });

  it("the marker must be literal true, not just truthy", () => {
    const SyntheticPart = syntheticOf(PartSchema);
    expect(() => SyntheticPart.parse({ ...part, _synthetic: 1, _dataset: "v1" })).toThrow();
  });
});

describe("assert helpers", () => {
  it("assertRfq returns the typed value", () => {
    expect(assertRfq(rfq).id).toBe("rfq_000001");
  });
});
