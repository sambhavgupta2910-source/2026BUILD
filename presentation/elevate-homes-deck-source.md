# Elevate Homes — Master Deck Source (for NotebookLM / Perplexity)

**Purpose of this file:** a single, self-contained source of truth you can upload to
**NotebookLM** or **Perplexity** to generate *alternative* presentation decks, audio
overviews, Q&A, and investor briefs. Everything an LLM needs — narrative, numbers,
structure, FAQ, and framing rules — is in here.

> Upload note: NotebookLM accepts this as a text/markdown source directly. For Perplexity
> Spaces, if `.md` is rejected, rename to `.txt` (content is plain text). Pair it with the
> editable deck `Elevate-Homes-End-to-End-Deck.pptx` if you want the visual reference too.

---

## ⚙️ How to prompt the LLM with this file

Paste one of these after attaching this source:

- *"Using only this source, generate a 5-minute, 6-slide investor pitch deck (title + 3 bullets per slide + speaker notes)."*
- *"Create a 12-slide seed-investor deck for a PropTech VC audience; emphasize the SaaS arm and the data moat."*
- *"Create a brokerage-partner deck (B2B) to recruit RERA brokers into the PRISM network."*
- *"Write a 1-page executive summary and a 1-slide teaser."*
- *"Stress-test the financials and list the 10 hardest investor questions with strong answers."*
- *"Generate an audio-overview script (2 hosts, 8 minutes) explaining the business."*

---

## 1. Snapshot

- **Company:** Elevate Homes — a Dubai **resale brokerage** powered by **PRISM**, a DLD-backed
  pricing-intelligence engine. Blended model: **brokerage + PRISM SaaS**.
- **One-liner:** *"We are not another brokerage. We are a data-led resale engine that uses DLD
  pricing intelligence to win exclusive mandates and close transactions with higher trust — and
  we license the same engine as SaaS."*
- **Founder:** Sambhav Gupta — 3.5 years in Dubai real estate; Senior Investment Analyst, Sobha
  Realty; MBA hedonic-pricing dissertation on DLD branded-residence premiums.
- **Stage:** Working prototype live (engine + funnels + CRM + reports). Pre-seed / incubator.
- **Ask:** AED 630K seed, ~20% equity, released in 4 milestone tranches.
- **Brand decision:** present ONE brand — **Elevate Homes / resale-first**. (An earlier "Elevate
  Realty / off-plan / NRI" concept exists; fold its NRI lead-gen ideas in as a *channel*, not a
  competing identity.)

---

## 2. Market context (why now)

- Regional conflict (Iran–US tension, 2025–26) broke off-plan flip strategies → capital rotated
  into **immediate-liquidity resale**.
- Off-plan secondary volume **−27%** (Q1 2026); ready/resale values **+48% YoY** (Q1 2026).
- **AED 53B** secondary-market transactions in Q1 2026 (~14,399 deals). *(A parallel internal
  model cites ~AED 42B; treat as directional, validated live by PRISM.)*
- **~65,000 units** delivering through 2026 → a wave of owners who must price to sell.
- Pricing opacity: portals show **asking**, not **sold** prices; sellers overprice, then cut.
- **Window:** motivated sellers, selective buyers, low noise — first-mover advantage on mandates.
- Sources: Dubai Land Department Q1 2026; binayah.com; urbanterrace.ae. Figures directional.

---

## 3. Problem

- **Sellers** guess — no transparent DLD-based tool; opinion-based agent valuations; need a
  defensible exit price fast.
- **Buyers** distrust listings — can't verify fair vs overpriced; portals hide sold prices.
- **Brokerages** starve — portal leads split across 5,700+ agents; no tool to win mandates with
  evidence; spend buys raw leads, not exclusive mandates.
- **The gap:** DLD data is public but not digestible; nobody closes the loop
  **data → trust → mandate → commission.**

---

## 4. Solution — Elevate Homes + PRISM

