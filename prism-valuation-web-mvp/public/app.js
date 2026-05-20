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

window.addEventListener('DOMContentLoaded', () => {
  loadMetadata().catch(() => {});
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
