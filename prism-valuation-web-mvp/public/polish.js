// Elevate Homes — polish layer (progressive enhancement).
// Adds motion and the live hero market-pulse panel. Never required for the
// site to function: every hook checks the DOM it needs and bails quietly.

(() => {
  const doc = document.documentElement;
  doc.classList.add('pjs');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const onReady = (fn) =>
    document.readyState === 'loading'
      ? document.addEventListener('DOMContentLoaded', fn)
      : fn();

  // ── Nav scrolled state ──────────────────────────────────────────────
  const nav = document.querySelector('.nav');
  if (nav) {
    const setNav = () => nav.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', setNav, { passive: true });
    setNav();
  }

  // ── Reveal on scroll ────────────────────────────────────────────────
  onReady(() => {
    const groups = document.querySelectorAll('.section-inner, .hero-copy, footer');
    let tagged = [];
    for (const g of groups) {
      [...g.children].forEach((el, i) => {
        if (el.hasAttribute('data-reveal')) return;
        el.setAttribute('data-reveal', '');
        el.style.setProperty('--rd', String(Math.min(i, 6) * 80));
        tagged.push(el);
      });
    }
    if (!tagged.length) return;
    if (reduced || !('IntersectionObserver' in window)) {
      tagged.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    tagged.forEach((el) => io.observe(el));
  });

  // ── Verdict pop: replay entrance when a result card is shown ────────
  onReady(() => {
    for (const id of ['resultCard', 'sellCard']) {
      const el = document.getElementById(id);
      if (!el) continue;
      new MutationObserver(() => {
        if (!el.classList.contains('hidden') && !el.classList.contains('pop')) {
          el.classList.add('pop');
          el.addEventListener('animationend', () => el.classList.remove('pop'), { once: true });
        }
      }).observe(el, { attributes: true, attributeFilter: ['class'] });
    }
  });

  // ── Hero live market pulse ──────────────────────────────────────────
  onReady(async () => {
    const wrap = document.getElementById('heroPulse');
    if (!wrap) return;

    let trends = null;
    let recent = [];
    try {
      [trends, recent] = await Promise.all([
        fetch('/api/trends').then((r) => r.json()),
        fetch('/api/properties?limit=10&sort=date')
          .then((r) => r.json())
          .then((d) => d.properties || d.rows || d.results || [])
          .catch(() => []),
      ]);
    } catch {
      return; // no data — leave the panel hidden
    }
    const monthly = (trends && trends.monthly ? trends.monthly : []).slice(-12);
    if (monthly.length < 3) return;

    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    const deltaPct = prev && prev.medianPsf ? ((last.medianPsf - prev.medianPsf) / prev.medianPsf) * 100 : 0;
    const up = deltaPct >= 0;
    const monthLabel = (m) => {
      const [y, mo] = m.split('-').map(Number);
      return new Date(Date.UTC(y, mo - 1, 1)).toLocaleString('en', { month: 'short' });
    };

    // sparkline geometry
    const W = 320;
    const H = 88;
    const PAD = 6;
    const vals = monthly.map((m) => m.medianPsf);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const pts = vals.map((v, i) => [
      PAD + (i * (W - PAD * 2)) / (vals.length - 1),
      H - PAD - ((v - min) / span) * (H - PAD * 2),
    ]);
    // smooth path via quadratic midpoints
    let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;
      d += ` Q ${x0.toFixed(1)} ${y0.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
    }
    d += ` L ${pts[pts.length - 1][0].toFixed(1)} ${pts[pts.length - 1][1].toFixed(1)}`;
    const area = `${d} L ${(W - PAD).toFixed(1)} ${H - 2} L ${PAD} ${H - 2} Z`;
    const lastPt = pts[pts.length - 1];

    wrap.innerHTML = `
      <div class="pulse-head"><span class="pulse-dot"></span>Live market pulse — Dubai</div>
      <div class="pulse-big">
        <strong id="pulsePsf">0</strong>
        <span class="pulse-unit">AED / sqft median · ${monthLabel(last.month)}</span>
        <span class="pulse-delta ${up ? 'up' : 'down'}">${up ? '▲' : '▼'} ${Math.abs(deltaPct).toFixed(1)}% vs ${monthLabel(prev.month)}</span>
      </div>
      <p class="pulse-caption">${Number(last.count).toLocaleString()} registered sales this month · DLD registry</p>
      <div class="pulse-chart">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="pulseStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stop-color="#0ea5b8"/><stop offset="1" stop-color="#e8c87a"/>
            </linearGradient>
            <linearGradient id="pulseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(200,169,106,0.22)"/><stop offset="1" stop-color="rgba(200,169,106,0)"/>
            </linearGradient>
          </defs>
          <path class="pulse-area" d="${area}" fill="url(#pulseFill)"></path>
          <path class="pulse-line" d="${d}" pathLength="1"></path>
          <circle cx="${lastPt[0].toFixed(1)}" cy="${lastPt[1].toFixed(1)}" r="3" fill="#e8c87a"></circle>
          <text class="pulse-axis" x="${PAD}" y="${H - 0.5}">${monthLabel(monthly[0].month)}</text>
          <text class="pulse-axis" x="${W - PAD}" y="${H - 0.5}" text-anchor="end">${monthLabel(last.month)}</text>
        </svg>
      </div>
      <div class="pulse-ticker">
        <div class="pulse-ticker-label">Latest registered sales</div>
        <div class="tick-item" id="pulseTick"></div>
      </div>`;

    // animate line + big number
    requestAnimationFrame(() => {
      wrap.querySelector('.pulse-line').classList.add('draw');
      wrap.querySelector('.pulse-area').classList.add('draw');
    });
    const psfEl = wrap.querySelector('#pulsePsf');
    const target = Math.round(last.medianPsf);
    if (reduced) {
      psfEl.textContent = target.toLocaleString();
    } else {
      const t0 = performance.now();
      const ms = 1300;
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / ms);
        psfEl.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString();
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // rotating ticker of the latest sales
    const tickEl = wrap.querySelector('#pulseTick');
    const items = recent
      .filter((r) => r && (r.project || r.area) && r.transValue)
      .slice(0, 8)
      .map((r) => ({
        what: r.project || r.area,
        rooms: r.rooms || '',
        price: r.transValue,
        psf: r.aedPerSqft,
      }));
    if (items.length) {
      let i = 0;
      const fmtPrice = (n) =>
        n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n).toLocaleString()}`;
      const show = () => {
        const it = items[i % items.length];
        tickEl.classList.remove('in');
        setTimeout(() => {
          tickEl.innerHTML = `
            <span class="tick-what">${it.what}${it.rooms ? ` <span class="tick-rooms">· ${it.rooms}</span>` : ''}</span>
            <span class="tick-price">${fmtPrice(it.price)}</span>
            ${it.psf ? `<span class="tick-psf">${Math.round(it.psf).toLocaleString()}/sqft</span>` : ''}`;
          tickEl.classList.add('in');
        }, reduced ? 0 : 350);
        i++;
      };
      show();
      if (!reduced && items.length > 1) setInterval(show, 3800);
    } else {
      wrap.querySelector('.pulse-ticker').style.display = 'none';
    }

    // subtle 3D tilt (desktop, motion allowed)
    if (!reduced && matchMedia('(pointer: fine)').matches) {
      const damp = 24;
      wrap.addEventListener('pointermove', (e) => {
        const b = wrap.getBoundingClientRect();
        const rx = ((e.clientY - b.top) / b.height - 0.5) * -damp / 10;
        const ry = ((e.clientX - b.left) / b.width - 0.5) * (damp / 10);
        wrap.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
      wrap.addEventListener('pointerleave', () => {
        wrap.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1)';
        wrap.style.transform = 'perspective(900px)';
        setTimeout(() => (wrap.style.transition = ''), 500);
      });
    }
  });
})();
