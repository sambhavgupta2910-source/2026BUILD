import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMetrics,
  filterParts,
  formatCurrency,
  rankRfqQueue
} from "../src/portal-data.js";

test("calculateMetrics summarizes operational status without treating drafts as approved", () => {
  const metrics = calculateMetrics({
    rfqs: [
      { id: "RFQ-1", urgency: "aog", status: "triaged" },
      { id: "RFQ-2", urgency: "routine", status: "quoted" },
      { id: "RFQ-3", urgency: "critical", status: "new" }
    ],
    quotes: [
      { id: "Q-1", approvedByHuman: false, marginFloorOk: true, total: 24000 },
      { id: "Q-2", approvedByHuman: true, marginFloorOk: true, total: 8700 },
      { id: "Q-3", approvedByHuman: false, marginFloorOk: false, total: 12500 }
    ],
    aogEvents: [
      { id: "AOG-1", respondedMinutes: 11, slaMinutes: 20, resolved: false },
      { id: "AOG-2", respondedMinutes: 32, slaMinutes: 30, resolved: true }
    ]
  });

  assert.deepEqual(metrics, {
    openRfqs: 2,
    aogOpen: 1,
    draftQuoteValue: 36500,
    quotesAwaitingApproval: 2,
    marginExceptions: 1,
    aogSlaHitRate: 50
  });
});

test("filterParts matches query, ATA chapter, source type, and stock urgency", () => {
  const parts = [
    {
      partNumber: "130-384045-1",
      description: "Brake assembly",
      ata: 32,
      sourceType: "authorized",
      leadTimeTier: "24h"
    },
    {
      partNumber: "DC-ONE-X",
      description: "David Clark headset",
      ata: 23,
      sourceType: "david_clark",
      leadTimeTier: "stock"
    },
    {
      partNumber: "45-80123-003",
      description: "Exchange actuator",
      ata: 27,
      sourceType: "usm_broker",
      leadTimeTier: "quote"
    }
  ];

  assert.deepEqual(
    filterParts(parts, { query: "brake", ata: "32", sourceType: "authorized", availability: "fast" }),
    [parts[0]]
  );
});

test("rankRfqQueue puts AOG and export-control work first", () => {
  const ranked = rankRfqQueue([
    { id: "R-1", urgency: "routine", exportControlReview: false, receivedMinutesAgo: 4 },
    { id: "R-2", urgency: "aog", exportControlReview: false, receivedMinutesAgo: 12 },
    { id: "R-3", urgency: "critical", exportControlReview: true, receivedMinutesAgo: 8 }
  ]);

  assert.deepEqual(ranked.map((rfq) => rfq.id), ["R-2", "R-3", "R-1"]);
});

test("formatCurrency uses compact aviation quote formatting", () => {
  assert.equal(formatCurrency(12500, "USD"), "USD 12,500");
});
