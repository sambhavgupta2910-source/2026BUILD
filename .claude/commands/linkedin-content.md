# LinkedIn Content Writing Skill (Sambhav Content Engine v2)

Write and publish LinkedIn content using the Sambhav Content Engine v2 — topic to live post in 3-5 minutes.

## Quick commands

### Write + publish (full pipeline)
```bash
node sambhav-content-engine/sambhav-content-engine-v2.js "Your topic here"
```

### Write + preview only (no publish)
```bash
node sambhav-content-engine/sambhav-content-engine-v2.js "Your topic here" --dry-run
```

### Post without image (faster, no DALL-E cost)
```bash
node sambhav-content-engine/sambhav-content-engine-v2.js "Your topic here" --no-image
```

## What the engine does automatically

1. **Detects pillar** — real estate, trading, founder, aviation, or AI
2. **Generates 20 hashtags** — 10 pillar-specific + 10 universal
3. **Creates DALL-E image** — branded per pillar
4. **Writes post in your voice** — founder-tone, data-backed, no AI language
5. **Runs voice check** — flags and auto-rewrites banned words
6. **Shows preview** — you approve before anything goes live
7. **Posts to LinkedIn via Publora** — image + caption + hashtags atomically
8. **Logs to Notion AI Brain** — full audit trail

## First-time setup (15 min)

```bash
cd sambhav-content-engine
cp .env.template .env
# Fill in your 4 keys in .env (Anthropic, OpenAI, Publora, Notion)
npm install
node sambhav-content-engine-v2.js "test" --dry-run
```

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

## When the user gives you a topic

Run the engine directly:

```bash
node sambhav-content-engine/sambhav-content-engine-v2.js "[topic they gave you]"
```

If they want to review before publishing, add `--dry-run`.
If they say "post it" or "publish", run without flags and confirm with Y at the prompt.
