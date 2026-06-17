# PRISM / Elevate Homes — Agent Handoff

This file orients any coding agent (Codex, Claude, etc.) picking up this
repo. Read this before making changes — several pieces of prior work
encode decisions that aren't obvious from the code alone.

## What this is

PRISM is a Dubai real-estate pricing-intelligence tool, marketed under the
"Elevate Homes" brand. It grew out of Sambhav Gupta's university
dissertation (a hedonic pricing model on DLD transaction data analyzing
branded-residence price premiums). The live app is explicitly positioned
as the tool that keeps re-testing the dissertation's preliminary findings
against fresh data — not a wrapper around the dissertation's fixed numbers.

**Business goal in flight:** package this as a pitch to small/mid Dubai
brokerages (5–50 agents) — either a white-label SaaS license, outright IP
purchase, or revenue share. See `business/brokerage-pitch.md` and
`business/linkedin-content-plan.md`.

## Repo map

| Path | What it is |
|---|---|
| `prism-valuation-web-mvp/` | **The active, maintained app.** Pure Node.js (zero npm deps), serves a public marketing site + live valuation API. This is what gets worked on. |
| `prism-original-colab-analysis/` | Docs only — describes the original Colab notebook (dissertation-era analysis), preserved as the historical analytical baseline. The notebook itself isn't in this repo. |
| `artifacts/prism-valuation-web-mvp.zip` | Stale snapshot from an early handoff. Ignore — work from `prism-valuation-web-mvp/` directly. |
| `PRISM_BUILD_REPORT_FOR_NOTION.md` | Stale handoff report from 2026-05-17, predates the rebrand to Elevate Homes and the Grok AI integration. Kept for history; don't treat its "Known Issues" list as current (most have since been addressed — see below). |
| `business/` | Marketing/pitch content. **Read the framing constraint below before touching this.** |
| `Coding_Enviroment.ipynb` | Legacy notebook artifact, not part of the running app. |

## The app: `prism-valuation-web-mvp/`

- **Stack:** Node.js ES modules, zero dependencies, native `http`/`https`.
  `npm start` runs `server.js` directly — no build step.
- **Default port:** 4173. `PORT` env var overrides.
- **Data source priority** (see `loadCsvText()` in `server.js`):
  1. `TRANSACTIONS_CSV` — local file path (use this for dev/testing)
  2. `DUBAI_PULSE_API_URL` + `DUBAI_PULSE_API_KEY` — live CKAN API (not yet
     available; API access pending approval as of this writing)
  3. `TRANSACTIONS_URL` or the built-in Google Drive default — fetched
     once on boot, cached to `.cache/transactions.csv`
- **Pipeline:** Sales-only + Residential-only filter → sqm→sqft once
  (`× 10.764`) → AED/sqft derived → winsorized to a fixed 50–20,000
  AED/sqft band (flagged in code as "needs business validation" — it's a
  conservative guess, not a data-driven threshold; revisit if real DLD
  volume data becomes available).
- **Valuation engine** (`valuation()` / `pickComparables()`): comparable-
  median with a 6-step fallback ladder (area+project+rooms+subtype down to
  area-only), `MIN_COMPS = 5`, confidence labeled `High`/`Medium`/`Low`/
  `Insufficient` based on which fallback step matched. **Unrecognized area
  names now correctly return an error** rather than silently falling back
  to the entire national dataset — this was a real bug, fixed 2026-06-17
  (see git log on `pickComparables`). If you touch this function again,
  preserve that behavior: never let `candidates` default to all rows.
- **AI features** (Grok via `XAI_API_KEY`, model `grok-3-mini`):
  `/api/analysis` (area market commentary), `/api/deal-check` (analyst
  note + social post), `/api/content-draft` (multi-platform content +
  Higgsfield video prompt). All three degrade gracefully to `null`/error
  objects if `XAI_API_KEY` is unset — never make these hard-fail.
  **Important:** the system prompts are deliberately written to calibrate
  hedging language to the actual `confidence`/`fallback` fields computed
  by the valuation engine, not to suppress caveats outright. Don't revert
  to "no disclaimers" instructions — see the framing constraint below.
- **Deploy config already in place:** `Procfile`, `railway.toml`,
  `/healthz` route. Not yet actually deployed anywhere — still running
  locally only as of this writing.

### Resale loop: seller valuation, leads, reports, CRM

The public site now covers the full resale loop, not just buyer deal-checks:

- **Seller valuation** (`POST /api/seller-valuation`, `#sell` on the home
  page) reuses `valuation()` and adds listing-price guidance (the P25/median/
  P75 of the comparable band — *not* invented multipliers), a liquidity read
  from recent area activity, and an optional `targetVerdict`. Keep the
  guidance grounded in the band; don't fabricate "recommended" multipliers.
- **Lead capture** (`POST /api/leads`, plus the existing `/api/inquiry`)
  writes to one shared store, `.data/leads.json` (**gitignored** — it holds
  PII / client details, never commit it; same for `leads.csv`). Helpers:
  `recordLead()`, `readLeads()`, `writeLeads()`.
