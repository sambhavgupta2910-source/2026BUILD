# Arrow Space

**Arrow Space — the institutional digital operations platform of Arrow Aviation Services Pvt. Ltd.**

Brand-forward, lineage as the moat. Not white-label. This is the private operator OS that sits *on
top of* Arrow's existing distribution workflow: an authorization-led institutional site, a gated
customer portal, an internal operator console, and a data + agent layer — built on **synthetic data
now** behind a schema that swaps to real data later.

> Arrow is an authorized **Hawker Beechcraft / Textron** parts distributor (since 2008), the **sole
> David Clark** aviation-headset distributor in India (since 2005), and runs a **DGCA-approved
> propeller overhaul workshop**. Serves Defense, Government, Airlines, Business & GA, Helicopter
> operators, and MROs. Kolkata HQ · Delhi · Mumbai · Sharjah FZE (UAE).

---

## Status: Phase 0 + Phase 1 complete → Phase 3 next

The monorepo is scaffolded (pnpm + Turborepo, TypeScript strict). Built and tested:

- **`packages/schema`** — the data contract: all ten entities as zod schemas + inferred types, the
  `syntheticOf` provenance marker, `assert*` helpers, and the non-negotiables encoded as functions
  (`exportControlRequired`, `marginFloorOk`, `canQuoteBeSent`).
- **`packages/data`** — a deterministic synthetic generator (`pnpm gen:synthetic`) and the committed
  `data/synthetic/` dataset v1 (1,429 records, seed 42, byte-identical on regen, every record
  validated against the schema and stamped synthetic).
- **`.claude/` operator layer** — `rfq-triage` + `synthetic-data` subagents, `/new-rfq` +
  `/gen-synthetic` commands, and guardrail hooks.
- **`apps/web`** — the institutional site (Next.js 15 App Router + Tailwind v4 → Vercel):
  authorization-led hero, Authorizations & Quality trust spine, capabilities, markets (defense-first),
  24/7 AOG desk, and a **demoted** headset store (no cart/checkout). Structured **RFQ + AOG intake**
  validates against the `RFQ` schema, applies the fail-safe export-control rule, writes to the intake
  queue, and **never returns a price**.

`pnpm typecheck` and `pnpm test` are green (59 tests); `next build` is green. Next: **Phase 3
(`apps/portal`)** — the gated customer fleet/inventory/reorder portal. See `docs/BUILD_PLAN.md` →
"Task breakdown".

- **`CLAUDE.md`** — always-loaded project memory + non-negotiables.
- **`AGENTS.md`** — handoff for Codex/Claude: how to pick up, working rules, build sequence.
- **`docs/BUILD_PLAN.md`** — the concrete, self-contained build plan (architecture, the data
  contract field-by-field, synthetic-data spec, Phase 1 site IA, intake→schema flow, task list).
- **`docs/arrow-space-build-spec.md`** — the source-of-truth strategy + implementation spec.

## Read these first
1. `CLAUDE.md` (the rules — non-negotiable).
2. `docs/BUILD_PLAN.md` (what to build, in what order).
3. `docs/arrow-space-build-spec.md` (the why and the full detail).

## Non-negotiables (the short version)
- **Margin floor on every quote. The human approves price — never auto-send pricing.**
- **Every part carries traceability** (8130-3 / EASA Form 1 / CoC / ATA106).
- **US-origin → defense/govt end-user = export-control flag + human sign-off.** Assist the
  paperwork; never bypass controls.
- **Synthetic data is clearly labelled and NEVER presented as real or used to quote a customer.**
- **Do not touch** (even conceptually): OEM/Textron/David Clark ordering channels, Tally, the
  propeller workshop, WhatsApp/phone as human channels, or the principal's final pricing +
  compliance authority.

## Intended home
This is currently developed as a self-contained subproject. It is structured to be lifted into its
own repository in one move — see **"Promoting to a standalone repo"** in `docs/BUILD_PLAN.md`.
