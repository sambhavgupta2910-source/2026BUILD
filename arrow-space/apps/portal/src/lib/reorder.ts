import { z } from "zod";
import {
  Condition,
  RfqSchema,
  exportControlRequired,
  type EndUserType,
  type Part,
  type Rfq,
} from "@arrow-space/schema";

/**
 * Portal reorder → RFQ. A reorder is an INQUIRY, not an order: it creates an
 * `RFQ` with `channel = "portal"` and drops it into the same operator queue as
 * every other intake channel. No price is shown or committed here — the margin
 * floor + human approval still gate any quote downstream. The export-control
 * rule applies exactly as elsewhere.
 */

export const ReorderLineSchema = z.object({
  part_id: z.string().min(1),
  qty: z.coerce.number().int().positive(),
  condition: Condition,
});

export const ReorderRequestSchema = z.object({
  lines: z.array(ReorderLineSchema).min(1, "Add at least one line"),
  note: z.string().trim().max(2000).optional(),
});
export type ReorderRequest = z.infer<typeof ReorderRequestSchema>;

export interface ReorderContext {
  customerId: string;
  endUserType: EndUserType;
  /** resolve a part by id (from the dataset) — gives us OEM number, ATA, origin. */
  getPart: (partId: string) => Part | undefined;
  now?: Date;
  idSuffix?: string;
}

export interface ReorderResult {
  rfq: Rfq;
  note: string | null;
}

/** Build a schema-valid portal-reorder RFQ. Throws ZodError on bad input, or a
 *  plain Error if a referenced part isn't in the catalogue. Never prices. */
export function buildReorderRfq(input: unknown, ctx: ReorderContext): ReorderResult {
  const req = ReorderRequestSchema.parse(input);
  const now = ctx.now ?? new Date();
  const suffix = ctx.idSuffix ?? Math.random().toString(36).slice(2, 8);
  const id = `rfq_portal_${now.getTime().toString(36)}_${suffix}`;

  const resolved = req.lines.map((l) => {
    const part = ctx.getPart(l.part_id);
    if (!part) throw new Error(`Unknown part: ${l.part_id}`);
    return { part, line: l };
  });

  const lines = resolved.map(({ part, line }) => ({
    part_number: part.oem_part_number,
    qty: line.qty,
    condition: line.condition,
    ata_chapter: part.ata_chapter,
  })) as [Rfq["lines"][number], ...Rfq["lines"][number][]];

  const anyUsOrigin = resolved.some(({ part }) => part.us_origin);

  const rfq = RfqSchema.parse({
    id,
    received_at: now.toISOString(),
    channel: "portal",
    customer_id: ctx.customerId,
    end_user_type: ctx.endUserType,
    lines,
    urgency: "routine",
    export_control_review: exportControlRequired(ctx.endUserType, anyUsOrigin),
    clarifications_needed: [],
    status: "new",
  });

  return { rfq, note: req.note ?? null };
}
