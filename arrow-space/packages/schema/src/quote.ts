import { z } from "zod";
import { QuoteOutcome } from "./common";

/** One priced line on a quote. `margin_pct` is a fraction (0.18 = 18%); the
 *  same unit is used by the margin-floor rule in `rules.ts`. */
export const QuoteLineSchema = z.object({
  part_id: z.string(),
  supplier_path_id: z.string(),
  unit_price: z.number().nonnegative(),
  margin_pct: z.number(),
});
export type QuoteLine = z.infer<typeof QuoteLineSchema>;

/**
 * A quote against an RFQ. NON-NEGOTIABLE: `margin_floor_ok` records that every
 * line clears the (private) margin floor, and `approved_by_human` must be true
 * before a quote may leave the building. See `canQuoteBeSent` in `rules.ts` —
 * there is no path that auto-sends pricing.
 */
export const QuoteSchema = z.object({
  id: z.string(),
  rfq_id: z.string(),
  lines: z.array(QuoteLineSchema).nonempty(),
  total: z.number().nonnegative(),
  margin_floor_ok: z.boolean(),
  approved_by_human: z.boolean(),
  outcome: QuoteOutcome,
  lost_reason: z.string().nullable(),
});
export type Quote = z.infer<typeof QuoteSchema>;
