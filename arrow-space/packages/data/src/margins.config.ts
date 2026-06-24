/**
 * PLACEHOLDER margin bands by part class. NOT Arrow's real pricing.
 *
 * NEEDS PRINCIPAL INPUT (BUILD_PLAN §9): the real per-part-class margin floors
 * and bands are private and provided out-of-band. They live here, in ONE file,
 * so the real numbers swap in with a single edit. Synthetic margins sampled
 * from these bands are illustrative only and must never be presented as Arrow's
 * real pricing or used to quote a customer.
 */

export interface MarginBand {
  /** fraction, e.g. 0.18 = 18% */
  min: number;
  max: number;
}

export type PartClass =
  | "headset"
  | "avionics"
  | "landing_gear"
  | "rotable"
  | "consumable";

export const PLACEHOLDER_MARGIN_BANDS: Record<PartClass, MarginBand> = {
  headset: { min: 0.18, max: 0.32 },
  avionics: { min: 0.14, max: 0.28 },
  landing_gear: { min: 0.1, max: 0.22 },
  rotable: { min: 0.12, max: 0.26 },
  consumable: { min: 0.2, max: 0.42 },
};

/** Classify a part into a margin class from its ATA chapter + manufacturer. */
export function classifyPart(ataChapter: number, manufacturer: string): PartClass {
  if (manufacturer === "David Clark" || ataChapter === 23) return "headset";
  if ([22, 31, 34, 77].includes(ataChapter)) return "avionics";
  if (ataChapter === 32) return "landing_gear";
  if ([49, 71, 72, 73, 74, 75, 76, 78, 79, 80].includes(ataChapter)) return "rotable";
  return "consumable";
}
