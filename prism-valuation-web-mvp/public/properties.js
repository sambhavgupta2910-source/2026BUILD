/* PRISM — Properties Landing Page */

// ── Formatters ────────────────────────────────────────────
const fmtAed   = (v) => v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v.toLocaleString();
const fmtInt   = (v) => Number(v).toLocaleString();
const fmtDate  = (s) => s ? s.slice(0,10) : '—';
const fmtMonth = (s) => { if (!s) return '—'; const d = new Date(s+'T00:00:00Z'); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}); };
const pctSign  = (n) => n > 0 ? `+${n}%` : `${n}%`;

// ── State ─────────────────────────────────────────────────
let allAreas        = [];
let allCommunities  = [];
let allRooms        = [];
let currentPage     = 1;
let activeArea      = '';
let activeCommunity = '';
let areasExpanded   = false;
let commExpanded    = false;
const CARD_LIMIT    = 12;

// ── Skeletons ─────────────────────────────────────────────
function skeletons(n) {
  return Array.from({ length: n }, () =>
    `<div class="card-skeleton">
      <div class="skel-line w80"></div>
      <div class="skel-line w55"></div>
      <div class="skel-line w40"></div>
    </div>`
  ).join('');
}

// ── Escape helpers ─────────────────────────────────────────
const esc     = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const escAttr = esc;

// ── Card rendering ─────────────────────────────────────────
function renderCards(containerId, items, activeVal, onClickFn, expanded) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map((item, i) => {
    const hidden = !expanded && i >= CARD_LIMIT ? 'card-hidden' : '';
    const active = item.name === activeVal ? 'active' : '';
    return `
      <div class="prop-card ${active} ${hidden}" data-name="${escAttr(item.name)}" role="button" tabindex="0">
        <div class="card-rank">#${i+1}</div>
        <div class="card-name">${esc(item.name)}</div>
        <div class="card-divider"></div>
        <div class="card-stats">
          <div class="card-stat">
            <span class="card-stat-label">Transactions</span>
            <span class="card-stat-val gold">${fmtInt(item.count)}</span>
          </div>
          <div class="card-stat">
            <span class="card-stat-label">Median PSF</span>
            <span class="card-stat-val">${item.medianPsf ? fmtInt(item.medianPsf) : '—'}</span>
          </div>
          ${item.areaCount != null ? `
          <div class="card-stat">
            <span class="card-stat-label">Sub-areas</span>
            <span class="card-stat-val">${item.areaCount}</span>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.prop-card').forEach((card) => {
    const name = card.dataset.name;
    const activate = () => onClickFn(name);
    card.addEventListener('click', activate);
    card.addEventListener('keydown', (e) => { if (e.key==='Enter'||e.key===' ') activate(); });
  });
}

function updateToggleBtn(btnId, expanded, total) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = expanded ? 'Show less' : `Show all ${fmtInt(total)}`;
  btn.dataset.expanded = expanded;
}

