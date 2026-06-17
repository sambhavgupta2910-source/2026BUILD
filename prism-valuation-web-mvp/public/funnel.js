// Elevate Homes — resale funnel controller for /sell and /brokers.
// Seller valuation (prism-hybrid-v1) + lead capture + report on /sell;
// broker early-access signup on /brokers. Both write to the unified
// POST /api/leads so everything surfaces in /crm. No dependencies.

const $ = (id) => document.getElementById(id);
const fmtAed = (n) => (n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n).toLocaleString()}`);
const fmtNum = (n) => Math.round(n).toLocaleString();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let agentWhatsapp = '';
let lastSeller = null;

const CONF_NOTE = {
  High: 'Tight comparable match — you can list on this with confidence.',
  Medium: 'Based on a widened comparable set — a solid starting point to refine on a call.',
  Low: 'Limited comparable match — treat this as directional and confirm with an advisor.',
  Insufficient: 'Very thin comparable data here — book a call for a proper read.',
};

async function boot() {
  const [config, metadata] = await Promise.all([
    fetch('/api/config').then((r) => r.json()).catch(() => ({})),
    fetch('/api/metadata').then((r) => r.json()).catch(() => null),
  ]);
  agentWhatsapp = config.agentWhatsapp || '';
  const nav = $('navWhatsapp');
  if (nav) {
    const greet = encodeURIComponent('Hi Sambhav — I found you via Elevate Homes and would like to discuss the Dubai market.');
    nav.href = agentWhatsapp ? `https://wa.me/${agentWhatsapp}?text=${greet}` : '#';
  }
  if (metadata) {
    const areaOpts = metadata.areas.map((a) => `<option value="${esc(a)}">`).join('');
    if ($('areaList')) $('areaList').innerHTML = areaOpts;
    if ($('projectList')) $('projectList').innerHTML = metadata.projects.map((p) => `<option value="${esc(p)}">`).join('');
    if ($('seRooms')) {
      $('seRooms').innerHTML = '<option value="">Any</option>' +
        metadata.rooms.map((r) => `<option value="${esc(r)}">${esc(r)}</option>`).join('');
    }
  }
}

// ── Seller flow (/sell) ───────────────────────────────────────────────
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
  if ($('sEngine') && d.engine) {
    $('sEngine').textContent =
      `Engine ${d.engine} · ${fmtNum(d.effectiveComps)} effective comps · ±${d.dispersionPct}% dispersion · size adjustment ${d.sizeAdjustment > 0 ? '+' : ''}${d.sizeAdjustment}%`;
  }

  drawBand(d);

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
        `DLD fair value: AED ${d.fairValue.toLocaleString()} (${d.confidence} confidence).\nI'd like to discuss listing it.`,
    );
    $('sWhatsapp').href = `https://wa.me/${agentWhatsapp}?text=${msg}`;
  }
  $('sellCard').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function drawBand(d) {
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

// ── Lead capture modal (sell page) ────────────────────────────────────
function closeLeadModal() { $('leadModal')?.classList.add('hidden'); }
$('leadClose')?.addEventListener('click', closeLeadModal);
$('leadModal')?.addEventListener('click', (e) => { if (e.target.id === 'leadModal') closeLeadModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLeadModal(); });

$('sGetReport')?.addEventListener('click', () => {
  if (!lastSeller) return;
  $('leadModal').classList.remove('hidden');
  setTimeout(() => $('leadName').focus(), 60);
});

$('leadForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('leadSubmit');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Preparing…';
  const lead = { name: $('leadName').value.trim(), phone: $('leadPhone').value.trim(), email: $('leadEmail').value.trim() };
  try {
    await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...lead,
        intent: 'sell',
        source: 'sell-page',
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
      }),
    }).then((r) => r.json()).catch(() => ({}));
  } finally {
    btn.disabled = false;
    btn.textContent = orig;
    $('leadForm').reset();
    closeLeadModal();
    openReport(lead);
  }
});

function openReport(lead) {
  const d = lastSeller;
  if (!d) return;
  const payload = {
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
  try { sessionStorage.setItem('prismReport', JSON.stringify(payload)); } catch {}
  window.open('/report', '_blank');
}

// ── Broker signup flow (/brokers) ─────────────────────────────────────
$('brokerForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('bSubmit');
  const orig = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="btn-spinner"></span> Submitting…';
  try {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: $('bName').value.trim(),
        agency: $('bAgency').value.trim(),
        brn: $('bBrn').value.trim(),
        phone: $('bPhone').value.trim(),
        email: $('bEmail').value.trim(),
        area: $('bAreas').value.trim(),
        message: $('bMessage').value.trim(),
        intent: 'broker',
        source: 'brokers-signup',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || 'Submission failed');
    $('brokerForm').classList.add('hidden');
    $('brokerSuccess').classList.remove('hidden');
    $('brokerSuccess').scrollIntoView({ behavior: 'smooth', block: 'center' });
  } catch (err) {
    btn.disabled = false;
    btn.textContent = orig;
    alert(err.message);
  }
});

boot();
