// Elevate Homes — public website logic
// Wires the page to the live API: metadata, trends, listings, new launches,
// and the pricing-proof deal-check flow.

const $ = (id) => document.getElementById(id);

const fmtAed = (n) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n).toLocaleString()}`;
const fmtNum = (n) => Math.round(n).toLocaleString();

let agentWhatsapp = '';
let lastSocialPost = '';
let lastDeal = null;   // last buyer deal-check response (for report)
let lastSeller = null; // last seller-valuation response (for report)

// ── Boot ──────────────────────────────────────────────────────────────

async function boot() {
  const [config, metadata] = await Promise.all([
    fetch('/api/config').then((r) => r.json()).catch(() => ({})),
    fetch('/api/metadata').then((r) => r.json()).catch(() => null),
  ]);

  agentWhatsapp = config.agentWhatsapp || '';
  setWhatsappLinks();

  if (metadata) {
    countUp($('statRows'), metadata.cleanRows);
    countUp($('statPsf'), metadata.medianPsf);
    countUp($('statAreas'), metadata.areas.length);
    $('statUpdated').textContent = (metadata.dateMax || '').slice(0, 10) || '—';

    $('areaList').innerHTML = metadata.areas.map((a) => `<option value="${esc(a)}">`).join('');
    $('projectList').innerHTML = metadata.projects.map((p) => `<option value="${esc(p)}">`).join('');
    const roomsOptions =
      '<option value="">Any</option>' +
      metadata.rooms.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
    $('dcRooms').innerHTML = roomsOptions;
    if ($('seRooms')) $('seRooms').innerHTML = roomsOptions;
  }

  loadMarket();
  loadListings();
  loadLaunches();
  setupScrollspy();
}

// Highlight the nav link for the section currently in view
function setupScrollspy() {
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = `#${entry.target.id}`;
        links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === id));
      });
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((s) => observer.observe(s));
}

