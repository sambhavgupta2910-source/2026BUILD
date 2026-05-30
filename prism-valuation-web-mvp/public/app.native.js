/* Elevate Homes — Dubai Investment Insights */

const fmtM   = (v) => v >= 1e9 ? `${(v/1e9).toFixed(1)}B` : v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : Number(v).toLocaleString();
const fmtN   = (v) => Number(v).toLocaleString();
const fmtAED = (v) => v >= 1e6 ? `AED ${(v/1e6).toFixed(1)}M` : `AED ${fmtN(Math.round(v))}`;

function daysAgo(dateStr) {
  const d = Math.round((Date.now() - new Date(dateStr)) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Yesterday';
  return `${d}d ago`;
}
function isThisWeek(dateStr) {
  return Math.round((Date.now() - new Date(dateStr)) / 86400000) <= 7;
}

const SCREEN_TITLES = { discover: 'Discover', offplan: 'Off-Plan', trends: 'Trends', areas: 'Areas', inquiries: 'My Leads' };

let allListings     = [];
let filteredListings = [];
let activeDevFilter  = 'All';
let currentListing   = null;
let myLeads = JSON.parse(localStorage.getItem('elevate_leads') || '[]');
let agentWhatsapp   = '';

// Load agent WhatsApp number from server config
fetch('/api/config').then((r) => r.json()).then((d) => { agentWhatsapp = d.agentWhatsapp || ''; }).catch(() => {});

// ── Navigation ────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.bnav-btn').forEach((b) => b.classList.remove('active'));
  const screen = document.getElementById(`screen-${id}`);
  if (screen) screen.classList.add('active');
  const btn = document.querySelector(`[data-screen="${id}"]`);
  if (btn) btn.classList.add('active');
  document.getElementById('topBarTitle').textContent = SCREEN_TITLES[id] || id;
  if (id === 'offplan' && allListings.length) renderListings();
  if (id === 'trends') loadTrends();
  if (id === 'areas') loadAreas();
  if (id === 'inquiries') renderLeads();
}
document.querySelectorAll('.bnav-btn').forEach((btn) => {
  btn.addEventListener('click', () => showScreen(btn.dataset.screen));
});

// ── Search Overlay ────────────────────────────────────────
const searchOverlay = document.getElementById('searchOverlay');
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

document.getElementById('topBarSearch').addEventListener('click', () => {
  searchOverlay.classList.add('open');
  searchInput.focus();
});
document.getElementById('searchCancel').addEventListener('click', closeSearch);
function closeSearch() {
  searchOverlay.classList.remove('open');
  searchInput.value = '';
  searchResults.innerHTML = '';
}
searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.innerHTML = ''; return; }
  const hits = allListings.filter((l) =>
    l.project.toLowerCase().includes(q) || l.developer.toLowerCase().includes(q) || l.area.toLowerCase().includes(q)
  ).slice(0, 10);
  searchResults.innerHTML = hits.length
    ? hits.map((l) => `<div class="search-result-item" data-id="${l.id}">
        <div class="sri-label">${l.project}</div>
        <div class="sri-sub">${l.developer} · ${l.area} · ${fmtAED(l.priceFrom)}</div>
      </div>`).join('')
    : '<div style="padding:24px;text-align:center;color:var(--muted)">No results</div>';
  searchResults.querySelectorAll('.search-result-item').forEach((el) => {
    el.addEventListener('click', () => {
      const listing = allListings.find((l) => l.id === el.dataset.id);
      if (listing) { closeSearch(); openSheet(listing); }
    });
  });
});

// ── Status helpers ────────────────────────────────────────
function statusClass(s) {
  if (!s) return 'status-available';
  const l = s.toLowerCase();
  if (l.includes('fast') || l.includes('hot')) return 'status-hot';
  if (l.includes('limited') || l.includes('final')) return 'status-limited';
  if (l.includes('launch')) return 'status-launching';
  if (l.includes('ready') || l.includes('soon')) return 'status-ready';
  return 'status-available';
}

