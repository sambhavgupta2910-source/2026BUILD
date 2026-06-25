# @arrow-space/portal — gated customer portal (Phase 3)

Next.js 15 (App Router) + Tailwind v4. Per-customer fleet, inventory, order history, and **one-click
reorder**. Runs on the committed **synthetic** dataset (clearly labelled). Deploy target: Vercel.

## Run

```bash
pnpm --filter @arrow-space/portal dev    # http://localhost:3000
pnpm gen:synthetic                       # ensure data/synthetic/ exists first
pnpm typecheck && pnpm test              # from the repo root
```

## What it does
- **Sign in** (`/login`) — pick a portal-enabled synthetic account. A cookie holds the
  `customer_id`. This is **demo auth** for synthetic data, not production auth; real SSO swaps into
  `src/lib/server/session.ts` later. Pages are gated by `src/middleware.ts`.
- **Overview** (`/`) — fleet / inventory / order counts + recent orders.
- **My fleet** (`/fleet`) — the customer's `Aircraft`.
- **My inventory** (`/inventory`) — `CustomerInventory` joined to parts, the fitting aircraft, and
  the `TraceDoc`s that exist for the source order. Each line has a **Reorder** button.
- **Orders** (`/orders`, `/orders/[id]`) — history + the trace pack per order. Historical pricing
  only — never a current quote.

## Reorder → inquiry (the load-bearing flow)
`src/lib/reorder.ts` `buildReorderRfq()` turns a reorder into a **schema-valid `RFQ` with
`channel = "portal"`** and `status = "new"`, applies the export-control rule, and `POST /api/reorder`
drops it into the **same operator intake queue** as the web forms (`data/synthetic/intake/`).

It is an **inquiry, not an order**:
- no price is shown or committed — the margin floor + human approval still gate any quote downstream;
- "push to vendors" stays human — the platform routes/drafts to the operator; it never wires into
  OEM/Textron/David Clark authorized ordering channels;
- traceability is **surfaced, not invented** — only `TraceDoc`s that exist are shown.

Reuses the real shared rule (`exportControlRequired`) from `@arrow-space/schema`; a later
`packages/intake` can consolidate the web + portal RFQ builders.

## Deploy
Same as `apps/web`: Vercel Root Directory `arrow-space/apps/portal` (or `apps/portal` when promoted);
`next.config.ts` traces the synthetic dataset for the server routes. The intake queue is runtime
state (git-ignored); a real datastore replaces it later, on the same schema.
