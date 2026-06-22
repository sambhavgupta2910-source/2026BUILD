const URGENCY_WEIGHT = {
  aog: 300,
  critical: 200,
  routine: 100
};

const FAST_TIERS = new Set(["stock", "24h", "48-72h"]);

export function calculateMetrics({ rfqs = [], quotes = [], aogEvents = [] }) {
  const openRfqs = rfqs.filter((rfq) => !["quoted", "won", "lost"].includes(rfq.status)).length;
  const aogOpen = rfqs.filter((rfq) => rfq.urgency === "aog" && !["won", "lost"].includes(rfq.status)).length;
  const unapprovedQuotes = quotes.filter((quote) => !quote.approvedByHuman);
  const draftQuoteValue = unapprovedQuotes.reduce((sum, quote) => sum + quote.total, 0);
  const marginExceptions = quotes.filter((quote) => !quote.marginFloorOk).length;
  const slaHits = aogEvents.filter((event) => event.respondedMinutes <= event.slaMinutes).length;
  const aogSlaHitRate = aogEvents.length ? Math.round((slaHits / aogEvents.length) * 100) : 0;

  return {
    openRfqs,
    aogOpen,
    draftQuoteValue,
    quotesAwaitingApproval: unapprovedQuotes.length,
    marginExceptions,
    aogSlaHitRate
  };
}

export function filterParts(parts, filters = {}) {
  const query = (filters.query || "").trim().toLowerCase();
  const ata = String(filters.ata || "all");
  const sourceType = filters.sourceType || "all";
  const availability = filters.availability || "all";

  return parts.filter((part) => {
    const matchesQuery =
      !query ||
      part.partNumber.toLowerCase().includes(query) ||
      part.description.toLowerCase().includes(query);
    const matchesAta = ata === "all" || String(part.ata) === ata;
    const matchesSource = sourceType === "all" || part.sourceType === sourceType;
    const matchesAvailability = availability !== "fast" || FAST_TIERS.has(part.leadTimeTier);

    return matchesQuery && matchesAta && matchesSource && matchesAvailability;
  });
}

export function rankRfqQueue(rfqs) {
  return [...rfqs].sort((left, right) => {
    const leftScore = scoreRfq(left);
    const rightScore = scoreRfq(right);

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return right.receivedMinutesAgo - left.receivedMinutesAgo;
  });
}

export function formatCurrency(value, currency = "USD") {
  return `${currency} ${Math.round(value).toLocaleString("en-US")}`;
}

function scoreRfq(rfq) {
  const urgency = URGENCY_WEIGHT[rfq.urgency] || 0;
  const exportControl = rfq.exportControlReview ? 35 : 0;
  const waitingTime = Math.min(rfq.receivedMinutesAgo || 0, 120) / 4;

  return urgency + exportControl + waitingTime;
}
