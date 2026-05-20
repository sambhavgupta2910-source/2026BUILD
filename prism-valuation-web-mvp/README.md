# PRISM Valuation Web MVP

Advisor-facing web tool for Dubai property valuation. Pure Node.js (no
dependencies) — reads a DLD transactions CSV on boot, runs the v3.1 pipeline
(Sales-only, Residential-only, sqm→sqft applied once, AED/sqft derived),
and serves a comparable-median valuation API to the UI in `public/`.

## Run

```bash
npm start
```

Defaults: port `4173`, fetches the PRISM 2.0 source CSV from Drive on first
boot and caches it under `.cache/transactions.csv` so subsequent boots are
instant.

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

## What this is not

This is still a prototype. The comparable-median approach was chosen over
the notebook's hedonic regression for transparency and reproducibility, but
it does not adjust for property age, view, finish quality, or transaction
type beyond the filters above. Reconcile against the original notebook on
sample queries (Business Bay / Crestmark; JVC) before relying on outputs.
