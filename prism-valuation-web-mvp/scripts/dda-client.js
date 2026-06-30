#!/usr/bin/env node
// DDA data.dubai API client — Digital Dubai Authority (DDADS) Open API.
// Zero-dependency. Mints an OAuth bearer token, runs the health check, and
// queries datasets by {entity}/{dataset}. Use it to discover exactly which
// datasets your profile can read, then wire the useful ones into PRISM.
//
// ⚠️  GEOFENCE: the API only answers requests originating inside the UAE.
//     Run this from a Dubai machine or a UAE-hosted server. From anywhere
//     else (incl. most cloud regions) DNS/connection will fail or 403.
// ⚠️  CREDENTIALS are read from the environment, or from a local .env file
//     (gitignored). NEVER commit real credentials.
//
// Env vars (test credentials are in the DDA onboarding email):
//   DDA_BASE_URL                 default https://stg-apis.data.dubai
//                                (production: https://apis.data.dubai)
//   DDA_SECURITY_APP_IDENTIFIER  x-DDA-SecurityApplicationIdentifier value
//   DDA_CLIENT_ID                client_id
//   DDA_CLIENT_SECRET            client_secret
//
// Usage:
//   node scripts/dda-client.js token
//   node scripts/dda-client.js health
//   node scripts/dda-client.js get <entity> <dataset> [options]
//
// get options (all optional; names mirror the DDA spec):
//   --page N           page number (default 1)
//   --pageSize N       records per page (max 1000)
//   --limit N          max records (alternative to pagination)
//   --filter "c=val"   filter expression on any column
//   --column "a,b,c"   comma-separated columns to return
//   --order_by col     column to sort by
//   --order_dir dir    asc | desc
//   --offset N         skip N records
//   --save file.json   write the full JSON response to a file
//
// Examples (entity/dataset names come from the data.dubai catalogue):
//   node scripts/dda-client.js health
//   node scripts/dda-client.js get amaf amaf_minor-open-api --pageSize 5
//   node scripts/dda-client.js probe dld dld_transactions-open-api      # confirmed DLD endpoint
//   node scripts/dda-client.js get dld dld_transactions-open-api --pageSize 5 --save sample.json

import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_BASE = 'https://stg-apis.data.dubai';

// ---------------------------------------------------------------------------
// .env loader (zero-dep) — reads prism-valuation-web-mvp/.env if present.
// Does not overwrite variables already set in the real environment.
// ---------------------------------------------------------------------------

function loadDotEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function required(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`[dda] Missing env var: ${name}`);
    console.error('[dda] Set it in prism-valuation-web-mvp/.env (copy from .env.example) or export it.');
    process.exit(1);
  }
  return v;
}

function base() {
  return (process.env.DDA_BASE_URL || DEFAULT_BASE).replace(/\/+$/, '');
}

