# Operator layer (`.claude/`)

The agent layer that sits **on top of** Arrow's existing workflow — it instruments and assists, it
does not replace the human's pricing or compliance authority. Per BUILD_PLAN.md §5.

## Subagents (`agents/`)
- **`rfq-triage`** — raw enquiry → structured `RFQ` against the schema. Classifies ATA, flags AOG +
  export-control, lists clarifications. Never invents part numbers; never quotes a price.
- **`synthetic-data`** — (re)generates the synthetic dataset, schema-first, keeping it deterministic,
  labelled, and realistic.

## Slash commands (`commands/`)
- **`/new-rfq <blob>`** — triage an enquiry, then a clearly-labelled **DRAFT** quote skeleton that
  requires human approval. No prices proposed, nothing sent.
- **`/gen-synthetic [--seed n]`** — regenerate the dataset and verify it validates.

## Hooks (`settings.json` → `hooks/`)
- **PreToolUse `guard.mjs`** — blocks hand-edits to `data/synthetic/` (regenerate instead; override
  with `ALLOW_SYNTHETIC_EDIT=1`) and blocks writing secrets / `.env` files into the repo.
- **PostToolUse `audit.mjs`** — appends an audit line to `.claude/audit.log` (git-ignored).
- **Stop `verify.mjs`** — runs `pnpm typecheck` + `pnpm test` before finishing **when TypeScript
  changed** (doc-only stops are skipped; `ARROW_SKIP_VERIFY=1` to skip).

These encode the non-negotiables as guardrails, not just prose.

## Activation note
Claude Code loads project settings from `<projectRoot>/.claude/settings.json`. These hooks therefore
activate when **`arrow-space/` is the project root** — i.e. once this subproject is promoted to its
own repo (BUILD_PLAN §10), or when you run Claude Code from inside `arrow-space/`. While `arrow-space`
lives inside the parent `2026BUILD` repo, the files are correct and ready but inert at the parent
root. The hook commands use `$CLAUDE_PROJECT_DIR` so they resolve correctly wherever the root is.

## MCP (`../.mcp.json`)
Scoped MCP servers are added per environment. The **Notion AI Brain is the system of record** — log
decisions and session summaries there (Aviation Business page). GitHub and Vercel are the other
expected servers. Add them to `.mcp.json` with the appropriate transport + auth for your environment;
the registry ships empty so nothing half-configured is committed.
