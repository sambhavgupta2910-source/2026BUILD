# CREMA — Game Design Document

**Working title:** CREMA · *Build a Coffee Empire*
**Genre:** Real-time business tycoon / city-builder
**Engine:** Unity 6 LTS (URP)
**Platforms:** iOS & Android (primary), WebGL desktop build (showcase/demo)
**Art:** Stylised low-poly 3D (Synty POLYGON)
**Business model:** Premium one-time purchase (see §16)
**Document status:** v1.0 design spec — precedes implementation
**Date:** 31 May 2026

---

## 1. Vision

CREMA is a tycoon where you grow a single coffee cart into a global café empire by **building a visible city, not filling in a dashboard.** You see your cafés as real buildings on real streets, watch pedestrians flow past and peel off into your shops, and watch a storefront physically transform from a kiosk into a flagship as you reinvest. Underneath the world sits a deep, interlocking economic simulation — pricing, supply chains, staffing, brand, real estate, markets, and a path to IPO.

The design north star is the gap that killed the earlier prototype: **management depth must be expressed through a living world and contextual interactions, not through panels of sliders.** Every number the player tunes should have a consequence they can *see* on the map.

### Reference & differentiation
Coffee Inc 2 (Side Labs) is the closest reference: source beans, blend recipes, choose locations by foot traffic/rent, set prices against neighbours, hire staff, market, expand across cities, with a living competitive market. Its most-cited weaknesses are a **mid-game that goes repetitive** ("open store, repeat") and **tedious UI** (e.g. holding a button to raise a real-estate bid). CREMA's design explicitly counters both:

| Coffee Inc 2 pain point | CREMA design answer |
|---|---|
| Mid-game becomes "open store, repeat" | Conditions *evolve under you* — rotating consumer trends, macro cycles, a fluctuating bean commodity index, reactive competition, and a rolling objective ladder keep the optimal strategy moving. |
| Tedious bid/price micro-UI | Brand-wide pricing, slider/drag inputs, batch actions, and "set policy once" controls. No holding a button for minutes. |
| Flat, map-on-a-screen feel | A 3D city you build on, with agents, day/night, and buildings that visibly upgrade. |
| Repetitive expansion | Each city is a distinct market (affluence, traffic, its own trend & property cycle) demanding a different strategy. |

---

## 2. Design pillars

1. **A world you build, not a form you fill.** The map is the game. Management is contextual — tap a building, a drawer slides up.
2. **Deep, legible systems.** Many interacting systems, but every one is readable: the player always understands *why* a number moved.
3. **A market that adapts.** No two runs feel the same because the economy genuinely shifts — without any AI/LLM dependency.
4. **Respect the player's time.** Real-time with pause and speed control. Set-and-forget policies for things that shouldn't need babysitting; meaningful decisions for things that should.
5. **Premium, calm, confident.** Stylised, warm, uncluttered. A founder's game, not a slot machine.

---

## 3. Audience, platform, scope

- **Audience:** business-sim and tycoon players; the Coffee Inc 2 / Game Dev Tycoon / Two Point audience. Skews toward players who enjoy spreadsheets *made visible*.
- **Session shape:** 10–30 min sessions, real-time with pause; cloud-free local save.
- **Primary platform:** mobile (portrait-capable but designed landscape-first for the city view). Native iOS/Android.
- **Secondary:** WebGL build for a desktop browser demo and LinkedIn/portfolio showcase. (Unity WebGL is weak on *mobile* browsers — treat web as a desktop demo channel, not a shipping target.)

---

## 4. Core gameplay loop

**Moment-to-moment (seconds):** observe the city → spot a signal (queue forming, a trend shift, a bean price spike, an empty high-traffic lot) → pause → act (adjust price, add staff, buy beans, place a building) → unpause and watch the result.

**Session loop (minutes):** grow revenue → reinvest in capacity/quality/marketing → improve reputation → unlock the next lot/district → hit the next objective.

**Meta loop (hours):** expand to new cities → diversify into real estate and markets → build toward IPO → grow market cap → pursue the empire-scale endgame.

```
        ┌─────────────────────────────────────────────┐
        │                  WATCH THE CITY              │
        │   pedestrians • queues • signals • events    │
        └───────────────┬─────────────────────────────┘
                        │ spot a signal
                        ▼
              PAUSE  ──►  DECIDE  ──►  ACT
           (price/staff/beans/build/market/expand)
                        │
                        ▼
        ┌─────────────────────────────────────────────┐
        │             ECONOMIC TICK RESOLVES           │
        │  demand → sales → costs → cash → reputation  │
        │     market evolves • events fire • objectives│
        └───────────────┬─────────────────────────────┘
                        │ reinvest
                        ▼
                  GROW ► UNLOCK ► EXPAND ► IPO
```

