# Arrow Space — Build Plan & Handoff

**Status:** Phase 0 (foundation) → Phase 1 (front door + capture). Synthetic-data-first.
**Audience:** the next builder (Codex / Claude) and the principal (review + sign-off).
**Source of truth:** `docs/arrow-space-build-spec.md`. This document operationalizes it.

---

## 0. What we are building (exactly)

A **private operator OS** that sits on top of Arrow Aviation's existing distribution workflow —
**not** a website with AI bolted on. One operator runs at the Satair / AJW institutional bar.

Four surfaces + a data/agent spine:

| Surface | What it is | Phase |
|---|---|---|
| `apps/web` | Institutional, authorization-led marketing site + structured RFQ/AOG intake | 1 |
| `apps/portal` | Gated customer portal (orders, quotes, docs, inventory) | 3 |
| `apps/console` | Internal operator console (RFQ queue, triage, draft-quote approval) | 2 |
| `packages/*` | Schema (the data contract), synthetic data, intake, engine, compliance, BI | 0+ |
| `.claude/*` | Operator layer: subagents, slash commands, safety hooks | 0 |

**Principle:** *instrument → shadow → augment → selectively automate.* Pricing and compliance stay
human forever. Build on **synthetic data now**, behind a schema that swaps to real data later with
zero refactor.

---

## 1. Current state (read this)

- **Phase 0 and Phase 1 are complete on this branch.** Monorepo scaffolded; data contract, synthetic
  generator + dataset, the test suite, and the `.claude/` operator layer (Phase 0); plus the
  institutional site `apps/web` with structured RFQ/AOG intake → schema (Phase 1). `pnpm typecheck`
  + `pnpm test` green (59 tests); `next build` green. Next is Phase 3 (`apps/portal`).
- Done so far: **Task 1** (pnpm + Turborepo scaffold; `apps/{web,portal,console}` stubs;
  `packages/schema`), **Task 2** (all ten entities as zod + inferred types, the `syntheticOf`
  marker, `assert*` helpers, and the non-negotiables encoded in `rules.ts`), **Task 3** (the
  deterministic synthetic generator + committed `data/synthetic/` dataset v1), and **Task 4** (the
  validation/determinism/integrity test suite). `pnpm typecheck` + `pnpm test` (47 tests) green.
- Two parallel prototypes exist on other (unmerged) branches and are reference-only: a Next.js
  portal (`claude/focused-keller-4jpxy3`, under `arrow-space/web/`) and a vanilla-JS clickable demo
  (`codex/arrow-space-build-1`, under `arrow-space-codex/`). We port copy/ideas from them; the
  schema-first monorepo on this branch is the base.
- The next builder continues at **§7 Task breakdown** — Phases 0 and 1 are done; next up is **Task
  11** (Phase 3 `apps/portal`: auth + gated shell), then fleet/inventory views and portal reorder.

---

## 2. Repo structure (target monorepo)

```
arrow-space/                  # (today a subproject of 2026BUILD; promotable to its own repo)
├── CLAUDE.md                 # always-loaded project memory (DONE)
├── AGENTS.md                 # Codex/Claude handoff (DONE)
├── README.md                 # (DONE)
├── .mcp.json                 # scoped MCP servers (Phase 0+)
├── package.json              # workspace root
├── pnpm-workspace.yaml       # pnpm workspaces
├── turbo.json                # Turborepo pipeline
├── tsconfig.base.json        # shared TS config
├── .claude/
│   ├── settings.json         # hooks + permissions
│   ├── agents/               # subagent definitions (*.md)
│   └── commands/             # slash commands (*.md)
├── apps/
│   ├── web/                  # institutional site (Next.js)  ← Phase 1
│   ├── portal/               # gated customer portal (stub now)
│   └── console/              # internal operator console (stub now)
├── packages/
│   ├── schema/               # THE DATA CONTRACT (zod + TS types)  ← build first
│   ├── data/                 # synthetic generator + datasets       ← build second
│   ├── intake/               # email/WhatsApp/form parsers (later)
│   ├── engine/               # rfq-triage + quote-builder (later)
│   ├── compliance/           # trace-pack + export-control (later)
│   └── bi/                   # dashboards + pipelines (later)
└── data/synthetic/           # generated datasets (committed, labelled synthetic)
```

