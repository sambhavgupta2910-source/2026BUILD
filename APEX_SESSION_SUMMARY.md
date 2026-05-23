# APEX Charters — Build Session Summary

> Continue from: `claude/private-charter-booking-app-9CRUv` branch  
> Live URL: **https://sambhavgupta2910-source.github.io/2026BUILD/**  
> GitHub repo: `sambhavgupta2910-source/2026BUILD`

---

## What Was Built

Full overhaul of the APEX Charters private jet booking app at `charter-app/`.

### Tech Stack
- **Frontend:** React + Vite (static, deployed to GitHub Pages)
- **Backend:** Express.js on port 3001 (`server.js`) — NOT running on GitHub Pages
- **AI:** Claude claude-opus-4-7 via Anthropic SDK for route analysis + quote streaming
- **Email:** FormSubmit.co (client-side, no backend needed)
- **Deployment:** GitHub Pages via `gh-pages` branch

---

## What Was Done This Session

### 1. Real Flight Pricing (`src/utils/pricing.js`)
- All 52 airports in `src/data/airports.js` have lat/lon coordinates
- Haversine great-circle distance formula implemented client-side
- Category-specific cruise speeds: `{ light: 440, midsize: 455, super: 470, heavy: 487, ultra: 510 }` kts
- Fixed trip fees per category: `{ light: 1800, midsize: 2400, super: 3200, heavy: 4500, ultra: 6000 }` USD
- 12% routing factor added to great-circle distance
- Replaces fake `Math.random()` flight hours — DXB→LHR G650ER now shows ~7.6h, not random

### 2. Email Quotes (`src/components/QuotePanel.jsx`)
- Replaced `/api/send-quote` (backend) with FormSubmit.co direct POST
- Sends to `sambhav.gupta2910@gmail.com`
- **ACTION NEEDED:** Check spam for FormSubmit activation email, click "Activate Form"
- After activation: every quote submission arrives formatted in inbox

### 3. Mobile UX
- `src/components/Nav.jsx`: hamburger button + full-screen mobile menu overlay
- `src/App.jsx`: sticky "Book Flight ✦" bar at bottom of viewport
- `src/index.css`: all mobile CSS (hamburger, mobile-menu, mobile-cta-bar, @keyframes spin)

### 4. WhatsApp Integration
- Floating WhatsApp button (bottom-right, always visible) → opens chat with +971545297292
- WhatsApp share link in QuotePanel sends formatted quote text

### 5. Conversion Fixes
- Hero: faster search (2s abort on /api/search so static hosting doesn't hang)
- Hero: sharper USP — "Fly Private. Pay Honest." with 15-min concierge stat
- QuotePanel: removed broken "Generate Quote Card" (requires Playwright backend)
- QuotePanel: instant client-side pricing, no loading spinner

### 6. Business Plan
- `APEX_CHARTERS_BUSINESS_PLAN.md` in repo root — full 800-line plan with operator contacts, marketing strategy, financial model

---

## Critical Known Issues

| Issue | Status | Fix |
|---|---|---|
| Email not received | Needs FormSubmit activation | Check spam for "FormSubmit confirm" email, click link |
| `/api/quote-stream` fails on GitHub Pages | Graceful fallback text shows | Deploy backend to Render/Railway for live AI streaming |
| `/api/quote-card` (PNG) fails | Button removed | Re-add when backend is deployed |
| AI route analysis is generic | Fallback text only | Backend needed for real Claude streaming |
| GitHub Pages Pages Source | Must be set manually | Settings → Pages → Deploy from branch → `gh-pages` / root |

---

## Files Changed

```
charter-app/
├── src/
│   ├── utils/
│   │   └── pricing.js          ← NEW: client-side haversine pricing
│   ├── data/
│   │   └── airports.js         ← UPDATED: lat/lon added to all 52 airports
│   ├── components/
│   │   ├── QuotePanel.jsx      ← UPDATED: FormSubmit email, client-side pricing, clean WA share
│   │   ├── Nav.jsx             ← UPDATED: hamburger + mobile menu
│   │   └── Hero.jsx            ← UPDATED: USP copy, 2s API timeout
│   ├── App.jsx                 ← UPDATED: floating WhatsApp button, mobile CTA bar
│   └── index.css               ← UPDATED: mobile styles, spin keyframe
├── server.js                   ← UPDATED: haversine + /api/flight-price + Resend email
└── package.json                ← UPDATED: resend package added
```

---

## Next Build Priorities

### High Impact (do next)
1. **Deploy backend** — Railway or Render (free tier). Unlocks: real AI streaming, Playwright quote cards, Resend email with branding, real operator inquiry emails
2. **Add testimonials section** — 3 real-looking client quotes with photos, routes, aircraft
3. **Trust signals** — AOC badge, IS-BAO Stage III, ARGUS certification near the CTA form
4. **Shorten funnel** — Add "Skip to Quote" button after aircraft selection (bypass 5-step wizard for high-intent users)
5. **Fractional / Jet Card / Membership pages** — currently in footer links but no pages

### Medium Impact
6. **Operator email automation** — When quote submitted, auto-email 3 matching operators (via Resend on backend)
7. **Real empty legs** — Pull from an API or make the data editable (currently hardcoded)
8. **Return trip pricing** — Currently ignored; return quotes should show round-trip pricing
9. **Multi-stop builder** — UI exists (tab) but no logic behind it

### Marketing Strategy
- **Google Ads:** "private jet charter dubai", "private jet london dubai", "charter jet UAE" — $8-25 CPC
- **LinkedIn:** Target UAE/GCC C-suite, title: CEO/CFO/MD, company size 50+
- **WhatsApp Business API:** Broadcast to opted-in luxury clients, follow up on quotes
- **Instagram:** Short-form video — aircraft walkthroughs, empty leg deals, destination clips
- **Partnerships:** Dubai luxury hotels (Burj Al Arab, DIFC hotels), yacht charter companies, VIP event planners
- **SEO:** Target "empty leg flights UAE", "private jet DXB LHR price"

### Competitive Edge (USP to hammer in marketing)
> **"All-in price in 4 minutes. Concierge in 15. No broker. No markup."**

Competitors (PrivateFly, Victor, Jetsmarter) all charge broker margins (15-25%). If you can prove transparent pricing, that's the wedge.

---

## Environment Variables Needed (for backend deployment)

```env
ANTHROPIC_API_KEY=sk-ant-...          # Claude AI for quote streaming
RESEND_API_KEY=re_...                  # Branded email (get free at resend.com)
RESEND_FROM=APEX Charters <quotes@yourdomain.com>
PORT=3001
```

---

## How to Run Locally

```bash
cd charter-app
npm install
# Terminal 1 — backend
node server.js
# Terminal 2 — frontend  
npm run dev
# Open http://localhost:5173
```

## How to Deploy Frontend Update

```bash
cd charter-app
VITE_BASE_PATH=/2026BUILD/ npm run build
git checkout gh-pages
cp dist/index.html ../
rm -rf ../assets && cp -r dist/assets ../
cd ..
git add index.html assets/
git commit -m "deploy: [description]"
git push origin gh-pages
git checkout claude/private-charter-booking-app-9CRUv
```
