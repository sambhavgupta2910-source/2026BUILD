import {
  exportControlRequired,
  marginFloorOk,
  type Aircraft,
  type AogEvent,
  type Condition,
  type Customer,
  type CustomerInventory,
  type Order,
  type Part,
  type Quote,
  type Rfq,
  type SupplierPath,
  type TraceDoc,
  type TraceDocType,
} from "@arrow-space/schema";
import { Rng } from "./prng";
import { ATA, COUNTRIES, FLEET, MFRS, ORG_NAMES, ROLES } from "./catalog";
import { classifyPart, PLACEHOLDER_MARGIN_BANDS } from "./margins.config";

export interface Dataset {
  parts: Part[];
  supplierPaths: SupplierPath[];
  customers: Customer[];
  aircraft: Aircraft[];
  rfqs: Rfq[];
  quotes: Quote[];
  orders: Order[];
  traceDocs: TraceDoc[];
  aogEvents: AogEvent[];
  customerInventory: CustomerInventory[];
}

const PARTS_COUNT = 150;
const CUSTOMERS_COUNT = 24;
const RFQS_COUNT = 300;

const WINDOW_START = Date.UTC(2025, 6, 1);
const WINDOW_END = Date.UTC(2026, 5, 20);
const DAY_MS = 86_400_000;

/** Monthly AOG seasonality (calendar month index 0=Jan). Monsoon + year-end peaks. */
const AOG_SEASON: Record<number, number> = {
  0: 0.8, 1: 0.7, 2: 0.9, 3: 1.0, 4: 1.1, 5: 1.4,
  6: 1.6, 7: 1.5, 8: 1.3, 9: 1.0, 10: 0.9, 11: 1.2,
};

const id = (prefix: string, n: number): string => `${prefix}_${String(n).padStart(6, "0")}`;
const iso = (ms: number): string => new Date(Math.floor(ms)).toISOString();
const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Base unit-cost range (USD) by margin class — order-of-magnitude realism. */
const COST_RANGE: Record<string, readonly [number, number]> = {
  headset: [280, 720],
  avionics: [2_000, 26_000],
  landing_gear: [1_500, 14_000],
  rotable: [3_000, 42_000],
  consumable: [40, 1_600],
};

