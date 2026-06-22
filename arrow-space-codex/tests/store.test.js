import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Point the store at a throwaway directory before exercising it.
const dataDir = mkdtempSync(join(tmpdir(), "arrowspace-store-"));
process.env.DATA_DIR = dataDir;

const { buildLead } = await import("../server/schema.js");
const { saveLead, getLead, listLeads, updateLeadStatus, attachQuote } = await import(
  "../server/store.js"
);

test.after(() => rmSync(dataDir, { recursive: true, force: true }));

test("saveLead / getLead / listLeads round-trip", () => {
  const lead = buildLead("rfq", { partNumber: "DC-ONE-X", email: "a@b.com" });
  saveLead(lead);

  const fetched = getLead(lead.id);
  assert.equal(fetched.id, lead.id);
  assert.equal(fetched.partNumber, "DC-ONE-X");

  const all = listLeads();
  assert.ok(all.some((l) => l.id === lead.id));
});

test("updateLeadStatus appends an audit entry and rejects bad statuses", () => {
  const lead = buildLead("rfq", { partNumber: "65-12388-19", email: "c@d.com" });
  saveLead(lead);

  const updated = updateLeadStatus(lead.id, "triaged", "tester");
  assert.equal(updated.status, "triaged");
  assert.equal(updated.statusHistory.at(-1).status, "triaged");
  assert.equal(updated.statusHistory.at(-1).by, "tester");

  assert.throws(() => updateLeadStatus(lead.id, "not-a-status"));
});

test("attachQuote stores the draft and moves the lead into quoting", () => {
  const lead = buildLead("rfq", { partNumber: "130-384045-1", email: "e@f.com" });
  saveLead(lead);

  const { lead: withQuote, quote } = attachQuote(lead.id, {
    total: 10000,
    costBasis: 8000,
    marginFloorOk: true,
    approvedByHuman: false,
    sendable: false
  });

  assert.equal(withQuote.status, "quoting");
  assert.equal(withQuote.quotes.length, 1);
  assert.equal(quote.approvedByHuman, false);
});

test("getLead returns null for unknown ids", () => {
  assert.equal(getLead("LEAD-DOES-NOT-EXIST"), null);
});
