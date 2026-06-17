# Elevate Homes — Business Model & Monetization

**Blended model: PRISM SaaS + Resale Brokerage** · prepared for incubator/investor review · June 2026

> Source of record: `ElevateHomes-Blended-Business-Plan.xlsx` (Drive). This doc is the
> text/version-controlled summary that sits next to the working prototype (`preview-better-ui` / `v3`).
> All revenue, EBITDA, and valuation figures below are **forward projections from the
> financial model**, not booked results. PRISM is the live instrument that keeps re-testing
> the dissertation's pricing hypothesis on current DLD data — treat engine/market figures
> as evidence-in-progress, not settled fact.

---

## 1. The blended thesis

**Brokerage funds operations · SaaS builds the moat · data compounds both.**

- **Brokerage funds the SaaS in Year 1** — commission income (GCI) covers operating costs
  before SaaS reaches critical subscriber mass.
- **SaaS feeds the brokerage** — every agent subscriber surfaces buyer/seller clients the
  brokerage can transact.
- **Mandate data is the flywheel** — every closed resale deal adds a real DLD comparable
  nobody else has; PRISM gets smarter; the moat deepens.
- **Same engine, two audiences** — in-house agents use PRISM free (it's the mandate engine);
  external agents pay AED 199–2,500/mo.
- **Dual exit optionality** — sell the brokerage arm to a large network and retain SaaS, or
  list the SaaS alone at a SaaS multiple.

---

## 2. Six revenue streams (modeled, AED)

| # | Stream | Engine | Year 1 | Year 2 | Year 3 |
|---|--------|--------|--------:|--------:|--------:|
| 1 | PRISM resale mandates (brokerage GCI) | Mandate funnel (`/sell` → `/crm`) | 1,909,089 | 5,727,267 | 12,218,169 |
| 2 | CPL agent pipeline | Paid Meta/Google leads → `/crm` | 945,000 | 2,415,000 | 4,235,000 |
| 3 | Founder personal deals | Founder pipeline | 641,250 | 810,000 | 810,000 |
| 4 | SaaS subscriptions | PRISM tiers | 0 | 741,768 | 1,854,420 |
| 5 | Per-report credits & area packs | Freemium paywall (`/report`) | 60,000 | 200,000 | 400,000 |
| 6 | Enterprise data licensing | API + white-label (`/api/engine`) | 0 | 180,000 | 460,000 |
| | **Combined total** | | **3,555,339** | **10,074,035** | **19,977,589** |

Brokerage arm = streams 1–3 (transaction GCI). SaaS arm = streams 4–6 (recurring + usage).
SaaS share of revenue grows ~1.7% → 11% → 14% (target 40%+ over time).

---

## 3. PRISM SaaS pricing

Internal agents use it **free** (it's the mandate engine); external users pay. Benchmarked
against Property Monitor PMiQ, Bayut TruEstimate, HouseCanary, ValuStrat.

| Tier | AED/mo | Target user |
|---|---|---|
| Internal (Elevate agents) | Free | Own agents — mandate engine |
| Starter | 199 | Solo agents, investors |
| Professional | 499 | Active brokers, valuers |
| Team (≤10 seats) | 999 | Small brokerages |
| Enterprise | 2,500+ | Developers, banks, funds |

**Add-ons / one-time:** Valuation report PDF AED 100 (10-pack 850) · Comparable export (Excel)
AED 200 · Community area report AED 500 · Bespoke area analysis AED 2,500 · API overage
AED 0.50/call · White-label AED 15,000+/mo.

**The gap PRISM fills:** PMiQ has no solo/SMB tier; Bayut shows a black-box number (PRISM shows
the DLD rows); ValuStrat reports are slow and ~25× the cost. PRISM is DLD-native, instant, all-tier.

---

## 4. Prototype → revenue map (what the incubator can click)

The working prototype already expresses the model end-to-end:

| Surface (live in prototype) | Revenue stream it drives |
|---|---|
| `/sell` seller valuation → lead | 1 — resale mandates |
| `/#deal-check` buyer pricing proof → lead | 1 — buyer-side representation |
| `/report` branded pricing report (lead-gated) | 5 — per-report credits (paywall-ready) |
| `/crm` lead pipeline (New → Mandate → Closed) | 1, 2, 3 — mandate conversion + CPL ops |
| `/brokers` broker signup | 4 — external SaaS subscribers / network |
| `prism-hybrid-v1` engine + `GET /api/engine` | 6 — enterprise data licensing / API foundation |

What's **not yet built** (post-PMF, per the plan): subscription billing/tiers, the report
paywall checkout, and the API/white-label productization — all Phase 2/3.

---

## 5. Blended P&L (modeled, AED)

| | Year 1 | Year 2 | Year 3 |
|---|--:|--:|--:|
| Total revenue | 3,555,339 | 10,074,035 | 19,977,589 |
| COGS (SaaS infra/data only; brokerage is gross commission) | 120,000 | 186,000 | 264,000 |
| Gross profit | 3,435,339 | 9,888,035 | 19,713,589 |
| Total OpEx (blended) | 1,686,916 | 3,363,004 | 4,596,804 |
| **EBITDA** | **1,748,423** | **6,525,031** | **15,116,785** |
| EBITDA margin | 49.2% | 64.8% | 75.7% |

- Brokerage **breakeven ~Month 7**; SaaS self-sustaining ~Month 18.
- One fixed salary in the model: founder at AED 20K/mo; agents on a gated, commission-led ramp.

**Indicative valuation bridge (Year 3):** SaaS ~AED 1.85M ARR × ~10× **plus** brokerage EBITDA × ~4×
→ combined **~AED 40–60M**. (Illustrative multiples, not a quote.)

---

## 6. Why blended (and why now)

**Model decision** (from the plan's own comparison): Pure SaaS is slow to PMF and burns Year 1;
pure brokerage is "just another brokerage" with low investor appeal and a thin moat. **Blended wins**
on Year-1 cash safety (GCI carries it), Year-3 upside (~AED 20M combined), moat depth (data + mandate
loop), and Series-A appeal (PropTech + brokerage).

**Market timing (June 2026):** post-conflict flight to immediate-liquidity **secondary** deals
(Dubai resale ~AED 42B in Q1 2026), a ~65,000-unit delivery overhang creating motivated resellers,
and pricing opacity in resale — sellers want **proof, not a sales pitch**. That is exactly PRISM's wedge.

---

## 7. Brand / narrative note (resolve before the meeting)

Two narratives exist in Drive:
- **Elevate Homes / PRISM** — data-backed *resale* brokerage + SaaS (this model, the prototype, the
  Codex investor deck). **Recommended canonical story.**
- **Elevate Realty** — *off-plan*, NRI-first, commission-only broker-shakeout deck.

The blended plan and the prototype both say **Elevate Homes / resale-first**. Recommend presenting
one coherent brand (**Elevate Homes**) and folding the strong NRI/off-plan *lead-gen* ideas in as a
channel, not a competing identity.
