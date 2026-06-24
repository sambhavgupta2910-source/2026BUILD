---
description: Turn a raw enquiry blob into a structured RFQ, then a clearly-labelled DRAFT quote skeleton that REQUIRES human approval before anything leaves.
argument-hint: <paste raw enquiry text, or a path to it>
allowed-tools: Read, Grep, Glob, Task
---

A raw customer enquiry follows. Process it in two stages and stop for the human.

Raw enquiry:
$ARGUMENTS

## Stage 1 — Triage (structure only)
Use the `rfq-triage` subagent to parse the enquiry into a structured `RFQ` object that validates
against `@arrow-space/schema`. It must: classify ATA chapters, set `urgency` (AOG/critical/routine),
set `export_control_review` per the rule, and list every `clarifications_needed`. It must NOT invent
part numbers and must NOT quote a price.

## Stage 2 — DRAFT quote skeleton (no pricing decisions)
From the triaged RFQ, produce a **DRAFT** quote skeleton matching `QuoteSchema`:
- one line per RFQ line with `part_id` / `supplier_path_id` left blank or marked `TBD` where not yet
  resolved — do not fabricate IDs;
- `unit_price` and `margin_pct` left empty for the human to set (do not propose numbers);
- `margin_floor_ok: false`, `approved_by_human: false`, `outcome: "pending"`.

Label the output clearly as **"DRAFT — NOT A QUOTE. Pricing and release require human approval."**

## Stop here
Do not compute prices, do not mark anything approved, do not send anything. Present:
1. the structured RFQ,
2. the DRAFT skeleton,
3. a short checklist of what the human must decide (P/N resolution, supplier path, pricing,
   export-control sign-off if flagged).
