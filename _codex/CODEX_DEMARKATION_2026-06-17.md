# Codex Demarcation - Elevate Homes / PRISM

Date: 17 Jun 2026
Branch: `preview-better-ui`
Preview: `http://127.0.0.1:4173/`

## Why This Exists

Claude is also building in this project. This note marks the Codex-owned work so future AI sessions do not overwrite, duplicate, or confuse it with Claude's parallel design/build track.

## Codex-Owned Scope

Codex work is focused on the **resale mandate operating model** and the minimum prototype changes needed to express it:

1. Main revenue stream locked as resale brokerage GCI from PRISM-led seller mandates.
2. Ancillary streams documented but not made the first product focus.
3. Seller page added as the primary conversion path.
4. Broker/brokerage signup page added as a Phase 2 network path.
5. Generic lead capture endpoint added for seller and broker forms.
6. Existing PRISM hybrid valuation engine work preserved.
7. Full-DLD canonical cache builder preserved as the data upgrade path.

## Files Codex Touched Or Added

Strategy / handoff:

- `elevate-homes-resale-synergy-plan.md`
- `_codex/CODEX_DEMARKATION_2026-06-17.md`

Investor material:

- `outputs/elevate-homes-investor-pitch-deck.pptx`

Backend / data:

- `prism-valuation-web-mvp/server.js`
- `prism-valuation-web-mvp/scripts/build-canonical-cache.py`
- `prism-valuation-web-mvp/package.json`
- `prism-valuation-web-mvp/README.md`

Public app:

- `prism-valuation-web-mvp/public/index.html`
- `prism-valuation-web-mvp/public/site.css`
- `prism-valuation-web-mvp/public/site.js`
- `prism-valuation-web-mvp/public/app.js`
- `prism-valuation-web-mvp/public/sell.html`
- `prism-valuation-web-mvp/public/brokers.html`
- `prism-valuation-web-mvp/public/funnel.js`

## Product Boundaries

### Codex Track

Codex is owning the data-backed resale funnel:

- `/sell` - seller valuation and mandate acquisition page.
- `/brokers` - broker/brokerage registration page for later vetted network access.
- `/api/leads` - generic seller/broker lead capture to `funnel-leads.csv`.
- PRISM hybrid engine diagnostics, comparable output, and full-DLD cache tooling.
- Business model demarcation: resale GCI is core; reports/SaaS/network are ancillary.

### Claude Track

Claude should be allowed to continue its UI/design/product build without overwriting the above unless intentionally merging.

If Claude is building a different homepage, visual system, or richer multi-page app, merge intentionally:

1. Keep the Codex revenue architecture.
2. Keep or port `/sell` and `/brokers` funnels.
3. Keep `/api/leads` or map forms to an equivalent endpoint.
4. Keep comparable transactions visible in buyer/deal-check results.
5. Do not convert ancillary streams into the headline business before resale mandates are proven.

## Locked Revenue Decision

Main revenue stream:

- Closed resale brokerage GCI from seller mandates and buyer representation.

Ancillary streams:

- Buyer-side representation.
- Off-plan/developer referrals.
- Paid PRISM pricing-proof reports.
- Broker matching network.
- PRISM SaaS/dashboard.
- Website-as-a-service for brokerages.

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

## Verification Completed

- `node --check prism-valuation-web-mvp/server.js`
- `node --check prism-valuation-web-mvp/public/funnel.js`
- `GET /healthz` returns `66,413` clean rows on the current cached dataset.
- `GET /sell` returns the seller page.
- `GET /brokers` returns the broker page.
- `POST /api/leads` accepted a smoke-test lead; the generated test CSV was deleted afterward.

## Important API Notes

Current implemented endpoints:

- `POST /api/valuation`
- `POST /api/deal-check`
- `POST /api/inquiry`
- `POST /api/leads`
- `GET /api/engine`
- `GET /api/metadata`

Do not hand Claude an outdated `GET /api/deal-check` contract.

## Data Note

The current preview still uses the smaller cached dataset:

- `66,413` clean residential sales.

The full downloaded DLD file still needs to be converted with:

- `prism-valuation-web-mvp/scripts/build-canonical-cache.py`

That should be a separate data upgrade step, not mixed with visual UI work.
