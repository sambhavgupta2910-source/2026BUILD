import { z } from "zod";
import { Condition, OrderStatus, IsoDateTime } from "./common";

/** One fulfilled line on an order. */
export const OrderLineSchema = z.object({
  part_id: z.string(),
  qty: z.number().int().positive(),
  unit_price: z.number().nonnegative(),
  condition: Condition,
});
export type OrderLine = z.infer<typeof OrderLineSchema>;

/** A won quote turned into a fulfilled order. It is the provenance behind a
 *  customer's bought inventory and carries the part traceability via
 *  `trace_doc_ids` (closing the loop with `TraceDoc.order_id`). */
export const OrderSchema = z.object({
  id: z.string(),
  quote_id: z.string(),
  rfq_id: z.string(),
  customer_id: z.string(),
  lines: z.array(OrderLineSchema).nonempty(),
  status: OrderStatus,
  placed_at: IsoDateTime,
  trace_doc_ids: z.array(z.string()),
});
export type Order = z.infer<typeof OrderSchema>;
