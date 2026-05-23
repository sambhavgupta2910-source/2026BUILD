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
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const CACHE_DIR = path.join(__dirname, '.cache');

const PORT = Number(process.env.PORT || 4173);
const SQM_TO_SQFT = 10.764;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;
const analysisCache = new Map();

const DEFAULT_DRIVE_FILE_ID = '1mo0YAYfbBMguqk1qQ4E2XT06rxuJWzCa';
const DEFAULT_URL = `https://drive.google.com/uc?export=download&id=${DEFAULT_DRIVE_FILE_ID}`;

// ---------------------------------------------------------------------------
// CSV loading
// ---------------------------------------------------------------------------

function fetchToBuffer(url, redirects = 0, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https:') ? https : http;
    client
      .get(url, { headers: extraHeaders }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          const next = new URL(res.headers.location, url).toString();
          return resolve(fetchToBuffer(next, redirects + 1, extraHeaders));
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

async function fetchPulseCsv(apiUrl, apiKey) {
  console.log('[data] fetching from Dubai Pulse API…');
  const buf = await fetchToBuffer(apiUrl, 0, { 'X-Api-Key': apiKey, Accept: 'application/json' });
  const json = JSON.parse(buf.toString('utf8'));
  if (!json.success || !json.result?.records?.length) {
    throw new Error(`Dubai Pulse response invalid or empty: ${buf.toString('utf8').slice(0, 200)}`);
  }
  const records = json.result.records;
  const headers = Object.keys(records[0]);
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  console.log(`[data] Dubai Pulse returned ${records.length.toLocaleString()} records`);
  return [headers.join(','), ...records.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\r\n');
}

async function loadCsvText() {
  // Priority 1 — local file (fastest, for development)
  const localPath = process.env.TRANSACTIONS_CSV;
  if (localPath && fs.existsSync(localPath)) {
    console.log(`[data] reading local CSV: ${localPath}`);
    return fs.readFileSync(localPath, 'utf8');
  }

  // Priority 2 — Dubai Pulse CKAN API (live daily data, requires API key)
  const pulseUrl = process.env.DUBAI_PULSE_API_URL;
  const pulseKey = process.env.DUBAI_PULSE_API_KEY;
  if (pulseUrl && pulseKey) {
    return fetchPulseCsv(pulseUrl, pulseKey);
  }

  // Priority 3 — any CSV URL (Drive, S3, etc.) with local .cache/ fallback
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
// Trends — monthly aggregates, off-plan split, sub-location breakdown
// ---------------------------------------------------------------------------

function buildTrends(dataset) {
  const byMonth = new Map();
  for (const r of dataset.rows) {
    const month = r.date ? r.date.slice(0, 7) : '';
    if (!month) continue;
    if (!byMonth.has(month)) {
      byMonth.set(month, { count: 0, psfs: [], totalValue: 0, offplanCount: 0, readyCount: 0 });
    }
    const b = byMonth.get(month);
    b.count++;
    b.psfs.push(r.aedPerSqft);
    b.totalValue += r.transValue;
    if ((r.offplan || '').toLowerCase().includes('off')) b.offplanCount++;
    else b.readyCount++;
  }

  const monthly = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, b]) => ({
      month,
      count: b.count,
      medianPsf: median(b.psfs),
      totalValue: b.totalValue,
      offplanCount: b.offplanCount,
      readyCount: b.readyCount,
    }));

  const offplanBuckets = new Map();
  for (const r of dataset.rows) {
    const key = r.offplan || 'Unknown';
    if (!offplanBuckets.has(key)) offplanBuckets.set(key, { count: 0, psfs: [] });
    offplanBuckets.get(key).count++;
    offplanBuckets.get(key).psfs.push(r.aedPerSqft);
  }
  const totalClean = dataset.rows.length;
  const offplanSplit = [...offplanBuckets.entries()]
    .map(([label, b]) => ({
      label,
      count: b.count,
      medianPsf: median(b.psfs),
      share: totalClean > 0 ? b.count / totalClean : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const areaStats = [...dataset.byArea.entries()]
    .map(([label, rows]) => {
      const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));
      const half = Math.floor(sorted.length / 2);
      const firstMed = median(sorted.slice(0, half).map((r) => r.aedPerSqft));
      const lastMed = median(sorted.slice(half).map((r) => r.aedPerSqft));
      const trend = firstMed > 0 ? ((lastMed - firstMed) / firstMed) * 100 : 0;
      const offplanCount = rows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;
      return {
        label,
        count: rows.length,
        medianPsf: median(rows.map((r) => r.aedPerSqft)),
        offplanPct: Math.round((offplanCount / rows.length) * 100),
        trend: Math.round(trend * 10) / 10,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 25);

  return {
    dateMin: dataset.dateMin,
    dateMax: dataset.dateMax,
    monthly,
    offplanSplit,
    areaStats,
  };
}

// ---------------------------------------------------------------------------
// Claude market commentary — /api/analysis
// ---------------------------------------------------------------------------

function buildAreaContext(dataset, area) {
  const rows = dataset.byArea.get(area) || [];
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));
  const half = Math.floor(sorted.length / 2);
  const firstMed = median(sorted.slice(0, half).map((r) => r.aedPerSqft));
  const lastMed = median(sorted.slice(half).map((r) => r.aedPerSqft));
  const trend = firstMed > 0 ? ((lastMed - firstMed) / firstMed) * 100 : 0;
  const offplanCount = rows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;
  const byProject = new Map();
  for (const r of rows) {
    const p = r.project || '';
    if (!p) continue;
    if (!byProject.has(p)) byProject.set(p, []);
    byProject.get(p).push(r.aedPerSqft);
  }
  const topProjects = [...byProject.entries()]
    .map(([name, psfs]) => ({ name, count: psfs.length, medianPsf: Math.round(median(psfs)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  return {
    area,
    dateMin: (dataset.dateMin || '').slice(0, 10),
    dateMax: (dataset.dateMax || '').slice(0, 10),
    totalTransactions: rows.length,
    medianPsf: Math.round(median(rows.map((r) => r.aedPerSqft))),
    offplanPct: Math.round((offplanCount / rows.length) * 100),
    trend: Math.round(trend * 10) / 10,
    topProjects,
  };
}

async function getAnalysis(dataset, area) {
  if (!anthropic) return { commentary: null, reason: 'ANTHROPIC_API_KEY not configured' };
  const ctx = buildAreaContext(dataset, area);
  if (!ctx) return { commentary: null, reason: `No transaction data for area: ${area}` };

  const monthKey = new Date().toISOString().slice(0, 7);
  const cacheKey = `${area}:${monthKey}`;
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

  const topProjLines = ctx.topProjects
    .map((p, i) => `  ${i + 1}. ${p.name} — ${p.count.toLocaleString()} txns — ${p.medianPsf.toLocaleString()} AED/sqft`)
    .join('\n');

  const userContent =
    `Area: ${ctx.area}\n` +
    `Date range: ${ctx.dateMin} to ${ctx.dateMax}\n` +
    `Total residential sales: ${ctx.totalTransactions.toLocaleString()}\n` +
    `Median price: ${ctx.medianPsf.toLocaleString()} AED/sqft\n` +
    `Off-plan share: ${ctx.offplanPct}%\n` +
    `Price trend (first half vs second half): ${ctx.trend > 0 ? '+' : ''}${ctx.trend}%\n` +
    `Top projects:\n${topProjLines}`;

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 220,
    system:
      'You are a senior Dubai real estate analyst writing for professional advisors on the PRISM platform. ' +
      'Write exactly 3-4 sentences of concise, data-driven market commentary. ' +
      'Be specific: cite the AED/sqft figures, transaction counts, and percentage changes from the data. ' +
      'Cover: (1) overall price level and recent trend direction, (2) what the off-plan share signals about buyer composition, ' +
      '(3) one sharp, actionable insight about this sub-market. No filler, no caveats, no disclaimers.',
    messages: [{ role: 'user', content: userContent }],
  });

  const commentary = msg.content[0]?.text?.trim() || '';
  const result = { commentary, dataSnapshot: ctx };
  analysisCache.set(cacheKey, result);
  console.log(`[analysis] generated commentary for ${area} (${commentary.length} chars)`);
  return result;
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

// ---------------------------------------------------------------------------
// Dataset state — rebuilt on boot and on each scheduled/manual refresh
// ---------------------------------------------------------------------------

let state = { dataset: null, metadata: null, trends: null };

async function rebuildDataset() {
  const csvText = await loadCsvText();
  const dataset = buildDataset(csvText);
  const metadata = buildMetadata(dataset);
  const trends = buildTrends(dataset);
  analysisCache.clear();
  state = { dataset, metadata, trends };
  console.log(
    `[data] rebuilt — ${dataset.cleanRows.toLocaleString()} rows, ` +
      `${metadata.areas.length} areas, ${metadata.projects.length} projects`,
  );
}

// ---------------------------------------------------------------------------
// Nightly scheduler — fires at midnight UAE time (UTC+4)
// ---------------------------------------------------------------------------

function scheduleNightlyRefresh() {
  const nowMs = Date.now();
  const uaeOffset = 4 * 60 * 60 * 1000;
  const nowUAE = new Date(nowMs + uaeOffset);
  const midnightUAE = new Date(nowUAE);
  midnightUAE.setUTCHours(20, 0, 0, 0); // 20:00 UTC = 00:00 UAE
  if (midnightUAE <= nowUAE) midnightUAE.setUTCDate(midnightUAE.getUTCDate() + 1);
  const msUntil = midnightUAE - nowUAE;
  console.log(`[refresh] next nightly reload in ${(msUntil / 3_600_000).toFixed(1)}h`);
  setTimeout(async () => {
    console.log('[refresh] nightly reload starting…');
    try {
      await rebuildDataset();
      console.log('[refresh] nightly reload complete');
    } catch (err) {
      console.error('[refresh] nightly reload failed:', err.message);
    }
    scheduleNightlyRefresh();
  }, msUntil);
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

async function start() {
  await rebuildDataset();
  scheduleNightlyRefresh();

  const server = http.createServer(async (req, res) => {
    const { dataset, metadata, trends } = state;
    try {
      if (req.url === '/healthz') {
        return send(res, 200, { ok: true, rows: dataset.cleanRows, aiEnabled: !!anthropic });
      }

      // Manual refresh webhook — POST /api/refresh?token=SECRET
      if (req.method === 'POST' && req.url.startsWith('/api/refresh')) {
        const token = new URL(req.url, 'http://x').searchParams.get('token');
        const secret = process.env.REFRESH_SECRET;
        if (!secret || token !== secret) return send(res, 401, { error: 'unauthorized' });
        console.log('[refresh] manual webhook triggered');
        await rebuildDataset();
        return send(res, 200, { ok: true, rows: state.dataset.cleanRows });
      }

      if (req.method === 'GET' && req.url === '/api/metadata') {
        return send(res, 200, metadata);
      }
      if (req.method === 'GET' && req.url === '/api/trends') {
        return send(res, 200, trends);
      }
      if (req.method === 'GET' && req.url.startsWith('/api/analysis')) {
        const qs = new URL(req.url, 'http://x').searchParams;
        const area = qs.get('area') || '';
        if (!area) return send(res, 400, { error: 'area parameter required' });
        const areaKey = [...dataset.byArea.keys()].find((k) => norm(k) === norm(area)) || area;
        const result = await getAnalysis(dataset, areaKey);
        return send(res, 200, result);
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
  });
}

start().catch((err) => {
  console.error('[boot] failed:', err.message);
  process.exit(1);
});
