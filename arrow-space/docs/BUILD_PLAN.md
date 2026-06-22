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

- **Nothing is implemented yet.** Phase 0 was never built or merged in any repo. This subproject is
  a clean slate that begins the foundation.
- This directory currently contains **plan + handoff docs only** (`CLAUDE.md`, `AGENTS.md`,
  `README.md`, `docs/`).
- The next builder starts at **§7 Task breakdown**, top to bottom.

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
| `channel` | enum | `email \| whatsapp \| form \| phone` |
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

**Schema acceptance:** all six exported as zod schemas + inferred types; an `index.ts` barrel;
helper `assertRfq`, `assertQuote`, etc.; a `SYNTHETIC` provenance marker on generated records so
synthetic data can never be mistaken for real (see §4).

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

## 7. Task breakdown (ordered, each a reviewable unit)

**Phase 0 — foundation**
1. `chore: scaffold pnpm + turborepo monorepo` (root `package.json`, `pnpm-workspace.yaml`,
   `turbo.json`, `tsconfig.base.json`); stub `apps/web|portal|console`, `packages/*`.
2. `feat(schema): data contract` — zod + types for all six entities (§3) + barrel + asserts.
3. `feat(data): synthetic generator` — `pnpm gen:synthetic`, deterministic, distributions (§4),
   dataset v1 in `data/synthetic/` + MANIFEST.
4. `test: validate generated data against schema` — wire `pnpm test` + `pnpm typecheck`.
5. `chore(claude): operator layer` — agents, commands, hooks, `.mcp.json` (§5).

**Phase 1 — front door**
6. `feat(web): app shell + design system` — Next.js App Router + Tailwind, brand-forward base.
7. `feat(web): institutional pages` — hero, trust spine, capabilities, markets (defense-first),
   AOG desk (§6 IA); strip retail signals.
8. `feat(web): demoted self-serve store` — catalog section, no checkout, "request pricing" CTA.
9. `feat(web): RFQ + AOG intake → schema` — forms + Route Handler validating against `RFQ`, writing
   to `data/synthetic/intake/` (§6).
10. `chore(web): Vercel deploy config` — deploy; confirm exit criteria.

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

---

## 9. Open decisions (need the principal — do not guess)
- **Margin-floor values + bands by part class** (kept private). Placeholder until provided.
- **AS9120 / ASA listing status** — present as a held credential, or stage as a gap to close? Grounds
  the compliance module + trust-spine copy.
- **Store pricing model** — confirm "request pricing / enquire" (current default) vs. any future
  self-serve checkout for the GA tail. (Checkout currently out of scope; conflicts with stripping
  retail signals.)
- **Brand/domain + visual identity** for `apps/web` (logo, palette, type).

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
