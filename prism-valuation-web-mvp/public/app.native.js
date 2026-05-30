/* PRISM Native App JS */

// ── Utils ─────────────────────────────────────────────────
const fmtM    = (v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : Number(v).toLocaleString();
const fmtN    = (v) => Number(v).toLocaleString();
const fmtDate = (s) => s ? s.slice(0,10) : '—';
const fmtMon  = (s) => { if (!s) return '—'; const d = new Date(s+'T00:00:00Z'); return d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}); };
const pct     = (n) => (n > 0 ? '+' : '') + n + '%';
const esc     = (s) => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const $       = (id) => document.getElementById(id);
const set     = (id, v) => { const e=$('$(id)'.slice(2,-1)); }; // unused, use setText
const setText = (id, t) => { const e=$(id); if(e) e.textContent=t; };

// ── State ─────────────────────────────────────────────────
let allAreas = [], allCommunities = [], allRooms = [];
let areaView = 'areas'; // 'areas' | 'communities'
let filters  = { area: '', community: '', rooms: '', offplan: '', sort: 'date' };
let page = 1;

// ── Screen navigation ─────────────────────────────────────
const SCREEN_TITLES = { discover:'Discover', areas:'Areas', offplan:'Off-Plan', trends:'Trends', listings:'Listings' };

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === id));
  const s = $(`screen-${id}`);
  if (s) { s.classList.add('active'); s.scrollTop = 0; }
  setText('topBarTitle', SCREEN_TITLES[id] || 'PRISM');
  // show search icon only on relevant screens
  const searchBtn = $('topBarSearch');
  if (searchBtn) searchBtn.style.display = id === 'listings' ? 'none' : '';
}

// ── Search overlay ────────────────────────────────────────
function openSearch() {
  $('searchOverlay').classList.add('open');
  setTimeout(() => $('searchInput').focus(), 80);
}
function closeSearch() {
  $('searchOverlay').classList.remove('open');
  $('searchInput').value = '';
  renderSearchResults('');
}

function renderSearchResults(q) {
  const body = $('searchBody');
  if (!q) {
    body.innerHTML = `<div class="search-hint"><p>Search across <strong id="searchHintAreas">${fmtN(allAreas.length)}</strong> areas and <strong>${fmtN(allCommunities.length)}</strong> communities</p></div>`;
    return;
  }
  const qL = q.toLowerCase();
  const matchA = allAreas.filter(a => a.name.toLowerCase().includes(qL)).slice(0,6);
  const matchC = allCommunities.filter(c => c.name.toLowerCase().includes(qL)).slice(0,6);

  let html = '';
  if (matchA.length) {
    html += `<div class="sr-section-label">Areas</div>`;
    html += matchA.map(a => `
      <div class="sr-item" data-type="area" data-val="${esc(a.name)}">
        <div class="sr-ico">📍</div>
        <div><div class="sr-name">${esc(a.name)}</div><div class="sr-meta">${fmtN(a.count)} tx · ${fmtN(a.medianPsf)} PSF</div></div>
        <div class="sr-arrow">›</div>
      </div>`).join('');
  }
  if (matchC.length) {
    html += `<div class="sr-section-label">Communities</div>`;
    html += matchC.map(c => `
      <div class="sr-item" data-type="community" data-val="${esc(c.name)}">
        <div class="sr-ico">🏘️</div>
        <div><div class="sr-name">${esc(c.name)}</div><div class="sr-meta">${fmtN(c.count)} tx · ${c.areaCount} sub-areas</div></div>
        <div class="sr-arrow">›</div>
      </div>`).join('');
  }
  if (!html) html = `<div class="search-hint"><p style="color:var(--muted)">No results for "${esc(q)}"</p></div>`;
  body.innerHTML = html;

  body.querySelectorAll('.sr-item').forEach(el => {
    el.addEventListener('click', () => {
      const { type, val } = el.dataset;
      if (type === 'area')      { filters.area = val; }
      if (type === 'community') { filters.community = val; }
      closeSearch(); showScreen('listings'); page = 1; loadListings(); updatePills();
    });
  });
}

