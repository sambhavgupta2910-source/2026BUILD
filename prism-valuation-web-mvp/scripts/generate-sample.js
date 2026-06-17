// Generates a SYNTHETIC, DLD-shaped dataset so the app boots for local UI work
// and demos when no real data source is configured (e.g. Dubai Pulse API access
// pending, or offline). Output is written to ../transactions-dev.csv, which is
// gitignored via the `transactions-*.csv` rule — it is never committed and must
// never be presented as real market data (see AGENTS.md framing constraint).
//
//   node scripts/generate-sample.js   →   writes ../transactions-dev.csv
//
// Deterministic (seeded) so repeated runs reproduce the same file.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'transactions-dev.csv');
const SQM_TO_SQFT = 10.764;

// ── Seeded RNG (mulberry32) ─────────────────────────────────────────────────
let _seed = 0x9e3779b9;
function rng() {
  _seed |= 0; _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const gauss = () => Math.sqrt(-2 * Math.log(rng() || 1e-9)) * Math.cos(2 * Math.PI * rng());

const REF = new Date('2026-06-16T00:00:00Z'); // most recent transaction date
const DAYS_BACK = 450;

// Room types: size band (sqft) + a PSF factor making larger units cheaper per
// sqft — a realistic effect the comparable bands then reflect.
const ROOMS = {
  'Studio': { lo: 360, hi: 540, psfFactor: 1.10 },
  '1 B/R':  { lo: 620, hi: 980, psfFactor: 1.04 },
  '2 B/R':  { lo: 1020, hi: 1520, psfFactor: 1.0 },
  '3 B/R':  { lo: 1580, hi: 2350, psfFactor: 0.94 },
  '4 B/R':  { lo: 2550, hi: 3900, psfFactor: 0.88 },
};

// Areas: approximate Dubai 2026 resale price levels for a believable demo.
const AREAS = [
  { area: 'Business Bay', community: 'Business Bay', psf: 1850, w: 1.30, off: 0.34,
    projects: ['The Crestmark', 'Peninsula One', 'Bayz 101', 'Vela Viento', 'Merano Tower'],
    mix: { 'Studio': 0.22, '1 B/R': 0.40, '2 B/R': 0.26, '3 B/R': 0.10, '4 B/R': 0.02 } },
  { area: 'Downtown Dubai', community: 'Downtown Dubai', psf: 2450, w: 1.05, off: 0.22,
    projects: ['Burj Royale', 'Forte', 'Act One Act Two', 'St Regis Residences', 'The Address Residences'],
    mix: { 'Studio': 0.16, '1 B/R': 0.38, '2 B/R': 0.30, '3 B/R': 0.13, '4 B/R': 0.03 } },
  { area: 'Dubai Marina', community: 'Dubai Marina', psf: 1980, w: 1.20, off: 0.18,
    projects: ['Marina Gate', 'Stella Maris', 'LIV Residence', 'Vida Residences', 'Marina Shores'],
    mix: { 'Studio': 0.18, '1 B/R': 0.40, '2 B/R': 0.28, '3 B/R': 0.11, '4 B/R': 0.03 } },
  { area: 'Jumeirah Village Circle', community: 'JVC', psf: 1240, w: 1.35, off: 0.40,
    projects: ['Binghatti Heights', 'Belgravia', 'Oxford Residence', 'Bloom Towers', 'Diamond Views'],
    mix: { 'Studio': 0.30, '1 B/R': 0.42, '2 B/R': 0.21, '3 B/R': 0.06, '4 B/R': 0.01 } },
  { area: 'Dubai Creek Harbour', community: 'Dubai Creek Harbour', psf: 2080, w: 0.95, off: 0.46,
    projects: ['Creek Palace', 'Address Harbour Point', 'Creek Rise', 'Harbour Views', 'Savanna'],
    mix: { 'Studio': 0.14, '1 B/R': 0.38, '2 B/R': 0.32, '3 B/R': 0.13, '4 B/R': 0.03 } },
  { area: 'Palm Jumeirah', community: 'Palm Jumeirah', psf: 3250, w: 0.80, off: 0.16,
    projects: ['Como Residences', 'Serenia Living', 'Six Senses Residences', 'Palm Beach Towers'],
    mix: { 'Studio': 0.06, '1 B/R': 0.26, '2 B/R': 0.34, '3 B/R': 0.24, '4 B/R': 0.10 } },
  { area: 'Jumeirah Lake Towers', community: 'JLT', psf: 1390, w: 1.00, off: 0.12,
    projects: ['MBL Residence', 'So Sofitel', 'Goldcrest Views', 'Lake City Tower', 'Madina Tower'],
    mix: { 'Studio': 0.24, '1 B/R': 0.40, '2 B/R': 0.26, '3 B/R': 0.09, '4 B/R': 0.01 } },
  { area: 'Dubai Hills Estate', community: 'Dubai Hills Estate', psf: 1920, w: 1.00, off: 0.30,
    projects: ['Collective', 'Park Heights', 'Golf Suites', 'Socio', 'Ellington House'],
    mix: { 'Studio': 0.12, '1 B/R': 0.34, '2 B/R': 0.34, '3 B/R': 0.16, '4 B/R': 0.04 } },
  { area: 'Mohammed Bin Rashid City', community: 'MBR City', psf: 1810, w: 0.90, off: 0.42,
    projects: ['Sobha Hartland II', 'Skyscape Aura', 'The Crest', 'Azizi Riviera', 'Hartland Greens'],
    mix: { 'Studio': 0.14, '1 B/R': 0.36, '2 B/R': 0.32, '3 B/R': 0.14, '4 B/R': 0.04 } },
  { area: 'Jumeirah Beach Residence', community: 'JBR', psf: 2150, w: 0.75, off: 0.10,
    projects: ['Bahar', 'Murjan', 'Sadaf', 'Shams', 'La Vie'],
    mix: { 'Studio': 0.16, '1 B/R': 0.38, '2 B/R': 0.30, '3 B/R': 0.13, '4 B/R': 0.03 } },
  { area: 'Arjan', community: 'Arjan', psf: 1160, w: 0.95, off: 0.44,
    projects: ['Samana Hills', 'Vincitore Boulevard', 'Miraclz Tower', 'AG Tower'],
    mix: { 'Studio': 0.32, '1 B/R': 0.44, '2 B/R': 0.19, '3 B/R': 0.05, '4 B/R': 0.00 } },
  { area: 'Dubai Sports City', community: 'Dubai Sports City', psf: 1060, w: 0.90, off: 0.38,
    projects: ['Sportz by Danube', 'Canal Residence', 'Hera Tower', 'Elite Sports Residence'],
    mix: { 'Studio': 0.34, '1 B/R': 0.42, '2 B/R': 0.18, '3 B/R': 0.06, '4 B/R': 0.00 } },
  { area: 'Damac Hills', community: 'Damac Hills', psf: 1320, w: 0.80, off: 0.36,
    projects: ['DAMAC Lagoons', 'Golf Town', 'Artesia', 'Carson', 'Loreto'],
    mix: { 'Studio': 0.10, '1 B/R': 0.30, '2 B/R': 0.30, '3 B/R': 0.22, '4 B/R': 0.08 } },
];

function weightedRoom(mix) {
  const r = rng();
  let acc = 0;
  for (const [room, p] of Object.entries(mix)) {
    acc += p;
    if (r <= acc) return room;
  }
  return '2 B/R';
}

// Recent-weighted day offset so volume rises toward the present
function daysAgo() {
  return Math.floor(Math.pow(rng(), 1.6) * DAYS_BACK);
}

const HEADER = [
  'TRANSACTION_NUMBER', 'INSTANCE_DATE', 'GROUP_EN', 'PROCEDURE_EN', 'USAGE_EN',
  'AREA_EN', 'PROP_TYPE_EN', 'PROP_SB_TYPE_EN', 'ROOMS_EN', 'PROCEDURE_AREA',
  'ACTUAL_AREA', 'TRANS_VALUE', 'PROJECT_EN', 'MASTER_PROJECT_EN',
  'IS_OFFPLAN_EN', 'IS_FREE_HOLD_EN',
];

const TARGET_ROWS = 7200;
const totalW = AREAS.reduce((s, a) => s + a.w, 0);

const lines = [HEADER.join(',')];
let n = 0;
for (const a of AREAS) {
  const count = Math.round((a.w / totalW) * TARGET_ROWS);
  for (let i = 0; i < count; i++) {
    const room = weightedRoom(a.mix);
    const rc = ROOMS[room];
    const sqft = rc.lo + rng() * (rc.hi - rc.lo);
    const sqm = sqft / SQM_TO_SQFT;
    const psf = a.psf * rc.psfFactor * Math.exp(gauss() * 0.15);
    const value = Math.round(psf * sqft);
    const date = new Date(REF.getTime() - daysAgo() * 86400000).toISOString().slice(0, 10);
    const offplan = rng() < a.off ? 'Off-Plan' : 'Ready';
    n++;
    lines.push([
      `S-${100000 + n}`, date, 'Sales',
      offplan === 'Off-Plan' ? 'Sell Off-Plan' : 'Sell',
      'Residential', a.area, 'Unit', 'Flat', room,
      sqm.toFixed(2), sqm.toFixed(2), String(value),
      pick(a.projects), a.community, offplan, 'Free Hold',
    ].join(','));
  }
}

fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`[sample] wrote ${n.toLocaleString()} SYNTHETIC rows → ${OUT}`);
console.log('[sample] DEV/DEMO DATA ONLY — not real DLD transactions. Do not present as market figures.');
