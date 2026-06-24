import { z } from "zod";

/** A customer's fleet entry. `type_model` aligns with `Part.applicable_aircraft`
 *  so owned parts can be matched to the airframes they fit. */
export const AircraftSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  registration: z.string(),
  type_model: z.string(),
  serial_number: z.string().nullable(),
  in_service: z.boolean(),
});
export type Aircraft = z.infer<typeof AircraftSchema>;
