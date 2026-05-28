import 'dotenv/config';
import express from 'express';
import { ApifyClient } from 'apify-client';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Verify Apify connection on startup
async function verifyApifyConnection() {
  try {
    const user = await apify.user().get();
    console.log(`Apify connected — user: ${user.username}`);
  } catch (err) {
    console.error('Apify connection failed:', err.message);
  }
}

// Run an Apify actor
app.post('/api/apify/run', async (req, res) => {
  const { actorId, input } = req.body;
  if (!actorId) return res.status(400).json({ error: 'actorId required' });
  try {
    const run = await apify.actor(actorId).call(input || {});
    res.json({ runId: run.id, datasetId: run.defaultDatasetId, status: run.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch items from an Apify dataset
app.get('/api/apify/dataset/:datasetId', async (req, res) => {
  const { datasetId } = req.params;
  const { limit = 1000, offset = 0 } = req.query;
  try {
    const { items } = await apify.dataset(datasetId).listItems({ limit: Number(limit), offset: Number(offset) });
    res.json({ items, count: items.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get status of an actor run
app.get('/api/apify/run/:runId', async (req, res) => {
  try {
    const run = await apify.run(req.params.runId).get();
    res.json({ runId: run.id, status: run.status, datasetId: run.defaultDatasetId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  console.log(`PRISM server running on http://localhost:${PORT}`);
  await verifyApifyConnection();
});
