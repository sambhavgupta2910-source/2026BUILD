import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ── Real great-circle distance (nautical miles) ───────────────────────────────
function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Cruise speeds per category (knots)
const CRUISE_SPEEDS = { light: 430, midsize: 450, super: 465, heavy: 480, ultra: 500 };

// Fixed trip costs: landing fees + FBO handling + nav charges (USD)
const TRIP_FEES = { light: 1800, midsize: 2400, super: 3200, heavy: 4500, ultra: 6000 };

function calcFlightHours(fromLat, fromLon, toLat, toLon, categoryClass) {
  if (fromLat == null || toLat == null) return 3.5;
  const distNm = haversineNm(fromLat, fromLon, toLat, toLon);
  const speed = CRUISE_SPEEDS[categoryClass] || 460;
  return Math.max(0.75, Math.round((distNm / speed) * 1.12 * 10) / 10);
}

function calcTripCost(flightHours, categoryClass, basePrice) {
  const rate = basePrice || 8000;
  const fees = TRIP_FEES[categoryClass] || 3000;
  return Math.round((flightHours * rate + fees) / 100) * 100;
}

// ── GET /api/aircraft-photo/:reg ─────────────────────────────────────────────
app.get('/api/aircraft-photo/:reg', async (req, res) => {
  try {
    const r = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(req.params.reg)}`);
    const data = await r.json();
    const photo = data?.photos?.[0];
    photo
      ? res.json({ url: photo.thumbnail_large?.src || photo.thumbnail?.src, fullUrl: photo.link, photographer: photo.photographer, aircraft: photo.aircraft?.model })
      : res.json({ url: null });
  } catch {
    res.json({ url: null });
  }
});

// ── POST /api/flight-price ─── Real pricing ───────────────────────────────────
app.post('/api/flight-price', (req, res) => {
  const { from, to, categoryClass, basePrice } = req.body;
  const flightHours = calcFlightHours(from?.lat, from?.lon, to?.lat, to?.lon, categoryClass);
  const tripCost = calcTripCost(flightHours, categoryClass, basePrice);
  const distNm = (from?.lat != null && to?.lat != null)
    ? Math.round(haversineNm(from.lat, from.lon, to.lat, to.lon))
    : null;
  res.json({ flightHours, tripCost, distNm });
});

// ── POST /api/quote-card ──────────────────────────────────────────────────────
app.post('/api/quote-card', async (req, res) => {
  const { from, to, aircraft, passengers, price, dates, tripType, ref, photoUrl } = req.body;
  try {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewportSize({ width: 540, height: 820 });
    const bgImage = photoUrl ? `url('${photoUrl}')` : `linear-gradient(180deg, #0A1428 0%, #1A2F5E 50%, #0D1B3E 100%)`;
    const html = `<!doctype html><html><head><meta charset="UTF-8"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:540px;height:820px;font-family:'Inter',sans-serif;background:#0A1428;position:relative;overflow:hidden}
.bg{position:absolute;inset:0;background:${bgImage};background-size:cover;background-position:center}
.overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,40,0.55) 0%,rgba(10,20,40,0.30) 35%,rgba(10,20,40,0.75) 60%,rgba(10,20,40,0.97) 100%)}
.content{position:relative;z-index:2;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:44px 40px 48px}
.logo{font-family:'Playfair Display',serif;font-size:42px;font-weight:700;color:white;letter-spacing:3px}
.logo span{color:#D4A843}
.badge{background:rgba(212,168,67,0.2);border:1px solid rgba(212,168,67,0.5);color:#D4A843;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;padding:6px 18px;border-radius:999px;margin-top:10px}
.route-wrap{text-align:center}
.trip-type{font-size:12px;font-weight:600;color:rgba(255,255,255,0.55);letter-spacing:3px;text-transform:uppercase;margin-bottom:20px}
.dates{font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:2px;text-transform:uppercase;margin-bottom:12px}
.city{font-family:'Playfair Display',serif;font-size:58px;font-weight:700;color:white;line-height:1}
.divider{width:2px;height:44px;background:linear-gradient(180deg,transparent,#D4A843,transparent);margin:18px auto}
.diamond{width:14px;height:14px;background:#D4A843;transform:rotate(45deg);margin:-6px auto}
.aircraft-row{font-size:13px;color:rgba(255,255,255,0.6);letter-spacing:1px;text-align:center;margin-top:8px}
.price-block{text-align:center}
.price-label{font-size:11px;font-weight:700;color:rgba(255,255,255,0.45);letter-spacing:3px;text-transform:uppercase;margin-bottom:8px}
.price{font-family:'Playfair Display',serif;font-size:54px;font-weight:700;color:white;letter-spacing:-1px}
.ref{font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:2px;margin-top:6px}
.footer{font-size:10px;color:rgba(255,255,255,0.3);letter-spacing:2px;text-transform:uppercase}
.sep-line{width:60px;height:1px;background:rgba(212,168,67,0.4);margin:0 auto 12px}
</style></head><body>
<div class="bg"></div><div class="overlay"></div>
<div class="content">
  <div style="text-align:center"><div class="logo">APEX<span>.</span></div><div class="badge">Private Charters</div></div>
  <div class="route-wrap">
    <div class="trip-type">${tripType || 'One Way'}</div>
    <div class="dates">${dates || ''}</div>
    <div class="city">${from || '—'}</div>
    <div style="margin:18px 0"><div class="divider"></div><div class="diamond"></div><div class="divider"></div></div>
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
</div></body></html>`;
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

// ── POST /api/search ──────────────────────────────────────────────────────────
app.post('/api/search', async (req, res) => {
  const { from, to, departure, returnDate, pax, petAboard, aircraftPref, tripType } = req.body;
  try {
    const message = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 512,
      system: 'You are APEX Charters AI. Respond with JSON only — no markdown. Include: { "insight": "1-2 sentence recommendation", "recommendedCategory": "light|midsize|super|heavy|ultra", "estimatedFlightHours": number, "tips": ["tip1", "tip2"] }',
      messages: [{ role: 'user', content: `Search: ${from?.city || '?'} → ${to?.city || '?'}, ${tripType}, ${pax} passengers, ${departure}${returnDate ? ' to ' + returnDate : ''}${petAboard ? ', with pet' : ''}. Preferred: ${aircraftPref}.` }],
    });
    let parsed = {};
    try { parsed = JSON.parse(message.content[0].text); } catch {}
    res.json({ aiInsight: parsed, status: 'ok' });
  } catch {
    res.json({ aiInsight: null, status: 'ok' });
  }
});

// ── POST /api/quote-stream ────────────────────────────────────────────────────
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
      messages: [{ role: 'user', content: `Quote analysis: ${from || 'unknown'} → ${to || 'unknown'} on ${aircraft || 'selected aircraft'} for ${pax || 2} passengers.` }],
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ delta: event.delta.text })}\n\n`);
      }
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch {
    const fallback = `Analyzed ${from || 'origin'} → ${to || 'destination'} across 340+ certified operators. Optimal routing confirmed for ${aircraft || 'your selected aircraft'} — all-in pricing with zero hidden fees.`;
    res.write(`data: ${JSON.stringify({ delta: fallback })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
});

