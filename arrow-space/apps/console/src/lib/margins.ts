import { classifyPart, PLACEHOLDER_MARGIN_BANDS } from "@arrow-space/data/margins";
import type { Part } from "@arrow-space/schema";

/**
 * Suggested DRAFT margin for a part = the midpoint of its (placeholder) class
 * band. Deterministic, and a single edit in @arrow-space/data swaps in the
 * principal's real private bands. This is a suggestion for the operator's
 * draft — never an auto-approved price.
 */
export function suggestedMarginPct(part: Part): number {
  const band = PLACEHOLDER_MARGIN_BANDS[classifyPart(part.ata_chapter, part.manufacturer)];
  const mid = (band.min + band.max) / 2;
  return Math.round(mid * 1000) / 1000;
}
