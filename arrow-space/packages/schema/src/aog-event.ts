import { z } from "zod";
import { IsoDateTime } from "./common";

/** An aircraft-on-ground event tied to an RFQ, tracked against a response SLA. */
export const AogEventSchema = z.object({
  id: z.string(),
  rfq_id: z.string(),
  opened_at: IsoDateTime,
  responded_at: IsoDateTime.nullable(),
  sla_minutes: z.number().int().positive(),
  resolved: z.boolean(),
});
export type AogEvent = z.infer<typeof AogEventSchema>;
