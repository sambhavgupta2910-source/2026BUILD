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

// Serverless (Vercel) support: the filesystem is read-only except /tmp, and a
// preview with no data source configured boots on the bundled synthetic set.
const IS_SERVERLESS = !!process.env.VERCEL;
const CACHE_DIR = process.env.CACHE_DIR || (IS_SERVERLESS ? '/tmp/prism-cache' : path.join(__dirname, '.cache'));
if (IS_SERVERLESS && !process.env.TRANSACTIONS_CSV && !process.env.TRANSACTIONS_URL && !process.env.DUBAI_PULSE_API_URL) {
  const demoCsv = path.join(__dirname, 'transactions-dev.csv');
  if (fs.existsSync(demoCsv)) process.env.TRANSACTIONS_CSV = demoCsv;
}
// Synthetic demo data must never read as real market figures — the UI shows a
// ribbon whenever this is true (see /api/config).
const DEMO_DATA = (process.env.TRANSACTIONS_CSV || '').includes('transactions-dev');

const PORT = Number(process.env.PORT || 4173);
const SQM_TO_SQFT = 10.764;
const XAI_API_KEY = process.env.XAI_API_KEY || null;
const AGENT_WHATSAPP = (process.env.AGENT_WHATSAPP || '').replace(/\D/g, '');
const CRM_TOKEN = process.env.CRM_TOKEN || '';
const analysisCache = new Map();

const DEFAULT_DRIVE_FILE_ID = '1mo0YAYfbBMguqk1qQ4E2XT06rxuJWzCa';
const DEFAULT_URL = `https://drive.google.com/uc?export=download&id=${DEFAULT_DRIVE_FILE_ID}`;

// ---------------------------------------------------------------------------
// Lead store — file-backed JSON so the agent CRM survives restarts. Kept out
// of git (.data/ is gitignored). Holds seller/buyer leads + their valuation
// snapshot and a status pipeline the agent can advance.
// ---------------------------------------------------------------------------

const DATA_DIR = process.env.DATA_DIR || (IS_SERVERLESS ? '/tmp/prism-data' : path.join(__dirname, '.data'));
const LEADS_PATH = path.join(DATA_DIR, 'leads.json');

// CRM pipeline stages (mirror the mandate workflow: capture → mandate → close)
const LEAD_STAGES = [
  'new', 'qualified', 'valuation_sent', 'consultation',
  'mandate', 'listed', 'closed', 'lost',
];

function readLeads() {
  try {
    return JSON.parse(fs.readFileSync(LEADS_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeLeads(leads) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(LEADS_PATH, JSON.stringify(leads, null, 2));
}

function recordLead(rec) {
  const leads = readLeads();
  const ts = new Date().toISOString();
  const id = 'L-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  const lead = {
    id,
    ts,
    status: 'new',
    name: (rec.name || '').toString().slice(0, 120),
    phone: (rec.phone || '').toString().slice(0, 40),
    email: (rec.email || '').toString().slice(0, 160),
    intent: (rec.intent || '').toString().slice(0, 40),
    source: (rec.source || 'website').toString().slice(0, 60),
    agency: (rec.agency || '').toString().slice(0, 160),
    brn: (rec.brn || '').toString().slice(0, 40),
    area: (rec.area || '').toString().slice(0, 120),
    project: (rec.project || '').toString().slice(0, 160),
    rooms: (rec.rooms || '').toString().slice(0, 40),
    sizeSqft: Number.isFinite(rec.sizeSqft) ? Math.round(rec.sizeSqft) : null,
    askingPrice: Number.isFinite(rec.askingPrice) ? Math.round(rec.askingPrice) : null,
    message: (rec.message || '').toString().slice(0, 600),
    valuation: rec.valuation && typeof rec.valuation === 'object' ? rec.valuation : null,
    notes: [],
    history: [{ ts, status: 'new' }],
  };
  leads.push(lead);
  writeLeads(leads);
  return lead;
}

function crmAuthorized(req) {
  if (!CRM_TOKEN) return true; // open on local/dev when no token configured
  const token = new URL(req.url, 'http://x').searchParams.get('token');
  return token === CRM_TOKEN;
}

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
  if (!XAI_API_KEY) return { commentary: null, reason: 'XAI_API_KEY not configured' };
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

  const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${XAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'grok-3-mini',
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content:
            'You are a senior Dubai real estate analyst writing for professional advisors on the PRISM platform. ' +
            'Write exactly 3-4 sentences of concise, data-driven market commentary. ' +
            'Be specific: cite the AED/sqft figures, transaction counts, and percentage changes from the data. ' +
            'Cover: (1) overall price level and recent trend direction, (2) what the off-plan share signals about buyer composition, ' +
            '(3) one sharp, actionable insight about this sub-market. No filler. ' +
            'Calibrate your confidence to the sample size you are given: if total residential sales for this area is under 30, ' +
            'say so plainly and frame the read as directional rather than definitive; if it is under 10, lead with that limitation. ' +
            'Do not present a thin sample as a settled market view.',
        },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!xaiRes.ok) {
    const err = await xaiRes.text().catch(() => '');
    console.error(`[analysis] xAI error ${xaiRes.status}:`, err.slice(0, 200));
    return { commentary: null, reason: `xAI error ${xaiRes.status}` };
  }

  const xaiData = await xaiRes.json();
  const commentary = xaiData.choices?.[0]?.message?.content?.trim() || '';
  const result = { commentary, dataSnapshot: ctx };
  analysisCache.set(cacheKey, result);
  console.log(`[analysis] generated commentary for ${area} via Grok (${commentary.length} chars)`);
  return result;
}

// ---------------------------------------------------------------------------
// Deal check — DLD comp scoring + AI analyst note + social post
// ---------------------------------------------------------------------------