function setWhatsappLinks() {
  const base = agentWhatsapp ? `https://wa.me/${agentWhatsapp}` : '#';
  const greet = encodeURIComponent('Hi Sambhav — I found you via Elevate Homes and would like to discuss the Dubai market.');
  $('navWhatsapp').href = agentWhatsapp ? `${base}?text=${greet}` : '#';
  $('advisorWhatsapp').href = agentWhatsapp ? `${base}?text=${greet}` : '#';
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Animated count-up for hero stats (respects prefers-reduced-motion)
function countUp(el, target, ms = 1100) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = fmtNum(target);
    return;
  }
  const t0 = performance.now();
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtNum(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Market pulse table ────────────────────────────────────────────────

async function loadMarket() {
  try {
    const trends = await fetch('/api/trends').then((r) => r.json());
    renderTrendChart(trends.monthly || []);
    const rows = (trends.areaStats || []).slice(0, 12);
    $('marketBody').innerHTML = rows
      .map((a) => {
        const trendCls = a.trend >= 0 ? 'trend-up' : 'trend-down';
        const arrow = a.trend >= 0 ? '▲' : '▼';
        return `<tr>
          <td class="area-name">${esc(a.label)}</td>
          <td>${fmtNum(a.count)}</td>
          <td class="psf">${fmtNum(a.medianPsf)}</td>
          <td class="${trendCls}">${arrow} ${Math.abs(a.trend).toFixed(1)}%</td>
          <td><span class="offplan-pill">${a.offplanPct}% off-plan</span></td>
        </tr>`;
      })
      .join('');
  } catch {
    $('marketBody').innerHTML = '<tr><td colspan="5" class="loading-cell">Market data unavailable right now.</td></tr>';
  }
}

// Inline SVG area chart of monthly median PSF — no chart library needed
function renderTrendChart(monthly) {
  const svg = $('trendChart');
  if (!svg || monthly.length < 2) return;

  const W = 800, H = 220, PAD = 10;
  const psfs = monthly.map((m) => m.medianPsf);
  const min = Math.min(...psfs) * 0.97;
  const max = Math.max(...psfs) * 1.03;
  const x = (i) => PAD + (i / (monthly.length - 1)) * (W - PAD * 2);
  const y = (v) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);

  const pts = psfs.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(' L')}`;
  const area = `${line} L${x(psfs.length - 1).toFixed(1)},${H - PAD} L${x(0).toFixed(1)},${H - PAD} Z`;

  svg.innerHTML = `
    <defs>
      <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgba(200,169,106,0.35)" />
        <stop offset="100%" stop-color="rgba(200,169,106,0)" />
      </linearGradient>
    </defs>
    <path d="${area}" fill="url(#chartFill)" />
    <path d="${line}" fill="none" stroke="#E8C87A" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="${x(psfs.length - 1)}" cy="${y(psfs.at(-1))}" r="5" fill="#E8C87A" stroke="#060c12" stroke-width="2" />`;

  const change = ((psfs.at(-1) - psfs[0]) / psfs[0]) * 100;
  const badge = $('chartBadge');
  badge.textContent = `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}% over period`;
  badge.classList.toggle('down', change < 0);

  const months = monthly.map((m) => m.month);
  $('chartAxis').innerHTML =
    `<span>${esc(months[0])}</span>` +
    (months.length > 4 ? `<span>${esc(months[Math.floor(months.length / 2)])}</span>` : '') +
    `<span>${esc(months.at(-1))}</span>`;
}

// ── Off-plan listings ─────────────────────────────────────────────────

async function loadListings() {
  try {
    const { listings } = await fetch('/api/listings').then((r) => r.json());
    const featured = listings.filter((l) => l.featured).concat(listings.filter((l) => !l.featured));
    $('listingGrid').innerHTML = featured
      .slice(0, 6)
      .map(
        (l) => `<article class="listing-card">
          <div class="listing-img-wrap">
            ${l.status ? `<span class="status-badge ${slugify(l.status)}">${esc(l.status)}</span>` : ''}
            <img class="listing-img" src="${esc(l.image || '')}" alt="${esc(l.project)}" loading="lazy"
                 onerror="this.style.display='none'" />
          </div>
          <div class="listing-body">
            <div class="listing-dev">${esc(l.developer)}</div>
            <h3 class="listing-name">${esc(l.project)}</h3>
            <div class="listing-area">${esc(l.area)}</div>
            <div class="listing-stats">
              <div><span>From</span><strong>${l.priceFrom ? fmtAed(l.priceFrom) : '—'}</strong></div>
              <div><span>DLD median</span><strong>${l.dldMedianPsf ? fmtNum(l.dldMedianPsf) + ' /sqft' : '—'}</strong></div>
              <div><span>Area sales</span><strong>${l.dldTransactions ? fmtNum(l.dldTransactions) : '—'}</strong></div>
            </div>
          </div>
        </article>`,
      )
      .join('');
  } catch {
    $('listingGrid').innerHTML = '<p class="loading-cell">Listings unavailable right now.</p>';
  }
}

// ── New launches ──────────────────────────────────────────────────────

async function loadLaunches() {
  try {
    const { newProjects } = await fetch('/api/new-launches?days=30').then((r) => r.json());
    if (!newProjects.length) {
      $('launchGrid').innerHTML = '<p class="loading-cell">No new registrations detected in the last 30 days.</p>';
      return;
    }
    $('launchGrid').innerHTML = newProjects
      .slice(0, 8)
      .map(
        (p) => `<div class="launch-card">
          <div>
            <div class="l-name">${esc(p.project)}${p.daysAgo <= 7 ? '<span class="new-pill">This week</span>' : ''}</div>
            <div class="l-meta">${esc(p.area)} · first seen ${esc(p.firstSeen)} · ${fmtNum(p.transactionCount)} sales</div>
          </div>
          <div class="l-psf">
            <strong>${p.medianPsf ? fmtNum(p.medianPsf) : '—'}</strong>
            <span>AED / sqft</span>
          </div>
        </div>`,
      )
      .join('');
  } catch {
    $('launchGrid').innerHTML = '<p class="loading-cell">Launch data unavailable right now.</p>';
  }
}

// ── Deal check / pricing proof ────────────────────────────────────────

const VERDICT_CLS = { 'Strong Buy': 'buy', 'Fair Value': 'fair', 'Overpriced': 'over' };
const VERDICT_ICON = { 'Strong Buy': '✓', 'Fair Value': '●', 'Overpriced': '!' };

$('dealForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('dcSubmit');
  const origLabel = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Scoring against DLD comps…';
  $('resultError').classList.add('hidden');

  try {
    const res = await fetch('/api/deal-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: $('dcArea').value.trim(),
        project: $('dcProject').value.trim(),
        size: Number($('dcSize').value),
        sizeUnit: $('dcUnit').value,
        rooms: $('dcRooms').value,
        price: Number($('dcPrice').value),
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
    renderVerdict(data);
  } catch (err) {
    $('resultEmpty').classList.add('hidden');
    $('resultCard').classList.add('hidden');
    const errEl = $('resultError');
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = origLabel;
  }
});

function renderVerdict(d) {
  lastDeal = d;
  $('resultEmpty').classList.add('hidden');
  $('resultCard').classList.remove('hidden');

  const badge = $('verdictBadge');
  badge.innerHTML = `<span class="verdict-icon">${VERDICT_ICON[d.verdict] || '●'}</span>${esc(d.verdict)}`;
  badge.className = `verdict-badge ${VERDICT_CLS[d.verdict] || 'fair'}`;

  const sign = d.discountPct > 0 ? '+' : '';
  $('verdictDelta').textContent = `${sign}${d.discountPct}% vs DLD median for comparable sales`;

  $('rFairValue').textContent = fmtAed(d.fairValue);
  $('rMedianPsf').textContent = `${fmtNum(d.dldMedianPsf)} /sqft`;
  $('rComps').textContent = fmtNum(d.compCount);
  $('rConfidence').textContent = d.confidence;
  $('rBasis').textContent = `Comparable basis: ${d.fallback?.label || '—'}.`;
  renderPriceBand(d);

  const noteWrap = $('analystNoteWrap');
  if (d.analystNote) {
    noteWrap.classList.remove('hidden');
    $('rAnalystNote').textContent = d.analystNote;
  } else {
    noteWrap.classList.add('hidden');
  }

  lastSocialPost = d.socialPost || '';
  $('rCopyPost').classList.toggle('hidden', !lastSocialPost);

  if (agentWhatsapp) {
    const msg = encodeURIComponent(
      `Hi Sambhav — I ran a Pricing Proof on Elevate Homes.\n` +
        `Area: ${$('dcArea').value}\nProject: ${$('dcProject').value || 'n/a'}\n` +
        `Asking: AED ${Number($('dcPrice').value).toLocaleString()}\n` +
        `Verdict: ${d.verdict} (${sign}${d.discountPct}% vs DLD median). Can we discuss?`,
    );
    $('rWhatsapp').href = `https://wa.me/${agentWhatsapp}?text=${msg}`;
  }

  $('resultCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Visualize where the asking PSF sits on the DLD comparable band (P25–P75)
function renderPriceBand(d) {
  const hasBand = Number.isFinite(d.lowPsf) && Number.isFinite(d.highPsf) && Number.isFinite(d.askingPsf);
  document.querySelector('.price-band').classList.toggle('hidden', !hasBand);
  if (!hasBand) return;

  const lo = Math.min(d.lowPsf, d.askingPsf) * 0.95;
  const hi = Math.max(d.highPsf, d.askingPsf) * 1.05;
  const pct = (v) => Math.max(1, Math.min(99, ((v - lo) / (hi - lo)) * 100));

  $('bandRange').style.left = `${pct(d.lowPsf)}%`;
  $('bandRange').style.width = `${pct(d.highPsf) - pct(d.lowPsf)}%`;
  $('bandMedian').style.left = `${pct(d.dldMedianPsf)}%`;
  $('bandMarker').style.left = `${pct(d.askingPsf)}%`;
  $('bandMarkerLabel').textContent = `Asking ${fmtNum(d.askingPsf)}`;
  $('bandLow').textContent = `P25 · ${fmtNum(d.lowPsf)}`;
  $('bandMid').textContent = `DLD median ${fmtNum(d.dldMedianPsf)}`;
  $('bandHigh').textContent = `P75 · ${fmtNum(d.highPsf)}`;
}

$('rCopyPost').addEventListener('click', async () => {
  if (!lastSocialPost) return;
  await navigator.clipboard.writeText(lastSocialPost).catch(() => {});
  const btn = $('rCopyPost');
  const orig = btn.textContent;
  btn.textContent = 'Copied ✓';
  setTimeout(() => (btn.textContent = orig), 1600);
});

// ── Seller valuation ──────────────────────────────────────────────────

const CONF_NOTE = {
  High: 'Tight comparable match — you can list on this with confidence.',
  Medium: 'Based on a widened comparable set — a solid starting point to refine on a call.',
  Low: 'Limited comparable match — treat this as directional and confirm with an advisor.',
  Insufficient: 'Very thin comparable data here — book a call for a proper read.',
};

$('sellForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('seSubmit');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Valuing against DLD sales…';
  $('sellError').classList.add('hidden');
  try {
    const res = await fetch('/api/seller-valuation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: $('seArea').value.trim(),
        project: $('seProject').value.trim(),
        size: Number($('seSize').value),
        sizeUnit: $('seUnit').value,
        rooms: $('seRooms').value,
        targetPrice: $('sePrice').value ? Number($('sePrice').value) : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || `Request failed (${res.status})`);
    renderSeller(data);
  } catch (err) {
    $('sellEmpty').classList.add('hidden');
    $('sellCard').classList.add('hidden');
    const el = $('sellError');
    el.textContent = err.message;
    el.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
  }
});

