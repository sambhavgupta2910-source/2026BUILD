import {
  QuoteSchema,
  marginFloorOk,
  type Quote,
  type Rfq,
  type SupplierPath,
} from "@arrow-space/schema";

/**
 * Quote-builder. Turns an RFQ into a DRAFT quote: it picks a supplier path per
 * line and applies a margin, but it NEVER auto-approves. `approved_by_human`
 * is always false on a draft — a human approves the price downstream
 * (`canQuoteBeSent` from the schema gates any send). The margin floor is
 * computed honestly so a sub-floor draft is visible, not hidden.
 */

export interface QuoteBuilderDeps {
  /** RFQ lines carry OEM part numbers; resolve to a Part.id. */
  partIdByNumber: (partNumber: string) => string | undefined;
  /** supplier paths available for a part. */
  supplierPathsFor: (partId: string) => SupplierPath[];
  /** the (placeholder) margin to apply for a part, as a fraction. */
  marginPctFor: (partId: string) => number;
  /** override the margin floor (defaults to the schema placeholder). */
  floorPct?: number;
  now?: Date;
  idSuffix?: string;
}

export interface DraftQuoteResult {
  quote: Quote | null;
  warnings: string[];
  /** the supplier path chosen per quote line — for the vendor-sourcing handoff. */
  chosen: { part_id: string; supplier_path: SupplierPath }[];
}

/** Build a DRAFT quote from an RFQ. Returns `quote: null` (with warnings) when
 *  no line can be priced. Never throws on a missing match — it warns. */
export function buildDraftQuote(rfq: Rfq, deps: QuoteBuilderDeps): DraftQuoteResult {
  const warnings: string[] = [];
  const now = deps.now ?? new Date();
  const suffix = deps.idSuffix ?? Math.random().toString(36).slice(2, 8);

  const lines: Quote["lines"][number][] = [];
  const chosen: { part_id: string; supplier_path: SupplierPath }[] = [];
  let total = 0;

  for (const rl of rfq.lines) {
    const partId = deps.partIdByNumber(rl.part_number);
    if (!partId) {
      warnings.push(`No catalogue match for ${rl.part_number}`);
      continue;
    }
    const paths = deps.supplierPathsFor(partId);
    if (paths.length === 0) {
      warnings.push(`No supplier path for ${rl.part_number}`);
      continue;
    }
    const best = paths.reduce((a, b) => (b.unit_cost < a.unit_cost ? b : a));
    const margin = deps.marginPctFor(partId);
    const unitPrice = Math.round(best.unit_cost * (1 + margin) * 100) / 100;
    lines.push({
      part_id: partId,
      supplier_path_id: best.id,
      unit_price: unitPrice,
      margin_pct: margin,
    });
    chosen.push({ part_id: partId, supplier_path: best });
    total += unitPrice * rl.qty;
  }

  if (lines.length === 0) {
    return { quote: null, warnings: [...warnings, "No priceable lines — cannot draft a quote."], chosen };
  }

  const quoteLines = lines as [Quote["lines"][number], ...Quote["lines"][number][]];
  const quote = QuoteSchema.parse({
    id: `quote_draft_${now.getTime().toString(36)}_${suffix}`,
    rfq_id: rfq.id,
    lines: quoteLines,
    total: Math.round(total * 100) / 100,
    margin_floor_ok: marginFloorOk(quoteLines.map((l) => l.margin_pct), deps.floorPct),
    approved_by_human: false,
    outcome: "pending",
    lost_reason: null,
  });

  return { quote, warnings, chosen };
}
