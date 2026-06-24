import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { syntheticDir } from "./repo-paths";

/**
 * Loads us_origin per OEM part number from the committed synthetic parts
 * dataset, so intake can apply the export-control rule. If the dataset can't be
 * found (e.g. a read-only deploy), the lookup returns `undefined` for every
 * part — which the intake logic treats as "unknown origin" and, for
 * defense/govt end-users, fail-safe flags the RFQ for export-control review.
 */
let cache: Map<string, boolean> | null = null;

function load(): Map<string, boolean> {
  const map = new Map<string, boolean>();
  const dir = syntheticDir();
  if (!dir) return map;
  const file = join(dir, "parts.json");
  if (!existsSync(file)) return map;
  try {
    const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
    if (Array.isArray(parsed)) {
      for (const p of parsed) {
        if (
          p &&
          typeof p === "object" &&
          typeof (p as { oem_part_number?: unknown }).oem_part_number === "string" &&
          typeof (p as { us_origin?: unknown }).us_origin === "boolean"
        ) {
          const rec = p as { oem_part_number: string; us_origin: boolean };
          map.set(rec.oem_part_number, rec.us_origin);
        }
      }
    }
  } catch {
    // fall through to whatever we have (possibly empty) — never throw on intake
  }
  return map;
}

export function usOriginLookup(): (partNumber: string) => boolean | undefined {
  if (!cache) cache = load();
  const map = cache;
  return (partNumber: string) => map.get(partNumber);
}
