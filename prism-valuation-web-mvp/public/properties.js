/* PRISM — Properties v2 */

// ── Formatters ────────────────────────────────────────────
const fmtAed   = (v) => v >= 1e9 ? `${(v/1e9).toFixed(2)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v.toLocaleString();
const fmtInt   = (v) => Number(v).toLocaleString();
const fmtDate  = (s) => s ? s.slice(0,10) : '—';
const fmtMonth = (s) => { if (!s) return '—'; const d = new Date(s+'T00:00:00Z'); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}); };
const pctSign  = (n) => n > 0 ? `+${n}%` : `${n}%`;
const esc      = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

// ── State ─────────────────────────────────────────────────
let allAreas = [], allCommunities = [], allRooms = [];
let currentPage = 1, activeArea = '', activeCommunity = '';
let areasExpanded = false, commExpanded = false;
const CARD_LIMIT = 12;
let isMobile = () => window.innerWidth <= 640;

// ── Tab navigation ────────────────────────────────────────
function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${btn.dataset.tab}`)?.classList.add('active');
    });
  });
}

// ── Search overlay ────────────────────────────────────────
function initSearch() {
  const overlay = document.getElementById('searchOverlay');
  const input   = document.getElementById('searchInput');

  const open  = () => { overlay.classList.add('open'); setTimeout(() => input.focus(), 50); };
  const close = () => { overlay.classList.remove('open'); input.value = ''; renderSearchResults(''); };

  document.getElementById('searchTrigger')?.addEventListener('click', open);
  document.getElementById('heroSearchBtn')?.addEventListener('click', open);
  document.getElementById('searchClose')?.addEventListener('click', close);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  input.addEventListener('input', () => renderSearchResults(input.value.trim().toLowerCase()));
}