function renderSeller(d) {
  lastSeller = d;
  $('sellEmpty').classList.add('hidden');
  $('sellError').classList.add('hidden');
  $('sellCard').classList.remove('hidden');

  $('sFairValue').textContent = fmtAed(d.fairValue);
  $('sFairPsf').textContent = `${fmtNum(d.fairPsf)} AED/sqft · ${fmtNum(d.sizeSqft)} sqft`;
  $('sQuick').textContent = fmtAed(d.listingGuidance.quickSale);
  $('sMarket').textContent = fmtAed(d.listingGuidance.market);
  $('sAmbitious').textContent = fmtAed(d.listingGuidance.ambitious);

  $('sLiquidity').textContent = d.liquidity;
  $('sRecent').textContent = fmtNum(d.recentComps);
  $('sComps').textContent = fmtNum(d.compCount);
  $('sConfidence').textContent = d.confidence;
  $('sBasis').textContent = `Comparable basis: ${d.fallback?.label || '—'}. ${CONF_NOTE[d.confidence] || ''}`;

  drawSellerBand(d);

  const tw = $('sTargetWrap');
  if (d.targetVerdict) {
    const tv = d.targetVerdict;
    const cls = tv.gapPct > 8 ? 'over' : tv.gapPct < -8 ? 'under' : 'inline';
    const sign = tv.gapPct > 0 ? '+' : '';
    tw.className = `target-verdict ${cls}`;
    tw.innerHTML =
      `<div class="tv-head"><span class="tv-gap">${sign}${tv.gapPct}%</span>` +
      `<span class="tv-label">at your target of ${fmtAed(tv.targetPrice)} vs DLD fair value</span></div>` +
      `<div class="tv-label">${esc(tv.label)}.</div>`;
    tw.classList.remove('hidden');
  } else {
    tw.classList.add('hidden');
  }

  const nw = $('sNoteWrap');
  if (d.sellerNote) { nw.classList.remove('hidden'); $('sNote').textContent = d.sellerNote; }
  else nw.classList.add('hidden');

  if (agentWhatsapp) {
    const msg = encodeURIComponent(
      `Hi Sambhav — I valued my ${$('seArea').value} property on Elevate Homes.\n` +
        `DLD fair value: AED ${d.fairValue.toLocaleString()} (${d.confidence} confidence).\n` +
        `I'd like to discuss listing it.`,
    );
    $('sWhatsapp').href = `https://wa.me/${agentWhatsapp}?text=${msg}`;
  }

  $('sellCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function drawSellerBand(d) {
  const marker = d.targetVerdict ? Math.round(d.targetVerdict.targetPrice / d.sizeSqft) : null;
  const vals = [d.lowPsf, d.highPsf, d.fairPsf].concat(marker ? [marker] : []);
  const lo = Math.min(...vals) * 0.95;
  const hi = Math.max(...vals) * 1.05;
  const pct = (v) => Math.max(1, Math.min(99, ((v - lo) / (hi - lo)) * 100));
  $('sBandRange').style.left = `${pct(d.lowPsf)}%`;
  $('sBandRange').style.width = `${pct(d.highPsf) - pct(d.lowPsf)}%`;
  $('sBandMedian').style.left = `${pct(d.fairPsf)}%`;
  const mk = $('sBandMarker');
  if (marker) {
    mk.style.left = `${pct(marker)}%`;
    $('sBandMarkerLabel').textContent = `Your target ${fmtNum(marker)}`;
    mk.classList.remove('hidden');
  } else {
    mk.classList.add('hidden');
  }
  $('sBandLow').textContent = `P25 · ${fmtNum(d.lowPsf)}`;
  $('sBandMid').textContent = `DLD median ${fmtNum(d.fairPsf)}`;
  $('sBandHigh').textContent = `P75 · ${fmtNum(d.highPsf)}`;
}

// ── Lead capture modal ────────────────────────────────────────────────

let leadCtx = null;
let leadOnSuccess = null;

function openLeadModal({ title, sub, submitLabel, intent, source, context, onSuccess }) {
  leadCtx = { intent, source, ...(context || {}) };
  leadOnSuccess = onSuccess || null;
  $('leadModalTitle').textContent = title || 'Get your full pricing report';
  $('leadModalSub').textContent = sub || 'Where should we send it? An Elevate Homes advisor will follow up with the full comparable breakdown.';
  $('leadSubmit').textContent = submitLabel || 'Generate my report';
  $('leadModal').classList.remove('hidden');
  setTimeout(() => $('leadName').focus(), 60);
}
function closeLeadModal() { $('leadModal').classList.add('hidden'); }

$('leadClose')?.addEventListener('click', closeLeadModal);
$('leadModal')?.addEventListener('click', (e) => { if (e.target.id === 'leadModal') closeLeadModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('leadModal').classList.contains('hidden')) closeLeadModal(); });