---

## 5. The world & city-building (the headline layer)

This is the part the prototype lacked. It is the priority.

### 5.1 City structure
- A city is a **grid of streets and lots**. Lots sit along sidewalks; pedestrians path the sidewalks.
- Lots have a **type** (retail-ready, premium corner, kiosk spot) and belong to a **district** (e.g. Downtown, University, Marina) with its own **foot-traffic, rent, and affluence** profile — visibly distinct (skyscrapers vs leafy suburb).
- A lot is **leased** (ongoing rent) or **bought** (capex, no rent, appreciates — see Real Estate §9).

### 5.2 Building & upgrading (visible progression)
- Place a café on a lot → it appears as a **Tier-1 kiosk** mesh.
- Reinvest to upgrade the **building tier**, which **swaps the prefab**: Kiosk → Café → Flagship. Each tier visibly larger/richer and raises capacity & appeal.
- **Exterior fit-out** options (signage, seating, façade colour from your brand palette) give light cosmetic differentiation that nudges local appeal — the "design your store" hook from the genre, kept lightweight to avoid tedium.

| Tier | Visual | Capacity | Appeal | Unlock |
|---|---|---|---|---|
| 1 — Kiosk | Cart/kiosk prefab | Low | Low | Start |
| 2 — Café | Small storefront | Medium | Medium | Cash + reputation |
| 3 — Flagship | Large corner store | High | High | Cash + reputation + city tier |

### 5.3 Agents (foot traffic made real)
- Pedestrian agents spawn from district traffic numbers and walk the sidewalks.
- A fraction **peel off into your cafés** based on the demand model (§7.6) — this is the *visual representation* of demand. A busy café has a visible queue; an over-priced one has people walking past.
- **Performance budget:** capped concurrent agents (e.g. 60–120 visible), pooled, with the *economic* demand computed in the sim regardless of how many agents are drawn. Agents are a representation, not the simulation itself (critical for mobile perf).

### 5.4 Camera & controls (mobile-first, no tedium)
- 3/4 orbit camera. **Pinch-zoom, two-finger rotate, one-finger drag-pan.**
- **Tap a building** → selection + context drawer slides up. **Tap an empty lot** → build menu.
- **Speed/pause control** always visible (∥ ▶ ▶▶ ▶▶▶).
- No press-and-hold value entry anywhere. Sliders, steppers with x10 modifiers, and "set policy" toggles only.

---

## 6. Time model

CREMA is **real-time with pause**, not turn-based. This is the core feel upgrade.

- Game time flows continuously; the player sets speed (Pause / 1× / 2× / 3×).
- The **economic tick** resolves on a fixed in-game cadence (one *business day* per tick; ~N real seconds per day depending on speed). A **weekly summary** surfaces a P&L digest.
- Pausing is encouraged and free — decisions happen in pause; consequences play out in motion.
- Tick logic is **decoupled from rendering** (§14): the city animates at 60fps while the sim advances in discrete, deterministic steps.

---

## 7. Economic simulation (the depth)

The model below is the spec for the Simulation layer. All values are tuning constants in ScriptableObjects, not hardcoded.

### 7.1 Products / menu
Seven products, each with base appeal, bean usage, non-bean cost, a quality contribution, a season affinity, and a player-set price.

| Product | Appeal | Bean use | Other cost | Season |
|---|---|---|---|---|
| Espresso | 0.95 | 1.1 | 0.30 | — |
| Latte | 1.35 | 0.9 | 0.95 | — |
| Cappuccino | 1.10 | 0.9 | 0.70 | — |
| Cold Brew | 1.05 | 1.5 | 0.45 | Summer |
| Mocha | 1.00 | 0.9 | 1.15 | Winter |
| Pastry | 0.80 | 0.0 | 1.45 | — |
| Seasonal Special | 1.25 | 1.1 | 1.20 | — |

Pricing is **brand-wide per product** (not per store) to avoid micro-tedium. Each product can be toggled on/off the menu.

### 7.2 Beans / supply chain
- Four grades — Commodity / Premium / Single-Origin / Microlot — each with a **cost/use** and a **quality ceiling**.
- A **Bean Commodity Index** floats over time (random walk + macro pressure + shocks). It drives both your café input costs *and* the Coffee Futures price in Markets (§10) — enabling a real **hedge**.
- Inventory with ~3%/tick spoilage; stockouts cap sales and hit reputation. An **auto-restock policy** (keep N days of cover) removes busywork.