function request(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        timeout: 30000, // DDA terminates requests after 30s
        ...opts,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('timeout', () => req.destroy(new Error('Request timed out after 30s')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function geofenceHint(err) {
  const msg = err?.message || String(err);
  if (/ENOTFOUND|EAI_AGAIN|ETIMEDOUT|ECONNREFUSED|timed out/i.test(msg)) {
    console.error(
      '[dda] Could not reach the API. The DDA API is geofenced to the UAE — ' +
        'run this from a Dubai machine or a UAE-hosted server.',
    );
  }
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

async function getToken() {
  const id = required('DDA_SECURITY_APP_IDENTIFIER');
  const clientId = required('DDA_CLIENT_ID');
  const clientSecret = required('DDA_CLIENT_SECRET');

  const body = Buffer.from(
    JSON.stringify({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
  );
  const r = await request(
    `${base()}/secure/ssis/dubaiai/gatewaytoken/1.0.0/getAccessToken`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-DDA-SecurityApplicationIdentifier': id,
        'Content-Length': body.length,
      },
    },
    body,
  );

  const text = r.body.toString('utf8');
  if (r.status !== 200) {
    console.error(`[dda] Token request failed — HTTP ${r.status}: ${text.slice(0, 300)}`);
    if (r.status === 403) console.error('[dda] 403 may mean a bad identifier/secret OR a request from outside the UAE.');
    process.exit(1);
  }
  const data = JSON.parse(text);
  if (!data.access_token) throw new Error(`No access_token in response: ${text.slice(0, 200)}`);
  return data.access_token;
}

async function health(token) {
  const r = await request(`${base()}/secure/ddads/healthcheck/1.0.0/health`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return { status: r.status, body: r.body.toString('utf8') };
}

async function query(token, entity, dataset, params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  const suffix = qs.toString() ? `?${qs}` : '';
  const url = `${base()}/secure/ddads/openapi/1.0.0/${encodeURIComponent(entity)}/${encodeURIComponent(dataset)}${suffix}`;
  const r = await request(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  return { status: r.status, body: r.body.toString('utf8'), url };
}

function statusMeaning(code) {
  return {
    200: 'OK — granted & live',
    204: 'no content — granted but empty',
    400: 'bad/missing query params (your query, not the grant)',
    401: 'unauthorized — token bad/expired',
    403: 'forbidden — bad credentials OR request from outside the UAE',
    404: 'not found — wrong entity/dataset name, or not provisioned to you',
    405: 'method not allowed',
    500: 'server error',
    503: 'service under maintenance',
  }[code] || 'unexpected status';
}

// Inspect a single dataset (read-only): HTTP status, schema, coverage, and a
// PRISM-fit map. Run from inside the UAE; paste the output back for mapping.
async function probe(token, entity, dataset, dateCol) {
  const first = await query(token, entity, dataset, { pageSize: 1, page: 1 });
  console.log(`[dda] GET ${first.url}`);
  console.log(`[dda] HTTP ${first.status} — ${statusMeaning(first.status)}`);
  if (first.status !== 200) {
    console.log(`[dda] body: ${first.body.slice(0, 400)}`);
    return;
  }

  let json;
  try { json = JSON.parse(first.body); } catch { console.log('[dda] response not JSON:', first.body.slice(0, 300)); return; }
  const rows = json.results || json.records || json.result?.records || [];
  if (!rows.length) { console.log('[dda] 200 but no records — granted but empty.'); return; }

  const sample = rows[0];
  const cols = Object.keys(sample);
  console.log(`\n[dda] columns (${cols.length}):`);
  for (const c of cols) {
    const v = sample[c];
    const t = v === null ? 'null' : typeof v;
    let s = v === null ? '' : String(v);
    if (s.length > 48) s = s.slice(0, 48) + '…';
    console.log(`  ${c}  (${t})  e.g. ${s}`);
  }

  if (json.total !== undefined) console.log(`\n[dda] reported total rows: ${json.total}`);
  else console.log('\n[dda] no "total" field — full size only knowable by paging.');

  const dc = dateCol || cols.find((c) => /date|instance|timestamp|reg_dt/i.test(c));
  if (dc) {
    try {
      const newest = await query(token, entity, dataset, { pageSize: 1, order_by: dc, order_dir: 'desc' });
      const oldest = await query(token, entity, dataset, { pageSize: 1, order_by: dc, order_dir: 'asc' });
      const nv = (JSON.parse(newest.body).results || [])[0]?.[dc];
      const ov = (JSON.parse(oldest.body).results || [])[0]?.[dc];
      console.log(`\n[dda] coverage by "${dc}": oldest=${ov}  newest=${nv}`);
    } catch { console.log(`\n[dda] coverage probe on "${dc}" failed (column may not be sortable).`); }
  } else {
    console.log('\n[dda] no obvious date column — pass --date <col> to probe coverage.');
  }

  const buckets = {
    'area / location': /area|community|location|zone|master/i,
    'price / value': /worth|price|amount|value|trans_value/i,
    'size': /size|sq_?m|sq_?ft|procedure_area|builtup|built_up/i,
    'rooms': /room|bed/i,
    'date': /date|instance|timestamp/i,
    'project / building': /project|building|tower/i,
    'off-plan / resale': /reg_type|off_?plan|ready|resale|sale_type|is_offplan/i,
  };
  console.log('\n[dda] PRISM-fit (candidate columns per field PRISM needs):');
  for (const [label, re] of Object.entries(buckets)) {
    const hits = cols.filter((c) => re.test(c));
    console.log(`  ${hits.length ? '✓' : '·'} ${label}: ${hits.join(', ') || '(none found)'}`);
  }

  console.log('\n[dda] one sample record:');
  console.log(JSON.stringify(sample, null, 2));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      flags[key] = val;
    }
  }
  return flags;
}

const USAGE = `DDA data.dubai API client
Usage:
  node scripts/dda-client.js token
  node scripts/dda-client.js health
  node scripts/dda-client.js probe <entity> <dataset> [--date <column>]
  node scripts/dda-client.js get <entity> <dataset> [--page --pageSize --limit --filter --column --order_by --order_dir --offset --save]`;

async function main() {
  loadDotEnv();
  const [cmd, ...rest] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help') {
    console.log(USAGE);
    return;
  }

  if (cmd === 'token') {
    const token = await getToken();
    console.log('[dda] token OK (valid ~1h):');
    console.log(token);
    return;
  }

  if (cmd === 'health') {
    const token = await getToken();
    const res = await health(token);
    console.log(`[dda] health HTTP ${res.status}: ${res.body}`);
    process.exit(res.status === 200 ? 0 : 1);
  }

  if (cmd === 'probe') {
    const [entity, dataset] = rest.filter((a) => !a.startsWith('--'));
    if (!entity || !dataset) {
      console.error('[dda] usage: probe <entity> <dataset> [--date <column>]');
      process.exit(1);
    }
    const flags = parseFlags(rest);
    const token = await getToken();
    await probe(token, entity, dataset, flags.date);
    return;
  }

  if (cmd === 'get') {
    const [entity, dataset] = rest.filter((a) => !a.startsWith('--'));
    if (!entity || !dataset) {
      console.error('[dda] usage: get <entity> <dataset> [options]');
      process.exit(1);
    }
    const flags = parseFlags(rest);
    const token = await getToken();
    const res = await query(token, entity, dataset, {
      page: flags.page,
      pageSize: flags.pageSize,
      limit: flags.limit,
      filter: flags.filter,
      column: flags.column,
      order_by: flags.order_by,
      order_dir: flags.order_dir,
      offset: flags.offset,
    });

    if (res.status !== 200) {
      console.error(`[dda] GET ${res.url}`);
      console.error(`[dda] HTTP ${res.status}: ${res.body.slice(0, 500)}`);
      process.exit(1);
    }

    if (flags.save) {
      fs.writeFileSync(flags.save, res.body);
      let count = '?';
      try { count = (JSON.parse(res.body).results || []).length; } catch {}
      console.log(`[dda] saved ${count} records to ${flags.save}`);
    } else {
      console.log(res.body);
    }
    return;
  }

  console.error(`[dda] unknown command: ${cmd}`);
  console.log(USAGE);
  process.exit(1);
}

main().catch((err) => {
  console.error('[dda] FAILED:', err.message);
  geofenceHint(err);
  process.exit(1);
});
