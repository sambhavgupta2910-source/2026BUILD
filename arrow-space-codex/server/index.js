// Arrow Space — production server (Node built-ins only).
// Serves the Build 1 static app verbatim, the passcode-gated operator console,
// and the lead-capture API. No price is ever returned to public endpoints and
// no quote is auto-sent — human approval gates every release.
import { createServer as createHttpServer } from "node:http";
import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

import { calculateMetrics, filterParts, rankRfqQueue } from "../src/portal-data.js";
import { catalogParts, toPublicPart } from "../src/catalog.js";
import {
  approveQuote,
  buildLead,
  evaluateQuote,
  ValidationError
} from "./schema.js";
import {
  attachQuote,
  getLead,
  listLeads,
  replaceQuote,
  saveLead,
  saveUpload,
  updateLeadStatus
} from "./store.js";

const moduleDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = dirname(moduleDir);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

// Static files we are willing to serve, mapped to their on-disk location.
const STATIC_ROUTES = {
  "/": "index.html",
  "/index.html": "index.html",
  "/styles.css": "styles.css",
  "/app.js": "app.js",
  "/src/portal-data.js": "src/portal-data.js",
  "/src/catalog.js": "src/catalog.js",
  "/src/motion.js": "src/motion.js",
  "/operator": "operator/index.html",
  "/operator/": "operator/index.html",
  "/operator/index.html": "operator/index.html",
  "/operator/app.js": "operator/app.js"
};

function operatorPasscode() {
  return process.env.OPERATOR_PASSCODE || "arrowspace-ops";
}

function sessionToken() {
  return createHash("sha256").update(operatorPasscode()).digest("hex");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": typeof body === "string" ? "text/plain; charset=utf-8" : MIME[".json"],
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(payload);
}

function serveStatic(res, relativePath) {
  const target = normalize(join(packageRoot, relativePath));
  if (!target.startsWith(packageRoot) || !existsSync(target)) {
    return send(res, 404, { error: "Not found" });
  }
  const ext = target.slice(target.lastIndexOf("."));
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  res.end(readFileSync(target));
}

function readBody(req, limitBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new ValidationError("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ValidationError("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((pair) => pair.length === 2)
  );
}

function isOperator(req) {
  const headerPass = req.headers["x-operator-passcode"];
  if (headerPass && safeEqual(headerPass, operatorPasscode())) return true;
  const cookies = parseCookies(req.headers.cookie || "");
  return Boolean(cookies.ops_session) && safeEqual(cookies.ops_session, sessionToken());
}

// ---- Public lead-capture handlers (never return price, never auto-quote) ----

async function handleIntake(req, res, kind) {
  const payload = await readBody(req);
  const lead = buildLead(kind, payload);

  if (kind === "rfp" && payload.file) {
    const upload = saveUpload(lead.id, payload.file.name, payload.file.contentBase64);
    lead.attachments.push(upload);
  }

  saveLead(lead);
  // Acknowledge capture only — no pricing, no commitment.
  send(res, 201, {
    ok: true,
    id: lead.id,
    kind: lead.kind,
    status: lead.status,
    exportControlReview: lead.exportControlReview,
    clarificationsNeeded: lead.clarificationsNeeded,
    message:
      kind === "aog"
        ? "AOG request captured and queued for operator response. Phone follow-up and final release stay human-owned."
        : "Request captured. An operator will review and respond; pricing and release are human-approved."
  });
}

async function handleInventorySearch(req, res) {
  const filters = await readBody(req);
  const matches = filterParts(catalogParts, {
    query: filters.query,
    ata: filters.ata,
    sourceType: filters.sourceType,
    availability: filters.availability
  });
  // Public result: availability, condition, source path, docs — no price.
  send(res, 200, {
    ok: true,
    count: matches.length,
    parts: matches.map(toPublicPart),
    note: "Availability and document expectations only. Pricing follows a human-reviewed RFQ."
  });
}

// ---- Operator handlers (passcode gated) ----

async function handleOperatorLogin(req, res) {
  const body = await readBody(req);
  if (!safeEqual(body.passcode || "", operatorPasscode())) {
    return send(res, 401, { ok: false, error: "Invalid passcode" });
  }
  send(
    res,
    200,
    { ok: true },
    {
      "Set-Cookie": `ops_session=${sessionToken()}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`
    }
  );
}

