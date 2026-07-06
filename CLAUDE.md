# CLAUDE.md — 2026BUILD operating directives

Directives for any Claude model working in this repo. Follow them exactly; they encode the
owner's established standard of work. Optimize for correct output at minimum token spend.

## Token economy (hard rules)

- **NEVER read `Coding_Enviroment.ipynb`** (4 MB original Colab notebook). If a fact from it is
  needed, grep it with a narrow pattern or ask the owner. Never load it into context.
- Grep before Read. Read files with `offset`/`limit` — never whole files over ~300 lines unless
  editing most of them. The repo map below replaces exploratory scans; do not re-explore.
- No plan narration, no restating diffs, no summarizing code you just wrote. Reply: outcome first,
  then only decisions the owner must know. One short paragraph beats a sectioned report for
  routine work.
- Do not reformat, rename, or "clean up" code outside the requested change.
- No `npm install` — the MVP has **zero dependencies** by design. Never add one without asking.
- Batch independent tool calls in one message. Don't re-run commands to "confirm" what a
  successful exit already proved.

## Repo map

| Path | What it is | Rules |
| --- | --- | --- |
| `prism-valuation-web-mvp/` | Advisor-facing Dubai property valuation + off-plan portal. Pure Node ≥18, ESM, no deps. `server.js` = API + pipeline, `public/` = vanilla JS/CSS UI. | Active workstream. Edit here. |
| `prism-original-colab-analysis/` | Docs for the original Colab analytical baseline. | Read-only reference. |
| `Coding_Enviroment.ipynb` | The original notebook itself. | **Never open. Never rewrite or normalize.** It is the analytical baseline until reconciliation is complete. |
| `PRISM_BUILD_REPORT_FOR_NOTION.md` | Handoff/build report format exemplar. | Template for new reports. |
| `artifacts/` | Zipped snapshots. | Don't unzip into context. |
| `.github/workflows/daily-refresh.yml` | Nightly Dubai Pulse → Drive → PRISM reload (20:00 UTC = 00:00 Dubai). | Secrets listed in `.env.example`. |

## Domain invariants (violating these is a bug)

1. DLD area fields (`PROCEDURE_AREA`, fallback `ACTUAL_AREA`) are **sqm**. Convert exactly once:
   `area_sqft = area_sqm × 10.764`.
2. Client-facing outputs are **AED/sqft and total AED only**. The string `AED/sqm` must never
   appear in served HTML/UI.
3. Pipeline v3.1 filters: `GROUP_EN = Sales`, `USAGE_EN = Residential`, sanity bounds
   `50 ≤ aed_per_sqft ≤ 20,000`.
4. Valuation = comparable median with the documented 6-level fallback ladder (area+project+rooms+
   subtype → … → area only); first level with **≥5 matches** wins; low/high = 25th/75th pct.
   Surface the level used and comp count — they drive the confidence label.
5. The Colab notebook outranks the web MVP analytically. Do not present MVP valuations as
   authoritative; keep "prototype, pending reconciliation" framing in docs.
6. **Never commit raw transaction CSVs** or any large source data. Data lives in Drive/governed
   storage; the app resolves it via `TRANSACTIONS_CSV` → Dubai Pulse API → `TRANSACTIONS_URL`/
   Drive default, cached in `.cache/`.

## Code standard

- Pure Node built-ins with `node:` prefix imports; ESM (`"type": "module"`); no frameworks,
  no build step. Vanilla JS/CSS in `public/`.
- File header comment: what the file does + any resolution/priority logic, in prose. Section
  dividers: `// ---------------------------------------------------------------------------`.
- Comments state constraints and gotchas (e.g. Drive >25 MB interstitial), never what the next
  line does.
- Config via env vars only, every one documented in `.env.example` with grouped `# ──` headers,
  examples, and where to get credentials. Server must boot with zero env set (sane defaults,
  `PORT=4173`).
- Errors must tell the operator what to do (see the Drive virus-scan message in `server.js`).
- Log with `[data]`-style prefixes; human-readable counts (`toLocaleString()`).
- APIs are small JSON endpoints under `/api/*`; keep request/response fields documented in the
  workstream README.

## Delivery standard

- Ship **complete vertical slices**: feature + UI + env docs + README update in one commit.
  No scaffolding-only or WIP commits.
- Commit message: one summary line (imperative or `Component — state`), then one sentence of
  what shipped. Example: `PRISM Off-Plan Portal — production ready`.
- Every workstream README keeps: Run instructions, pipeline rules as a table, API surface, and a
  frank **"What this is not"** section. Honesty about limitations is part of the standard —
  never inflate readiness.
- Larger handoffs get a `*_FOR_NOTION.md` report following the exemplar: Executive Summary →
  Current Build → Source Data profile (row counts, date coverage, medians) → Unit Policy →
  Known Issues → **Verification Performed** → Next Steps.

## Verification standard (before claiming done)

- Boot the server (`npm start`, port 4173) and hit the touched `/api/*` endpoints.
- Reference cases: **Business Bay / The Crestmark** (project-level) and **JVC** (area-level)
  valuations must return sane results.
- Sanity anchors: ~89k raw rows, ~68.5k clean Sales rows, median ≈ 1,761 AED/sqft (drifts as
  data refreshes — flag large deviations, don't hard-fail).
- Grep served HTML for banned `AED/sqm` labels after UI changes.
- Report verification as facts observed ("metadata returned 89,270 rows"), not "should work".

## Git

- Work on the branch you were given; never push elsewhere. `git push -u origin <branch>`, retry
  on network failure with backoff. No PRs unless explicitly requested.
