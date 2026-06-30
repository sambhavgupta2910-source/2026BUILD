# Digital Dubai (data.dubai / DDADS) API — Integration Notes

Official **Digital Dubai Authority** data gateway. A single OAuth-secured endpoint
that serves datasets ingested from many Dubai government entities, queried by
`{entity}/{dataset}`. This is the path to graduate PRISM from CSV exports +
synthetic dev data to a **live, official** Dubai data feed.

## ⚠️ Two things decide whether this is useful for PRISM

1. **Which datasets are in your grant.** ✅ **CONFIRMED by DDA** — the DLD
   transactions dataset is accessible: `entity=dld`,
   `dataset=dld_transactions-open-api` (`open` classification) →
   `GET {base}/open/dld/dld_transactions-open-api`. Its real schema/coverage still
   need an empirical `probe` (below). Other datasets require the per-dataset
   "Request API Access Key" step on the portal.
2. **UAE geofence.** "Requests originating outside the UAE are restricted." The
   token + data calls only work from **inside the UAE** (a Dubai machine, or a
   UAE-hosted server / `me-central-1`). They will **not** work from this cloud
   sandbox or a non-UAE Vercel/Railway region. Architecture implication: the
   data-pulling job must run from the UAE, cache the result, and feed PRISM.

## Setup (run from inside the UAE)

1. Copy the DDA block from `.env.example` into a local `.env` (gitignored) and fill
   the values from the DDA onboarding email:
   ```
   DDA_BASE_URL=https://stg-apis.data.dubai
   DDA_SECURITY_APP_IDENTIFIER=...
   DDA_CLIENT_ID=...
   DDA_CLIENT_SECRET=...
   ```
2. Validate connectivity:
   ```
   node scripts/dda-client.js health      # expect: {"status":"success", ... "API is healthy"}
   ```
3. Verify the confirmed DLD dataset (status + schema + coverage + PRISM-fit):
   ```
   node scripts/dda-client.js probe dld dld_transactions-open-api
   node scripts/dda-client.js get  dld dld_transactions-open-api --pageSize 1000 --save dld-sample.json
   ```

`scripts/dda-client.js` is zero-dependency: it mints the 1-hour bearer token,
runs the health check, and queries datasets. Flags mirror the DDA spec
(`--page --pageSize --limit --filter --column --order_by --order_dir --offset`).

## Discovering datasets (the catalogue)

On <https://data.dubai>: **Data & Statistics → Entities → pick a dataset →
View details → Additional Information**. There:
- **Attribute Details** lists the columns (map these to PRISM's expected fields:
  area, building/project, rooms, size sqft, price, transaction date, off-plan flag).
- **Request API Access Key** grants the dataset to your profile (one-time).
- **Frequency of Update** tells you the refresh cadence.

Once you find a real-estate transactions dataset, note its exact `entity` and
`dataset` names and pull a sample — share the column names back and we wire it in.

## API quick reference

| | |
|---|---|
| Token | `POST {base}/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken` (client_credentials, header `x-DDA-SecurityApplicationIdentifier`) → 1h bearer |
| Health | `GET {base}/secure/ddads/healthcheck/1.0.0/health` (Bearer) |
| Data | `GET {base}/secure/ddads/openapi/1.0.0/{entity}/{dataset}` (Bearer), 1000 rows/page |
| Bases | STG `https://stg-apis.data.dubai` · PROD `https://apis.data.dubai` |
| Limits | 60 req/min · 30s timeout · UAE-only |

## Wiring into PRISM (next step, after a dataset is confirmed)

PRISM already supports pluggable data sources (`.env` Options A–C in `server.js`).
The DDA feed becomes **Option D**: a UAE-side job paginates the dataset via
`dda-client.js`, maps columns to PRISM's schema (sqm→sqft ×10.764, AED/sqft,
winsorize), writes a canonical CSV/cache, and triggers `POST /api/refresh`
— exactly the pattern `scripts/fetch-pulse.js` uses for Dubai Pulse.

## Security

- Credentials live only in `.env` (gitignored). **Never commit them.** If a secret
  is ever exposed, request a rotation via the portal "Contact Us" form.
- **Test ≠ production.** These are STG credentials. After validation, request
  production access via "Contact Us" with your Application ID (in the email).
