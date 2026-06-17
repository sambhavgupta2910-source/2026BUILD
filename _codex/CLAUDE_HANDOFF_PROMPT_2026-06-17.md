# Claude Handoff Prompt - Elevate Homes / PRISM

You are working in `sambhavgupta2910-source/2026BUILD`.

Important: do not overwrite your current `preview-better-ui` CRM/report work. Codex discovered that GitHub `preview-better-ui` already contains Claude work for `/crm`, `/report`, and related product pages. Codex therefore published its work as a separate handoff patch instead of pushing over that branch.

## Read First

Read:

- `_codex/CODEX_DEMARKATION_2026-06-17.md`
- `_codex/codex-resale-funnel.patch`

## What Codex Built

Codex made a local commit:

`7b7fe9a codex demarcate resale funnel work`

That work includes:

- PRISM hybrid valuation engine improvements.
- Comparable transaction output for deal checks.
- Full-DLD canonical cache builder.
- Seller page: `/sell`.
- Broker/brokerage signup page: `/brokers`.
- Generic lead endpoint: `POST /api/leads`.
- Resale-first strategy doc.
- Investor pitch deck artifact.
- Demarcation doc explaining what Codex owns.

## What To Do

1. Keep your current `preview-better-ui` work as the main UI/product track.
2. Apply or cherry-pick Codex work only intentionally from `_codex/codex-resale-funnel.patch`.
3. Preserve the revenue architecture:
   - Main revenue stream: resale brokerage GCI from PRISM-led seller mandates.
   - Ancillary streams: buyer representation, off-plan referrals, paid reports, broker network, SaaS, website-as-a-service.
4. Merge the concepts into your current `/crm` and `/report` work rather than replacing them.
5. If there are conflicts, prefer:
   - Your newer CRM/report UI structure.
   - Codex's PRISM engine improvements, comparable output, seller/broker funnel logic, and revenue demarcation.

## API Contract To Preserve

Current endpoints from Codex work:

- `POST /api/valuation`
- `POST /api/deal-check`
- `POST /api/inquiry`
- `POST /api/leads`
- `GET /api/engine`
- `GET /api/metadata`

Do not use an outdated `GET /api/deal-check` contract.

## Product Direction

The app should become multi-page:

- `/` - public trust and routing page.
- `/sell` - seller valuation and mandate acquisition.
- `/check` - buyer deal-check path. Can be separate or carved out from current homepage.
- `/brokers` - broker/brokerage signup for Phase 2.
- `/crm` - internal pipeline and lead operations.
- `/report/:id` or `/report` - shareable valuation/deal-check proof.

Natural progression:

1. Full DLD engine.
2. Seller valuation funnel.
3. Buyer deal-check funnel.
4. CRM-ready lead tracking.
5. Manual mandate conversion.
6. Repeatable mandates in 3-5 areas.
7. Vetted broker signup.
8. Manual matching.
9. Paid reports.
10. SaaS/dashboard only after internal proof.

## Suggested Merge Strategy

From your current branch:

```bash
git fetch origin
git checkout preview-better-ui
git checkout -b claude-merge-codex-resale
cat _codex/codex-resale-funnel.patch.part-* > _codex/codex-resale-funnel.patch
git apply --3way _codex/codex-resale-funnel.patch
```

If `git apply --3way` conflicts, resolve manually. Keep your `/crm` and `/report` files, but port in:

- `POST /api/leads`
- `/api/engine`
- hybrid valuation diagnostics
- comparable transaction output
- `/sell` and `/brokers` page concepts
- strategy docs under `_codex` and `elevate-homes-resale-synergy-plan.md`

After merge:

```bash
node --check prism-valuation-web-mvp/server.js
node --check prism-valuation-web-mvp/public/site.js
node --check prism-valuation-web-mvp/public/funnel.js
npm start
```

Then verify:

- `/`
- `/sell`
- `/brokers`
- `/crm`
- `/report`
- `POST /api/deal-check`
- `POST /api/leads`
