// PRISM Valuation Intelligence — server
//
// Loads the DLD transactions CSV once on boot, runs the v3.1 pipeline
// (Sales-only, Residential-only, sqm→sqft applied once, AED/sqft derived),
// and exposes a small JSON API for the advisor UI in /public.
//
// Data source priority on boot:
//   1. TRANSACTIONS_CSV  — absolute path to a local CSV
//   2. TRANSACTIONS_URL  — http(s) URL the server fetches once on boot
//   3. Default URL       — the PRISM 2.0 file on Drive (must be "anyone with link")
//
// Drive files >25 MB return an interstitial; the source file is 21.9 MB so
// the `uc?export=download&id=…` endpoint works directly when shared.

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_DIR = path.join(__dirname, '.cache');

const PORT = Number(process.env.PORT || 4173);
const SQM_TO_SQFT = 10.764;

const DEFAULT_DRIVE_FILE_ID = '1mo0YAYfbBMguqk1qQ4E2XT06rxuJWzCa';
const DEFAULT_URL = `https://drive.google.com/uc?export=download&id=${DEFAULT_DRIVE_FILE_ID}`;

// ---------------------------------------------------------------------------
// CSV loading
// ---------------------------------------------------------------------------

function fetchToBuffer(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https:') ? https : http;
    client
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          return resolve(fetchToBuffer(next, redirects + 1));
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function loadCsvText() {
  const localPath = process.env.TRANSACTIONS_CSV;
  if (localPath && fs.existsSync(localPath)) {
    console.log(`[data] reading local CSV: ${localPath}`);
    return fs.readFileSync(localPath, 'utf8');
  }

  const url = process.env.TRANSACTIONS_URL || DEFAULT_URL;
  const cachePath = path.join(CACHE_DIR, 'transactions.csv');
  if (fs.existsSync(cachePath) && !process.env.PRISM_REFRESH) {
    console.log(`[data] using cached CSV: ${cachePath}`);
    return fs.readFileSync(cachePath, 'utf8');
  }

  console.log(`[data] fetching CSV from ${url}`);
  const buf = await fetchToBuffer(url);
  const text = buf.toString('utf8');
  if (text.includes('<html') && text.toLowerCase().includes('virus')) {
    throw new Error(
      'Drive returned the virus-scan interstitial instead of the file. ' +
        'Make sure the file is shared as "anyone with the link" and is under 25 MB, ' +
        'or set TRANSACTIONS_CSV to a local path.',
    );
  }
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cachePath, text);
  console.log(`[data] cached ${(buf.length / 1024 / 1024).toFixed(1)} MB to ${cachePath}`);
  return text;
}

// ---------------------------------------------------------------------------
// CSV parsing (RFC 4180-ish: handles quoted fields, escaped quotes, CRLF)
// ---------------------------------------------------------------------------

function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = [];
  let field = '';
  let row = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      field = '';
      row = [];
    } else if (ch === '\r') {
      // swallow; \n follows
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return { header: [], records: [] };
  const header = rows[0].map((h) => h.trim());
  const records = rows.slice(1).filter((r) => r.length > 1);
  return { header, records };
}

// ---------------------------------------------------------------------------
// Pipeline — port of notebook v3.1: sales-only residential, sqm→sqft once
// ---------------------------------------------------------------------------

