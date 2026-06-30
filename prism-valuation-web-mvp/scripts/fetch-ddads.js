#!/usr/bin/env node
// DDA data.dubai (DDADS) client + loader for PRISM. Zero-dependency.
//
//   health  — mint an OAuth token and run the health check
//   sample  — fetch a few records from an endpoint and print them
//   pull    — page the DLD transactions endpoint, transform it to PRISM's
//             canonical CSV schema, and write it (default transactions-dld.csv).
//             Optionally POST /api/refresh to hot-reload a running server.
//
// ⚠️  GEOFENCE: the API only answers from inside the UAE. Run this on a Dubai
//     machine or a UAE-hosted server.
// ⚠️  CREDENTIALS are read from the environment or a local .env (gitignored).
//     NEVER commit real credentials.
//
// Env (test credentials are in the DDA onboarding email):
//   DATA_DUBAI_BASE_URL             default https://stg-apis.data.dubai
//                                   (production: https://apis.data.dubai)
//   DATA_DUBAI_SECURITY_IDENTIFIER  x-DDA-SecurityApplicationIdentifier value
//   DATA_DUBAI_CLIENT_ID            client_id
//   DATA_DUBAI_CLIENT_SECRET        client_secret
//   DATA_DUBAI_ENDPOINT             default /open/dld/dld_transactions-open-api
//   PRISM_URL                       default http://localhost:4173 (for --refresh)
//   REFRESH_SECRET                  must match the server (for --refresh)
//
// Usage:
//   node scripts/fetch-ddads.js health
//   node scripts/fetch-ddads.js sample --endpoint /open/dld/dld_transactions-open-api --pageSize 5
//   node scripts/fetch-ddads.js pull [--pages 50] [--pageSize 1000] [--out transactions-dld.csv] [--refresh]
//
// Then point PRISM at the data and boot:
//   npm run start:dld           (sets TRANSACTIONS_CSV=transactions-dld.csv for you)

import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(__dirname, '..');
const DEFAULT_BASE = 'https://stg-apis.data.dubai';
const DEFAULT_ENDPOINT = '/open/dld/dld_transactions-open-api';

// DLD (lowercase, from the API)  →  PRISM canonical CSV column (UPPERCASE).
// PRISM's buildDataset() reads these exact canonical names.
const COLUMN_MAP = [
  ['GROUP_EN', 'trans_group_en'],          // filtered to "Sales"
  ['USAGE_EN', 'property_usage_en'],        // filtered to "Residential"
  ['PROCEDURE_EN', 'procedure_name_en'],
  ['INSTANCE_DATE', 'instance_date'],
  ['PROP_TYPE_EN', 'property_type_en'],
  ['PROP_SB_TYPE_EN', 'property_sub_type_en'],
  ['AREA_EN', 'area_name_en'],
  ['PROJECT_EN', 'project_name_en'],
  ['MASTER_PROJECT_EN', 'master_project_en'],
  ['ROOMS_EN', 'rooms_en'],
  ['IS_OFFPLAN_EN', 'reg_type_en'],         // "Off-Plan Properties" / "Existing Properties"
  ['IS_FREE_HOLD_EN', null],                // not provided by this feed
  ['TRANS_VALUE', 'actual_worth'],
  ['PROCEDURE_AREA', 'procedure_area'],     // sqm; PRISM converts to sqft
  ['ACTUAL_AREA', null],
];

// ---------------------------------------------------------------------------
// .env loader (zero-dep) — reads prism-valuation-web-mvp/.env if present.
// ---------------------------------------------------------------------------

function loadDotEnv() {
  const envPath = path.join(APP_ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[ddads] Missing env var: ${name}`);
    console.error('[ddads] Set it in prism-valuation-web-mvp/.env (see .env.example) or export it.');
    process.exit(1);
  }
  return v;
}

function base() {
  return (process.env.DATA_DUBAI_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
}

function esc(v) {
  const s = v == null ? '' : String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
}

function request(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      { hostname: parsed.hostname, port: parsed.port || undefined, path: parsed.pathname + parsed.search, timeout: 30000, ...opts },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      },
    );
    req.on('timeout', () => req.destroy(new Error('Request timed out after 30s')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function geofenceHint(err) {
  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|timed out/i.test(err?.message || String(err))) {
    console.error('[ddads] Could not reach the API. It is geofenced to the UAE — run this from inside the UAE.');
  }
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function getToken() {
  const id = required('DATA_DUBAI_SECURITY_IDENTIFIER');
  const clientId = required('DATA_DUBAI_CLIENT_ID');
  const clientSecret = required('DATA_DUBAI_CLIENT_SECRET');
  const body = Buffer.from(JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }));
  const r = await request(
    `${base()}/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'x-DDA-SecurityApplicationIdentifier': id, 'Content-Length': body.length } },
    body,
  );
  const text = r.body.toString('utf8');
  if (r.status !== 200) {
    console.error(`[ddads] Token request failed. HTTP ${r.status}: ${text.slice(0, 300)}`);
    if (r.status === 403) console.error('[ddads] 403 → bad creds, wrong base URL (STG creds on PROD?), or request from outside the UAE.');
    process.exit(1);
  }
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error(`No access_token in response: ${text.slice(0, 200)}`);
  console.log(`[ddads] token ok; expires in ${data.expires_in} seconds`);
  return data.access_token;
}