export function generateDataset(seed: number): Dataset {
  const rng = new Rng(seed);

  // --- Customers ----------------------------------------------------------
  const customers: Customer[] = [];
  const endUserTypes = ["defense", "govt", "airline", "operator", "mro", "ga"] as const;
  const typeWeights: readonly (readonly [(typeof endUserTypes)[number], number])[] = [
    ["defense", 5], ["govt", 3], ["airline", 4], ["operator", 5], ["mro", 4], ["ga", 3],
  ];
  for (let i = 1; i <= CUSTOMERS_COUNT; i++) {
    const type = rng.weighted(typeWeights);
    const name = `${rng.pick(ORG_NAMES[type] ?? [])} ${rng.int(1, 99)}`;
    const contactCount = rng.int(1, 2);
    const domain = `${slug(name)}.example.com`;
    const contacts = Array.from({ length: contactCount }, () => {
      const role = rng.pick(ROLES);
      return {
        name: `${rng.pick(["A.", "S.", "R.", "M.", "K."])} ${rng.pick(["Sharma", "Khan", "Rao", "Mendis", "Pillai", "Gupta"])}`,
        email: `${slug(role)}@${domain}`,
        phone: `+9${rng.int(1, 8)}${rng.int(100000000, 999999999)}`,
        role,
      };
    });
    customers.push({
      id: id("cust", i),
      name,
      type,
      country: rng.weighted(COUNTRIES),
      contacts,
      // defense/govt/operator more likely onboarded to the portal
      portal_enabled: rng.bool(type === "ga" ? 0.3 : 0.7),
    });
  }

  // --- Aircraft (fleets) --------------------------------------------------
  const aircraft: Aircraft[] = [];
  const fleetByCustomer = new Map<string, Aircraft[]>();
  let acN = 1;
  for (const c of customers) {
    const count = rng.int(1, 4);
    const list: Aircraft[] = [];
    for (let j = 0; j < count; j++) {
      const model = rng.pick(FLEET);
      const a: Aircraft = {
        id: id("ac", acN++),
        customer_id: c.id,
        registration: `VT-${rng.pick(["A", "B", "C", "D", "E", "S", "K"])}${rng.pick(["B", "J", "R", "X", "Z"])}${rng.pick(["A", "E", "I", "O", "U"])}`,
        type_model: model,
        serial_number: rng.bool(0.85) ? `${rng.pick(["BB", "FL", "LJ", "HK"])}-${rng.int(100, 9999)}` : null,
        in_service: rng.bool(0.9),
      };
      list.push(a);
      aircraft.push(a);
    }
    fleetByCustomer.set(c.id, list);
  }

  // --- Parts --------------------------------------------------------------
  const parts: Part[] = [];
  const ataWeighted = ATA.map((a) => [a, a.weight] as const);
  const allConditions: Condition[] = ["NEW", "OH", "SV", "AR"];
  for (let i = 1; i <= PARTS_COUNT; i++) {
    const ata = rng.weighted(ataWeighted);
    // chapter 23 (comms) is the David Clark headset line; otherwise weighted OEM
    const mfr = ata.chapter === 23 ? { name: "David Clark", us: true } : rng.weighted(MFRS.map((m) => [m, m.weight] as const));
    const conditions = rng.sample(allConditions, rng.int(1, 4));
    const ordered = allConditions.filter((c) => conditions.includes(c)) as [Condition, ...Condition[]];
    const oem = `${rng.int(10, 99)}-${rng.int(1000, 9999)}-${String(rng.int(0, 99)).padStart(2, "0")}`;
    parts.push({
      id: id("part", i),
      oem_part_number: oem,
      manufacturer: mfr.name,
      ata_chapter: ata.chapter,
      ata_subchapter: ata.sub,
      description: `${mfr.name} ${ata.noun} — ATA ${ata.chapter} ${ata.name}`,
      applicable_aircraft: rng.sample(FLEET, rng.int(1, 4)),
      conditions_available: ordered,
      lead_time_tier: rng.weighted([["stock", 3], ["24h", 2], ["48-72h", 3], ["quote", 2]]),
      us_origin: mfr.us,
    });
  }
  const partById = new Map(parts.map((p) => [p.id, p]));

  // --- Supplier paths -----------------------------------------------------
  const supplierPaths: SupplierPath[] = [];
  const pathsByPart = new Map<string, SupplierPath[]>();
  let spN = 1;
  for (const p of parts) {
    const cls = classifyPart(p.ata_chapter, p.manufacturer);
    const [lo, hi] = COST_RANGE[cls] ?? [100, 1000];
    const base = rng.money(lo, hi);
    const sources: { source: SupplierPath["source_type"]; mult: number; lead: [number, number] }[] = [];
    if (cls === "headset") sources.push({ source: "david_clark", mult: 1.0, lead: [0, 3] });
    if (["Textron Aviation", "Hawker Beechcraft"].includes(p.manufacturer)) {
      sources.push({ source: "authorized", mult: 1.05, lead: [5, 21] });
    }
    if (sources.length === 0 || rng.bool(0.6)) sources.push({ source: "gse_alliance", mult: 0.92, lead: [3, 14] });
    if (rng.bool(0.6)) sources.push({ source: "usm_broker", mult: rng.float(0.6, 0.95), lead: [1, 30] });
    if (sources.length === 0) sources.push({ source: "authorized", mult: 1.0, lead: [5, 21] });

    const paths: SupplierPath[] = sources.map((s) => ({
      id: id("sp", spN++),
      part_id: p.id,
      source_type: s.source,
      unit_cost: Math.round(base * s.mult * 100) / 100,
      currency: rng.bool(0.85) ? "USD" : "INR",
      lead_time_days: rng.int(s.lead[0], s.lead[1]),
    }));
    supplierPaths.push(...paths);
    pathsByPart.set(p.id, paths);
  }

  // --- RFQs ---------------------------------------------------------------
  const rfqs: Rfq[] = [];
  const rfqStatusWeights: readonly (readonly [Rfq["status"], number])[] = [
    ["new", 0.12], ["triaged", 0.13], ["quoted", 0.25], ["won", 0.28], ["lost", 0.22],
  ];
  for (let i = 1; i <= RFQS_COUNT; i++) {
    const customer = rng.pick(customers);
    const receivedMs = rng.float(WINDOW_START, WINDOW_END);
    const month = new Date(receivedMs).getUTCMonth();
    const aogWeight = 0.15 * (AOG_SEASON[month] ?? 1);
    const urgencyWeights: readonly (readonly [Rfq["urgency"], number])[] = [
      ["aog", aogWeight], ["critical", 0.3], ["routine", 0.55],
    ];
    const urgency = rng.weighted(urgencyWeights);
    const channelWeights: readonly (readonly [Rfq["channel"], number])[] = [
      ["email", 4], ["whatsapp", 3], ["phone", 2], ["form", 2],
      ["portal", customer.portal_enabled ? 3 : 0.5],
    ];
    const channel = rng.weighted(channelWeights);
    const lineCount = rng.int(1, 3);
    const lineParts = rng.sample(parts, lineCount);
    const lines = lineParts.map((p) => ({
      part_number: p.oem_part_number,
      qty: rng.int(1, 8),
      condition: rng.pick(p.conditions_available),
      ata_chapter: p.ata_chapter,
    })) as [Rfq["lines"][number], ...Rfq["lines"][number][]];
    const anyUsOrigin = lineParts.some((p) => p.us_origin);
    rfqs.push({
      id: id("rfq", i),
      received_at: iso(receivedMs),
      channel,
      customer_id: customer.id,
      end_user_type: customer.type,
      lines,
      urgency,
      export_control_review: exportControlRequired(customer.type, anyUsOrigin),
      clarifications_needed: rng.bool(0.2) ? [rng.pick(["missing condition", "ambiguous P/N", "qty unconfirmed"])] : [],
      status: rng.weighted(rfqStatusWeights),
    });
  }
  const partByOem = new Map(parts.map((p) => [p.oem_part_number, p]));

  // --- Quotes (for RFQs that reached quoting) -----------------------------
  const quotes: Quote[] = [];
  let quoteN = 1;
  for (const rfq of rfqs) {
    if (!["quoted", "won", "lost"].includes(rfq.status)) continue;
    const quoteLines = rfq.lines.map((rl) => {
      const part = partByOem.get(rl.part_number)!;
      const path = rng.pick(pathsByPart.get(part.id)!);
      const band = PLACEHOLDER_MARGIN_BANDS[classifyPart(part.ata_chapter, part.manufacturer)]!;
      const margin = Math.round(rng.float(band.min - 0.04, band.max) * 1000) / 1000; // some dip below floor
      const unitPrice = Math.round(path.unit_cost * (1 + margin) * 100) / 100;
      return { part_id: part.id, supplier_path_id: path.id, unit_price: unitPrice, margin_pct: margin };
    }) as [Quote["lines"][number], ...Quote["lines"][number][]];
    const total =
      Math.round(rfq.lines.reduce((s, rl, idx) => s + quoteLines[idx]!.unit_price * rl.qty, 0) * 100) / 100;
    const outcome: Quote["outcome"] = rfq.status === "won" ? "won" : rfq.status === "lost" ? "lost" : "pending";
    quotes.push({
      id: id("quote", quoteN++),
      rfq_id: rfq.id,
      lines: quoteLines,
      total,
      margin_floor_ok: marginFloorOk(quoteLines.map((l) => l.margin_pct)),
      approved_by_human: false, // synthetic data never pre-approves pricing
      outcome,
      lost_reason: outcome === "lost" ? rng.pick(["price", "lead time", "lost to OEM", "no budget"]) : null,
    });
  }

  // --- Orders (from won quotes) + Trace docs ------------------------------
  const orders: Order[] = [];
  const traceDocs: TraceDoc[] = [];
  let orderN = 1;
  let traceN = 1;
  const rfqById = new Map(rfqs.map((r) => [r.id, r]));
  for (const q of quotes) {
    if (q.outcome !== "won") continue;
    const rfq = rfqById.get(q.rfq_id)!;
    const placedMs = Date.parse(rfq.received_at) + rng.int(1, 30) * DAY_MS;
    const status = rng.weighted([
      ["placed", 1], ["sourcing", 1], ["shipped", 2], ["delivered", 4], ["closed", 3],
    ] as const);
    const lines = rfq.lines.map((rl) => {
      const part = partByOem.get(rl.part_number)!;
      const ql = q.lines.find((l) => l.part_id === part.id);
      return {
        part_id: part.id,
        qty: rl.qty,
        unit_price: ql?.unit_price ?? 0,
        condition: rl.condition,
      };
    }) as [Order["lines"][number], ...Order["lines"][number][]];

    const orderId = id("order", orderN++);
    const traceIds: string[] = [];
    const shipped = ["shipped", "delivered", "closed"].includes(status);
    if (shipped) {
      const docTypes: TraceDocType[] = ["8130-3", "coc"];
      if (rng.bool(0.4)) docTypes.push("easa_form_1");
      if (rng.bool(0.3)) docTypes.push("ata106");
      for (const t of docTypes) {
        const td: TraceDoc = {
          id: id("trace", traceN++),
          order_id: orderId,
          type: t,
          issued_by: rng.pick(["Arrow Aviation Services", "OEM", "Authorized Overhaul Facility"]),
          file_ref: `vault://trace/${orderId}/${t}.pdf`,
        };
        traceDocs.push(td);
        traceIds.push(td.id);
      }
    }
    orders.push({
      id: orderId,
      quote_id: q.id,
      rfq_id: rfq.id,
      customer_id: rfq.customer_id,
      lines,
      status,
      placed_at: iso(placedMs),
      trace_doc_ids: traceIds,
    });
  }

  // --- AOG events (for AOG-urgency RFQs) ----------------------------------
  const aogEvents: AogEvent[] = [];
  let aogN = 1;
  for (const rfq of rfqs) {
    if (rfq.urgency !== "aog") continue;
    const openedMs = Date.parse(rfq.received_at);
    const sla = rng.pick([30, 60, 120]);
    const responded = rng.bool(0.85);
    aogEvents.push({
      id: id("aog", aogN++),
      rfq_id: rfq.id,
      opened_at: iso(openedMs),
      responded_at: responded ? iso(openedMs + rng.int(5, 240) * 60_000) : null,
      sla_minutes: sla,
      resolved: responded && rng.bool(0.8),
    });
  }

  // --- Customer inventory (from delivered/closed orders + a little self-declared) ---
  const customerInventory: CustomerInventory[] = [];
  let invN = 1;
  for (const o of orders) {
    if (!["delivered", "closed"].includes(o.status)) continue;
    const fleet = fleetByCustomer.get(o.customer_id) ?? [];
    for (const line of o.lines) {
      const part = partById.get(line.part_id)!;
      const fit = fleet.find((a) => part.applicable_aircraft.includes(a.type_model));
      customerInventory.push({
        id: id("inv", invN++),
        customer_id: o.customer_id,
        part_id: line.part_id,
        aircraft_id: fit ? fit.id : null,
        condition: line.condition,
        qty_on_hand: Math.max(0, line.qty - rng.int(0, line.qty)),
        last_purchased_at: o.placed_at,
        source_order_id: o.id,
      });
    }
  }
  // a few self-declared holdings (no source order) — seeding default is "both"
  for (const c of rng.sample(customers, 6)) {
    const part = rng.pick(parts);
    const fleet = fleetByCustomer.get(c.id) ?? [];
    const fit = fleet.find((a) => part.applicable_aircraft.includes(a.type_model));
    customerInventory.push({
      id: id("inv", invN++),
      customer_id: c.id,
      part_id: part.id,
      aircraft_id: fit ? fit.id : null,
      condition: rng.pick(part.conditions_available),
      qty_on_hand: rng.int(1, 5),
      last_purchased_at: null,
      source_order_id: null,
    });
  }

  return { parts, supplierPaths, customers, aircraft, rfqs, quotes, orders, traceDocs, aogEvents, customerInventory };
}
