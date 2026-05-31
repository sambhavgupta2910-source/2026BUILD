// PRISM frontend — drives the static shell in index.html.
// Fetches /api/metadata on load to populate datalists + quality strip,
// posts /api/valuation on submit, renders results + comparables.

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const fmtAed = (v) =>
  Number.isFinite(v) ? `AED ${Math.round(v).toLocaleString('en-US')}` : '—';
const fmtPsf = (v) =>
  Number.isFinite(v) ? `${Math.round(v).toLocaleString('en-US')}` : '—';
const fmtInt = (v) => (Number.isFinite(v) ? v.toLocaleString('en-US') : '—');
const fmtDate = (v) => (v ? v.slice(0, 10) : '—');

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtMonth = (s) => {
  if (!s) return '—';
  const [y, m] = s.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[idx] || m} '${y ? y.slice(2) : ''}`;
};

const fmtVolume = (v) => {
  if (!Number.isFinite(v)) return '—';
  if (v >= 1e9) return `AED ${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `AED ${(v / 1e6).toFixed(0)}M`;
  return `AED ${Math.round(v).toLocaleString('en-US')}`;
};

function fillDatalist(id, values) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = values
    .filter(Boolean)
    .map((v) => `<option value="${escapeAttr(v)}"></option>`)
    .join('');
}

function escapeAttr(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c]));
}

function renderRankList(containerId, rows) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!rows.length) {
    el.innerHTML = '<div class="rank-empty">No data</div>';
    return;
  }
  el.innerHTML = rows
    .map(
      (r) => `
        <div class="rank-row">
          <div class="rank-label">${escapeAttr(r.label)}</div>
          <div class="rank-meta">
            <span>${fmtInt(r.count)} sales</span>
            <span>${fmtPsf(r.medianPsf)} AED/sqft</span>
          </div>
        </div>`,
    )
    .join('');
}

async function loadMetadata() {
  const status = $('#loadStatus');
  status.textContent = 'Loading data…';
  try {
    const res = await fetch('/api/metadata');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const m = await res.json();

    fillDatalist('areas', m.areas);
    fillDatalist('projects', m.projects);
    fillDatalist('propertyTypes', m.propertyTypes);
    fillDatalist('propertySubtypes', m.propertySubtypes);
    fillDatalist('rooms', m.rooms);
    fillDatalist('usage', m.usage);
    fillDatalist('offplan', m.offplan);
    fillDatalist('freehold', m.freehold);

    $('#rowCount').textContent = fmtInt(m.rowCount);
    $('#cleanSales').textContent = fmtInt(m.cleanRows);
    $('#medianPsf').textContent = `${fmtPsf(m.medianPsf)} AED/sqft`;
    $('#winsorizedRows').textContent = fmtInt(m.adjustedRows);

    const range =
      m.dateMin && m.dateMax
        ? ` · ${fmtDate(m.dateMin)} → ${fmtDate(m.dateMax)}`
        : '';
    const statusText = `${fmtInt(m.cleanRows)} clean sales${range}`;
    status.textContent = statusText;
    const mobileStatus = document.getElementById('mobileStatus');
    if (mobileStatus) mobileStatus.textContent = statusText;

    $('#qualityCopy').textContent =
      `Pipeline: GROUP_EN=Sales, USAGE_EN=Residential, PROCEDURE_AREA (sqm) × 10.764 = sqft, ` +
      `AED/sqft = TRANS_VALUE / sqft. ${fmtInt(m.adjustedRows)} rows dropped by sanity bounds ` +
      `(50–20,000 AED/sqft).`;

    renderRankList('topAreas', m.topAreas);
    renderRankList('topProjects', m.topProjects);
    return m;
  } catch (err) {
    status.textContent = `Failed to load data: ${err.message}`;
    throw err;
  }
}

function readForm() {
  const f = $('#valuationForm');
  const data = {};
  for (const el of f.querySelectorAll('input, select')) {
    if (!el.name) continue;
    data[el.name] = el.value.trim();
  }
  return data;
}

function renderResult(result) {
  $('#baseValue').textContent = fmtAed(result.baseValue);
  $('#lowValue').textContent = fmtAed(result.lowValue);
  $('#highValue').textContent = fmtAed(result.highValue);

  const psfText = `${fmtPsf(result.basePsf)} AED/sqft`;
  $('#basePsf').textContent = psfText;
  const bps = document.getElementById('basePsfStrip');
  if (bps) bps.textContent = psfText;

  const compText = fmtInt(result.compCount);
  $('#compCount').textContent = compText;
  const ccs = document.getElementById('compCountStrip');
  if (ccs) ccs.textContent = compText;

  const confEl = $('#confidence');
  confEl.textContent = result.confidence;
  confEl.className = `conf-value conf-${result.confidence.toLowerCase()}`;

  const ml = document.getElementById('matchLevel');
  if (ml) ml.textContent = result.fallback.id;

  $('#fallbackLabel').textContent =
    `${result.fallback.label} · ${fmtInt(result.compCount)} comps`;

  const note = [];
  if (result.resolvedArea)    note.push(`Area: ${result.resolvedArea}`);
  if (result.resolvedProject) note.push(`Project: ${result.resolvedProject}`);
  note.push(`${Math.round(result.sizeSqft).toLocaleString('en-US')} sqft`);
  note.push(`Range: ${fmtPsf(result.lowPsf)}–${fmtPsf(result.highPsf)} AED/sqft`);
  $('#advisorNote').textContent = note.join(' · ');

  const tbody = $('#comparablesBody');
  if (!result.comparables.length) {
    tbody.innerHTML = '<tr><td colspan="8">No comparables.</td></tr>';
  } else {
    tbody.innerHTML = result.comparables
      .map((c) => `<tr>
        <td>${escapeAttr(fmtDate(c.date))}</td>
        <td>${escapeAttr(c.area || '')}</td>
        <td>${escapeAttr(c.project || '')}</td>
        <td>${escapeAttr(c.rooms || '')}</td>
        <td>${fmtInt(Math.round(c.sizeSqft))}</td>
        <td>${fmtAed(c.transValue)}</td>
        <td>${fmtPsf(c.aedPerSqft)}</td>
        <td>${escapeAttr(result.fallback.id)}</td>
      </tr>`)
      .join('');
  }

  if (result.resolvedArea) loadAnalysis(result.resolvedArea);
}

// ---------------------------------------------------------------------------
// Claude AI commentary
// ---------------------------------------------------------------------------

async function loadAnalysis(area) {
  const block = document.getElementById('insightBlock');
  const loading = document.getElementById('insightLoading');
  const textEl = document.getElementById('insightText');
  const areaEl = document.getElementById('insightArea');
  if (!block) return;

  block.hidden = false;
  if (areaEl) areaEl.textContent = area;
  if (loading) { loading.hidden = false; loading.textContent = 'Generating market commentary…'; }
  if (textEl) textEl.hidden = true;

  try {
    const res = await fetch(`/api/analysis?area=${encodeURIComponent(area)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (loading) loading.hidden = true;
    if (textEl) {
      if (data.commentary) {
        textEl.textContent = data.commentary;
        textEl.hidden = false;
      } else {
        loading.hidden = false;
        loading.textContent = data.reason || 'AI commentary unavailable';
      }
    }
  } catch (err) {
    if (loading) { loading.hidden = false; loading.textContent = `AI unavailable: ${err.message}`; }
  }
}