// Build a CSS background for a card — photo if available, gradient fallback
function cardBg(listing) {
  if (listing.image) {
    return `url("${listing.image}") center/cover no-repeat`;
  }
  return `linear-gradient(135deg, ${listing.color || '#1a1a2e'} 0%, #050810 100%)`;
}

// ── Discover Screen ───────────────────────────────────────
function renderDiscover(listings) {
  const featured   = listings.filter((l) => l.featured);
  const newThisWeek = listings.filter((l) => l.launchDate && isThisWeek(l.launchDate));

  // ── Hero card (first featured)
  const hero = featured[0];
  if (hero) {
    const heroEl = document.getElementById('discoverHero');
    heroEl.style.background = cardBg(hero);
    heroEl.style.backgroundSize = 'cover';
    heroEl.style.backgroundPosition = 'center';
    document.getElementById('dhProject').textContent = hero.project;
    document.getElementById('dhDev').textContent = `by ${hero.developer} · ${hero.area}`;
    document.getElementById('dhPrice').textContent = `From ${fmtAED(hero.priceFrom)}`;
    document.getElementById('dhTags').innerHTML = hero.tags.map((t) => `<span class="dh-tag">${t}</span>`).join('');
    document.getElementById('dhCta').onclick = () => openSheet(hero);
    heroEl.onclick = (e) => { if (!e.target.classList.contains('dh-cta')) openSheet(hero); };
  }

  // ── New This Week section
  const newSection = document.getElementById('newThisWeekSection');
  const newScroll  = document.getElementById('newThisWeek');
  if (newThisWeek.length) {
    newSection.style.display = '';
    newScroll.innerHTML = newThisWeek.map((l) => `
      <div class="new-card" data-id="${l.id}">
        <div class="nc-img" style="background:${cardBg(l)};background-size:cover;background-position:center">
          <div class="nc-overlay"></div>
          <div class="nc-new-badge">NEW ${daysAgo(l.launchDate)}</div>
          <div class="nc-content">
            <div class="nc-dev">${l.developer}</div>
            <div class="nc-name">${l.project}</div>
          </div>
        </div>
        <div class="nc-body">
          <div class="nc-area">${l.area}</div>
          <div class="nc-price">${fmtAED(l.priceFrom)} <span class="nc-pp">${l.paymentPlan}</span></div>
        </div>
      </div>
    `).join('');
    newScroll.querySelectorAll('.new-card').forEach((el) => {
      el.addEventListener('click', () => {
        const l = allListings.find((x) => x.id === el.dataset.id);
        if (l) openSheet(l);
      });
    });
  } else {
    newSection.style.display = 'none';
  }

  // ── Hot launches horizontal scroll (all featured except hero)
  const hotEl   = document.getElementById('hotLaunches');
  const hotItems = featured.slice(1).concat(listings.filter((l) => l.status === 'Selling Fast' && !l.featured)).slice(0, 6);
  hotEl.innerHTML = (hotItems.length ? hotItems : listings.slice(1, 5)).map((l) => `
    <div class="hot-card" data-id="${l.id}">
      <div class="hc-top" style="background:${cardBg(l)};background-size:cover;background-position:center">
        <div class="hc-top-overlay"></div>
        <span class="hc-status ${statusClass(l.status)}">${l.status || 'Available'}</span>
        <div class="hc-dev-badge">${l.developer}</div>
      </div>
      <div class="hc-body">
        <div class="hc-name">${l.project}</div>
        <div class="hc-area">${l.area}</div>
        <div class="hc-price">${fmtAED(l.priceFrom)}</div>
        <div class="hc-pp">${l.paymentPlan} · ${l.handover}</div>
      </div>
    </div>
  `).join('');
  hotEl.querySelectorAll('.hot-card').forEach((el) => {
    el.addEventListener('click', () => {
      const l = allListings.find((x) => x.id === el.dataset.id);
      if (l) openSheet(l);
    });
  });

  // ── Proof grid
  const withDld   = listings.filter((l) => l.dldMedianPsf);
  const totalTx   = withDld.reduce((s, l) => s + (l.dldTransactions || 0), 0);
  const areas     = [...new Set(listings.map((l) => l.area))].length;
  const avgOffplan = withDld.length ? Math.round(withDld.reduce((s, l) => s + (l.dldOffplanPct || 0), 0) / withDld.length) : 0;
  document.getElementById('proofGrid').innerHTML = `
    <div class="proof-card"><div class="proof-val">${fmtN(totalTx)}</div><div class="proof-label">DLD Transactions Analysed</div></div>
    <div class="proof-card"><div class="proof-val">${listings.length}</div><div class="proof-label">Active Launches</div></div>
    <div class="proof-card"><div class="proof-val">${areas}</div><div class="proof-label">Areas Covered</div></div>
    <div class="proof-card"><div class="proof-val">${avgOffplan}%</div><div class="proof-label">Avg Off-Plan Mix</div></div>
  `;

  // ── Developer chips → filter off-plan tab
  const devs = [...new Set(listings.map((l) => l.developer))];
  document.getElementById('devChips').innerHTML = devs.map((d) =>
    `<button class="dev-chip" data-dev="${d}">${d}</button>`
  ).join('');
  document.getElementById('devChips').querySelectorAll('.dev-chip').forEach((btn) => {
    btn.addEventListener('click', () => { activeDevFilter = btn.dataset.dev; showScreen('offplan'); });
  });
}

