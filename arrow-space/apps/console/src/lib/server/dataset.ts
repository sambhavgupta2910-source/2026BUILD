import "server-only";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  CustomerSchema,
  PartSchema,
  RfqSchema,
  SupplierPathSchema,
  type Customer,
  type Part,
  type Rfq,
  type SupplierPath,
} from "@arrow-space/schema";
import { syntheticDir, intakeDir } from "./paths";

/**
 * The operator's view of the world: the committed synthetic dataset PLUS the
 * live intake queue (web RFQ/AOG forms + portal reorders), merged into one
 * queue across every channel. Synthetic — clearly labelled, never real.
 */

function readArray<T>(file: string, schema: z.ZodType<T>): T[] {
  const dir = syntheticDir();
  if (!dir) return [];
  const path = join(dir, file);
  if (!existsSync(path)) return [];
  try {
    return z.array(schema).parse(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return [];
  }
}

/** RFQs written to the intake queue by the web forms and portal reorders. Each
 *  file is `{ rfq, ... }`; we lift out the validated RFQ. */
function readIntakeRfqs(): { rfq: Rfq; source: string }[] {
  const dir = intakeDir();
  if (!dir || !existsSync(dir)) return [];
  const out: { rfq: Rfq; source: string }[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    try {
      const rec = JSON.parse(readFileSync(join(dir, f), "utf8")) as {
        rfq?: unknown;
        _source?: unknown;
      };
      const rfq = RfqSchema.parse(rec.rfq);
      out.push({ rfq, source: typeof rec._source === "string" ? rec._source : "intake" });
    } catch {
      // skip malformed queue entries
    }
  }
  return out;
}

export interface ConsoleData {
  rfqs: Rfq[];
  liveSources: Map<string, string>; // rfq.id → intake source (web-intake / portal-reorder)
  parts: Part[];
  partById: Map<string, Part>;
  partByNumber: Map<string, Part>;
  pathsByPart: Map<string, SupplierPath[]>;
  customerById: Map<string, Customer>;
}

let cache: ConsoleData | null = null;

export function consoleData(): ConsoleData {
  if (cache) return cache;

  const parts = readArray("parts.json", PartSchema);
  const supplierPaths = readArray("supplier_paths.json", SupplierPathSchema);
  const customers = readArray("customers.json", CustomerSchema);
  const syntheticRfqs = readArray("rfqs.json", RfqSchema);
  const intake = readIntakeRfqs();

  const liveSources = new Map<string, string>();
  const byId = new Map<string, Rfq>();
  for (const r of syntheticRfqs) byId.set(r.id, r);
  for (const { rfq, source } of intake) {
    byId.set(rfq.id, rfq);
    liveSources.set(rfq.id, source);
  }

  const pathsByPart = new Map<string, SupplierPath[]>();
  for (const sp of supplierPaths) {
    const list = pathsByPart.get(sp.part_id) ?? [];
    list.push(sp);
    pathsByPart.set(sp.part_id, list);
  }

  cache = {
    rfqs: [...byId.values()],
    liveSources,
    parts,
    partById: new Map(parts.map((p) => [p.id, p])),
    partByNumber: new Map(parts.map((p) => [p.oem_part_number, p])),
    pathsByPart,
    customerById: new Map(customers.map((c) => [c.id, c])),
  };
  return cache;
}

const URGENCY_RANK: Record<Rfq["urgency"], number> = { aog: 0, critical: 1, routine: 2 };

/** Operator queue: AOG first, then critical, then most recent. */
export function queue(): Rfq[] {
  return [...consoleData().rfqs].sort((a, b) => {
    const u = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    return u !== 0 ? u : b.received_at.localeCompare(a.received_at);
  });
}

export function getRfq(id: string): Rfq | undefined {
  return consoleData().rfqs.find((r) => r.id === id);
}