- **Report** (`/report`, `report.html/.css/.js`) is a branded, print-to-PDF
  pricing report. It reads the last result from the browser's
  `sessionStorage` (key `prismReport`) — there is no server-side PDF step
  (keeps the zero-dep rule).
- **Agent CRM** (`/crm`, `GET /api/crm/leads` + `POST /api/crm/update`)
  advances leads through `LEAD_STAGES` and logs notes/history. Gated by
  `CRM_TOKEN` (`?token=`) only when that env var is set; open on local/dev.
- **Local demo data:** `npm run demo` (→ `scripts/start-demo.js` →
  `scripts/generate-sample.js`) writes a synthetic, clearly-labelled
  `transactions-dev.csv` (gitignored) so the app boots with zero setup when
  no real source is configured. Production (`npm start`) is unchanged.
  **Never present synthetic figures as real market data** (see framing
  constraint below).

### Codex resale-funnel merge (17 Jun 2026)

Merged from `codex/resale-funnel-handoff` (see `_codex/` docs). Codex deliberately
did **not** push over `preview-better-ui`; its actual code shipped as a Drive
patch, so this was an intentional port — keeping the `/crm` + `/report` + unified
lead store and adding Codex's resale-funnel concepts on top:

- **PRISM hybrid engine (`prism-hybrid-v1`)** — `hybridValuation()` adds a log-size
  adjustment (elasticity `0.2733`), recency + size-proximity weighting, a
  same-project boost, and `effective_comps` / `dispersion_pct` / `size_adjustment`
  diagnostics. Powers `/api/deal-check` and `/api/seller-valuation`; `GET /api/engine`
  reports it. The legacy `POST /api/valuation` still uses plain comparable-median.
- **`/sell`** (`sell.html` + `funnel.js`) — dedicated seller mandate funnel.
- **`/brokers`** (`brokers.html` + `funnel.js`) — broker early-access signup; posts
  to the unified `POST /api/leads` with `intent: 'broker'` (+ agency/BRN), surfaced
  in `/crm`.
- **`scripts/build-canonical-cache.py`** — full-DLD → canonical cache (data upgrade).
- **Revenue architecture** — `elevate-homes-resale-synergy-plan.md`: resale GCI is
  core; buyer rep / off-plan / paid reports / broker network / SaaS / WaaS are ancillary.

API contract to preserve: `POST /api/deal-check` (**never** `GET`), `POST /api/leads`,
`GET /api/engine`, `POST /api/valuation`, `POST /api/inquiry`, `GET /api/metadata`.

### Known gaps / honest limitations

- Real live DLD data access is blocked on Dubai Pulse API approval. Until
  then, dev/testing uses either a small hand-built fixture
  (`/tmp/prism-test.csv`-style, 17 rows) or a larger synthetic 18k-row
  CSV generated for stress-testing — neither is real transaction data.
  Don't present numbers derived from synthetic data as real market figures
  in anything user-facing.
- The 50–20,000 AED/sqft winsorization band is a guess, not validated
  against the real distribution.
- No automated test suite exists. Verification has been manual: curl the
  API across confidence tiers, and a Playwright screenshot pass for UI
  changes. If you add tests, that's a net improvement — there's nothing to
  preserve by keeping it manual.

## Critical framing constraint (business content AND product copy)

The dissertation's specific numbers (547,545 transactions, AED/sqft
premiums by brand tier, p-values, R² values, etc.) **must never be
presented as verified, settled facts** — not in `business/*.md`, not in
LinkedIn content, not in AI-generated `analystNote`/`socialPost`/market
commentary. The user (Sambhav) was explicit about this: "the data maybe
wrong, we are perfecting it with our valuation tool that we are building."

The correct framing, consistently: the dissertation was one regression on
one fixed historical extract, defended once — a hypothesis-generator, not
a final answer. PRISM is the live instrument built to keep re-testing that
hypothesis against current DLD data. Any new content (pitch decks, posts,
AI prompts) should preserve this distinction. If you're asked to add new
dissertation-derived stats anywhere user-facing, hedge them the same way
`business/brokerage-pitch.md` and `business/linkedin-content-plan.md`
already do — read those two files for the exact tone before writing more.

## Secrets / things never to commit

- `.env`, `.cache/`, any `transactions-*.csv` — all gitignored, keep it
  that way.
- No client names, commission structures, or equity/compensation details
  in any committed file (business docs or code comments).

## Current branch

Active work is on `claude/build-prism-app-7DlxH`. Recent commits, in
order: Elevate Homes rebrand → Grok AI integration → public marketing
site rebuild → interaction polish → business pitch docs (dissertation
framing) → AI-copy confidence calibration + area-fallback bug fix (latest).

## Suggested next steps

1. Get Dubai Pulse API access (or another reliable live-data path) to
   replace the Drive-CSV / synthetic-data workaround.
2. Validate the winsorization band against real data once available.
3. Actually deploy (Railway config is ready) so the brokerage pitch has a
   live URL to point at, not just localhost screenshots.
4. Add automated tests around `valuation()` / `pickComparables()` given
   how easy it was for the area-fallback bug to hide there silently.