// ── DLD New Launches section (real data feed) ──────────────
async function loadDldNewLaunches() {
  try {
    const d = await fetch('/api/new-launches?days=14').then((r) => r.json());
    const el = document.getElementById('dldNewLaunches');
    if (!d.newProjects?.length) { el.closest('.section-wrap')?.remove(); return; }
    el.innerHTML = d.newProjects.slice(0, 8).map((p) => `
      <div class="dld-launch-card">
        <div class="dlc-top">
          <div class="dlc-name">${p.project}</div>
          <div class="dlc-badge">DLD Registered</div>
        </div>
        <div class="dlc-area">${p.area}${p.community ? ` · ${p.community}` : ''}</div>
        <div class="dlc-meta">
          <span>${fmtN(p.transactionCount)} tx</span>
          <span>AED ${fmtN(p.medianPsf)}/sqft</span>
          <span>${p.offplanPct}% off-plan</span>
          <span class="dlc-date">${daysAgo(p.firstSeen)}</span>
        </div>
      </div>
    `).join('');
  } catch { /* silent */ }
}

// ── Off-Plan Listings Screen ──────────────────────────────
function renderDevFilterChips() {
  const devs = ['All', ...new Set(allListings.map((l) => l.developer))];
  const el = document.getElementById('devFilterChips');
  el.innerHTML = devs.map((d) =>
    `<button class="dev-chip${d === activeDevFilter ? ' active' : ''}" data-dev="${d}">${d}</button>`
  ).join('');
  el.querySelectorAll('.dev-chip').forEach((btn) => {
    btn.addEventListener('click', () => { activeDevFilter = btn.dataset.dev; renderDevFilterChips(); renderListings(); });
  });
}

