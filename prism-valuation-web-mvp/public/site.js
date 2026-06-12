// Elevate Homes — public website logic
// Wires the page to the live API: metadata, trends, listings, new launches,
// and the pricing-proof deal-check flow.

const $ = (id) => document.getElementById(id);

const fmtAed = (n) =>
  n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n).toLocaleString()}`;
const fmtNum = (n) => Math.round(n).toLocaleString();

let agentWhatsapp = '';
let lastSocialPost = '';

// ── Boot ──────────────────────────────────────────────────────────────

async function boot() {
  const [config, metadata] = await Promise.all([
    fetch('/api/config').then((r) => r.json()).catch(() => ({})),
    fetch('/api/metadata').then((r) => r.json()).catch(() => null),
  ]);

  agentWhatsapp = config.agentWhatsapp || '';
  setWhatsappLinks();

  if (metadata) {
    $('statRows').textContent = fmtNum(metadata.cleanRows);
    $('statPsf').textContent = fmtNum(metadata.medianPsf);
    $('statAreas').textContent = fmtNum(metadata.areas.length);
    $('statUpdated').textContent = (metadata.dateMax || '').slice(0, 10) || '—';

    $('areaList').innerHTML = metadata.areas.map((a) => `<option value="${esc(a)}">`).join('');
    $('projectList').innerHTML = metadata.projects.map((p) => `<option value="${esc(p)}">`).join('');
    $('dcRooms').innerHTML =
      '<option value="">Any</option>' +
      metadata.rooms.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
  }

  loadMarket();
  loadListings();
  loadLaunches();
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

// ── Market pulse table ────────────────────────────────────────────────

async function loadMarket() {
  try {
    const trends = await fetch('/api/trends').then((r) => r.json());
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

// ── Off-plan listings ─────────────────────────────────────────────────

async function loadListings() {
  try {
    const { listings } = await fetch('/api/listings').then((r) => r.json());
    const featured = listings.filter((l) => l.featured).concat(listings.filter((l) => !l.featured));
    $('listingGrid').innerHTML = featured
      .slice(0, 6)
      .map(
        (l) => `<article class="listing-card">
          <img class="listing-img" src="${esc(l.image || '')}" alt="${esc(l.project)}" loading="lazy"
               onerror="this.style.display='none'" />
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

$('dealForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('dcSubmit');
  btn.disabled = true;
  btn.textContent = 'Scoring against DLD comps…';
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
    btn.textContent = 'Run Pricing Proof';
  }
});

function renderVerdict(d) {
  $('resultEmpty').classList.add('hidden');
  $('resultCard').classList.remove('hidden');

  const badge = $('verdictBadge');
  badge.textContent = d.verdict;
  badge.className = `verdict-badge ${VERDICT_CLS[d.verdict] || 'fair'}`;

  const sign = d.discountPct > 0 ? '+' : '';
  $('verdictDelta').textContent = `${sign}${d.discountPct}% vs DLD median for comparable sales`;

  $('rFairValue').textContent = fmtAed(d.fairValue);
  $('rMedianPsf').textContent = `${fmtNum(d.dldMedianPsf)} /sqft`;
  $('rComps').textContent = fmtNum(d.compCount);
  $('rConfidence').textContent = d.confidence;
  $('rBasis').textContent = `Comparable basis: ${d.fallback?.label || '—'}.`;

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

$('rCopyPost').addEventListener('click', async () => {
  if (!lastSocialPost) return;
  await navigator.clipboard.writeText(lastSocialPost).catch(() => {});
  const btn = $('rCopyPost');
  const orig = btn.textContent;
  btn.textContent = 'Copied ✓';
  setTimeout(() => (btn.textContent = orig), 1600);
});

boot();
