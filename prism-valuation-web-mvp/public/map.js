// Elevate Homes — "Visualise Dubai" 3D project map.
// Lazy-loads MapLibre GL from CDN when the section approaches the viewport,
// plots every project with registered DLD sales as a gold data-tower
// (height = market activity), and opens an Alnair-style project panel on
// click. If the map library or tiles are unreachable (offline demo, blocked
// CDN), the same data renders as a card grid instead — the section never
// breaks.

(() => {
  const $ = (id) => document.getElementById(id);
  const shell = $('mapShell');
  if (!shell) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Community centroids [lng, lat] ──────────────────────────────────
  // Canonical DLD AREA_EN names + common market names. Markers are placed
  // with a small deterministic offset per project within the community.
  const AREA_COORDS = {
    'Burj Khalifa': [55.2744, 25.1972],
    'Downtown Dubai': [55.2744, 25.1972],
    'Business Bay': [55.265, 25.185],
    'Marsa Dubai': [55.1403, 25.0805],
    'Dubai Marina': [55.1403, 25.0805],
    'Al Thanyah Fifth': [55.1421, 25.0693],
    'Jumeirah Lake Towers': [55.1421, 25.0693],
    'Al Barsha South Fourth': [55.2094, 25.0602],
    'Jumeirah Village Circle': [55.2094, 25.0602],
    'Al Barsha South Fifth': [55.1937, 25.0472],
    'Jumeirah Village Triangle': [55.1937, 25.0472],
    'Al Barsha South Third': [55.2172, 25.0714],
    'Arjan': [55.2436, 25.0611],
    'Al Barsha South': [55.2436, 25.0611],
    'Hadaeq Sheikh Mohammed Bin Rashid': [55.248, 25.1069],
    'Dubai Hills Estate': [55.248, 25.1069],
    'Palm Jumeirah': [55.139, 25.1124],
    'Al Merkadh': [55.302, 25.155],
    'Mohammed Bin Rashid City': [55.302, 25.155],
    'Meydan': [55.302, 25.155],
    'Al Khairan First': [55.3428, 25.2048],
    'Dubai Creek Harbour': [55.3428, 25.2048],
    'Zaabeel Second': [55.2926, 25.2205],
    'Za\'abeel': [55.2926, 25.2205],
    'Al Kifaf': [55.2937, 25.2331],
    'Al Jadaf': [55.3306, 25.2225],
    'Al Jaddaf': [55.3306, 25.2225],
    'Jumeirah Second': [55.2377, 25.2192],
    'Al Wasl': [55.2508, 25.2079],
    'Um Suqaim Third': [55.1972, 25.1442],
    'Madinat Jumeirah Living': [55.1972, 25.1442],
    'Al Safouh Second': [55.1657, 25.0973],
    'Dubai Internet City': [55.1657, 25.0973],
    'Al Hebiah First': [55.2472, 25.0389],
    'Motor City': [55.2472, 25.0389],
    'Al Hebiah Fourth': [55.2211, 25.0304],
    'Dubai Sports City': [55.2211, 25.0304],
    'Al Hebiah Third': [55.2394, 25.0517],
    'Al Hebiah Fifth': [55.1873, 25.0146],
    'Dubai Production City': [55.1704, 25.0329],
    'Me\'Aisem First': [55.1704, 25.0329],
    'Al Furjan': [55.1463, 25.0264],
    'Jabal Ali First': [55.1201, 25.0269],
    'Discovery Gardens': [55.1408, 25.038],
    'Dubai Investment Park First': [55.176, 24.9857],
    'Dubai Investments Park': [55.176, 24.9857],
    'Madinat Al Mataar': [55.1553, 24.8926],
    'Dubai South': [55.1553, 24.8926],
    'Saih Shuaib 2': [55.0561, 24.9376],
    'Al Yelayiss 2': [55.2721, 25.0004],
    'Town Square': [55.2721, 25.0004],
    'Al Yelayiss 1': [55.2905, 25.0143],
    'Wadi Al Safa 5': [55.3057, 25.0722],
    'Dubailand': [55.3057, 25.0722],
    'Wadi Al Safa 3': [55.3196, 25.0989],
    'Wadi Al Safa 7': [55.3421, 25.0783],
    'Nad Al Shiba First': [55.3363, 25.1611],
    'Nadd Al Shiba': [55.3363, 25.1611],
    'Al Warsan First': [55.4076, 25.1631],
    'International City': [55.4076, 25.1631],
    'Al Goze Fourth': [55.2311, 25.1479],
    'Al Quoz': [55.2311, 25.1479],
    'Mirdif': [55.4185, 25.2214],
    'Al Satwa': [55.2704, 25.2242],
    'Trade Center Second': [55.2833, 25.2255],
    'Emirates Hills': [55.1683, 25.0662],
    'The Views': [55.1735, 25.0921],
    'The Greens': [55.1687, 25.0959],
    'Jumeirah Park': [55.1531, 25.0475],
    'Jumeirah Islands': [55.155, 25.058],
    'Bluewaters': [55.1198, 25.0788],
    'Island 2': [55.1198, 25.0788],
    'Mina Rashid': [55.2769, 25.2621],
    'Al Sofouh First': [55.1804, 25.1055],
    'Barsha Heights': [55.1744, 25.0987],
    'Al Barsha First': [55.2001, 25.1123],
    'Ras Al Khor Industrial First': [55.3491, 25.1809],
    'Dubai Silicon Oasis': [55.3846, 25.1279],
    'Nadd Hessa': [55.3846, 25.1279],
    'Liwan': [55.376, 25.0836],
    'Wadi Al Safa 2': [55.2848, 25.0468],
    'Arabian Ranches': [55.2691, 25.0521],
    'Damac Hills': [55.2517, 25.0269],
    'Al Hebiah Second': [55.2517, 25.0269],
    'Remraam': [55.2494, 24.9994],
    'Al Hebiah Sixth': [55.2377, 25.0653],
    'Studio City': [55.2439, 25.0453],
    'Majan': [55.3232, 25.0866],
    'Wadi Al Safa 4': [55.3232, 25.0866],
    'Dubai Land Residence Complex': [55.3778, 25.0964],
    'Al Barari': [55.3168, 25.0993],
    'Festival City': [55.3512, 25.2225],
    'Al Kheeran': [55.3512, 25.2225],
    'Culture Village': [55.3374, 25.227],
    'Al Badaa': [55.2601, 25.2172],
    'City Walk': [55.2601, 25.2172],
    'Port De La Mer': [55.2716, 25.2632],
    'Jumeirah First': [55.2716, 25.2632],
    'Maritime City': [55.2745, 25.2758],
    'Dubai Maritime City': [55.2745, 25.2758],
    'Al Sufouh': [55.172, 25.1027],
    'Green Community': [55.1707, 24.9922],
    'The Villa': [55.3468, 25.0764],
    'Falcon City': [55.3468, 25.0764],
    'Akoya Oxygen': [55.2222, 24.9629],
    'Al Yufrah 1': [55.2222, 24.9629],
    'Sheikh Zayed Road': [55.2794, 25.2115],
    'Al Merkadh First': [55.3095, 25.1668],
    'Sobha Hartland': [55.3095, 25.1668],
    'Ras Al Khor': [55.3388, 25.1706],
    'Dubai Design District': [55.2985, 25.1868],
    'Zaabeel First': [55.3021, 25.2321],
    'Al Karama': [55.3021, 25.2321],
    'Oud Metha': [55.3143, 25.2447],
    'Umm Hurair Second': [55.3143, 25.2447],
    'Al Mamzar': [55.3489, 25.2937],
    'Deira': [55.3271, 25.2711],
    'Al Baraha': [55.3244, 25.2823],
    'Muhaisnah First': [55.4155, 25.2536],
    'Al Qusais': [55.3925, 25.2823],
    'Al Nahda': [55.372, 25.2941],
  };

  const hashJitter = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    const a = (h % 360) * (Math.PI / 180);
    const r = 0.0022 + ((h >> 9) % 100) / 100 * 0.0038; // ~250–650 m
    return [Math.cos(a) * r, Math.sin(a) * r * 0.85];
  };

  const coordFor = (p) => {
    const base = AREA_COORDS[p.area] || AREA_COORDS[p.community];
    if (!base) return null;
    const [dx, dy] = hashJitter(p.name);
    return [base[0] + dx, base[1] + dy];
  };

  const fmtPrice = (n) =>
    n >= 1_000_000 ? `AED ${(n / 1_000_000).toFixed(2)}M` : `AED ${Math.round(n).toLocaleString()}`;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const FLY_STOPS = [
    ['Downtown', [55.2744, 25.1972], 13.4],
    ['Marina', [55.1403, 25.0805], 13.6],
    ['Business Bay', [55.265, 25.185], 13.8],
    ['Creek Harbour', [55.3428, 25.2048], 13.6],
    ['JVC', [55.2094, 25.0602], 13.6],
    ['Dubai Hills', [55.248, 25.1069], 13.2],
    ['Palm', [55.139, 25.1124], 12.8],
    ['MBR City', [55.302, 25.155], 13.0],
    ['All Dubai', [55.25, 25.11], 10.6],
  ];

  let projects = [];
  let map = null;
  let mode = 'offplan';

  // ── Data ────────────────────────────────────────────────────────────
  async function loadProjects() {
    const url = mode === 'offplan' ? '/api/projects?offplan=true&limit=120' : '/api/projects?limit=120';
    const d = await fetch(url).then((r) => r.json());
    projects = (d.projects || []).map((p) => ({ ...p, coord: coordFor(p) })).filter((p) => p.coord);
  }

  // ── Project panel (the Alnair-style card) ───────────────────────────
  function openPanel(p) {
    const panel = $('mapPanel');
    const imgSlug = slug(p.name);
    const initial = esc((p.name || '?').charAt(0));
    panel.innerHTML = `
      <button class="map-panel-close" id="mapPanelClose" aria-label="Close">×</button>
      <div class="map-panel-media" id="mapPanelMedia"><span class="map-panel-initial">${initial}</span></div>
      <div class="map-panel-body">
        <div class="map-panel-badges">
          ${p.offplanPct >= 50 ? `<span class="badge badge-gold">OFF-PLAN ${p.offplanPct}%</span>` : '<span class="badge">READY-MARKET</span>'}
          <span class="badge">${p.sales} registered sales</span>
        </div>
        <h3>${esc(p.name)}</h3>
        <p class="map-panel-loc">${esc(p.community || p.area)}${p.community && p.area && p.community !== p.area ? ' · ' + esc(p.area) : ''}</p>
        <div class="map-panel-stats">
          <div><strong>${p.medianPsf.toLocaleString()}</strong><span>median AED/sqft</span></div>
          <div><strong>${fmtPrice(p.medianPrice)}</strong><span>median price</span></div>
          <div><strong>${esc(p.lastSale || '—')}</strong><span>last registered sale</span></div>
        </div>
        <div class="map-panel-actions">
          <button class="btn btn-gold" id="mapPanelValue">Value a unit here</button>
          <a class="btn btn-ghost" id="mapPanelTalk" href="#" target="_blank" rel="noopener">Talk to an analyst</a>
        </div>
        <p class="map-panel-note">Live DLD registry aggregates. Location approximate within community.</p>
      </div>`;
    panel.classList.remove('hidden');

    // Developer render if one has been added at /img/projects/<slug>.jpg
    const media = $('mapPanelMedia');
    const img = new Image();
    img.onload = () => { media.innerHTML = ''; media.appendChild(img); };
    img.alt = p.name;
    img.src = `/img/projects/${imgSlug}.jpg`;

    $('mapPanelClose').onclick = () => panel.classList.add('hidden');
    $('mapPanelValue').onclick = () => {
      const seArea = $('seArea');
      if (seArea) {
        seArea.value = p.area || '';
        const seProject = $('seProject');
        if (seProject) seProject.value = p.name || '';
      }
      document.getElementById('sell')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    };
    const wa = $('navWhatsapp');
    if (wa && wa.href && wa.href !== '#') {
      $('mapPanelTalk').href = wa.href.split('?')[0] +
        `?text=${encodeURIComponent(`Hi — I'm interested in ${p.name} (${p.community || p.area}). Median ${p.medianPsf} AED/sqft on DLD. Can we talk?`)}`;
    } else {
      $('mapPanelTalk').style.display = 'none';
    }
  }

  // ── Fallback grid (no map library / no tiles) ───────────────────────
  function renderFallback() {
    shell.classList.add('is-fallback');
    $('dubaiMap').classList.add('hidden');
    const fb = $('mapFallback');
    fb.classList.remove('hidden');
    fb.innerHTML = projects.slice(0, 12).map((p, i) => `
      <button class="map-card" data-i="${i}">
        <span class="map-card-initial">${esc(p.name.charAt(0))}</span>
        <span class="map-card-name">${esc(p.name)}</span>
        <span class="map-card-loc">${esc(p.community || p.area)}</span>
        <span class="map-card-stats">${p.medianPsf.toLocaleString()} AED/sqft · ${p.sales} sales</span>
      </button>`).join('');
    fb.querySelectorAll('.map-card').forEach((el) =>
      el.addEventListener('click', () => openPanel(projects[Number(el.dataset.i)])));
  }

  // ── Map boot ────────────────────────────────────────────────────────
  function towersGeoJSON() {
    const R = 0.00075; // ~80 m hexagon radius
    const maxSales = Math.max(...projects.map((p) => p.sales), 1);
    return {
      type: 'FeatureCollection',
      features: projects.map((p, i) => {
        const [cx, cy] = p.coord;
        const ring = [];
        for (let k = 0; k <= 6; k++) {
          const a = (Math.PI / 3) * k;
          ring.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R * 0.9]);
        }
        return {
          type: 'Feature',
          id: i,
          properties: {
            i,
            name: p.name,
            height: 250 + (p.sales / maxSales) * 2000,
            psf: p.medianPsf,
          },
          geometry: { type: 'Polygon', coordinates: [ring] },
        };
      }),
    };
  }

  function loadScript(src) {
    return new Promise((ok, err) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = ok;
      s.onerror = () => err(new Error('script load failed'));
      document.head.appendChild(s);
      setTimeout(() => err(new Error('script timeout')), 12000);
    });
  }

  async function bootMap() {
    try {
      await loadProjects();
    } catch {
      shell.classList.add('hidden');
      return;
    }
    if (!projects.length) { shell.classList.add('hidden'); return; }

    try {
      if (!document.querySelector('link[data-maplibre]')) {
        const l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
        l.setAttribute('data-maplibre', '');
        document.head.appendChild(l);
      }
      await loadScript('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js');
      if (!window.maplibregl) throw new Error('maplibregl missing');

      map = new maplibregl.Map({
        container: 'dubaiMap',
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [55.25, 25.08],
        zoom: 9.6,
        pitch: 55,
        bearing: -12,
        antialias: true,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

      const failTimer = setTimeout(() => renderFallback(), 15000);
      map.on('error', (e) => {
        // style/tiles unreachable → graceful grid
        if (!map._styleLoadedOnce) { clearTimeout(failTimer); renderFallback(); }
      });

      map.on('load', () => {
        map._styleLoadedOnce = true;
        clearTimeout(failTimer);

        // context skyline from OSM building footprints (best-effort)
        try {
          const layers = map.getStyle().layers;
          const labelLayer = layers.find((l) => l.type === 'symbol')?.id;
          map.addLayer({
            id: 'osm-buildings',
            type: 'fill-extrusion',
            source: 'carto',
            'source-layer': 'building',
            minzoom: 12,
            paint: {
              'fill-extrusion-color': '#131a22',
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 12],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.75,
            },
          }, labelLayer);
        } catch { /* schema differs — skyline is optional */ }

        // gold data towers
        map.addSource('towers', { type: 'geojson', data: towersGeoJSON() });
        map.addLayer({
          id: 'towers',
          type: 'fill-extrusion',
          source: 'towers',
          paint: {
            'fill-extrusion-color': [
              'interpolate', ['linear'], ['get', 'psf'],
              800, '#8a6f3f', 1500, '#c8a96a', 2600, '#e8c87a', 4000, '#f4dc9a',
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-opacity': 0.92,
          },
        });

        map.on('click', 'towers', (e) => {
          const f = e.features && e.features[0];
          if (f) openPanel(projects[f.properties.i]);
        });
        map.on('mouseenter', 'towers', () => (map.getCanvas().style.cursor = 'pointer'));
        map.on('mouseleave', 'towers', () => (map.getCanvas().style.cursor = ''));

        // cinematic entrance
        if (!reduced) {
          map.easeTo({ center: [55.25, 25.13], zoom: 10.7, pitch: 58, bearing: -20, duration: 3200 });
        } else {
          map.jumpTo({ center: [55.25, 25.13], zoom: 10.7 });
        }
      });

      // fly-to chips
      const chips = $('mapChips');
      chips.innerHTML = FLY_STOPS.map(
        ([label], i) => `<button class="map-chip${i === FLY_STOPS.length - 1 ? ' map-chip-muted' : ''}" data-i="${i}">${label}</button>`,
      ).join('');
      chips.querySelectorAll('.map-chip').forEach((el) =>
        el.addEventListener('click', () => {
          const [, center, zoom] = FLY_STOPS[Number(el.dataset.i)];
          map.flyTo({ center, zoom, pitch: 58, bearing: (Math.random() * 50 - 25) | 0, duration: reduced ? 0 : 2600, essential: true });
        }));

      // mode toggle
      $('mapToggle')?.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-mode]');
        if (!btn || btn.dataset.mode === mode) return;
        mode = btn.dataset.mode;
        $('mapToggle').querySelectorAll('[data-mode]').forEach((b) =>
          b.classList.toggle('on', b.dataset.mode === mode));
        await loadProjects();
        const src = map.getSource('towers');
        if (src) src.setData(towersGeoJSON());
      });
    } catch {
      renderFallback();
    }
  }

  // Lazy boot when the section nears the viewport
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        bootMap();
      }
    }, { rootMargin: '600px 0px' });
    io.observe(shell);
  } else {
    bootMap();
  }
})();
