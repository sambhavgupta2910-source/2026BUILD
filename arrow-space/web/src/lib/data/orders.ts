import type { Order } from "@/lib/types";

// Demo order history for the signed-in customer org (Skyline Aviation MRO).
export const orders: Order[] = [
  {
    id: "SO-204871",
    poNumber: "PO-2026-0613-A",
    status: "Shipped",
    priority: "AOG",
    placedDate: "2026-06-20",
    shipTo: "Skyline MRO — Dubai (DWC)",
    buyer: "R. Anand",
    lines: [
      {
        partNumber: "HON-49-2210-11",
        description: "APU Fuel Control Unit — 131-9A",
        condition: "OH",
        quantity: 1,
        unitPriceUsd: 38900,
      },
    ],
    shipment: {
      carrier: "FedEx Priority",
      tracking: "7794 1183 0026",
      shippedDate: "2026-06-21",
      estDelivery: "2026-06-23",
      origin: "AWB-MIA",
    },
    documents: ["Invoice", "Packing Slip", "FAA 8130-3", "AWB"],
  },
  {
    id: "SO-204655",
    poNumber: "PO-2026-0610-C",
    status: "Confirmed",
    priority: "Routine",
    placedDate: "2026-06-18",
    shipTo: "Skyline MRO — Dubai (DWC)",
    buyer: "M. Haddad",
    lines: [
      {
        partNumber: "MEG-32-2207-08",
        description: "Brake Temperature Sensor",
        condition: "NEW",
        quantity: 6,
        unitPriceUsd: 2960,
      },
      {
        partNumber: "COL-33-4471-14",
        description: "LED Reading Light Module",
        condition: "NEW",
        quantity: 24,
        unitPriceUsd: 410,
      },
    ],
    documents: ["Order Acknowledgement"],
  },
  {
    id: "SO-204402",
    poNumber: "PO-2026-0605-B",
    status: "Delivered",
    priority: "Routine",
    placedDate: "2026-06-09",
    shipTo: "Skyline MRO — Singapore (SIN)",
    buyer: "R. Anand",
    lines: [
      {
        partNumber: "ARW-25-6610-12",
        description: "Cabin Seat Recline Actuator",
        condition: "NEW",
        quantity: 12,
        unitPriceUsd: 745,
      },
    ],
    shipment: {
      carrier: "DHL Express",
      tracking: "JD0146 8821 9930",
      shippedDate: "2026-06-11",
      estDelivery: "2026-06-13",
      origin: "AWB-SIN",
    },
    documents: ["Invoice", "Packing Slip", "FAA 8130-3"],
  },
  {
    id: "SO-204120",
    poNumber: "PO-2026-0531-A",
    status: "Backorder",
    priority: "Expedite",
    placedDate: "2026-06-01",
    shipTo: "Skyline MRO — Dubai (DWC)",
    buyer: "M. Haddad",
    lines: [
      {
        partNumber: "GE-72-1140-06",
        description: "HPC Stage-3 Compressor Blade Set",
        condition: "NEW",
        quantity: 1,
        unitPriceUsd: 41250,
      },
    ],
    documents: ["Order Acknowledgement"],
  },
];

export function getOrder(id: string): Order | undefined {
  return orders.find((o) => o.id.toLowerCase() === id.toLowerCase());
}

export function orderTotal(order: Order): number {
  return order.lines.reduce((sum, l) => sum + l.unitPriceUsd * l.quantity, 0);
}