function renderListings() {
  filteredListings = activeDevFilter === 'All' ? allListings : allListings.filter((l) => l.developer === activeDevFilter);
  renderDevFilterChips();
  const grid = document.getElementById('listingsGrid');
  if (!filteredListings.length) { grid.innerHTML = '<div class="loading-msg">No listings for this developer yet.</div>'; return; }

  grid.innerHTML = filteredListings.map((l) => `
    <div class="listing-card" data-id="${l.id}">
      <div class="lc-hero" style="background:${cardBg(l)};background-size:cover;background-position:center">
        <div class="lc-hero-overlay"></div>
        <div class="lc-hero-content">
          <div class="lc-status-row">
            <span class="lc-dev">${l.developer}</span>
            <span class="hc-status ${statusClass(l.status)}">${l.status || 'Available'}</span>
          </div>
          <div class="lc-name">${l.project}</div>
          ${l.launchDate && isThisWeek(l.launchDate) ? `<div class="lc-new-ribbon">NEW · ${daysAgo(l.launchDate)}</div>` : ''}
        </div>
      </div>
      <div class="lc-body">
        <div class="lc-area">${l.area}</div>
        <div class="lc-meta">
          <div class="lc-meta-item"><strong>${l.handover}</strong> Handover</div>
          <div class="lc-meta-item"><strong>${l.paymentPlan}</strong> Plan</div>
          <div class="lc-meta-item"><strong>${l.unitTypes.length}</strong> Unit Types</div>
        </div>
        <div class="lc-tags">${l.tags.map((t) => `<span class="lc-tag">${t}</span>`).join('')}</div>
        <div class="lc-footer">
          <div>
            <div class="lc-price">From ${fmtAED(l.priceFrom)}</div>
            ${l.dldMedianPsf ? `<div class="lc-dld">DLD area avg: AED ${fmtN(l.dldMedianPsf)}/sqft</div>` : ''}
          </div>
          <button class="lc-cta" data-id="${l.id}">Register →</button>
        </div>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('.listing-card').forEach((el) => {
    el.addEventListener('click', (e) => {
      const l = allListings.find((x) => x.id === el.dataset.id);
      if (!l) return;
      if (e.target.classList.contains('lc-cta')) { openSheet(l, true); }
      else { openSheet(l); }
    });
  });
}

// ── Project Detail Sheet ──────────────────────────────────
function openSheet(listing, scrollToForm = false) {
  currentListing = listing;
  const heroEl = document.getElementById('sheetHero');
  heroEl.style.background = cardBg(listing);
  heroEl.style.backgroundSize  = 'cover';
  heroEl.style.backgroundPosition = 'center';
  document.getElementById('sheetStatus').innerHTML = `<span class="hc-status ${statusClass(listing.status)}">${listing.status||'Available'}</span>`;
  document.getElementById('sheetTitle').textContent = listing.project;
  document.getElementById('sheetDev').textContent   = `${listing.developer} · ${listing.area}`;
  if (listing.launchDate && isThisWeek(listing.launchDate)) {
    document.getElementById('sheetStatus').innerHTML +=
      ` <span style="margin-left:8px;font-size:10px;color:var(--gold);font-weight:700;letter-spacing:.06em">NEW · ${daysAgo(listing.launchDate)}</span>`;
  }
  document.getElementById('sheetPriceFrom').textContent = fmtAED(listing.priceFrom);
  document.getElementById('sheetHandover').textContent  = listing.handover;
  document.getElementById('sheetPP').textContent        = listing.paymentPlan;
  document.getElementById('sheetDesc').textContent      = listing.description;
  document.getElementById('sheetUnits').innerHTML       = listing.unitTypes.map((u) => `<span class="unit-pill">${u}</span>`).join('');
  document.getElementById('sheetTagsRow').innerHTML     = listing.tags.map((t) => `<span class="sheet-tag">${t}</span>`).join('');

  const unitSel = document.getElementById('leadUnit');
  unitSel.innerHTML = '<option value="">Preferred unit type</option>' +
    listing.unitTypes.map((u) => `<option value="${u}">${u}</option>`).join('');

  document.getElementById('leadName').value      = '';
  document.getElementById('leadWhatsapp').value  = '';
  document.getElementById('leadBudget').value    = '';
  document.getElementById('leadSuccess').style.display = 'none';
  document.getElementById('leadSubmit').style.display  = 'block';
  document.getElementById('leadSubmit').textContent    = 'Register Interest';
  document.getElementById('leadSubmit').disabled       = false;

  const ctxBody = document.getElementById('dldContextBody');
  if (listing.dldMedianPsf) {
    ctxBody.innerHTML = `
      <div class="dld-stats">
        <div class="dld-stat"><strong>AED ${fmtN(listing.dldMedianPsf)}</strong>/sqft<br>Median closed price</div>
        <div class="dld-stat"><strong>${fmtN(listing.dldTransactions)}</strong><br>Transactions analysed</div>
        <div class="dld-stat"><strong>${listing.dldOffplanPct}%</strong><br>Off-plan mix</div>
      </div>
    `;
    fetch(`/api/analysis?area=${encodeURIComponent(listing.dldAreaKey || listing.area)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.commentary) ctxBody.innerHTML += `<p style="margin-top:10px;font-size:13px;line-height:1.6;color:var(--text)">${d.commentary}</p>`;
      }).catch(() => {});
  } else {
    ctxBody.textContent = 'DLD transaction data for this area will appear here once live data is connected.';
  }

  document.getElementById('sheetBackdrop').classList.add('open');
  document.getElementById('projectSheet').classList.add('open');

  if (scrollToForm) {
    setTimeout(() => document.getElementById('leadForm').scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
  } else {
    document.getElementById('projectSheet').querySelector('.sheet-scroll').scrollTop = 0;
  }
}

