# @arrow-space/console — internal operator console (Task 14)

Next.js 15 (App Router) + Tailwind v4. Where the human works the queue: triage, draft a quote within
the margin floor, **approve the price**, and hand sourcing to vendors. Runs on the committed
**synthetic** dataset plus the live intake queue.

## Run

```bash
pnpm --filter @arrow-space/console dev    # http://localhost:3000
pnpm gen:synthetic                        # ensure data/synthetic/ exists first
pnpm typecheck && pnpm test               # from the repo root
```

## What it does
- **RFQ queue** (`/`) — one view across **every channel** (email / whatsapp / form / phone / portal),
  merging the synthetic RFQs with the live intake queue (web forms + portal reorders). Sorted AOG →
  critical → recent; export-control items flagged.
- **RFQ detail** (`/rfq/[id]`):
  - export-control banner when flagged; clarifications; requested lines resolved to the catalogue;
  - **Draft quote** via `@arrow-space/engine` (`buildDraftQuote`): cheapest supplier path per line +
    the suggested (placeholder) class margin → unit prices + total + `margin_floor_ok`. Labelled
    **DRAFT — not sent**;
  - **Price approval (human)** — `canQuoteBeSent` gates sending: a quote may go out only when it
    clears the margin floor AND a human approves. Sub-floor drafts can't be approved for send.
    `POST /api/quote/approve` records the approval (runtime store);
  - **Vendor sourcing handoff** — drafted sourcing requests to route to vendors. The platform drafts
    and routes; the **human dispatches** via authorized channels (no wiring into OEM / Textron /
    David Clark ordering).

## Non-negotiables, enforced
- Pricing here is always a DRAFT; nothing auto-approves or auto-sends (`approved_by_human` starts
  false; `canQuoteBeSent` gates).
- Margin floor is computed and shown honestly; a sub-floor quote cannot be approved for send.
- Export-control flag surfaced for human sign-off; never bypassed.
- Synthetic data only, clearly labelled. Real data swaps in on the same schema.

## Deploy
Same as the other apps: Vercel Root Directory `arrow-space/apps/console`; `next.config.ts` traces the
synthetic dataset + intake queue. Approvals are runtime state (git-ignored); a real datastore
replaces it later, on the same schema.
