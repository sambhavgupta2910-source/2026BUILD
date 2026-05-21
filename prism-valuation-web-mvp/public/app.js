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
    status.textContent = `${fmtInt(m.cleanRows)} clean sales${range}`;

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
  $('#basePsf').textContent = `${fmtPsf(result.basePsf)} AED/sqft`;
  $('#compCount').textContent = fmtInt(result.compCount);
  $('#confidence').textContent = result.confidence;
  $('#fallbackLabel').textContent = `Match: ${result.fallback.label} · ${fmtInt(result.compCount)} comps`;

  const note = [];
  if (result.resolvedArea) note.push(`Area: ${result.resolvedArea}`);
  if (result.resolvedProject) note.push(`Project: ${result.resolvedProject}`);
  note.push(`Size used: ${Math.round(result.sizeSqft).toLocaleString('en-US')} sqft`);
  note.push(
    `Range: ${fmtPsf(result.lowPsf)}–${fmtPsf(result.highPsf)} AED/sqft (IQR of comparables)`,
  );
  $('#advisorNote').textContent = note.join(' · ');

  const tbody = $('#comparablesBody');
  if (!result.comparables.length) {
    tbody.innerHTML = '<tr><td colspan="8">No comparables.</td></tr>';
    return;
  }
  tbody.innerHTML = result.comparables
    .map(
      (c) => `
        <tr>
          <td>${escapeAttr(fmtDate(c.date))}</td>
          <td>${escapeAttr(c.area || '')}</td>
          <td>${escapeAttr(c.project || '')}</td>
          <td>${escapeAttr(c.rooms || '')}</td>
          <td>${fmtInt(Math.round(c.sizeSqft))}</td>
          <td>${fmtAed(c.transValue)}</td>
          <td>${fmtPsf(c.aedPerSqft)}</td>
          <td>${escapeAttr(result.fallback.id)}</td>
        </tr>`,
    )
    .join('');
}

function renderError(msg) {
  $('#advisorNote').textContent = msg;
  $('#baseValue').textContent = '—';
  $('#lowValue').textContent = '—';
  $('#highValue').textContent = '—';
  $('#basePsf').textContent = '—';
  $('#compCount').textContent = '—';
  $('#confidence').textContent = '—';
  $('#fallbackLabel').textContent = 'No match';
  $('#comparablesBody').innerHTML =
    '<tr><td colspan="8">No comparables for this query.</td></tr>';
}

async function runValuation(event) {
  event.preventDefault();
  const note = $('#advisorNote');
  note.textContent = 'Running valuation…';
  try {
    const res = await fetch('/api/valuation', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(readForm()),
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      renderError(data.error || `HTTP ${res.status}`);
      return;
    }
    renderResult(data);
  } catch (err) {
    renderError(err.message || 'Request failed');
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
  loadMetadata().catch(() => {});
  loadTrends().catch(() => {});
  $('#valuationForm').addEventListener('submit', runValuation);

  // Nav highlight follows hash
  const nav = document.querySelectorAll('aside nav a');
  const apply = () => {
    const hash = location.hash || '#valuation';
    nav.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === hash));
  };
  window.addEventListener('hashchange', apply);
  apply();
});
