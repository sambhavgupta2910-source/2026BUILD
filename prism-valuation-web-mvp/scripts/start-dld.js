// Boots PRISM on the real DLD dataset pulled from the Digital Dubai API.
// Points TRANSACTIONS_CSV at transactions-dld.csv (produced by
// `npm run pull:dld`), then starts the normal server.
//
//   npm run pull:dld     # from inside the UAE — writes transactions-dld.csv
//   npm run start:dld    # serve PRISM on that real data

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(__dirname, '..', process.env.DLD_CSV || 'transactions-dld.csv');

if (!fs.existsSync(dataPath)) {
  console.error(`[dld] No dataset at ${dataPath}`);
  console.error('[dld] Run `npm run pull:dld` first (from inside the UAE) to fetch DLD transactions.');
  process.exit(1);
}

process.env.TRANSACTIONS_CSV = dataPath;
console.log(`[dld] booting PRISM on live DLD data: ${dataPath}`);
await import('../server.js');
