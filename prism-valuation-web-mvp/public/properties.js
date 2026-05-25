/* PRISM — Properties Landing Page */

// ── Formatters ────────────────────────────────────────────
const fmtAed  = (v) => v >= 1e6 ? `AED ${(v/1e6).toFixed(2)}M` : `AED ${v.toLocaleString()}`;
const fmtPsf  = (v) => `${Math.round(v).toLocaleString()} AED/sqft`;
const fmtInt  = (v) => Number(v).toLocaleString();
const fmtDate = (s) => s ? s.slice(0,10) : '—';

// ── State ─────────────────────────────────────────────────
let allAreas       = [];   // { name, count, medianPsf } sorted by count
let allCommunities = [];   // { name, count, medianPsf, areaCount }
let allRooms       = [];
let currentPage    = 1;
let activeArea     = '';
let activeCommunity = '';
let areasExpanded  = false;
let commExpanded   = false;
const CARD_LIMIT   = 12;

// ── Skeleton placeholder ───────────────────────────────────
function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="card-skeleton">
      <div class="skel-line wide"></div>
      <div class="skel-line mid" style="margin-top:14px"></div>
      <div class="skel-line short"></div>
    </div>`).join('');
}

// ── Area & Community cards ────────────────────────────────
function renderCards(containerId, items, activeVal, onClickFn, expanded) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = items.map((item, i) => {
    const hidden = !expanded && i >= CARD_LIMIT ? 'card-hidden' : '';
    const active = item.name === activeVal ? 'active' : '';
    return `
      <div class="prop-card ${active} ${hidden}" data-name="${escAttr(item.name)}" role="button" tabindex="0">
        <div class="card-name">${esc(item.name)}</div>
        <div class="card-stats">
          <div class="card-stat">
            <span class="card-stat-label">Transactions</span>
            <span class="card-stat-val accent">${fmtInt(item.count)}</span>
          </div>
          <div class="card-stat">
            <span class="card-stat-label">Median PSF</span>
            <span class="card-stat-val">${fmtInt(item.medianPsf)}</span>
          </div>
          ${item.areaCount != null ? `
          <div class="card-stat">
            <span class="card-stat-label">Areas</span>
            <span class="card-stat-val">${item.areaCount}</span>
          </div>` : ''}
        </div>
      </div>`;
  }).join('');

  el.querySelectorAll('.prop-card').forEach((card) => {
    const name = card.dataset.name;
    card.addEventListener('click', () => onClickFn(name));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onClickFn(name); });
  });
}

function updateToggleBtn(btnId, expanded, total) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.textContent = expanded ? 'Show less' : `Show all ${total}`;
  btn.dataset.expanded = expanded;
}

// ── Load metadata ─────────────────────────────────────────
async function loadMetadata() {
  const [metaRes, commRes] = await Promise.all([
    fetch('/api/metadata'),
    fetch('/api/communities?limit=100'),
  ]);
  const meta = await metaRes.json();
  const commData = await commRes.json();

  allAreas = meta.topAreas
    ? [...(await buildAllAreas(meta))]
    : [];
  allCommunities = commData.communities || [];
  allRooms = meta.rooms || [];

  // Hero stats
  const heroEl = document.getElementById('heroStats');
  if (heroEl) {
    heroEl.innerHTML =
      `<strong>${fmtInt(meta.cleanRows)}</strong> transactions · ` +
      `<strong>${meta.areas?.length || 0}</strong> areas · ` +
      `<strong>${commData.total || 0}</strong> communities · ` +
      `data up to <strong>${fmtDate(meta.dateMax)}</strong>`;
  }

  // Populate area subtitle
  const areaSub = document.getElementById('areaSubtitle');
  if (areaSub) areaSub.textContent = `${meta.areas?.length || 0} areas with residential sales`;

  // Community subtitle
  const commSub = document.getElementById('communitySubtitle');
  if (commSub) commSub.textContent = `${commData.total || 0} master communities`;

  // Populate filter dropdowns
  populateSelect('filterArea', allAreas.map(a => a.name));
  populateSelect('filterCommunity', allCommunities.map(c => c.name));
  populateSelect('filterRooms', allRooms);

  // Render cards
  renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
  updateToggleBtn('toggleAreas', areasExpanded, allAreas.length);

  renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
  updateToggleBtn('toggleCommunities', commExpanded, allCommunities.length);
}

async function buildAllAreas(meta) {
  // Use metadata areas list with topAreas stats, filling in extras
  const topMap = new Map((meta.topAreas || []).map(a => [a.label, a]));
  return (meta.areas || []).map(name => {
    const t = topMap.get(name);
    return { name, count: t?.count || 0, medianPsf: t?.medianPsf || 0 };
  }).sort((a, b) => b.count - a.count);
}

function populateSelect(id, items) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const current = sel.value;
  const first = sel.options[0];
  sel.innerHTML = '';
  sel.appendChild(first.cloneNode(true));
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

// ── Click handlers ─────────────────────────────────────────
function onAreaClick(name) {
  if (activeArea === name) {
    activeArea = '';
    document.getElementById('filterArea').value = '';
  } else {
    activeArea = name;
    document.getElementById('filterArea').value = name;
  }
  renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
  currentPage = 1;
  loadListings();
  document.getElementById('listingsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onCommunityClick(name) {
  if (activeCommunity === name) {
    activeCommunity = '';
    document.getElementById('filterCommunity').value = '';
  } else {
    activeCommunity = name;
    document.getElementById('filterCommunity').value = name;
  }
  renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
  currentPage = 1;
  loadListings();
  document.getElementById('listingsSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Load listings ─────────────────────────────────────────
async function loadListings() {
  const area      = document.getElementById('filterArea')?.value || '';
  const community = document.getElementById('filterCommunity')?.value || '';
  const rooms     = document.getElementById('filterRooms')?.value || '';
  const offplan   = document.getElementById('filterOffplan')?.value || '';
  const sort      = document.getElementById('sortBy')?.value || 'date';

  const params = new URLSearchParams({ page: currentPage, limit: 25, sort });
  if (area)      params.set('area', area);
  if (community) params.set('community', community);
  if (rooms)     params.set('rooms', rooms);
  if (offplan)   params.set('offplan', offplan);

  const body = document.getElementById('listingsBody');
  if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">Loading…</td></tr>`;

  try {
    const res  = await fetch(`/api/properties?${params}`);
    const data = await res.json();
    renderListings(data);
  } catch {
    if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">Failed to load data.</td></tr>`;
  }
}