function renderError(msg) {
  $('#advisorNote').textContent = msg;
  ['baseValue','lowValue','highValue','basePsf','compCount'].forEach(
    (id) => { const el = document.getElementById(id); if (el) el.textContent = '—'; }
  );
  const confEl = $('#confidence');
  confEl.textContent = '—';
  confEl.className = 'conf-value';
  $('#fallbackLabel').textContent = 'No match';
  $('#comparablesBody').innerHTML = '<tr><td colspan="8">No comparables for this query.</td></tr>';
  const block = document.getElementById('insightBlock');
  if (block) block.hidden = true;
}

async function callNodeValuation(formData) {
  const note = $('#advisorNote');
  note.textContent = 'Running comparable-median…';
  try {
    const res = await fetch('/api/valuation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok || data.error) { renderError(data.error || `HTTP ${res.status}`); return; }
    renderResult(data);
  } catch (err) {
    renderError(err.message || 'Request failed');
  }
}

// ---------------------------------------------------------------------------
// Oracle backend integration
// ---------------------------------------------------------------------------

const getOracleUrl = () => (document.getElementById('oracleUrl')?.value || '').replace(/\/$/, '');

let _oracleSearchTimer = null;
function onProjectInput(e) {
  clearTimeout(_oracleSearchTimer);
  const q = (e.target.value || '').trim();
  if (q.length < 2) return;
  _oracleSearchTimer = setTimeout(() => searchOracle(q), 300);
}

async function searchOracle(q) {
  const base = getOracleUrl();
  if (!base) return;
  try {
    const res = await fetch(`${base}/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return;
    const results = await res.json();
    const dl = document.getElementById('oracleProjects');
    if (dl) dl.innerHTML = results.map((r) => `<option value="${escapeAttr(r.name)}"></option>`).join('');
    const chip = document.getElementById('oracleSearchChip');
    if (!chip) return;
    if (!results.length) { chip.hidden = true; return; }
    const first = results[0];
    chip.textContent = `${first.name} · ${first.location} · ${fmtPsf(first.avgPsf)} AED/sqft · Liquidity ${first.liquidityScore}`;
    chip.hidden = false;
  } catch { /* backend offline — silent */ }
}

async function callOraclePredict(formData) {
  const base = getOracleUrl();
  if (!base) { renderOracleError('No Oracle URL configured'); return; }

  const sizeRaw = parseFloat(formData.size) || 0;
  const sizeSqFt = formData.sizeUnit === 'sqm' ? sizeRaw * 10.764 : sizeRaw;
  const listingPrice = parseFloat(formData.listingPrice) || (sizeSqFt * 3000);

  const body = {
    project: formData.project || '',
    sizeSqFt: Math.round(sizeSqFt * 100) / 100,
    bedrooms: parseInt(formData.bedrooms, 10) || 1,
    unitCategory: formData.unitCategory || 'Standard',
    listingPrice,
    floor: parseInt(formData.floor, 10) || 10,
    brand: formData.brand || 'None',
    view: formData.view || 'Standard',
  };

  document.getElementById('oracleBadge').textContent = 'Running…';
  try {
    const res = await fetch(`${base}/predict`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { renderOracleError(`Oracle error: HTTP ${res.status}`); return; }
    renderOracleResult(await res.json());
  } catch (err) {
    renderOracleError(`Oracle unreachable: ${err.message}`);
  }
}

function renderOracleResult(data) {
  const v = data.valuation || {};
  const l = data.liquidity || {};

  document.getElementById('oracleFairValue').textContent = fmtAed(v.fairValuePrice);
  document.getElementById('oracleConfLow').textContent = fmtAed(v.confidenceLow);
  document.getElementById('oracleConfHigh').textContent = fmtAed(v.confidenceHigh);
  document.getElementById('oracleFairPsf').textContent = `${fmtPsf(v.fairValuePsf)} AED/sqft`;
  document.getElementById('oracleBrandPremium').textContent = fmtAed(v.brandPremiumAmount);
  document.getElementById('oraclePremiumPct').textContent =
    Number.isFinite(v.brandPremiumPercent) ? `${v.brandPremiumPercent.toFixed(1)}%` : '—';
  document.getElementById('oracleYield').textContent =
    Number.isFinite(v.grossYield) ? `${v.grossYield.toFixed(1)}%` : '—';
  document.getElementById('oracleReturn').textContent =
    Number.isFinite(v.totalReturn) ? `${v.totalReturn.toFixed(1)}%` : '—';
  document.getElementById('oracleDom').textContent =
    Number.isFinite(l.estimatedDOM) ? `${l.estimatedDOM} days` : '—';
  document.getElementById('oracleSell30').textContent =
    Number.isFinite(l.probabilityToSell30Days) ? `${l.probabilityToSell30Days.toFixed(0)}%` : '—';
  document.getElementById('oracleSell90').textContent =
    Number.isFinite(l.probabilityToSell90Days) ? `${l.probabilityToSell90Days.toFixed(0)}%` : '—';

  const riskEl = document.getElementById('oracleRisk');
  const risk = l.overpricingRisk || '—';
  riskEl.textContent = risk;
  riskEl.className = `risk-badge risk-${risk.toLowerCase()}`;

  const score = l.liquidityScore || 0;
  document.getElementById('oracleLiqScore').textContent = `${score.toFixed(0)} / 100`;
  document.getElementById('oracleLiqBar').style.width = `${Math.min(100, score)}%`;
  document.getElementById('oracleBadge').textContent = 'Oracle AI';
}

function renderOracleError(msg) {
  document.getElementById('oracleBadge').textContent = 'Offline';
  ['oracleFairValue','oracleConfLow','oracleConfHigh','oracleFairPsf',
   'oracleBrandPremium','oraclePremiumPct','oracleYield','oracleReturn',
   'oracleDom','oracleSell30','oracleSell90'].forEach((id) => {
    document.getElementById(id).textContent = '—';
  });
  document.getElementById('oracleRisk').textContent = msg;
  document.getElementById('oracleRisk').className = 'risk-badge';
  document.getElementById('oracleLiqScore').textContent = '—';
  document.getElementById('oracleLiqBar').style.width = '0%';
}

async function runValuation(event) {
  event.preventDefault();
  const formData = readForm();
  await Promise.allSettled([
    callNodeValuation(formData),
    callOraclePredict(formData),
  ]);
}

// ---------------------------------------------------------------------------
// URL query-parameter auto-fill + zero-touch auto-run
// ---------------------------------------------------------------------------

function applyUrlParams() {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return;
  const form = document.getElementById('valuationForm');
  if (!form) return;
  const fields = [
    'area','project','rooms','size','sizeUnit','offplan','freehold',
    'listingPrice','bedrooms','brand','view','unitCategory','floor',
  ];
  let anySet = false;
  for (const name of fields) {
    const val = params.get(name);
    if (val === null) continue;
    const el = form.elements[name];
    if (el) { el.value = val; anySet = true; }
  }
  if (anySet) {
    loadMetadata()
      .then(() => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })))
      .catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Trends rendering
// ---------------------------------------------------------------------------

function renderTrendsChart(monthly, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!monthly.length) {
    el.innerHTML = '<div class="rank-empty">No monthly data available</div>';
    return;
  }

  const W = 700, H = 250;
  const PL = 56, PR = 58, PT = 20, PB = 44;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const n = monthly.length;

  const counts = monthly.map((m) => m.count);
  const psfs = monthly.map((m) => m.medianPsf).filter((v) => v > 0);
  const maxCount = Math.max(...counts, 1);
  const minPsf = psfs.length ? Math.min(...psfs) * 0.93 : 0;
  const maxPsf = psfs.length ? Math.max(...psfs) * 1.05 : 1;

  const xOf = (i) => PL + (i + 0.5) * (cW / n);
  const yCount = (v) => PT + cH - (v / maxCount) * cH;
  const yPsf = (v) => PT + cH - ((v - minPsf) / (maxPsf - minPsf || 1)) * cH;
  const barW = Math.max(5, (cW / n) * 0.55);

  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const y = (PT + cH - f * cH).toFixed(1);
    return `<line x1="${PL}" y1="${y}" x2="${W - PR}" y2="${y}" stroke="#1f2a3d" stroke-width="1"/>`;
  }).join('');

  const bars = monthly.map((m, i) => {
    const x = (xOf(i) - barW / 2).toFixed(1);
    const bH = ((m.count / maxCount) * cH).toFixed(1);
    const y = (PT + cH - (m.count / maxCount) * cH).toFixed(1);
    return `<rect x="${x}" y="${y}" width="${barW.toFixed(1)}" height="${bH}" fill="#6ea8ff" opacity="0.2" rx="2"/>`;
  }).join('');

  const offBars = monthly.map((m, i) => {
    const x = (xOf(i) - barW / 2).toFixed(1);
    const bH = ((m.offplanCount / maxCount) * cH).toFixed(1);
    const y = (PT + cH - (m.offplanCount / maxCount) * cH).toFixed(1);
    return `<rect x="${x}" y="${y}" width="${barW.toFixed(1)}" height="${bH}" fill="#5fd6a8" opacity="0.35" rx="2"/>`;
  }).join('');

  const linePoints = monthly.map((m, i) => `${xOf(i).toFixed(1)},${yPsf(m.medianPsf).toFixed(1)}`);
  const linePath = `<path d="M${linePoints.join(' L')}" fill="none" stroke="#6ea8ff" stroke-width="2" stroke-linejoin="round"/>`;

  const dots = monthly.map((m, i) =>
    `<circle cx="${xOf(i).toFixed(1)}" cy="${yPsf(m.medianPsf).toFixed(1)}" r="3.5" fill="#6ea8ff" stroke="#121826" stroke-width="1.5"/>`
  ).join('');

  const xLabels = monthly.map((m, i) =>
    `<text x="${xOf(i).toFixed(1)}" y="${H - 8}" text-anchor="middle" font-size="10" fill="#6b7a99">${fmtMonth(m.month)}</text>`
  ).join('');

  const countTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = Math.round(maxCount * f);
    const y = (PT + cH - f * cH + 4).toFixed(1);
    const label = v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);
    return `<text x="${PL - 5}" y="${y}" text-anchor="end" font-size="9" fill="#6b7a99">${label}</text>`;
  }).join('');

  const psfTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = Math.round(minPsf + (maxPsf - minPsf) * f);
    const y = (PT + cH - f * cH + 4).toFixed(1);
    return `<text x="${W - PR + 5}" y="${y}" text-anchor="start" font-size="9" fill="#6ea8ff">${v.toLocaleString()}</text>`;
  }).join('');

  const axisLeft = `<text x="11" y="${(PT + cH / 2).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6b7a99" transform="rotate(-90,11,${(PT + cH / 2).toFixed(1)})">Transactions</text>`;
  const axisRight = `<text x="${W - 11}" y="${(PT + cH / 2).toFixed(1)}" text-anchor="middle" font-size="9" fill="#6ea8ff" transform="rotate(90,${W - 11},${(PT + cH / 2).toFixed(1)})">AED / sqft</text>`;

  const legend = `
    <rect x="${PL}" y="5" width="10" height="8" fill="#6ea8ff" opacity="0.2" rx="1"/>
    <text x="${PL + 14}" y="12" font-size="9" fill="#6b7a99">Total vol.</text>
    <rect x="${PL + 78}" y="5" width="10" height="8" fill="#5fd6a8" opacity="0.35" rx="1"/>
    <text x="${PL + 92}" y="12" font-size="9" fill="#6b7a99">Off-plan</text>
    <line x1="${PL + 156}" y1="9" x2="${PL + 172}" y2="9" stroke="#6ea8ff" stroke-width="2"/>
    <circle cx="${PL + 164}" cy="9" r="3" fill="#6ea8ff" stroke="#121826" stroke-width="1.5"/>
    <text x="${PL + 178}" y="12" font-size="9" fill="#6b7a99">Median AED/sqft</text>`;

  el.innerHTML = `<svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
    ${grid}${bars}${offBars}${linePath}${dots}${xLabels}${countTicks}${psfTicks}${axisLeft}${axisRight}${legend}
  </svg>`;
}

function renderOffplanSplit(offplanSplit, containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!offplanSplit.length) {
    el.innerHTML = '<div class="rank-empty">No off-plan data</div>';
    return;
  }
  el.innerHTML = offplanSplit.map((item) => {
    const pct = Math.round(item.share * 100);
    const isOffplan = item.label.toLowerCase().includes('off');
    const color = isOffplan ? 'var(--good)' : 'var(--warn)';
    return `
      <div class="offplan-card">
        <div class="offplan-card-label">${escapeAttr(item.label)}</div>
        <div class="offplan-card-pct" style="color:${color}">${pct}%</div>
        <div class="offplan-card-count">${fmtInt(item.count)} transactions</div>
        <div class="offplan-card-psf">${fmtPsf(item.medianPsf)} AED/sqft median</div>
        <div class="offplan-bar-wrap"><div class="offplan-bar" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
  }).join('');
}

function renderAreaStats(areaStats, tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  if (!areaStats.length) {
    tbody.innerHTML = '<tr><td colspan="5">No area data available</td></tr>';
    return;
  }
  tbody.innerHTML = areaStats.map((a) => {
    const sign = a.trend > 0 ? '+' : '';
    const tColor = a.trend > 1 ? 'var(--good)' : a.trend < -1 ? 'var(--bad)' : 'var(--text-mute)';
    return `<tr>
      <td>${escapeAttr(a.label)}</td>
      <td>${fmtInt(a.count)}</td>
      <td>${fmtPsf(a.medianPsf)}</td>
      <td>${a.offplanPct}%</td>
      <td style="color:${tColor};font-weight:600">${sign}${a.trend}%</td>
    </tr>`;
  }).join('');
}

async function loadTrends() {
  try {
    const res = await fetch('/api/trends');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const t = await res.json();

    const range = t.dateMin && t.dateMax ? `${fmtDate(t.dateMin)} → ${fmtDate(t.dateMax)}` : '';
    const elRange = document.getElementById('trendsDateRange');
    if (elRange) elRange.textContent = range;
    const elRange2 = document.getElementById('trendsRange');
    if (elRange2) elRange2.textContent = range;

    renderTrendsChart(t.monthly, 'trendsChart');
    renderOffplanSplit(t.offplanSplit, 'offplanSplit');
    renderAreaStats(t.areaStats, 'areaStatsBody');

    if (!t.monthly.length) return;
    const totalCount = t.monthly.reduce((s, m) => s + m.count, 0);
    const totalValue = t.monthly.reduce((s, m) => s + m.totalValue, 0);
    const peakByCount = t.monthly.reduce((best, m) => (m.count > best.count ? m : best));
    const peakByPsf = t.monthly.reduce((best, m) => (m.medianPsf > best.medianPsf ? m : best));

    const el1 = document.getElementById('trendsTotalCount');
    if (el1) el1.textContent = fmtInt(totalCount);
    const el2 = document.getElementById('trendsTotalValue');
    if (el2) el2.textContent = fmtVolume(totalValue);
    const el3 = document.getElementById('trendsPeakMonth');
    if (el3) el3.textContent = fmtMonth(peakByCount.month);
    const el4 = document.getElementById('trendsPeakPsf');
    if (el4) el4.textContent = `${fmtPsf(peakByPsf.medianPsf)} AED/sqft`;
  } catch (err) {
    console.error('Failed to load trends:', err);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }

  const hasUrlParams = [...new URLSearchParams(location.search).keys()].length > 0;
  if (!hasUrlParams) {
    loadMetadata().catch(() => {});
    loadTrends().catch(() => {});
  }
  applyUrlParams();

  $('#valuationForm').addEventListener('submit', runValuation);
  document.getElementById('projectInput')?.addEventListener('input', onProjectInput);

  // Nav highlight — covers both sidebar and mobile bottom nav
  const allNavLinks = document.querySelectorAll('aside nav a, .mobile-nav-item');
  const applyHash = () => {
    const hash = location.hash || '#valuation';
    allNavLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
  };
  window.addEventListener('hashchange', applyHash);
  applyHash();
});


