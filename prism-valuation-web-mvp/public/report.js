// Elevate Homes — pricing report renderer.
// Reads the report payload stashed in sessionStorage by the main site, then
// renders a branded, printable seller or buyer report. No dependencies.

const $ = (id) => document.getElementById(id);
const fmtAed = (n) => (Number.isFinite(n) ? `AED ${Math.round(n).toLocaleString('en-US')}` : '—');
const fmtNum = (n) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const VERDICT_CLS = { 'Strong Buy': 'buy', 'Fair Value': 'fair', Overpriced: 'over' };

$('printBtn')?.addEventListener('click', () => window.print());

function load() {
  let payload = null;
  try { payload = JSON.parse(sessionStorage.getItem('prismReport') || 'null'); } catch {}
  if (!payload || !payload.valuation) return; // empty state stays visible

  $('empty').classList.add('hidden');
  $('report').classList.remove('hidden');

  const d = payload.valuation;
  const p = payload.property || {};
  const isSeller = payload.type === 'seller';

  $('repTitle').textContent = isSeller ? 'Seller Pricing Report' : 'Buyer Pricing Proof';
  const dt = payload.generatedAt ? new Date(payload.generatedAt) : new Date();
  $('repDate').textContent = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  document.title = `${$('repTitle').textContent} — Elevate Homes`;

  // Property summary
  const items = [
    ['Area', p.area || d.resolvedArea || '—'],
    ['Project', p.project || d.resolvedProject || 'Area-wide'],
    ['Unit', p.rooms || 'Any'],
    ['Size', p.sizeSqft ? `${fmtNum(p.sizeSqft)} sqft` : '—'],
  ];
  if (!isSeller && p.askingPrice) items.push(['Asking price', fmtAed(p.askingPrice)]);
  if (payload.client && payload.client.name) items.push(['Prepared for', esc(payload.client.name)]);
  $('propSummary').innerHTML = items
    .map(([k, v]) => `<div class="pi"><span>${esc(k)}</span><strong>${v}</strong></div>`)
    .join('');

  // Headline
  if (isSeller) {
    const g = d.listingGuidance || {};
    let html =
      `<div class="hl-label">DLD fair value</div>` +
      `<div class="hl-value">${fmtAed(d.fairValue)}</div>` +
      `<div class="hl-sub">${fmtNum(d.fairPsf)} AED/sqft · ${d.confidence} confidence · ${fmtNum(d.compCount)} comparables · ${esc(d.liquidity)} liquidity</div>` +
      `<div class="guide">` +
      `<div class="g"><span>Price to sell faster</span><strong>${fmtAed(g.quickSale)}</strong></div>` +
      `<div class="g feat"><span>Recommended listing</span><strong>${fmtAed(g.market)}</strong></div>` +
      `<div class="g"><span>Maximise (patient)</span><strong>${fmtAed(g.ambitious)}</strong></div>` +
      `</div>`;
    if (d.targetVerdict) {
      const tv = d.targetVerdict;
      const sign = tv.gapPct > 0 ? '+' : '';
      html += `<div class="hl-sub" style="margin-top:16px"><strong>Your target ${fmtAed(tv.targetPrice)}</strong> — ${sign}${tv.gapPct}% vs fair value. ${esc(tv.label)}.</div>`;
    }
    $('headline').innerHTML = html;
  } else {
    const cls = VERDICT_CLS[d.verdict] || 'fair';
    const sign = d.discountPct > 0 ? '+' : '';
    $('headline').innerHTML =
      `<div class="hl-verdict ${cls}">${esc(d.verdict)}</div>` +
      `<div class="hl-label">DLD fair value</div>` +
      `<div class="hl-value">${fmtAed(d.fairValue)}</div>` +
      `<div class="hl-sub">Asking ${fmtAed(p.askingPrice)} — ${sign}${d.discountPct}% vs DLD median (${fmtNum(d.dldMedianPsf)} AED/sqft) · ${d.confidence} confidence · ${fmtNum(d.compCount)} comparables</div>`;
  }

  // Band
  const median = isSeller ? d.fairPsf : d.dldMedianPsf;
  const marker = isSeller
    ? (d.targetVerdict ? Math.round(d.targetVerdict.targetPrice / d.sizeSqft) : null)
    : d.askingPsf;
  const markerLabel = isSeller ? 'Your target' : 'Asking';
  const vals = [d.lowPsf, d.highPsf, median].concat(Number.isFinite(marker) ? [marker] : []);
  const lo = Math.min(...vals) * 0.95;
  const hi = Math.max(...vals) * 1.05;
  const pct = (v) => Math.max(1, Math.min(99, ((v - lo) / (hi - lo)) * 100));
  $('rbandRange').style.left = `${pct(d.lowPsf)}%`;
  $('rbandRange').style.width = `${pct(d.highPsf) - pct(d.lowPsf)}%`;
  $('rbandMedian').style.left = `${pct(median)}%`;
  if (Number.isFinite(marker)) {
    const mk = $('rbandMarker');
    mk.style.left = `${pct(marker)}%`;
    $('rbandMarkerLabel').textContent = `${markerLabel} ${fmtNum(marker)}`;
    mk.classList.remove('hidden');
  }
  $('rbandLow').textContent = `P25 · ${fmtNum(d.lowPsf)}`;
  $('rbandMid').textContent = `DLD median ${fmtNum(median)}`;
  $('rbandHigh').textContent = `P75 · ${fmtNum(d.highPsf)}`;

  // Advisor note (optional)
  const note = isSeller ? d.sellerNote : d.analystNote;
  if (note) {
    $('noteBlock').classList.remove('hidden');
    $('noteText').textContent = note;
  }

  // Comparables
  const comps = Array.isArray(d.comparables) ? d.comparables : [];
  $('compCount').textContent = comps.length ? `· ${comps.length} shown` : '';
  $('compBody').innerHTML = comps.length
    ? comps
        .map(
          (c) => `<tr>
            <td>${esc((c.date || '').slice(0, 10))}</td>
            <td>${esc(c.project || '—')}</td>
            <td>${esc(c.rooms || '—')}</td>
            <td class="num">${fmtNum(c.sizeSqft)}</td>
            <td class="num">${fmtNum(c.transValue)}</td>
            <td class="num">${fmtNum(c.aedPerSqft)}</td>
          </tr>`,
        )
        .join('')
    : '<tr><td colspan="6">Comparable detail is available from your advisor.</td></tr>';

  // Methodology
  $('methodText').textContent =
    `Fair value is the median AED/sqft of registered DLD residential sales matched to this property (${d.fallback?.label || 'comparable set'}), ` +
    `applied to the stated size. The P25–P75 band shows where the middle half of those comparable sales transacted. ` +
    `This estimate is rated ${d.confidence} confidence on ${fmtNum(d.compCount)} comparable transaction(s).`;

  // Footer / contact
  if (payload.client && payload.client.name) {
    $('contactLine').textContent = `Prepared for ${payload.client.name}. Speak to an advisor about this report.`;
  }
  if (payload.agentWhatsapp) {
    const msg = encodeURIComponent(`Hi Sambhav — I'd like to discuss my Elevate Homes pricing report for ${p.area || 'my property'}.`);
    $('repWhatsapp').href = `https://wa.me/${payload.agentWhatsapp}?text=${msg}`;
  } else {
    $('repWhatsapp').classList.add('hidden');
  }
}

load();
