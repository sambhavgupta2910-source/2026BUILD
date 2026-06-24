import { z } from "zod";

/**
 * Shared enums, primitives, and the synthetic-provenance marker.
 *
 * Every enum below is the single source of truth for its allowed values — use
 * these, never re-declare string unions elsewhere. Each is exported twice: the
 * lowercase-namespaced value (the zod enum, e.g. `Condition`) and the
 * same-named type (`type Condition`). That is the intended zod pattern.
 */

/** Conditions a part can be supplied in. */
export const Condition = z.enum(["NEW", "OH", "SV", "AR"]);
export type Condition = z.infer<typeof Condition>;

/** How fast a part can be supplied. */
export const LeadTimeTier = z.enum(["stock", "24h", "48-72h", "quote"]);
export type LeadTimeTier = z.infer<typeof LeadTimeTier>;

/** Where a part is sourced from. `authorized`/`david_clark` are Arrow's own
 *  lineage; `gse_alliance`/`usm_broker` are third-party paths. */
export const SourceType = z.enum(["authorized", "david_clark", "gse_alliance", "usm_broker"]);
export type SourceType = z.infer<typeof SourceType>;

/** Intake channel. `portal` = a customer reorder from the gated portal. */
export const Channel = z.enum(["email", "whatsapp", "form", "phone", "portal"]);
export type Channel = z.infer<typeof Channel>;

/** End-user classification — drives priority and export-control logic. */
export const EndUserType = z.enum(["defense", "govt", "airline", "operator", "mro", "ga"]);
export type EndUserType = z.infer<typeof EndUserType>;

/** Urgency of an RFQ. `aog` = aircraft on ground. */
export const Urgency = z.enum(["aog", "critical", "routine"]);
export type Urgency = z.infer<typeof Urgency>;

/** RFQ lifecycle. */
export const RfqStatus = z.enum(["new", "triaged", "quoted", "won", "lost"]);
export type RfqStatus = z.infer<typeof RfqStatus>;

/** Quote outcome. */
export const QuoteOutcome = z.enum(["pending", "won", "lost"]);
export type QuoteOutcome = z.infer<typeof QuoteOutcome>;

/** Traceability document types every shipped part carries. */
export const TraceDocType = z.enum(["8130-3", "easa_form_1", "coc", "ata106"]);
export type TraceDocType = z.infer<typeof TraceDocType>;

/** Order fulfilment lifecycle. */
export const OrderStatus = z.enum(["placed", "sourcing", "shipped", "delivered", "closed"]);
export type OrderStatus = z.infer<typeof OrderStatus>;

/** ISO 4217 currency code, e.g. "USD", "INR". */
export const Currency = z
  .string()
  .regex(/^[A-Z]{3}$/, "ISO 4217 currency code (3 uppercase letters)");

/** ISO-8601 datetime string (accepts `Z` and explicit offsets). */
export const IsoDateTime = z.string().datetime({ offset: true });

// ---------------------------------------------------------------------------
// Synthetic provenance
// ---------------------------------------------------------------------------

/**
 * Marker stamped onto every generated record. NON-NEGOTIABLE: synthetic data
 * must never be mistaken for real or used to quote a customer. `_synthetic` is
 * the literal `true` (never absent-and-truthy), and `_dataset` names the run
 * that produced it. Real records simply omit these fields.
 */
export const SyntheticMeta = z.object({
  _synthetic: z.literal(true),
  _dataset: z.string(),
});
export type SyntheticMeta = z.infer<typeof SyntheticMeta>;

/**
 * Wrap a domain entity schema with the synthetic marker. The generator emits
 * `syntheticOf(PartSchema)` etc.; consumers can strip the marker by parsing
 * with the bare schema.
 */
export function syntheticOf<Shape extends z.ZodRawShape>(schema: z.ZodObject<Shape>) {
  return schema.extend({
    _synthetic: z.literal(true),
    _dataset: z.string(),
  });
}

/** True if a record carries the synthetic marker. */
export function isSynthetic(record: unknown): boolean {
  return (
    typeof record === "object" &&
    record !== null &&
    (record as { _synthetic?: unknown })._synthetic === true
  );
}