function closeSheet() {
  document.getElementById('sheetBackdrop').classList.remove('open');
  document.getElementById('projectSheet').classList.remove('open');
  currentListing = null;
}
document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
const sheetHandle = document.querySelector('.sheet-handle');
let touchStartY = 0;
sheetHandle.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; });
sheetHandle.addEventListener('touchend',   (e) => { if (e.changedTouches[0].clientY - touchStartY > 60) closeSheet(); });

// ── Lead Form Submission ──────────────────────────────────
document.getElementById('leadSubmit').addEventListener('click', async () => {
  const name     = document.getElementById('leadName').value.trim();
  const whatsapp = document.getElementById('leadWhatsapp').value.trim();
  if (!name || !whatsapp) { document.getElementById('leadName').focus(); return; }
  const body = {
    listingId: currentListing?.id || '',
    name, whatsapp,
    unitType: document.getElementById('leadUnit').value,
    budget:   document.getElementById('leadBudget').value,
  };
  document.getElementById('leadSubmit').textContent = 'Sending…';
  document.getElementById('leadSubmit').disabled = true;
  try {
    const res  = await fetch('/api/inquiry', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) {
      document.getElementById('leadSubmit').style.display = 'none';
      document.getElementById('leadSuccess').style.display = 'flex';
      myLeads.push({ ...body, project: currentListing?.project, developer: currentListing?.developer, date: new Date().toISOString() });
      localStorage.setItem('elevate_leads', JSON.stringify(myLeads));

      // WhatsApp button — show link to agent's WhatsApp with pre-filled message
      const waBtn = document.getElementById('waOpenBtn');
      if (agentWhatsapp && waBtn) {
        const proj = currentListing?.project || 'a property';
        const msg = `Hi, I'm interested in ${proj}${body.unitType ? ` (${body.unitType})` : ''}${body.budget ? `. Budget: ${body.budget}` : ''}. Please share more details. — ${body.name}`;
        waBtn.href = `https://wa.me/${agentWhatsapp}?text=${encodeURIComponent(msg)}`;
        waBtn.style.display = 'flex';
      }
    } else {
      alert(data.error || 'Failed. Please try again.');
      document.getElementById('leadSubmit').textContent = 'Register Interest';
      document.getElementById('leadSubmit').disabled = false;
    }
  } catch {
    alert('Network error. Please try again.');
    document.getElementById('leadSubmit').textContent = 'Register Interest';
    document.getElementById('leadSubmit').disabled = false;
  }
});

