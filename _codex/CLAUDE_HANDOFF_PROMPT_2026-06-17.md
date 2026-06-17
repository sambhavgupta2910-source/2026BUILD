# Claude Handoff Prompt - Elevate Homes / PRISM

You are working in `sambhavgupta2910-source/2026BUILD`.

Important: do not overwrite your current `preview-better-ui` CRM/report work. Codex discovered that GitHub `preview-better-ui` already contains Claude work for `/crm`, `/report`, and related product pages. Codex therefore did **not** push over that branch.

## What Is Published

GitHub handoff branch:

- `codex/resale-funnel-handoff`
- Prompt: `_codex/CLAUDE_HANDOFF_PROMPT_2026-06-17.md`
- Demarcation: `_codex/CODEX_DEMARKATION_2026-06-17.md`

Full Codex patch is on Drive:

- https://drive.google.com/file/d/1hN9QeYobkhljvFH2l93dnd8SGq42TroE/view?usp=drivesdk

Investor deck artifact is on Drive:

- https://docs.google.com/presentation/d/17Vdh09vipQxesHbci4KxirBBH1eBfagU/edit?usp=drivesdk&ouid=106654177551330515915&rtpof=true&sd=true

Local Codex commits in the user's workspace:

- `7b7fe9a codex demarcate resale funnel work`
- `ccb9e11 codex add claude handoff patch`

## What Codex Built

Codex's work includes:

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
2. Do not overwrite `/crm`, `/report`, or your newer page structure.
3. Pull concepts/code from the Drive patch or local Codex commits only intentionally.
4. Preserve the revenue architecture:
   - Main revenue stream: resale brokerage GCI from PRISM-led seller mandates.
   - Ancillary streams: buyer representation, off-plan referrals, paid reports, broker network, SaaS, website-as-a-service.
5. Merge the concepts into your current `/crm` and `/report` work rather than replacing them.
6. If there are conflicts, prefer:
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

If running in the same local workspace:

```bash
git log --oneline --decorate -5
git show --stat 7b7fe9a
git show --stat ccb9e11
```

If using the Drive patch:

```bash
git fetch origin
git checkout preview-better-ui
git checkout -b claude-merge-codex-resale
# download codex-resale-funnel.patch from the Drive link into _codex/
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
