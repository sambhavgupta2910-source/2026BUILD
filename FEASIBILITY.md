# Elevate Homes — Feasibility Check

**Written from the operator's seat (3.5 yrs Dubai real estate). June 2026.**
Companion to the end-to-end deck (`/deck`) and `BUSINESS_MODEL.md`.

> Verdict up front: **GO — conditional.** The market is real, the product is already built,
> and the model is capital-light. The risk is concentrated in **execution** (mandate
> conversion + data access), not in market demand or technology. Don't scale spend until
> conversion is proven in 1–2 areas.

---

## 1. Feasibility scorecard

| Dimension | Rating | Why |
|---|---|---|
| **Market** | 🟢 High | Post-conflict shift to resale: ~AED 53B secondary volume in Q1 2026, ~65,000 units delivering through 2026 → motivated sellers who must price to sell. Demand is observed, not assumed. |
| **Technical** | 🟢 High | Working prototype: PRISM hybrid engine (66,413 DLD rows), seller/buyer funnels, CRM, branded reports. Zero-dependency Node, nightly refresh. Built solo with AI tooling. |
| **Financial** | 🟡 Med-High | Capital-light; brokerage GCI funds Year 1; breakeven ~Month 7 at ~1.5 deals/mo. Whole model hinges on CAC and mandate-conversion assumptions that are still unvalidated. |
| **Operational** | 🟡 Medium | Founder-led, commission-only agents, gated hiring. Real dependency on founder bandwidth and a 5-minute lead-response SLA. Agent churn is the industry's default failure mode. |
| **Regulatory** | 🟡 Medium | Needs a RERA brokerage licence + BRN. DLD data is open but redistribution/ToS must be respected. Known and navigable — not a blocker, but a cost and a timeline. |
| **Competitive** | 🟡 Med-High | No incumbent closes data→mandate→commission. Moat = the private mandate-comp set that compounds. Watch: a portal (Property Finder/Bayut) adding comparable transparency. |

---

## 2. The thesis in one paragraph

Dubai's resale market just became the main event, and it runs on opinion. Sellers overprice,
buyers can't verify, agents pitch without evidence. PRISM turns public DLD transactions into
**pricing proof** that wins **exclusive seller mandates** — the highest-value, lowest-competition
asset in brokerage. The brokerage earns commission today and funds the company; the same engine
is licensed as SaaS once the mandate data is proprietary. Every closed deal makes the engine
smarter and the moat deeper.

---

## 3. Key assumptions & sensitivities

| Assumption | Model value | Reality check / sensitivity |
|---|---|---|
| Avg GCI per resale deal | ~AED 120K (2% on ~AED 6M) | Many resale tickets are AED 1.5–3M → GCI AED 30–60K. **Blend down** for safety; doesn't break the model, just slows the ramp. |
| Submission → qualified lead | 37% | Optimistic for cold web traffic; 15–25% is safer. Mitigated by intent-heavy seller flow. |
| Consultation → mandate | 45% | Plausible **with the founder closing** and pricing proof in hand; unproven at agent scale. |
| Break-even | ~1.5 mandates/month, ~Month 7 | Robust — only one fixed salary (AED 20K/mo). Even at half the conversion, break-even slips, doesn't disappear. |
| LTV:CAC | 18.1× | Holds only if own-channel CAC stays low; portal-only CAC could cut this to 3–5×. |
| SaaS revenue | starts Y2 | Correctly **not** load-bearing in Y1. Upside, not survival. |

**The honest line for investors:** the conversion percentages are *working assumptions to validate
in Sprint 1*, not results. The model survives materially worse numbers because the cost base is tiny.

---

## 4. Risk register

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|:---:|:---:|---|
| R1 | Full DLD data access (Dubai Pulse approval) delayed | Med | Med | 66K cached extract works now; canonical builder ready for the 7.71 GB file; nightly refresh path live. Not a launch blocker. |
| R2 | Mandate conversion below model | Med | High | Founder closes first; **don't hire until proven**; exclusive 60–90 day mandates with repricing triggers; show comps, not opinion. |
| R3 | CAC inflation on Bayut/Property Finder | High | Med | Own-channel SEO + area pages + content + WhatsApp; NRI/diaspora targeting; the report itself is shareable marketing. |
| R4 | Brokerage shakeout (9,785 offices, 30%+ projected to close) | High | Med | Lean by design — one salary, commission-only agents, no leased-up cost base. We're built to be the survivor. |
| R5 | Incumbent copies comparable transparency | Med | Med | Speed + the mandate-comp flywheel + a consumer-trust-to-brokerage loop portals aren't structured to run. |
| R6 | Valuation accuracy / trust gap | Med | High | Show the comparable rows + confidence diagnostics; refine methodology live; never present projections or thesis numbers as settled fact. |
| R7 | Founder is single point of failure | Med | High | Document the playbook (mandate script, pricing review); gated hire of a coordinator early; AI-assisted ops. |
| R8 | Regulatory / data-redistribution challenge | Low-Med | Med | Operate under a RERA licence; treat DLD per its terms; present valuations as analytical opinion, not official AVM. |

---

## 5. Capital & milestone gating

Ask: **AED 630K seed, ~20% equity, released in 4 milestone tranches** — capital follows proof.

1. **Tranche 1 — Licence & launch:** RERA licence + BRN, office, full DLD pipeline, 3 seller campaigns live.
2. **Tranche 2 — First mandates:** ≥5 exclusive mandates + 1–2 closings in one area.
3. **Tranche 3 — Repeatability:** mandate flow repeatable across 3–5 areas; activate 1–2 commission agents.
4. **Tranche 4 — Scale + SaaS beta:** open PRISM SaaS to external brokers; layer buyer-side + referrals.

---

## 6. Kill criteria (intellectual honesty)

Stop, or pivot, if after a fair test:
- **< 1 mandate per ~AED 25K of mandate-acquisition spend** after Sprint 1–2 (CAC economics broken), or
- **Consultation → mandate < ~20%** with the founder closing (the core pitch doesn't convert), or
- **DLD data access is permanently foreclosed** with no commercial alternative (engine loses its edge).

If none of these trip, the path is: prove → repeat → hire → license.

---

## 7. Why this is fundable now

- **De-risked product:** the prototype exists and works — investors fund go-to-market, not a science project.
- **Capital efficiency:** brokerage GCI carries Year 1; the downside is bounded by a near-zero fixed base.
- **Timing:** the resale window is open *now* — motivated sellers, selective buyers, low noise.
- **Optionality:** brokerage cash + SaaS multiple = dual exit (sell the brokerage arm, or list PRISM at a SaaS multiple).

> Framing note: all forward financials are **modeled projections**; market figures are cited and
> directional; the dissertation's pricing findings are a hypothesis PRISM **re-tests on live DLD
> data**, never presented as settled fact.
