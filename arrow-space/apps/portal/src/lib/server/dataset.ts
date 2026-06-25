import "server-only";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { syntheticDir } from "./paths";
import {
  AircraftSchema,
  CustomerInventorySchema,
  CustomerSchema,
  OrderSchema,
  PartSchema,
  TraceDocSchema,
  type Aircraft,
  type Customer,
  type CustomerInventory,
  type Order,
  type Part,
  type TraceDoc,
} from "@arrow-space/schema";

/**
 * Loads the committed SYNTHETIC dataset for the portal to render. This is
 * clearly-labelled synthetic data — never real customer data. When real data
 * exists it lives elsewhere on the same schema/IDs and swaps in here.
 */

function readArray<T>(file: string, schema: z.ZodType<T>): T[] {
  const dir = syntheticDir();
  if (!dir) return [];
  const path = join(dir, file);
  if (!existsSync(path)) return [];
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    // bare schema strips the _synthetic/_dataset markers; that's fine here.
    return z.array(schema).parse(parsed);
  } catch {
    return [];
  }
}

export interface Dataset {
  customers: Customer[];
  aircraft: Aircraft[];
  inventory: CustomerInventory[];
  orders: Order[];
  traceDocs: TraceDoc[];
  parts: Part[];
  partById: Map<string, Part>;
  orderById: Map<string, Order>;
}

let cache: Dataset | null = null;

export function dataset(): Dataset {
  if (cache) return cache;
  const parts = readArray("parts.json", PartSchema);
  const orders = readArray("orders.json", OrderSchema);
  cache = {
    customers: readArray("customers.json", CustomerSchema),
    aircraft: readArray("aircraft.json", AircraftSchema),
    inventory: readArray("customer_inventory.json", CustomerInventorySchema),
    orders,
    traceDocs: readArray("trace_docs.json", TraceDocSchema),
    parts,
    partById: new Map(parts.map((p) => [p.id, p])),
    orderById: new Map(orders.map((o) => [o.id, o])),
  };
  return cache;
}

// --- per-customer queries ---------------------------------------------------

export function portalCustomers(): Customer[] {
  return dataset()
    .customers.filter((c) => c.portal_enabled)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getCustomer(id: string): Customer | undefined {
  return dataset().customers.find((c) => c.id === id && c.portal_enabled);
}

export function fleetOf(customerId: string): Aircraft[] {
  return dataset().aircraft.filter((a) => a.customer_id === customerId);
}

export function ordersOf(customerId: string): Order[] {
  return dataset()
    .orders.filter((o) => o.customer_id === customerId)
    .sort((a, b) => b.placed_at.localeCompare(a.placed_at));
}

export interface InventoryRow {
  inventory: CustomerInventory;
  part: Part | undefined;
  aircraft: Aircraft | undefined;
  traceDocs: TraceDoc[];
}

export function inventoryOf(customerId: string): InventoryRow[] {
  const db = dataset();
  const fleet = new Map(fleetOf(customerId).map((a) => [a.id, a]));
  return db.inventory
    .filter((inv) => inv.customer_id === customerId)
    .map((inv) => {
      const order = inv.source_order_id ? db.orderById.get(inv.source_order_id) : undefined;
      const traceIds = new Set(order?.trace_doc_ids ?? []);
      return {
        inventory: inv,
        part: db.partById.get(inv.part_id),
        aircraft: inv.aircraft_id ? fleet.get(inv.aircraft_id) : undefined,
        traceDocs: db.traceDocs.filter((t) => traceIds.has(t.id)),
      };
    });
}

export function traceDocsForOrder(order: Order): TraceDoc[] {
  const ids = new Set(order.trace_doc_ids);
  return dataset().traceDocs.filter((t) => ids.has(t.id));
}
