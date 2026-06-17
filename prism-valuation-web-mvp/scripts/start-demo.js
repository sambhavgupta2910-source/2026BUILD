// Cross-platform demo launcher: ensures a synthetic dev dataset exists, points
// TRANSACTIONS_CSV at it, then boots the normal server. Lets `npm run demo`
// work with zero setup when no real data source is configured.
//
// This does NOT change production behaviour — `npm start` still uses the real
// data-source priority chain (TRANSACTIONS_CSV → Dubai Pulse → Drive). The
// synthetic file is gitignored and clearly labelled (see scripts/generate-sample.js).

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', 'transactions-dev.csv');

if (!fs.existsSync(dataPath)) {
  console.log('[demo] generating synthetic dev dataset…');
  execFileSync(process.execPath, [path.join(__dirname, 'generate-sample.js')], { stdio: 'inherit' });
}

process.env.TRANSACTIONS_CSV = dataPath;
console.log('[demo] booting with synthetic dev data (TRANSACTIONS_CSV set).');
await import('../server.js');
