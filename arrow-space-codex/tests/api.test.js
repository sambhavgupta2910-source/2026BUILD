import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate the store and fix a passcode before importing the server.
const dataDir = mkdtempSync(join(tmpdir(), "arrowspace-api-"));
process.env.DATA_DIR = dataDir;
process.env.OPERATOR_PASSCODE = "test-pass";

const { createServer } = await import("../server/index.js");

const server = createServer();
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const OPS = { "x-operator-passcode": "test-pass", "Content-Type": "application/json" };

test.after(() => {
  server.close();
  rmSync(dataDir, { recursive: true, force: true });
});

function post(path, body, headers = { "Content-Type": "application/json" }) {
  return fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
}

test("static landing page is served at /", async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Arrow Space/);
  assert.match(html, /Global aircraft parts supply/);
});

test("POST /api/rfq captures a lead and returns no price", async () => {
  const res = await post("/api/rfq", {
    partNumber: "130-384045-1",
    endUser: "defense",
    company: "IAF cell",
    email: "ops@iaf.test"
  });
  assert.equal(res.status, 201);
  const text = await res.text();
  const body = JSON.parse(text);
  assert.equal(body.ok, true);
  assert.match(body.id, /^RFQ-/);
  assert.equal(body.exportControlReview, true);
  assert.ok(!("total" in body) && !("unitPrice" in body) && !("price" in body));
  assert.equal(/unitPrice|costBasis|"price"/.test(text), false, "no price fields in response");
});

test("POST /api/rfq rejects a payload missing the part number", async () => {
  const res = await post("/api/rfq", { company: "No Part Co" });
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.equal(body.ok, false);
  assert.ok(body.fields.partNumber);
});

test("POST /api/aog requires aircraft, part, and location", async () => {
  const bad = await post("/api/aog", { partNumber: "65-12388-19" });
  assert.equal(bad.status, 422);

  const good = await post("/api/aog", {
    partNumber: "65-12388-19",
    aircraft: "Hawker 900XP",
    location: "VOBL",
    email: "ops@air.test"
  });
  assert.equal(good.status, 201);
});

test("POST /api/inventory-search returns availability without price", async () => {
  const res = await post("/api/inventory-search", { query: "brake" });
  assert.equal(res.status, 200);
  const text = await res.text();
  const body = JSON.parse(text);
  assert.ok(body.count >= 1);
  assert.ok(body.parts.every((p) => !("unitPrice" in p) && !("costBasis" in p)));
  assert.equal(/unitPrice|costBasis/.test(text), false);
});

test("operator endpoints require authentication", async () => {
  const res = await fetch(`${base}/api/operator/leads`);
  assert.equal(res.status, 401);

  const bad = await post("/api/operator/login", { passcode: "wrong" });
  assert.equal(bad.status, 401);
});

test("operator can list captured leads with the passcode", async () => {
  const res = await fetch(`${base}/api/operator/leads`, { headers: OPS });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.leads));
  assert.ok(body.leads.length >= 1);
  assert.ok(body.metrics);
});

test("quote drafting and human approval enforce the no-auto-send guard", async () => {
  // Create a fresh lead to quote against.
  const created = await (await post("/api/rfq", {
    partNumber: "DC-ONE-X",
    endUser: "ga",
    email: "buyer@ga.test"
  })).json();
  const id = created.id;

  // Below-floor draft: allowed to draft, refused at approval.
  const lowDraft = await (await post(`/api/operator/leads/${id}/quote`, {
    total: 10000,
    costBasis: 9000
  }, OPS)).json();
  assert.equal(lowDraft.ok, true);
  assert.equal(lowDraft.marginException, true);

  const refused = await post(
    `/api/operator/leads/${id}/quotes/${lowDraft.quote.id}/approve`,
    { approver: "A. Ops" },
    OPS
  );
  assert.equal(refused.status, 422, "below-floor quote cannot be approved/sent");

  // Above-floor draft: approval requires an approver, then becomes sendable.
  const okDraft = await (await post(`/api/operator/leads/${id}/quote`, {
    total: 10000,
    costBasis: 8000
  }, OPS)).json();
  assert.equal(okDraft.quote.sendable, false, "draft is never auto-sendable");

  const noApprover = await post(
    `/api/operator/leads/${id}/quotes/${okDraft.quote.id}/approve`,
    {},
    OPS
  );
  assert.equal(noApprover.status, 422, "approver is required");

  const approved = await post(
    `/api/operator/leads/${id}/quotes/${okDraft.quote.id}/approve`,
    { approver: "A. Ops" },
    OPS
  );
  assert.equal(approved.status, 200);
  const approvedBody = await approved.json();
  assert.equal(approvedBody.quote.approvedByHuman, true);
  assert.equal(approvedBody.quote.sendable, true);
});

test("operator can update lead status", async () => {
  const leads = await (await fetch(`${base}/api/operator/leads`, { headers: OPS })).json();
  const target = leads.leads[0];
  const res = await post(`/api/operator/leads/${target.id}/status`, { status: "triaged" }, OPS);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.lead.status, "triaged");
});
