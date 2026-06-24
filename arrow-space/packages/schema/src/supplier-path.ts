import { z } from "zod";
import { Currency, SourceType } from "./common";

/** A way to source a given part (one part has many supplier paths). */
export const SupplierPathSchema = z.object({
  id: z.string(),
  part_id: z.string(),
  source_type: SourceType,
  unit_cost: z.number().nonnegative(),
  currency: Currency,
  lead_time_days: z.number().int().nonnegative(),
});
export type SupplierPath = z.infer<typeof SupplierPathSchema>;