**Tooling:** pnpm + Turborepo workspace. TypeScript strict. Zod for runtime validation. Next.js
(App Router) + Tailwind for `apps/web`. Vitest (or node:test) for tests. Deploy target: **Vercel**.

---

## 3. The data contract — `packages/schema`

This is **load-bearing**: the shape real data will later occupy. Implement as TS types **and** zod
schemas (zod is the single source; derive types with `z.infer`). Every field below is required
unless marked nullable/optional. Use string enums exactly as listed.

### 3.1 `Part`
| Field | Type | Notes |
|---|---|---|
| `id` | string | stable id (e.g. `part_000123`) |
| `oem_part_number` | string | OEM P/N |
| `manufacturer` | string | e.g. Hawker Beechcraft, David Clark |
| `ata_chapter` | number | ATA 100 chapter |
| `ata_subchapter` | string | e.g. `"32-40"` |
| `description` | string | |
| `applicable_aircraft` | string[] | cross-compatibility list |
| `conditions_available` | enum[] | subset of `NEW \| OH \| SV \| AR` |
| `lead_time_tier` | enum | `stock \| 24h \| 48-72h \| quote` |
| `us_origin` | boolean | drives export-control logic |

### 3.2 `SupplierPath`
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `part_id` | string | FK → Part.id |
| `source_type` | enum | `authorized \| david_clark \| gse_alliance \| usm_broker` |
| `unit_cost` | number | |
| `currency` | string | ISO 4217 (e.g. `USD`, `INR`) |
| `lead_time_days` | number | |

### 3.3 `RFQ`
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `received_at` | datetime (ISO string) | |
| `channel` | enum | `email \| whatsapp \| form \| phone \| portal` (`portal` = customer reorder) |
| `customer_id` | string | |
| `end_user_type` | enum | `defense \| govt \| airline \| operator \| mro \| ga` |
| `lines` | object[] | `{ part_number, qty, condition, ata_chapter }` |
| `urgency` | enum | `aog \| critical \| routine` |
| `export_control_review` | boolean | **true** if any line is US-origin AND end_user ∈ {defense, govt} |
| `clarifications_needed` | string[] | missing fields the triage couldn't resolve |
| `status` | enum | `new \| triaged \| quoted \| won \| lost` |

### 3.4 `Quote`
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `rfq_id` | string | FK → RFQ.id |
| `lines` | object[] | `{ part_id, supplier_path_id, unit_price, margin_pct }` |
| `total` | number | |
| `margin_floor_ok` | boolean | every line ≥ the part-class margin floor |
| `approved_by_human` | boolean | **must be true before any quote leaves the building** |
| `outcome` | enum | `pending \| won \| lost` |
| `lost_reason` | string \| null | |

### 3.5 `TraceDoc`
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `order_id` | string | |
| `type` | enum | `8130-3 \| easa_form_1 \| coc \| ata106` |
| `issued_by` | string | |
| `file_ref` | string | path/URL into the doc vault |

### 3.6 `AogEvent`
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `rfq_id` | string | FK → RFQ.id |
| `opened_at` | datetime (ISO string) | |
| `responded_at` | datetime \| null | |
| `sla_minutes` | number | response target |
| `resolved` | boolean | |

### 3.7 `Customer` (a company that buys from Arrow)
| Field | Type | Notes |
|---|---|---|
| `id` | string | (RFQ.customer_id, Order.customer_id FK here) |
| `name` | string | company name |
| `type` | enum | `defense \| govt \| airline \| operator \| mro \| ga` (mirrors `end_user_type`) |
| `country` | string | |
| `contacts` | object[] | `{ name, email, phone, role }` |
| `portal_enabled` | boolean | gated portal access |

### 3.8 `Aircraft` (a customer's fleet entry)
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `customer_id` | string | FK → Customer.id |
| `registration` | string | tail number |
| `type_model` | string | e.g. "Beechcraft King Air B200" (aligns with `Part.applicable_aircraft`) |
| `serial_number` | string \| null | |
| `in_service` | boolean | |