function renderSearchResults(q) {
  const el = document.getElementById('searchResults');
  if (!q) { el.innerHTML = ''; return; }

  const matchArea = allAreas.filter(a => a.name.toLowerCase().includes(q)).slice(0, 5);
  const matchComm = allCommunities.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5);

  const items = [
    ...matchArea.map(a => ({ type: 'Area', name: a.name, meta: `${fmtInt(a.count)} transactions · ${fmtInt(a.medianPsf)} PSF`, action: () => selectArea(a.name) })),
    ...matchComm.map(c => ({ type: 'Community', name: c.name, meta: `${fmtInt(c.count)} transactions · ${c.areaCount} areas`, action: () => selectCommunity(c.name) })),
  ];

  if (!items.length) {
    el.innerHTML = `<div class="search-result-item"><span class="sr-name" style="color:var(--muted)">No results for "${esc(q)}"</span></div>`;
    return;
  }

  el.innerHTML = items.map((item, i) => `
    <div class="search-result-item" tabindex="0" data-idx="${i}">
      <span class="sr-type">${item.type}</span>
      <div><div class="sr-name">${esc(item.name)}</div><div class="sr-meta">${item.meta}</div></div>
    </div>`).join('');

  el.querySelectorAll('.search-result-item').forEach((el, i) => {
    el.addEventListener('click', () => { items[i].action(); document.getElementById('searchOverlay').classList.remove('open'); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') el.click(); });
  });
}

function selectArea(name) {
  activeArea = name;
  activateTab('areas');
  renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
  syncFilters();
  currentPage = 1; loadListings();
  updateFilterChips();
}
function selectCommunity(name) {
  activeCommunity = name;
  activateTab('listings');
  renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
  syncFilters();
  currentPage = 1; loadListings();
  updateFilterChips();
}
function activateTab(tabId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tabId}`));
}

// ── Skeletons ─────────────────────────────────────────────
function skeletons(n) {
  return Array.from({length:n}, () =>
    `<div class="card-skeleton"><div class="skel-line w80"></div><div class="skel-line w55"></div><div class="skel-line w40"></div></div>`
  ).join('');
}

// ── Card rendering ─────────────────────────────────────────
function renderCards(id, items, activeVal, onClickFn, expanded) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map((item, i) => {
    const hidden = !expanded && i >= CARD_LIMIT ? 'card-hidden' : '';
    return `
      <div class="prop-card ${item.name===activeVal?'active':''} ${hidden}" data-name="${esc(item.name)}" role="button" tabindex="0">
        <div class="card-rank">#${i+1}</div>
        <div class="card-name">${esc(item.name)}</div>
        <div class="card-divider"></div>
        <div class="card-stats">
          <div class="card-stat"><span class="card-stat-label">Transactions</span><span class="card-stat-val gold">${fmtInt(item.count)}</span></div>
          <div class="card-stat"><span class="card-stat-label">Median PSF</span><span class="card-stat-val">${item.medianPsf?fmtInt(item.medianPsf):'—'}</span></div>
          ${item.areaCount!=null?`<div class="card-stat"><span class="card-stat-label">Sub-areas</span><span class="card-stat-val">${item.areaCount}</span></div>`:''}
        </div>
      </div>`;
  }).join('');
  el.querySelectorAll('.prop-card').forEach(card => {
    const activate = () => onClickFn(card.dataset.name);
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') activate(); });
  });
}

function updateToggleBtn(btnId, expanded, total) {
  const btn = document.getElementById(btnId);
  if (btn) btn.textContent = expanded ? 'Show less' : `Show all ${fmtInt(total)}`;
}

// ── Metadata ──────────────────────────────────────────────
async function loadMetadata() {
  const [metaRes, commRes] = await Promise.all([
    fetch('/api/metadata'), fetch('/api/communities?limit=200'),
  ]);
  const meta = await metaRes.json();
  const commData = await commRes.json();

  const topMap = new Map((meta.topAreas||[]).map(a => [a.label, a]));
  allAreas = (meta.areas||[]).map(n => { const t=topMap.get(n); return {name:n,count:t?.count||0,medianPsf:t?.medianPsf||0}; }).sort((a,b)=>b.count-a.count);
  allCommunities = commData.communities || [];
  allRooms = meta.rooms || [];

  const h = document.getElementById('heroStats');
  if (h) h.innerHTML = `<strong>${fmtInt(meta.cleanRows)}</strong> transactions · <strong>${meta.areas?.length||0}</strong> areas · <strong>${commData.total||0}</strong> communities · through <strong>${fmtMonth(meta.dateMax)}</strong>`;

  setText('areaSubtitle', `${meta.areas?.length||0} areas with residential sales`);
  setText('communitySubtitle', `${commData.total||0} master communities`);

  populateSelect('filterArea', allAreas.map(a=>a.name));
  populateSelect('filterCommunity', allCommunities.map(c=>c.name));
  populateSelect('filterRooms', allRooms);
  populateSelect('filterAreaD', allAreas.map(a=>a.name));
  populateSelect('filterCommunityD', allCommunities.map(c=>c.name));
  populateSelect('filterRoomsD', allRooms);

  renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
  renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
  updateToggleBtn('toggleAreas', areasExpanded, allAreas.length);
  updateToggleBtn('toggleCommunities', commExpanded, allCommunities.length);
}

function populateSelect(id, items) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const first = sel.options[0].cloneNode(true);
  sel.innerHTML = '';
  sel.appendChild(first);
  items.forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent=v; sel.appendChild(o); });
}

// ── Card click → jump to listings ─────────────────────────
function onAreaClick(name) {
  activeArea = activeArea === name ? '' : name;
  renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
  syncFilters(); currentPage=1; loadListings(); updateFilterChips();
  activateTab('listings');
  window.scrollTo({top:0,behavior:'smooth'});
}
function onCommunityClick(name) {
  activeCommunity = activeCommunity === name ? '' : name;
  renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
  syncFilters(); currentPage=1; loadListings(); updateFilterChips();
  activateTab('listings');
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── Sync mobile sheet ↔ desktop inline ────────────────────
function syncFilters() {
  ['Area','Community','Rooms','Offplan'].forEach(f => {
    const mob = document.getElementById(`filter${f}`);
    const dsk = document.getElementById(`filter${f}D`);
    if (!mob||!dsk) return;
    if (f==='Area')      { mob.value=activeArea;       dsk.value=activeArea; }
    if (f==='Community') { mob.value=activeCommunity;  dsk.value=activeCommunity; }
  });
}

function getFilters() {
  const src = isMobile() ? '' : 'D';
  return {
    area:      document.getElementById(`filterArea${src}`)?.value||'',
    community: document.getElementById(`filterCommunity${src}`)?.value||'',
    rooms:     document.getElementById(`filterRooms${src}`)?.value||'',
    offplan:   document.getElementById(`filterOffplan${src}`)?.value||'',
    sort:      document.getElementById(`sortBy${src}`)?.value||'date',
  };
}

function updateFilterChips() {
  const chips = document.getElementById('filterChips');
  if (!chips) return;
  const f = getFilters();
  const active = [];
  if (f.area)      active.push({ label: f.area,      clear: () => { activeArea=''; syncFilters(); doFilter(); } });
  if (f.community) active.push({ label: f.community, clear: () => { activeCommunity=''; syncFilters(); doFilter(); } });
  if (f.rooms)     active.push({ label: f.rooms,     clear: () => { document.getElementById('filterRooms').value=''; document.getElementById('filterRoomsD').value=''; doFilter(); } });
  if (f.offplan)   active.push({ label: f.offplan,   clear: () => { document.getElementById('filterOffplan').value=''; document.getElementById('filterOffplanD').value=''; doFilter(); } });

  chips.innerHTML = active.map((c,i) => `
    <div class="filter-chip">${esc(c.label)}<span class="filter-chip-remove" data-idx="${i}">✕</span></div>`).join('');
  chips.querySelectorAll('.filter-chip-remove').forEach(btn => {
    btn.addEventListener('click', () => { active[Number(btn.dataset.idx)].clear(); });
  });
}

function doFilter() { currentPage=1; loadListings(); updateFilterChips(); renderCards('areaGrid',allAreas,activeArea,onAreaClick,areasExpanded); renderCards('communityGrid',allCommunities,activeCommunity,onCommunityClick,commExpanded); }

// ── Load listings ─────────────────────────────────────────
async function loadListings() {
  const f = getFilters();
  const p = new URLSearchParams({ page: currentPage, limit: 25, sort: f.sort });
  if (f.area)      p.set('area', f.area);
  if (f.community) p.set('community', f.community);
  if (f.rooms)     p.set('rooms', f.rooms);
  if (f.offplan)   p.set('offplan', f.offplan);

  const body = document.getElementById('listingsBody');
  const cards = document.getElementById('listingCards');
  if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">Loading…</td></tr>`;
  if (cards) cards.innerHTML = '';

  try {
    const data = await fetch(`/api/properties?${p}`).then(r=>r.json());
    renderListings(data);
  } catch {
    if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">Failed to load.</td></tr>`;
  }
}

