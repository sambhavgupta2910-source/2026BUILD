import { z } from "zod";
import {
  AogEventSchema,
  Condition,
  EndUserType,
  RfqSchema,
  exportControlRequired,
  type AogEvent,
  type Rfq,
} from "@arrow-space/schema";

/**
 * Intake → schema. This module turns a public form submission into a
 * schema-valid `RFQ` (and, for AOG, an `AogEvent`). It is the load-bearing bit
 * of Phase 1 and is deliberately pure + injected (clock, id, origin lookup) so
 * it is fully testable. It NEVER returns a price, NEVER auto-quotes, and NEVER
 * clears an export-control flag.
 */

/** Shape accepted from the RFQ / AOG forms. Validated for field errors. */
export const IntakeLineSchema = z.object({
  part_number: z.string().trim().min(1, "Part number is required"),
  qty: z.coerce.number().int().positive("Quantity must be a positive whole number"),
  condition: Condition,
  ata_chapter: z.coerce.number().int().min(0).max(100).optional(),
});

export const IntakeFormSchema = z.object({
  organisation: z.string().trim().min(1, "Organisation is required"),
  end_user_type: EndUserType,
  contact_email: z.union([z.string().trim().email(), z.literal("")]).optional(),
  contact_phone: z.string().trim().optional(),
  urgency: z.enum(["routine", "critical"]).optional(),
  message: z.string().trim().max(4000).optional(),
  tail_number: z.string().trim().optional(),
  aircraft_type: z.string().trim().optional(),
  lines: z.array(IntakeLineSchema).min(1, "Add at least one line"),
});
export type IntakeForm = z.infer<typeof IntakeFormSchema>;

export interface BuildOptions {
  /** AOG route forces urgency = aog and opens an AogEvent. */
  isAog?: boolean;
  /** part_number → us_origin (true/false), or undefined when unknown. */
  usOrigin: (partNumber: string) => boolean | undefined;
  /** injected for determinism; defaults to now / random. */
  now?: Date;
  idSuffix?: string;
}

export interface BuildResult {
  rfq: Rfq;
  aogEvent?: AogEvent;
  /** contact + free-text kept beside the RFQ (the RFQ schema has no PII fields). */
  submission: {
    organisation: string;
    contact_email: string | null;
    contact_phone: string | null;
    message: string | null;
    tail_number: string | null;
    aircraft_type: string | null;
  };
}

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "prospect";

const AOG_LANGUAGE = /\b(aog|aircraft on ground|grounded|stranded|wing\s*down|on the ground)\b/i;
const URGENT_LANGUAGE = /\b(urgent|asap|critical|immediately|today|expedite|rush)\b/i;

/** Build a schema-valid RFQ (and AogEvent for AOG) from a parsed form. Throws a
 *  ZodError if the form is invalid (caller surfaces field errors). */
export function buildIntakeRfq(input: unknown, opts: BuildOptions): BuildResult {
  const form = IntakeFormSchema.parse(input);
  const now = opts.now ?? new Date();
  const suffix = opts.idSuffix ?? Math.random().toString(36).slice(2, 8);
  const receivedAt = now.toISOString();
  const id = `rfq_form_${now.getTime().toString(36)}_${suffix}`;

  const clarifications: string[] = [];

  const lines = form.lines.map((l) => {
    if (l.ata_chapter === undefined) {
      clarifications.push(`ATA chapter unconfirmed for part ${l.part_number}`);
    }
    return {
      part_number: l.part_number,
      qty: l.qty,
      condition: l.condition,
      ata_chapter: l.ata_chapter ?? 0,
    };
  }) as [Rfq["lines"][number], ...Rfq["lines"][number][]];

  // Urgency: AOG route forces aog; otherwise honour the language / explicit pick.
  const text = `${form.message ?? ""} ${form.tail_number ?? ""}`;
  let urgency: Rfq["urgency"];
  if (opts.isAog || AOG_LANGUAGE.test(text)) {
    urgency = "aog";
  } else if (form.urgency === "critical" || URGENT_LANGUAGE.test(text)) {
    urgency = "critical";
  } else {
    urgency = "routine";
  }

  // Export control — fail-safe. Flag when any line is US-origin AND the end-user
  // is defense/govt; ALSO flag (and clarify) when origin is unknown for those
  // end-users. Never clears a control.
  const restricted = form.end_user_type === "defense" || form.end_user_type === "govt";
  const anyUsOrigin = form.lines.some((l) => opts.usOrigin(l.part_number) === true);
  const unknownOrigin = form.lines.filter((l) => opts.usOrigin(l.part_number) === undefined);
  let exportControlReview = exportControlRequired(form.end_user_type, anyUsOrigin);
  if (restricted && unknownOrigin.length > 0) {
    exportControlReview = true;
    clarifications.push(
      `Confirm country-of-origin (US-origin?) for: ${unknownOrigin.map((l) => l.part_number).join(", ")}`,
    );
  }

  if (!form.contact_email && !form.contact_phone) {
    clarifications.push("No contact email or phone provided");
  }

  const rfq = RfqSchema.parse({
    id,
    received_at: receivedAt,
    channel: "form",
    customer_id: `prospect:${slug(form.organisation)}`,
    end_user_type: form.end_user_type,
    lines,
    urgency,
    export_control_review: exportControlReview,
    clarifications_needed: clarifications,
    status: "new",
  });

  const result: BuildResult = {
    rfq,
    submission: {
      organisation: form.organisation,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone ?? null,
      message: form.message ?? null,
      tail_number: form.tail_number ?? null,
      aircraft_type: form.aircraft_type ?? null,
    },
  };

  if (opts.isAog || urgency === "aog") {
    // tighter SLA for defense/govt AOG
    const slaMinutes = restricted ? 30 : 60;
    result.aogEvent = AogEventSchema.parse({
      id: `aog_form_${now.getTime().toString(36)}_${suffix}`,
      rfq_id: id,
      opened_at: receivedAt,
      responded_at: null,
      sla_minutes: slaMinutes,
      resolved: false,
    });
  }

  return result;
}
