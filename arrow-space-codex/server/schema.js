// Pure validation + business rules for Arrow Space lead intake and quoting.
// No I/O, no external dependencies — safe to unit test in isolation.
import { findPart } from "../src/catalog.js";

// End users whose requirements trigger an export-control / end-use review
// when paired with a US-origin part.
export const CONTROLLED_END_USERS = new Set(["defense", "govt", "government"]);

// Minimum gross margin a draft quote must clear before a human may approve it.
// Below this floor the quote is a "margin exception" and cannot be sent.
export const MARGIN_FLOOR_RATE = 0.12;

const LEAD_KINDS = new Set(["rfq", "aog", "rfp", "inventory"]);
const VALID_STATUSES = [
  "new",
  "triaged",
  "quoting",
  "quoted",
  "won",
  "lost",
  "on_hold"
];

export class ValidationError extends Error {
  constructor(message, fields = {}) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
    this.statusCode = 422;
  }
}

function str(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requireFields(payload, names) {
  const fields = {};
  for (const name of names) {
    if (!str(payload[name])) {
      fields[name] = "required";
    }
  }
  if (Object.keys(fields).length) {
    throw new ValidationError("Missing required fields", fields);
  }
}

// US-origin part + controlled end user => mandatory export-control review
// before any pricing is released. US-origin alone (non-controlled buyer) is
// flagged for awareness but does not block on its own.
export function computeExportControl({ usOrigin, endUser }) {
  const controlledBuyer = CONTROLLED_END_USERS.has(str(endUser).toLowerCase());
  return Boolean(usOrigin) && controlledBuyer;
}

// Build a normalized, persisted-ready lead from a raw intake payload.
// Throws ValidationError on bad input. Never computes or returns a price.
export function buildLead(kind, payload = {}, { now = new Date(), idFactory } = {}) {
  if (!LEAD_KINDS.has(kind)) {
    throw new ValidationError(`Unknown lead kind: ${kind}`);
  }

  const customer = {
    name: str(payload.customerName || payload.name),
    company: str(payload.company),
    email: str(payload.email),
    phone: str(payload.phone)
  };

  // Every channel needs a way to reach the requester. RFP/AOG also need a
  // routable part or fleet so an operator can triage without chasing.
  if (kind === "rfq" || kind === "rfp") {
    requireFields(payload, ["partNumber"]);
  }
  if (kind === "aog") {
    requireFields(payload, ["partNumber", "aircraft", "location"]);
  }

  const partNumber = str(payload.partNumber);
  const matchedPart = findPart(partNumber);
  // Trust the catalog for origin when we recognize the part; otherwise honor
  // an explicit flag from the caller. Default to false (unknown, not US).
  const usOrigin = matchedPart ? matchedPart.usOrigin : Boolean(payload.usOrigin);
  const endUser = str(payload.endUser).toLowerCase() || "unspecified";

  const urgency =
    kind === "aog"
      ? "aog"
      : ["aog", "critical", "routine"].includes(str(payload.urgency).toLowerCase())
        ? str(payload.urgency).toLowerCase()
        : "routine";

  const exportControlReview = computeExportControl({ usOrigin, endUser });

  const clarificationsNeeded = [];
  if (!customer.email && !customer.phone) {
    clarificationsNeeded.push("contact method");
  }
  if (!matchedPart && partNumber) {
    clarificationsNeeded.push("confirm exact part number / interchangeable");
  }
  if (!str(payload.condition) && kind !== "inventory") {
    clarificationsNeeded.push("acceptable condition");
  }

  const id =
    typeof idFactory === "function" ? idFactory(kind) : defaultLeadId(kind, now);

  return {
    id,
    kind,
    channel: str(payload.channel) || (kind === "inventory" ? "search" : "form"),
    customer,
    endUser,
    partNumber,
    matchedPartId: matchedPart ? matchedPart.id : null,
    aircraft: str(payload.aircraft),
    qty: Number.isFinite(Number(payload.qty)) ? Number(payload.qty) : 1,
    condition: str(payload.condition),
    location: str(payload.location),
    neededBy: str(payload.neededBy),
    urgency,
    note: str(payload.note),
    usOrigin,
    exportControlReview,
    clarificationsNeeded,
    attachments: [],
    quotes: [],
    status: "new",
    statusHistory: [{ status: "new", at: now.toISOString(), by: "intake" }],
    receivedAt: now.toISOString(),
    // Intake captured through the live portal is real lead data, kept
    // separate from the seeded demo records (which carry _synthetic: true).
    _synthetic: Boolean(payload._synthetic)
  };
}

export function defaultLeadId(kind, now = new Date()) {
  const prefix = kind.toUpperCase();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(2, 14);
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function isValidStatus(status) {
  return VALID_STATUSES.includes(status);
}

// Evaluate a draft quote against the margin floor. Pure: no approval here.
export function evaluateQuote({ total, costBasis, currency = "USD" }) {
  const sell = Number(total);
  const cost = Number(costBasis);
  if (!Number.isFinite(sell) || sell <= 0) {
    throw new ValidationError("Quote total must be a positive number", {
      total: "invalid"
    });
  }
  if (!Number.isFinite(cost) || cost < 0) {
    throw new ValidationError("Quote cost basis must be a non-negative number", {
      costBasis: "invalid"
    });
  }
  const marginRate = sell > 0 ? (sell - cost) / sell : 0;
  const marginFloorOk = marginRate >= MARGIN_FLOOR_RATE;
  return {
    total: sell,
    costBasis: cost,
    currency,
    marginRate: Number(marginRate.toFixed(4)),
    marginFloorOk,
    approvedByHuman: false,
    // A quote is only sendable once a human approves AND it clears the floor.
    sendable: false
  };
}

// Human approval gate. Refuses to approve a quote that fails the margin floor,
// and never auto-sends — approval is always an explicit operator action.
export function approveQuote(quote, { approver } = {}) {
  if (!quote.marginFloorOk) {
    throw new ValidationError(
      "Margin exception: quote is below the margin floor and cannot be approved or sent",
      { marginRate: "below_floor" }
    );
  }
  if (!str(approver)) {
    throw new ValidationError("Approver is required for human sign-off", {
      approver: "required"
    });
  }
  return {
    ...quote,
    approvedByHuman: true,
    approvedBy: str(approver),
    approvedAt: new Date().toISOString(),
    sendable: true
  };
}
