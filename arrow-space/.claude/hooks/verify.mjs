#!/usr/bin/env node
/**
 * Stop hook: typecheck + tests before finishing, when TypeScript changed.
 *
 * Runs only if there are uncommitted changes to tracked source (*.ts/*.tsx) in
 * the project — so doc-only stops aren't taxed. On failure, exit 2 to keep the
 * session going with the error surfaced to Claude. Any internal error or a
 * missing toolchain exits 0 (never trap the user). Set ARROW_SKIP_VERIFY=1 to
 * skip entirely; an internal guard prevents re-entrant loops.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

if (process.env.ARROW_SKIP_VERIFY === "1") process.exit(0);

// Avoid loops: the Stop hook can fire repeatedly; only act once per stop chain.
try {
  const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  if (payload.stop_hook_active === true) process.exit(0);
} catch {
  /* fall through */
}

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "pipe", encoding: "utf8" });

try {
  const changed = run("git status --porcelain -- '*.ts' '*.tsx'").trim();
  if (!changed) process.exit(0); // no source changes → nothing to verify
} catch {
  process.exit(0); // not a git repo / git unavailable → don't block
}

try {
  run("pnpm -s typecheck");
  run("pnpm -s test");
} catch (err) {
  const out = `${err.stdout ?? ""}\n${err.stderr ?? ""}`.trim();
  process.stderr.write(
    "Verification failed before stop (typecheck/test). Fix before finishing:\n" + out.slice(-4000) + "\n",
  );
  process.exit(2);
}

process.exit(0);