async function getDealCheck(dataset, body) {
  const listPrice = toNumber(body.price);
  if (!Number.isFinite(listPrice) || listPrice <= 0) {
    return { error: 'price must be a positive number' };
  }

  const val = hybridValuation(dataset, {
    area: body.area || '',
    project: body.project || '',
    size: body.size,
    sizeUnit: body.sizeUnit || 'sqft',
    rooms: body.rooms || '',
    propertySubtype: body.propertySubtype || '',
  });
  if (val.error) return { error: val.error };

  const fairValue = Math.round(val.baseValue);
  const discountPct = ((listPrice - fairValue) / fairValue) * 100;
  const verdict = discountPct <= -8 ? 'Strong Buy' : discountPct <= 5 ? 'Fair Value' : 'Overpriced';

  const base = {
    verdict,
    discountPct: Math.round(discountPct * 10) / 10,
    fairValue,
    dldMedianPsf: Math.round(val.basePsf),
    askingPsf: Math.round(listPrice / val.sizeSqft),
    lowPsf: Math.round(val.lowPsf),
    highPsf: Math.round(val.highPsf),
    sizeSqft: Math.round(val.sizeSqft),
    compCount: val.compCount,
    confidence: val.confidence,
    fallback: val.fallback,
    resolvedArea: val.resolvedArea,
    resolvedProject: val.resolvedProject,
    comparables: val.comparables,
    engine: val.engine,
    effectiveComps: val.effectiveComps,
    dispersionPct: val.dispersionPct,
    sizeAdjustment: val.sizeAdjustment,
  };

  if (!XAI_API_KEY) return { ...base, analystNote: null, socialPost: null };

  const projectLabel = (val.resolvedProject || body.project || val.resolvedArea || body.area || '').trim();
  const userContent =
    `Property: ${projectLabel}, ${val.resolvedArea || body.area}\n` +
    `Rooms: ${body.rooms || 'not specified'}\n` +
    `Size: ${Math.round(val.sizeSqft)} sqft\n` +
    `List price: AED ${listPrice.toLocaleString()}\n` +
    `DLD fair value: AED ${fairValue.toLocaleString()} (${Math.round(val.basePsf).toLocaleString()} AED/sqft median)\n` +
    `Comparables: ${val.compCount} transactions (${val.confidence} confidence — ${val.fallback.label})\n` +
    `Verdict: ${verdict} (${discountPct > 0 ? '+' : ''}${Math.round(discountPct * 10) / 10}% vs DLD median)`;

  const confidenceInstruction =
    val.confidence === 'High'
      ? 'Confidence is High and the comparable basis is narrow (matched on area, project and rooms) — you can state the fair value plainly.'
      : val.confidence === 'Medium'
        ? 'Confidence is Medium — state the fair value but note in one clause that it is based on a widened comparable set (' + val.fallback.label.toLowerCase() + ').'
        : 'Confidence is ' + val.confidence + ' and the comparable basis is broad (' + val.fallback.label.toLowerCase() + ', ' + val.compCount + ' comps) — explicitly flag that this estimate rests on a limited or widened comparable set and should be treated as a starting point, not a precise number.';

  try {
    const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 450,
        messages: [
          {
            role: 'system',
            content:
              'You are Sambhav Gupta, Senior Investment Analyst at Sobha Realty Dubai. ' +
              'Return ONLY valid JSON with two keys: ' +
              '"analystNote" (3-4 sentences, data-backed, cite AED figures and % gap, actionable investment framing) and ' +
              '"socialPost" (≤60 words, punchy hook + key stat + verdict + CTA, ready to paste on LinkedIn or Instagram). ' +
              confidenceInstruction +
              ' Reflect that calibration naturally in both fields — do not bolt on a generic disclaimer, and do not undercut the verdict if confidence is High.',
          },
          { role: 'user', content: userContent },
        ],
      }),
    });

    if (!xaiRes.ok) return { ...base, analystNote: null, socialPost: null };

    const xaiData = await xaiRes.json();
    const raw = (xaiData.choices?.[0]?.message?.content || '{}').trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr);
    console.log(`[deal-check] ${verdict} — ${projectLabel} (${Math.round(discountPct * 10) / 10}%)`);
    return { ...base, analystNote: parsed.analystNote || null, socialPost: parsed.socialPost || null };
  } catch (err) {
    console.error('[deal-check]', err.message);
    return { ...base, analystNote: null, socialPost: null };
  }
}

// ---------------------------------------------------------------------------
// Seller valuation — fair value + listing-price guidance grounded in the
// comparable band, a liquidity read from recent area activity, and (optional)
// an AI seller note calibrated to the same confidence the engine computes.
// ---------------------------------------------------------------------------

function recentActivity(dataset, areaKey, days = 90) {
  const rows = dataset.byArea.get(areaKey) || [];
  if (!rows.length || !dataset.dateMax) return { recent: 0, total: rows.length };
  const cutoff = new Date(dataset.dateMax + 'T00:00:00Z');
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = rows.filter((r) => r.date >= cutoffStr).length;
  return { recent, total: rows.length };
}

