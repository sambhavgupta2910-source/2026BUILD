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
- **All 14 planned tasks are COMPLETE** (Phases 0/1/3) on branch `claude/nice-darwin-9q52dd`.
  `packages/engine` (quote-builder) + `apps/console` (operator queue, draft quote, human approval,
  vendor handoff) close the loop. `pnpm typecheck` + `pnpm test` green (75 tests); all three apps
  `next build` green. Remaining work is operational (real margin bands, AS9120/ASA wording, deploy,
  real-data swap) — not on the task list.
- Historical detail below:
  - Phase 0 — monorepo scaffold, `packages/schema` (data contract), `packages/data` (deterministic
    synthetic generator + committed `data/synthetic/` dataset v1), the test suite, `.claude/`
    operator layer.
  - Phase 1 — `apps/web` institutional site (Next.js 15 + Tailwind v4): hero, trust spine,
    capabilities, markets (defense-first), AOG desk, demoted store, and structured RFQ/AOG intake →
    schema (`/api/rfq`, `/api/aog`) that never returns a price.
  - Phase 3 — `apps/portal` gated customer portal: demo session, My fleet, My inventory (with
    traceability), orders + trace pack, and reorder → `RFQ` (`channel = portal`) into the SAME intake
    queue (`/api/reorder`), inquiry-only, no price.
  - `pnpm typecheck` + `pnpm test` green (66 tests); both apps `next build` green.
- **Next: Task 14 (`apps/console`)** — operator vendor-sourcing handoff. Start at
  `docs/BUILD_PLAN.md` → "Task breakdown."

## Working in this repo
- Install: `pnpm install`. Verify: `pnpm typecheck` + `pnpm test`. Regenerate data: `pnpm gen:synthetic`.
- Run the site: `pnpm --filter @arrow-space/web dev`.
- The schema (`packages/schema`) is the contract — extend it first, then everything else.
- Don't hand-edit `data/synthetic/` — regenerate. The operator-layer hook blocks it anyway.
- Intake → schema lives in `apps/web/src/lib/intake.ts` (pure, tested). Reuse it for portal reorders.

## Next: operator console (apps/console, Task 14)
1. Read the shared intake queue (`data/synthetic/intake/` + the synthetic RFQs) into one operator
   view across all channels (email/whatsapp/form/phone/portal).
2. Per RFQ: run `rfq-triage`, draft a quote within the margin floor (DRAFT, never auto-sent),
   surface the export-control flag, and require **human price approval** (`canQuoteBeSent`).
3. Vendor-sourcing handoff: draft/route the sourcing request to the operator — the **human
   dispatches** via existing authorized channels. Do NOT wire into OEM/Textron/David Clark ordering.
4. Consider extracting a shared `packages/intake` to consolidate the web + portal RFQ builders.

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