function handleOperatorQueue(res) {
  const leads = listLeads();
  // Reuse the Build 1 ranking so AOG + export-control work surfaces first.
  const ranked = rankRfqQueue(
    leads.map((lead) => ({
      ...lead,
      exportControlReview: lead.exportControlReview,
      receivedMinutesAgo: Math.max(
        0,
        Math.round((Date.now() - new Date(lead.receivedAt).getTime()) / 60000)
      )
    }))
  );
  const metrics = calculateMetrics({
    rfqs: leads.map((lead) => ({ urgency: lead.urgency, status: lead.status })),
    quotes: leads.flatMap((lead) => lead.quotes || []).map((q) => ({
      approvedByHuman: q.approvedByHuman,
      marginFloorOk: q.marginFloorOk,
      total: q.total
    })),
    aogEvents: []
  });
  send(res, 200, { ok: true, metrics, leads: ranked });
}

async function handleOperatorStatus(req, res, id) {
  const body = await readBody(req);
  const updated = updateLeadStatus(id, body.status, body.by || "operator");
  if (!updated) return send(res, 404, { ok: false, error: "Lead not found" });
  send(res, 200, { ok: true, lead: updated });
}

async function handleOperatorDraftQuote(req, res, id) {
  const body = await readBody(req);
  // Evaluate against the margin floor; the draft is never auto-approved/sent.
  const evaluated = evaluateQuote({
    total: body.total,
    costBasis: body.costBasis,
    currency: body.currency
  });
  const result = attachQuote(id, {
    ...evaluated,
    lines: Array.isArray(body.lines) ? body.lines : [],
    note: typeof body.note === "string" ? body.note : ""
  });
  if (!result) return send(res, 404, { ok: false, error: "Lead not found" });
  send(res, 201, {
    ok: true,
    quote: result.quote,
    requiresHumanApproval: true,
    marginException: !evaluated.marginFloorOk
  });
}

async function handleOperatorApprove(req, res, id, quoteId) {
  const body = await readBody(req);
  const lead = getLead(id);
  const quote = lead && (lead.quotes || []).find((q) => q.id === quoteId);
  if (!quote) return send(res, 404, { ok: false, error: "Quote not found" });
  // Throws ValidationError (422) if below margin floor — the no-auto-send guard.
  const approved = approveQuote(quote, { approver: body.approver });
  replaceQuote(id, quoteId, approved);
  send(res, 200, { ok: true, quote: approved });
}

const OPERATOR_PATHS = {
  status: /^\/api\/operator\/leads\/([A-Za-z0-9_-]+)\/status$/,
  quote: /^\/api\/operator\/leads\/([A-Za-z0-9_-]+)\/quote$/,
  approve: /^\/api\/operator\/leads\/([A-Za-z0-9_-]+)\/quotes\/([A-Za-z0-9_-]+)\/approve$/
};

async function route(req, res) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const method = req.method;

  // Static assets
  if (method === "GET" && STATIC_ROUTES[path]) {
    return serveStatic(res, STATIC_ROUTES[path]);
  }
  if (method === "GET" && path === "/favicon.ico") {
    return send(res, 204, "");
  }

  // Public intake
  if (method === "POST" && path === "/api/rfq") return handleIntake(req, res, "rfq");
  if (method === "POST" && path === "/api/aog") return handleIntake(req, res, "aog");
  if (method === "POST" && path === "/api/rfp") return handleIntake(req, res, "rfp");
  if (method === "POST" && path === "/api/inventory-search") {
    return handleInventorySearch(req, res);
  }

  // Operator auth
  if (method === "POST" && path === "/api/operator/login") {
    return handleOperatorLogin(req, res);
  }

  // Operator (gated)
  if (path.startsWith("/api/operator/")) {
    if (!isOperator(req)) {
      return send(res, 401, { ok: false, error: "Operator authentication required" });
    }
    if (method === "GET" && path === "/api/operator/leads") {
      return handleOperatorQueue(res);
    }
    let match;
    if (method === "POST" && (match = path.match(OPERATOR_PATHS.status))) {
      return handleOperatorStatus(req, res, match[1]);
    }
    if (method === "POST" && (match = path.match(OPERATOR_PATHS.quote))) {
      return handleOperatorDraftQuote(req, res, match[1]);
    }
    if (method === "POST" && (match = path.match(OPERATOR_PATHS.approve))) {
      return handleOperatorApprove(req, res, match[1], match[2]);
    }
  }

  send(res, 404, { ok: false, error: "Not found" });
}

export function createServer() {
  return createHttpServer((req, res) => {
    route(req, res).catch((error) => {
      if (error instanceof ValidationError) {
        return send(res, error.statusCode || 422, {
          ok: false,
          error: error.message,
          fields: error.fields || {}
        });
      }
      // eslint-disable-next-line no-console
      console.error("Server error:", error);
      send(res, 500, { ok: false, error: "Internal server error" });
    });
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const port = Number(process.env.PORT) || 4317;
  createServer().listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Arrow Space server listening on http://127.0.0.1:${port}`);
    // eslint-disable-next-line no-console
    console.log(`Operator console: http://127.0.0.1:${port}/operator`);
  });
}