// ── Load metadata ─────────────────────────────────────────
async function loadMeta() {
  const [mr, cr] = await Promise.all([fetch('/api/metadata'), fetch('/api/communities?limit=200')]);
  const meta = await mr.json();
  const comm = await cr.json();

  const topMap = new Map((meta.topAreas||[]).map(a=>[a.label,a]));
  allAreas = (meta.areas||[]).map(n => { const t=topMap.get(n); return {name:n,count:t?.count||0,medianPsf:t?.medianPsf||0}; }).sort((a,b)=>b.count-a.count);
  allCommunities = comm.communities || [];
  allRooms = meta.rooms || [];

  // Hero stats
  setText('hsTx',    fmtN(meta.cleanRows));
  setText('hsAreas', fmtN(meta.areas?.length||0));
  setText('hsPsf',   fmtN(Math.round(meta.medianPsf)));

  // Top areas horizontal
  const tai = $('topAreasInner');
  if (tai) tai.innerHTML = allAreas.slice(0,12).map(a => `
    <div class="h-area-card" data-area="${esc(a.name)}">
      <div class="hac-name">${esc(a.name)}</div>
      <div class="hac-count">${fmtN(a.count)}</div>
      <div class="hac-label">transactions</div>
      <div class="hac-psf">${fmtN(a.medianPsf)} AED/sqft</div>
    </div>`).join('');
  tai?.querySelectorAll('.h-area-card').forEach(c => c.addEventListener('click', () => {
    filters.area = c.dataset.area; showScreen('listings'); page=1; loadListings(); updatePills();
  }));

  // Populate filter selects
  populateSel('fArea',      allAreas.map(a=>a.name));
  populateSel('fCommunity', allCommunities.map(c=>c.name));
  renderRoomPills();

  // Render area grid
  renderAreaGrid();
}

function populateSel(id, items) {
  const s = $(id); if (!s) return;
  const first = s.options[0].cloneNode(true); s.innerHTML=''; s.appendChild(first);
  items.forEach(v => { const o=document.createElement('option'); o.value=v; o.textContent=v; s.appendChild(o); });
}

function renderRoomPills() {
  const el = $('roomPills'); if (!el) return;
  el.innerHTML = `<button class="psel${!filters.rooms?' active':''}" data-val="">Any</button>` +
    allRooms.map(r => `<button class="psel${filters.rooms===r?' active':''}" data-val="${esc(r)}">${esc(r)}</button>`).join('');
  el.querySelectorAll('.psel').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('.psel').forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); filters.rooms = b.dataset.val;
  }));
}

// ── Area grid ─────────────────────────────────────────────
function renderAreaGrid(q = '') {
  const grid = $('areaGrid'); if (!grid) return;
  const items = areaView === 'areas' ? allAreas : allCommunities;
  const filtered = q ? items.filter(i => i.name.toLowerCase().includes(q.toLowerCase())) : items;

  grid.innerHTML = filtered.map((item, i) => `
    <div class="area-card" data-name="${esc(item.name)}" data-view="${areaView}">
      <div class="ac-rank">#${i+1}</div>
      <div class="ac-name">${esc(item.name)}</div>
      <div class="ac-count">${fmtN(item.count)}</div>
      <div class="ac-label">transactions</div>
      <div class="ac-psf">${fmtN(item.medianPsf)} AED/sqft</div>
    </div>`).join('');

  grid.querySelectorAll('.area-card').forEach(c => c.addEventListener('click', () => {
    const { name, view } = c.dataset;
    if (view === 'areas')       filters.area = name;
    if (view === 'communities') filters.community = name;
    showScreen('listings'); page=1; loadListings(); updatePills();
  }));
}

