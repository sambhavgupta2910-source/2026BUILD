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
- **Phase 0 (foundation) is COMPLETE** on branch `claude/nice-darwin-9q52dd`: monorepo scaffold,
  `packages/schema` (data contract), `packages/data` (deterministic synthetic generator + committed
  `data/synthetic/` dataset v1), the test suite, and the `.claude/` operator layer.
  `pnpm typecheck` + `pnpm test` green (47 tests).
- **Next: Phase 1 (`apps/web`)** — start at `docs/BUILD_PLAN.md` → "Task breakdown," **Task 6**.

## Working in this repo
- Install: `pnpm install`. Verify: `pnpm typecheck` + `pnpm test`. Regenerate data: `pnpm gen:synthetic`.
- The schema (`packages/schema`) is the contract — extend it first, then everything else.
- Don't hand-edit `data/synthetic/` — regenerate. The operator-layer hook blocks it anyway.

## Phase 1 first moves (apps/web)
1. App shell + design system (Next.js App Router + Tailwind, brand-forward, deploy to Vercel).
2. Institutional pages: authorization-led hero, Authorizations & Quality trust spine, capabilities,
   markets (defense-first), AOG desk. Strip retail signals. (`docs/BUILD_PLAN.md §6`.)
3. Demoted self-serve store (no checkout / payment-card signals).
4. RFQ + AOG intake forms that validate against the `RFQ` schema and write to the intake queue.

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
