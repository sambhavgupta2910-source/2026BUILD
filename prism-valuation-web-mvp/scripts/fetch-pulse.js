#!/usr/bin/env node
// Fetches the latest DLD transactions from Dubai Pulse CKAN API,
// uploads the CSV to Google Drive (overwriting the existing file),
// then triggers the PRISM /api/refresh webhook.
//
// Required env vars:
//   DUBAI_PULSE_API_URL        — CKAN datastore_search URL for the transactions resource
//   DUBAI_PULSE_API_KEY        — API key from dubaipulse.gov.ae (sent as X-Api-Key header)
//   GOOGLE_SERVICE_ACCOUNT_JSON — base64-encoded service account JSON (from GCP console)
//   DRIVE_FILE_ID              — Drive file ID to overwrite (from the file's share URL)
//   PRISM_URL                  — Railway deployment URL e.g. https://prism.railway.app
//   REFRESH_SECRET             — value of REFRESH_SECRET on the Railway server

import https from 'node:https';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function required(name) {
  const v = process.env[name];
  if (!v) { console.error(`[fetch-pulse] Missing env var: ${name}`); process.exit(1); }
  return v;
}

function request(url, opts = {}, body = null) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const req = client.request(
      { hostname: parsed.hostname, path: parsed.pathname + parsed.search, ...opts },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }),
        );
      },
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function follow(url, opts = {}, body = null, redirects = 0) {
  if (redirects > 5) return Promise.reject(new Error('Too many redirects'));
  return request(url, opts, body).then((r) => {
    if (r.status >= 300 && r.status < 400 && r.headers.location) {
      return follow(new URL(r.headers.location, url).toString(), opts, body, redirects + 1);
    }
    return r;
  });
}

// ---------------------------------------------------------------------------
// Step 1 — Fetch from Dubai Pulse CKAN API
// ---------------------------------------------------------------------------
// Dubai Pulse uses the CKAN datastore_search API.
// Set DUBAI_PULSE_API_URL to the datastore_search URL for the transactions resource.
// Example: https://dubaipulse.gov.ae/api/3/action/datastore_search?resource_id=<id>&limit=1000000
//
// The response is JSON: { result: { records: [...], total: N } }
// We convert it to CSV matching the DLD schema expected by server.js.

async function fetchFromPulse(apiUrl, apiKey) {
  console.log('[fetch-pulse] downloading from Dubai Pulse…');
  const r = await follow(apiUrl, {
    method: 'GET',
    headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
  });

  if (r.status !== 200) {
    throw new Error(`Dubai Pulse returned HTTP ${r.status}: ${r.body.toString('utf8').slice(0, 200)}`);
  }

  const json = JSON.parse(r.body.toString('utf8'));
  if (!json.success || !json.result?.records?.length) {
    throw new Error(`Dubai Pulse response invalid or empty: ${JSON.stringify(json).slice(0, 300)}`);
  }

  const records = json.result.records;
  console.log(`[fetch-pulse] received ${records.length.toLocaleString()} records`);

  // Convert to CSV — use the field names from the first record as headers
  const headers = Object.keys(records[0]);
  const escape = (v) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(','),
    ...records.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  return lines.join('\r\n');
}

// ---------------------------------------------------------------------------
// Step 2 — Google Drive upload (service account, no extra deps)
// ---------------------------------------------------------------------------

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(serviceAccountJson) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = base64url(
    Buffer.from(
      JSON.stringify({
        iss: serviceAccountJson.client_email,
        scope: 'https://www.googleapis.com/auth/drive.file',
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
      }),
    ),
  );
  const signing = `${header}.${payload}`;
  const key = crypto.createPrivateKey(serviceAccountJson.private_key);
  const sig = base64url(crypto.sign('sha256', Buffer.from(signing), key));
  const jwt = `${signing}.${sig}`;

  const body = Buffer.from(
    `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  );
  const r = await request('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': body.length },
  }, body);

  const data = JSON.parse(r.body.toString('utf8'));
  if (!data.access_token) throw new Error(`Drive auth failed: ${r.body.toString('utf8').slice(0, 200)}`);
  return data.access_token;
}

async function uploadToDrive(csvText, fileId, accessToken) {
  console.log(`[fetch-pulse] uploading ${(csvText.length / 1024 / 1024).toFixed(1)} MB to Drive file ${fileId}…`);
  const body = Buffer.from(csvText, 'utf8');
  const r = await follow(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Length': body.length,
      },
    },
    body,
  );

  if (r.status < 200 || r.status >= 300) {
    throw new Error(`Drive upload failed HTTP ${r.status}: ${r.body.toString('utf8').slice(0, 200)}`);
  }
  console.log('[fetch-pulse] Drive upload complete');
}

// ---------------------------------------------------------------------------
// Step 3 — Trigger PRISM webhook
// ---------------------------------------------------------------------------

async function triggerRefresh(prismUrl, secret) {
  console.log('[fetch-pulse] triggering PRISM refresh webhook…');
  const r = await follow(`${prismUrl}/api/refresh?token=${encodeURIComponent(secret)}`, {
    method: 'POST',
  });
  if (r.status !== 200) {
    throw new Error(`Webhook returned HTTP ${r.status}: ${r.body.toString('utf8').slice(0, 200)}`);
  }
  const data = JSON.parse(r.body.toString('utf8'));
  console.log(`[fetch-pulse] PRISM reloaded — ${data.rows?.toLocaleString() ?? '?'} rows`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const apiUrl = required('DUBAI_PULSE_API_URL');
  const apiKey = required('DUBAI_PULSE_API_KEY');
  const saJsonB64 = required('GOOGLE_SERVICE_ACCOUNT_JSON');
  const driveFileId = required('DRIVE_FILE_ID');
  const prismUrl = required('PRISM_URL');
  const refreshSecret = required('REFRESH_SECRET');

  const saJson = JSON.parse(Buffer.from(saJsonB64, 'base64').toString('utf8'));

  const csvText = await fetchFromPulse(apiUrl, apiKey);
  const accessToken = await getAccessToken(saJson);
  await uploadToDrive(csvText, driveFileId, accessToken);
  await triggerRefresh(prismUrl, refreshSecret);

  console.log('[fetch-pulse] pipeline complete');
}

main().catch((err) => {
  console.error('[fetch-pulse] FAILED:', err.message);
  process.exit(1);
});
