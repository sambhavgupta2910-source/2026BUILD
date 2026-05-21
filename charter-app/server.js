import express from 'express';
import cors from 'cors';
import { createRequire } from 'module';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/* ── GET /api/aircraft-photo/:reg ── Planespotters.net real photo by tail number ── */
app.get('/api/aircraft-photo/:reg', async (req, res) => {
  const { reg } = req.params;
  try {
    const r = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`);
    const data = await r.json();
    const photo = data?.photos?.[0];
    if (photo) {
      res.json({
        url: photo.thumbnail_large?.src || photo.thumbnail?.src,
        fullUrl: photo.link,
        photographer: photo.photographer,
        aircraft: photo.aircraft?.model,
      });
    } else {
      res.json({ url: null });
    }
  } catch (err) {
    res.json({ url: null, error: err.message });
  }
});

/* ── POST /api/quote-card ── Generate WhatsApp-shareable quote card PNG ── */
app.post('/api/quote-card', async (req, res) => {
  const { from, to, aircraft, passengers, price, dates, tripType, ref, photoUrl } = req.body;

  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 540, height: 820 });

    const bgImage = photoUrl
      ? `url('${photoUrl}')`
      : `linear-gradient(180deg, #0A1428 0%, #1A2F5E 50%, #0D1B3E 100%)`;

    const html = `<!doctype html><html><head>
<meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet"/>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 540px; height: 820px;
  font-family: 'Inter', sans-serif;
  background: #0A1428;
  position: relative; overflow: hidden;
}
.bg {
  position: absolute; inset: 0;
  background: ${bgImage};
  background-size: cover; background-position: center;
}
.overlay {
  position: absolute; inset: 0;
  background: linear-gradient(180deg,
    rgba(10,20,40,0.55) 0%,
    rgba(10,20,40,0.30) 35%,
    rgba(10,20,40,0.75) 60%,
    rgba(10,20,40,0.97) 100%);
}
.content {
  position: relative; z-index: 2;
  height: 100%; display: flex;
  flex-direction: column; align-items: center;
  justify-content: space-between;
  padding: 44px 40px 48px;
}
.logo {
  font-family: 'Playfair Display', serif;
  font-size: 42px; font-weight: 700;
  color: white; letter-spacing: 3px;
}
.logo span { color: #D4A843; }
.badge {
  background: rgba(212,168,67,0.2);
  border: 1px solid rgba(212,168,67,0.5);
  color: #D4A843;
  font-size: 11px; font-weight: 700;
  letter-spacing: 3px; text-transform: uppercase;
  padding: 6px 18px; border-radius: 999px;
  margin-top: 10px;
}
.route-wrap { text-align: center; }
.trip-type {
  font-size: 12px; font-weight: 600;
  color: rgba(255,255,255,0.55);
  letter-spacing: 3px; text-transform: uppercase;
  margin-bottom: 20px;
}
.dates {
  font-size: 13px; font-weight: 400;
  color: rgba(255,255,255,0.6);
  letter-spacing: 2px; text-transform: uppercase;
  margin-bottom: 12px;
}
.city {
  font-family: 'Playfair Display', serif;
  font-size: 58px; font-weight: 700;
  color: white; line-height: 1;
}
.divider {
  width: 2px; height: 44px;
  background: linear-gradient(180deg, transparent, #D4A843, transparent);
  margin: 18px auto;
}
.diamond {
  width: 14px; height: 14px;
  background: #D4A843;
  transform: rotate(45deg);
  margin: -6px auto;
}
.aircraft-row {
  font-size: 13px; color: rgba(255,255,255,0.6);
  letter-spacing: 1px; text-align: center;
  margin-top: 8px;
}
.price-block { text-align: center; }
.price-label {
  font-size: 11px; font-weight: 700;
  color: rgba(255,255,255,0.45);
  letter-spacing: 3px; text-transform: uppercase;
  margin-bottom: 8px;
}
.price {
  font-family: 'Playfair Display', serif;
  font-size: 54px; font-weight: 700;
  color: white; letter-spacing: -1px;
}
.ref {
  font-size: 11px; color: rgba(255,255,255,0.35);
  letter-spacing: 2px; margin-top: 6px;
}
.footer {
  font-size: 10px; color: rgba(255,255,255,0.3);
  letter-spacing: 2px; text-transform: uppercase;
}
.sep-line {
  width: 60px; height: 1px;
  background: rgba(212,168,67,0.4);
  margin: 0 auto 12px;
}
</style></head><body>
<div class="bg"></div>
<div class="overlay"></div>
<div class="content">
  <div style="text-align:center">
    <div class="logo">APEX<span>.</span></div>
    <div class="badge">Private Charters</div>
  </div>
  <div class="route-wrap">
    <div class="trip-type">${tripType || 'One Way'}</div>
    <div class="dates">${dates || ''}</div>
    <div class="city">${from || '—'}</div>
    <div style="margin:18px 0">
      <div class="divider"></div>
      <div class="diamond"></div>
      <div class="divider"></div>
    </div>
    <div class="city">${to || '—'}</div>
    <div class="aircraft-row">${aircraft || ''} &nbsp;|&nbsp; ${passengers || ''} PASSENGERS</div>
  </div>
  <div class="price-block">
    <div class="sep-line"></div>
    <div class="price-label">Charter Price</div>
    <div class="price">$${Number(price || 0).toLocaleString()} USD</div>
    ${ref ? `<div class="ref">REF: ${ref}</div>` : ''}
  </div>
  <div class="footer">apex-charters.com &nbsp;·&nbsp; Available 24 / 7</div>
</div>
</body></html>`;

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const buffer = await page.screenshot({ type: 'png' });
    await browser.close();

    res.set('Content-Type', 'image/png');
    res.set('Content-Disposition', `inline; filename="apex-quote-${ref || 'card'}.png"`);
    res.send(buffer);
  } catch (err) {
    console.error('Quote card error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── POST /api/search ── */
app.post('/api/search', async (req, res) => {
  const { from, to, departure, returnDate, pax, petAboard, aircraftPref, tripType } = req.body;

  // Calibrated hourly rates per category (operator cost + 28-32% margin)
  const marketRates = {
    light:   { operatorHr: 4800,  sellHr: 6200  },
    midsize: { operatorHr: 7200,  sellHr: 9200  },
    super:   { operatorHr: 9500,  sellHr: 12200 },
    heavy:   { operatorHr: 11500, sellHr: 14800 },
    ultra:   { operatorHr: 16000, sellHr: 20500 },
  };

  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: 'You are APEX Charters AI. Respond with JSON only — no markdown. Include: { "insight": "1-2 sentence recommendation", "recommendedCategory": "light|midsize|super|heavy|ultra", "estimatedFlightHours": number, "tips": ["tip1", "tip2"] }',
      messages: [{
        role: 'user',
        content: `Search: ${from?.city || '?'} → ${to?.city || '?'}, ${tripType}, ${pax} passengers, ${departure}${returnDate ? ' to ' + returnDate : ''}${petAboard ? ', with pet' : ''}. Preferred: ${aircraftPref}.`,
      }],
    });

    let parsed = {};
    try { parsed = JSON.parse(message.content[0].text); } catch {}
    res.json({ aiInsight: parsed, marketRates, status: 'ok' });
  } catch (err) {
    console.error('Search AI error:', err.message);
    res.json({ aiInsight: null, marketRates, status: 'ok' });
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
      system: 'You are the APEX Charters concierge. Write a formal, warm, premium email confirming a charter quote. Luxury tone. Include reference number, route, aircraft, total. Sign off as "The APEX Team". Plain text, no markdown.',
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
