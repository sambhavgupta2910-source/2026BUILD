# @arrow-space/portal

**Phase 3 — the gated customer portal.** Per-customer accounts where a customer lists their
**aircraft** (fleet) and sees **inventory bought from Arrow**, then **reorders** in one click. A
reorder is just an `RFQ` with `channel = portal` into the same queue — **inquiry, not auto-order**:
no price shown, margin floor + human approval still gate the quote, and vendor dispatch stays human
via existing channels. See BUILD_PLAN.md §6.5, tasks 11–14.

Placeholder until Phase 3. No scripts yet, so Turborepo skips it.
