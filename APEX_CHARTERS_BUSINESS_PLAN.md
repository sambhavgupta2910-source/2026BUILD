# APEX Charters — Full Business Plan & Session Summary

> Last updated: May 2026 | Branch: `claude/private-charter-booking-app-9CRUv`

---

## Table of Contents

1. [The App — Current State](#1-the-app--current-state)
2. [What's Broken](#2-whats-broken)
3. [Full Overhaul Plan](#3-full-overhaul-plan)
4. [Market Intelligence](#4-market-intelligence)
5. [Real Quote Sources](#5-real-quote-sources)
6. [Operator Contacts](#6-operator-contacts)
7. [Strategic Partnerships](#7-strategic-partnerships)
8. [Marketing Strategy](#8-marketing-strategy)
9. [Competitive Edge](#9-competitive-edge)
10. [Financial Model](#10-financial-model)
11. [Regulatory Requirements](#11-regulatory-requirements)
12. [Implementation Roadmap](#12-implementation-roadmap)
13. [Files to Modify](#13-files-to-modify)

---

## 1. The App — Current State

**Stack:** React + Vite (frontend) · Express.js (backend) · Claude Opus 4.7 (AI) · Playwright (quote card PNG)

**Location:** `/home/user/2026BUILD/charter-app`
**Branch:** `claude/private-charter-booking-app-9CRUv`

### Frontend Components

| Component | Purpose |
|---|---|
| `Nav.jsx` | Fixed header, links, "Request Charter" CTA |
| `Hero.jsx` | Search form (One-way / Return / Multi-stop), airport autocomplete |
| `FlightResults.jsx` | Aircraft grid, sort by price/range/pax/recommended |
| `Personalize.jsx` | 5-step quote builder (aircraft → catering → entertainment → transfer → special requests) |
| `QuotePanel.jsx` | Slide-in panel: AI analysis stream, price breakdown, WhatsApp card, contact form |
| `EmptyLegsStrip.jsx` | Horizontal scroll, countdown timers, seat urgency bars |
| `ExperienceSection.jsx` | Tabbed amenity showcase (Dining / Connectivity / Wellness / Security) |
| `PetSection.jsx` | Pet travel feature, 4 pet categories |
| `AircraftSilhouette.jsx` | Custom SVG profiles per aircraft category |
| `Toast.jsx` | Bottom-right notification stack |

### Backend API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/search` | Claude AI route insight + market rates |
| `POST` | `/api/quote-stream` | SSE streaming route analysis (Claude) |
| `POST` | `/api/quote-card` | Playwright → headless Chrome → PNG quote card |
| `POST` | `/api/send-quote` | Generates email via Claude (logs to console only — no real send) |
| `GET` | `/api/aircraft-photo/:reg` | Planespotters.net real aircraft photo by tail number |

### Data Files

- `src/data/aircraft.js` — 10 aircraft across 5 categories (Light → Ultra), catering/entertainment/transfer options
- `src/data/airports.js` — 52 global airports (**no lat/lon coordinates yet**)
- `src/data/emptyLegs.js` — 8 hardcoded empty legs with dynamic departure times

---

## 2. What's Broken

### Critical Issues

| Issue | Root Cause | Fix |
|---|---|---|
| Right-side void space | `hero-title` capped at `max-width: 700px`, nothing on the right | Split layout: text left, aircraft visual right |
| Fake pricing | `Math.floor(Math.random() * 8 + 2)` flight hours | Haversine distance ÷ aircraft cruise speed × 1.15 |
| No real email | `/api/send-quote` only logs to console | SendGrid integration |
| No mobile nav | Nav links disappear at 768px, no hamburger | Hamburger → full-screen overlay |
| Prices don't vary by route | No distance calculation | Add lat/lon to airports.js |
| Quote card is slow | Playwright + headless Chrome per request | Acceptable for MVP; replace with Canvas/SVG later |
| No database | All data in memory | PostgreSQL / Supabase (Phase 3) |
| No auth | All endpoints open | Supabase Auth (Phase 3) |

### Missing Features (Footer Lists But Doesn't Deliver)

- Fractional Ownership — listed in footer, no page
- Jet Cards — listed in footer, no page
- Aircraft Management — listed in footer, no page
- Multi-stop mission builder — tab exists, no UI
- Concierge chat — "calls within 15 minutes" is placeholder text

---

## 3. Full Overhaul Plan

### Phase 1 — Layout & New Sections (Implement Now)

#### Hero Split Layout

```
┌─────────────────────────┬──────────────────────────┐
│  APEX.                  │                          │
│                         │   [Aircraft silhouette]  │
│  Your World. Your Way.  │                          │
│                         │   ┌──────────────────┐   │
│  8,400+  190+  ~4min    │   │ Empty leg ticker  │   │
│                         │   │ LHR → DXB  £8.2K │   │
│  ┌─────────────────┐    │   │ ⏱ 4h 22m left   │   │
│  │  Search Form    │    │   └──────────────────┘   │
│  └─────────────────┘    │                          │
└─────────────────────────┴──────────────────────────┘
```

- Left 55%: headline, stats, search form
- Right 45%: animated aircraft silhouette + live empty leg tickers
- Mobile: stack vertically, aircraft visual hidden, search card full-width

#### iOS-Native Mobile Patterns

- Sticky bottom action bar: `"Get Quote — from $4,200/hr"` with `env(safe-area-inset-bottom)`
- `max-width: 430px` content (iPhone 14 Pro Max width)
- Hamburger → full-screen overlay nav with all links + CTA
- Aircraft cards: vertical list on mobile (not 3-col grid)
- Section padding: 80px desktop → 24px mobile
- `scroll-snap-type` on empty legs strip

#### Real Flight Hours Calculation

```js
// Add to server.js
function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 +
    Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
    Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// flightHours = (distanceNm / aircraft.speedKts) * 1.15  (wind factor)
// Example: LHR(51.48,-0.45) → DXB(25.25,55.36) = 3,411nm ÷ 516kts × 1.15 = 7.6hrs
```

Add lat/lon to all 52 airports in `airports.js`.

---

### New Feature Sections

#### A. Fractional Ownership

> Model based on NetJets / Flexjet structure

| Share | Approx. Entry Price | Hours/Year | Best For |
|---|---|---|---|
| 1/16 | ~$850,000 | ~50 hrs | Occasional UHNW flyers |
| 1/8 | ~$1,600,000 | ~100 hrs | Regular corporate |
| 1/4 | ~$3,100,000 | ~200 hrs | Frequent executive |
| 1/2 | ~$6,000,000 | ~400 hrs | Near-full-time |

**Three revenue streams per owner:**
1. Share purchase price (upfront)
2. Monthly management fee: $12,000–$28,000/month (crew, maintenance, insurance, hangar)
3. Occupied hourly rate: $8,500–$18,500/hr depending on aircraft

**UI:** Tier cards with breakdown calculator → CTA: "Request Ownership Prospectus" → captures lead to email

#### B. Jet Card Program

| Tier | Hours | Rate Locked | Availability Guarantee |
|---|---|---|---|
| Silver | 25 hrs | Fixed at purchase | 48-hour notice |
| Gold | 50 hrs | Fixed at purchase | 24-hour notice |
| Platinum | 100 hrs | Fixed at purchase | 12-hour notice |

- No repositioning fees
- Unused hours roll over 12 months
- Rate protection against market surges

#### C. Membership Tiers

| Tier | Price | Includes |
|---|---|---|
| APEX Access | Free | Quotes, empty legs, basic concierge |
| APEX Elite | £2,500/year | Dedicated concierge, 10% off empty legs, priority aircraft |
| APEX Sovereign | £12,000/year | 24/7 personal concierge, guaranteed availability, FBO lounge access |

#### D. APEX Priority Account

Minimum £25,000 deposit drawn down against flights:
- Preferred hourly rate locked in
- 60-minute response SLA (vs 3-hour standard)
- Named relationship manager
- **Psychology:** Once deposited, client calls APEX first. The deposit creates loyalty, not the money.

#### E. Multi-Stop Mission Builder

Connect existing "Multi-Stop" tab to real UI:
- Add waypoints dynamically
- Different aircraft per leg
- Consolidated quote across all legs
- Target complex itineraries (Dubai → London → New York → Aspen)

---

## 4. Market Intelligence

### Market Size

| Metric | Figure | Source |
|---|---|---|
| Global private jet charter market (2025) | $16.38 billion | Market research |
| Projected size (2031) | $25.79 billion | 7.86% CAGR |
| Broader private aviation (incl. fractional, jet cards) | $45.9B (2024) → $66.97B (2032) | 5.4% CAGR |
| Global departures (2025) | 3,878,336 | All-time record, +34% vs 2019 |
| UHNW population (mid-2025) | 510,810 individuals | Altrata World Ultra Wealth Report |
| UHNW total net worth | $59.8 trillion | Altrata |
| UHNW projected growth by 2030 | +31% → 676,970 individuals | Altrata |

### Regional Growth

| Region | Market Size | CAGR | Key Driver |
|---|---|---|---|
| Europe (UK = 21.6%) | $10.23B (2025) | 5–6% | Incumbent market, Farnborough/Le Bourget hubs |
| UAE / MENA | $1.54B (2026) | **8.44%** | Sovereign wealth, VVIP culture, events |
| India | $4.18B (2024) → $9.21B (2035) | **7.4%** | UHNW growth, tier-2 city demand |
| Asia-Pacific | Fastest growing region | **9% CAGR** | Singapore, HK, new wealth |

### Segment Performance (2024)

- Fractional ownership: **+59% vs 2019** — strongest growth
- Jet cards / subscriptions: **9.63% CAGR** — fastest growing segment
- On-demand charter: **-14.7% from 2022 peak** — normalising but above 2019
- Private aviation retained **95%+ of COVID-era new flyers**

### Competitor Revenue Models

| Company | Model | Revenue | Margin |
|---|---|---|---|
| NetJets | Fractional ownership | ~$6-8B/yr | High (Berkshire Hathaway) |
| VistaJet | 25hr/yr programme ($130K minimum) | ~$3B/yr | 60% from 3-yr contracts |
| Flexjet | Fractional + lease hybrid | $3.8B (2024), $398M EBITDA | Strong |
| Air Charter Service | Diversified broker | $1.34B (2025) | ~8-12% gross |
| Wheels Up | Membership | $792M (2024) | 10.8% margin — near-bankruptcy 2023 |
| Victor | Transparent marketplace | Undisclosed | 5-10% stated commission |

### Unit Economics

| Metric | Figure |
|---|---|
| Broker margin (industry range) | 10–30%, median ~15% |
| Light jet charter ATV | $10,000–$25,000 |
| Midsize jet charter ATV | $20,000–$45,000 |
| Heavy/ultra-long ATV | $80,000–$200,000+ |
| Quote-to-booking conversion rate | ~3% industry average |
| Gross margin per $50K charter (15%) | ~$7,500 |
| Corporate client annual gross (6 trips × $50K × 15%) | ~$45,000/year |
| Corporate client 5-year CLV | ~$225,000 |

---

## 5. Real Quote Sources

### Tier 1: Start Here (Free / Low Cost)

#### FL3XX Developer Portal
- **URL:** developer.fl3xx.com
- **Cost:** Free to register
- **What it gives you:** REST + Webhooks API for live operator schedules, empty legs, pricing
- **Empty Legs API:** developer.fl3xx.com/guides/guides/empty-legs-sale
- **Action:** Sign up, build prototype empty-leg feed from operators who use FL3XX
- **Why first:** No cost, most developer-friendly, direct operator pipeline

#### Leon Software (GraphQL API)
- **URL:** leonsoftware.com/integrations.html
- **Cost:** Negotiate per operator
- **What it gives you:** Live schedule from operators on Leon (auto-syncs to Avinode every 15 min)
- **Action:** Identify operators using Leon; negotiate direct GraphQL feed

#### Aviapages
- **URL:** aviapages.com | Documentation: dir.aviapages.com/api/documentation/
- **Cost:** Tiered — aviapages.com/pricing/ (contact for enterprise)
- **APIs available:**
  - Price Calculator API — real-time route cost estimate
  - Charter Request API — blast RFQ to multiple operators
  - Charter Directories API — 10,000+ aircraft, 4,000+ companies, 12,000+ airports
- **Why:** Lower cost than Avinode; strong MENA/India/Asia coverage

#### Avi-Go
- **URL:** avi-go.com
- **Cost:** 30-day free trial; then negotiated
- **What it gives you:** AI-powered empty leg marketplace, Leon integration, market analytics

---

### Tier 2: Industry Standard (Month 2+)

#### Avinode (The Industry Standard)
- **URL:** avinode.com/join/
- **Cost:** Advanced tier ~$699+/month. Ultimate tier (API access) — negotiated, not public
- **Coverage:** 7,000+ aircraft, 80+ countries — virtually every serious operator
- **API endpoints (Ultimate tier):**
  - `POST /searches` — submit itinerary, returns aircraft + pricing + operator + tail number
  - End Client Trip Search — embed Avinode search in your own UI
  - RFQ download/respond — pull and respond to incoming quote requests
- **Who uses it:** Victor, PrivateFly (now FXAir), Air Charter Service, most serious brokers
- **Action:** Apply at avinode.com/join/ — KYB vetting required. Start Advanced, upgrade when volume justifies API costs.

---

### Tier 3: Phase 1 (Implement Immediately)

#### Market Rate Pricing Bands (Verified, No API Needed)

Replace random flight hours with haversine distance + these verified bands:

| Route Type | Light Jet | Midsize | Super Midsize | Heavy | Ultra Long Range |
|---|---|---|---|---|---|
| Short haul (<2hr) | $8,000–$15,000 | $12,000–$22,000 | $18,000–$30,000 | — | — |
| Medium (2–5hr) | $15,000–$35,000 | $22,000–$50,000 | $35,000–$70,000 | $50,000–$90,000 | — |
| Long haul (5–9hr) | — | $45,000–$80,000 | $65,000–$120,000 | $85,000–$150,000 | $130,000–$220,000 |
| Ultra-long (9hr+) | — | — | — | $150,000–$300,000 | $200,000–$450,000+ |

---

### Email Inquiry Automation (Phase 2)

**Flow:**
```
User submits quote
  → Save to DB (status: pending_operator_quotes)
  → Select 5–8 operators (filtered by region + aircraft type)
  → SendGrid dispatches structured inquiry to each operator
  → Operator replies via reply.apex-charters.com/token=XXX
  → Best 3 responses aggregated
  → Client receives "Your quotes are ready" email with comparisons
  → Client selects → deposit link → booking confirmed
```

**Cost:** SendGrid free = 100 emails/day. $20/month for 50,000 emails.
**Turnaround:** Real quotes in 2–4 hours vs. competitors' next-day callbacks.

---

## 6. Operator Contacts

### Immediate Email Outreach (This Week)

| Operator | Region | Fleet | Email | Notes |
|---|---|---|---|---|
| **Solairus Aviation** | USA (75+ bases) | 355+ aircraft | charter@solairus.aero | Largest managed fleet in USA. ARGUS Platinum + Wyvern + IS-BAO |
| **AirX Charter** | Europe / Malta | 20 aircraft | info@airx.aero | ARGUS Platinum + IS-BAO Stage 3. Top-10 globally. +44 203 958 3939 |
| **DC Aviation Al-Futtaim** | Dubai (DWC) | VVIP fleet | charter@dc-aviation.ae | JV: DC Aviation (Germany) + Al-Futtaim. Premier Dubai operator. +971 4 870 1800 |
| **Royal Jet** | Abu Dhabi | 11 BBJs + Global 5000/6000 | info@royaljetgroup.com | Govt-linked. +971 2 5051 500 |
| **Safe Fly Aviation** | India (Mumbai/Delhi) | 15+ aircraft | info@safefly.aero | ARGUS/Wyvern certified. +91 7840000473 |
| **Gama Aviation** | UK / Farnborough | Mixed fleet | sales@gamaaviation.com | Acquired Hunt & Palmer broker. +44 1252 123456 |
| **Jetex** | Dubai HQ + 40 FBOs | Charter + FBO | aya.alassaf@jetex.com | UHNW client base. 40 private terminals globally. |
| **flyExclusive** | USA (Kinston NC) | ~100 jets | 252.208.1863 | ARGUS Platinum since 2015. 5th-largest US operator. |
| **Thrive Aviation** | Las Vegas | Mixed | flythrive.com | ARGUS Platinum **Elite** + Wyvern PRO. +1 702.736.0077 |
| **Clay Lacy Aviation** | LA + NYC | 100+ managed | claylacy.com/contact-us/ | 50+ year history. ARGUS Platinum + IS-BAO Stage 3. |
| **Luxaviation UK** | Luton/Farnborough/Stansted | Phenom, Praetor, Challenger, Global | luxaviation.com/luxaviation-united-kingdom/ | Part of Luxaviation Group (250+ aircraft globally) |
| **TAG Aviation UK** | Farnborough | Largest EU charter fleet | tagaviation.com/en/contact | +44 1252-377977 |
| **ExecuJet Middle East** | Dubai | Mixed | execujet.com/middle-east-regional-team/ | Part of Luxaviation Group |
| **Club One Air** | Delhi + Mumbai | Mixed | cluboneair.com | Oldest dedicated private jet brand in India. Wyvern + Hart Aviation certified |
| **JetSetGo** | Delhi + Mumbai | 40+ aircraft | jetsetgo.in | India's largest private jet marketplace. Tech-forward |

---

## 7. Strategic Partnerships

### Ground Transport

| Partner | Model | Action |
|---|---|---|
| **Blacklane** | White-label API, 300+ cities, 500+ airports. Aviation vertical. Pays referral fees. | blacklane.com/en/strategic-partnerships/ → Contact: adam.parken@blacklane.com |
| **Carey International** | 1,000+ cities, 1,500+ private airfields. Specifically serves Part 91/135 operators. | carey.com/travel-management-services/private-aviation-ground-transportation/ |

**Strategy:** Auto-offer Blacklane transfer at origin + destination airport in every APEX booking. Zero friction, Blacklane pays you.

### FBO Networks

| FBO | Scale | Strategy |
|---|---|---|
| **Signature Aviation** | 200+ locations, 27 countries. World's largest. | Pitch preferred broker agreement. They have an established partner framework. |
| **TAG Aviation** | Farnborough — Europe's largest charter fleet + FBO | tagaviation.com/en/contact — Reciprocal referral arrangement |
| **Jetex** | 40 private terminals globally. Dubai-centric. | Strong MENA fit. Partnership covers ground handling + referrals |
| **Jet Aviation** | Basel, Geneva, Dubai, Singapore, Teterboro + more | jetaviation.com/contacts/ |

### Private Banking

| Bank | Market | Approach |
|---|---|---|
| **Emirates NBD Private Banking** | Dubai / MENA | DIFC Private Banking division. Strong appetite for lifestyle partnerships. APEX's #1 bank target for Dubai launch. |
| **Arbuthnot Latham** | UK | Head of Lifestyle Services. More accessible than Coutts. |
| **C. Hoare & Co** | UK | Head of Client Experience. Boutique, approachable at startup stage. |
| **Julius Baer** | Zurich / London | Head of Lifestyle Banking or concierge division. Approach via mutual advisor (tax lawyers, accountants). |
| **Coutts** | UK | Head of Client Experience. NatWest-owned — longer approval process. Year 2 target. |

**Pitch to banks:** "Add APEX as a named lifestyle partner — dedicated relationship contact + priority SLA for your clients." Not a commission deal (regulatory complications). Offer co-branded events at Farnborough (20–30 top clients).

### Luxury Hotel Concierge

| Property | Market | Model |
|---|---|---|
| **Burj Al Arab** | Dubai | Approach Head Concierge (Les Clefs d'Or member) |
| **Atlantis The Palm** | Dubai | Director of Guest Experience |
| **One&Only The Palm** | Dubai | Guests regularly need jets to Maldives, Seychelles |
| **Aman properties** | Global | Aman promotes private jet itineraries between its own properties. Natural fit. |
| **Rosewood** | Global | Head Concierge + Director of Lifestyle |
| **Four Seasons** | Global | Individual property concierges (not the corporate jet product) |

**Commission structure:** 10–15% of charter value to hotel's guest experience fund or charitable programme (avoids personal commission regulatory issues).

**Les Clefs d'Or:** Professional association of top hotel concierges. Building one relationship with the regional chairperson gives access to dozens of concierges simultaneously.

### Yacht Charter Crossover

**The proven model:** Victor partnered with Fraser Yachts; Ferretti Group partnered with Flexjet; Magellan Jets partnered with Denison Yachting; Air Charter Service actively markets to superyacht clients.

| Yacht Broker | Market | Action |
|---|---|---|
| **Fraser Yachts** | Global | "Sky-to-sea" packages. 10% referral on charter value. |
| **Burgess Yachts** | Mediterranean / Global | Mediterranean season (May–Sep) is peak aviation demand |
| **Camper & Nicholsons** | Global | Event-based co-marketing |
| **Y.CO** | Global | Co-market around Monaco Yacht Show, Cowes Week |

### Concierge White-Label

| Partner | Model | Why |
|---|---|---|
| **Ten Group** | White-label concierge for banks/credit cards (Amex Centurion-style). 1,000+ corporate clients. | They need a trusted aviation partner. APEX provides the service; Ten provides the clients. |
| **Quintessentially** | 40+ offices, 700+ specialists. Has its own aviation division. | Approach B2B team for white-label or preferred partner status. |

### Safety Certifications (Non-Negotiable)

| Body | What It Is | Action |
|---|---|---|
| **ARGUS International** | Certified Charter Broker Audit. Now mandatory (Jan 2026 — registered-only status eliminated). | argus.aero — Schedule audit immediately. Est. $2,000–$5,000. |
| **Wyvern Wingman Broker** | Virtual audit. Fortune 500 companies require this. 24-month certification. | wyvernltd.com/wyvern-broker/ — Request quote |
| **ACA Membership** | UK trade body. Requires 12 months trading + operator references. | Apply at 12-month mark. theaircharterassociation.aero |
| **EBAA** | European broker network + regulatory access. | pwalsh@ebaa.org — Email Paul Walsh for new member enquiry |
| **NBAA** | US market credibility. Low cost. | nbaa.org/membership/ |

### Catering Partners

| Partner | Presence | Use Case |
|---|---|---|
| **Do&Co** | 32 sites, 12 countries. "Flying Chefs" VIP concept. | Premium onboard catering. Negotiate preferred rates at key FBOs. |
| **Gate Gourmet** | 200+ airports. Premium divisions. | FBO-adjacent catering for standard/prestige tiers |

### Insurance

| For | Provider | Notes |
|---|---|---|
| APEX Professional Indemnity + E&O | **Gallagher Specialty** (ajg.com) or **BWI Fly** (bwifly.com) | Aviation-specific broker. Required before taking any client money. |
| Verifying operator coverage | **Global Aerospace** / **AIG Aviation** | Minimum $200M hull/liability per operator via ARGUS/Wyvern audit trail. |

### Tech Integrations

| Integration | What It Does | How |
|---|---|---|
| **FlightAware AeroAPI** | Live aircraft positions, flight history, tail numbers | flightaware.com/commercial/aeroapi/ — Usage-based pricing |
| **Flightradar24 API** | Real-time ADS-B positions, historical tracks | fr24api.flightradar24.com — From ~$9/month |
| **Schedaero API** | Operator scheduling system (Avinode Group). Open REST API. | schedaero.com/schedaero-integrations-api/ — Direct operator pipeline |

---

## 8. Marketing Strategy

### Launch Market: Dubai First, London as Back-Office

**Why Dubai first:**
- Fastest-growing region (8.44% CAGR)
- WhatsApp-first culture → 62% response rates on WhatsApp (vs email's 20%)
- Less entrenched digital competition — most UAE brokers are traditional relationship businesses with weak digital presence
- Event calendar: ADIPEC (Nov), Art Dubai (Mar), Dubai World Cup (Mar), F1 Abu Dhabi (Dec)
- "London-based" is a trust signal in the UAE → register APEX in UK, operate in Dubai
- Being early in a growing market is worth more than being late to a mature one

**Phase 2 (months 12–24):** London, with FBO relationship at Farnborough
**Phase 3 (months 24–36):** India via operator partnership (not standalone)
**Do not enter USA independently** — foreign operators need FAA Part 135 or a US partner to carry pax between US points.

---

### Digital Channels

#### Google Ads

- **Budget:** £8,000/month (UAE + UK combined)
- **CPC benchmarks:** Route-specific terms £15–35/click. Empty leg terms £8–18/click
- **Critical:** Negative keyword list is more important than positive. Exclude: cheap, discount, budget, student, free, flight simulator, FSX, pilot jobs, Microsoft Flight
- **Campaign structure:** (a) Brand terms, (b) Route-specific ("London to Zurich private jet"), (c) Competitor terms ("VistaJet alternative"), (d) Empty leg terms
- **Rule:** Never send PPC traffic to the homepage. Every campaign → dedicated route/intent landing page with single CTA
- **Remarketing:** Target visitors who viewed route pages but didn't enquire. Follow on Display, YouTube, Gmail

#### LinkedIn Ads

- **Budget:** £3,500/month
- **CPC:** £6–14 for C-suite targeting in UK
- **Audience segments:**
  - **Segment A (buyer):** CEO, CFO, COO, MD — company size 200+, industries: financial services, PE, energy, real estate, pharma, luxury goods
  - **Segment B (booker):** Executive Assistants + PAs to C-suite at same companies
  - **Segment C (corporate):** Upload matched company name lists (FTSE 100, UAE conglomerates, Indian business houses)
- **Best formats:** Lead Gen Forms (no redirect, highest conversion), Conversation Ads (40–60% open rate), 15–30 second video ads

#### TikTok & Instagram

- **Budget:** £2,000/month content + production
- **TikTok:** 3.70% engagement rate (up 49% YoY). 85% of views from recommendation engine = free organic reach to HNWIs who've never heard of APEX
- **The Amalfi Jets proof point:** 24-year-old built $120M revenue with no aircraft, purely through TikTok (2.8M followers, 125M likes)
- **Content mix:** 60% educational ("what does an empty leg actually mean?"), 30% lifestyle/aspiration, 10% booking prompts
- **Founder-led content dramatically outperforms branded content** — CEO on camera is the strategy
- **Instagram:** Reels (aircraft interiors, FBO arrivals, catering setups), Stories ("Today's empty leg: Farnborough → Nice — £X. Tap to book.")

#### WhatsApp Business API

- **Setup via:** Twilio, 360dialog, or Vonage
- **Cost:** ~$0.005–0.08/message depending on type and country

**The 5 use cases:**

1. **Empty Leg Broadcast Alerts** — Segment opt-in list by home base, aircraft preference, route. Template: `"APEX ALERT: Empty leg — Farnborough → Nice, [Date], Challenger 350, 2 seats remaining. £8,200. Reply YES to hold."`

2. **90-Second Quote Response** — When prospect submits form, trigger WhatsApp within 90 seconds: `"Hi [Name], this is [Agent] at APEX. I have your quote for [route]. Preparing it now — any preference on aircraft size?"` Speed alone is a major differentiator.

3. **VIP Pre-Flight Briefing** — Day before: `"Your APEX flight tomorrow departs [time] from [FBO]. Car booked for [time]. Crew: [names]. Catering confirmed: [preferences]. Any changes?"`

4. **Post-Flight Referral Ask** — After completion: `"If any colleagues need private aviation, introduce them to APEX and we'll credit £[X] toward your next flight."`

5. **Relationship Management** — Assign each repeat client a named RM who communicates exclusively via WhatsApp.

#### SEO Strategy

- **Don't compete for head terms** ("private jet charter") in year 1 — competitors have DR 70-85+
- **Target:** Route-specific long-tail where DR 20-35 can rank page 1
- **Structure:** `/routes/farnborough-to-nice-private-jet` — individual pages, not blog posts
- **Build 300–500 route pages over 18 months** — this is how Air Charter Service and PrivateFly built their authority
- **Priority content types:**
  1. Route guides (highest conversion — booking intent)
  2. Empty leg pages (automated, dynamically updated)
  3. Aircraft comparison pages ("G550 vs Global 6000")
  4. Cost/pricing guides (top-of-funnel lead capture)
  5. Event-specific pages ("Private jet to Monaco Grand Prix 2026")

#### Programmatic / Display

- Use **The Trade Desk** (preferred DSP for luxury brands — superior brand safety)
- **PMP (Private Marketplace) deals** with: Financial Times, Wall Street Journal, Economist, Forbes Luxury, Condé Nast Traveller, Robb Report, Elite Traveler
- **Minimum CPM:** £15–45 on verified premium inventory. Never buy sub-£5 CPM — brand-unsafe placements
- **Data partners:** Mastercard Insights / Experian Mosaic (postcode-level wealth), Oracle Data Cloud / Lotame (HNW lifestyle segments)

---

### Event Marketing Calendar

| Event | Location | Lead Time | Target Aircraft |
|---|---|---|---|
| F1 Monaco Grand Prix | Monaco | 6–8 weeks | Light to Super-Midsize |
| F1 Abu Dhabi Grand Prix | DWC | 4–6 weeks | Large Cabin |
| Davos (WEF) | Samedan/Zurich | 8–12 weeks (slots scarce) | All types |
| Wimbledon | London/Farnborough | 2–4 weeks | Light-Midsize |
| Royal Ascot | London | 2–4 weeks | Light-Midsize |
| ADIPEC | Abu Dhabi | 4–6 weeks | Large Cabin |
| Art Basel Miami | Miami/Opa-Locka | 4–6 weeks | Large Cabin |
| Cannes Film Festival | Nice | 4–6 weeks | All types |
| Art Dubai | Dubai | 4–6 weeks | Light to Heavy |
| Dubai World Cup | Dubai | 4–6 weeks | All types |
| Goodwood Festival of Speed | Goodwood/Farnborough | 3–5 weeks | Light |

**Tactics:**
- Dedicated landing pages for each event
- Secure Samedan slots early for Davos — scarcity is a product
- Partner with F1/event hospitality companies (Above & Beyond Group, Edge Global Events)

---

### PR Strategy

#### Priority Publications

| Publication | Audience | Type | Priority |
|---|---|---|---|
| **AIN Online** (ainonline.com) | Industry trade | News + features | Immediate Day 1 |
| **Business Air News** (businessairnews.com) | UK industry + buyers | Startup profiles | Day 1 |
| **Arabian Business** (arabianbusiness.com) | UAE business | Launch press release | Day 1 |
| **Business Jet Traveler** (bjtonline.com) | End buyers (UHNW) | Service reviews | Month 2 |
| **Robb Report** (robbreport.com) | UHNW lifestyle | Features + experiential | Month 3 |
| **Elite Traveler** | Distributed on private jets | Awards + editorial | Month 3 |
| **Tatler UK** | UK HNW social | Lifestyle notes | Month 4 |
| **The Gentleman's Journal** | UK HNW male | Founder story | Month 2 |
| **City A.M.** | London business | Launch story | Day 1 |
| **The National** (UAE) | UAE business | Launch story | Day 1 |

#### Thought Leadership Topics to Own

1. **AI pricing transparency** — "How AI is making private aviation pricing fair"
2. **Empty leg economics** — Publish annual data report on UK/MENA empty leg patterns
3. **Pet travel** — "The APEX guide to flying privately with your dog/horse/cat"
4. **Sustainability & SAF** — Publish carbon offset policy; increasingly important to ESG-aware UHNW
5. **The first-timer's guide** — "I've never chartered a private jet — where do I start?" (high search volume, zero quality competition)

#### Link Building

- **HARO / Qwoted** — Respond to journalist queries on luxury travel and aviation
- **Data PR** — "The 10 most popular private jet routes from Farnborough, 2025" earns natural press links
- **Industry directories** — ACA member listing, NBAA member directory, ARGUS broker registry

#### Awards to Apply For

| Award | Body | Category |
|---|---|---|
| ACA Annual Excellence Awards | Air Charter Association | Best New Entrant, Service Provider of the Year |
| Aviation Business Middle East Awards | ABMEawards | Best Charter Company, Best Aviation Service Provider |
| World Travel Awards | WTA | Private Jet Charter Award |
| Elite Traveler Awards | Elite Traveler | Top Charter Provider |
| Business Jet Traveler Awards | BJT (reader-voted) | Appears in front of actual charter clients |

---

### Pricing Psychology

**Show indicative ranges, not "call for quote":**
- 68% of prospects now do detailed cost comparisons before committing
- Showing ranges ("London to Zurich from £8,500 in a light jet") removes anxiety and converts researchers to enquirers
- Never show a single fixed price — variability is real; false precision loses credibility
- For complex long-haul: "For this route, we prepare a personalised quote via WhatsApp"

**Anchoring — always present premium first:**
1. Ultra Long Range (G700 / Global 7500)
2. Large Cabin (Falcon 7X / G550)
3. Super Midsize (Challenger 350)
4. Midsize (Citation XLS+)
5. Light Jet (Phenom 300)

---

## 9. Competitive Edge

| Edge | Why It Works |
|---|---|
| **Instant transparent pricing** | 90% of brokers say "call us." APEX shows the number immediately. Trust-building with price-sensitive UHNW buyers. |
| **Quote in minutes, real price in 2–4 hours** | NetJets/VistaJet: hours-long sales cycles. APEX: automated operator dispatch delivers a real price before the user has left the page. |
| **WhatsApp-native** | UAE, India, GCC HNW are WhatsApp-first. Quote card sharing is a genuine viral loop. Nobody else does this at scale. |
| **Fractional + on-demand in one platform** | NetJets only does fractional. Victor only does charter. Nobody elegantly combines both. |
| **Pet-first charter flow** | Zero competitors have a dedicated pet charter UX. Pet owners are extremely loyal customers. |
| **Empty legs as a product** | Countdown urgency + seat bars make empty legs compelling vs. being buried as a footnote. |
| **APEX Priority Account** | £25,000 deposit creates loyalty via sunk cost. Client calls APEX first because they've deposited, not because you asked them to. |
| **Event intelligence** | Own the event-specific landing pages. Secure Samedan slots before Davos. Davos slot scarcity is a product, not a problem. |
| **AI route intelligence** | Real Claude Opus streaming analysis — not canned copy. Differentiates from every other broker's static quote PDF. |
| **Transparent broker certification** | ARGUS Certified + Wyvern Wingman. Display these prominently. Most small brokers don't have them. Fortune 500 procurement requires Wyvern. |

---

## 10. Financial Model

### Revenue Streams

| Stream | Margin | Year 1 Target | Notes |
|---|---|---|---|
| On-demand charter brokerage | 15% avg | £1,200,000 | Core product |
| Jet card sales (25hr blocks) | 12% locked-in | £400,000 | Lower margin, higher LTV |
| Fractional ownership leads | Fee per referral / advisory | £100,000 | Commission from operator partner |
| APEX Priority Account interest/float | ~2–3% float | £50,000 | £25K deposits × 50 accounts |
| Concierge add-ons (catering, transfer) | 20% | £80,000 | Blacklane referral + catering mark-up |
| **Total Year 1** | | **~£1,830,000** | Conservative estimate |

### Cost Structure (Year 1)

| Category | Annual | Notes |
|---|---|---|
| Marketing (£20K/month) | £240,000 | Google, LinkedIn, social, SEO, PR, events |
| Avinode Advanced membership | ~£100,000 | ~$699+/month + usage |
| ARGUS + Wyvern certifications | £10,000 | One-time audits + annual fees |
| WhatsApp API + CRM (HubSpot) | £12,000 | Platform + BSP costs |
| Professional indemnity insurance | £8,000 | Gallagher Specialty / BWI Fly |
| Legal + compliance | £20,000 | UK company, UAE trade license, broker agreements |
| Salaries (2 people: founder + ops) | £120,000 | Lean startup |
| Technology / hosting | £15,000 | Vite/React app, server, Supabase, Playwright |
| **Total Year 1 Costs** | **~£525,000** | |

### Year 1 P&L Estimate

| | Amount |
|---|---|
| Gross Revenue | £1,830,000 |
| Cost of Revenue (operator payments) | £(1,200,000) |
| **Gross Profit** | **£630,000** |
| Operating Costs | £(525,000) |
| **EBITDA** | **~£105,000** |

> **Note:** This assumes 15% average broker margin. Single best lever to improve profitability: increase average transaction value and margin on complex/VVIP bookings.

### Investor Landscape

| Investor | Stage | Notes |
|---|---|---|
| Octopus Ventures | Seed–Series A | Backed Stratajet. UK-focused. |
| JamJar Investments | Seed | Backed Stratajet. Consumer + tech. |
| Playfair Capital | Seed | Backed Stratajet. |
| CapitalG (Google/Alphabet) | Series B | Backed Aero. |
| Certares Management | Growth / PE | Travel-focused. Wheels Up. |
| Delta Air Lines / strategics | Strategic | Wheels Up. Corporate strategics are likely acquirers. |

**Most likely exit path:** Acquisition by a large strategic platform (Vista Global, Directional Aviation, Delta) — as with JetSmarter→XO, PrivateFly→FXAir, Stratajet→XO.

---

## 11. Regulatory Requirements

### You Do NOT Need an AOC

A charter broker arranges flights; the **operator** holds the AOC. APEX is a broker.

### UK

| Requirement | Details |
|---|---|
| Company registration | UK Ltd company (Companies House) |
| ATOL | Not required for whole-aircraft charter to a single client. Required if selling individual seats to consumers. |
| Air Charter Association membership | Voluntary but expected. Apply at 12-month mark (requires 12 months trading + operator references). |
| Professional Indemnity Insurance | Required. Via aviation specialist broker. |

### UAE

| Requirement | Details |
|---|---|
| Trade license | DED (Department of Economic Development) — aviation services category |
| GCAA approvals | Required before trade license finalised |
| No specific "broker license" | Work with UAE AOC holders and internationally licensed operators |

### USA (Phase 3 Only)

| Requirement | Details |
|---|---|
| FAR Part 295 | No license required. Key disclosures: state you are an indirect carrier, disclose operator name, disclose operating certificate validity. |
| Restriction | Cannot sell individual seats or arrange shared-cost flights among unrelated parties without Part 135 certification. |
| UK startup path | Enter via partnership with a US Part 135 operator. Do not build independently. |

---

## 12. Implementation Roadmap

### Sprint 1 — This Week (Layout + Foundations)

- [ ] Hero: split layout (left: content, right: aircraft visual + live empty leg tickers)
- [ ] Add lat/lon to all 52 airports in `airports.js`
- [ ] Implement haversine flight hours calculation in `server.js`
- [ ] Replace random pricing with verified market rate bands
- [ ] Hamburger menu → full-screen mobile overlay
- [ ] Sticky bottom CTA bar (mobile, `env(safe-area-inset-bottom)`)
- [ ] Aircraft cards → vertical list on mobile
- [ ] Build `FractionalSection.jsx`
- [ ] Build `JetCardSection.jsx`
- [ ] Build `MembershipSection.jsx`
- [ ] Connect multi-stop tab to real UI

### Sprint 2 — Month 1–2 (Email + Real Prices)

- [ ] SendGrid integration (replace `console.log` in `/api/send-quote`)
- [ ] Operator database (CSV → DB): 50–100 ARGUS/Wyvern operators
- [ ] Operator inquiry dispatch: auto-email 5–8 operators on quote submission
- [ ] Operator reply form: `reply.apex-charters.com/token=XXX`
- [ ] Quote status tracking (pending → quoted → selected → booked)
- [ ] Multi-currency display (USD / GBP / EUR / AED)
- [ ] Apply to Avinode (Advanced tier)
- [ ] Sign up to FL3XX developer portal (free)
- [ ] Apply for ARGUS Certified Broker audit
- [ ] Apply for Wyvern Wingman Broker

### Sprint 3 — Month 2–3 (Auth + Database)

- [ ] Supabase Auth (phone/email OTP, Google SSO)
- [ ] PostgreSQL (users, bookings, quotes, operators, empty legs)
- [ ] APEX Priority Account deposit flow
- [ ] Admin panel (manage quotes, operators, fleet, empty legs)
- [ ] WhatsApp Business API (Twilio or 360dialog)
- [ ] Empty leg broadcast list + automated alerts
- [ ] Blacklane ground transport API integration

### Sprint 4 — Month 4+ (Live Data)

- [ ] Avinode API integration (Ultimate tier — live pricing + availability)
- [ ] FL3XX empty legs live feed
- [ ] FlightAware AeroAPI (live aircraft tracking)
- [ ] Fractional ownership prospectus generation (Claude-generated PDF)
- [ ] Jet card purchase flow with Stripe
- [ ] APEX Elite / Sovereign membership billing (Stripe subscriptions)
- [ ] First ACA membership application (12-month mark)

---

## 13. Files to Modify

### Phase 1 Changes

| File | Change |
|---|---|
| `src/index.css` | Hero split layout, iOS mobile patterns, sticky bottom bar, hamburger overlay |
| `src/components/Hero.jsx` | Add right column (aircraft visual + empty leg tickers), update stats |
| `src/components/Nav.jsx` | Hamburger button + full-screen overlay nav |
| `src/data/airports.js` | Add lat/lon coordinates to all 52 airports |
| `src/App.jsx` | Add FractionalSection, JetCardSection, MembershipSection between ExperienceSection and footer |
| `server.js` | Haversine function, real pricing bands, replace Math.random() flight hours |

### New Files

| File | Purpose |
|---|---|
| `src/components/FractionalSection.jsx` | Ownership tier cards, monthly cost breakdown, prospectus CTA |
| `src/components/JetCardSection.jsx` | Hour pack tiers (Silver/Gold/Platinum), benefits, purchase CTA |
| `src/components/MembershipSection.jsx` | Access/Elite/Sovereign tier comparison + sign up |

### Phase 2+ New Files

| File | Purpose |
|---|---|
| `src/data/operators.js` | Curated operator database with region, aircraft types, contact |
| `server/routes/operators.js` | Inquiry dispatch, reply token generation |
| `server/routes/quotes.js` | Quote status tracking endpoints |
| `server/email/templates/` | SendGrid HTML templates (inquiry, confirmation, quotes-ready) |

---

*APEX Charters — Built on Claude AI · Designed for the world's most discerning travellers*