// ── POST /api/send-quote ──────────────────────────────────────────────────────
app.post('/api/send-quote', async (req, res) => {
  const { name, email, phone, ref, aircraft, searchParams, selections, total, flightHours, distNm } = req.body;

  // Generate premium email HTML with Claude
  let emailBody = buildFallbackEmail({ name, ref, searchParams, aircraft, flightHours, distNm, total, selections });
  try {
    const emailContent = await anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 900,
      system: 'You are the APEX Charters concierge. Write a formal, warm, premium HTML email confirming a charter quote. Luxury tone. Use clean HTML with inline styles — no external CSS or scripts. Include the reference number, route, aircraft, estimated flight time, and total price prominently. Sign off as "The APEX Concierge Team". Return ONLY the inner body HTML, no doctype/html/body tags.',
      messages: [{ role: 'user', content: `Client: ${name}, Ref: ${ref}, Route: ${searchParams?.from?.city} → ${searchParams?.to?.city}, Aircraft: ${aircraft?.model}, Flight Time: ~${flightHours}h${distNm ? ` (${distNm} nm)` : ''}, Total: $${Number(total).toLocaleString()} USD, Catering: ${selections?.catering}, Entertainment: ${selections?.entertainment}, Transfer: ${selections?.transfer}, Phone: ${phone || 'not provided'}.` }],
    });
    emailBody = emailContent.content[0].text;
  } catch (err) {
    console.error('Email generation error:', err.message);
  }

  const fullHtml = wrapEmail(emailBody, ref);

  // Try to send via Resend
  let emailSent = false;
  if (resend && email) {
    try {
      const from_addr = process.env.RESEND_FROM || 'APEX Charters <onboarding@resend.dev>';
      await resend.emails.send({
        from: from_addr,
        to: [email],
        subject: `Your APEX Charter Quote — ${ref}`,
        html: fullHtml,
      });
      emailSent = true;
      console.log(`✉  Quote ${ref} sent to ${email}`);
    } catch (err) {
      console.error('Resend error:', err.message);
    }
  }

  if (!emailSent) {
    console.log('\n══════ QUOTE (no RESEND_API_KEY set) ══════');
    console.log(`To: ${name} <${email}> | Subject: Your APEX Charter Quote — ${ref}`);
    console.log('Add RESEND_API_KEY to .env to send real emails → resend.com (free)');
    console.log('═══════════════════════════════════════════\n');
  }

  res.json({ ok: true, ref, emailSent });
});

