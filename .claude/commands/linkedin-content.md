# LinkedIn Content Writing Skill (Sambhav Content Engine v2)

Draft-and-approve LinkedIn content pipeline. Every post is reviewed in Notion before it goes live — nothing posts without your approval.

## How it works

```
GitHub Actions (Mon/Wed/Fri 9am Dubai)
   → generates 3 topic ideas across your pillars
   → writes + voice-checks each post
   → saves each as a draft in Notion "Content Calendar — Drafts & Approvals"
        (Status = "Pending Review")

You (in Notion)
   → review each draft: post text, hashtags, image prompt, pillar
   → set Status = "Approved" to publish, or "Rejected" to discard

GitHub Actions (daily 10am Dubai)
   → finds all "Approved" drafts
   → generates DALL-E image, publishes to LinkedIn via Publora
   → sets Status = "Published" + stores the live URL
```

Notion Content Calendar: https://app.notion.com/p/5321ad2cc0b1418c86816e56532e5d33

## Manual commands

```bash
cd sambhav-content-engine

# See topic ideas without creating drafts
node sambhav-content-engine-v2.js ideas 5

# Create a draft for one specific topic (lands in Notion as Pending Review)
node sambhav-content-engine-v2.js draft "Why Dubai cap rates shifted in Q2 2026"

# Generate N ideas + create a draft for each
node sambhav-content-engine-v2.js generate 3

# Publish everything currently marked "Approved" in Notion
node sambhav-content-engine-v2.js publish-approved

# Legacy: write + publish a single post immediately (bypasses the draft queue)
node sambhav-content-engine-v2.js post "Your topic" [--dry-run] [--no-image]
```

## First-time setup (15 min)

```bash
cd sambhav-content-engine
cp .env.template .env
# Fill in: ANTHROPIC_API_KEY, OPENAI_API_KEY, PUBLORA_TOKEN, NOTION_TOKEN
npm install
node sambhav-content-engine-v2.js generate 1   # creates 1 test draft in Notion
```

For the scheduled GitHub Actions to run, add these as **repo secrets** (Settings → Secrets and variables → Actions):
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `PUBLORA_TOKEN`
- `NOTION_TOKEN`
- `NOTION_CONTENT_CALENDAR_DB_ID` (already filled in `.env.template`: `5321ad2cc0b1418c86816e56532e5d33`)

Workflows: `.github/workflows/content-generate-drafts.yml` and `.github/workflows/content-publish-approved.yml`

## Pillar keyword triggers

| Pillar | Keywords |
|--------|----------|
| real-estate | property, dubai, cap rate, developer, HNWI, yield, DLD, RERA |
| trading | gold, oil, Fed, macro, inflation, equities, commodity |
| founder | founder, lesson, team, sales, negotiation, build, startup |
| aviation | aircraft, MRO, spare parts, engine, propeller, hangar |
| ai | AI, Claude, automation, workflow, Notion, content engine |

## Voice profile summary

Write like a serious investor-founder: Naval Ravikant's leverage thinking + Benjamin Graham's market discipline + Ryan Serhant's sales clarity + Dubai market expertise.

**Banned:** leverage, synergy, paradigm, delve, game-changer, disruptive, transformative, holistic, seamlessly, excited to share, humbled, let that sink in.

**Required:** Specific data. Short paragraphs. Strong hook (no "I" opener). Clean close.

## When the user gives you a topic in chat

Run:
```bash
node sambhav-content-engine/sambhav-content-engine-v2.js draft "[topic they gave you]"
```
This creates a draft in Notion for review — it will NOT post automatically. If the user explicitly says "post it now" / "publish immediately", use the `post` command instead and confirm with Y at the prompt.
