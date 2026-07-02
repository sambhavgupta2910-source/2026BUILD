# Deploying PRISM / Elevate Homes to a public URL

The app is a single zero-dependency Node server — it runs anywhere Node 18+
runs. Two supported paths:

- **Vercel preview** (fastest): root `vercel.json` + `api/index.js` wrap the
  server as one serverless function. With no env vars set, the function boots
  on the **real DLD dataset** from the built-in Drive default URL
  (`DEFAULT_DRIVE_FILE_ID` in `server.js` — the link-shared PRISM pull). The
  bundled synthetic CSV is only a fallback if that fetch fails, and the UI
  shows a DEMO DATA ribbon whenever it is in use. To point a deployment at a
  fresher pull, set `TRANSACTIONS_URL` in the Vercel project settings, or
  replace the Drive file's content in place (Drive → right-click → File
  information → **Manage versions** keeps the same FILE_ID) and hit
  `POST /api/refresh?token=<REFRESH_SECRET>`.
- **Railway** (recommended for the real domain): a long-lived server with a
  volume for leads, ~10 minutes from zero to a public URL.

## 1. Railway (recommended)

1. Go to <https://railway.app> → **New Project → Deploy from GitHub repo** →
   pick `2026BUILD`, set **Root Directory** to `prism-valuation-web-mvp`.
   Railway auto-detects Node and runs `npm start`. (A `Dockerfile` is also
   included if you prefer Docker deploys.)
2. Set environment variables (Project → Variables):

   | Variable | Value |
   |---|---|
   | `TRANSACTIONS_URL` | Public CSV URL with the DLD data (see §3) |
   | `CRM_TOKEN` | A long random string — locks `/crm` |
   | `REFRESH_SECRET` | A long random string — locks `POST /api/refresh` |
   | `AGENT_WHATSAPP` | e.g. `9715XXXXXXXX` (digits only) |
   | `XAI_API_KEY` | Optional — enables the AI analyst notes |

3. Add a **Volume** mounted at `/app/.data` so captured leads
   (`.data/leads.json`) survive restarts and redeploys.
4. Deploy → you get `https://<project>.up.railway.app`. Add the custom domain
   (e.g. `prism.elevatehomes.ae`) under Settings → Domains, and point a CNAME
   at it from your DNS.

## 2. What "live" means for the data (the UAE geofence)

The DDA/DLD API only answers from inside the UAE, and Railway boxes are not in
the UAE — so the **server never calls DDA directly**. Instead:

```
Mac (Dubai) ── npm run pull:dld ──> transactions-dld.csv ──> Google Drive
Railway server ── TRANSACTIONS_URL (Drive) ──> loads on boot / on refresh
```

## 3. Publishing the data for the server

1. On the Mac: `npm run pull:dld` (writes `transactions-dld.csv`).
2. Upload it to Google Drive → share as **"anyone with the link"** → build the
   direct URL: `https://drive.google.com/uc?export=download&id=<FILE_ID>`.
3. Set that URL as `TRANSACTIONS_URL` on Railway.
4. To refresh later: re-run the pull, overwrite the same Drive file (same
   FILE_ID), then hot-reload the server:
   `curl -X POST "https://<your-app>/api/refresh?token=<REFRESH_SECRET>"`
   (or just redeploy). Keep the file under ~25 MB or Drive serves a
   virus-scan interstitial — trim with `--pages` on the pull if needed.

## 4. Pre-demo checklist

- [ ] `/` loads with real stats and the hero market pulse
- [ ] Deal check returns a verdict with comparables
- [ ] `/sell` valuation → lead lands in `/crm?token=<CRM_TOKEN>`
- [ ] `/report` prints cleanly to PDF
- [ ] `/deck` renders (investor deck)
- [ ] `CRM_TOKEN` and `REFRESH_SECRET` are set (never deploy without them)
