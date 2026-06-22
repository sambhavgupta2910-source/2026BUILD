# Arrow Space — Master Build Spec & Claude Code Implementation Guide

**Project:** Arrow Space — the institutional digital operations platform of Arrow Aviation Services Pvt. Ltd.
**Status:** Pre-build / Phase 0. Synthetic-data-first.
**Owner:** Principal (one-operator model).
**Last updated:** June 2026.

---

## 0. How to use this document

This is the single source of truth for the build. It consolidates the strategy, the target architecture, the workflow transition (what's added, removed, changed, kept), the Claude Code build system, and copy-paste starter files.

- Sections 1–4 are the **why and what**. Read once, refer back.
- Sections 5–6 are the **build system and data** — the part you implement.
- Section 7 is the **phased checklist** to work through.
- Section 9 is the **first Claude Code session**, literally.

Claude Code ships fast; verify exact file/config syntax against `https://docs.claude.com/en/docs/claude-code/overview` as you go. The structure and intent below are stable; minor key names may evolve.

---

## 1. Strategic foundation

### The thesis (the call)
Don't build a website with AI bolted on. Build a **private operator OS** — a set of agents that sit *on top of* Arrow's existing workflow — with **Claude Code as the factory** that builds and runs it, on **synthetic data now** behind a schema that swaps to real data later. Embed an intelligence layer over every node so one operator runs at the Satair / AJW institutional bar. Lead with the trust spine; augment the operation, don't replace it.

**Core reframe:** the gap is operator-fit into a working, traditional Indian distribution flow — not software. Sequence everything as *instrument → shadow → augment → selectively automate*.

### What Arrow actually is (the moat)
- Founded 2001. HQ Kolkata; offices Delhi, Mumbai; wholly-owned Sharjah (UAE) FZE subsidiary.
- Authorized distributor of **Hawker Beechcraft (a Textron brand)** spare parts since **2008**.
- **Sole David Clark** aviation-headset distributor in India since **2005**.
- **DGCA-approved propeller overhaul workshop** in Kolkata.
- Focus: **Defense, Government, Airlines, Business & GA, Helicopter operators, MROs** — fixed and rotor wing.
- Services: 24/7 AOG, repairs, overhaul & exchange, logistics, quality documentation.

That authorization lineage + defense access + corridor footprint is the competitive moat. Institutional buyers buy the pedigree.

### The gap (institutional-first)
The capability is real; the digital presence and workflow undersell it. The current site reads retail (headset store, payment-card icons) to buyers who qualify suppliers on authorizations, traceability, and AOG discipline. The internal flow lives in inboxes, WhatsApp, and Excel, with no memory and no audit trail.

### Positioning & ICP (priority order)
1. **Defense & Government** — tender-driven, relationship-gated, export-control-heavy; hardest moat to copy.
2. **Airlines & Operators** — recurring AOG + consumables; reward speed and trust.
3. **MRO / Part-145** — need accredited, traceable suppliers contractually.
4. **Business & GA / flying schools** — self-serve long tail (the original retail tilt, demoted from the headline).

This **inverts** the earlier plan that led with flying schools. Institutional-first = defense and airlines lead; GA is the tail the same platform monetizes at near-zero marginal effort.

### Brand decision
"Arrow Space" is the **digital platform layer of Arrow Aviation Services**, openly connected ("Arrow Space — the digital operations platform of Arrow Aviation Services"). This **formally retires the earlier white-label / "hide Arrow Aviation" decision** — the lineage is the sell.

---

## 2. The fronts to dominate

"Kill it on multiple fronts" = a portfolio of agents, each with a weapon and a number.

| Front | Weapon | KPI to move |
|---|---|---|
| Institutional presence | Authorization-led site + gated portal | Vendor-list qualification rate |
| RFQ velocity | AI triage + drafted quotes | RFQ → quote time (target: minutes) |
| AOG | Always-on desk + SLA + audit trail | AOG response time, win rate |
| Compliance / traceability | Auto trace-pack + AS9120-aligned records | % shipments with full traceability |
| Export-control (defense) | End-use / ITAR-EAR classification workflow | Cleared defense quotes, cycle time |
| Sourcing intelligence | Supplier-path matcher + USM cross-ref | Fill rate, sourcing time |
| Tender capture | Scheduled GeM/defense/airline scout | Relevant tenders surfaced → bids |
| Demand gen | LinkedIn/SEO content from AD/SB + market intel | Inbound qualified RFQs |
| Margin / BI | Win-loss + margin dashboards | Gross margin, quote→order conversion |

---

## 3. Target architecture (2026)

### Tool roles
- **Claude Code** — the factory. Builds the site, portal, operator console, data layer, and synthetic generators, **and** runs always-on headless agents (one-shot CLI → cron / GitHub Actions).
- **Cowork** — hands-off knowledge work (research, tender drafting, multi-step analysis).
- **Claude API / Agent SDK** — in-product intelligence behind live RFQ triage and quoting.

### Connected MCPs → stack mapping
Map almost one-to-one to tools already connected:

| MCP | Role in the stack |
|---|---|
| Gmail | RFQ intake |
| Google Drive | Catalog + traceability vault + synthetic data store |
| Notion | AI Brain — system of record, CRM, session memory |
| Vercel | Deploy site / portal / console |
| Coupler.io | Data pipelines → BI dashboards |
| Gamma | Capability / tender decks |
| Canva | Brand & marketing assets |
| **+ WhatsApp Business API** | Intake, AOG, status push (to add) |
| **+ Tally / ERP connector** | Read-only accounting/GST sync for BI (to add) |

### Model routing
| Model | Use | API string |
|---|---|---|
| Haiku 4.5 | High-volume classification — ATA tagging, intake routing, dedupe | `claude-haiku-4-5-20251001` |
| Sonnet 4.6 | Workhorse — RFQ triage, quote drafting, trace-pack assembly, content | `claude-sonnet-4-6` |
| Opus 4.8 | High-stakes/low-volume — tender analysis, pricing strategy, complex sourcing | `claude-opus-4-8` |

---

## 4. Workflow transition

### Before → after
| Area | Today | After the build |
|---|---|---|
| Front door | Headset-store-first brochure | Authorization-led institutional site + portal |
| RFQ | Email/WhatsApp/phone, unstructured | Structured object, multi-channel → one queue |
| Quote | Manual Excel, inconsistent margins | AI-drafted within margin floor, human approves |
| Traceability | Ad-hoc PDFs rebuilt each deal | Auto-assembled trace pack + searchable vault |
| Defense/export | Handled informally | Explicit end-use / export-control workflow |
| Sourcing | Tribal, re-done each time | AI matcher + persistent supplier-path memory |
| AOG | Phone heroics, no record | Always-on desk, SLA timers, audit trail |
| Back office | Reactive, manual | Scheduled agents: tenders, AD/SB, inventory, follow-ups |
| Memory | Scattered across inboxes and heads | Notion AI Brain = single system of record |
| Demand | Word of mouth | Content engine (LinkedIn/SEO) + inbound capture |

### REMOVED / RETIRED
| Retired | Why | Replaced by |
|---|---|---|
| Manual Excel quoting as system-of-record | Slow, inconsistent, no memory | Quote engine |
| Unstructured / `mailto:` RFQ intake | Lossy, unsearchable | Structured intake pipeline |
| Headset-store-first homepage + payment-card signals | Reads retail | Institutional front door (store → self-serve tail) |
| White-label positioning | Throws away the moat | Brand-forward lineage |
| Per-deal traceability PDFs from scratch | Error-prone, no audit | Templated trace packs + vault |
| Sourcing as the *only* tribal method | Key-person risk | AI-assisted sourcing with memory |
| Phone-only AOG with no SLA/audit | No accountability | Instrumented AOG desk (phone still answered) |
| Re-keying email → Excel → Tally → courier | Wasted hours, errors | Integrated flow via MCP |
| Knowledge in heads/inboxes | Key-person risk | Notion AI Brain |

### ADDED (net-new)
| Added | What it does | Phase |
|---|---|---|
| Structured RFQ intake | Normalizes email/WhatsApp/form into one queue | 1 |
| AI RFQ triage | P/N extraction, ATA classification, AOG + export flags | 2 |
| AI quote drafting | Supplier-path match + margin-floor pricing draft | 2 |
| Trace-pack assembly + doc vault | 8130-3 / EASA Form 1 / CoC / ATA106 per shipment | 3 |
| Export-control workflow | End-use statements + ITAR/EAR classification | 3 |
| AS9120-aligned records | Audit trail on every transaction | 3 |
| Gated customer portal | Order tracking, quote history, docs, inventory | 3 |
| AOG desk with SLA | Timers, escalation, status push | 4 |
| Tender scout | Scheduled GeM/defense/airline scan + bid checklist | 4 |
| AD/SB watch | Demand signal + content trigger | 4 |
| Inventory/consignment recon | Reorder + lead-time-tail flags | 4 |
| CRM follow-up automation | Stale-quote nudges, win/loss logging | 4 |
| BI dashboards | Margin, fill rate, AOG response, conversion | 4 |
| Content engine | LinkedIn/SEO in founder voice | 5 |
| Synthetic data + swap mechanism | Real-shaped data now, clean migration later | 0 |
| Session logging to AI Brain | Every working session captured | 0 |

### CHANGED (kept, transformed — human stays in charge)
- **Sourcing** — relationships and broker calls stay; AI matcher + persistent history sits behind them.
- **Pricing** — your judgment stays authoritative; you start from a drafted quote + margin floor, not a blank cell.
- **Accounting/GST (Tally)** — stays the books; read-only synced so BI sees margin without re-keying.
- **Logistics** — forwarders stay; tracking captured and pushed to the portal.
- **Customer comms** — email/WhatsApp stay; normalized, logged, AI-assisted.

### KEPT AS-IS (deliberately not touched)
- OEM / Textron / Hawker Beechcraft / David Clark authorized ordering channels.
- Tally for statutory accounting and GST.
- WhatsApp and phone as human channels.
- Propeller overhaul workshop operations.
- Human negotiation, relationship management, final compliance signature.
- The team's core roles — augmented, never eliminated.

### Migration discipline (every retirement runs this)
1. **Shadow** — AI runs alongside; old workflow stays in control.
2. **Augment** — AI drafts, human approves; old workflow is the fallback.
3. **Automate** — only low-judgment, un-loved parts flip fully; pricing and compliance stay human forever.

Cutover is **criteria-based, not calendar-based** (e.g., quote engine flips shadow→augment only once drafts match manual quotes on margin within tolerance over a run of deals). Structured intake captures **real** RFQs from Phase 1, so real data accrues even while the engine trains on synthetic; then swap table-by-table on the same schema/IDs. Rollback is free throughout.

---

## 5. Claude Code build system

Five layers: **CLAUDE.md** (always-loaded rules) · **MCP servers** (external tools/data) · **skills** (reusable workflows) · **hooks** (deterministic safety/automation) · **subagents** (isolated context + tool permissions). Keep it small enough that every piece justifies its existence.

Install: `npm install -g @anthropic-ai/claude-code`. Runs in CLI, VS Code, JetBrains, desktop app, web (`claude.ai/code`), and iOS.

### 5.1 Repo structure (monorepo)
```
arrow-ops/
├── CLAUDE.md                 # always-loaded project memory
├── .mcp.json                 # scoped MCP servers
├── .claude/
│   ├── settings.json         # hooks + permissions
│   ├── agents/               # subagent definitions (*.md)
│   ├── commands/             # slash commands (*.md)
│   └── skills/               # aviation skills
├── apps/
│   ├── web/                  # institutional site (Next.js)
│   ├── portal/               # gated customer portal
│   └── console/              # internal operator console
├── packages/
│   ├── schema/               # the data contract (shared types)
│   ├── data/                 # synthetic generator + datasets
│   ├── intake/               # email/WhatsApp/form parsers
│   ├── engine/               # rfq-triage + quote-builder
│   ├── compliance/           # trace-pack + export-control
│   └── bi/                   # dashboards + pipelines
└── data/synthetic/           # generated datasets (schema = contract)
```

### 5.2 CLAUDE.md (drop-in skeleton)
```markdown
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
- US-origin parts to defense end-users → export-control workflow REQUIRED (end-use statement,
  ITAR/EAR classification). AI assists the paperwork; the human signs off. Never bypass controls.
- Synthetic data ONLY until real RFQ history exists. NEVER present synthetic data as real or quote
  a customer from it.
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
```

### 5.3 Subagent roster
Each subagent has its own context window, prompt, and tool permissions. The main agent owns planning and integration.

| Subagent | Job | Model | Cadence |
|---|---|---|---|
| `rfq-triage` | Parse RFQ → P/N, qty, condition, fleet, urgency; ATA classify; AOG + export-control flags | Haiku/Sonnet | On intake |
| `quote-builder` | Match supplier path, pull margin history, draft quote within floor | Sonnet | On demand |
| `compliance-clerk` | Trace pack + AS9120 record + end-use workflow + SUP screen | Sonnet | Per order |
| `tender-scout` | Scan GeM/defense/airline tenders, match capability, draft bid checklist | Opus | Nightly |
| `ad-sb-watch` | Monitor ADs/Service Bulletins for in-scope fleets | Sonnet | Scheduled |
| `inventory-recon` | Reconcile stock/consignment, flag reorder + lead-time tails | Sonnet | Scheduled |
| `crm-followup` | Stale-quote nudges, win/loss logging | Sonnet | Scheduled |
| `synthetic-data` | Generate/refresh synthetic datasets to schema | Sonnet | On demand |
| `content-engine` | Draft LinkedIn/SEO in founder voice from AD/SB + market intel | Sonnet | On demand |

**Example: `.claude/agents/rfq-triage.md`**
```markdown
---
name: rfq-triage
description: Parses an inbound RFQ (raw email/WhatsApp/form text) into a structured RFQ object. Classifies ATA chapter, detects AOG urgency, and flags export-control sensitivity. Use whenever a new RFQ arrives.
tools: Read, Write
model: haiku
---
You are the RFQ triage agent for Arrow Aviation Services.

Given raw RFQ text, output a structured RFQ object matching packages/schema (RFQ type):
- Extract: part number(s), quantity, condition required (NEW/OH/SV/AR), aircraft/fleet, customer, requested-by date.
- Classify the ATA chapter for each line.
- Set urgency: AOG / critical / routine. Treat "AOG", "grounded", "aircraft on ground", tail-number + time pressure as AOG.
- Flag export_control_review = true if any part is US-origin AND the end-user is defense/government.
- Never invent part numbers. If a field is missing, mark it null and add to `clarifications_needed`.

Output valid JSON only. Do not quote a price. Do not contact the customer.
```

### 5.4 Slash commands
Daily verbs. Commands are prompt templates in `.claude/commands/*.md`; `$ARGUMENTS` injects input.

| Command | Does |
|---|---|
| `/brief` | Pull Notion AI Brain context to start a session |
| `/new-rfq` | Raw RFQ blob → triage → quote skeleton |
| `/build-quote <id>` | Full quote with docs from a triaged RFQ |
| `/trace-pack <order>` | Assemble traceability pack for an order |
| `/tender-scan` | Run tender-scout now |
| `/gen-synthetic <dataset> <n>` | Regenerate a synthetic dataset |
| `/log-session` | Write a session summary back to Notion |

**Example: `.claude/commands/new-rfq.md`**
```markdown
---
description: Ingest a raw RFQ and produce a structured triage object plus a draft quote skeleton.
---
A new RFQ has come in. Here it is:

$ARGUMENTS

Steps:
1. Delegate to the rfq-triage subagent to produce the structured RFQ object.
2. If urgency is AOG, say so loudly at the top and start the AOG fast-path checklist.
3. Delegate to quote-builder for a DRAFT quote skeleton (supplier path + indicative pricing within margin floor) — clearly labelled DRAFT, for human approval.
4. Save the RFQ object to data/ and summarise what needs my decision (price, sourcing path, clarifications).
Do not send anything to the customer.
```

### 5.5 Hooks
Deterministic guardrails — they run code, so they can't hallucinate. Configure in `.claude/settings.json`.

- **PreToolUse** — block secrets/keys from leaving the repo; block silent edits to `data/synthetic/` without an explicit flag.
- **PostToolUse** — run typecheck/tests before the agent stops; append every tool call to an audit log (institutional discipline).
- **pre-commit** (git) — run the test suite.

**Example: `.claude/settings.json`**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "bash .claude/hooks/block-secrets.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          { "type": "command", "command": "npm run -s typecheck && echo \"$(date -u) tool-use\" >> .claude/audit.log" }
        ]
      }
    ]
  }
}
```
*(Verify the exact hooks schema against current docs — the matcher/event names are stable in spirit but Claude Code iterates.)*

### 5.6 MCP servers
Add your connectors to Claude Code. Remote connectors use a URL transport; add with:
```
claude mcp add notion --transport http <notion-mcp-url>
claude mcp add gmail  --transport http <gmail-mcp-url>
claude mcp add gdrive --transport http <drive-mcp-url>
# repeat for vercel, coupler.io, gamma, canva
```
Keep `.mcp.json` scoped to only the servers a given task needs. Add WhatsApp Business API and a Tally/ERP connector when those workflows come online (Phases 1 and 4).

### 5.7 Package as a plugin
Bundle the whole thing — skills + subagents + slash commands + hooks + MCP definitions — as a versioned `arrow-ops` plugin installable with one `/plugin` command. Benefits: reproducible setup, reinstallable across machines, and a latent product if you ever license the ops stack to other regional distributors.

---

## 6. Synthetic data workstream

No real quote history → synthetic data is the foundation, and **the schema is the contract**. Generate realistic *distributions*, not random noise, so the engine and dashboards are honest dry-runs and real data drops in with zero refactor.

### Datasets (and the realism that matters)
| Dataset | Realism |
|---|---|
| Fleet / aircraft | Beechcraft/Hawker + corridor GA/rotary mix |
| Parts catalog | OEM P/N, ATA chapter, condition codes, lead-time tiers, cross-compatibility |
| Supplier paths | Authorized line vs David Clark vs GSE alliances vs USM brokers, with cost/lead-time |
| RFQ history | ATA-frequency weighting, AOG seasonality, urgency mix |
| Quotes / margin | Margin bands by part class, win/loss rates, quote→order conversion |
| Traceability docs | Mock 8130-3 / EASA Form 1 / CoC / ATA106 templates |
| AOG events | Time-critical distribution, response-time targets |

### Schema sketch (the contract — refine in `packages/schema`)
```json
{
  "Part": {
    "id": "string",
    "oem_part_number": "string",
    "manufacturer": "string",
    "ata_chapter": "number",
    "ata_subchapter": "string",
    "description": "string",
    "applicable_aircraft": ["string"],
    "conditions_available": ["NEW","OH","SV","AR"],
    "lead_time_tier": "stock|24h|48-72h|quote",
    "us_origin": "boolean"
  },
  "SupplierPath": {
    "id": "string",
    "part_id": "string",
    "source_type": "authorized|david_clark|gse_alliance|usm_broker",
    "unit_cost": "number",
    "currency": "string",
    "lead_time_days": "number"
  },
  "RFQ": {
    "id": "string",
    "received_at": "datetime",
    "channel": "email|whatsapp|form|phone",
    "customer_id": "string",
    "end_user_type": "defense|govt|airline|operator|mro|ga",
    "lines": [{ "part_number": "string", "qty": "number", "condition": "string", "ata_chapter": "number" }],
    "urgency": "aog|critical|routine",
    "export_control_review": "boolean",
    "clarifications_needed": ["string"],
    "status": "new|triaged|quoted|won|lost"
  },
  "Quote": {
    "id": "string",
    "rfq_id": "string",
    "lines": [{ "part_id": "string", "supplier_path_id": "string", "unit_price": "number", "margin_pct": "number" }],
    "total": "number",
    "margin_floor_ok": "boolean",
    "approved_by_human": "boolean",
    "outcome": "pending|won|lost",
    "lost_reason": "string|null"
  },
  "TraceDoc": {
    "id": "string", "order_id": "string",
    "type": "8130-3|easa_form_1|coc|ata106",
    "issued_by": "string", "file_ref": "string"
  },
  "AogEvent": {
    "id": "string", "rfq_id": "string",
    "opened_at": "datetime", "responded_at": "datetime|null",
    "sla_minutes": "number", "resolved": "boolean"
  }
}
```

### Swap path
Same schema, same IDs. When real RFQs and quotes exist, replace synthetic tables one at a time; the engine, portal, and dashboards keep working throughout.

---

## 7. Phased roadmap (work-through checklist)

### Phase 0 — Foundation (Week 0–1)
- [ ] `npm install -g @anthropic-ai/claude-code`
- [ ] Create `arrow-ops` repo + `git init`
- [ ] Add CLAUDE.md (Section 5.2)
- [ ] Wire MCP connectors (Notion, Gmail, Drive, Vercel, Coupler.io, Gamma, Canva)
- [ ] Create subagent + slash command + hook files
- [ ] Define `packages/schema` (the contract)
- [ ] Build `synthetic-data` generator + dataset v1
- [ ] Scaffold `arrow-ops` plugin
- **Exit:** agents can read context; synthetic data is queryable.

### Phase 1 — Front door + capture (Week 1–3)
- [ ] Institutional site: hero (authorizations), Authorizations & Quality spine, capabilities, markets (defense-first), AOG desk page
- [ ] Strip retail signals (headset-first nav, payment-card icons → demote store to self-serve)
- [ ] Structured RFQ + AOG intake forms
- [ ] Gmail + WhatsApp intake parsers → one queue
- [ ] Deploy to Vercel
- **Exit:** credible site live; RFQs land structured; real RFQ capture begins.

### Phase 2 — Operator OS core (Week 3–6)
- [ ] `rfq-triage` running on intake
- [ ] `quote-builder` drafting on synthetic data
- [ ] Operator console (queue, triage view, draft-quote approval)
- **Exit:** raw RFQ → drafted quote in minutes (shadow mode).

### Phase 3 — Trust + portal (Week 6–9)
- [ ] `compliance-clerk` + trace-pack assembly + doc vault
- [ ] Export-control / end-use workflow
- [ ] AS9120-aligned records
- [ ] Gated customer portal (orders, quotes, docs, inventory)
- **Exit:** every order has a trace pack; portal shows orders + docs.

### Phase 4 — Always-on back office (Week 9–12)
- [ ] Scheduled `tender-scout`, `ad-sb-watch`, `inventory-recon`, `crm-followup` (headless cron / GitHub Actions)
- [ ] Coupler.io pipelines → BI dashboards (margin, fill rate, AOG response, conversion)
- [ ] AOG desk SLA timers + escalation
- **Exit:** nightly digests running; dashboards live.

### Phase 5 — Demand + real data (Week 12+)
- [ ] `content-engine` for LinkedIn/SEO
- [ ] Swap synthetic → real, table-by-table
- **Exit:** inbound qualified RFQs; live data flowing through the engine.

---

## 8. Risks & guardrails

| Risk | Guardrail |
|---|---|
| Agents acting without review | Hooks (tests before stop, secret-blocking), plan-first, human approval on price + compliance |
| Synthetic data presented as real | Hard rule + labeling; never quote a customer off synthetic |
| Export-control misstep (defense/US-origin) | Mandatory flag + human sign-off; AI assists paperwork, never bypasses controls |
| Over-automation alienating the team | Shadow-first rollout; measure adoption; humans stay on judgment |
| Wrong P/N / data quality | QA pass, cross-reference, condition codes, human approves sourcing |
| Single-operator key-person risk | Everything in the repo + Notion; reinstallable `arrow-ops` plugin |

---

## 9. First Claude Code session (literally)

```bash
# 1. Install + new repo
npm install -g @anthropic-ai/claude-code
mkdir arrow-ops && cd arrow-ops && git init