async function getData(token, endpoint, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  const url = `${base()}${endpoint}${qs.toString() ? `?${qs}` : ''}`;
  const r = await request(url, { method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  return { status: r.status, body: r.body.toString('utf8'), url };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function cmdHealth() {
  const token = await getToken();
  const r = await request(`${base()}/secure/ddads/healthcheck/1.0.0/health`, {
    method: 'GET', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  console.log(r.body.toString('utf8'));
  process.exit(r.status === 200 ? 0 : 1);
}

async function cmdSample(flags) {
  const endpoint = flags.endpoint || process.env.DATA_DUBAI_ENDPOINT || DEFAULT_ENDPOINT;
  const token = await getToken();
  const res = await getData(token, endpoint, {
    page: flags.page || 1, pageSize: flags.pageSize || 5,
    filter: flags.filter, order_by: flags.order_by, order_dir: flags.order_dir,
  });
  if (res.status !== 200) {
    console.error(`[ddads] GET ${res.url}\n[ddads] HTTP ${res.status}: ${res.body.slice(0, 400)}`);
    process.exit(1);
  }
  const rows = JSON.parse(res.body).results || [];
  console.log(`[ddads] ${rows.length} records`);
  console.log(JSON.stringify(rows, null, 2));
}

async function cmdPull(flags) {
  const endpoint = flags.endpoint || process.env.DATA_DUBAI_ENDPOINT || DEFAULT_ENDPOINT;
  const pageSize = Number(flags.pageSize || 1000);
  const maxPages = Number(flags.pages || 50);
  const delayMs = Number(flags.delay || 1100); // stay under the 60 req/min limit
  const outPath = path.isAbsolute(flags.out || '')
    ? flags.out
    : path.join(APP_ROOT, flags.out || 'transactions-dld.csv');

  console.log(`[ddads] pulling ${endpoint} — up to ${maxPages} pages × ${pageSize}, newest first`);
  let token = await getToken();

  const headerCols = COLUMN_MAP.map(([h]) => h);
  const lines = [headerCols.join(',')];
  let total = 0;

  for (let page = 1; page <= maxPages; page++) {
    const params = { page, pageSize, order_by: 'instance_date', order_dir: 'desc' };
    let res = await getData(token, endpoint, params);
    if (res.status === 401) { token = await getToken(); res = await getData(token, endpoint, params); } // token expired mid-pull
    if (res.status !== 200) {
      console.error(`[ddads] page ${page} failed — HTTP ${res.status}: ${res.body.slice(0, 300)}`);
      if (total === 0) process.exit(1);
      break;
    }
    const rows = JSON.parse(res.body).results || [];
    if (!rows.length) break;
    for (const rec of rows) lines.push(COLUMN_MAP.map(([, src]) => esc(src ? rec[src] : '')).join(','));
    total += rows.length;
    console.log(`[ddads] page ${page}: +${rows.length} (total ${total.toLocaleString()})`);
    if (rows.length < pageSize) break; // last page
    if (page < maxPages) await sleep(delayMs);
  }

  fs.writeFileSync(outPath, lines.join('\r\n'));
  console.log(`[ddads] wrote ${total.toLocaleString()} rows → ${outPath}`);
  console.log('[ddads] PRISM canonical schema; it will filter to Sales + Residential and convert sqm→sqft on load.');

  if (flags.refresh) {
    const prismUrl = (process.env.PRISM_URL || 'http://localhost:4173').replace(/\/+$/, '');
    const secret = required('REFRESH_SECRET');
    const r = await request(`${prismUrl}/api/refresh?token=${encodeURIComponent(secret)}`, { method: 'POST' });
    console.log(`[ddads] refresh → HTTP ${r.status}: ${r.body.toString('utf8').slice(0, 200)}`);
    console.log('[ddads] note: refresh only loads this file if the server was started with TRANSACTIONS_CSV pointing at it (npm run start:dld).');
  } else {
    console.log('[ddads] next: `npm run start:dld` (or set TRANSACTIONS_CSV to the file above and `npm start`).');
  }
}

const USAGE = `DDA data.dubai (DDADS) client + PRISM loader
Usage:
  node scripts/fetch-ddads.js health
  node scripts/fetch-ddads.js sample --endpoint ${DEFAULT_ENDPOINT} --pageSize 5
  node scripts/fetch-ddads.js pull   [--pages 50] [--pageSize 1000] [--out transactions-dld.csv] [--refresh]`;

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      flags[key] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    }
  }
  return flags;
}

async function main() {
  loadDotEnv();
  const [cmd, ...rest] = process.argv.slice(2);
  const flags = parseFlags(rest);
  if (!cmd || cmd === 'help' || cmd === '--help') return void console.log(USAGE);
  if (cmd === 'health') return cmdHealth();
  if (cmd === 'sample') return cmdSample(flags);
  if (cmd === 'pull') return cmdPull(flags);
  console.error(`[ddads] unknown command: ${cmd}`);
  console.log(USAGE);
  process.exit(1);
}

main().catch((err) => {
  console.error('[ddads] FAILED:', err.message);
  geofenceHint(err);
  process.exit(1);
});