- **PRISM Engine** — hybrid valuation on 66,413 clean DLD residential records; log-size
  elasticity **0.2733**; recency + size-proximity weighting; same-project boost; confidence
  diagnostics (`effective_comps`, `dispersion_pct`, `size_adjustment`). Engine id: `prism-hybrid-v1`.
- **Pricing Proof** — shows the *actual* comparable transactions (date, project, rooms, AED/sqft),
  not a black-box number. Evidence the seller takes to market.
- **Mandate Engine** — valuation → lead → strategy call → **exclusive mandate** → listed → closed
  → commission, tracked in a built-in CRM.

---

## 5. Product (working prototype — live today)

Three flows on one engine:

- **Seller (`/sell`):** area/project/beds/size → fair-value band + liquidity → comparable rows →
  lead → "book pricing strategy call" → exclusive mandate.
- **Buyer (`/deal-check`):** listing + asking price → verdict (fair / over / under) → downloadable
  Pricing Proof → lead → "let us negotiate this unit" → buyer representation.
- **Brokers (`/brokers` + `/crm`):** broker early-access signup (agency + RERA BRN) → feeds SaaS
  pipeline; agent CRM pipeline New → Qualified → Valuation Sent → Consultation → **Mandate** →
  Listed → Closed, with notes/status/history.
- **Live status:** 66,413 DLD records; PRISM Hybrid v1; `/healthz` ok; `/api/engine` →
  "prism-hybrid-v1"; branded `/report`; `/deck` presentation. Zero-dependency Node, nightly refresh.

---

## 5b. Feature list (exactly what we're building — status-marked)

**LIVE in the prototype today:**
- **PRISM hybrid engine** — median of DLD comparables + log-size adjustment (0.2733) + recency & size-proximity weighting + confidence diagnostics.
- **Seller valuation (`/sell`)** — fair value, 3-tier listing range (sell-faster / recommended / maximise), liquidity score, target-price check.
- **Buyer deal-check** — verdict (Strong Buy / Fair Value / Overpriced) + fair value + P25–P75 band position.
- **Comparable transactions** — the actual DLD rows shown inline (date, project, rooms, sqft, price, AED/sqft), not a black box.
- **Pricing Proof report (`/report`)** — branded, print-to-PDF, with the comparable table + methodology + advisor contact.
- **Lead capture (`/api/leads`)** — soft-gate form; stores name/phone/intent + property + a valuation snapshot.
- **Agent CRM (`/crm`)** — pipeline New→Qualified→Mandate→Listed→Closed, call notes, status history, stage control.
- **Broker signup (`/brokers`)** — agency + RERA BRN early-access → lands in the CRM.
- **Engine API (`/api/engine`, `/healthz`)** — programmatic engine + health; foundation for SaaS/licensing.

**PLANNED (Phase 2–3 — explicitly NOT built yet):** SaaS subscriptions & billing (AED 199–2,500/mo) · pay-per-report credits · buyer-requirements auto-matching · white-label / enterprise data API · full 7.71 GB DLD cache in production (builder script ready).

---

## 6. Competitive moat

| Platform | What they do | What's missing | Closes the loop? |
|---|---|---|---|
| DXB Interact | Free raw DLD data portal | No journey, lead, mandate, or revenue | No |
| Property Monitor | B2B AVM for institutions | Enterprise-only; no consumer; no brokerage | No |
| Bayut TruEstimate | 300K+ AI valuations → 5,700 agents | Distributes trust; no exclusivity; no comps shown | No |
| Dubai REST (DLD) | Official govt AVM | Generic; no comparables; no actionability | No |
| **Elevate Homes** | Data→Proof→Lead→Mandate→Closed→Fee + SaaS | **Nothing — closes the full loop** | **Yes** |

Moat compounds: every closed mandate adds a private comp the incumbents never see.

---

## 7. Business model — blended (six streams)

