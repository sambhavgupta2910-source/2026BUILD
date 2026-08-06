#!/usr/bin/env node
// Ranks Dubai brokerages by *registered* team size using the DLD broker register
// on Dubai Pulse, joins office contact details, and flags JVC-located offices.
//
// Website headcounts count admin staff, lapsed licences and overseas contractors.
// The register does not: every licensed broker (BRN) is tied to a brokerage (ORN),
// so brokers-per-ORN with a valid licence is a government-recorded team size.
//
// What this does NOT give you: off-plan focus. DLD does not tag brokerages by
// off-plan vs secondary and the transactions dataset carries no broker field, so
// off-plan mix still has to come from portal listings or from asking them.
//
// Required env vars:
//   DUBAI_PULSE_API_KEY              — API key from dubaipulse.gov.ae (sent as X-Api-Key)
//   DUBAI_PULSE_BROKERS_RESOURCE_ID  — CKAN resource id for the Real Estate Brokers dataset
//
// Optional env vars:
//   DUBAI_PULSE_OFFICES_RESOURCE_ID  — CKAN resource id for the Real Estate Offices dataset;
//                                      omit to skip the contact-details join
//   MIN_AGENTS                       — minimum registered agents to include (default 20)
//   INCLUDE_EXPIRED=1                — count brokers whose licence has lapsed
//   OUT_DIR                          — output directory (default ./out)
//   DUBAI_PULSE_API_BASE             — override the CKAN datastore_search endpoint

import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const API_BASE = process.env.DUBAI_PULSE_API_BASE
  || 'https://www.dubaipulse.gov.ae/api/3/action/datastore_search';
const PAGE_SIZE = 10000;
const MIN_AGENTS = Number(process.env.MIN_AGENTS || 20);
const INCLUDE_EXPIRED = process.env.INCLUDE_EXPIRED === '1';
const OUT_DIR = process.env.OUT_DIR || path.join(process.cwd(), 'out');

// JVC has almost no commercial office stock, so a location match is really a match
// against the handful of buildings that hold offices there.
const JVC_PATTERN =
  /\bJVC\b|JUMEIRAH\s*VILLAGE\s*CIRCLE|PRIME\s*BUSINESS\s*(CENTRE|CENTER)|REGINA\s*TOWER|CHAIMAA\s*PREMIERE/i;

