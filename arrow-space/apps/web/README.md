# @arrow-space/web — institutional site (Phase 1)

Next.js (App Router) + Tailwind v4. Authorization-led, defense-first, retail signals stripped.
Deploy target: **Vercel**.

## Run

```bash
pnpm --filter @arrow-space/web dev      # http://localhost:3000
pnpm --filter @arrow-space/web build    # production build
pnpm typecheck && pnpm test             # from the repo root
```

## Information architecture
- `/` — authorization-led hero, **Authorizations & Quality** trust spine, capabilities, markets
  (defense-first), closing CTA.
- `/capabilities`, `/markets`, `/authorizations` — detail pages.
- `/aog` — the 24/7 AOG desk: response-time targets + fast-path intake.
- `/store` — **demoted** self-serve headset catalogue (David Clark / Bose). No cart, no checkout,
  no payment-card signals; "request pricing" routes into the RFQ queue.
- `/rfq` — structured RFQ intake form.

## Intake → schema (the load-bearing bit)
- `src/lib/intake.ts` — pure `buildIntakeRfq()` that turns a form submission into a **schema-valid
  `RFQ`** (and an `AogEvent` for AOG), applying the export-control rule. Fully unit-tested.
- `POST /api/rfq` and `POST /api/aog` validate against the `RFQ` zod schema, persist to the
  synthetic intake queue at `data/synthetic/intake/<id>.json`, and return a structured
  acknowledgement. They **never return a price, never auto-quote, never email the customer.**
- Export control is **fail-safe**: US-origin → defense/govt is flagged; unknown origin for those
  end-users is also flagged (with a clarification). Origin comes from the committed synthetic parts
  dataset (`src/lib/server/parts-origin.ts`).

## Notes
- The intake queue writes to the repo's `data/synthetic/intake/` for now (synthetic-first). On a
  read-only deploy the write is skipped and the submission still succeeds; a real datastore replaces
  this in a later phase, on the same schema.
- Brand tokens live in `src/app/globals.css` (`@theme`). Copy lives in `src/lib/content.ts`.

## Deploy to Vercel
This app is a package in a pnpm + Turborepo workspace. In the Vercel project:
- **Root Directory:** `arrow-space/apps/web` (or `apps/web` once the subproject is promoted to its
  own repo). Vercel detects the pnpm workspace and installs from the workspace root.
- **Framework:** Next.js (auto-detected; also pinned in `vercel.json`).
- `next.config.ts` uses `outputFileTracingIncludes` to ship `data/synthetic/parts.json` with the
  intake functions so the export-control origin lookup works in production.
- No environment variables are required for Phase 1. (Notion/GitHub/Vercel MCP and a real intake
  datastore arrive in later phases.)

