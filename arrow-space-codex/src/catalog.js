// Catalog seed for server-side inventory search and quote drafting.
// Mirrors the synthetic parts shown in the Build 1 portal (app.js `state.parts`).
// Synthetic data only — never presented as live customer stock.
export const catalogParts = [
  {
    id: "P-001",
    partNumber: "130-384045-1",
    description: "Main wheel brake assembly",
    ata: 32,
    aircraft: "King Air B200 / B300",
    condition: "NEW / OH",
    sourceType: "authorized",
    supplier: "Textron authorized line",
    leadTimeTier: "24h",
    unitPrice: 12800,
    costBasis: 10650,
    currency: "USD",
    usOrigin: true,
    traceDocs: ["FAA 8130-3", "CoC", "ATA 106"],
    stock: 4
  },
  {
    id: "P-002",
    partNumber: "DC-ONE-X",
    description: "David Clark ONE-X aviation headset",
    ata: 23,
    aircraft: "Business / GA / training fleets",
    condition: "NEW",
    sourceType: "david_clark",
    supplier: "David Clark India distribution",
    leadTimeTier: "stock",
    unitPrice: 895,
    costBasis: 730,
    currency: "USD",
    usOrigin: true,
    traceDocs: ["CoC"],
    stock: 28
  },
  {
    id: "P-003",
    partNumber: "45-80123-003",
    description: "Aileron actuator exchange unit",
    ata: 27,
    aircraft: "Hawker 800XP",
    condition: "SV / OH",
    sourceType: "usm_broker",
    supplier: "USM partner network",
    leadTimeTier: "quote",
    unitPrice: 18600,
    costBasis: 17050,
    currency: "USD",
    usOrigin: true,
    traceDocs: ["FAA 8130-3", "ATA 106"],
    stock: 0
  },
  {
    id: "P-004",
    partNumber: "90-364018-7",
    description: "Propeller governor overhaul kit",
    ata: 61,
    aircraft: "King Air C90 / B200",
    condition: "OH",
    sourceType: "workshop",
    supplier: "DGCA Kolkata workshop",
    leadTimeTier: "48-72h",
    unitPrice: 4200,
    costBasis: 3250,
    currency: "USD",
    usOrigin: false,
    traceDocs: ["Workshop release", "CoC"],
    stock: 7
  },
  {
    id: "P-005",
    partNumber: "65-12388-19",
    description: "Bleed air valve",
    ata: 36,
    aircraft: "Hawker 900XP",
    condition: "NEW / SV",
    sourceType: "authorized",
    supplier: "Textron authorized line",
    leadTimeTier: "48-72h",
    unitPrice: 9700,
    costBasis: 8500,
    currency: "USD",
    usOrigin: true,
    traceDocs: ["FAA 8130-3", "CoC"],
    stock: 2
  },
  {
    id: "P-006",
    partNumber: "GSE-28V-400",
    description: "28V portable power cart service kit",
    ata: 24,
    aircraft: "Ground support",
    condition: "NEW",
    sourceType: "gse_alliance",
    supplier: "GSE alliance path",
    leadTimeTier: "stock",
    unitPrice: 1450,
    costBasis: 1180,
    currency: "USD",
    usOrigin: false,
    traceDocs: ["CoC"],
    stock: 13
  }
];

// Public-facing inventory result: lead time, condition, source path, and
// document expectations are returned — never price. Pricing stays human-gated.
export function toPublicPart(part) {
  return {
    id: part.id,
    partNumber: part.partNumber,
    description: part.description,
    ata: part.ata,
    aircraft: part.aircraft,
    condition: part.condition,
    sourceType: part.sourceType,
    supplier: part.supplier,
    leadTimeTier: part.leadTimeTier,
    usOrigin: part.usOrigin,
    traceDocs: part.traceDocs,
    inStock: part.stock > 0
  };
}

export function findPart(partNumber) {
  if (!partNumber) return null;
  const needle = String(partNumber).trim().toLowerCase();
  return (
    catalogParts.find((part) => part.partNumber.toLowerCase() === needle) || null
  );
}
