# Digital Dubai (data.dubai / DDADS) API → live DLD data

PRISM's valuation engine now runs on **real Dubai Land Department transactions**
pulled from the official **Digital Dubai Authority** gateway, instead of CSV
exports / synthetic dev data.

Confirmed endpoint: `GET {base}/open/dld/dld_transactions-open-api` (`open` tier).

## How the data flows

```
DLD ──> DDA API (live source) ──[ scheduled pull, in-UAE ]──> transactions-dld.csv ──> PRISM engine (in-memory) ──> users
```

PRISM **syncs** from the live API into a local store, then serves valuations from
memory. It does **not** call the API per valuation — see "Why a synced file" below.

## Why a synced file, not a per-request API call

1. **The engine loads once, serves many.** `buildDataset()` parses the data once,
   builds in-memory indexes (`byArea`, `byProject`), winsorizes, and computes
   medians. A single valuation scans thousands of comparable rows — that has to be
   in-memory, not thousands of paginated HTTP calls.
2. **API limits forbid live passthrough.** 1,000 rows/page, **60 req/min**, 30s
   timeout. You can't assemble comparables per request under those limits.
3. **The geofence makes a local store mandatory for hosting.** The API only
   answers from inside the UAE. If PRISM is hosted outside the UAE (Vercel/Railway),
   it can't call DDA at all — so a UAE-side job must pull and persist the data, and
   PRISM serves from that. The file is the bridge across the geofence.
4. **Freshness doesn't need to be live.** DLD transactions settle over days; a
   daily/weekly pull is plenty. A sale registered an hour ago doesn't move a
   community median. "Live" here means *refreshed from the live source on a
   schedule*, not *queried per request*.

CSV specifically (vs JSON/DB) because it's the format PRISM's loader already reads
(`TRANSACTIONS_CSV`) — zero engine changes, same pattern as `fetch-pulse.js`.

## Setup (run from inside the UAE)

1. Put the DDA block from `.env.example` into a local `.env` (gitignored), filled
   from the DDA onboarding email:
   ```
   DATA_DUBAI_BASE_URL=https://stg-apis.data.dubai
   DATA_DUBAI_SECURITY_IDENTIFIER=...
   DATA_DUBAI_CLIENT_ID=...
   DATA_DUBAI_CLIENT_SECRET=...
   ```
2. Validate connectivity, then pull and serve:
   ```
   npm run ddads -- health          # expect: "API is healthy"
   npm run pull:dld                 # pages newest-first → transactions-dld.csv
   npm run start:dld                # boots PRISM on that real DLD data
   ```
   `npm run ddads -- sample --endpoint /open/dld/dld_transactions-open-api --pageSize 5`
   prints raw records if you want to eyeball the feed.

`pull` defaults to the 50 most-recent pages (~50k transactions, newest first) with
a throttle that stays under 60 req/min. Widen with `--pages N`. Re-run `pull` to
refresh; if the server is already running with `TRANSACTIONS_CSV` set, add
`--refresh` to hot-reload via `POST /api/refresh`.

## Schema mapping (DLD → PRISM canonical)

The loader transforms the API's lowercase fields into the UPPERCASE canonical
columns `buildDataset()` expects:

| DLD API field | PRISM column | Use |
|---|---|---|
| `trans_group_en` | `GROUP_EN` | kept `Sales` only |
| `property_usage_en` | `USAGE_EN` | kept `Residential` only |
| `procedure_name_en` | `PROCEDURE_EN` | |
| `instance_date` | `INSTANCE_DATE` | recency weighting |
| `property_type_en` / `property_sub_type_en` | `PROP_TYPE_EN` / `PROP_SB_TYPE_EN` | |
| `area_name_en` | `AREA_EN` | community |
| `project_name_en` / `master_project_en` | `PROJECT_EN` / `MASTER_PROJECT_EN` | same-project boost |
| `rooms_en` | `ROOMS_EN` | bedrooms |
| `reg_type_en` | `IS_OFFPLAN_EN` | `Off-Plan Properties` vs `Existing Properties` (resale) |
| `actual_worth` | `TRANS_VALUE` | price (AED) |
| `procedure_area` | `PROCEDURE_AREA` | size (sqm → ×10.764 = sqft) |

PRISM then filters Sales + Residential, derives AED/sqft, and winsorizes
50–20,000 AED/sqft — unchanged.

## API quick reference

| | |
|---|---|
| Token | `POST {base}/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken` (client_credentials, header `x-DDA-SecurityApplicationIdentifier`) → 1h bearer |
| Health | `GET {base}/secure/ddads/healthcheck/1.0.0/health` (Bearer) |
| Data | `GET {base}/open/{entity}/{dataset}` (Bearer), 1000 rows/page |
| Bases | STG `https://stg-apis.data.dubai` · PROD `https://apis.data.dubai` |
| Limits | 60 req/min · 30s timeout · UAE-only |

## Security & environments

- Credentials live only in `.env` (gitignored). **Never commit them.** The pulled
  `transactions-dld.csv` is also gitignored (`transactions-*.csv`). If a secret is
  exposed, request rotation via the portal "Contact Us" form.
- **Test ≠ production.** These are STG creds — keep `DATA_DUBAI_BASE_URL` on
  `stg-apis.data.dubai`. After validation, request production access via "Contact
  Us" with your Application ID (in the email).
