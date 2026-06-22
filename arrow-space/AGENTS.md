# AGENTS.md — Handoff for Codex / Claude

You are continuing the build of **Arrow Space**, the institutional operations platform for Arrow
Aviation Services. This file tells you how to pick up the work. **Read `CLAUDE.md` and
`docs/BUILD_PLAN.md` before writing any code.**

## Ground rules (do not drift)
1. **Plan first on anything non-trivial; wait for the principal's go.** When a decision needs human
   judgment — pricing logic, margin-floor values, anything ambiguous or compliance-related — **ask;
   do not guess.**
2. **Keep every diff reviewable.** Small, focused, conventional commits (`feat:`, `fix:`, `chore:`,
   `docs:`, `test:`).
3. **TypeScript everywhere.** Run typecheck and tests before calling anything "done."
4. **`packages/schema` is the data contract.** It is load-bearing — it's the shape real data will
   later occupy. Don't fork or shortcut it; everything else depends on it.
5. **Honor the non-negotiables** (see `CLAUDE.md`). Encode them as code + tests, not just prose:
   - Margin floor enforced on every quote; never auto-send pricing — the human approves.
   - Every part carries traceability (8130-3 / EASA Form 1 / CoC / ATA106).
   - US-origin + defense/govt end-user ⇒ `export_control_review = true` + human sign-off.
   - Synthetic data clearly labelled; never presented as real; never used to quote a customer.
6. **Do not touch** OEM/Textron/David Clark ordering channels, Tally, the propeller workshop,
   WhatsApp/phone as human channels, or the principal's final pricing + compliance authority.

## Where things stand
- **Phase 0 (foundation) is NOT built yet.** This subproject holds the plan only.
- Build order is in `docs/BUILD_PLAN.md` → **"Task breakdown."** Start at the top.

## Suggested first moves (Phase 0)
1. Scaffold the pnpm + Turborepo monorepo per `docs/BUILD_PLAN.md` → "Repo structure."
2. Implement `packages/schema` (zod + TS types) for Part, SupplierPath, RFQ, Quote, TraceDoc,
   AogEvent, Customer, Aircraft, CustomerInventory, Order — exactly the fields in the data-contract
   tables (`docs/BUILD_PLAN.md §3`). RFQ.channel now includes `portal` (customer reorder).
3. Implement `packages/data` synthetic generator → `pnpm gen:synthetic` writing `data/synthetic/`
   (deterministic by seed, realistic distributions).
4. Add the `.claude/` operator layer (agents, commands, hooks) per spec Sections 5.3–5.5.
5. Add a test that validates generated data against the schema; wire `pnpm test` + `pnpm typecheck`.

## Then Phase 1 (apps/web)
Institutional site (Next.js → Vercel): authorization-led hero, Authorizations & Quality trust
spine, capabilities, markets (defense-first), AOG desk page. Strip retail signals. Structured RFQ +
AOG intake forms that validate against the `RFQ` schema and write objects to the intake queue.
Demote the David Clark / Bose store to a self-serve section (no checkout / payment-card signals).

## Phase 3 (apps/portal) — customer fleet, inventory & reorder
Gated per-customer portal: customers list their **aircraft** and see **inventory bought from Arrow**,
then **reorder** in one click. A reorder is just an `RFQ` with `channel = portal` into the same
queue — **inquiry, not auto-order**: no price shown, margin floor + human approval still gate it, and
vendor dispatch stays human via existing channels. See `docs/BUILD_PLAN.md §6.5`. Entities are in the
Phase 0 contract now; UI lands in Phase 3.

## Definition of done (every unit)
- Types + zod validate; `pnpm typecheck` clean; `pnpm test` green.
- Non-negotiables upheld (with a test where it's encodable).
- Conventional commit; diff is reviewable; session summary logged to the Notion AI Brain
  (Aviation Business page).