// ── Developer launches ────────────────────────────────────
async function loadDevLaunches() {
  try {
    const d = await fetch('/api/developer-launches').then(r=>r.json());
    renderDevs(d);
  } catch { setText('launchesInfo','Failed to load.'); }
}
function renderDevs({ developers=[], dateMax='' }) {
  setText('launchesInfo', `${developers.length} developers · through ${fmtMon(dateMax)}`);
  const list = $('devList'); if (!list) return;
  list.innerHTML = developers.map(dev => {
    const projs = dev.projects.slice(0,5).map(p=>`
      <div class="dc-proj-row">
        <span class="dc-proj-name">${esc(p.name)}</span>
        <span class="dc-proj-psf">${fmtN(p.medianPsf)} psf</span>
        ${p.isNew?'<span class="dc-new-tag">NEW</span>':''}
      </div>`).join('');
    return `
      <div class="dev-card">
        <div class="dc-top">
          <div class="dc-name">${esc(dev.developer)}</div>
          ${dev.newProjectCount>0?`<span class="dc-new">+${dev.newProjectCount} new</span>`:''}
        </div>
        <div class="dc-stats">
          <div class="dc-stat"><div class="dc-stat-n gold">${fmtN(dev.totalOffplan)}</div><div class="dc-stat-l">Off-plan tx</div></div>
          <div class="dc-stat"><div class="dc-stat-n">${dev.projectCount}</div><div class="dc-stat-l">Projects</div></div>
          <div class="dc-stat"><div class="dc-stat-n">${fmtN(dev.medianPsf)}</div><div class="dc-stat-l">Med PSF</div></div>
        </div>
        <div class="dc-projects">
          <div class="dc-proj-hd">Active projects</div>
          ${projs}
        </div>
      </div>`;
  }).join('');

  // Top devs horizontal on discover
  const tdi = $('topDevsInner');
  if (tdi) tdi.innerHTML = developers.slice(0,8).map(dev=>`
    <div class="h-dev-card">
      <div class="hdc-name">${esc(dev.developer)}</div>
      <div class="hdc-tx">${fmtN(dev.totalOffplan)}</div>
      <div class="hdc-label">off-plan tx</div>
      <div class="hdc-psf">${fmtN(dev.medianPsf)} AED/sqft</div>
    </div>`).join('');
}

// ── Weekly trends ─────────────────────────────────────────
async function loadTrends() {
  try {
    const d = await fetch('/api/weekly-trends').then(r=>r.json());
    renderTrends(d);
  } catch { setText('weekRange','Failed to load.'); }
}
function renderTrends({ dateRange, summary={}, volumeMovers=[], psfMovers=[], offplanSurge=[] }) {
  if (dateRange) setText('weekRange', `Week of ${fmtMon(dateRange.from)} – ${fmtMon(dateRange.to)}`);
  setText('kpiTx',  fmtN(summary.count||0));
  setText('kpiVol', fmtM(summary.volume||0));
  setText('kpiPsf', fmtN(summary.medianPsf||0));
  setText('kpiOp',  `${summary.offplanPct||0}%`);

  // Smart preview on discover
  const sp = $('smartPreview');
  if (sp && volumeMovers.length) {
    const items = volumeMovers.slice(0,2).map(m=>({label:'🔥 Heating Up', area:m.area, pct:pct(m.pctChange), cls:'heat', meta:`${fmtN(m.weekCount)} tx this week`}))
      .concat(psfMovers.slice(0,2).map(m=>({label:'📈 PSF Move', area:m.area, pct:pct(m.pctChange), cls:m.pctChange>=0?'up':'down', meta:`${fmtN(m.weekPsf)} AED/sqft`})));
    sp.innerHTML = `<div class="smart-preview-grid">${items.map(i=>`
      <div class="sp-card">
        <div class="sp-label">${i.label}</div>
        <div class="sp-area">${esc(i.area)}</div>
        <div class="sp-pct ${i.cls}">${i.pct}</div>
        <div class="sp-meta">${i.meta}</div>
      </div>`).join('')}</div>`;
  } else if (sp) sp.innerHTML = `<p style="color:var(--muted);font-size:13px;padding:8px 0">No data available</p>`;

  // Volume movers
  const vm = $('volMovers');
  const maxV = Math.max(...volumeMovers.map(m=>m.pctChange),1);
  if (vm) vm.innerHTML = volumeMovers.length
    ? volumeMovers.map(m=>`
      <div class="mover-row">
        <div class="mover-body">
          <div class="mover-name">${esc(m.area)}</div>
          <div class="mover-meta">${fmtN(m.weekCount)} transactions this week</div>
          <div class="mover-bar-track"><div class="mover-bar-fill heat" style="width:${Math.round(m.pctChange/maxV*100)}%"></div></div>
        </div>
        <div class="mover-pct heat">${pct(m.pctChange)}</div>
      </div>`).join('')
    : `<p class="no-data">Insufficient data for this period.</p>`;

  const pm = $('psfMovers');
  const maxP = Math.max(...psfMovers.map(m=>Math.abs(m.pctChange)),1);
  if (pm) pm.innerHTML = psfMovers.length
    ? psfMovers.map(m=>{
        const up = m.pctChange >= 0;
        return `
          <div class="mover-row">
            <div class="mover-body">
              <div class="mover-name">${esc(m.area)}</div>
              <div class="mover-meta">${fmtN(m.priorPsf)} → ${fmtN(m.weekPsf)} AED/sqft</div>
              <div class="mover-bar-track"><div class="mover-bar-fill ${up?'up':'down'}" style="width:${Math.round(Math.abs(m.pctChange)/maxP*100)}%"></div></div>
            </div>
            <div class="mover-pct ${up?'up':'down'}">${pct(m.pctChange)}</div>
          </div>`;
      }).join('')
    : `<p class="no-data">Insufficient data for this period.</p>`;

  const sl = $('surgeList');
  if (sl) sl.innerHTML = offplanSurge.length
    ? offplanSurge.map(a=>`<div class="surge-tag"><span class="surge-name">${esc(a.area)}</span><span class="surge-pct">${a.offplanPct}%</span></div>`).join('')
    : `<p class="no-data">No areas with ≥70% off-plan share this week.</p>`;
}