`unitCost(product) = otherCost + beanUse × beanGradeCost × beanIndex`

### 7.3 Staff
- Baristas per café provide **service capacity** (throughput). Under-staffing → queues → lost sales; over-staffing → wage bleed.
- A brand-level **Training tier** raises quality & throughput per head (and wages).

`capacity(café) = staff × baseThroughput × equipmentFactor × trainingFactor`

### 7.4 Equipment & brand quality
- Brand-level **Equipment tier** raises quality and capacity everywhere.
- `brandQuality = f(beanGrade, equipmentTier, trainingTier)` → a 0–1 score feeding appeal and reputation.

### 7.5 Marketing & awareness
- Weekly marketing spend builds **brand awareness** (0–100), which **decays** if spend stops. Diminishing returns at scale.

### 7.6 Demand model (per café, per tick)
```
visitors = districtTraffic × economyMult × seasonMult
         × (0.50 + 0.50 × awareness/100)
         × (0.58 + 0.42 × reputation/100)
         × competitionMult × eventMult

for each on-menu product p:
    fairPrice   = p.fair × (0.62 + 0.85 × brandQuality) × district.affluence
    priceAppeal = clamp((fairPrice / price)^1.7, 0.05, 1.7)
    weight(p)   = p.appeal × priceAppeal × seasonAffinity(p) × trend(p) × qualityMod(p)

demand(p) = visitors × conversion × weight(p) / Σweights
orders(p) = min(demand(p), café capacity share)      // overflow = lost sales (queues)
revenue   = Σ orders(p) × price(p)
cogs      = Σ orders(p) × unitCost(p)
beansUsed = Σ orders(p) × beanUse(p)                 // stockout caps sales if short
```

### 7.7 Reputation
A 0–100 score that **moves toward a target** each tick. Target rises with good value-for-quality and good service (low queue loss), falls with stockouts and over-pricing. Reputation drives organic traffic and pricing power.

### 7.8 Finances
Per tick: `net = revenue − cogs − rent − wages − marketing − interest + propertyIncome`. Cash, debt (interest-bearing), and a weekly P&L. Negative cash auto-draws a loan up to a borrowing limit; beyond that → insolvency / run over.

---

## 8. Multi-city expansion

Four cities, gated by entry cost, each a **distinct market**:

| City | Entry | Affluence | Character |
|---|---|---|---|
| Bayside | Free | 1.00 | Starter metro |
| Capital City | mid | 1.18 | Dense, competitive |
| Gold Coast | high | 1.35 | Affluent, premium-friendly |
| Harbor Intl | very high | 1.55 | Global flagship tier |

Each city runs its **own consumer trend cycle** and **own property market**, so diversification is real: a downturn or unfavourable trend in one city doesn't sink the empire. Switching cities = loading that city's map (the player "travels").

---

## 9. Real estate (ties to a market the player understands)

Two layers:
1. **Own your premises.** Buy the building under any café to eliminate its rent permanently and ride the city's property index. Sells back at market value.
2. **Investment properties.** A catalogue per city (loft → retail unit → penthouse → city block) bought purely for **weekly yield + appreciation**. Pure capital allocation.

Each city has a **property index** doing a random walk weighted by that city's economy (boom → appreciation). Real estate value flows into net worth and can be a defensive store of value during downturns.

---

## 10. Markets — commodity & equity trading

A treasury desk for spare capital. Five tickers, each moving on the macro cycle + idiosyncratic noise:

| Ticker | Behaviour | Strategic role |
|---|---|---|
| Index 500 | Tracks macro cycle | Broad beta |
| Gold | Rises in downturns | Defensive hedge |
| Crude Oil | Cyclical, volatile | Risk-on play |
| **Coffee Futures** | **Tracks the Bean Index** | **Hedge your own input costs** |
| Rival Chain | Falls as your reputation rises | Thematic short-equivalent |

The Coffee Futures link is the elegant bit: as your bean costs rise, a long futures position offsets the squeeze — a real, legible hedge that teaches a real idea. Positions are valued each tick into net worth with cost-basis P&L.

---

## 11. Capital markets — the IPO endgame

Once the player clears a valuation + reputation gate, they can **take CREMA public**:
- Choose a **float %** (10–49%); raise ≈ floatPct × valuation (minus fees); keep the rest as **founder stake**.
- Post-IPO, the score becomes a live **market cap = valuation × market sentiment**.
- **Sentiment** is a designed (non-AI) mechanic: it drifts toward a target driven by your **profit-growth trend** — beat your own trajectory and sentiment (and share price) rise; miss and the market marks you down.
- Levers: **secondary raise** (issue shares for cash, dilutive) and **buyback** (retire shares, lift ownership %, small sentiment boost).

