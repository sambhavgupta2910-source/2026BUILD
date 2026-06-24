/**
 * Domain vocabulary for synthetic generation. Curated so the output reads like
 * a real Beechcraft/Hawker + corridor GA/rotary parts business rather than
 * random noise. Distribution choices are documented in README.md.
 */

export interface AtaDef {
  chapter: number;
  sub: string;
  name: string;
  noun: string;
  /** relative frequency weight for parts + RFQ demand */
  weight: number;
}

/** ATA chapters in scope, weighted by how often they actually drive demand
 *  (landing gear, electrical, nav, comms dominate; doors/wings are rare). */
export const ATA: readonly AtaDef[] = [
  { chapter: 21, sub: "21-50", name: "Air Conditioning", noun: "ECS valve", weight: 3 },
  { chapter: 23, sub: "23-10", name: "Communications", noun: "headset", weight: 6 },
  { chapter: 24, sub: "24-30", name: "Electrical Power", noun: "generator control unit", weight: 7 },
  { chapter: 25, sub: "25-20", name: "Equipment & Furnishings", noun: "seat assembly", weight: 2 },
  { chapter: 27, sub: "27-50", name: "Flight Controls", noun: "actuator", weight: 6 },
  { chapter: 28, sub: "28-40", name: "Fuel", noun: "fuel pump", weight: 4 },
  { chapter: 29, sub: "29-10", name: "Hydraulic Power", noun: "hydraulic pump", weight: 3 },
  { chapter: 32, sub: "32-40", name: "Landing Gear", noun: "wheel & brake assembly", weight: 9 },
  { chapter: 33, sub: "33-40", name: "Lights", noun: "LED beacon", weight: 3 },
  { chapter: 34, sub: "34-20", name: "Navigation", noun: "air data computer", weight: 7 },
  { chapter: 49, sub: "49-10", name: "Auxiliary Power", noun: "APU starter", weight: 2 },
  { chapter: 52, sub: "52-10", name: "Doors", noun: "door seal kit", weight: 2 },
  { chapter: 57, sub: "57-50", name: "Wings", noun: "flap track", weight: 2 },
  { chapter: 71, sub: "71-00", name: "Power Plant", noun: "engine mount", weight: 4 },
  { chapter: 72, sub: "72-30", name: "Engine", noun: "compressor blade set", weight: 5 },
  { chapter: 77, sub: "77-20", name: "Engine Indicating", noun: "ITT harness", weight: 3 },
  { chapter: 79, sub: "79-20", name: "Oil", noun: "oil cooler", weight: 3 },
];

export interface Mfr {
  name: string;
  /** US-origin → drives the export-control rule */
  us: boolean;
  weight: number;
}

/** ~78% of weighted supply is US-origin — realistic for this catalogue and
 *  enough to exercise export-control flagging on defense/govt RFQs. */
export const MFRS: readonly Mfr[] = [
  { name: "Textron Aviation", us: true, weight: 5 },
  { name: "Hawker Beechcraft", us: true, weight: 5 },
  { name: "Honeywell", us: true, weight: 4 },
  { name: "Collins Aerospace", us: true, weight: 4 },
  { name: "Parker Hannifin", us: true, weight: 3 },
  { name: "Goodrich", us: true, weight: 2 },
  { name: "Safran", us: false, weight: 3 },
  { name: "Meggitt", us: false, weight: 2 },
  { name: "Liebherr Aerospace", us: false, weight: 2 },
];

/** Beechcraft/Hawker core + corridor GA and rotary. Customer fleets and part
 *  applicability are both drawn from this list so they reconcile. */
export const FLEET: readonly string[] = [
  "Beechcraft King Air B200",
  "Beechcraft King Air 350",
  "Beechcraft Baron G58",
  "Beechcraft Bonanza G36",
  "Hawker 850XP",
  "Hawker 900XP",
  "Cessna Citation CJ3",
  "Cessna Caravan 208B",
  "Pilatus PC-12",
  "Bell 407",
  "Airbus H125",
  "Robinson R66",
];

/** Customer organisation name fragments by end-user type. */
export const ORG_NAMES: Record<string, readonly string[]> = {
  defense: ["Air Wing Command", "Naval Air Arm", "Defence Logistics", "Squadron Support"],
  govt: ["State Aviation Directorate", "Coast Guard Air", "Government Flying Service", "Police Air Unit"],
  airline: ["Regional Airways", "Connect Air", "Skyline Carriers", "Frontier Regional"],
  operator: ["Corporate Jet Operations", "Charter Aviation", "Executive Air", "Continental Charters"],
  mro: ["Aerotech MRO", "Precision Maintenance", "Continental Aero Services", "Apex Line Maintenance"],
  ga: ["Flying Club", "Private Hangar", "Pilot Services", "General Aviation Co"],
};

export const COUNTRIES: readonly (readonly [string, number])[] = [
  ["IN", 6],
  ["AE", 2],
  ["SG", 1],
  ["LK", 1],
  ["NP", 1],
  ["US", 1],
];

export const ROLES: readonly string[] = [
  "Procurement",
  "Maintenance Director",
  "Chief Engineer",
  "Fleet Manager",
  "Stores",
];