function toNumber(v) {
  if (v === undefined || v === null || v === '') return NaN;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function buildDataset(text) {
  const t0 = Date.now();
  const { header, records } = parseCsv(text);
  const colIndex = Object.fromEntries(header.map((h, i) => [h, i]));

  const required = ['GROUP_EN', 'USAGE_EN', 'TRANS_VALUE', 'PROCEDURE_AREA', 'AREA_EN'];
  for (const c of required) {
    if (!(c in colIndex)) throw new Error(`CSV missing required column: ${c}`);
  }

  const get = (r, name) => (name in colIndex ? r[colIndex[name]] : '');
  const cleanRows = [];
  let sales = 0;
  let residential = 0;

  for (const r of records) {
    if (get(r, 'GROUP_EN') !== 'Sales') continue;
    sales++;
    if (get(r, 'USAGE_EN') !== 'Residential') continue;
    residential++;

    const transValue = toNumber(get(r, 'TRANS_VALUE'));
    const procArea = toNumber(get(r, 'PROCEDURE_AREA'));
    const actualArea = toNumber(get(r, 'ACTUAL_AREA'));
    const areaSqm = Number.isFinite(procArea) && procArea > 0 ? procArea : actualArea;
    if (!Number.isFinite(transValue) || transValue <= 0) continue;
    if (!Number.isFinite(areaSqm) || areaSqm <= 0) continue;

    const areaSqft = areaSqm * SQM_TO_SQFT;
    const aedPerSqft = transValue / areaSqft;
    if (!Number.isFinite(aedPerSqft) || aedPerSqft <= 0) continue;

    cleanRows.push({
      date: get(r, 'INSTANCE_DATE'),
      area: get(r, 'AREA_EN'),
      project: get(r, 'PROJECT_EN'),
      masterProject: get(r, 'MASTER_PROJECT_EN'),
      propertyType: get(r, 'PROP_TYPE_EN'),
      propertySubtype: get(r, 'PROP_SB_TYPE_EN'),
      rooms: get(r, 'ROOMS_EN'),
      offplan: get(r, 'IS_OFFPLAN_EN'),
      freehold: get(r, 'IS_FREE_HOLD_EN'),
      procedure: get(r, 'PROCEDURE_EN'),
      transValue,
      areaSqft,
      aedPerSqft,
    });
  }

  // Sanity-bound winsorization on AED/sqft. The notebook flagged percentile
  // thresholds as "needs business validation"; use a conservative fixed band
  // (50 – 20,000 AED/sqft) so we drop obvious data-entry noise without
  // skewing community medians.
  const trimmed = cleanRows.filter((r) => r.aedPerSqft >= 50 && r.aedPerSqft <= 20000);
  const adjusted = cleanRows.length - trimmed.length;

  // Median AED/sqft for the data-quality strip
  const psf = trimmed.map((r) => r.aedPerSqft).sort((a, b) => a - b);
  const medianPsf = psf.length ? psf[Math.floor(psf.length / 2)] : 0;

  // Indexes for fast filtering
  const byArea = new Map();
  const byProject = new Map();
  for (const r of trimmed) {
    const a = r.area || '';
    const p = r.project || '';
    if (a) {
      if (!byArea.has(a)) byArea.set(a, []);
      byArea.get(a).push(r);
    }
    if (p) {
      if (!byProject.has(p)) byProject.set(p, []);
      byProject.get(p).push(r);
    }
  }

  const dataset = {
    rowCount: records.length,
    salesRows: sales,
    residentialSalesRows: residential,
    cleanRows: trimmed.length,
    adjustedRows: adjusted,
    medianPsf,
    dateMin: trimmed.reduce((m, r) => (m && m < r.date ? m : r.date), ''),
    dateMax: trimmed.reduce((m, r) => (m && m > r.date ? m : r.date), ''),
    rows: trimmed,
    byArea,
    byProject,
  };

  console.log(
    `[pipeline] ${records.length.toLocaleString()} raw → ${sales.toLocaleString()} sales → ` +
      `${residential.toLocaleString()} residential → ${trimmed.length.toLocaleString()} clean ` +
      `(median ${medianPsf.toFixed(0)} AED/sqft) in ${Date.now() - t0} ms`,
  );
  return dataset;
}

// ---------------------------------------------------------------------------
// Metadata for the UI (datalists, top areas/projects)
// ---------------------------------------------------------------------------

function topByCount(map, n) {
  return [...map.entries()]
    .map(([key, rows]) => ({
      label: key,
      count: rows.length,
      medianPsf: median(rows.map((r) => r.aedPerSqft)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function buildMetadata(d) {
  const uniq = (key) => {
    const s = new Set();
    for (const r of d.rows) if (r[key]) s.add(r[key]);
    return [...s].sort();
  };
  return {
    rowCount: d.rowCount,
    salesRows: d.salesRows,
    residentialSalesRows: d.residentialSalesRows,
    cleanRows: d.cleanRows,
    adjustedRows: d.adjustedRows,
    medianPsf: d.medianPsf,
    dateMin: d.dateMin,
    dateMax: d.dateMax,
    areas: uniq('area'),
    projects: uniq('project'),
    propertyTypes: uniq('propertyType'),
    propertySubtypes: uniq('propertySubtype'),
    rooms: uniq('rooms'),
    offplan: uniq('offplan'),
    freehold: uniq('freehold'),
    usage: ['Residential'],
    topAreas: topByCount(d.byArea, 10),
    topProjects: topByCount(d.byProject, 10),
  };
}

// ---------------------------------------------------------------------------
// Valuation engine — comparable-median with documented fallback widening
// ---------------------------------------------------------------------------

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (s.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return s[lo];
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

const norm = (s) => (s || '').toString().trim().toLowerCase();
const MIN_COMPS = 5;

const FALLBACK_LADDER = [
  { id: 'exact', label: 'Area + project + rooms + subtype', match: (r, q) =>
      norm(r.area) === norm(q.area) &&
      norm(r.project) === norm(q.project) &&
      norm(r.rooms) === norm(q.rooms) &&
      norm(r.propertySubtype) === norm(q.propertySubtype) },
  { id: 'noSubtype', label: 'Area + project + rooms', match: (r, q) =>
      norm(r.area) === norm(q.area) &&
      norm(r.project) === norm(q.project) &&
      norm(r.rooms) === norm(q.rooms) },
  { id: 'projectAny', label: 'Area + project (any rooms)', match: (r, q) =>
      norm(r.area) === norm(q.area) &&
      norm(r.project) === norm(q.project) },
  { id: 'areaRooms', label: 'Area + rooms (any project)', match: (r, q) =>
      norm(r.area) === norm(q.area) &&
      norm(r.rooms) === norm(q.rooms) },
  { id: 'areaSize', label: 'Area + size band (±25%)', match: (r, q) =>
      norm(r.area) === norm(q.area) &&
      r.areaSqft >= q.sizeSqft * 0.75 &&
      r.areaSqft <= q.sizeSqft * 1.25 },
  { id: 'area', label: 'Area only', match: (r, q) => norm(r.area) === norm(q.area) },
];

function pickComparables(dataset, query) {
  const candidates = dataset.byArea.get(query.area) || dataset.rows;
  for (const step of FALLBACK_LADDER) {
    const matches = candidates.filter((r) => step.match(r, query));
    if (matches.length >= MIN_COMPS) return { step, matches };
  }
  // Worst case: return whatever area matched
  return { step: FALLBACK_LADDER.at(-1), matches: candidates };
}

function confidenceLabel(step, count) {
  if (step.id === 'exact' && count >= 20) return 'High';
  if (['exact', 'noSubtype'].includes(step.id) && count >= 10) return 'High';
  if (['exact', 'noSubtype', 'projectAny'].includes(step.id) && count >= MIN_COMPS) return 'Medium';
  if (count >= MIN_COMPS) return 'Low';
  return 'Insufficient';
}

function valuation(dataset, body) {
  const sizeRaw = toNumber(body.size);
  if (!Number.isFinite(sizeRaw) || sizeRaw <= 0) {
    return { error: 'Size must be a positive number.' };
  }
  const sizeSqft = body.sizeUnit === 'sqm' ? sizeRaw * SQM_TO_SQFT : sizeRaw;

  // Resolve area/project case-insensitively against known values for stability
  const areaKey = [...dataset.byArea.keys()].find((k) => norm(k) === norm(body.area)) || body.area;
  const projectKey = body.project
    ? [...dataset.byProject.keys()].find((k) => norm(k) === norm(body.project)) || body.project
    : '';

  const query = {
    area: areaKey,
    project: projectKey,
    rooms: body.rooms || '',
    propertyType: body.propertyType || '',
    propertySubtype: body.propertySubtype || '',
    offplan: body.offplan || '',
    freehold: body.freehold || '',
    sizeSqft,
  };

  const { step, matches } = pickComparables(dataset, query);
  if (!matches.length) {
    return { error: `No comparable transactions found for area "${body.area}".` };
  }

  const psfs = matches.map((r) => r.aedPerSqft);
  const basePsf = median(psfs);
  const lowPsf = percentile(psfs, 0.25);
  const highPsf = percentile(psfs, 0.75);

  const comparables = [...matches]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 25)
    .map((r) => ({
      date: r.date,
      area: r.area,
      project: r.project,
      rooms: r.rooms,
      sizeSqft: r.areaSqft,
      transValue: r.transValue,
      aedPerSqft: r.aedPerSqft,
    }));

  return {
    basePsf,
    lowPsf,
    highPsf,
    baseValue: basePsf * sizeSqft,
    lowValue: lowPsf * sizeSqft,
    highValue: highPsf * sizeSqft,
    sizeSqft,
    compCount: matches.length,
    confidence: confidenceLabel(step, matches.length),
    fallback: { id: step.id, label: step.label },
    resolvedArea: areaKey,
    resolvedProject: projectKey,
    comparables,
  };
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'forbidden' });
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'not found' });
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function start() {
  const csvText = await loadCsvText();
  const dataset = buildDataset(csvText);
  const metadata = buildMetadata(dataset);

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/api/metadata') {
        return send(res, 200, metadata);
      }
      if (req.method === 'POST' && req.url === '/api/valuation') {
        const body = await readJson(req);
        const result = valuation(dataset, body);
        return send(res, result.error ? 400 : 200, result);
      }
      if (req.method === 'GET') return serveStatic(req, res);
      return send(res, 405, { error: 'method not allowed' });
    } catch (err) {
      console.error('[server]', err);
      return send(res, 500, { error: err.message || 'internal error' });
    }
  });

  server.listen(PORT, () => {
    console.log(`[server] PRISM ready at http://localhost:${PORT}/`);
    console.log(
      `[server] ${dataset.cleanRows.toLocaleString()} clean residential-sales rows, ` +
        `${metadata.areas.length} areas, ${metadata.projects.length} projects`,
    );
  });
}

start().catch((err) => {
  console.error('[boot] failed:', err.message);
  process.exit(1);
});
