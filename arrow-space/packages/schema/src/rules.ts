import type { EndUserType } from "./common";
import type { Quote } from "./quote";

/**
 * The non-negotiables, encoded as pure functions so they can be enforced and
 * tested everywhere instead of living only in prose. These NEVER bypass a
 * control — they only flag what requires human handling.
 */

// ---------------------------------------------------------------------------
// Export control
// ---------------------------------------------------------------------------

/**
 * US-origin parts going to a defense/government end-user require an
 * export-control review (end-use statement, ITAR/EAR classification) with human
 * sign-off. This predicate decides `RFQ.export_control_review`. It flags when
 * review is required; it never clears a control.
 */
export function exportControlRequired(
  endUserType: EndUserType,
  anyLineUsOrigin: boolean,
): boolean {
  const restrictedEndUser = endUserType === "defense" || endUserType === "govt";
  return anyLineUsOrigin && restrictedEndUser;
}

// ---------------------------------------------------------------------------
// Margin floor + human approval
// ---------------------------------------------------------------------------

/**
 * Placeholder margin floor (fraction; 0.15 = 15%). Arrow's REAL per-part-class
 * bands are private and provided out-of-band by the principal (see BUILD_PLAN
 * §9). Do not treat this as the real floor — it exists only so the rule is
 * exercisable end-to-end until the real bands are wired in.
 */
export const PLACEHOLDER_MARGIN_FLOOR_PCT = 0.15;

/**
 * Margin floor on EVERY line of a quote. Returns false for an empty quote — a
 * quote with no priced lines cannot be "ok".
 */
export function marginFloorOk(
  lineMarginsPct: readonly number[],
  floorPct: number = PLACEHOLDER_MARGIN_FLOOR_PCT,
): boolean {
  return lineMarginsPct.length > 0 && lineMarginsPct.every((m) => m >= floorPct);
}

/**
 * The pricing non-negotiable in one function: a quote may leave the building
 * ONLY when it clears the margin floor AND a human has approved it. Every
 * outbound-pricing path must gate on this — there is no auto-send.
 */
export function canQuoteBeSent(
  quote: Pick<Quote, "margin_floor_ok" | "approved_by_human">,
): boolean {
  return quote.margin_floor_ok === true && quote.approved_by_human === true;
}
