import { z } from "zod";
import { EndUserType } from "./common";

/** A point of contact at a customer organisation. */
export const ContactSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  role: z.string(),
});
export type Contact = z.infer<typeof ContactSchema>;

/** A company that buys from Arrow. `type` mirrors `RFQ.end_user_type`.
 *  `portal_enabled` gates access to the customer portal (Phase 3). */
export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EndUserType,
  country: z.string(),
  contacts: z.array(ContactSchema),
  portal_enabled: z.boolean(),
});
export type Customer = z.infer<typeof CustomerSchema>;