async function getSellerValuation(dataset, body) {
  const val = hybridValuation(dataset, {
    area: body.area || '',
    project: body.project || '',
    size: body.size,
    sizeUnit: body.sizeUnit || 'sqft',
    rooms: body.rooms || '',
    propertySubtype: body.propertySubtype || '',
  });
  if (val.error) return { error: val.error };

  const fairValue = Math.round(val.baseValue);
  // Listing guidance stays grounded in the comparable band (P25–P75) — not
  // invented multipliers: lower band = priced to move, median = fair value,
  // upper band = maximise (longer expected time on market).
  const quickSale = Math.round(val.lowValue);
  const ambitious = Math.round(val.highValue);

  // Liquidity read from recent comparable activity in the area
  const { recent } = recentActivity(dataset, val.resolvedArea, 90);
  const liquidity = recent >= 40 ? 'Fast' : recent >= 12 ? 'Normal' : 'Thin';

  // Optional: seller already has a price in mind — score it vs the evidence
  const target = toNumber(body.targetPrice);
  let targetVerdict = null;
  if (Number.isFinite(target) && target > 0) {
    const gap = ((target - fairValue) / fairValue) * 100;
    targetVerdict = {
      targetPrice: Math.round(target),
      gapPct: Math.round(gap * 10) / 10,
      label:
        gap > 8 ? 'Above the comparable evidence — expect a longer time on market'
        : gap < -8 ? 'Below the comparable evidence — likely a fast sale, but money may be left on the table'
        : 'In line with the comparable evidence',
    };
  }

  const base = {
    fairValue,
    fairPsf: Math.round(val.basePsf),
    lowValue: quickSale,
    highValue: ambitious,
    lowPsf: Math.round(val.lowPsf),
    highPsf: Math.round(val.highPsf),
    sizeSqft: Math.round(val.sizeSqft),
    listingGuidance: { quickSale, market: fairValue, ambitious },
    liquidity,
    recentComps: recent,
    engine: val.engine,
    effectiveComps: val.effectiveComps,
    dispersionPct: val.dispersionPct,
    sizeAdjustment: val.sizeAdjustment,
    compCount: val.compCount,
    confidence: val.confidence,
    fallback: val.fallback,
    resolvedArea: val.resolvedArea,
    resolvedProject: val.resolvedProject,
    comparables: val.comparables,
    targetVerdict,
  };

  if (!XAI_API_KEY) return { ...base, sellerNote: null };

  const projectLabel = (val.resolvedProject || body.project || val.resolvedArea || body.area || '').trim();
  const userContent =
    `Seller's property: ${projectLabel}, ${val.resolvedArea || body.area}\n` +
    `Rooms: ${body.rooms || 'not specified'} | Size: ${Math.round(val.sizeSqft)} sqft\n` +
    `DLD fair value: AED ${fairValue.toLocaleString()} (${Math.round(val.basePsf).toLocaleString()} AED/sqft median)\n` +
    `Comparable band: AED ${quickSale.toLocaleString()} – ${ambitious.toLocaleString()}\n` +
    `Comparables: ${val.compCount} (${val.confidence} confidence — ${val.fallback.label})\n` +
    `Recent area sales (90d): ${recent} (${liquidity} liquidity)` +
    (targetVerdict ? `\nSeller's target: AED ${targetVerdict.targetPrice.toLocaleString()} (${targetVerdict.gapPct > 0 ? '+' : ''}${targetVerdict.gapPct}% vs fair value)` : '');

  const confidenceInstruction =
    val.confidence === 'High'
      ? 'Confidence is High (matched on area, project and rooms) — you can state the recommended listing price plainly.'
      : val.confidence === 'Medium'
        ? 'Confidence is Medium — give the listing range but note in one clause it rests on a widened comparable set (' + val.fallback.label.toLowerCase() + ').'
        : 'Confidence is ' + val.confidence + ' and the comparable basis is broad (' + val.fallback.label.toLowerCase() + ', ' + val.compCount + ' comps) — frame this as a directional starting range to refine on a call, not a precise number.';

  try {
    const xaiRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 320,
        messages: [
          {
            role: 'system',
            content:
              'You are Sambhav Gupta, a Dubai resale advisor at Elevate Homes, writing directly to a homeowner who just valued their property. ' +
              'Write 3-4 sentences: what the DLD comparables say their property is worth, a clear listing-price recommendation, and what the recent sales pace means for how fast it could sell. ' +
              'Warm, direct, no hype, no generic disclaimers. End by inviting them to book a pricing call. ' +
              confidenceInstruction,
          },
          { role: 'user', content: userContent },
        ],
      }),
    });
    if (!xaiRes.ok) return { ...base, sellerNote: null };
    const xaiData = await xaiRes.json();
    const sellerNote = xaiData.choices?.[0]?.message?.content?.trim() || null;
    console.log(`[seller-valuation] ${projectLabel} — AED ${fairValue.toLocaleString()} (${val.confidence})`);
    return { ...base, sellerNote };
  } catch (err) {
    console.error('[seller-valuation]', err.message);
    return { ...base, sellerNote: null };
  }
}

// ---------------------------------------------------------------------------
// Higgsfield video — submit job, poll via /api/video-status
// ---------------------------------------------------------------------------