// Fallback when the offices dataset carries no address field — the JVC firms
// identified by desk research in SOBHA_JVC_BROKERAGE_TARGETS.md.
const JVC_SEED_NAMES = [
  'AZCO',
  'LEVANTE',
  'YOU & HOUSE',
  'YOU AND HOUSE',
  'JVC SPECIALIST',
  'HONEY MONEY',
  'IRIS HOUSE',
  'EVERHOMES',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function required(name) {
  const v = process.env[name];
  if (!v) { console.error(`[broker-targets] Missing env var: ${name}`); process.exit(1); }
  return v;
}

function request(url, headers) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, { method: 'GET', headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

// Dubai Pulse dataset schemas drift between releases, so resolve each field we
// need against a list of names rather than hard-coding one.
function resolveField(sample, candidates) {
  const keys = Object.keys(sample);
  for (const candidate of candidates) {
    const hit = keys.find((k) => k.toLowerCase() === candidate.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function fieldValue(row, field) {
  if (!field) return '';
  const v = row[field];
  return v == null ? '' : String(v).trim();
}

async function fetchAll(resourceId, apiKey, label) {
  const headers = { 'X-Api-Key': apiKey, Accept: 'application/json' };
  const records = [];
  let offset = 0;
  let total = null;

  while (true) {
    const url = `${API_BASE}?resource_id=${encodeURIComponent(resourceId)}&limit=${PAGE_SIZE}&offset=${offset}`;
    const r = await request(url, headers);
    if (r.status !== 200) {
      throw new Error(`${label}: Dubai Pulse returned HTTP ${r.status}: ${r.body.toString('utf8').slice(0, 200)}`);
    }

    const json = JSON.parse(r.body.toString('utf8'));
    if (!json.success) throw new Error(`${label}: ${JSON.stringify(json.error || json).slice(0, 300)}`);

    const page = json.result?.records ?? [];
    records.push(...page);
    if (total == null) {
      total = json.result?.total ?? page.length;
      console.log(`[broker-targets] ${label}: ${total.toLocaleString()} records`);
    }

    offset += page.length;
    if (page.length === 0 || offset >= total) break;
    process.stdout.write(`\r[broker-targets] ${label}: fetched ${offset.toLocaleString()}/${total.toLocaleString()}`);
  }
  if (offset > PAGE_SIZE) process.stdout.write('\n');

  if (records.length === 0) throw new Error(`${label}: dataset is empty`);
  return records;
}

// ---------------------------------------------------------------------------
// Aggregation
// ---------------------------------------------------------------------------

function licenceIsValid(row, endField) {
  if (INCLUDE_EXPIRED || !endField) return true;
  const raw = fieldValue(row, endField);
  if (!raw) return true;
  const end = new Date(raw);
  return Number.isNaN(end.getTime()) ? true : end >= new Date();
}

function groupBrokersByOffice(brokers) {
  const sample = brokers[0];
  const ornField = resolveField(sample, [
    'real_estate_number', 'orn', 'office_number', 'real_estate_id', 'participant_id',
  ]);
  const officeNameField = resolveField(sample, [
    'real_estate_name_en', 'office_name_en', 'company_name_en', 'real_estate_name', 'organization_name_en',
  ]);
  const endField = resolveField(sample, [
    'license_end_date', 'licence_end_date', 'license_expiry_date', 'broker_license_end_date', 'end_date',
  ]);

  console.log('[broker-targets] brokers schema —',
    `orn=${ornField ?? 'NOT FOUND'}`,
    `office=${officeNameField ?? 'NOT FOUND'}`,
    `licence_end=${endField ?? 'NOT FOUND'}`);

  if (!ornField && !officeNameField) {
    console.error('[broker-targets] Cannot group: neither an ORN nor an office-name column was found.');
    console.error('[broker-targets] Columns present:', Object.keys(sample).join(', '));
    process.exit(1);
  }

  const offices = new Map();
  let skippedExpired = 0;

  for (const row of brokers) {
    if (!licenceIsValid(row, endField)) { skippedExpired += 1; continue; }

    const orn = fieldValue(row, ornField);
    const name = fieldValue(row, officeNameField);
    const key = orn || name.toUpperCase();
    if (!key) continue;

    const entry = offices.get(key) ?? { orn, name, agents: 0 };
    entry.agents += 1;
    if (!entry.name && name) entry.name = name;
    offices.set(key, entry);
  }

  if (skippedExpired > 0) {
    console.log(`[broker-targets] excluded ${skippedExpired.toLocaleString()} brokers with a lapsed licence`);
  }
  return offices;
}

function indexOffices(officeRecords) {
  const sample = officeRecords[0];
  const ornField = resolveField(sample, [
    'real_estate_number', 'orn', 'office_number', 'real_estate_id', 'participant_id',
  ]);
  const nameField = resolveField(sample, [
    'office_name_en', 'real_estate_name_en', 'company_name_en', 'name_en', 'organization_name_en',
  ]);
  const phoneField = resolveField(sample, ['phone', 'telephone', 'contact_number', 'mobile']);
  const emailField = resolveField(sample, ['email', 'email_address']);
  const addressField = resolveField(sample, [
    'address', 'office_address', 'address_en', 'location', 'area_name_en', 'area_en',
  ]);

  console.log('[broker-targets] offices schema —',
    `orn=${ornField ?? 'NOT FOUND'}`,
    `name=${nameField ?? 'NOT FOUND'}`,
    `address=${addressField ?? 'NOT FOUND — will fall back to the JVC seed list'}`);

  const byOrn = new Map();
  for (const row of officeRecords) {
    const orn = fieldValue(row, ornField);
    if (!orn) continue;
    byOrn.set(orn, {
      name: fieldValue(row, nameField),
      phone: fieldValue(row, phoneField),
      email: fieldValue(row, emailField),
      address: fieldValue(row, addressField),
    });
  }
  return { byOrn, hasAddress: Boolean(addressField) };
}

function looksJvc(entry, hasAddress) {
  if (hasAddress && entry.address && JVC_PATTERN.test(entry.address)) return true;
  const name = (entry.name || '').toUpperCase();
  return JVC_SEED_NAMES.some((seed) => name.includes(seed));
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function toCsv(rows) {
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const headers = ['rank', 'brokerage', 'orn', 'registered_agents', 'jvc', 'address', 'phone', 'email'];
  return [
    headers.join(','),
    ...rows.map((r, i) => [
      i + 1, r.name, r.orn, r.agents, r.jvc ? 'yes' : '', r.address, r.phone, r.email,
    ].map(escape).join(',')),
  ].join('\r\n');
}

function toMarkdown(rows, jvcRows) {
  const licenceNote = INCLUDE_EXPIRED
    ? 'All registered brokers, including lapsed licences.'
    : 'Brokers with a currently valid licence only.';

  const table = (list) => [
    '| # | Brokerage | ORN | Registered agents | Office |',
    '|---:|---|---|---:|---|',
    ...list.map((r, i) => `| ${i + 1} | ${r.name || '—'} | ${r.orn || '—'} | ${r.agents} | ${r.address || '—'} |`),
  ].join('\n');

  return [
    '# Brokerage target list — DLD register',
    '',
    `Generated ${new Date().toISOString().slice(0, 10)} from the Dubai Pulse broker register.`,
    `${licenceNote} Minimum ${MIN_AGENTS} agents.`,
    '',
    'Team size here is government-recorded, not self-reported. Off-plan focus is not in the',
    'register — confirm that separately from portal listing mix.',
    '',
    `## JVC-located offices (${jvcRows.length})`,
    '',
    jvcRows.length ? table(jvcRows) : '_No JVC offices matched. If the offices dataset has no address column, extend `JVC_SEED_NAMES` in this script._',
    '',
    `## All brokerages by registered team size (${rows.length})`,
    '',
    table(rows),
    '',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiKey = required('DUBAI_PULSE_API_KEY');
  const brokersResource = required('DUBAI_PULSE_BROKERS_RESOURCE_ID');
  const officesResource = process.env.DUBAI_PULSE_OFFICES_RESOURCE_ID || null;

  const brokers = await fetchAll(brokersResource, apiKey, 'brokers');
  const grouped = groupBrokersByOffice(brokers);

  let officeIndex = { byOrn: new Map(), hasAddress: false };
  if (officesResource) {
    const officeRecords = await fetchAll(officesResource, apiKey, 'offices');
    officeIndex = indexOffices(officeRecords);
  } else {
    console.log('[broker-targets] DUBAI_PULSE_OFFICES_RESOURCE_ID not set — skipping contact join');
  }

  const rows = [...grouped.values()]
    .map((entry) => {
      const office = officeIndex.byOrn.get(entry.orn) ?? {};
      const merged = {
        name: entry.name || office.name || '',
        orn: entry.orn,
        agents: entry.agents,
        address: office.address || '',
        phone: office.phone || '',
        email: office.email || '',
      };
      merged.jvc = looksJvc(merged, officeIndex.hasAddress);
      return merged;
    })
    .filter((r) => r.agents >= MIN_AGENTS)
    .sort((a, b) => b.agents - a.agents);

  const jvcRows = rows.filter((r) => r.jvc);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mdPath = path.join(OUT_DIR, 'broker-targets.md');
  const csvPath = path.join(OUT_DIR, 'broker-targets.csv');
  fs.writeFileSync(mdPath, toMarkdown(rows, jvcRows), 'utf8');
  fs.writeFileSync(csvPath, toCsv(rows), 'utf8');

  console.log(`[broker-targets] ${rows.length} brokerages with ${MIN_AGENTS}+ registered agents`);
  console.log(`[broker-targets] ${jvcRows.length} of them flagged JVC`);
  console.log(`[broker-targets] wrote ${mdPath}`);
  console.log(`[broker-targets] wrote ${csvPath}`);
}

main().catch((err) => {
  console.error('[broker-targets] FAILED:', err.message);
  process.exit(1);
});