`valuation = max(assetFloor, annualisedProfit × PE) × sentiment`

This converts the late game from "open more stores" into a capital-allocation and market-cap-maximisation game — the depth Coffee Inc 2 reaches and the prototype lacked.

---

## 12. Dynamic market & events (procedural, no AI)

All "adaptiveness" is designed systems — **no LLM/AI calls anywhere.**

- **Macro cycle:** Boom / Stable / Downturn, with probabilistic transitions, scaling all spending.
- **Consumer trends:** 6 trends (Cold-Brew Surge, Premiumization, Value-Seeking, Third-Wave Craft, Comfort Indulgence, Balanced) rotate per city every 5–11 ticks, reshaping which products/strategies win.
- **Bean commodity index:** random walk + macro drift + shock events.
- **Competitive pressure:** drifts up as you grow, eases occasionally; rivals can open near you.
- **Event system:** a weighted, condition-gated event table (frost spikes bean prices, a reviewer boosts awareness, a festival lifts traffic, a property boom appreciates real estate). Each event = a headline + a deterministic mechanical effect, surfaced in a **news ticker** built from templated strings tied to live game state. Designed, data-driven, fully offline.

---

## 13. Progression & objectives

A **rolling objective ladder** (reach $X net worth, enter a 2nd city, own $500K property, build a $250K portfolio, IPO, reach $25M market cap, … up to a multi-million empire). Completing one grants a cash reward and rolls the next — this is the primary anti-repetition mechanism: there's always a fresh, specific target dangling.

Soft win: a target market cap / personal fortune. Fail: insolvency.

---

## 14. Technical architecture (the engineering blueprint)

The structural fix for "it feels like a dashboard": **the Simulation is a pure, deterministic C# layer with no Unity dependency; the Presentation layer renders and animates it.**

```
┌──────────────────────────────────────────────────────────┐
│ PRESENTATION (MonoBehaviours, URP, UI Toolkit)            │
│  CameraController · WorldRenderer · BuildingController     │
│  AgentSystem (pedestrians) · HUD · ContextDrawers         │
│  ▲ reads state / subscribes to events                     │
├──┼───────────────────────────────────────────────────────┤
│  │  EVENT BUS  (sim → view notifications)                 │
├──┼───────────────────────────────────────────────────────┤
│ SIMULATION (pure C#, deterministic, unit-testable)        │
│  TimeManager (tick/speed/pause)                           │
│  EconomySystem · DemandSystem · SupplySystem              │
│  StaffSystem · MarketingSystem · ReputationSystem         │
│  MarketsSystem · RealEstateSystem · CapitalMarketsSystem  │
│  EventSystem · ObjectiveSystem                            │
│  ▲ operates on ──►  GAME STATE (serializable structs)     │
├──────────────────────────────────────────────────────────┤
│ DATA (ScriptableObjects — designer-editable)              │
│  ProductDef · BeanGradeDef · CityDef · DistrictDef        │
│  LotDef · BuildingTierDef · UpgradeDef · EventDef ·        │
│  TrendDef · TickerDef · PropertyDef                       │
├──────────────────────────────────────────────────────────┤
│ PERSISTENCE: SaveSystem → JSON @ persistentDataPath (vN)  │
└──────────────────────────────────────────────────────────┘
```

**Key decisions**
- **Engine:** Unity 6 LTS, URP (mobile-tuned).
- **Determinism:** the sim is fixed-step and seedable, so it's testable and reproducible (and saves are reliable). Rendering interpolates between ticks for smoothness.
- **Data-driven:** all content is ScriptableObjects — designers tune the whole game in the editor without touching code; scales to hundreds of items.
- **Decoupling:** an event bus / observer pattern; the view never mutates sim state directly. This is precisely what prevents the "everything is a panel bound to state" dashboard feel.
- **World:** GridManager + LotManager for placement; BuildingController swaps tier prefabs; AgentSystem uses pooled, waypoint/NavMesh-lite pedestrians with a hard concurrency cap.
- **Dependencies (minimal):** DOTween (free) for UI/world tweening; TextMeshPro + UI Toolkit (built-in) for HUD/drawers; Synty POLYGON for art; no paid plugins required for v1.
- **No networking, no backend, no AI services** in v1 — fully offline. (Cloud save / analytics are post-launch options.)

