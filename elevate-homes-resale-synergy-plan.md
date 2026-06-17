# Elevate Homes — Resale-First Revenue Architecture

**Last updated: 17 Jun 2026** · merged from the Codex resale-funnel handoff into the
`preview-better-ui` product track (PRISM hybrid engine, `/sell`, `/brokers`, `/crm`, `/report`).

This is the locked operating model. It exists so the product, the funnels, and any
investor narrative all point at the **same** primary business — and so ancillary
ideas don't get promoted to the headline before the core is proven.

---

## 1. The locked revenue decision

**Main revenue stream — resale brokerage GCI from PRISM-led seller mandates.**

Elevate Homes is a Dubai resale brokerage whose edge is PRISM: a DLD-backed pricing
engine that wins listing mandates by pricing with evidence instead of opinion. The
money is the standard brokerage commission (GCI) on closed resale transactions —
earned first on the **sell side** (the mandate), and on the **buy side** where we
also represent the buyer.

Everything else is **ancillary** — real, but sequenced *after* resale mandates are
repeatably converting:

| Ancillary stream | What it is | When |
|---|---|---|
| Buyer-side representation | Represent buyers using the same deal-check evidence | Now, alongside mandates |
| Off-plan / developer referrals | Referral fees on curated off-plan | Now, opportunistic |
| Paid PRISM pricing-proof reports | Branded report as a paid product | After report demand is shown |
| Broker matching network | Vetted broker signups + matched leads (`/brokers`) | Phase 2 |
| PRISM SaaS / dashboard | License the engine to other brokerages | After internal proof |
| Website-as-a-service | Productised site for brokerages | Opportunistic |

**Rule:** do not convert an ancillary stream into the headline business before resale
mandates are proven in 3–5 areas.

---

## 2. How the product surfaces map to the model

| Surface | Role in the model |
|---|---|
| `/sell` (+ `#sell` on home) | **Primary conversion path** — seller valuation → mandate acquisition. Captures a seller lead with its valuation snapshot. |
| `/#deal-check` | Buyer trust + **buyer-representation** funnel. Verdict + comparables. |
| `/report` | The pricing-proof artifact (gated by lead capture). Becomes the **paid report** product later. |
| `/brokers` | **Phase-2 network** — vetted broker/brokerage signup for matched leads + future SaaS. |
| `/crm` | Internal lead pipeline: New → Qualified → Valuation Sent → Consultation → **Mandate** → Listed → **Closed**. Where mandates are tracked and converted. |
| PRISM engine (`prism-hybrid-v1`) | The shared edge under all of the above. |

Every public funnel writes to one unified lead store (`POST /api/leads`) so the
agent works the whole pipeline in `/crm`.

---

## 3. Natural progression (do these in order)

1. Full DLD engine (canonical cache via `scripts/build-canonical-cache.py`).
2. Seller valuation funnel (`/sell`).
3. Buyer deal-check funnel (`/#deal-check`).
4. CRM-ready lead tracking (`/crm`).
5. Manual mandate conversion.
6. Repeatable mandates in 3–5 areas.
7. Vetted broker signup (`/brokers`).
8. Manual matching across the network.
9. Paid pricing-proof reports.
10. SaaS / dashboard — only after internal proof.

---

## 4. PRISM engine note (prism-hybrid-v1)

The deal-check and seller funnels run on `hybridValuation()`:

- Comparable selection via the documented 6-step fallback ladder (unchanged; never
  falls back to the whole national dataset for an unknown area).
- **Log-size adjustment** (elasticity `0.2733`) brings each comp's AED/sqft toward the
  subject size.
- **Recency** (180-day half-life) and **size-proximity** weighting.
- **Same-project boost** for exact-project comps.
- Diagnostics returned: `effective_comps`, `dispersion_pct`, `size_adjustment`.

`GET /api/engine` reports `prism-hybrid-v1` and the active coefficients.

> Methodology is still being refined. PRISM is the live instrument that keeps
> re-testing the dissertation's hypothesis on current DLD data — not a wrapper around
> fixed historical numbers. Keep that framing in any client- or investor-facing copy.

---

## 5. Data upgrade path

The preview runs on a cached DLD extract. The full DLD file is converted to a slim
canonical cache with `prism-valuation-web-mvp/scripts/build-canonical-cache.py` — a
separate data step, not mixed with UI work. See that script's header for usage.
