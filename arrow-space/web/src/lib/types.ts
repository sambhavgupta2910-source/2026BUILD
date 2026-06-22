// Domain types for the Arrow Space portal (demo data model).

export type PartCondition = "NEW" | "OH" | "SV" | "AR" | "NE";
// NEW = new, OH = overhauled, SV = serviceable, AR = as-removed, NE = new surplus

export type Certification = "FAA 8130-3" | "EASA Form 1" | "OEM CoC" | "Dual Release";

export type SourceType = "OWN" | "DISTRIBUTED";
// OWN = Arrow Space proprietary line, DISTRIBUTED = third-party manufacturer

export interface Manufacturer {
  id: string;
  name: string;
  short: string;
}

export interface StockLocation {
  warehouse: string;
  region: string;
  quantity: number;
  leadTimeDays: number;
}

export interface Part {
  partNumber: string;
  description: string;
  manufacturerId: string;
  source: SourceType;
  ataChapter: string; // e.g. "32 — Landing Gear"
  category: string;
  aircraft: string[]; // applicable platforms
  conditions: PartCondition[];
  certifications: Certification[];
  unitPriceUsd: number; // indicative list price
  uom: string; // unit of measure
  minOrderQty: number;
  weightKg: number;
  shelfLifeMonths?: number;
  alternates: string[]; // alternate / superseding part numbers
  stock: StockLocation[];
  hazmat?: boolean;
}

export type OrderStatus =
  | "Quote"
  | "Pending Approval"
  | "Confirmed"
  | "Picking"
  | "Shipped"
  | "Delivered"
  | "Backorder";

export type Priority = "Routine" | "Expedite" | "AOG";

export interface OrderLine {
  partNumber: string;
  description: string;
  condition: PartCondition;
  quantity: number;
  unitPriceUsd: number;
}

export interface Shipment {
  carrier: string;
  tracking: string;
  shippedDate?: string;
  estDelivery?: string;
  origin: string;
}

export interface Order {
  id: string;
  poNumber: string;
  status: OrderStatus;
  priority: Priority;
  placedDate: string;
  shipTo: string;
  buyer: string;
  lines: OrderLine[];
  shipment?: Shipment;
  documents: string[]; // available document labels
}

export type QuoteStatus = "Submitted" | "Quoted" | "Expired" | "Accepted";

export interface QuoteLine {
  partNumber: string;
  description: string;
  condition: PartCondition;
  quantity: number;
  quotedUnitPriceUsd?: number;
  leadTimeDays?: number;
}

export interface Quote {
  id: string;
  status: QuoteStatus;
  priority: Priority;
  requestedDate: string;
  validUntil?: string;
  buyer: string;
  lines: QuoteLine[];
  note?: string;
}