// ── Listings ──────────────────────────────────────────────
async function loadListings() {
  const p2 = new URLSearchParams({ page, limit: 20, sort: filters.sort });
  if (filters.area)      p2.set('area', filters.area);
  if (filters.community) p2.set('community', filters.community);
  if (filters.rooms)     p2.set('rooms', filters.rooms);
  if (filters.offplan)   p2.set('offplan', filters.offplan);

  const cards = $('propCards');
  if (cards) cards.innerHTML = '<div class="list-loading">Loading…</div>';
  $('pagination').innerHTML = '';

  try {
    const d = await fetch(`/api/properties?${p2}`).then(r=>r.json());
    renderListings(d);
  } catch {
    if (cards) cards.innerHTML = '<div class="list-loading">Failed to load.</div>';
  }
}

function renderListings({ total=0, page:pg=1, pages=1, results=[] }) {
  setText('listingsCount', `${fmtN(total)} transaction${total!==1?'s':''}`);
  const cards = $('propCards');
  if (!results.length) {
    cards.innerHTML = '<div class="list-loading">No results match your filters.</div>';
    renderPag(0,1,1); return;
  }
  cards.innerHTML = results.map(r => {
    const off = (r.offplan||'').toLowerCase().includes('off');
    return `
      <div class="prop-card">
        <div class="pc-top">
          <div class="pc-project">${esc(r.project||'—')}</div>
          <div class="pc-status"><span class="badge ${off?'badge-off':'badge-ready'}">${off?'Off-Plan':'Ready'}</span></div>
        </div>
        <div class="pc-tags">
          <span class="pc-tag">${esc(r.area||'—')}</span>
          <span class="pc-tag">${esc(r.community||'—')}</span>
          ${r.rooms?`<span class="pc-tag">${esc(r.rooms)}</span>`:''}
          <span class="pc-tag">${fmtN(r.sizeSqft)} sqft</span>
        </div>
        <div class="pc-bottom">
          <div>
            <div class="pc-price">AED ${r.transValue>=1e6?(r.transValue/1e6).toFixed(2)+'M':fmtN(r.transValue)}</div>
            <div class="pc-psf">${fmtN(r.aedPerSqft)} AED/sqft</div>
          </div>
          <div class="pc-date">${fmtDate(r.date)}</div>
        </div>
      </div>`;
  }).join('');
  renderPag(total, pg, pages);
}

function renderPag(total, pg, pages) {
  const el = $('pagination'); if (!el||pages<=1) { if(el)el.innerHTML=''; return; }
  const nums = [];
  if (pages<=7) { for(let i=1;i<=pages;i++) nums.push(i); }
  else {
    nums.push(1); if(pg>3) nums.push('…');
    for(let i=Math.max(2,pg-1);i<=Math.min(pages-1,pg+1);i++) nums.push(i);
    if(pg<pages-2) nums.push('…'); nums.push(pages);
  }
  el.innerHTML = `
    <button class="pg-btn" ${pg<=1?'disabled':''} data-p="${pg-1}">←</button>
    ${nums.map(n=>n==='…'?`<span class="pg-dots">…</span>`:`<button class="pg-btn${n===pg?' cur':''}" data-p="${n}">${n}</button>`).join('')}
    <button class="pg-btn" ${pg>=pages?'disabled':''} data-p="${pg+1}">→</button>`;
  el.querySelectorAll('.pg-btn[data-p]').forEach(b=>b.addEventListener('click',()=>{ page=Number(b.dataset.p); loadListings(); $('screen-listings').scrollTop=0; }));
}