function renderListings({ total=0, page=1, pages=1, results=[] }) {
  setText('listingsSubtitle', `${fmtInt(total)} transaction${total!==1?'s':''}`);

  if (!results.length) {
    const m = `<tr><td colspan="9" class="loading-cell">No results.</td></tr>`;
    document.getElementById('listingsBody').innerHTML = m;
    document.getElementById('listingCards').innerHTML = '';
    renderPagination(0,1,1); return;
  }

  // Desktop table
  document.getElementById('listingsBody').innerHTML = results.map(r => {
    const off = (r.offplan||'').toLowerCase().includes('off');
    return `<tr>
      <td>${esc(r.project||'—')}</td><td class="dim">${esc(r.community||'—')}</td><td>${esc(r.area||'—')}</td>
      <td class="dim">${esc(r.rooms||'—')}</td><td class="num">${fmtInt(r.sizeSqft)}</td>
      <td class="num">${r.transValue>=1e6?(r.transValue/1e6).toFixed(2)+'M':fmtInt(r.transValue)}</td>
      <td class="num">${fmtInt(r.aedPerSqft)}</td><td class="dim">${fmtDate(r.date)}</td>
      <td><span class="badge ${off?'badge-offplan':'badge-ready'}">${off?'Off-Plan':'Ready'}</span></td>
    </tr>`;
  }).join('');

  // Mobile cards
  document.getElementById('listingCards').innerHTML = results.map(r => {
    const off = (r.offplan||'').toLowerCase().includes('off');
    return `
      <div class="listing-card">
        <div class="lc-top">
          <div class="lc-project">${esc(r.project||'—')}</div>
          <div class="lc-badge-wrap"><span class="badge ${off?'badge-offplan':'badge-ready'}">${off?'Off-Plan':'Ready'}</span></div>
        </div>
        <div class="lc-mid">
          <span class="lc-tag">${esc(r.area||'—')}</span>
          <span class="lc-tag">${esc(r.rooms||'—')}</span>
          <span class="lc-tag">${fmtInt(r.sizeSqft)} sqft</span>
        </div>
        <div class="lc-bottom">
          <div><div class="lc-price">AED ${r.transValue>=1e6?(r.transValue/1e6).toFixed(2)+'M':fmtInt(r.transValue)}</div>
               <div class="lc-psf">${fmtInt(r.aedPerSqft)} AED/sqft</div></div>
          <div class="lc-date">${fmtDate(r.date)}</div>
        </div>
      </div>`;
  }).join('');

  renderPagination(total, page, pages);
}