// ── Load metadata & community data ────────────────────────
async function loadMetadata() {
  const [metaRes, commRes] = await Promise.all([
    fetch('/api/metadata'),
    fetch('/api/communities?limit=200'),
  ]);
  const meta     = await metaRes.json();
  const commData = await commRes.json();

  // Build all areas sorted by count
  const topMap = new Map((meta.topAreas||[]).map(a => [a.label, a]));
  allAreas = (meta.areas||[]).map(name => {
    const t = topMap.get(name);
    return { name, count: t?.count||0, medianPsf: t?.medianPsf||0 };
  }).sort((a,b) => b.count - a.count);

  allCommunities = commData.communities || [];
  allRooms       = meta.rooms || [];

  // Hero stats
  const h = document.getElementById('heroStats');
  if (h) h.innerHTML =
    `<strong>${fmtInt(meta.cleanRows)}</strong> transactions · ` +
    `<strong>${meta.areas?.length||0}</strong> areas · ` +
    `<strong>${commData.total||0}</strong> communities · ` +
    `data through <strong>${fmtMonth(meta.dateMax)}</strong>`;

  document.getElementById('areaSubtitle')?.textContent ? null
    : (document.getElementById('areaSubtitle').textContent = `${meta.areas?.length||0} areas with residential sales`);
  document.getElementById('communitySubtitle')?.textContent ? null
    : (document.getElementById('communitySubtitle').textContent = `${commData.total||0} master communities`);

  populateSelect('filterArea',      allAreas.map(a => a.name));
  populateSelect('filterCommunity', allCommunities.map(c => c.name));
  populateSelect('filterRooms',     allRooms);

  // Apply URL params before rendering cards
  const params = new URLSearchParams(location.search);
  const pa = params.get('area'), pc = params.get('community');
  if (pa) { activeArea = pa; const s=document.getElementById('filterArea'); if(s) s.value=pa; }
  if (pc) { activeCommunity = pc; const s=document.getElementById('filterCommunity'); if(s) s.value=pc; }

  renderCards('areaGrid',      allAreas,       activeArea,       onAreaClick,      areasExpanded);
  renderCards('communityGrid', allCommunities, activeCommunity,  onCommunityClick, commExpanded);
  updateToggleBtn('toggleAreas',       areasExpanded, allAreas.length);
  updateToggleBtn('toggleCommunities', commExpanded,  allCommunities.length);
}

function populateSelect(id, items) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const first = sel.options[0].cloneNode(true);
  sel.innerHTML = '';
  sel.appendChild(first);
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item; opt.textContent = item;
    sel.appendChild(opt);
  });
}

// ── Card click handlers ───────────────────────────────────
function onAreaClick(name) {
  activeArea = activeArea === name ? '' : name;
  const s = document.getElementById('filterArea');
  if (s) s.value = activeArea;
  renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
  currentPage = 1;
  loadListings();
  document.getElementById('listingsSection')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

function onCommunityClick(name) {
  activeCommunity = activeCommunity === name ? '' : name;
  const s = document.getElementById('filterCommunity');
  if (s) s.value = activeCommunity;
  renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
  currentPage = 1;
  loadListings();
  document.getElementById('listingsSection')?.scrollIntoView({ behavior:'smooth', block:'start' });
}

// ── Load listings ─────────────────────────────────────────
async function loadListings() {
  const area      = document.getElementById('filterArea')?.value || '';
  const community = document.getElementById('filterCommunity')?.value || '';
  const rooms     = document.getElementById('filterRooms')?.value || '';
  const offplan   = document.getElementById('filterOffplan')?.value || '';
  const sort      = document.getElementById('sortBy')?.value || 'date';

  const p = new URLSearchParams({ page: currentPage, limit: 25, sort });
  if (area)      p.set('area', area);
  if (community) p.set('community', community);
  if (rooms)     p.set('rooms', rooms);
  if (offplan)   p.set('offplan', offplan);

  const body = document.getElementById('listingsBody');
  if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">Loading…</td></tr>`;

  try {
    const data = await fetch(`/api/properties?${p}`).then(r => r.json());
    renderListings(data);
  } catch {
    if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">Failed to load data.</td></tr>`;
  }
}

function renderListings({ total=0, page=1, pages=1, results=[] }) {
  const body = document.getElementById('listingsBody');
  const sub  = document.getElementById('listingsSubtitle');
  if (sub) sub.textContent = `${fmtInt(total)} transaction${total!==1?'s':''}`;

  if (!results.length) {
    if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">No transactions match the selected filters.</td></tr>`;
    renderPagination(0,1,1); return;
  }

  body.innerHTML = results.map(r => {
    const off = (r.offplan||'').toLowerCase().includes('off');
    const badge = off ? '<span class="badge badge-offplan">Off-Plan</span>'
                      : '<span class="badge badge-ready">Ready</span>';
    return `
      <tr>
        <td>${esc(r.project||'—')}</td>
        <td class="dim">${esc(r.community||'—')}</td>
        <td>${esc(r.area||'—')}</td>
        <td class="dim">${esc(r.rooms||'—')}</td>
        <td class="num">${fmtInt(r.sizeSqft)}</td>
        <td class="num">${r.transValue>=1e6?(r.transValue/1e6).toFixed(2)+'M':fmtInt(r.transValue)}</td>
        <td class="num">${fmtInt(r.aedPerSqft)}</td>
        <td class="dim">${fmtDate(r.date)}</td>
        <td>${badge}</td>
      </tr>`;
  }).join('');

  renderPagination(total, page, pages);
}

function renderPagination(total, page, pages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pages <= 1) { el.innerHTML = ''; return; }

  const nums = [];
  if (pages <= 7) { for (let i=1;i<=pages;i++) nums.push(i); }
  else {
    nums.push(1);
    if (page > 3) nums.push('…');
    for (let i=Math.max(2,page-1);i<=Math.min(pages-1,page+1);i++) nums.push(i);
    if (page < pages-2) nums.push('…');
    nums.push(pages);
  }

  el.innerHTML = `
    <button class="page-btn" ${page<=1?'disabled':''} data-page="${page-1}">←</button>
    ${nums.map(n => n==='…'
      ? `<span class="page-ellipsis">…</span>`
      : `<button class="page-btn ${n===page?'active':''}" data-page="${n}">${n}</button>`
    ).join('')}
    <button class="page-btn" ${page>=pages?'disabled':''} data-page="${page+1}">→</button>`;

  el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      loadListings();
      document.getElementById('tableWrap')?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    });
  });
}