// ── Filter pills ──────────────────────────────────────────
function updatePills() {
  const row = $('pillRow'); if (!row) return;
  const active = [];
  if (filters.area)      active.push({ label: filters.area,      clear: ()=>{ filters.area=''; go(); } });
  if (filters.community) active.push({ label: filters.community, clear: ()=>{ filters.community=''; go(); } });
  if (filters.rooms)     active.push({ label: filters.rooms,     clear: ()=>{ filters.rooms=''; go(); } });
  if (filters.offplan)   active.push({ label: filters.offplan,   clear: ()=>{ filters.offplan=''; go(); } });

  row.innerHTML = active.map((a,i)=>`<div class="pill">${esc(a.label)}<span class="pill-x" data-i="${i}">✕</span></div>`).join('');
  row.querySelectorAll('.pill-x').forEach(x=>x.addEventListener('click',()=>active[Number(x.dataset.i)].clear()));

  const fc = $('filterCount');
  if (fc) { fc.textContent=active.length; fc.hidden=!active.length; }

  function go() { page=1; loadListings(); updatePills(); }
}

// ── Filter sheet ──────────────────────────────────────────
function openSheet() {
  $('fArea').value = filters.area;
  $('fCommunity').value = filters.community;
  renderRoomPills();
  // status pills
  $('statusPills').querySelectorAll('.psel').forEach(b => b.classList.toggle('active', b.dataset.val === filters.offplan));
  // sort pills
  $('sortPills').querySelectorAll('.psel').forEach(b => b.classList.toggle('active', b.dataset.val === filters.sort));
  $('filterSheet').classList.add('open');
  $('sheetBackdrop').classList.add('open');
}
function closeSheet() {
  $('filterSheet').classList.remove('open');
  $('sheetBackdrop').classList.remove('open');
}
function applySheet() {
  filters.area      = $('fArea').value;
  filters.community = $('fCommunity').value;
  filters.rooms     = $('roomPills').querySelector('.psel.active')?.dataset.val || '';
  filters.offplan   = $('statusPills').querySelector('.psel.active')?.dataset.val || '';
  filters.sort      = $('sortPills').querySelector('.psel.active')?.dataset.val || 'date';
  closeSheet(); page=1; loadListings(); updatePills();
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  // Bottom nav
  document.querySelectorAll('.bnav-btn').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.screen)));

  // Discover "more" buttons
  document.querySelectorAll('.section-more[data-goto]').forEach(b => b.addEventListener('click', () => showScreen(b.dataset.goto)));

  // Search
  $('topBarSearch')?.addEventListener('click', openSearch);
  $('searchCancel')?.addEventListener('click', closeSearch);
  $('searchInput')?.addEventListener('input', e => renderSearchResults(e.target.value.trim()));

  // Area screen chips
  document.querySelectorAll('.chip[data-view]').forEach(c => c.addEventListener('click', () => {
    document.querySelectorAll('.chip[data-view]').forEach(x=>x.classList.remove('active'));
    c.classList.add('active'); areaView = c.dataset.view; renderAreaGrid($('areaSearch').value||'');
  }));

  // Area search
  $('areaSearch')?.addEventListener('input', e => renderAreaGrid(e.target.value));

  // Filter sheet
  $('filterBtn')?.addEventListener('click', openSheet);
  $('sheetBackdrop')?.addEventListener('click', closeSheet);
  $('sheetApply')?.addEventListener('click', applySheet);
  $('sheetReset')?.addEventListener('click', () => {
    filters = { area:'', community:'', rooms:'', offplan:'', sort:'date' };
    closeSheet(); page=1; loadListings(); updatePills();
  });

  // Pill-select single-choice
  ['statusPills','sortPills'].forEach(id => {
    $(id)?.addEventListener('click', e => {
      const btn = e.target.closest('.psel'); if (!btn) return;
      $(id).querySelectorAll('.psel').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Load all data
  loadMeta().catch(console.error);
  loadDevLaunches().catch(console.error);
  loadTrends().catch(console.error);
  loadListings().catch(console.error);

  // Handle URL params
  const p = new URLSearchParams(location.search);
  if (p.get('screen')) showScreen(p.get('screen'));
  if (p.get('area'))   { filters.area = p.get('area'); showScreen('listings'); updatePills(); loadListings(); }
});
