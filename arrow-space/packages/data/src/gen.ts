import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  AircraftSchema,
  AogEventSchema,
  CustomerInventorySchema,
  CustomerSchema,
  OrderSchema,
  PartSchema,
  QuoteSchema,
  RfqSchema,
  SupplierPathSchema,
  TraceDocSchema,
  syntheticOf,
} from "@arrow-space/schema";
import { generateDataset, type Dataset } from "./generate";

const PROVENANCE = "SYNTHETIC — NOT REAL. Never quote a customer from this." as const;
const DATASET_VERSION = "v1" as const;

/** Locate the monorepo root (the dir holding pnpm-workspace.yaml). */
function repoRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    dir = dirname(dir);
  }
  throw new Error("could not locate monorepo root (pnpm-workspace.yaml)");
}

function parseSeed(argv: readonly string[]): number {
  const arg = argv.find((a) => a.startsWith("--seed"));
  if (!arg) return 42;
  const raw = arg.includes("=") ? arg.split("=")[1] : argv[argv.indexOf(arg) + 1];
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`invalid --seed: ${String(raw)}`);
  return n;
}

/** Stamp the synthetic marker on every record and validate against the
 *  corresponding synthetic schema. Throws (fails the build) on any mismatch. */
function validateStamped<S extends z.ZodObject<z.ZodRawShape>>(
  schema: S,
  records: readonly unknown[],
): unknown[] {
  const synthetic = syntheticOf(schema);
  return records.map((r) =>
    synthetic.parse({ ...(r as object), _synthetic: true, _dataset: DATASET_VERSION }),
  );
}

function main(): void {
  const seed = parseSeed(process.argv.slice(2));
  const data: Dataset = generateDataset(seed);

  const outputs: Record<string, unknown[]> = {
    parts: validateStamped(PartSchema, data.parts),
    supplier_paths: validateStamped(SupplierPathSchema, data.supplierPaths),
    customers: validateStamped(CustomerSchema, data.customers),
    aircraft: validateStamped(AircraftSchema, data.aircraft),
    rfqs: validateStamped(RfqSchema, data.rfqs),
    quotes: validateStamped(QuoteSchema, data.quotes),
    orders: validateStamped(OrderSchema, data.orders),
    trace_docs: validateStamped(TraceDocSchema, data.traceDocs),
    aog_events: validateStamped(AogEventSchema, data.aogEvents),
    customer_inventory: validateStamped(CustomerInventorySchema, data.customerInventory),
  };

  const outDir = join(repoRoot(), "data", "synthetic");
  mkdirSync(outDir, { recursive: true });

  const counts: Record<string, number> = {};
  for (const [name, records] of Object.entries(outputs)) {
    counts[name] = records.length;
    writeFileSync(join(outDir, `${name}.json`), JSON.stringify(records, null, 2) + "\n", "utf8");
  }

  // Manifest is deterministic by design — no wall-clock fields.
  const manifest = {
    provenance: PROVENANCE,
    dataset_version: DATASET_VERSION,
    seed,
    deterministic: true,
    note: "Regenerate with `pnpm gen:synthetic` (optionally `--seed <n>`). Same seed ⇒ identical output.",
    counts,
  };
  writeFileSync(join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n", "utf8");

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  process.stdout.write(
    `synthetic dataset ${DATASET_VERSION} (seed ${seed}) → ${outDir}\n` +
      Object.entries(counts).map(([k, v]) => `  ${k}: ${v}`).join("\n") +
      `\n  TOTAL: ${total} records\n`,
  );
}

main();
