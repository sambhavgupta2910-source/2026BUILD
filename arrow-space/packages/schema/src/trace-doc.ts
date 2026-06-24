import { z } from "zod";
import { TraceDocType } from "./common";

/** A traceability document for a shipped order. NON-NEGOTIABLE: every part
 *  carries traceability (8130-3 / EASA Form 1 / CoC / ATA106). Linked to an
 *  order via `order_id`; `Order.trace_doc_ids` closes the loop. */
export const TraceDocSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  type: TraceDocType,
  issued_by: z.string(),
  file_ref: z.string(),
});
export type TraceDoc = z.infer<typeof TraceDocSchema>;
