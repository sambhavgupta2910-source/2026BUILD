# Arrow Space

Institutional aviation parts portal — public marketing site, gated client portal
(Build 1 visual prototype, preserved), and a production lead-capture backend with an
operator console (Build 2).

## What it is

- **Public site** — landing page for Arrow Aviation Services: live inventory search,
  capabilities, AOG support, quality/traceability, markets, and RFQ/RFP intake.
- **Client portal** — synthetic-data demo of operations, RFQ queue, hybrid catalog,
  trace packs, AOG desk, and account (Build 1, unchanged).
- **Operator console** — passcode-gated lead desk at `/operator` to triage captured
  RFQ / AOG / RFP / inventory inquiries, draft quotes, and approve them.
- **Discipline preserved** — no price is returned to public endpoints, and no quote is
  auto-sent. A human must approve every quote, and only if it clears the margin floor.
  US-origin parts for defense/government end users are flagged for export-control review.

## Architecture

Dependency-light by design: the frontend is the original Build 1 HTML/CSS/vanilla JS,
served verbatim. The backend (`server/`) is **Node built-ins only** — no npm install.

- `index.html`, `styles.css`, `app.js` — public site + client portal (Build 1, preserved;
  `app.js` wires the intake forms to the real API).
- `src/portal-data.js` — shared metrics / filtering / ranking utilities.
- `src/catalog.js` — synthetic parts catalog used for inventory search and quoting.
- `server/` — HTTP server (`index.js`), file-based store (`store.js`), validation and
  business rules (`schema.js`).
- `operator/` — operator console (reuses the same design system).
- `data/` — runtime lead store and uploads (git-ignored; set `DATA_DIR` in production).

## Run

```bash
npm start          # node server/index.js  → http://127.0.0.1:4317
npm run dev        # same, with --watch
npm test           # node --test
```

- Public site: `http://127.0.0.1:4317/`
- Operator console: `http://127.0.0.1:4317/operator` (passcode below)

### Environment

| Variable            | Default          | Purpose                                        |
| ------------------- | ---------------- | ---------------------------------------------- |
| `PORT`              | `4317`           | HTTP port                                      |
| `OPERATOR_PASSCODE` | `arrowspace-ops` | Passcode for the operator console              |
| `DATA_DIR`          | `./data`         | Where leads + uploads persist (mount a volume) |

## API

Public (no price ever returned, no auto-quote):

- `POST /api/rfq` — capture an RFQ lead
- `POST /api/aog` — capture an AOG request (requires aircraft, part, location)
- `POST /api/rfp` — capture an RFP with an optional file (`{ file: { name, contentBase64 } }`)
- `POST /api/inventory-search` — availability / condition / docs only

Operator (passcode via `x-operator-passcode` header or `/api/operator/login` cookie):

- `GET  /api/operator/leads` — ranked queue + KPIs
- `POST /api/operator/leads/:id/status` — update status (audited)
- `POST /api/operator/leads/:id/quote` — draft a quote (evaluated against the margin floor)
- `POST /api/operator/leads/:id/quotes/:quoteId/approve` — human approval (refused below floor)

## Deploy

Node host with a persistent disk (e.g. Railway/Render). No build step. Mount a volume,
set `DATA_DIR` to it, set `OPERATOR_PASSCODE`, and run `node server/index.js` (see
`Procfile` / `railway.toml`).

## Scope guardrails

Synthetic data only — seeded demo records are never presented as live customer data.
Out of scope: integration with OEM/Textron/David Clark ordering systems, Tally, the
propeller workshop, or WhatsApp/phone automation. AOG handling stays phone-backed and
operator-owned; this captures and routes the request.
