# Arrow Space — Product Spec & Build Plan (v0.1)

> Status: **Draft for review.** This is the starting spec, not a commitment.
> Reference products: **Satair** (Airbus spares e-commerce / distribution portal)
> and **Textron Aviation** customer portal (parts ordering, service, technical
> publications for owners/operators).

---

## 1. What Arrow Space is

A **browser-based B2B portal for aerospace parts and aftermarket services**.
Customers (airlines, MROs, operators, brokers) log in from a computer to find
parts, see their pricing and availability, request quotes, place orders, and
track everything through delivery and certification. **Nothing is installed** —
it is a standard web application reached at a URL.

The closest mental models:

| Reference | What we borrow from it |
|-----------|------------------------|
| **Satair** | Parts catalog + real-time stock/price, RFQ, AOG flow, order & shipment tracking, airworthiness documents (8130-3 / EASA Form 1), exchange/repair/loan. |
| **Textron Aviation portal** | Clean account-centric dashboard, technical publications/library, service requests, fleet/account context. |

We are **parts-and-service-first**, like Satair, with a Textron-style account
dashboard around it.

---

## 2. Who uses it (personas)

- **Buyer / Procurement** (airline, MRO, operator) — searches, quotes, orders.
- **AOG desk** — Aircraft-On-Ground urgent ordering, time-critical, 24/7.
- **Customer Account Admin** — manages users, ship-to addresses, approvals,
  sees company-wide order history and spend.
- **Arrow Space internal CSR / Sales** (later phase) — responds to quotes,
  manages catalog and pricing, handles exceptions.

---

## 3. Core capabilities

### Must-have (MVP)
1. **Catalog & search** — search by part number, keyword, manufacturer, ATA
   chapter, and aircraft type. Show alternates / supersessions / cross-refs.
2. **Part detail** — specs, condition (NEW/OH/SV/AR), certifications offered,
   lead time, manufacturer, images, related parts.
3. **Availability & pricing** — stock by warehouse and customer-specific
   (contract) pricing; clear lead times and minimum order qty.
4. **Request a Quote (RFQ)** — for unlisted parts, bulk, or negotiated pricing;
   quote converts to an order.
5. **Accounts & auth** — company accounts with multiple users and roles; B2B
   invite-based onboarding (not open self-signup by default).

### Phase 2
6. **Cart & checkout** — PO number upload, ship-to selection, Incoterms,
   priority (Routine / AOG), payment terms.
7. **Order management** — order history, live status, shipment tracking,
   backorders.
8. **Documents** — download invoices, packing slips, and airworthiness /
   material certificates per shipment.

### Phase 3+
9. **AOG fast lane** — dedicated urgent flow with expedited handling + SLAs.
10. **Exchange / repair / loan** — core returns (RMA), repair orders, rotable
    loans/leases.
11. **Technical library** — service bulletins, manuals, publications (Textron-style).
12. **Admin & integrations** — internal catalog/pricing admin, ERP/inventory
    sync, enterprise SSO, approval workflows.

---

## 4. Recommended approach (my suggestion)

You asked for the best approach for a browser-only, no-install B2B portal.
Recommendation, optimized for shipping fast and growing into an enterprise
portal:

| Layer | Recommendation | Why |
|-------|----------------|-----|
| **App framework** | **Next.js (App Router) + TypeScript + React** | One codebase for UI + server logic, great for auth-gated dashboards and catalog pages, strong hiring/AI support. |
| **UI** | **Tailwind CSS + shadcn/ui** | Clean, enterprise-grade components fast; easy to brand. |
| **Database** | **PostgreSQL** (managed: Neon or Supabase) | Parts, orders, accounts, pricing are relational; Postgres scales and is boring-reliable. |
| **Data access** | **Prisma ORM** | Type-safe models, fast iteration, migrations. |
| **Auth & orgs** | **Auth.js (NextAuth)** with role-based access now; **WorkOS/Clerk** when enterprise SSO is needed | B2B needs orgs + roles, not just user login. |
| **Catalog search** | Postgres full-text to start → **Meilisearch/Typesense** at scale | Avoid premature search infra; upgrade when catalog is large. |
| **Hosting** | **Vercel** (app) + managed Postgres | Zero-ops deploys; we already have Vercel tooling in this workspace. |

**Why not alternatives:** a separate SPA + standalone API doubles the surface
area with no early benefit; a no-code portal builder won't handle aviation
pricing/cert logic; native/mobile is unnecessary since access is computer-only.

This keeps Arrow Space in the JavaScript/TypeScript ecosystem already present
in this repo, and lets us start with **seeded/mock parts data** before wiring up
any real inventory system.

---

## 5. Data model (first sketch)

- **Organization** — a customer company (has users, ship-to addresses, terms).
- **User** — belongs to an Organization; has a Role (admin / buyer / viewer).
- **Part** — part number, description, manufacturer, ATA chapter, aircraft
  applicability, condition options, certifications available.
- **PartAlternate** — supersessions / cross-references between parts.
- **InventoryItem** — part × warehouse × condition → qty, lead time.
- **PriceList / ContractPrice** — Organization-specific pricing for a Part.
- **Quote** → **QuoteLine** — RFQ and responses.
- **Order** → **OrderLine** — orders, status, priority (routine/AOG).
- **Shipment** → **Document** — tracking + certificates/invoices.

---

## 6. Page / route map (MVP)

```
/                      Marketing / login entry
/login                 Auth
/dashboard             Account overview (orders, quotes, AOG shortcut)
/catalog               Search + filters
/catalog/[partNumber]  Part detail (specs, availability, price, cert, RFQ)
/quotes                RFQ list + status
/quotes/[id]           Quote detail / accept → order
/orders                Order history (Phase 2)
/orders/[id]           Order + shipment tracking (Phase 2)
/account               Org settings, users, addresses (admin)
```

---

## 7. Non-functional requirements

- **Security & access** — B2B, role-based; customers see only their own org's
  pricing, orders, and documents. Audit trail on orders/quotes.
- **Compliance** — support airworthiness documentation (FAA 8130-3 / EASA
  Form 1) and material certs as first-class downloadable artifacts.
- **Performance** — catalog search results < 1s on seed data.
- **Branding** — themeable; "Arrow Space" identity (logo/colors) TBD.

---

## 8. Build roadmap

- **Phase 0 — Foundation (next step):** scaffold Next.js + TS + Tailwind,
  Postgres + Prisma schema, auth shell, seed parts data, design system.
- **Phase 1 — MVP:** catalog search, part detail, RFQ, accounts/roles.
- **Phase 2:** cart, checkout, orders, shipment tracking, documents.
- **Phase 3:** AOG fast lane, exchange/repair/loan (RMA).
- **Phase 4:** internal admin, ERP/inventory integration, SSO, approvals.

---

## 9. Open questions (need your input before/while building)

1. **Whose parts?** Are we the **distributor/reseller** (Satair model, many
   manufacturers) or the **OEM** selling our own parts (Textron model)? This
   shapes catalog, pricing, and certs.
2. **Real inventory or greenfield?** Is there an existing ERP/inventory/pricing
   system to integrate, or do we start with mock/seed data?
3. **Regions & certs** — FAA, EASA, both? Drives required documentation.
4. **Onboarding** — invite-only B2B accounts (recommended) vs open self-signup?
5. **Branding** — do you have a logo, colors, and the confirmed name
   "Arrow Space"?
6. **Scope of v1 demo** — is the immediate goal a clickable demo/prototype to
   show stakeholders, or a path to production?

---

*Once you confirm the approach (Section 4) and answer the open questions, the
next step is Phase 0: scaffold the app.*