$('leadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('leadSubmit');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Preparing…';
  const lead = {
    name: $('leadName').value.trim(),
    phone: $('leadPhone').value.trim(),
    email: $('leadEmail').value.trim(),
  };
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...lead, ...(leadCtx || {}) }),
    }).then((r) => r.json()).catch(() => ({}));
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
    $('leadForm').reset();
    closeLeadModal();
    if (typeof leadOnSuccess === 'function') leadOnSuccess(lead);
  }
});

// ── Report generation (branded, printable) ────────────────────────────

function openReport(payload) {
  if (!payload) return;
  try { sessionStorage.setItem('prismReport', JSON.stringify(payload)); } catch {}
  window.open('/report', '_blank');
}

function sellerReportPayload(lead) {
  const d = lastSeller;
  if (!d) return null;
  return {
    type: 'seller',
    generatedAt: new Date().toISOString(),
    client: lead && lead.name ? { name: lead.name, phone: lead.phone } : null,
    property: {
      area: $('seArea').value.trim() || d.resolvedArea,
      project: $('seProject').value.trim() || d.resolvedProject,
      rooms: $('seRooms').value,
      sizeSqft: d.sizeSqft,
    },
    valuation: d,
    agentWhatsapp,
  };
}

function buyerReportPayload(lead) {
  const d = lastDeal;
  if (!d) return null;
  return {
    type: 'buyer',
    generatedAt: new Date().toISOString(),
    client: lead && lead.name ? { name: lead.name, phone: lead.phone } : null,
    property: {
      area: $('dcArea').value.trim() || d.resolvedArea,
      project: $('dcProject').value.trim() || d.resolvedProject,
      rooms: $('dcRooms').value,
      sizeSqft: d.sizeSqft,
      askingPrice: Number($('dcPrice').value) || null,
    },
    valuation: d,
    agentWhatsapp,
  };
}