async function startHiggsfieldVideo(videoPrompt) {
  const apiKey = process.env.HIGGSFIELD_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://platform.higgsfield.ai/v1/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: videoPrompt, aspect_ratio: '9:16', resolution: '720p', duration: 5 }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('[higgsfield] submit error:', err.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const requestId = data.request_id || data.id;
    if (requestId) console.log(`[higgsfield] video job submitted: ${requestId}`);
    return requestId || null;
  } catch (err) {
    console.error('[higgsfield] submit failed:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Content draft — multi-platform social content from DLD insight + Higgsfield
// ---------------------------------------------------------------------------

async function getContentDraft(dataset, topic) {
  if (!XAI_API_KEY) return { error: 'XAI_API_KEY not configured' };

  // Find matching area data for richer context
  const topicNorm = norm(topic);
  let areaStats = null;
  for (const [area, rows] of dataset.byArea.entries()) {
    if (norm(area).includes(topicNorm.split(' ')[0]) || topicNorm.includes(norm(area))) {
      const offplanCount = rows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;
      const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : 1));
      const half = Math.floor(sorted.length / 2);
      const firstMed = median(sorted.slice(0, half).map((r) => r.aedPerSqft));
      const lastMed = median(sorted.slice(half).map((r) => r.aedPerSqft));
      const trend = firstMed > 0 ? ((lastMed - firstMed) / firstMed) * 100 : 0;
      areaStats = {
        area,
        transactions: rows.length,
        medianPsf: Math.round(median(rows.map((r) => r.aedPerSqft))),
        offplanPct: Math.round((offplanCount / rows.length) * 100),
        trend: Math.round(trend * 10) / 10,
        dateRange: `${(dataset.dateMin || '').slice(0, 10)} to ${(dataset.dateMax || '').slice(0, 10)}`,
      };
      break;
    }
  }

  const dataContext = areaStats
    ? `DLD data: ${areaStats.area} — ${areaStats.transactions.toLocaleString()} residential sales, ` +
      `median ${areaStats.medianPsf.toLocaleString()} AED/sqft, ${areaStats.offplanPct}% off-plan, ` +
      `trend ${areaStats.trend > 0 ? '+' : ''}${areaStats.trend}%, range ${areaStats.dateRange}`
    : `Topic: ${topic} (no DLD area data matched — use general Dubai real estate market knowledge)`;

  const prompt =
    `Content topic: "${topic}"\n${dataContext}\n\n` +
    `Return ONLY valid JSON with these exact keys:\n` +
    `{\n` +
    `  "linkedin": "200-word analyst post. First line is a strong data hook — not 'I am excited'. ` +
    `2-3 real data insights. End with one sharp question to drive comments.",\n` +
    `  "x_thread": ["Tweet 1: hook ≤280 chars", "Tweet 2: key data/insight ≤280 chars", "Tweet 3: takeaway + follow CTA ≤280 chars"],\n` +
    `  "ig_caption": "Punchy caption ≤60 words with line breaks. End with 20 Dubai real estate hashtags.",\n` +
    `  "yt_script": "60-second spoken script. Hook in first 3 seconds. Data point. Insight. CTA at end.",\n` +
    `  "video_prompt": "Cinematic AI video prompt. Specific Dubai location, time of day, camera movement, mood. ≤25 words."\n` +
    `}`;

  try {
    const grokRes = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${XAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'grok-3-mini',
        max_tokens: 1400,
        messages: [
          {
            role: 'system',
            content:
              'You are Sambhav Gupta, Senior Investment Analyst at Sobha Realty Dubai with 4,119 LinkedIn followers. ' +
              'Write in a confident, data-backed, founder-analyst voice. No buzzwords, no clichés. ' +
              'Return ONLY valid JSON — no markdown fences, no commentary outside the JSON.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!grokRes.ok) {
      const err = await grokRes.text().catch(() => '');
      console.error('[content-draft] Grok error:', err.slice(0, 200));
      return { error: `Grok error ${grokRes.status}` };
    }

    const grokData = await grokRes.json();
    const raw = (grokData.choices?.[0]?.message?.content || '{}').trim();
    const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(jsonStr);

    console.log(`[content-draft] generated for topic: ${topic}`);

    const result = {
      topic,
      areaStats,
      linkedin: parsed.linkedin || null,
      x_thread: parsed.x_thread || null,
      ig_caption: parsed.ig_caption || null,
      yt_script: parsed.yt_script || null,
      video_prompt: parsed.video_prompt || null,
      video_job_id: null,
    };

    // Start Higgsfield video in background — client polls /api/video-status?id=...
    if (parsed.video_prompt) {
      result.video_job_id = await startHiggsfieldVideo(parsed.video_prompt);
    }

    return result;
  } catch (err) {
    console.error('[content-draft]', err.message);
    return { error: err.message };
  }
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
  // An unrecognized area has no comparables to widen from — never fall back to
  // the whole national dataset, since that would silently mislabel a market-wide
  // average as an "Area only" estimate for a place we have no data on.
  const candidates = dataset.byArea.get(query.area);
  if (!candidates) return { step: null, matches: [] };
  for (const step of FALLBACK_LADDER) {
    const matches = candidates.filter((r) => step.match(r, query));
    if (matches.length >= MIN_COMPS) return { step, matches };
  }
  // Worst case within a known area: return everything in that area, even if thin
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
  if (!step || !matches.length) {
    return { error: `No comparable transactions found for area "${body.area}". Check the spelling or pick a recognized Dubai area.` };
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
// PRISM hybrid valuation engine (prism-hybrid-v1)
//
// Builds on the same comparable selection + fallback ladder as valuation(),
// then refines the estimate the way the notebook hedonic model does:
//   1. Log-size adjustment — each comp's AED/sqft is adjusted toward the
//      subject size using elasticity 0.2733 (larger units carry lower psf).
//   2. Recency weighting — recent sales count more (180-day half-life).
//   3. Size-proximity weighting — closer-sized comps count more.
//   4. Same-project boost — exact-project comps weighted higher.
// It also reports confidence diagnostics: effective_comps (Kish effective
// sample size), dispersion_pct (IQR / median of adjusted psf), and
// size_adjustment (net % the hybrid fair value moved vs the naive median).
// Returns a superset of valuation()'s shape so callers change minimally.
// ---------------------------------------------------------------------------

const SIZE_ELASTICITY = 0.2733;       // from the notebook log-size regression
const RECENCY_HALFLIFE_DAYS = 180;    // recency weight half-life

function hybridValuation(dataset, body) {
  const sizeRaw = toNumber(body.size);
  if (!Number.isFinite(sizeRaw) || sizeRaw <= 0) {
    return { error: 'Size must be a positive number.' };
  }
  const sizeSqft = body.sizeUnit === 'sqm' ? sizeRaw * SQM_TO_SQFT : sizeRaw;

  const areaKey = [...dataset.byArea.keys()].find((k) => norm(k) === norm(body.area)) || body.area;
  const projectKey = body.project
    ? [...dataset.byProject.keys()].find((k) => norm(k) === norm(body.project)) || body.project
    : '';

  const query = {
    area: areaKey, project: projectKey,
    rooms: body.rooms || '', propertyType: body.propertyType || '',
    propertySubtype: body.propertySubtype || '', sizeSqft,
  };

  const { step, matches } = pickComparables(dataset, query);
  if (!step || !matches.length) {
    return { error: `No comparable transactions found for area "${body.area}". Check the spelling or pick a recognized Dubai area.` };
  }

  const dateMaxMs = dataset.dateMax ? new Date(dataset.dateMax + 'T00:00:00Z').getTime() : Date.now();

  const scored = matches.map((r) => {
    const sizeRatio = r.areaSqft > 0 ? r.areaSqft / sizeSqft : 1;
    const adjPsf = r.aedPerSqft * Math.pow(sizeRatio, SIZE_ELASTICITY);
    const ageDays = r.date ? Math.max(0, (dateMaxMs - new Date(r.date + 'T00:00:00Z').getTime()) / 86400000) : 365;
    const wRecency = Math.exp(-ageDays / RECENCY_HALFLIFE_DAYS);
    const wSize = Math.exp(-2 * Math.abs(Math.log((r.areaSqft || sizeSqft) / sizeSqft)));
    const boost = projectKey && norm(r.project) === norm(projectKey) ? 1.5 : 1;
    return { r, adjPsf, weight: wRecency * wSize * boost };
  });

  const totW = scored.reduce((s, x) => s + x.weight, 0) || 1;
  const fairPsf = scored.reduce((s, x) => s + x.adjPsf * x.weight, 0) / totW;
  const adjPsfs = scored.map((x) => x.adjPsf);
  const lowPsf = percentile(adjPsfs, 0.25);
  const highPsf = percentile(adjPsfs, 0.75);
  const medAdj = median(adjPsfs);
  const dispersionPct = medAdj > 0 ? ((highPsf - lowPsf) / medAdj) * 100 : 0;
  const sumW2 = scored.reduce((s, x) => s + x.weight * x.weight, 0) || 1;
  const effectiveComps = Math.max(1, Math.round((totW * totW) / sumW2));
  const rawMedianPsf = median(matches.map((r) => r.aedPerSqft));
  const sizeAdjustment = rawMedianPsf > 0 ? ((fairPsf - rawMedianPsf) / rawMedianPsf) * 100 : 0;

  const comparables = [...scored]
    .sort((a, b) => (a.r.date < b.r.date ? 1 : -1))
    .slice(0, 25)
    .map((x) => ({
      date: x.r.date, area: x.r.area, project: x.r.project, rooms: x.r.rooms,
      sizeSqft: x.r.areaSqft, transValue: x.r.transValue,
      aedPerSqft: x.r.aedPerSqft, adjusted: Math.round(x.adjPsf),
    }));

  return {
    engine: 'prism-hybrid-v1',
    basePsf: fairPsf, lowPsf, highPsf,
    baseValue: fairPsf * sizeSqft, lowValue: lowPsf * sizeSqft, highValue: highPsf * sizeSqft,
    sizeSqft,
    compCount: matches.length,
    effectiveComps,
    dispersionPct: Math.round(dispersionPct * 10) / 10,
    sizeAdjustment: Math.round(sizeAdjustment * 10) / 10,
    confidence: confidenceLabel(step, matches.length),
    fallback: { id: step.id, label: step.label },
    resolvedArea: areaKey, resolvedProject: projectKey,
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
  let filePath = path.join(PUBLIC_DIR, pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'forbidden' });
  // Clean URLs: /sell, /crm, /report → their .html files when no extension given
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath += '.html';
  }
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

// Optional DLD projects registry (developer, status, % complete) — written by
// `scripts/fetch-ddads.js pull-projects` once the dld_projects dataset is
// granted. Merged into /api/projects when present; absent file is fine.
let projectRegistry = new Map();
function loadProjectRegistry() {
  try {
    const p = path.join(__dirname, 'projects-dld.json');
    if (!fs.existsSync(p)) return;
    const arr = JSON.parse(fs.readFileSync(p, 'utf8'));
    projectRegistry = new Map(arr.map((r) => [String(r.name || '').trim().toUpperCase(), r]));
    console.log(`[registry] loaded ${projectRegistry.size} DLD-registered projects`);
  } catch (err) {
    console.warn('[registry] could not load projects-dld.json:', err.message);
  }
}

async function start() {
  await rebuildDataset();
  loadProjectRegistry();
  scheduleNightlyRefresh();

  const server = http.createServer(async (req, res) => {
    const { dataset, metadata, trends } = state;
    try {
      if (req.url === '/healthz') {
        return send(res, 200, { ok: true, rows: dataset.cleanRows, aiEnabled: !!XAI_API_KEY });
      }

      // Public config — agent WhatsApp number for lead redirect
      if (req.url === '/api/config') {
        return send(res, 200, { agentWhatsapp: AGENT_WHATSAPP, demoData: DEMO_DATA });
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

      if (req.method === 'GET' && req.url === '/api/engine') {
        return send(res, 200, {
          engine: 'prism-hybrid-v1',
          rows: dataset.cleanRows,
          dateMax: dataset.dateMax,
          sizeElasticity: SIZE_ELASTICITY,
          recencyHalflifeDays: RECENCY_HALFLIFE_DAYS,
        });
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

      // Weekly smart-money trends — last 7 days relative to dataset's max date
      if (req.method === 'GET' && req.url === '/api/weekly-trends') {
        const rows = dataset.rows;
        const dateMax = dataset.dateMax || '';
        const d = new Date(dateMax + 'T00:00:00Z');
        const weekStart = new Date(d); weekStart.setUTCDate(weekStart.getUTCDate() - 6);
        const priorStart = new Date(weekStart); priorStart.setUTCDate(priorStart.getUTCDate() - 30);
        const weekStartStr  = weekStart.toISOString().slice(0, 10);
        const priorStartStr = priorStart.toISOString().slice(0, 10);

        const weekRows  = rows.filter((r) => r.date >= weekStartStr && r.date <= dateMax);
        const priorRows = rows.filter((r) => r.date >= priorStartStr && r.date < weekStartStr);

        const weekVolume    = weekRows.reduce((s, r) => s + r.transValue, 0);
        const weekPsfs      = weekRows.map((r) => r.aedPerSqft);
        const weekOffplan   = weekRows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;

        // Area breakdown
        const byAreaW = new Map(); const byAreaP = new Map();
        const accum = (map, r) => {
          const k = r.area; if (!k) return;
          if (!map.has(k)) map.set(k, { count: 0, psfs: [], volume: 0, offplan: 0 });
          const b = map.get(k); b.count++; b.psfs.push(r.aedPerSqft); b.volume += r.transValue;
          if ((r.offplan || '').toLowerCase().includes('off')) b.offplan++;
        };
        weekRows.forEach((r) => accum(byAreaW, r));
        priorRows.forEach((r) => accum(byAreaP, r));

        // Volume movers — % change vs 30-day daily average scaled to 7 days
        const volumeMovers = [...byAreaW.entries()]
          .filter(([, w]) => w.count >= 3)
          .map(([area, w]) => {
            const p = byAreaP.get(area);
            const priorWeekEq = p ? (p.count / 30) * 7 : 0;
            const pct = priorWeekEq > 0 ? Math.round(((w.count - priorWeekEq) / priorWeekEq) * 100) : 999;
            return { area, weekCount: w.count, priorWeekEq: Math.round(priorWeekEq * 10) / 10, pctChange: pct, medianPsf: Math.round(median(w.psfs)), volume: Math.round(w.volume) };
          })
          .filter((a) => a.pctChange > 5)
          .sort((a, b) => b.pctChange - a.pctChange)
          .slice(0, 8);

        // PSF movers — week median vs prior 30-day median
        const psfMovers = [...byAreaW.entries()]
          .filter(([area, w]) => w.count >= 3 && byAreaP.has(area))
          .map(([area, w]) => {
            const p = byAreaP.get(area);
            const wPsf = median(w.psfs); const pPsf = median(p.psfs);
            const pct = pPsf > 0 ? ((wPsf - pPsf) / pPsf) * 100 : 0;
            return { area, weekPsf: Math.round(wPsf), priorPsf: Math.round(pPsf), pctChange: Math.round(pct * 10) / 10 };
          })
          .filter((a) => Math.abs(a.pctChange) >= 1)
          .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange))
          .slice(0, 8);

        // Off-plan surge areas (≥70% of week's transactions off-plan)
        const offplanSurge = [...byAreaW.entries()]
          .filter(([, b]) => b.count >= 3)
          .map(([area, b]) => ({ area, offplanPct: Math.round((b.offplan / b.count) * 100), count: b.count }))
          .filter((a) => a.offplanPct >= 70)
          .sort((a, b) => b.offplanPct - a.offplanPct)
          .slice(0, 6);

        return send(res, 200, {
          dateRange: { from: weekStartStr, to: dateMax },
          summary: { count: weekRows.length, volume: Math.round(weekVolume), medianPsf: Math.round(median(weekPsfs)), offplanPct: weekRows.length ? Math.round((weekOffplan / weekRows.length) * 100) : 0 },
          volumeMovers,
          psfMovers,
          offplanSurge,
        });
      }

      // Off-plan launches by developer — keyword match on project/masterProject names
      if (req.method === 'GET' && req.url === '/api/developer-launches') {
        const DEVS = {
          'Emaar':      ['EMAAR','DOWNTOWN DUBAI','ARABIAN RANCHES','EMAAR SOUTH','EMAAR BEACHFRONT','DUBAI HILLS ESTATE','THE VALLEY','EMAAR CREEK'],
          'Damac':      ['DAMAC'],
          'Sobha':      ['SOBHA'],
          'Binghatti':  ['BINGHATTI'],
          'Nakheel':    ['NAKHEEL','PALM JUMEIRAH','JUMEIRAH ISLANDS','JUMEIRAH VILLAGE','THE WORLD ISLANDS','PALM JEBEL'],
          'Meraas':     ['MERAAS','BLUEWATERS','CITY WALK','LA MER','PORT DE LA MER','JUMEIRAH BAY'],
          'Ellington':  ['ELLINGTON'],
          'Danube':     ['DANUBE'],
          'Azizi':      ['AZIZI'],
          'Aldar':      ['ALDAR'],
          'Reportage':  ['REPORTAGE'],
          'Object1':    ['OBJECT 1','OBJECT1'],
          'Mag':        [' MAG ','MAG 5','MAG 318','MAG CITY'],
          'Imtiaz':     ['IMTIAZ'],
          'Select':     ['SELECT GROUP'],
        };

        const matchDev = (r) => {
          const hay = ((r.project || '') + ' ' + (r.masterProject || '')).toUpperCase();
          for (const [dev, keys] of Object.entries(DEVS)) {
            if (keys.some((k) => hay.includes(k))) return dev;
          }
          return null;
        };

        // Only off-plan rows
        const opRows = dataset.rows.filter((r) => (r.offplan || '').toLowerCase().includes('off'));

        // Group by developer → project
        const byDev = new Map();
        for (const r of opRows) {
          const dev = matchDev(r);
          if (!dev) continue;
          if (!byDev.has(dev)) byDev.set(dev, new Map());
          const devMap = byDev.get(dev);
          const proj = r.project || r.masterProject || 'Unknown';
          if (!devMap.has(proj)) devMap.set(proj, { count: 0, psfs: [], dates: [], area: r.area, masterProject: r.masterProject });
          const b = devMap.get(proj);
          b.count++; b.psfs.push(r.aedPerSqft); b.dates.push(r.date);
        }

        const cutoff90 = new Date(dataset.dateMax + 'T00:00:00Z');
        cutoff90.setUTCDate(cutoff90.getUTCDate() - 90);
        const cutoff90Str = cutoff90.toISOString().slice(0, 10);

        const developers = [...byDev.entries()].map(([dev, projMap]) => {
          const projects = [...projMap.entries()].map(([name, b]) => {
            const firstDate = b.dates.reduce((m, d) => (!m || d < m ? d : m), '');
            const lastDate  = b.dates.reduce((m, d) => (!m || d > m ? d : m), '');
            return {
              name, area: b.area, masterProject: b.masterProject,
              count: b.count,
              medianPsf: Math.round(median(b.psfs)),
              firstDate, lastDate,
              isNew: firstDate >= cutoff90Str,
            };
          }).sort((a, b) => b.lastDate.localeCompare(a.lastDate));

          const allPsfs = projects.flatMap((p) => Array(p.count).fill(p.medianPsf));
          const newCount = projects.filter((p) => p.isNew).length;
          return {
            developer: dev,
            totalOffplan: projects.reduce((s, p) => s + p.count, 0),
            projectCount: projects.length,
            newProjectCount: newCount,
            medianPsf: Math.round(median(allPsfs)),
            latestActivity: projects[0]?.lastDate || '',
            projects: projects.slice(0, 10),
          };
        }).sort((a, b) => b.totalOffplan - a.totalOffplan);

        return send(res, 200, { developers, dateMax: dataset.dateMax });
      }

      // Communities (master projects) with stats — for the landing page
      if (req.method === 'GET' && req.url.startsWith('/api/communities')) {
        const qs = new URL(req.url, 'http://x').searchParams;
        const limit = Math.min(100, Math.max(1, parseInt(qs.get('limit') || '20', 10)));
        const byCommunity = new Map();
        for (const r of dataset.rows) {
          const c = r.masterProject;
          if (!c) continue;
          if (!byCommunity.has(c)) byCommunity.set(c, { count: 0, psfs: [], areas: new Set() });
          const b = byCommunity.get(c);
          b.count++;
          b.psfs.push(r.aedPerSqft);
          b.areas.add(r.area);
        }
        const communities = [...byCommunity.entries()]
          .map(([name, b]) => ({
            name,
            count: b.count,
            medianPsf: Math.round(median(b.psfs)),
            areaCount: b.areas.size,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, limit);
        return send(res, 200, { communities, total: byCommunity.size });
      }

      // Project aggregates — powers the "Visualise Dubai" map. Groups the
      // registered sales by project and returns per-project stats, so every
      // marker on the map is backed by real DLD registry activity.
      if (req.method === 'GET' && req.url.startsWith('/api/projects')) {
        const qs = new URL(req.url, 'http://x').searchParams;
        const offplanOnly = (qs.get('offplan') || '') === 'true';
        const limit = Math.min(200, Math.max(1, parseInt(qs.get('limit') || '90', 10)));

        const byProject = new Map();
        for (const r of dataset.rows) {
          if (!r.project) continue;
          if (offplanOnly && !(r.offplan || '').toLowerCase().includes('off')) continue;
          let b = byProject.get(r.project);
          if (!b) {
            b = { rows: [], area: r.area, community: r.masterProject };
            byProject.set(r.project, b);
          }
          b.rows.push(r);
        }

        const projects = [...byProject.entries()]
          .map(([name, b]) => {
            const psfs = b.rows.map((r) => r.aedPerSqft);
            const offCount = b.rows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;
            const latest = b.rows.reduce((m, r) => (r.date > m ? r.date : m), '');
            const reg = projectRegistry.get(name.trim().toUpperCase());
            return {
              name,
              area: b.area,
              community: b.community,
              sales: b.rows.length,
              medianPsf: Math.round(median(psfs)),
              medianPrice: Math.round(median(b.rows.map((r) => r.transValue))),
              offplanPct: Math.round((offCount / b.rows.length) * 100),
              lastSale: latest,
              developer: reg?.developer ?? null,
              status: reg?.status ?? null,
              percentComplete: reg?.percentComplete ?? null,
              registered: reg?.startDate ?? null,
            };
          })
          .sort((a, b) => b.sales - a.sales)
          .slice(0, limit);

        return send(res, 200, { total: byProject.size, projects });
      }

      // Paginated property listings — for the landing page
      if (req.method === 'GET' && req.url.startsWith('/api/properties')) {
        const qs = new URL(req.url, 'http://x').searchParams;
        const areaFilter = (qs.get('area') || '').trim();
        const communityFilter = (qs.get('community') || '').trim();
        const roomsFilter = (qs.get('rooms') || '').trim();
        const offplanFilter = (qs.get('offplan') || '').trim();
        const page = Math.max(1, parseInt(qs.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(qs.get('limit') || '25', 10)));
        const sort = qs.get('sort') || 'date';

        let rows = dataset.rows;
        if (areaFilter) rows = rows.filter((r) => norm(r.area) === norm(areaFilter));
        if (communityFilter) rows = rows.filter((r) => norm(r.masterProject) === norm(communityFilter));
        if (roomsFilter) rows = rows.filter((r) => r.rooms === roomsFilter);
        if (offplanFilter) rows = rows.filter((r) => (r.offplan || '').toLowerCase().includes(offplanFilter.toLowerCase()));

        const sorted = [...rows].sort((a, b) => {
          if (sort === 'psf_asc') return a.aedPerSqft - b.aedPerSqft;
          if (sort === 'psf_desc') return b.aedPerSqft - a.aedPerSqft;
          if (sort === 'price_asc') return a.transValue - b.transValue;
          if (sort === 'price_desc') return b.transValue - a.transValue;
          return (b.date || '').localeCompare(a.date || '');
        });

        const total = sorted.length;
        const results = sorted.slice((page - 1) * limit, page * limit).map((r) => ({
          project: r.project,
          community: r.masterProject,
          area: r.area,
          type: r.propertyType,
          rooms: r.rooms,
          sizeSqft: Math.round(r.areaSqft),
          transValue: Math.round(r.transValue),
          aedPerSqft: Math.round(r.aedPerSqft),
          date: r.date,
          offplan: r.offplan,
        }));
        return send(res, 200, { total, page, pages: Math.ceil(total / limit), limit, results });
      }

      // New DLD project registrations — projects first seen in the last N days of data
      if (req.method === 'GET' && req.url.startsWith('/api/new-launches')) {
        const qs = new URL(req.url, 'http://x').searchParams;
        const days = Math.min(60, Math.max(1, parseInt(qs.get('days') || '14', 10)));
        const dateMax = dataset.dateMax || '';
        const cutoff = new Date(dateMax + 'T00:00:00Z');
        cutoff.setUTCDate(cutoff.getUTCDate() - days);
        const cutoffStr = cutoff.toISOString().slice(0, 10);

        // For each project, find the very first date it appears in the dataset
        const projectFirst = new Map();
        for (const r of dataset.rows) {
          if (!r.project || !r.date) continue;
          const key = (r.project || '').trim().toUpperCase();
          if (!projectFirst.has(key) || r.date < projectFirst.get(key).firstDate) {
            projectFirst.set(key, { firstDate: r.date, area: r.area, masterProject: r.masterProject, project: r.project });
          }
        }

        // Projects whose first transaction falls inside our window = genuinely new
        const newProjects = [...projectFirst.values()]
          .filter((p) => p.firstDate >= cutoffStr)
          .sort((a, b) => b.firstDate.localeCompare(a.firstDate));

        // Enrich with stats
        const enriched = newProjects.slice(0, 20).map((p) => {
          const key = p.project.trim().toUpperCase();
          const rows = dataset.rows.filter((r) => (r.project || '').trim().toUpperCase() === key);
          const offplan = rows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;
          return {
            project: p.project,
            area: p.area,
            community: p.masterProject,
            firstSeen: p.firstDate,
            transactionCount: rows.length,
            medianPsf: Math.round(median(rows.map((r) => r.aedPerSqft))),
            offplanPct: rows.length ? Math.round((offplan / rows.length) * 100) : 0,
            daysAgo: Math.round((new Date(dateMax) - new Date(p.firstDate)) / 86400000),
          };
        });

        return send(res, 200, { newProjects: enriched, dateMax, cutoffDate: cutoffStr, days });
      }

      // Off-plan listings catalogue — reads from public/offplan-listings.json
      if (req.method === 'GET' && req.url.startsWith('/api/listings')) {
        const qs = new URL(req.url, 'http://x').searchParams;
        const devFilter = (qs.get('developer') || '').trim().toLowerCase();
        const featuredOnly = qs.get('featured') === 'true';
        const listingsPath = path.join(PUBLIC_DIR, 'offplan-listings.json');
        const raw = fs.readFileSync(listingsPath, 'utf8');
        let listings = JSON.parse(raw);
        if (devFilter) listings = listings.filter((l) => l.developer.toLowerCase() === devFilter);
        if (featuredOnly) listings = listings.filter((l) => l.featured);
        // Enrich each listing with live DLD area stats
        for (const l of listings) {
          const areaRows = dataset.byArea.get(
            [...dataset.byArea.keys()].find((k) => norm(k) === norm(l.dldAreaKey || l.area)) || ''
          );
          if (areaRows && areaRows.length) {
            l.dldMedianPsf = Math.round(median(areaRows.map((r) => r.aedPerSqft)));
            l.dldTransactions = areaRows.length;
            const off = areaRows.filter((r) => (r.offplan || '').toLowerCase().includes('off')).length;
            l.dldOffplanPct = Math.round((off / areaRows.length) * 100);
          }
        }
        return send(res, 200, { listings, total: listings.length });
      }

      // Lead capture — POST /api/inquiry
      if (req.method === 'POST' && req.url === '/api/inquiry') {
        const body = await readJson(req);
        const { listingId, name, whatsapp, unitType, budget, message } = body;
        if (!name || !whatsapp) return send(res, 400, { error: 'name and whatsapp required' });
        const timestamp = new Date().toISOString();
        const row = [timestamp, listingId || '', name, whatsapp, unitType || '', budget || '', (message || '').replace(/,/g, ' ')].join(',');
        console.log(`[inquiry] ${row}`);
        const leadsPath = path.join(__dirname, 'leads.csv');
        const header = !fs.existsSync(leadsPath) ? 'timestamp,listingId,name,whatsapp,unitType,budget,message\n' : '';
        fs.appendFileSync(leadsPath, header + row + '\n');
        // Also record into the unified lead store so it surfaces in the agent CRM
        recordLead({
          name, phone: whatsapp, intent: 'buy', source: 'offplan-inquiry',
          project: listingId || '', message: [unitType, budget, message].filter(Boolean).join(' · '),
          askingPrice: toNumber(budget) || null,
        });
        return send(res, 200, { ok: true, message: 'Inquiry received. Our team will contact you on WhatsApp within 24 hours.' });
      }

      // Deal check — POST /api/deal-check
      if (req.method === 'POST' && req.url === '/api/deal-check') {
        const body = await readJson(req);
        const result = await getDealCheck(dataset, body);
        return send(res, result.error ? 400 : 200, result);
      }

      // Seller valuation — POST /api/seller-valuation
      if (req.method === 'POST' && req.url === '/api/seller-valuation') {
        const body = await readJson(req);
        const result = await getSellerValuation(dataset, body);
        return send(res, result.error ? 400 : 200, result);
      }

      // Lead capture — POST /api/leads (seller/buyer site leads + valuation snapshot)
      if (req.method === 'POST' && req.url === '/api/leads') {
        const body = await readJson(req);
        if (!body.name || !body.phone) return send(res, 400, { error: 'name and phone are required' });
        const lead = recordLead({
          name: body.name,
          phone: body.phone,
          email: body.email,
          intent: body.intent,
          source: body.source || body.sourcePage || 'website',
          agency: body.agency,
          brn: body.brn,
          area: body.area,
          project: body.project,
          rooms: body.rooms,
          sizeSqft: toNumber(body.sizeSqft ?? body.size),
          askingPrice: toNumber(body.askingPrice ?? body.price ?? body.targetPrice),
          message: body.message,
          valuation: body.valuation || body.valuationResult || null,
        });
        console.log(`[lead] ${lead.intent || 'lead'} — ${lead.name} (${lead.area || 'n/a'}) [${lead.source}]`);
        const greet = encodeURIComponent(
          `Hi Sambhav — this is ${lead.name}. I just used Elevate Homes` +
            (lead.area ? ` for my ${lead.area} property` : '') + ' and would like to discuss.',
        );
        return send(res, 200, {
          ok: true,
          id: lead.id,
          whatsapp: AGENT_WHATSAPP ? `https://wa.me/${AGENT_WHATSAPP}?text=${greet}` : null,
          message: 'Thank you — your report is ready and our team will reach out shortly.',
        });
      }

      // Agent CRM — list leads (GET /api/crm/leads) and update (POST /api/crm/update)
      if (req.method === 'GET' && req.url.startsWith('/api/crm/leads')) {
        if (!crmAuthorized(req)) return send(res, 401, { error: 'unauthorized' });
        const leads = readLeads().sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
        const stats = Object.fromEntries(LEAD_STAGES.map((s) => [s, 0]));
        for (const l of leads) if (l.status in stats) stats[l.status]++;
        return send(res, 200, { leads, stats, stages: LEAD_STAGES, total: leads.length });
      }
      if (req.method === 'POST' && req.url.startsWith('/api/crm/update')) {
        if (!crmAuthorized(req)) return send(res, 401, { error: 'unauthorized' });
        const body = await readJson(req);
        const leads = readLeads();
        const lead = leads.find((l) => l.id === body.id);
        if (!lead) return send(res, 404, { error: 'lead not found' });
        const ts = new Date().toISOString();
        if (body.status && LEAD_STAGES.includes(body.status) && body.status !== lead.status) {
          lead.status = body.status;
          lead.history.push({ ts, status: body.status });
        }
        if (body.note && body.note.toString().trim()) {
          lead.notes.push({ ts, text: body.note.toString().trim().slice(0, 600) });
        }
        writeLeads(leads);
        return send(res, 200, { ok: true, lead });
      }

      // Content draft — GET /api/content-draft?topic=Business+Bay+PSF
      if (req.method === 'GET' && req.url.startsWith('/api/content-draft')) {
        const topic = new URL(req.url, 'http://x').searchParams.get('topic') || '';
        if (!topic) return send(res, 400, { error: 'topic parameter required' });
        const result = await getContentDraft(dataset, topic);
        return send(res, result.error ? 503 : 200, result);
      }

      // Higgsfield video status — GET /api/video-status?id=...
      if (req.method === 'GET' && req.url.startsWith('/api/video-status')) {
        const id = new URL(req.url, 'http://x').searchParams.get('id');
        if (!id) return send(res, 400, { error: 'id parameter required' });
        const apiKey = process.env.HIGGSFIELD_API_KEY;
        if (!apiKey) return send(res, 503, { error: 'HIGGSFIELD_API_KEY not configured' });
        try {
          const statusRes = await fetch(`https://platform.higgsfield.ai/requests/${id}/status`, {
            headers: { Authorization: `Bearer ${apiKey}` },
          });
          if (!statusRes.ok) return send(res, statusRes.status, { error: `Higgsfield error ${statusRes.status}` });
          const data = await statusRes.json();
          return send(res, 200, {
            id,
            status: data.status,
            url: data.url || data.video_url || data.output_url || null,
          });
        } catch (err) {
          return send(res, 500, { error: err.message });
        }
      }

      if (req.method === 'GET') return serveStatic(req, res);
      return send(res, 405, { error: 'method not allowed' });
    } catch (err) {
      console.error('[server]', err);
      return send(res, 500, { error: err.message || 'internal error' });
    }
  });

  if (!IS_SERVERLESS) {
    server.listen(PORT, () => {
      console.log(`[server] Elevate Homes ready at http://localhost:${PORT}/`);
    });
  }
  return server;
}

let serverPromise = null;
if (!IS_SERVERLESS) {
  start().catch((err) => {
    console.error('[boot] failed:', err.message);
    process.exit(1);
  });
}

// Vercel entry — boot once per instance, then feed each request to the same
// listener the long-running server uses.
export default async function handler(req, res) {
  serverPromise ||= start();
  (await serverPromise).emit('request', req, res);
}