| # | Stream | Arm | Y1 (AED) | Y2 (AED) | Y3 (AED) |
|---|--------|-----|---------:|---------:|---------:|
| 1 | Resale mandates (GCI) | Brokerage | 1,909,089 | 5,727,267 | 12,218,169 |
| 2 | CPL agent pipeline | Brokerage | 945,000 | 2,415,000 | 4,235,000 |
| 3 | Founder personal deals | Brokerage | 641,250 | 810,000 | 810,000 |
| 4 | PRISM SaaS subscriptions | SaaS | 0 | 741,768 | 1,854,420 |
| 5 | Per-report credits / area packs | SaaS | 60,000 | 200,000 | 400,000 |
| 6 | Enterprise data / API licensing | SaaS | 0 | 180,000 | 460,000 |
| | **Combined** | | **3,555,339** | **10,074,035** | **19,977,589** |

**Thesis:** brokerage funds Year 1; SaaS builds the moat and the multiple; data compounds both.
**Same engine, two buyers:** in-house agents use PRISM free; external agents/devs pay.

**PRISM SaaS pricing (AED/mo):** Free (own agents) · 199 Starter · 499 Professional · 999 Team
(≤10 seats) · 2,500+ Enterprise. Add-ons: report PDF 100 (10-pack 850), comparable export 200,
area report 500, bespoke analysis 2,500, API 0.50/call, white-label 15,000+/mo.

---

## 8. Unit economics

- LTV:CAC **18.1×** (target >10×). Avg GCI/deal **AED 120K** (2% on ~AED 6M; blend down for
  smaller tickets). Founder salary **AED 20K/mo** (only fixed salary).
- Funnel (assumptions to validate): submission→qualified **37%**, qualified→consultation **28%**,
  consultation→mandate **45%**.
- Break-even ≈ **1.5 mandates/month**, ~**Month 7**, founder closing alone.

---

## 9. Financials (modeled, AED)

| | Year 1 | Year 2 | Year 3 |
|---|--:|--:|--:|
| Revenue | 3,555,339 | 10,074,035 | 19,977,589 |
| COGS (SaaS only) | 120,000 | 186,000 | 264,000 |
| EBITDA | 1,748,423 | 6,525,031 | 15,116,785 |
| EBITDA margin | 49.2% | 64.8% | 75.7% |

- Brokerage breakeven ~M7; SaaS self-sustaining ~M18; positive EBITDA from Year 2.
- **Indicative Y3 valuation:** SaaS ~1.85M ARR × ~10× **plus** brokerage EBITDA × ~4× → **~AED
  40–60M**. Dual exit: sell the brokerage arm and retain SaaS, or list PRISM at a SaaS multiple.

---

## 10. Scalability

**Flywheel:** more valuations → more mandates/closings → private comps PRISM owns → smarter engine
→ sharper pricing → more trust → more valuations. Zero marginal data cost (DLD nightly refresh,
zero-dep engine); product-led not payroll-led (hire 1 agent per 8–10 active mandates).

**Expansion stages:**
1. **Depth (Now→M6):** dominate 3–5 communities (Business Bay, Marina, JVC, Downtown, Dubai Hills).
2. **Breadth (M6→M18):** all Dubai resale communities + broker network + PRISM SaaS to externals.
3. **Platform (M18→Y3):** enterprise data/API + white-label PRISM; buyer-side + off-plan referrals.
4. **Geographic (Y3+):** same architecture, new registries — Abu Dhabi, then GCC open-data markets.

---

## 11. Roadmap (first 90 days)

- **Days 1–30 (Now):** Resale Proof MVP (built) — funnels, lead gate, Pricing Proof PDF, CRM, 10
  area pages, 3 campaigns. KPIs: 300 visitors · 50 submissions · 5 calls · 2 mandates.
- **Days 31–60:** full 7.71 GB DLD canonical cache, report share links, agent dashboard, retargeting,
  activate 2 agents. KPIs: 100+ submissions/mo · 5+ mandates · 1–2 closings.
- **Days 61–90:** systemize + PRISM SaaS beta. KPIs: 300+ submissions/mo · 15+ mandates · 3–5
  closings · first SaaS signups.

---

## 12. Feasibility check

**Scorecard:** Market HIGH · Technical HIGH · Financial MED-HIGH · Operational MEDIUM · Regulatory
MEDIUM · Competitive MED-HIGH. **Verdict: GO (conditional).** Risk is in *execution*, not market or
technology.

