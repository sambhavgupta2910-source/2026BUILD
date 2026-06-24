#!/usr/bin/env node
/**
 * PreToolUse guard. Blocks (exit 2) two classes of edit:
 *   1. silent hand-edits to committed synthetic data (regenerate instead),
 *   2. writing secrets into the repo (.env files, or content with key material).
 *
 * Set ALLOW_SYNTHETIC_EDIT=1 to intentionally override (1). Reads the hook
 * payload as JSON on stdin; exit 0 allows, exit 2 denies with a reason.
 */
import { readFileSync } from "node:fs";

function deny(reason) {
  process.stderr.write(reason + "\n");
  process.exit(2);
}

let payload = {};
try {
  payload = JSON.parse(readFileSync(0, "utf8") || "{}");
} catch {
  process.exit(0); // never block on a parse failure
}

const input = payload.tool_input ?? {};
const filePath = String(input.file_path ?? "");

// Collect any content this call would write.
const contentParts = [];
if (typeof input.content === "string") contentParts.push(input.content);
if (typeof input.new_string === "string") contentParts.push(input.new_string);
if (Array.isArray(input.edits)) {
  for (const e of input.edits) if (typeof e?.new_string === "string") contentParts.push(e.new_string);
}
const content = contentParts.join("\n");

// (1) committed synthetic data is generated, not hand-edited
if (/(^|\/)data\/synthetic\//.test(filePath) && process.env.ALLOW_SYNTHETIC_EDIT !== "1") {
  deny(
    `Refusing to hand-edit committed synthetic data (${filePath}). ` +
      `Regenerate with \`pnpm gen:synthetic\`. Set ALLOW_SYNTHETIC_EDIT=1 only if you truly mean to.`,
  );
}

// (2) secrets must not be written into the repo
const base = filePath.split("/").pop() ?? "";
if (/^\.env($|\.)/.test(base) && base !== ".env.example") {
  deny(`Refusing to write a secrets file (${base}). Use .env.example with placeholder values.`);
}

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /\bghp_[0-9A-Za-z]{36}\b/,
  /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/,
  /aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9/+]{30,}/i,
];
for (const re of SECRET_PATTERNS) {
  if (re.test(content)) {
    deny(`Refusing to write what looks like secret/key material into ${filePath || "the repo"}.`);
  }
}

process.exit(0);
