# PRISM Valuation Web MVP — Elevate Homes

The **Elevate Homes** public site plus its valuation API and agent CRM. Pure
Node.js (no dependencies) — reads a DLD transactions CSV on boot, runs the
v3.1 pipeline (Sales-only, Residential-only, sqm→sqft applied once, AED/sqft
derived), and serves the site + a comparable-median valuation API from
`public/`.

The site covers the full resale loop:

- **Sell** (`#sell`) — homeowner valuation: fair value, a recommended
  listing-price range (priced-to-sell / market / maximise), a liquidity read,
  and an optional check of a price they have in mind.
- **Deal Check** (`#deal-check`) — buyer pricing proof: Strong Buy / Fair
  Value / Overpriced verdict against DLD comparables.
- **Report** (`/report`) — a branded, printable ("Save as PDF") pricing
  report for either flow, with the comparable transactions behind it.
- **Agent CRM** (`/crm`) — captured leads with a pipeline (New → Mandate →
  Closed), call notes, status history, and each lead's pricing context.

## Run

```bash
npm start          # production: uses the data-source chain below
npm run demo       # local demo: generates synthetic dev data, then boots
```

`npm start` defaults to port `4173` and fetches the source CSV from Drive on
first boot, caching it under `.cache/transactions.csv` so later boots are
instant.

`npm run demo` is for UI work / offline demos when no real data source is
configured: it generates a **synthetic, clearly-labelled** dataset
(`transactions-dev.csv`, gitignored) and points the server at it. Synthetic
figures must never be presented as real market data.

### Data source resolution (in order)

1. `TRANSACTIONS_CSV` — absolute path to a local CSV (highest priority).
2. `TRANSACTIONS_URL` — HTTP(S) URL fetched once on boot, cached locally.
3. Built-in default: `https://drive.google.com/uc?export=download&id=1mo0YAYfbBMguqk1qQ4E2XT06rxuJWzCa`
   (the `transactions-2026-05-17.csv` in the PRISM 2.0 Drive folder).

The Drive file must be shared as **anyone with the link** for option 3 to
work. Files >25 MB hit Drive's virus-scan interstitial and need to be
downloaded locally instead; the current source is 21.9 MB so this works.

To force a refresh of the cache: `PRISM_REFRESH=1 npm start`.

## Pipeline

Mirrors the notebook's `v3.1` rules:

| Step | Rule |
| --- | --- |
| Filter | `GROUP_EN = Sales` |
| Filter | `USAGE_EN = Residential` |
| Area | `area_sqft = PROCEDURE_AREA × 10.764` (fall back to `ACTUAL_AREA` if missing) |
| Price | `aed_per_sqft = TRANS_VALUE / area_sqft` |
| Bounds | Drop rows outside `50 ≤ aed_per_sqft ≤ 20,000` (sanity bounds; needs business validation) |

Client-facing values stay in **AED/sqft** and **total AED** only.

## Valuation engine

Comparable-median with a documented fallback ladder:

1. Area + project + rooms + subtype
2. Area + project + rooms
3. Area + project (any rooms)
4. Area + rooms (any project)
5. Area + size band (±25%)
6. Area only

The first level with ≥5 matches is used. Base = median of comparable AED/sqft;
low/high = 25th/75th percentile (IQR). Total AED = AED/sqft × requested size
(converted to sqft once if input is sqm). The UI shows which level was used
and the comparable count, which drive the confidence label.

## API

- `GET /api/metadata` — row counts, median AED/sqft, datalist values for the
  form, and top areas/projects by Sales count.
- `POST /api/valuation` — body fields: `area`, `project`, `rooms`,
  `propertyType`, `propertySubtype`, `offplan`, `freehold`, `size`,
  `sizeUnit` (`sqft` or `sqm`). Returns base/low/high AED, AED/sqft,
  comparable count, confidence, and a comparables array.
- `POST /api/seller-valuation` — body: `area`, `project`, `rooms`, `size`,
  `sizeUnit`, optional `targetPrice`. Returns fair value, listing guidance
  (`quickSale`/`market`/`ambitious`), liquidity, recent-comp count,
  comparables, an optional AI seller note, and a `targetVerdict` if a target
  was supplied.
- `POST /api/deal-check` — buyer verdict (`Strong Buy`/`Fair Value`/
  `Overpriced`) with fair value, P25–P75 band, comparables, and optional AI
  analyst note + social post.
- `POST /api/leads` — capture a seller/buyer lead. Requires `name` + `phone`;
  also stores `intent`, `source`, property fields, and a `valuation`
  snapshot. Persists to `.data/leads.json` (gitignored).
- `GET /api/crm/leads` / `POST /api/crm/update` — list leads + pipeline
  stats, and advance a lead's `status` or append a `note`. Gated by
  `?token=` only if `CRM_TOKEN` is set (open on local/dev otherwise).

## Pages

- `/` — Elevate Homes public site (Sell, Deal Check, Market, Off-Plan, New
  Launches).
- `/report` — printable pricing report (reads the last result from the
  browser's `sessionStorage`; opened via the "Get my full pricing report"
  buttons).
- `/crm` — agent lead pipeline dashboard.
- `/advisor.html` — the internal advisor valuation workspace.

Leads (`/api/leads`, `/api/inquiry`) feed one shared store so everything
surfaces in `/crm`.

## What this is not

This is still a prototype. The comparable-median approach was chosen over
the notebook's hedonic regression for transparency and reproducibility, but
it does not adjust for property age, view, finish quality, or transaction
type beyond the filters above. Reconcile against the original notebook on
sample queries (Business Bay / Crestmark; JVC) before relying on outputs.