**Top risks → mitigations:**
- Full DLD access (Dubai Pulse pending) → 66K cache works now; canonical builder ready; nightly path live.
- Mandate conversion below model → founder closes first; don't hire until proven; 60–90 day exclusives.
- CAC inflation on portals → own-channel SEO/content/WhatsApp; NRI targeting; report-as-marketing.
- Brokerage shakeout (9,785 offices, 30%+ projected to close) → lean by design; built to survive.
- Incumbent copies comparables → speed + mandate-comp flywheel + consumer→brokerage loop.

**Kill criteria:** CAC > AED 25K/mandate after Sprint 1–2; consultation→mandate < 20% with founder
closing; or DLD access permanently foreclosed.

---

## 13. Team & credibility

Domain first, code followed. Founder lives the seller/buyer/agent problem daily (3.5 yrs, Sobha).
Dissertation hypothesis (size elasticity ~0.27) now runs in the engine as 0.2733 and is re-tested on
live DLD data. Prototype shipped solo with AI tooling. Hiring philosophy: earn the right to hire.

---

## 14. The ask

- **AED 630K seed, ~20% equity, 4 milestone tranches.** Breakeven ~Month 7; ~AED 5M cash by Y3.
- **From the incubator:** PropTech + brokerage mentorship; pilot users/test mandates; RERA licensing
  guidance; investor-readiness review.
- **Use of funds:** RERA licence + office; gated mandate-acquisition marketing; full DLD pipeline +
  SaaS build; first agents only on proven flow.
- **Closing line:** *"Every competitor generates data OR leads OR runs a brokerage. Elevate Homes
  closes the full loop — and licenses the engine."*

---

## 15. Investor FAQ (objection handling)

- **"Isn't this just another brokerage?"** No — it's a product-led mandate engine + SaaS. The
  brokerage is the first customer of the engine; the data moat compounds.
- **"Why won't Bayut/Property Finder crush you?"** They distribute trust to thousands of agents and
  monetize listings; they're not structured to run a consumer→exclusive-mandate→commission loop, and
  they don't show the comparable rows. Our private mandate comps deepen the gap.
- **"Are the conversion rates real?"** They're working assumptions to validate in Sprint 1. The model
  survives materially worse numbers because the fixed cost base is one salary.
- **"Is the valuation accurate?"** We show the comparable evidence + confidence diagnostics, not a
  black box. Methodology is refined live; we never present it as a settled AVM.
- **"What about DLD data rights?"** DLD transaction data is open; we operate under a RERA licence and
  present analytical opinion, not an official valuation.
- **"Why blended, not pure SaaS or pure brokerage?"** Pure SaaS is slow to PMF and burns Year 1; pure
  brokerage has a thin moat and low investor appeal. Blended gets Year-1 cash (GCI) + Year-3 multiple
  (SaaS) + the deepest moat.

---

## 16. Framing rules (must hold in any generated deck)

- Forward financials are **modeled projections**, not booked results — label them.
- Market stats are **cited and directional** — attribute to DLD/sources; don't assert as fact.
- The dissertation's pricing findings are a **hypothesis PRISM re-tests on live data** — never present
  specific premium figures (e.g., brand-tier %) as settled fact.
- Synthetic/demo data must never be presented as real market figures.
- Keep one brand: **Elevate Homes**. Resale-first; SaaS and broker network are the scale layer.

---

## 17. Glossary

- **DLD** — Dubai Land Department (official property transaction registry).
- **GCI** — Gross Commission Income (brokerage commission, ~2% per side on resale).
- **RERA / BRN** — Real Estate Regulatory Agency / Broker Registration Number (licence to broker).
- **Mandate** — an exclusive listing agreement to sell an owner's property (the core asset).
- **PRISM** — the hybrid DLD valuation engine (`prism-hybrid-v1`).
- **AVM** — Automated Valuation Model.
- **CAC / LTV** — Customer Acquisition Cost / Lifetime Value.
- **Comparable ("comp")** — a registered sale used as pricing evidence.
