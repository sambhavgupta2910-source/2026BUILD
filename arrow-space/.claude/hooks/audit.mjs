#!/usr/bin/env node
/**
 * PostToolUse audit log. Appends one line per mutating tool call to
 * .claude/audit.log (git-ignored). Never blocks — always exits 0.
 */
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";

try {
  const payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
  const logPath = join(root, ".claude", "audit.log");
  mkdirSync(dirname(logPath), { recursive: true });

  const tool = payload.tool_name ?? "?";
  const input = payload.tool_input ?? {};
  const detail = input.file_path ?? input.command ?? "";
  const line = `${new Date().toISOString()}\t${tool}\t${String(detail).slice(0, 200)}\n`;
  appendFileSync(logPath, line, "utf8");
} catch {
  // auditing must never break the workflow
}
process.exit(0);