// ---------------------------------------------------------------------------
// Lead capture modal
// ---------------------------------------------------------------------------

let _agentWhatsapp = '';
(async () => {
  try {
    const r = await fetch('/api/config');
    if (r.ok) { const d = await r.json(); _agentWhatsapp = d.agentWhatsapp || ''; }
  } catch { /* ignore */ }
})();

function openLeadModal(context) {
  const overlay = document.getElementById('leadModalOverlay');
  if (!overlay) return;

  // Reset success state
  document.getElementById('leadSuccess').hidden = true;
  document.getElementById('leadForm').hidden = false;
  document.getElementById('leadSubmitBtn').disabled = false;
  document.getElementById('leadSubmitBtn').textContent = 'Send Inquiry';

  // Prefill area from valuation form if context is 'valuation'
  if (context === 'valuation') {
    const areaInput = document.querySelector('#valuationForm [name="area"]');
    const leadArea = document.getElementById('leadArea');
    if (areaInput && leadArea && areaInput.value) leadArea.value = areaInput.value;

    const baseVal = document.getElementById('baseValue')?.textContent;
    const msgEl = document.getElementById('leadMessage');
    if (msgEl && baseVal && baseVal !== '—') {
      msgEl.value = `PRISM estimated my property at ${baseVal}. I'd like a full appraisal.`;
    }
  }

  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  overlay.querySelector('input[name="name"]')?.focus();
}

