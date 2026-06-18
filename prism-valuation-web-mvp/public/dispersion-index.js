(function () {
  const $ = (id) => document.getElementById(id);

  function fmtDate(d) {
    if (!d) return '—';
    try {
      return new Date(d + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  }

  function render(data) {
    if (data.isSynthetic) $('synthBanner').classList.remove('hidden');
    $('methodMinComps').textContent = data.minComps;

    $('diMeta').textContent =
      `Window: registered sales from ${fmtDate(data.dataDate.min)} to ${fmtDate(data.dataDate.max)} ` +
      `(${data.rowCount.toLocaleString()} clean rows analysed) · generated ${new Date(data.generatedAt).toLocaleString('en-GB')}`;

    const list = $('diList');
    if (!data.top || !data.top.length) {
      list.innerHTML = '<div class="di-loading">Not enough comparable sales yet to rank a dispersion index — check back as more transactions register.</div>';
      return;
    }

    list.innerHTML = data.top
      .map(
        (row, i) => `
      <div class="di-row">
        <div class="di-rank">${i + 1}</div>
        <div class="di-row-main">
          <strong>${row.area} — ${row.rooms}</strong>
          <span>${row.compCount} comparable sales · median ${row.medianPsf.toLocaleString()} AED/sqft (P25 ${row.p25Psf.toLocaleString()} – P75 ${row.p75Psf.toLocaleString()})</span>
        </div>
        <div class="di-score">
          <strong>${row.dispersionPct}%</strong>
          <span>price spread</span>
        </div>
      </div>`,
      )
      .join('');
  }

  fetch('/api/dispersion-index')
    .then((r) => r.json())
    .then(render)
    .catch(() => {
      $('diList').innerHTML = '<div class="di-loading">Could not load the index right now — try again shortly.</div>';
    });
})();