function renderPagination(total, page, pages) {
  const el = document.getElementById('pagination');
  if (!el) return;
  if (pages<=1) { el.innerHTML=''; return; }
  const nums=[];
  if (pages<=7) { for(let i=1;i<=pages;i++) nums.push(i); }
  else {
    nums.push(1); if(page>3) nums.push('…');
    for(let i=Math.max(2,page-1);i<=Math.min(pages-1,page+1);i++) nums.push(i);
    if(page<pages-2) nums.push('…'); nums.push(pages);
  }
  el.innerHTML = `
    <button class="page-btn" ${page<=1?'disabled':''} data-page="${page-1}">←</button>
    ${nums.map(n=>n==='…'?`<span class="page-ellipsis">…</span>`:`<button class="page-btn ${n===page?'active':''}" data-page="${n}">${n}</button>`).join('')}
    <button class="page-btn" ${page>=pages?'disabled':''} data-page="${page+1}">→</button>`;
  el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => { currentPage=Number(btn.dataset.page); loadListings(); window.scrollTo({top:0,behavior:'smooth'}); });
  });
}

// ── Developer Launches ─────────────────────────────────────
async function loadDeveloperLaunches() {
  try {
    const data = await fetch('/api/developer-launches').then(r=>r.json());
    renderDeveloperLaunches(data);
  } catch { setText('launchesSubtitle','Failed to load.'); }
}
function renderDeveloperLaunches({ developers=[], dateMax='' }) {
  const totalProj = developers.reduce((s,d)=>s+d.projectCount,0);
  setText('launchesSubtitle', `${developers.length} developers · ${fmtInt(totalProj)} active projects · through ${fmtMonth(dateMax)}`);
  const grid = document.getElementById('devGrid');
  if (!grid) return;
  grid.innerHTML = developers.map(dev => {
    const rows = dev.projects.slice(0,5).map(p=>`
      <div class="dev-project-row">
        <span class="dev-project-name">${esc(p.name)}</span>
        <span class="dev-project-psf">${fmtInt(p.medianPsf)} psf</span>
        ${p.isNew?'<span class="dev-project-new">NEW</span>':''}
      </div>`).join('');
    return `
      <div class="dev-card">
        <div class="dev-card-hd">
          <div class="dev-name">${esc(dev.developer)}</div>
          ${dev.newProjectCount>0?`<span class="dev-new-badge">+${dev.newProjectCount} new</span>`:''}
        </div>
        <div class="dev-stats">
          <div><div class="dev-stat-val gold">${fmtInt(dev.totalOffplan)}</div><div class="dev-stat-label">Off-plan tx</div></div>
          <div><div class="dev-stat-val">${dev.projectCount}</div><div class="dev-stat-label">Projects</div></div>
          <div><div class="dev-stat-val">${fmtInt(dev.medianPsf)}</div><div class="dev-stat-label">Med PSF</div></div>
        </div>
        <div class="dev-projects-hd">Active projects</div>
        ${rows}
      </div>`;
  }).join('');
}

// ── Smart Money ────────────────────────────────────────────
async function loadWeeklyTrends() {
  try {
    const data = await fetch('/api/weekly-trends').then(r=>r.json());
    renderWeeklyTrends(data);
  } catch { setText('smartDate','Failed to load.'); }
}
function renderWeeklyTrends({ dateRange, summary={}, volumeMovers=[], psfMovers=[], offplanSurge=[] }) {
  if (dateRange) setText('smartDate', `${fmtMonth(dateRange.from)} – ${fmtMonth(dateRange.to)}`);
  setText('kpiCount',   fmtInt(summary.count||0));
  setText('kpiVolume',  fmtAed(summary.volume||0));
  setText('kpiPsf',     fmtInt(summary.medianPsf||0));
  setText('kpiOffplan', `${summary.offplanPct||0}%`);

  const vmEl = document.getElementById('volumeMovers');
  if (vmEl) {
    if (!volumeMovers.length) { vmEl.innerHTML=`<p class="no-data">Insufficient data.</p>`; }
    else {
      const max = Math.max(...volumeMovers.map(m=>m.pctChange),1);
      vmEl.innerHTML = volumeMovers.map(m=>`
        <div class="mover-row">
          <div><div class="mover-area">${esc(m.area)}</div><div class="mover-count">${fmtInt(m.weekCount)} transactions</div>
            <div class="mover-bar-wrap"><div class="mover-bar" style="width:${Math.round(m.pctChange/max*100)}%"></div></div></div>
          <div><div class="mover-pct heat">${pctSign(m.pctChange)}</div><div class="mover-psf-detail">${fmtInt(m.medianPsf)} PSF</div></div>
        </div>`).join('');
    }
  }
  const pmEl = document.getElementById('psfMovers');
  if (pmEl) {
    if (!psfMovers.length) { pmEl.innerHTML=`<p class="no-data">Insufficient data.</p>`; }
    else {
      const max = Math.max(...psfMovers.map(m=>Math.abs(m.pctChange)),1);
      pmEl.innerHTML = psfMovers.map(m=>`
        <div class="mover-row">
          <div><div class="mover-area">${esc(m.area)}</div><div class="mover-count">${fmtInt(m.priorPsf)} → ${fmtInt(m.weekPsf)} AED/sqft</div>
            <div class="mover-bar-wrap"><div class="mover-bar ${m.pctChange>=0?'psf-up':'psf-down'}" style="width:${Math.round(Math.abs(m.pctChange)/max*100)}%"></div></div></div>
          <div><div class="mover-pct ${m.pctChange>=0?'up':'down'}">${pctSign(m.pctChange)}</div></div>
        </div>`).join('');
    }
  }
  const opEl = document.getElementById('offplanTags');
  if (opEl) opEl.innerHTML = offplanSurge.length
    ? offplanSurge.map(a=>`<div class="offplan-tag"><span class="offplan-tag-name">${esc(a.area)}</span><span class="offplan-tag-pct">${a.offplanPct}%</span></div>`).join('')
    : `<p class="no-data">No areas with ≥70% off-plan share this week.</p>`;
}