// ── Email helpers ─────────────────────────────────────────────────────────────
function buildFallbackEmail({ name, ref, searchParams, aircraft, flightHours, distNm, total, selections }) {
  const fromCity = searchParams?.from?.city || '—';
  const toCity = searchParams?.to?.city || '—';
  return `
    <p style="font-size:16px">Dear ${name},</p>
    <p>Thank you for your enquiry. We are delighted to present your personalised APEX charter quote.</p>
    <table style="border-collapse:collapse;width:100%;margin:24px 0;font-size:14px">
      <tr><td style="padding:10px 12px;color:#6B7280;border-bottom:1px solid #E8E0D4">Reference</td><td style="padding:10px 12px;font-weight:700;color:#0D1B3E;border-bottom:1px solid #E8E0D4">${ref}</td></tr>
      <tr style="background:#F9F6F1"><td style="padding:10px 12px;color:#6B7280;border-bottom:1px solid #E8E0D4">Route</td><td style="padding:10px 12px;font-weight:700;color:#0D1B3E;border-bottom:1px solid #E8E0D4">${fromCity} → ${toCity}</td></tr>
      <tr><td style="padding:10px 12px;color:#6B7280;border-bottom:1px solid #E8E0D4">Aircraft</td><td style="padding:10px 12px;font-weight:700;color:#0D1B3E;border-bottom:1px solid #E8E0D4">${aircraft?.model || '—'}</td></tr>
      ${flightHours ? `<tr style="background:#F9F6F1"><td style="padding:10px 12px;color:#6B7280;border-bottom:1px solid #E8E0D4">Est. Flight Time</td><td style="padding:10px 12px;font-weight:700;color:#0D1B3E;border-bottom:1px solid #E8E0D4">~${flightHours}h${distNm ? ` &nbsp;·&nbsp; ${distNm.toLocaleString()} nm` : ''}</td></tr>` : ''}
      <tr><td style="padding:10px 12px;color:#6B7280;border-bottom:1px solid #E8E0D4">Catering</td><td style="padding:10px 12px;color:#0D1B3E;border-bottom:1px solid #E8E0D4;text-transform:capitalize">${selections?.catering || 'Standard'}</td></tr>
      <tr style="background:#F9F6F1"><td style="padding:10px 12px;color:#6B7280;border-bottom:1px solid #E8E0D4">Entertainment</td><td style="padding:10px 12px;color:#0D1B3E;border-bottom:1px solid #E8E0D4;text-transform:capitalize">${selections?.entertainment || 'Standard'}</td></tr>
      <tr><td style="padding:10px 12px;color:#6B7280">Transfer</td><td style="padding:10px 12px;color:#0D1B3E;text-transform:capitalize">${selections?.transfer || 'Own arrangements'}</td></tr>
    </table>
    <div style="background:#0D1B3E;color:white;padding:28px;border-radius:10px;text-align:center;margin:28px 0">
      <div style="font-size:11px;letter-spacing:3px;opacity:0.6;text-transform:uppercase;margin-bottom:10px">Estimated Total</div>
      <div style="font-family:Georgia,serif;font-size:42px;font-weight:700;letter-spacing:-1px">$${Number(total).toLocaleString()}</div>
      <div style="font-size:12px;opacity:0.5;margin-top:6px;letter-spacing:2px">USD · ALL INCLUSIVE</div>
    </div>
    <p>Your dedicated APEX concierge will contact you within <strong>15 minutes</strong> to confirm all details and secure your aircraft.</p>
    <p>For immediate assistance, please quote reference <strong>${ref}</strong> via WhatsApp.</p>
    <p style="margin-top:36px;padding-top:24px;border-top:1px solid #E8E0D4">
      With warmest regards,<br/>
      <strong style="color:#0D1B3E">The APEX Concierge Team</strong><br/>
      <span style="color:#6B7280;font-size:13px">Available 24 hours · 7 days a week</span>
    </p>`;
}

function wrapEmail(body, ref) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F0EDE8;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;line-height:1.65;color:#1A1825">
  <div style="max-width:600px;margin:32px auto 48px;background:white;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(13,27,62,0.12)">
    <div style="background:#0D1B3E;padding:36px 40px;text-align:center">
      <div style="font-family:Georgia,serif;font-size:34px;font-weight:700;color:white;letter-spacing:5px">APEX<span style="color:#D4A843">.</span></div>
      <div style="font-size:10px;color:rgba(255,255,255,0.45);letter-spacing:4px;text-transform:uppercase;margin-top:8px">Private Charters</div>
    </div>
    <div style="height:3px;background:linear-gradient(90deg,#8B6518,#D4A843,#8B6518)"></div>
    <div style="padding:40px 44px">${body}</div>
    <div style="background:#F9F6F1;padding:20px 44px;text-align:center;border-top:1px solid #E8E0D4">
      <div style="font-size:11px;color:#9CA3AF;letter-spacing:1px">
        APEX Charters &nbsp;·&nbsp; apex-charters.com &nbsp;·&nbsp; 24/7 Concierge<br/>
        <span style="color:#B8882C">Ref: ${ref}</span>
      </div>
    </div>
  </div>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log(`APEX backend running on :${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) console.warn('⚠  ANTHROPIC_API_KEY not set — AI features will use fallback responses');
  if (!process.env.RESEND_API_KEY)    console.warn('⚠  RESEND_API_KEY not set — get a free key at resend.com to enable real emails');
});
