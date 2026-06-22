// File-based JSON store for captured leads, quote drafts, and uploads.
// Persists under DATA_DIR (default ./data) so a Node host with a persistent
// disk keeps the operator queue across restarts. No external dependencies.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isValidStatus, ValidationError } from "./schema.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(moduleDir);

export function resolveDataDir() {
  return process.env.DATA_DIR
    ? process.env.DATA_DIR
    : join(packageRoot, "data");
}

function intakeDir() {
  return join(resolveDataDir(), "intake");
}

function uploadsDir() {
  return join(resolveDataDir(), "uploads");
}

function ensureDirs() {
  mkdirSync(intakeDir(), { recursive: true });
  mkdirSync(uploadsDir(), { recursive: true });
}

function leadPath(id) {
  // Guard against path traversal from caller-supplied ids.
  if (!/^[A-Za-z0-9_-]+$/.test(id)) {
    throw new ValidationError("Invalid lead id");
  }
  return join(intakeDir(), `${id}.json`);
}

export function saveLead(lead) {
  ensureDirs();
  writeFileSync(leadPath(lead.id), JSON.stringify(lead, null, 2));
  return lead;
}

export function getLead(id) {
  try {
    return JSON.parse(readFileSync(leadPath(id), "utf8"));
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    return null;
  }
}

export function listLeads() {
  ensureDirs();
  return readdirSync(intakeDir())
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(intakeDir(), name), "utf8"));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (b.receivedAt || "").localeCompare(a.receivedAt || ""));
}

export function updateLeadStatus(id, status, by = "operator") {
  if (!isValidStatus(status)) {
    throw new ValidationError(`Invalid status: ${status}`, { status: "invalid" });
  }
  const lead = getLead(id);
  if (!lead) return null;
  lead.status = status;
  lead.statusHistory = [
    ...(lead.statusHistory || []),
    { status, at: new Date().toISOString(), by }
  ];
  return saveLead(lead);
}

// Attach a human-reviewed draft quote to a lead. The quote arrives already
// evaluated against the margin floor (see schema.evaluateQuote); this only
// persists it and moves the lead into "quoting".
export function attachQuote(id, quote) {
  const lead = getLead(id);
  if (!lead) return null;
  const stored = {
    id: `Q-${(lead.quotes?.length || 0) + 1}-${lead.id}`,
    createdAt: new Date().toISOString(),
    ...quote
  };
  lead.quotes = [...(lead.quotes || []), stored];
  if (lead.status === "new" || lead.status === "triaged") {
    lead.status = "quoting";
    lead.statusHistory = [
      ...(lead.statusHistory || []),
      { status: "quoting", at: stored.createdAt, by: "operator" }
    ];
  }
  saveLead(lead);
  return { lead, quote: stored };
}

export function replaceQuote(id, quoteId, nextQuote) {
  const lead = getLead(id);
  if (!lead) return null;
  const index = (lead.quotes || []).findIndex((q) => q.id === quoteId);
  if (index === -1) return null;
  lead.quotes[index] = { ...lead.quotes[index], ...nextQuote };
  saveLead(lead);
  return { lead, quote: lead.quotes[index] };
}

export function saveUpload(id, filename, base64) {
  ensureDirs();
  const safeName = String(filename || "upload.bin").replace(/[^A-Za-z0-9._-]/g, "_");
  const storedAs = `${id}__${safeName}`;
  const buffer = Buffer.from(String(base64 || ""), "base64");
  writeFileSync(join(uploadsDir(), storedAs), buffer);
  return { filename: safeName, storedAs, bytes: buffer.length };
}