function closeLeadModal() {
  const overlay = document.getElementById('leadModalOverlay');
  if (overlay) overlay.hidden = true;
  document.body.style.overflow = '';
}

// Close on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('leadModalOverlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLeadModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLeadModal();
  });
});

async function submitLead(e) {
  e.preventDefault();
  const form = document.getElementById('leadForm');
  const btn = document.getElementById('leadSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Sending…';

  const fd = new FormData(form);
  const body = {};
  fd.forEach((v, k) => { body[k] = v; });

  try {
    const res = await fetch('/api/inquiry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    form.hidden = true;
    const successEl = document.getElementById('leadSuccess');
    const msgEl = document.getElementById('leadSuccessMsg');
    if (msgEl) msgEl.textContent = data.message || 'Inquiry received! We\'ll be in touch soon.';

    const waBtn = document.getElementById('leadWaBtn');
    if (waBtn) {
      const phone = _agentWhatsapp || '971500000000';
      const waText = encodeURIComponent(
        `Hi, I submitted an inquiry on PRISM for ${body.intent === 'sell' ? 'selling' : body.intent === 'buy' ? 'buying' : 'investing in'} a property` +
        (body.area ? ` in ${body.area}` : '') + '. I\'d love to discuss further.'
      );
      waBtn.href = `https://wa.me/${phone}?text=${waText}`;
    }

    successEl.hidden = false;
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Send Inquiry';
    alert('Failed to submit. Please try again.');
  }
}

// Show post-valuation CTA after result renders
const _origRenderResult = typeof renderResult !== 'undefined' ? renderResult : null;
// Hook into renderResult via wrapper — done after DOMContentLoaded so app.js has loaded
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('valuationForm');
  if (form) {
    form.addEventListener('submit', () => {
      // Show CTA ~800ms after submit (after results render)
      setTimeout(() => {
        const cta = document.getElementById('leadValuationCta');
        if (cta) cta.hidden = false;
      }, 1200);
    });
  }
});
