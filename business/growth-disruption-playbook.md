# Elevate Homes / PRISM — Growth & Disruption Playbook

**Sits on top of, does not replace, `elevate-homes-resale-synergy-plan.md` and
`FEASIBILITY.md`.** The business model is already locked: resale brokerage GCI
on PRISM-led seller mandates is the core revenue, everything else (SaaS,
reports, broker network) is ancillary and sequenced after. This document
answers a different question: **how does the brand get loud enough, fast
enough, to make that mandate funnel cheap to fill** — instead of grinding out
cold outreach against incumbents with bigger ad budgets.

---

## 1. Reframe the moat — it was never the code

The valuation engine (`prism-hybrid-v1`) is reproducible by any competitor
with DLD access and a few weeks of AI-assisted dev. Accept that; stop
defending it as the moat. `FEASIBILITY.md` already names the real one (R5):
*"Speed + the mandate-comp flywheel + a consumer-trust-to-brokerage loop
portals aren't structured to run."* Three things compound and don't reset
every time someone clones the UI:

1. **The mandate-comp data flywheel** — every closed deal adds a real,
   privately-held data point (asking price, final price, days-to-close,
   negotiation gap) that public DLD records don't capture. Competitors
   cloning the public engine start that flywheel at zero.
2. **Structural conflict of interest at the incumbents.** Property
   Finder / Bayut are paid by developers and agents to list — a public
   "your asking price is above the comparable" tool cannibalizes their own
   customers' revenue. Betterhomes/Allsopp/Provident profit from opinion-based
   pricing authority; a transparent public index undercuts the thing their
   senior agents are paid to project. **They can copy the feature. They can't
   adopt the incentive** without damaging their own business model. That gap
   is the actual multi-year moat, not the algorithm.
3. **Founder-as-brand.** You already proved this once — Fellow Sapiens went
   from a spite-launch to a marketing engine strong enough that the brand
   retained 95% of its following five years after the product stopped
   shipping. That's a transferable skill, not a one-off. PRISM's category
   position should be built the same way: a person with a provable, public
   receipt (the dissertation, the live tool) saying the thing the incumbents
   structurally can't say.

**Implication:** stop selling PRISM quietly as enterprise software to small
brokerages first. Sell the *disruption claim* loudly and publicly first; let
the brokerage SaaS pitch ride in on the attention it generates, exactly as
`brokerage-pitch.md` already positions it ("white-label license").

---

## 2. The disruption narrative (the spite version)

Same instinct that built Fellow Sapiens, pointed at this market:

> Big Dubai brokerages and the portals that feed them are charging trust
> premiums on opinions they refuse to back with the data they have access to.
> The data is public. We just published it.

This is a consumer-facing transparency story, not a B2B feature pitch. It
needs a villain (the opacity, not named individuals/firms — stay defensible),
a receipt (a real DLD-backed number), and a face (you, with the dissertation
as the credibility anchor already built in `business/brokerage-pitch.md`).

**Do not** name specific brokerages or portals as targets in public content —
that's a defamation/legal risk for no upside. Target the *practice*
("pricing by vibes," "asking prices with no comparable behind them"), not the
company.

---

## 3. The viral mechanic: a recurring, named public index

One-off posts fade. A **named, recurring** artifact is what gets cited,
shared, and eventually expected — that's how Zillow's Zestimate and Redfin's
market reports became reference points instead of one-time stunts.

- **Name it once, ship it every cycle.** Working name: *"The Elevate
  Mispricing Index"* (or similar — final name is a marketing call, your
  call, not mine). Same format every time: one area, one period, one number,
  one verdict.
- **Format:** "In [area], [X]% of active listings priced above the DLD
  comparable median this [week/month] — fair value is closer to [number]."
  Always sourced to DLD, always shows the comp band, never repeats the
  dissertation's old numbers as current fact (per the standing framing rule
  in `AGENTS.md`).
- **Cadence:** weekly is more viral, monthly is more defensible/accurate with
  current data volume. Recommend **monthly** until mandate volume is proven
  (matches `FEASIBILITY.md`'s "don't scale spend until conversion is proven"
  posture) — weekly risks publishing noise as signal on a still-small dataset.
- **Every index post links straight into `/deal-check` or `/sell`.** Virality
  isn't the goal, it's the CAC-reduction mechanism for the same funnel
  `FEASIBILITY.md` already flags as the biggest cost risk (R3: portal CAC
  inflation). A shared post that drives free organic traffic into the mandate
  funnel is strictly better than a media buy.
- **Distribution stack:** LinkedIn (your existing 4,100+ follower base, per
  `linkedin-content-plan.md`) → pickup bait for Gulf News / The National /
  Khaleej Times / ArabianBusiness property desks, who run "X% of Dubai
  listings overpriced" as a clean, citable headline. Pitch them the number
  directly, not the company.

---

## 4. What blocks this today (be honest about it)

- **The real DLD cache (66,413 rows, per `FEASIBILITY.md`) is not present in
  this environment** — only the synthetic 17-row/dev dataset is. The first
  index number must come from real data or it doesn't survive a journalist's
  second question. This needs the real `transactions-*.csv` (or the
  canonical cache via `scripts/build-canonical-cache.py`) pointed at via
  `TRANSACTIONS_CSV`, wherever Codex's run currently has it.
- **No index endpoint/page exists yet.** Needs a small, real build: a
  computation over `dataset` (already loaded in `server.js`) that produces
  the area-level "% above comparable median" stat, plus a simple public page
  to host it and a shareable image/card for the post itself.
- **Legal/brand-safety pass on language** — "mispricing," "overpriced," etc.
  should describe listings/practices, never named firms, to keep this a
  transparency story instead of a liability.

---

## 5. Execution order (next 2–4 weeks)

1. Get the real cache wired up here (or confirm which branch/environment
   already has it live) — without this, nothing below is publishable.
2. Build the index computation + a minimal public page (`/index` or similar)
   that renders one area/month at a time, sourced and dated.
3. Pick the first area + verify the number is real, defensible, and
   surprising enough to be worth a headline.
4. Ship as a LinkedIn long-form post (founder voice, ties to the dissertation
   credibility hook already drafted) + a one-line pitch email to 2-3 Dubai
   property desks with just the number and a link.
5. Every comment/DM/inbound lead from that post routes into the existing
   `/crm` pipeline — that's the GCI funnel doing its job.
6. Repeat monthly, new area each cycle, building a back-catalog that makes
   "the Index" a recognized, citable thing rather than a single stunt.

---

## 6. Division of labor

- **Mine:** the real number, the engine, the page/post infrastructure,
  keeping every public claim defensible and consistent with the framing
  rules already locked in `AGENTS.md`.
- **Yours:** the actual marketing/sales execution — which you've already
  proven you don't need help with. This playbook exists to make sure the
  thing you're about to market loudly is something that survives scrutiny
  the moment it gets attention.
