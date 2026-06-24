# @arrow-space/data

Deterministic **synthetic** data generator and the committed dataset it produces.

> **SYNTHETIC — NOT REAL.** Every record is stamped `_synthetic: true` + `_dataset`, and
> `data/synthetic/MANIFEST.json` carries the provenance string. Never present this data as real or
> use it to quote a customer. Real RFQ/customer data is kept separate, on the same schema/IDs.

## Run

```bash
pnpm gen:synthetic            # default seed (42) → data/synthetic/
pnpm --filter @arrow-space/data gen --seed 7   # any seed
```

Output is **byte-identical for a given seed** (the MANIFEST has no wall-clock fields). All records
are validated against `@arrow-space/schema` before they are written — a schema mismatch fails the
generate.

## What it produces (v1, seed 42)

`parts (150)`, `supplier_paths`, `customers (24)`, `aircraft`, `rfqs (300)`, `quotes`, `orders`,
`trace_docs`, `aog_events`, `customer_inventory` — each as a JSON array in `data/synthetic/`, plus
`MANIFEST.json`.

## Distributions (realism, not noise)

- **Parts** — ATA chapters weighted by real demand (landing gear, electrical, nav, comms dominate;
  doors/wings are rare; see `catalog.ts`). Chapter 23 is the David Clark headset line. `us_origin`
  is derived from the manufacturer (~78% of weighted supply is US-origin), so export-control
  flagging has something to bite on.
- **Supplier paths** — 1–3 per part across `authorized | david_clark | gse_alliance | usm_broker`,
  with cost multipliers and lead-time ranges that differ by source (authorized = slight premium /
  longer; USM = cheaper but variable; David Clark = stock for headsets).
- **RFQs** — customer-consistent `end_user_type`; part demand ATA-weighted; **AOG seasonality**
  (monsoon + year-end peaks raise the `aog` urgency share by month); channel mix incl. `portal`
  (higher when the customer is portal-enabled). `export_control_review` is set by the schema rule
  (`exportControlRequired`), never guessed.
- **Quotes** — only for RFQs that reached quoting. Line margins sampled from **per-class placeholder
  bands** (`margins.config.ts`), deliberately allowed to dip below the floor so `margin_floor_ok` is
  honestly mixed. `approved_by_human` is always `false` — synthetic data never pre-approves pricing.
- **Orders / trace docs** — won quotes become orders; shipped/delivered/closed orders always carry
  traceability (8130-3 + CoC, sometimes EASA Form 1 / ATA106), linked both ways.
- **AOG events** — one per `aog`-urgency RFQ, with SLA timers and mostly-met response times.
- **Customer inventory** — seeded from delivered/closed orders (provenance via `source_order_id`)
  **plus** a few self-declared holdings (seeding default is "both"), matched to a fitting fleet tail
  where the part applies.

## Placeholder margins — needs principal input

`margins.config.ts` holds **placeholder** per-class bands. The real per-part-class floors/bands are
private (BUILD_PLAN §9) and swap in with a single edit here. Synthetic margins are illustrative and
must never be shown as Arrow's real pricing.