---

## 15. UI / UX & art direction

### 15.1 UX principle
Management lives in **context drawers**: tap a café → a sheet slides up with that store's controls (staff, tier, fit-out, local stats). Global policies (menu pricing, beans, marketing, training) live in a slim bottom **command bar**. The HUD shows only cash, net worth / market cap, reputation, date, and speed controls. **No wall of panels on screen at rest** — the city is the screen.

### 15.2 Art direction
- **World:** stylised low-poly 3D (Synty POLYGON City/Town), warm daytime palette, optional day/night cycle, soft shadows. Bright, inviting, premium — a city you *want* to look at.
- **UI skin:** refined dark "espresso + gold" overlay for drawers/HUD to keep the premium, founder-grade feel against the bright world.
- **Typography:** a characterful display face + clean UI face + tabular mono for figures (finance legibility).
- **Audio:** ambient city + café foley, light jazz, satisfying UI ticks; restrained.

### 15.3 Asset plan (per the art decision)
- **Prototype:** Kenney.nl CC0 assets — free, commercial-OK — to validate the loop at zero cost.
- **Production:** Synty POLYGON City Pack (~$20–50) + City Characters (pedestrians) + Town Pack as needed. Cohesive, App-Store-grade, used in shipped titles.

---

## 16. Monetization

| Model | Fit | Verdict |
|---|---|---|
| **Premium (one-time purchase)** | Matches the genre (Coffee Inc 2 is paid) and a premium brand; no predatory loops | **Recommended for v1** |
| Free + cosmetic DLC | Optional later (façade packs, city themes) | Post-launch upside |
| Free + IAP/ads | High revenue ceiling but erodes the calm, premium feel | Avoid |

Recommendation: **ship premium**, keep the experience clean, and consider cosmetic DLC (city skins, brand-styling packs) post-launch. Store commission is 30%, dropping to 15% under each store's small-business tier (<$1M/yr).

---

## 17. Development roadmap

| Phase | Scope | Goal |
|---|---|---|
| **0 — Architecture** | Sim/Presentation split, ScriptableObject schema, TimeManager, SaveSystem skeleton | Foundation that won't need rewriting |
| **1 — Vertical slice (3–4 wks)** | One city, grid + tap-to-build, 1–2 café tiers, core demand/finance tick, real-time pause/speed, Kenney placeholder art, pedestrians | **Is it fun?** Ship nothing until yes. |
| **2 — Core game (5–8 wks)** | Full menu/beans/staff/marketing/reputation, building tier upgrades, Synty art swap, events & trends, objectives, save | A complete single-city game |
| **3 — Meta systems (3–5 wks)** | Multi-city, real estate, markets, IPO/capital markets | The depth & endgame |
| **4 — Ship (4–6 wks)** | Tutorial, balancing pass, perf/device testing, store assets, Play 12-tester track, App Store submission | Live on stores + WebGL demo |

**Scope discipline:** Phase 1 must be ruthlessly small. The meta systems (Markets, IPO) are designed now but can slip to a **v1.1** if needed to hit a ship date — the vertical slice and single-city core are the must-haves.

---

## 18. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Scope creep (the genre's killer) | Phased plan; meta systems are cut-able to v1.1; vertical-slice gate before committing. |
| Pedestrian perf on mobile | Agents are *representation*, capped & pooled; sim demand is independent of agent count. |
| Solo execution bandwidth | I architect + write systems/specs; a Unity contractor executes editor/art/polish fast. |
| Unity licensing eligibility | Ship under a separate game entity; confirm Personal eligibility ($200K total finances incl. funding) in writing. |
| Balancing feels off | Deterministic sim → automated balance tests; tuning lives in ScriptableObjects for fast iteration. |
| Art integration time | Synty packs are modular & demo-scene-ready; prototype on free Kenney first. |

---

## 19. Out of scope (v1)

Multiplayer; online leaderboards; live-ops/seasonal content; user-generated content; hostile takeovers / M&A of rivals; bond/credit markets; employee equity; procedural city generation; console ports. All are post-launch candidates, noted so they don't creep into v1.

---

## 20. Immediate next deliverable

With this spec locked, the next build step is **Phase 0 code**: the Unity project architecture scaffold plus the pure-C# **Simulation layer** — `TimeManager`, the game-state structs, the ScriptableObject definitions, and the `EconomySystem`/`DemandSystem` core — as real files dropped into a Unity 6 project. Because the Simulation layer is engine-independent C#, it's the highest-value, lowest-risk thing to produce first and can be unit-tested before any art exists.

*End of document.*
