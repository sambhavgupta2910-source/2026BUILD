import test from "node:test";
import assert from "node:assert/strict";

import {
  approveQuote,
  buildLead,
  computeExportControl,
  evaluateQuote,
  MARGIN_FLOOR_RATE,
  ValidationError
} from "../server/schema.js";

test("computeExportControl flags US-origin parts for controlled end users only", () => {
  assert.equal(computeExportControl({ usOrigin: true, endUser: "defense" }), true);
  assert.equal(computeExportControl({ usOrigin: true, endUser: "govt" }), true);
  assert.equal(computeExportControl({ usOrigin: true, endUser: "airline" }), false);
  assert.equal(computeExportControl({ usOrigin: false, endUser: "defense" }), false);
});

test("buildLead requires a part number for RFQ and normalizes defaults", () => {
  assert.throws(() => buildLead("rfq", { company: "X" }), ValidationError);

  const lead = buildLead("rfq", {
    partNumber: "130-384045-1", // known US-origin catalog part
    endUser: "defense",
    company: "IAF cell"
  });

  assert.equal(lead.kind, "rfq");
  assert.equal(lead.status, "new");
  assert.equal(lead._synthetic, false);
  assert.equal(lead.usOrigin, true, "origin inferred from catalog");
  assert.equal(lead.exportControlReview, true, "US-origin + defense triggers review");
  assert.ok(lead.clarificationsNeeded.includes("contact method"));
  assert.equal(lead.statusHistory[0].status, "new");
});

test("buildLead enforces AOG-specific required fields", () => {
  assert.throws(
    () => buildLead("aog", { partNumber: "65-12388-19", aircraft: "Hawker 900XP" }),
    ValidationError,
    "missing location should fail"
  );

  const aog = buildLead("aog", {
    partNumber: "65-12388-19",
    aircraft: "Hawker 900XP",
    location: "VOBL",
    email: "ops@airline.com"
  });
  assert.equal(aog.urgency, "aog");
});

test("evaluateQuote applies the margin floor and never pre-approves", () => {
  const below = evaluateQuote({ total: 10000, costBasis: 9000 });
  assert.equal(below.marginFloorOk, false);
  assert.ok(below.marginRate < MARGIN_FLOOR_RATE);
  assert.equal(below.approvedByHuman, false);
  assert.equal(below.sendable, false);

  const ok = evaluateQuote({ total: 10000, costBasis: 8000 });
  assert.equal(ok.marginFloorOk, true);
  assert.equal(ok.sendable, false, "still requires human approval");
});

test("approveQuote refuses below-floor quotes and demands an approver (no auto-send)", () => {
  const below = evaluateQuote({ total: 10000, costBasis: 9000 });
  assert.throws(() => approveQuote(below, { approver: "A. Ops" }), ValidationError);

  const ok = evaluateQuote({ total: 10000, costBasis: 8000 });
  assert.throws(() => approveQuote(ok, {}), ValidationError, "approver required");

  const approved = approveQuote(ok, { approver: "A. Ops" });
  assert.equal(approved.approvedByHuman, true);
  assert.equal(approved.sendable, true);
  assert.equal(approved.approvedBy, "A. Ops");
});
