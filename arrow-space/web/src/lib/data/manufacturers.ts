import type { Manufacturer } from "@/lib/types";

// Demo manufacturers. "Arrow Space" is our own (OWN) line; the rest are
// representative third-party aerospace brands we distribute (DISTRIBUTED).
export const manufacturers: Manufacturer[] = [
  { id: "arrow", name: "Arrow Space", short: "ARW" },
  { id: "honeywell", name: "Honeywell Aerospace", short: "HON" },
  { id: "collins", name: "Collins Aerospace", short: "COL" },
  { id: "safran", name: "Safran", short: "SAF" },
  { id: "parker", name: "Parker Aerospace", short: "PKR" },
  { id: "meggitt", name: "Meggitt", short: "MEG" },
  { id: "eaton", name: "Eaton Aerospace", short: "ETN" },
  { id: "ge", name: "GE Aerospace", short: "GE" },
];

const byId = new Map(manufacturers.map((m) => [m.id, m]));

export function manufacturerName(id: string): string {
  return byId.get(id)?.name ?? id;
}

export function manufacturerShort(id: string): string {
  return byId.get(id)?.short ?? id.slice(0, 3).toUpperCase();
}