### 3.9 `CustomerInventory` (parts a customer owns / has bought from Arrow)
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `customer_id` | string | FK → Customer.id |
| `part_id` | string | FK → Part.id |
| `aircraft_id` | string \| null | which fleet entry it's installed on / assigned to |
| `condition` | enum | `NEW \| OH \| SV \| AR` |
| `qty_on_hand` | number | |
| `last_purchased_at` | datetime \| null | |
| `source_order_id` | string \| null | FK → Order.id (provenance + reorder reference) |

### 3.10 `Order` (a won quote → fulfilled order; provenance for bought inventory)
| Field | Type | Notes |
|---|---|---|
| `id` | string | |
| `quote_id` | string | FK → Quote.id |
| `rfq_id` | string | FK → RFQ.id |
| `customer_id` | string | FK → Customer.id |
| `lines` | object[] | `{ part_id, qty, unit_price, condition }` |
| `status` | enum | `placed \| sourcing \| shipped \| delivered \| closed` |
| `placed_at` | datetime (ISO string) | |
| `trace_doc_ids` | string[] | FK → TraceDoc.id (the part's traceability) |

**Schema acceptance:** all ten entities exported as zod schemas + inferred types; an `index.ts`
barrel; helpers `assertRfq`, `assertQuote`, etc.; a `SYNTHETIC` provenance marker on generated
records so synthetic data can never be mistaken for real (see §4). `TraceDoc.order_id` and
`Order.trace_doc_ids` close the part↔traceability loop the portal renders.

---

## 4. Synthetic data — `packages/data`

Single command: **`pnpm gen:synthetic`** → writes dataset **v1** to `data/synthetic/`,
**deterministic by seed** (default seed committed; allow `--seed`). Emit **realistic distributions,
not random noise**, so the engine and dashboards are honest dry-runs.

Every record carries a clear synthetic marker (e.g. `_synthetic: true` + a top-level
`data/synthetic/MANIFEST.json` stamped `"provenance": "SYNTHETIC — NOT REAL. Never quote a customer
from this."`). Validate **all** output against `packages/schema` before writing.

### Datasets and the realism that matters
1. **Parts (~150)** across a Beechcraft/Hawker + corridor GA/rotary fleet. Real ATA-chapter spread,
   condition-code mix (NEW/OH/SV/AR), lead-time tiers, cross-compatibility, `us_origin` flag on a
   realistic share.
2. **Supplier paths** per part across `authorized` / `david_clark` / `gse_alliance` / `usm_broker`
   with cost + lead-time that differ sensibly by source (authorized = higher cost/longer for some;
   USM = variable; David Clark line for headset P/Ns).
3. **RFQs (~300)** with **ATA-frequency weighting** (some chapters dominate), **AOG seasonality**,
   and an **urgency mix** (aog/critical/routine). Set `export_control_review` per the rule. Flag a
   realistic subset for export-control review (US-origin + defense/govt end-user).
4. **Quotes** matched to RFQs with **margin bands by part class**, realistic **win/loss** and
   **quote→order conversion**. `margin_floor_ok` computed; `approved_by_human` defaults **false**.
5. **Trace docs** — mock 8130-3 / EASA Form 1 / CoC / ATA106 per shipped order.
6. **AOG events** — time-critical distribution with SLA timers and response-time targets.

**Determinism:** use a seeded PRNG (e.g. `mulberry32`/`seedrandom`); same seed ⇒ byte-identical
output. **Distributions, not noise:** weight ATA chapters, model seasonality, sample margins from
per-class bands. Document the distribution choices in `packages/data/README.md`.

> **NEEDS PRINCIPAL INPUT (do not guess):** real **margin-floor values by part class** and the
> margin **bands**. Until provided, use clearly-labelled placeholder bands in synthetic data and
> centralize them in one config (`packages/data/src/margins.config.ts`) so they swap in one edit.
> Synthetic margins are illustrative and must never be presented as Arrow's real pricing.

---

## 5. Operator layer — `.claude/`

Per spec §5.3–5.5. Phase 0 brings up the minimum:

- **Subagents** (`.claude/agents/*.md`): `rfq-triage` (parse RFQ → structured object; ATA classify;
  AOG + export-control flags; never invents P/Ns; never quotes a price), `synthetic-data`
  (generate/refresh datasets to schema).
- **Slash commands** (`.claude/commands/*.md`): `/new-rfq` (raw blob → triage → DRAFT quote
  skeleton, clearly labelled, human-approval required), `/gen-synthetic` (regenerate a dataset).
- **Hooks** (`.claude/settings.json`): PreToolUse blocks secrets leaving the repo + blocks silent
  edits to `data/synthetic/` without a flag; PostToolUse runs typecheck/tests before stop + appends
  an audit-log line. *(Verify exact hooks schema against current Claude Code docs.)*

---

## 6. Phase 1 — `apps/web` (the front door)

**Goal:** a credible, authorization-led institutional site; RFQs land **structured**; real RFQ
capture begins. Next.js (App Router) + Tailwind, deployed to **Vercel**.

### Information architecture
1. **Hero — authorization-led.** "Arrow Space — the institutional operations platform of Arrow
   Aviation Services." Lead with the lineage: Hawker Beechcraft/Textron authorized distributor
   (2008), sole David Clark India (2005), DGCA propeller workshop, 24/7 AOG. No retail tone.
2. **Authorizations & Quality trust spine.** The credential rail: authorizations, traceability
   standards (8130-3 / EASA Form 1 / CoC / ATA106), AS9120-aligned records, quality discipline.
   *(AS9120/ASA listing status is an open input — see §9.)*
3. **Capabilities.** 24/7 AOG, repairs, overhaul & exchange, logistics, quality documentation,
   sourcing.
4. **Markets — defense-first ordering.** Defense & Government → Airlines & Operators → MRO/Part-145
   → Business & GA / flying schools (explicitly the demoted tail).
5. **AOG desk page.** Always-on framing, SLA expectations, fast-path intake.
6. **Self-serve store (DEMOTED).** David Clark / Bose headsets as a browsable catalog section — not
   the headline. **Strip all retail signals**: no payment-card icons, no cart/checkout. CTA is
   "request pricing / enquire," routing into the RFQ intake. (Default decision; confirm with
   principal if e-commerce checkout is ever wanted — currently out of scope.)

### Strip retail signals (explicit)
- Remove headset-store-first navigation and any payment-card iconography.
- Store demoted to a self-serve tail section; institutional credentials lead every page.

### Intake → schema (the load-bearing bit)
- **Structured RFQ form** and **AOG intake form** post to a Next.js Route Handler
  (`app/api/rfq/route.ts`) that **validates the payload against the `RFQ` zod schema** from
  `packages/schema` and persists the object to the intake queue at
  `data/synthetic/intake/<id>.json` (clearly synthetic store for now; same schema/IDs swap to real
  later).
- On submit, the handler:
  - normalizes channel = `form`, sets `status = new`, timestamps `received_at`;
  - sets `urgency` (AOG form ⇒ `aog`; honor "grounded"/tail-number/time-pressure language);
  - computes `export_control_review` (US-origin line + end_user ∈ {defense, govt});
  - records `clarifications_needed` for missing fields;
  - **never returns a price, never auto-quotes, never emails the customer.**
- Optionally open an `AogEvent` (with `sla_minutes`) when the AOG form is used.

### Phase 1 acceptance (exit)
- Site renders the IA above; retail signals stripped; brand-forward.
- RFQ + AOG forms write schema-valid `RFQ` objects to the queue; invalid payloads are rejected with
  field errors.
- No pricing is ever shown or sent. Export-control flag is set per rule.
- Builds and deploys to Vercel; `pnpm typecheck` + `pnpm test` green.

---

## 6.5 Customer fleet, inventory & reorder — `apps/portal` (gated)

**The capability (in the principal's words):** each customer (a company that buys from Arrow) gets a
backend where they **list their aircraft** and see **the inventory they've bought from us**, so they
can **go to the website and order again**. A reorder becomes an **inquiry Arrow receives and pushes
to its vendors to deliver to them.**

This lives in the **gated customer portal** (`apps/portal`) and **reuses the existing RFQ pipeline** —
a reorder is just an `RFQ` with `channel = portal`. Nothing about pricing/compliance changes.

### What a customer sees (gated, per-account)
- **My fleet** — their `Aircraft` (tail, type/model, serial, in-service). Customer can add/edit.
- **My inventory** — their `CustomerInventory` (parts owned, condition, qty, which aircraft,
  traceability docs for each via `Order.trace_doc_ids`). Seeded from their `Order` history; customer
  may also self-declare holdings.
- **Order history** — past `Order`s (what was bought, when). *Shows history, **not** auto-current
  pricing.*
- **Reorder** — one click on an inventory line or aircraft → opens a reorder request.

### Reorder → inquiry → vendor (the flow)
1. Customer hits **Reorder** on a part (or "need this for tail X") → portal creates an `RFQ`
   (`channel = portal`, `customer_id`, line = the part + qty + condition), `status = new`.
2. That RFQ lands in **the same operator queue** as web/email/WhatsApp intake (one queue).
3. `rfq-triage` runs; `quote-builder` matches a `SupplierPath` and drafts a quote **within the
   margin floor** — labelled DRAFT.
4. **A human approves the price** (non-negotiable). The approved quote goes back to the customer in
   the portal.
5. On acceptance → an `Order` is created; Arrow **sources from vendors** and arranges delivery to the
   customer.

### Guardrails (how this respects the non-negotiables)
- **Reorder = inquiry, not auto-order.** No price is shown or committed on reorder; it generates an
  RFQ. Margin floor + human approval still gate every quote.
- **"Push to vendors"** = the platform routes/drafts the sourcing request to the operator (console);
  the **human dispatches via the existing authorized channels**. We do **not** wire the platform
  directly into OEM/Textron/David Clark authorized ordering channels (do-not-touch).
- **Real customer data, when live, is NOT synthetic** — keep it cleanly separated from
  `data/synthetic/`; same schema/IDs so it swaps in. Until then, portal runs on labelled synthetic
  customers/fleets/inventory.
- **Traceability surfaced, not invented** — the portal shows the `TraceDoc`s that exist for an
  order; it never fabricates 8130-3/EASA Form 1/CoC/ATA106.

### Phase mapping
Belongs to **Phase 3** (the gated portal) in the spec roadmap. The schema entities it needs
(`Customer`, `Aircraft`, `CustomerInventory`, `Order`) are added to the **Phase 0 data contract now**
so the shape is locked and the synthetic generator can populate them — the UI follows in Phase 3.
*(Open decision in §9: whether to pull a thin reorder MVP earlier.)*

---

## 7. Task breakdown (ordered, each a reviewable unit)

**Phase 0 — foundation**
1. ✅ `chore: scaffold pnpm + turborepo monorepo` (root `package.json`, `pnpm-workspace.yaml`,
   `turbo.json`, `tsconfig.base.json`); stub `apps/web|portal|console`, `packages/schema`.
2. ✅ `feat(schema): data contract` — zod + types for all ten entities (§3) + barrel + `assert*`
   helpers + `syntheticOf` marker + non-negotiables encoded in `rules.ts` (32 tests green).
3. ✅ `feat(data): synthetic generator` — `pnpm gen:synthetic`, deterministic (mulberry32, seed 42),
   distributions per §4, dataset v1 committed in `data/synthetic/` (1,429 records) + MANIFEST with
   provenance. All output validated against the schema before write; byte-identical on regen.
4. ✅ `test: validate generated data against schema` — `pnpm test` (47 tests) + `pnpm typecheck`
   green: schema validation, determinism, referential integrity, and non-negotiables-in-the-data.
5. ✅ `chore(claude): operator layer` — `rfq-triage` + `synthetic-data` subagents, `/new-rfq` +
   `/gen-synthetic` commands, PreToolUse/PostToolUse/Stop hooks (guard synthetic + secrets, audit
   log, verify before stop), `.mcp.json`. **Phase 0 complete.**

**Phase 1 — front door**
6. ✅ `feat(web): app shell + design system` — Next.js 15 App Router + Tailwind v4, institutional
   tokens, header/footer, UI primitives.
7. ✅ `feat(web): institutional pages` — authorization-led hero, Authorizations & Quality trust
   spine, capabilities, markets (defense-first), AOG desk (§6 IA); retail signals stripped.
8. ✅ `feat(web): demoted self-serve store` — David Clark/Bose catalogue, no cart/checkout/payment
   signals, "request pricing" routes into the RFQ queue.
9. ✅ `feat(web): RFQ + AOG intake → schema` — `buildIntakeRfq` + `/api/rfq` & `/api/aog` validate
   against `RfqSchema`, set urgency, apply the (fail-safe) export-control rule, write to
   `data/synthetic/intake/`, and never return a price. 12 unit tests + runtime-verified.
10. ✅ `chore(web): Vercel deploy config` — `vercel.json` + `outputFileTracingIncludes`; `next build`
    green (10 routes). **Phase 1 complete.**

**Phase 3 — gated portal + customer inventory/reorder** (§6.5)
11. `feat(portal): auth + gated shell` — per-customer accounts, gated routes.
12. `feat(portal): my-fleet + my-inventory` — `Aircraft` + `CustomerInventory` views, seeded from
    `Order` history; traceability docs per owned part.
13. `feat(portal): reorder → RFQ` — reorder action creates an `RFQ` (`channel = portal`) into the one
    queue; no pricing shown; human-approval path downstream.
14. `feat(console): vendor sourcing handoff` — approved reorder/RFQ surfaced to the operator to push
    to vendors via existing channels (drafts/assists; human dispatches).

Each unit: typecheck + tests green, non-negotiables upheld (encode as tests where possible),
conventional commit, session summary logged to Notion.

---

## 8. Non-negotiables → acceptance criteria

| Non-negotiable | How it shows up in code/tests |
|---|---|
| Margin floor on every quote; human approves price | `Quote.margin_floor_ok` computed; `approved_by_human` gates send; no UI path auto-sends pricing; test asserts a sub-floor quote can't be marked sendable |
| Traceability on every part | `TraceDoc` per shipped order; trace-pack assembly later; schema enforces doc types |
| Export control (US-origin → defense/govt) | `RFQ.export_control_review` set by rule; intake test covers it; human sign-off required downstream |
| Synthetic ≠ real | `_synthetic` marker + MANIFEST provenance; never rendered as a real quote; lint/test guards |
| Do-not-touch list | No code paths into OEM/Textron/David Clark ordering, Tally, workshop, WhatsApp/phone automation, or final pricing/compliance authority |
| Reorder = inquiry, not auto-order | Portal reorder creates an `RFQ` (`channel = portal`); no price shown/committed; margin floor + human approval still gate the quote; vendor dispatch stays human |
| Real customer data ≠ synthetic | Portal customer/fleet/inventory data kept separate from `data/synthetic/`; same schema/IDs for clean swap |

---

## 9. Open decisions (need the principal — do not guess)
- **Margin-floor values + bands by part class** (kept private). Placeholder until provided.
- **AS9120 / ASA listing status** — present as a held credential, or stage as a gap to close? Grounds
  the compliance module + trust-spine copy.
- **Store pricing model** — confirm "request pricing / enquire" (current default) vs. any future
  self-serve checkout for the GA tail. (Checkout currently out of scope; conflicts with stripping
  retail signals.)
- **Brand/domain + visual identity** for `apps/web` (logo, palette, type).
- **Reorder sequencing** — keep customer fleet/inventory + reorder in Phase 3 (default), or pull a
  thin reorder MVP earlier (right after intake) since it's a defining capability?
- **Inventory seeding** — seed `CustomerInventory` from Arrow's `Order` history only, allow customer
  self-declared holdings, or both (default: both)?
- **Vendor push** — how far should the platform go? Default: draft/route the sourcing request to the
  operator; human dispatches via existing channels (no direct platform→vendor ordering).

---

## 10. Promoting to a standalone repo
This is a self-contained subproject. To lift it into its own GitHub repo once repo-create rights
exist:
```bash
# from the arrow-space/ directory
git init && git add . && git commit -m "chore: import Arrow Space foundation"
# create empty repo on GitHub (UI or an integration with repo-create scope), then:
git remote add origin git@github.com:<owner>/arrow-space.git
git branch -M main && git push -u origin main
```
The directory layout, workspace config, and tooling are already root-relative, so nothing needs to
move. (As of this writing the session's GitHub integration is scoped to `2026BUILD` and cannot
create new repos — hence the subproject approach; this is durable because it commits to a repo the
session can push.)

---

*Log this plan and every working session back to the Notion AI Brain (Aviation Business page) to
keep memory current across agents.*