// ── Trends Screen ─────────────────────────────────────────
let trendsLoaded = false;
async function loadTrends() {
  if (trendsLoaded) return;
  try {
    const d = await fetch('/api/weekly-trends').then((r) => r.json());
    const { dateRange, summary, volumeMovers, psfMovers, offplanSurge } = d;
    trendsLoaded = true;
    document.getElementById('trendsWeek').textContent = `${dateRange.from} → ${dateRange.to}`;
    document.getElementById('kpiRow').innerHTML = [
      { val: fmtN(summary.count), label: 'Transactions' },
      { val: `AED ${fmtM(summary.volume)}`, label: 'Volume' },
      { val: fmtN(summary.medianPsf), label: 'Median PSF' },
      { val: `${summary.offplanPct}%`, label: 'Off-Plan' },
    ].map((k) => `<div class="kpi-card"><div class="kpi-val">${k.val}</div><div class="kpi-label">${k.label}</div></div>`).join('');
    document.getElementById('heatingUp').innerHTML = volumeMovers.slice(0, 6).map((m) => `
      <div class="mover-item">
        <div><div class="mover-name">${m.area}</div><div class="mover-sub">${m.weekCount} tx · AED ${fmtN(m.medianPsf)}/sqft</div></div>
        <div class="mover-badge up">+${m.pctChange}%</div>
      </div>`).join('') || '<div class="loading-msg">Not enough data</div>';
    document.getElementById('psfMovers').innerHTML = psfMovers.slice(0, 6).map((m) => `
      <div class="mover-item">
        <div><div class="mover-name">${m.area}</div><div class="mover-sub">AED ${fmtN(m.weekPsf)}/sqft this week</div></div>
        <div class="mover-badge ${m.pctChange >= 0 ? 'up' : 'dn'}">${m.pctChange >= 0 ? '+' : ''}${m.pctChange}%</div>
      </div>`).join('') || '<div class="loading-msg">Not enough data</div>';
    document.getElementById('surgeTags').innerHTML = offplanSurge.map((a) =>
      `<span class="surge-tag">${a.area} ${a.offplanPct}%</span>`
    ).join('') || '<span style="color:var(--muted);font-size:13px">No surge areas this week</span>';
  } catch { /* silent */ }
}

// ── Areas Screen ──────────────────────────────────────────
let areasData = [], areasLoaded = false;
async function loadAreas() {
  if (areasLoaded) return;
  try {
    const d = await fetch('/api/trends').then((r) => r.json());
    areasData = (d.areaStats || []).sort((a, b) => b.count - a.count);
    areasLoaded = true;
    renderAreas('');
    document.getElementById('areaSearch').addEventListener('input', (e) => renderAreas(e.target.value.trim().toLowerCase()));
  } catch { /* silent */ }
}
function renderAreas(q) {
  const list = q ? areasData.filter((a) => a.label.toLowerCase().includes(q)) : areasData;
  document.getElementById('areaGrid').innerHTML = list.slice(0, 40).map((a) => `
    <div class="area-card">
      <div class="area-name">${a.label}</div>
      <div class="area-psf">AED ${fmtN(a.medianPsf)}<span style="font-size:11px;color:var(--muted)">/sqft</span></div>
      <div class="area-count">${fmtN(a.count)} transactions</div>
      ${a.trend !== 0 ? `<div class="area-trend ${a.trend > 0 ? 'up' : 'dn'}">${a.trend > 0 ? '↑' : '↓'} ${Math.abs(a.trend)}%</div>` : ''}
    </div>
  `).join('');
}

// ── My Leads Screen ───────────────────────────────────────
function renderLeads() {
  const el = document.getElementById('inquiryList');
  if (!myLeads.length) {
    el.innerHTML = '<div class="inq-empty">No inquiries yet.<br>Tap <strong>Register Interest</strong> on any listing to get started.</div>';
    return;
  }
  el.innerHTML = [...myLeads].reverse().map((l) => `
    <div class="inq-card">
      <div class="inq-project">${l.project || 'Unknown Project'}</div>
      <div class="inq-dev">${l.developer || ''}</div>
      <div class="inq-meta">
        ${l.unitType ? `Unit: ${l.unitType} · ` : ''}${l.budget ? `Budget: ${l.budget} · ` : ''}
        ${new Date(l.date).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}
      </div>
    </div>
  `).join('');
}

// ── Boot ──────────────────────────────────────────────────
async function init() {
  try {
    const d = await fetch('/api/listings').then((r) => r.json());
    allListings = d.listings || [];
    renderDiscover(allListings);
    renderListings();
    loadDldNewLaunches();
  } catch {
    document.getElementById('listingsGrid').innerHTML = '<div class="loading-msg">Unable to load listings. Please refresh.</div>';
  }
}

init();
