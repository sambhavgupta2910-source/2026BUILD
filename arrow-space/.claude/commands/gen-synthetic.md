---
description: Regenerate the synthetic dataset (optionally with a seed) and verify it validates against the schema.
argument-hint: "[--seed <n>]  (default seed 42)"
allowed-tools: Bash, Read, Task
---

Regenerate the Arrow Space synthetic dataset and confirm it is valid and labelled.

Arguments (optional): $ARGUMENTS

Steps:
1. Run the generator:
   - default: `pnpm gen:synthetic`
   - with a seed: `pnpm --filter @arrow-space/data gen $ARGUMENTS`
2. Run `pnpm typecheck` and `pnpm test` — both must be green.
3. Confirm `data/synthetic/MANIFEST.json` still carries the "SYNTHETIC — NOT REAL" provenance and the
   record counts look sane.
4. Report the counts and any change versus the previous dataset. Keep the diff reviewable.

For anything beyond a plain regenerate (new entity, changed distributions), hand off to the
`synthetic-data` subagent so the schema-first order and realism docs stay in sync.
