import { z } from "zod";
import { Condition, LeadTimeTier } from "./common";

/** A part Arrow can supply. `us_origin` drives the export-control rule. */
export const PartSchema = z.object({
  id: z.string(),
  oem_part_number: z.string(),
  manufacturer: z.string(),
  ata_chapter: z.number().int().min(0).max(100),
  ata_subchapter: z.string(),
  description: z.string(),
  applicable_aircraft: z.array(z.string()),
  conditions_available: z.array(Condition).nonempty(),
  lead_time_tier: LeadTimeTier,
  us_origin: z.boolean(),
});
export type Part = z.infer<typeof PartSchema>;
