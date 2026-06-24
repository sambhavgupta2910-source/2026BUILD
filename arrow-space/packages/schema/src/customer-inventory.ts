import { z } from "zod";
import { Condition, IsoDateTime } from "./common";

/** A part a customer owns / has bought from Arrow. `source_order_id` ties the
 *  holding back to the order that produced it — the provenance the portal
 *  renders and the reference a one-click reorder uses. */
export const CustomerInventorySchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  part_id: z.string(),
  aircraft_id: z.string().nullable(),
  condition: Condition,
  qty_on_hand: z.number().int().nonnegative(),
  last_purchased_at: IsoDateTime.nullable(),
  source_order_id: z.string().nullable(),
});
export type CustomerInventory = z.infer<typeof CustomerInventorySchema>;
