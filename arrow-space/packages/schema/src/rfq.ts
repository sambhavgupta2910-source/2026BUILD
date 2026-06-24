import { z } from "zod";
import { Channel, Condition, EndUserType, RfqStatus, Urgency, IsoDateTime } from "./common";

/** One requested line on an RFQ. References a part by OEM number (intake may
 *  not have resolved it to a Part.id yet). */
export const RfqLineSchema = z.object({
  part_number: z.string(),
  qty: z.number().int().positive(),
  condition: Condition,
  ata_chapter: z.number().int().min(0).max(100),
});
export type RfqLine = z.infer<typeof RfqLineSchema>;

/**
 * A request for quote — the single object every intake channel produces,
 * including portal reorders (`channel = "portal"`). `export_control_review` is
 * set by the rule in `rules.ts`: true when any line is US-origin AND the
 * end-user is defense/govt.
 */
export const RfqSchema = z.object({
  id: z.string(),
  received_at: IsoDateTime,
  channel: Channel,
  customer_id: z.string(),
  end_user_type: EndUserType,
  lines: z.array(RfqLineSchema).nonempty(),
  urgency: Urgency,
  export_control_review: z.boolean(),
  clarifications_needed: z.array(z.string()),
  status: RfqStatus,
});
export type Rfq = z.infer<typeof RfqSchema>;