// ── Smart Money / Weekly Trends ───────────────────────────
async function loadWeeklyTrends() {
  try {
    const data = await fetch('/api/weekly-trends').then(r => r.json());
    renderWeeklyTrends(data);
  } catch {
    document.getElementById('smartDate').textContent = 'Failed to load weekly analysis.';
  }
}

function renderWeeklyTrends({ dateRange, summary, volumeMovers=[], psfMovers=[], offplanSurge=[] }) {
  // Date label
  const dateEl = document.getElementById('smartDate');
  if (dateEl && dateRange) {
    dateEl.textContent = `${fmtMonth(dateRange.from)} – ${fmtMonth(dateRange.to)}`;
  }

  // KPIs
  setText('kpiCount',   fmtInt(summary.count));
  setText('kpiVolume',  `${fmtAed(summary.volume)}`);
  setText('kpiPsf',     fmtInt(summary.medianPsf));
  setText('kpiOffplan', `${summary.offplanPct}%`);

  // Volume movers
  const vmEl = document.getElementById('volumeMovers');
  if (vmEl) {
    if (!volumeMovers.length) {
      vmEl.innerHTML = `<p class="no-data">Insufficient data for this period.</p>`;
    } else {
      const maxPct = Math.max(...volumeMovers.map(m => m.pctChange), 1);
      vmEl.innerHTML = volumeMovers.map(m => {
        const barW = Math.min(100, Math.round((m.pctChange / maxPct) * 100));
        return `
          <div class="mover-row">
            <div>
              <div class="mover-area">${esc(m.area)}</div>
              <div class="mover-count">${fmtInt(m.weekCount)} transactions this week</div>
              <div class="mover-bar-wrap">
                <div class="mover-bar" style="width:${barW}%"></div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="mover-pct heat">${pctSign(m.pctChange)}</div>
              <div class="mover-psf-detail">${fmtInt(m.medianPsf)} PSF</div>
            </div>
          </div>`;
      }).join('');
    }
  }

  // PSF movers
  const pmEl = document.getElementById('psfMovers');
  if (pmEl) {
    if (!psfMovers.length) {
      pmEl.innerHTML = `<p class="no-data">Insufficient data for this period.</p>`;
    } else {
      const maxAbs = Math.max(...psfMovers.map(m => Math.abs(m.pctChange)), 1);
      pmEl.innerHTML = psfMovers.map(m => {
        const isUp = m.pctChange >= 0;
        const barW = Math.min(100, Math.round((Math.abs(m.pctChange) / maxAbs) * 100));
        return `
          <div class="mover-row">
            <div>
              <div class="mover-area">${esc(m.area)}</div>
              <div class="mover-count">${fmtInt(m.priorPsf)} → ${fmtInt(m.weekPsf)} AED/sqft</div>
              <div class="mover-bar-wrap">
                <div class="mover-bar ${isUp?'psf-up':'psf-down'}" style="width:${barW}%"></div>
              </div>
            </div>
            <div style="text-align:right">
              <div class="mover-pct ${isUp?'up':'down'}">${pctSign(m.pctChange)}</div>
            </div>
          </div>`;
      }).join('');
    }
  }

  // Off-plan surge tags
  const opEl = document.getElementById('offplanTags');
  if (opEl) {
    if (!offplanSurge.length) {
      opEl.innerHTML = `<p class="no-data">No areas with ≥70% off-plan share this week.</p>`;
    } else {
      opEl.innerHTML = offplanSurge.map(a => `
        <div class="offplan-tag">
          <span class="offplan-tag-name">${esc(a.area)}</span>
          <span class="offplan-tag-pct">${a.offplanPct}%</span>
        </div>`).join('');
    }
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

// ── Search ────────────────────────────────────────────────
function applySearch(q) {
  const term = q.trim().toLowerCase();
  document.getElementById('searchClear').hidden = !term;
  ['areaGrid','communityGrid'].forEach(gridId => {
    document.getElementById(gridId)?.querySelectorAll('.prop-card').forEach(card => {
      card.style.display = (!term || card.dataset.name.toLowerCase().includes(term)) ? '' : 'none';
    });
  });
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('areaGrid').innerHTML      = skeletons(CARD_LIMIT);
  document.getElementById('communityGrid').innerHTML = skeletons(CARD_LIMIT);

  loadMetadata().catch(console.error);
  loadListings().catch(console.error);
  loadWeeklyTrends().catch(console.error);

  // Search
  const si = document.getElementById('searchInput');
  si?.addEventListener('input', () => applySearch(si.value));
  document.getElementById('searchClear')?.addEventListener('click', () => {
    si.value = ''; applySearch(''); si.focus();
  });

  // Toggle show all
  document.getElementById('toggleAreas')?.addEventListener('click', () => {
    areasExpanded = !areasExpanded;
    renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
    updateToggleBtn('toggleAreas', areasExpanded, allAreas.length);
  });
  document.getElementById('toggleCommunities')?.addEventListener('click', () => {
    commExpanded = !commExpanded;
    renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
    updateToggleBtn('toggleCommunities', commExpanded, allCommunities.length);
  });

  // Filters
  ['filterArea','filterCommunity','filterRooms','filterOffplan','sortBy'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id==='filterArea')      { activeArea       = document.getElementById('filterArea').value;      renderCards('areaGrid',      allAreas,       activeArea,       onAreaClick,      areasExpanded); }
      if (id==='filterCommunity') { activeCommunity  = document.getElementById('filterCommunity').value; renderCards('communityGrid', allCommunities, activeCommunity,  onCommunityClick, commExpanded);  }
      currentPage = 1; loadListings();
    });
  });

  // Reset
  document.getElementById('resetFilters')?.addEventListener('click', () => {
    activeArea = ''; activeCommunity = '';
    ['filterArea','filterCommunity','filterRooms','filterOffplan','sortBy'].forEach(id => {
      const el = document.getElementById(id); if (el) el.selectedIndex = 0;
    });
    renderCards('areaGrid',      allAreas,       '', onAreaClick,      areasExpanded);
    renderCards('communityGrid', allCommunities, '', onCommunityClick, commExpanded);
    currentPage = 1; loadListings();
  });
});
