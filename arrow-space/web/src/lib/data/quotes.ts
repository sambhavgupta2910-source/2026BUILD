import type { Quote } from "@/lib/types";

// Demo RFQs for the signed-in customer org.
export const quotes: Quote[] = [
  {
    id: "RFQ-58120",
    status: "Quoted",
    priority: "Expedite",
    requestedDate: "2026-06-19",
    validUntil: "2026-07-03",
    buyer: "R. Anand",
    lines: [
      {
        partNumber: "HON-31-6650-07",
        description: "Engine Indicating & Crew Alerting Display Unit",
        condition: "SV",
        quantity: 1,
        quotedUnitPriceUsd: 32450,
        leadTimeDays: 9,
      },
    ],
    note: "Out of stock — quoted from repair vendor pool.",
  },
  {
    id: "RFQ-58044",
    status: "Submitted",
    priority: "AOG",
    requestedDate: "2026-06-21",
    buyer: "M. Haddad",
    lines: [
      {
        partNumber: "PKR-29-3340-19",
        description: "Engine-Driven Hydraulic Pump (EDP)",
        condition: "OH",
        quantity: 1,
      },
    ],
    note: "AOG — A/C grounded at DXB. Need exchange option if outright lead time > 48h.",
  },
  {
    id: "RFQ-57890",
    status: "Accepted",
    priority: "Routine",
    requestedDate: "2026-06-14",
    validUntil: "2026-06-28",
    buyer: "R. Anand",
    lines: [
      {
        partNumber: "SAF-32-9015-04",
        description: "Carbon Brake Disc Stack — Wheel & Brake",
        condition: "OH",
        quantity: 2,
        quotedUnitPriceUsd: 24100,
        leadTimeDays: 4,
      },
    ],
    note: "Converted to SO-204402 follow-on.",
  },
  {
    id: "RFQ-57610",
    status: "Expired",
    priority: "Routine",
    requestedDate: "2026-05-28",
    validUntil: "2026-06-11",
    buyer: "M. Haddad",
    lines: [
      {
        partNumber: "ETN-28-5512-03",
        description: "Fuel Boost Pump — Center Tank",
        condition: "SV",
        quantity: 2,
        quotedUnitPriceUsd: 9300,
        leadTimeDays: 6,
      },
    ],
  },
];

export function getQuote(id: string): Quote | undefined {
  return quotes.find((q) => q.id.toLowerCase() === id.toLowerCase());
}