# 2. Launch and initialize
claude
> /init                      # let Claude Code generate a baseline, then replace CLAUDE.md with Section 5.2

# 3. Connect tools (paste your connector URLs)
> /mcp                        # confirm what's connected
#   or: claude mcp add notion --transport http <url>   (repeat per connector)

# 4. Create the operator scaffolding
#    Add .claude/agents/*.md, .claude/commands/*.md, .claude/settings.json from Sections 5.3–5.5
```

Then give Claude Code this first build prompt:

> "Read CLAUDE.md. Plan, then scaffold the `arrow-ops` monorepo per the agreed structure: `packages/schema` (the data contract from the spec), `packages/data` with a synthetic-data generator that emits realistic distributions for Part, SupplierPath, RFQ, Quote, TraceDoc, and AogEvent, and a `data/synthetic/` dataset v1 (~150 parts across the corridor fleet, ~300 RFQs with AOG seasonality, matching quotes with margin bands and win/loss). Wire the `synthetic-data` and `rfq-triage` subagents. Show me the plan before building, and keep the diff reviewable."

Review the plan, approve, and you're building.

---

## 10. Open inputs / decisions

- **Quote records:** none active → synthetic-first confirmed.
- **AS9120 / ASA listing:** confirm status — in place (present the credential) or a gap to close (stage it). This grounds the compliance module.
- **Brand:** Arrow Space = the digital platform layer *of* Arrow Aviation Services (brand-forward, lineage as moat). Confirmed.
- **To add later:** WhatsApp Business API access; Tally/ERP read-only connector; margin-floor values by part class (your numbers, kept private).

---

*End of spec. Log this and each working session back to the Notion AI Brain (Aviation Business page) to keep memory current across ChatGPT / Perplexity / Claude / Claude Code.*
