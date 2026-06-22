# Arrow Ops — Project Memory

## What this is
Arrow Space: the institutional digital operations platform of Arrow Aviation Services Pvt. Ltd.
Arrow is an authorized Hawker Beechcraft / Textron parts distributor (since 2008), sole David Clark
India distributor (since 2005), with a DGCA-approved propeller overhaul workshop. Serves defense,
government, airlines, business/GA, helicopter operators, and MROs. Footprint: Kolkata HQ, Delhi,
Mumbai, Sharjah FZE (UAE).

## Strategy (settled)
- Institutional-first, brand-forward. NOT white-label.
- Priority buyers: Defense/Govt > Airlines/Operators > MRO/145 > Business/GA (self-serve tail).
- The moat is the authorization lineage + defense access + compliance competence. Lead with it.

## Non-negotiables
- Margin floor enforced on every quote. The human approves price — never auto-send pricing.
- Every part ships with traceability: FAA 8130-3 / EASA Form 1 / CoC / ATA Spec 106.
- US-origin parts to defense/government end-users → export-control workflow REQUIRED (end-use
  statement, ITAR/EAR classification). AI assists the paperwork; the human signs off. Never bypass
  controls.
- Synthetic data ONLY until real RFQ history exists. NEVER present synthetic data as real or quote
  a customer from it. Synthetic datasets are clearly labelled.
- Keep diffs reviewable. Plan before large changes.

## System of record
- Notion AI Brain is the source of truth. Log decisions and session summaries back to it.
- Aviation Business page is the home for this project.

## Conventions
- Monorepo (see structure). Shared types live in packages/schema — it is the data contract.
- TypeScript. Tests before "done". Conventional commits.

## Do not touch
- OEM/Textron/David Clark authorized ordering channels. Tally (accounting/GST). The propeller
  workshop. WhatsApp/phone as human channels. Human negotiation + final compliance signature.