function renderListings({ total, page, pages, results }) {
  const body = document.getElementById('listingsBody');
  const sub  = document.getElementById('listingsSubtitle');

  if (sub) sub.textContent = `${fmtInt(total)} transaction${total !== 1 ? 's' : ''}`;

  if (!results || results.length === 0) {
    if (body) body.innerHTML = `<tr><td colspan="9" class="loading-cell">No transactions match the selected filters.</td></tr>`;
    renderPagination(0, 1, 1);
    return;
  }

  body.innerHTML = results.map(r => {
    const isOffplan = (r.offplan || '').toLowerCase().includes('off');
    const badge = isOffplan
      ? '<span class="badge badge-offplan">Off-Plan</span>'
      : '<span class="badge badge-ready">Ready</span>';
    return `
      <tr>
        <td>${esc(r.project || '—')}</td>
        <td class="muted">${esc(r.community || '—')}</td>
        <td>${esc(r.area || '—')}</td>
        <td class="muted">${esc(r.rooms || '—')}</td>
        <td class="num">${fmtInt(r.sizeSqft)}</td>
        <td class="num">${fmtAed(r.transValue)}</td>
        <td class="num">${fmtInt(r.aedPerSqft)}</td>
        <td class="muted">${fmtDate(r.date)}</td>
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
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) nums.push(i);
  } else {
    nums.push(1);
    if (page > 3) nums.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) nums.push(i);
    if (page < pages - 2) nums.push('…');
    nums.push(pages);
  }

  el.innerHTML = `
    <button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">←</button>
    ${nums.map(n => n === '…'
      ? `<span class="page-ellipsis">…</span>`
      : `<button class="page-btn ${n === page ? 'active' : ''}" data-page="${n}">${n}</button>`
    ).join('')}
    <button class="page-btn" ${page >= pages ? 'disabled' : ''} data-page="${page + 1}">→</button>
  `;

  el.querySelectorAll('.page-btn[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      loadListings();
      document.getElementById('tableWrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
}

// ── Search (filters area/community cards) ─────────────────
function applySearch(q) {
  const term = q.trim().toLowerCase();
  const clearBtn = document.getElementById('searchClear');
  if (clearBtn) clearBtn.hidden = !term;

  ['areaGrid', 'communityGrid'].forEach(gridId => {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    grid.querySelectorAll('.prop-card').forEach(card => {
      const name = card.dataset.name.toLowerCase();
      const match = !term || name.includes(term);
      card.style.display = match ? '' : 'none';
    });
  });
}

// ── Escape helpers ─────────────────────────────────────────
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function escAttr(s) { return esc(s); }

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Load skeletons
  document.getElementById('areaGrid').innerHTML = skeletons(CARD_LIMIT);
  document.getElementById('communityGrid').innerHTML = skeletons(CARD_LIMIT);

  // Load data
  loadMetadata().catch(console.error);
  loadListings().catch(console.error);

  // Search input
  const searchInput = document.getElementById('searchInput');
  searchInput?.addEventListener('input', () => applySearch(searchInput.value));

  document.getElementById('searchClear')?.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
  });

  // Toggle show all areas
  document.getElementById('toggleAreas')?.addEventListener('click', () => {
    areasExpanded = !areasExpanded;
    renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
    updateToggleBtn('toggleAreas', areasExpanded, allAreas.length);
  });

  // Toggle show all communities
  document.getElementById('toggleCommunities')?.addEventListener('click', () => {
    commExpanded = !commExpanded;
    renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
    updateToggleBtn('toggleCommunities', commExpanded, allCommunities.length);
  });

  // Filter dropdowns
  ['filterArea', 'filterCommunity', 'filterRooms', 'filterOffplan', 'sortBy'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'filterArea') {
        activeArea = document.getElementById('filterArea').value;
        renderCards('areaGrid', allAreas, activeArea, onAreaClick, areasExpanded);
      }
      if (id === 'filterCommunity') {
        activeCommunity = document.getElementById('filterCommunity').value;
        renderCards('communityGrid', allCommunities, activeCommunity, onCommunityClick, commExpanded);
      }
      currentPage = 1;
      loadListings();
    });
  });

  // Reset
  document.getElementById('resetFilters')?.addEventListener('click', () => {
    activeArea = '';
    activeCommunity = '';
    ['filterArea','filterCommunity','filterRooms','filterOffplan','sortBy'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.selectedIndex = 0;
    });
    renderCards('areaGrid', allAreas, '', onAreaClick, areasExpanded);
    renderCards('communityGrid', allCommunities, '', onCommunityClick, commExpanded);
    currentPage = 1;
    loadListings();
  });

  // Handle URL params (e.g. /properties.html?area=BUSINESS+BAY)
  const params = new URLSearchParams(location.search);
  const paramArea = params.get('area');
  const paramComm = params.get('community');
  if (paramArea) {
    activeArea = paramArea;
    const sel = document.getElementById('filterArea');
    if (sel) sel.value = paramArea;
  }
  if (paramComm) {
    activeCommunity = paramComm;
    const sel = document.getElementById('filterCommunity');
    if (sel) sel.value = paramComm;
  }
});