// ── Filter sheet (mobile) ─────────────────────────────────
function initFilterSheet() {
  const sheet    = document.getElementById('filterSheet');
  const backdrop = document.getElementById('filterBackdrop');
  const trigger  = document.getElementById('filterTrigger');
  const close    = document.getElementById('filterSheetClose');

  trigger?.addEventListener('click', () => { sheet.classList.add('open'); backdrop.classList.add('open'); });
  close?.addEventListener('click',   () => { sheet.classList.remove('open'); backdrop.classList.remove('open'); doFilter(); });
  backdrop?.addEventListener('click',() => { sheet.classList.remove('open'); backdrop.classList.remove('open'); doFilter(); });
}

// ── Helpers ────────────────────────────────────────────────
function setText(id, text) { const el=document.getElementById(id); if(el) el.textContent=text; }

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('areaGrid').innerHTML      = skeletons(CARD_LIMIT);
  document.getElementById('communityGrid').innerHTML = skeletons(CARD_LIMIT);

  initTabs();
  initSearch();
  initFilterSheet();

  loadMetadata().catch(console.error);
  loadListings().catch(console.error);
  loadDeveloperLaunches().catch(console.error);
  loadWeeklyTrends().catch(console.error);

  // Toggle expand
  document.getElementById('toggleAreas')?.addEventListener('click', () => {
    areasExpanded=!areasExpanded; renderCards('areaGrid',allAreas,activeArea,onAreaClick,areasExpanded); updateToggleBtn('toggleAreas',areasExpanded,allAreas.length);
  });
  document.getElementById('toggleCommunities')?.addEventListener('click', () => {
    commExpanded=!commExpanded; renderCards('communityGrid',allCommunities,activeCommunity,onCommunityClick,commExpanded); updateToggleBtn('toggleCommunities',commExpanded,allCommunities.length);
  });

  // Desktop filter changes
  ['filterAreaD','filterCommunityD','filterRoomsD','filterOffplanD','sortByD'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if(id==='filterAreaD')      { activeArea=document.getElementById('filterAreaD').value; renderCards('areaGrid',allAreas,activeArea,onAreaClick,areasExpanded); }
      if(id==='filterCommunityD') { activeCommunity=document.getElementById('filterCommunityD').value; renderCards('communityGrid',allCommunities,activeCommunity,onCommunityClick,commExpanded); }
      currentPage=1; loadListings(); updateFilterChips();
    });
  });

  // Reset (both desktop and mobile)
  ['resetFilters','resetFiltersD'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      activeArea=''; activeCommunity='';
      ['filterArea','filterCommunity','filterRooms','filterOffplan',
       'filterAreaD','filterCommunityD','filterRoomsD','filterOffplanD'].forEach(sid => {
        const el=document.getElementById(sid); if(el) el.selectedIndex=0;
      });
      renderCards('areaGrid',allAreas,'',onAreaClick,areasExpanded);
      renderCards('communityGrid',allCommunities,'',onCommunityClick,commExpanded);
      currentPage=1; loadListings(); updateFilterChips();
    });
  });

  // URL params
  const params = new URLSearchParams(location.search);
  if (params.get('area'))      { activeArea=params.get('area'); }
  if (params.get('community')) { activeCommunity=params.get('community'); }
  if (params.get('tab'))       { activateTab(params.get('tab')); }
});