// Seller: gate the full report behind lead capture
$('sGetReport')?.addEventListener('click', () => {
  if (!lastSeller) return;
  openLeadModal({
    title: 'Get your full pricing report',
    sub: 'Your branded report with every comparable transaction. An advisor will follow up to help you list.',
    submitLabel: 'Generate my report',
    intent: 'sell',
    source: 'seller-valuation',
    context: {
      area: $('seArea').value.trim(),
      project: $('seProject').value.trim(),
      rooms: $('seRooms').value,
      sizeSqft: lastSeller.sizeSqft,
      targetPrice: $('sePrice').value ? Number($('sePrice').value) : undefined,
      valuation: {
        fairValue: lastSeller.fairValue,
        listingGuidance: lastSeller.listingGuidance,
        confidence: lastSeller.confidence,
        liquidity: lastSeller.liquidity,
        compCount: lastSeller.compCount,
      },
    },
    onSuccess: (lead) => openReport(sellerReportPayload(lead)),
  });
});

// Buyer: gate the downloadable proof report behind lead capture
$('rGetReport')?.addEventListener('click', () => {
  if (!lastDeal) return;
  openLeadModal({
    title: 'Download your pricing proof',
    sub: 'Your branded report with the comparable evidence behind this verdict — useful in any negotiation.',
    submitLabel: 'Generate my report',
    intent: 'buy',
    source: 'buyer-deal-check',
    context: {
      area: $('dcArea').value.trim(),
      project: $('dcProject').value.trim(),
      rooms: $('dcRooms').value,
      askingPrice: Number($('dcPrice').value) || undefined,
      valuation: {
        verdict: lastDeal.verdict,
        fairValue: lastDeal.fairValue,
        discountPct: lastDeal.discountPct,
        confidence: lastDeal.confidence,
        compCount: lastDeal.compCount,
      },
    },
    onSuccess: (lead) => openReport(buyerReportPayload(lead)),
  });
});

boot();
