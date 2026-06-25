import "server-only";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Rfq } from "@arrow-space/schema";
import { intakeDir } from "./paths";

/**
 * Persists a portal-reorder RFQ to the SAME operator intake queue as the web
 * forms (one queue). The stored record is the schema-valid RFQ plus a synthetic
 * envelope. Returns the path, or null on a read-only FS (the reorder still
 * succeeds — Phase 3 runs on synthetic data).
 */
export interface PersistedReorder {
  _synthetic: true;
  _source: "portal-reorder";
  rfq: Rfq;
  note: string | null;
  customer_id: string;
}

export function persistReorder(rfq: Rfq, note: string | null, customerId: string): string | null {
  const dir = intakeDir();
  if (!dir) return null;
  const record: PersistedReorder = {
    _synthetic: true,
    _source: "portal-reorder",
    rfq,
    note,
    customer_id: customerId,
  };
  try {
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `${rfq.id}.json`);
    writeFileSync(path, JSON.stringify(record, null, 2) + "\n", "utf8");
    return path;
  } catch {
    return null;
  }
}
