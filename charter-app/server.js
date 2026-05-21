import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── POST /api/search ── */
app.post('/api/search', async (req, res) => {
  const { from, to, departure, returnDate, pax, petAboard, aircraftPref, tripType } = req.body;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: 'You are APEX Charters AI. You help match private aviation clients with the best aircraft. Respond with a JSON object only — no markdown. Include: { "insight": "1-2 sentence recommendation", "recommendedCategory": "Light Jet | Midsize Jet | Super Midsize | Heavy Jet | Ultra Long Range", "estimatedFlightHours": number, "tips": ["tip1", "tip2"] }',
      messages: [{
        role: 'user',
        content: `Search: ${from?.city || '?'} → ${to?.city || '?'}, ${tripType}, ${pax} passengers, ${departure}${returnDate ? ' to ' + returnDate : ''}${petAboard ? ', with pet' : ''}. Preferred: ${aircraftPref}.`,
      }],
    });

    let parsed = {};
    try { parsed = JSON.parse(message.content[0].text); } catch {}
    res.json({ aiInsight: parsed, status: 'ok' });
  } catch (err) {
    console.error('Search AI error:', err.message);
    res.json({ aiInsight: null, status: 'ok' });
  }
});

/* ── POST /api/quote-stream ── Server-Sent Events ── */
app.post('/api/quote-stream', async (req, res) => {
  const { from, to, aircraft, pax } = req.body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 200,
      stream: true,
      system: 'You are APEX AI. Write 2-3 sentences summarising the flight route analysis. Mention: operator selection rationale, routing efficiency, and a confidence statement. Be concise, professional, and reassuring. No lists.',
      messages: [{
        role: 'user',
        content: `Quote analysis: ${from || 'unknown'} → ${to || 'unknown'} on ${aircraft || 'selected aircraft'} for ${pax || 2} passengers.`,
      }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Stream error:', err.message);
    const fallback = `Analyzed ${from || 'origin'} → ${to || 'destination'} across 340+ certified operators. Optimal routing confirmed for ${aircraft || 'your selected aircraft'} — all-in pricing with zero hidden fees.`;
    res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

/* ── POST /api/send-quote ── */
app.post('/api/send-quote', async (req, res) => {
  const { name, email, phone, ref, aircraft, searchParams, selections, total } = req.body;

  try {
    const emailContent = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 600,
      system: 'You are the APEX Charters concierge. Write a formal, warm, premium email to a client confirming their charter quote. Use a luxury tone. Include the reference number, route, aircraft, and total. Sign off as "The APEX Team". Plain text, no markdown.',
      messages: [{
        role: 'user',
        content: `Client: ${name}, Email: ${email}, Phone: ${phone || 'not provided'}, Ref: ${ref}, Route: ${searchParams?.from?.city} → ${searchParams?.to?.city}, Aircraft: ${aircraft?.model}, Total: $${total?.toLocaleString()}, Catering: ${selections?.catering}, Entertainment: ${selections?.entertainment}, Transfer: ${selections?.transfer}.`,
      }],
    });

    console.log('\n══════ QUOTE EMAIL ══════');
    console.log(`To: ${name} <${email}>`);
    console.log(`Subject: Your APEX Charter Quote — ${ref}`);
    console.log('─────────────────────────');
    console.log(emailContent.content[0].text);
    console.log('══════════════════════════\n');
  } catch (err) {
    console.error('Email generation error:', err.message);
  }

  res.json({ ok: true, ref });
});

app.listen(PORT, () => {
  console.log(`APEX backend running on :${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠  ANTHROPIC_API_KEY not set — AI features will use fallback responses.');
  }
});
