// Elevate Homes — Agent CRM logic.
// Lists captured leads, advances them through the pipeline, logs call notes,
// and surfaces each lead's pricing context. Talks to /api/crm/* with an
// optional ?token= (required only if CRM_TOKEN is set on the server).

const $ = (id) => document.getElementById(id);
const TOKEN = new URLSearchParams(location.search).get('token') || '';
const qs = TOKEN ? `?token=${encodeURIComponent(TOKEN)}` : '';

const STAGE_LABEL = {
  new: 'New', qualified: 'Qualified', valuation_sent: 'Valuation Sent',
  consultation: 'Consultation', mandate: 'Mandate', listed: 'Listed',
  closed: 'Closed Won', lost: 'Lost',
};
const INTENTS = ['sell', 'buy', 'invest', 'research'];

let STATE = { leads: [], stats: {}, stages: [], filter: 'all', search: '', selected: null };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtAed = (n) => (Number.isFinite(n) ? `AED ${Math.round(n).toLocaleString('en-US')}` : '—');
const digits = (s) => String(s || '').replace(/\D/g, '');

function timeAgo(iso) {
  const t = new Date(iso).getTime();
  if (!t) return '';
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

async function loadLeads() {
  let res;
  try {
    res = await fetch(`/api/crm/leads${qs}`);
  } catch {
    return renderAuthError('Could not reach the server.');
  }
  if (res.status === 401) return renderAuthError('This CRM is protected. Append ?token=YOUR_TOKEN to the URL.');
  const data = await res.json();
  STATE.leads = data.leads || [];
  STATE.stats = data.stats || {};
  STATE.stages = data.stages || Object.keys(STAGE_LABEL);
  renderPipeline();
  renderChips();
  renderList();
  if (STATE.selected) {
    const still = STATE.leads.find((l) => l.id === STATE.selected);
    still ? renderDetail(still) : clearDetail();
  }
  $('liveLabel').textContent = `${STATE.leads.length} leads`;
}

function renderAuthError(msg) {
  document.querySelector('.crm-main').innerHTML =
    `<div class="auth-error"><h2>Access required</h2><p>${esc(msg)}</p></div>`;
  $('pipeline').innerHTML = '';
}

function renderPipeline() {
  $('pipeline').innerHTML = STATE.stages
    .map(
      (s) => `<div class="stage-stat ${s} ${STATE.filter === s ? 'active' : ''}" data-stage="${s}">
        <div class="n">${STATE.stats[s] || 0}</div>
        <div class="l">${STAGE_LABEL[s] || s}</div>
      </div>`,
    )
    .join('');
  $('pipeline').querySelectorAll('.stage-stat').forEach((el) => {
    el.addEventListener('click', () => {
      STATE.filter = STATE.filter === el.dataset.stage ? 'all' : el.dataset.stage;
      renderPipeline(); renderChips(); renderList();
    });
  });
}

function renderChips() {
  const chips = [['all', 'All']].concat(STATE.stages.map((s) => [s, STAGE_LABEL[s] || s]));
  $('filterChips').innerHTML = chips
    .map(([v, l]) => `<button class="chip ${STATE.filter === v ? 'active' : ''}" data-f="${v}">${esc(l)}</button>`)
    .join('');
  $('filterChips').querySelectorAll('.chip').forEach((c) => {
    c.addEventListener('click', () => { STATE.filter = c.dataset.f; renderPipeline(); renderChips(); renderList(); });
  });
}

function filteredLeads() {
  const q = STATE.search.toLowerCase();
  return STATE.leads.filter((l) => {
    if (STATE.filter !== 'all' && l.status !== STATE.filter) return false;
    if (!q) return true;
    return [l.name, l.area, l.project, l.phone, l.email].some((v) => (v || '').toLowerCase().includes(q));
  });
}

function renderList() {
  const leads = filteredLeads();
  if (!leads.length) {
    $('leadList').innerHTML = '<div class="empty-list">No leads match this view yet.</div>';
    return;
  }
  $('leadList').innerHTML = leads
    .map((l) => {
      const intent = INTENTS.includes(l.intent) ? l.intent : 'lead';
      const where = [l.area, l.project].filter(Boolean).join(' · ') || l.source || '—';
      return `<div class="lead-row ${STATE.selected === l.id ? 'active' : ''}" data-id="${l.id}">
        <div class="lr-top">
          <span class="lr-name">${esc(l.name || 'Unnamed lead')}</span>
          <span class="lr-time">${timeAgo(l.ts)}</span>
        </div>
        <div class="lr-meta">${esc(where)}</div>
        <div class="lr-top" style="margin-top:8px">
          <span class="badge ${intent}">${esc(l.intent || 'lead')}</span>
          <span class="stage-pill ${l.status}">${STAGE_LABEL[l.status] || l.status}</span>
        </div>
      </div>`;
    })
    .join('');
  $('leadList').querySelectorAll('.lead-row').forEach((row) => {
    row.addEventListener('click', () => {
      const lead = STATE.leads.find((l) => l.id === row.dataset.id);
      if (lead) { STATE.selected = lead.id; renderList(); renderDetail(lead); }
    });
  });
}

function clearDetail() {
  STATE.selected = null;
  $('detailCard').classList.add('hidden');
  $('detailEmpty').classList.remove('hidden');
}

function valuationPanel(v) {
  if (!v || typeof v !== 'object') return '';
  const rows = [];
  if (Number.isFinite(v.fairValue)) rows.push(['DLD fair value', fmtAed(v.fairValue)]);
  if (v.verdict) rows.push(['Verdict', esc(v.verdict)]);
  if (Number.isFinite(v.discountPct)) rows.push(['vs DLD median', `${v.discountPct > 0 ? '+' : ''}${v.discountPct}%`]);
  if (v.listingGuidance) rows.push(['Listing range', `${fmtAed(v.listingGuidance.quickSale)} – ${fmtAed(v.listingGuidance.ambitious)}`]);
  if (v.liquidity) rows.push(['Liquidity', esc(v.liquidity)]);
  if (v.confidence) rows.push(['Confidence', esc(v.confidence)]);
  if (Number.isFinite(v.compCount)) rows.push(['Comparables', v.compCount]);
  if (!rows.length) return '';
  return `<div class="panel"><h3>Pricing context (from their valuation)</h3><div class="kv">` +
    rows.map(([k, val]) => `<div><span>${k}</span><strong>${val}</strong></div>`).join('') +
    `</div></div>`;
}

function renderDetail(lead) {
  $('detailEmpty').classList.add('hidden');
  $('detailCard').classList.remove('hidden');

  const wa = digits(lead.phone);
  const propRows = [
    ['Intent', lead.intent || '—'],
    ['Source', lead.source || '—'],
    ['Area', lead.area || '—'],
    ['Project', lead.project || '—'],
    ['Rooms', lead.rooms || '—'],
    ['Size', lead.sizeSqft ? `${lead.sizeSqft} sqft` : '—'],
  ];
  if (lead.askingPrice) propRows.push(['Stated price', fmtAed(lead.askingPrice)]);

  const stageBtns = STATE.stages
    .map((s) => `<button class="stage-btn ${lead.status === s ? 'current' : ''}" data-stage="${s}">${STAGE_LABEL[s] || s}</button>`)
    .join('');

  const notes = (lead.notes || []).slice().reverse();
  const notesHtml = notes.length
    ? notes.map((n) => `<div class="note-item"><div class="nt">${timeAgo(n.ts)}</div><p>${esc(n.text)}</p></div>`).join('')
    : '<div class="note-empty">No notes yet. Log your first call.</div>';

  const history = (lead.history || []).slice().reverse();
  const histHtml = history.length
    ? history.map((h) => `<div class="hist-item"><span class="hs">${STAGE_LABEL[h.status] || h.status}</span><span>${timeAgo(h.ts)}</span></div>`).join('')
    : '<div class="hist-empty">No status changes yet.</div>';

  $('detailCard').innerHTML = `
    <div class="dc-head">
      <div>
        <h1>${esc(lead.name || 'Unnamed lead')}</h1>
        <div class="dc-sub">
          <span class="badge ${INTENTS.includes(lead.intent) ? lead.intent : 'lead'}">${esc(lead.intent || 'lead')}</span>
          <span class="stage-pill ${lead.status}">${STAGE_LABEL[lead.status] || lead.status}</span>
          <span>Captured ${timeAgo(lead.ts)}</span>
        </div>
      </div>
      <div class="dc-contact">
        ${wa ? `<a href="https://wa.me/${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
        ${lead.phone ? `<a href="tel:${esc(lead.phone)}">${esc(lead.phone)}</a>` : ''}
        ${lead.email ? `<a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a>` : ''}
      </div>
    </div>

    <div class="panel">
      <h3>Pipeline stage</h3>
      <div class="stage-control" id="stageControl">${stageBtns}</div>
    </div>

    <div class="panel">
      <h3>Property &amp; enquiry</h3>
      <div class="kv">${propRows.map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>
      ${lead.message ? `<p style="margin-top:14px;color:var(--muted);font-size:14px">“${esc(lead.message)}”</p>` : ''}
    </div>

    ${valuationPanel(lead.valuation)}

    <div class="panel">
      <h3>Call notes</h3>
      <div class="note-add">
        <input id="noteInput" placeholder="Log a note — e.g. ‘Called, wants to list at 1.9M, sending report’" />
        <button id="noteAdd">Add</button>
      </div>
      <div id="noteList">${notesHtml}</div>
    </div>

    <div class="panel">
      <h3>Status history</h3>
      <div class="history">${histHtml}</div>
    </div>
  `;

  $('stageControl').querySelectorAll('.stage-btn').forEach((b) => {
    b.addEventListener('click', () => {
      if (b.dataset.stage !== lead.status) updateLead(lead.id, { status: b.dataset.stage });
    });
  });
  const noteInput = $('noteInput');
  const submitNote = () => {
    const text = noteInput.value.trim();
    if (text) updateLead(lead.id, { note: text });
  };
  $('noteAdd').addEventListener('click', submitNote);
  noteInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitNote(); });
}

async function updateLead(id, patch) {
  try {
    const res = await fetch(`/api/crm/update${qs}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Update failed');
    toast(patch.status ? `Moved to ${STAGE_LABEL[patch.status] || patch.status}` : 'Note added');
    await loadLeads();
  } catch (err) {
    toast(err.message);
  }
}

let toastT = null;
function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
}

$('search').addEventListener('input', (e) => { STATE.search = e.target.value; renderList(); });

loadLeads();
// Light polling so new website leads appear without a manual refresh
setInterval(loadLeads, 20000);
