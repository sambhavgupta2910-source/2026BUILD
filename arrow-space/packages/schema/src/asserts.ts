import { PartSchema, type Part } from "./part";
import { SupplierPathSchema, type SupplierPath } from "./supplier-path";
import { RfqSchema, type Rfq } from "./rfq";
import { QuoteSchema, type Quote } from "./quote";
import { TraceDocSchema, type TraceDoc } from "./trace-doc";
import { AogEventSchema, type AogEvent } from "./aog-event";
import { CustomerSchema, type Customer } from "./customer";
import { AircraftSchema, type Aircraft } from "./aircraft";
import { CustomerInventorySchema, type CustomerInventory } from "./customer-inventory";
import { OrderSchema, type Order } from "./order";

/** Parse-or-throw helpers. Each validates an unknown value against its schema
 *  and returns the typed entity, throwing a ZodError on mismatch. */
export const assertPart = (x: unknown): Part => PartSchema.parse(x);
export const assertSupplierPath = (x: unknown): SupplierPath => SupplierPathSchema.parse(x);
export const assertRfq = (x: unknown): Rfq => RfqSchema.parse(x);
export const assertQuote = (x: unknown): Quote => QuoteSchema.parse(x);
export const assertTraceDoc = (x: unknown): TraceDoc => TraceDocSchema.parse(x);
export const assertAogEvent = (x: unknown): AogEvent => AogEventSchema.parse(x);
export const assertCustomer = (x: unknown): Customer => CustomerSchema.parse(x);
export const assertAircraft = (x: unknown): Aircraft => AircraftSchema.parse(x);
export const assertCustomerInventory = (x: unknown): CustomerInventory =>
  CustomerInventorySchema.parse(x);
export const assertOrder = (x: unknown): Order => OrderSchema.parse(x);
