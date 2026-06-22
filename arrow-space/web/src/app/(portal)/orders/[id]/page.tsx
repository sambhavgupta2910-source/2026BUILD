import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder, orders, orderTotal } from "@/lib/data/orders";
import {
  Card,
  ConditionBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui";
import { usd, shortDate } from "@/lib/format";
import type { OrderStatus } from "@/lib/types";

export function generateStaticParams() {
  return orders.map((o) => ({ id: o.id }));
}

const flow: OrderStatus[] = [
  "Confirmed",
  "Picking",
  "Shipped",
  "Delivered",
];

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = getOrder(decodeURIComponent(id));
  if (!order) notFound();

  const currentIdx = flow.indexOf(order.status as OrderStatus);
  const isBackorder = order.status === "Backorder";

  return (
    <div className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500"
      >
        ← Back to orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="mono text-2xl font-semibold text-ink">{order.id}</h1>
            <StatusBadge status={order.status} />
            <PriorityBadge priority={order.priority} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            PO <span className="mono">{order.poNumber}</span> · placed{" "}
            {shortDate(order.placedDate)} by {order.buyer} · ship to{" "}
            {order.shipTo}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Order value</div>
          <div className="text-2xl font-semibold text-ink">
            {usd(orderTotal(order))}
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card className="p-5">
        {isBackorder ? (
          <p className="text-sm text-amber-700">
            This order is on <strong>backorder</strong>. Our desk is sourcing the
            line(s); you’ll be notified when stock is allocated.
          </p>
        ) : (
          <ol className="flex items-center">
            {flow.map((step, i) => {
              const done = i <= currentIdx;
              return (
                <li key={step} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        done
                          ? "bg-brand-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={`mt-1 text-xs ${done ? "font-medium text-ink" : "text-slate-400"}`}
                    >
                      {step}
                    </span>
                  </div>
                  {i < flow.length - 1 ? (
                    <span
                      className={`mx-2 h-0.5 flex-1 ${i < currentIdx ? "bg-brand-600" : "bg-slate-200"}`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-5 py-3 font-medium">Part</th>
                <th className="px-5 py-3 font-medium">Condition</th>
                <th className="px-5 py-3 text-right font-medium">Qty</th>
                <th className="px-5 py-3 text-right font-medium">Unit</th>
                <th className="px-5 py-3 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.lines.map((l) => (
                <tr key={l.partNumber}>
                  <td className="px-5 py-3">
                    <Link
                      href={`/catalog/${l.partNumber}`}
                      className="mono font-medium text-brand-600 hover:text-brand-500"
                    >
                      {l.partNumber}
                    </Link>
                    <span className="block text-xs text-slate-500">{l.description}</span>
                  </td>
                  <td className="px-5 py-3">
                    <ConditionBadge code={l.condition} />
                  </td>
                  <td className="px-5 py-3 text-right text-slate-600">{l.quantity}</td>
                  <td className="px-5 py-3 text-right text-slate-600">{usd(l.unitPriceUsd)}</td>
                  <td className="px-5 py-3 text-right font-medium text-ink">
                    {usd(l.unitPriceUsd * l.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <div className="space-y-6">
          {order.shipment ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink">Shipment</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Carrier</dt>
                  <dd className="font-medium text-ink">{order.shipment.carrier}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tracking</dt>
                  <dd className="mono font-medium text-ink">{order.shipment.tracking}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Origin</dt>
                  <dd className="mono text-slate-600">{order.shipment.origin}</dd>
                </div>
                {order.shipment.estDelivery ? (
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Est. delivery</dt>
                    <dd className="font-medium text-ink">
                      {shortDate(order.shipment.estDelivery)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Documents</h2>
            <ul className="mt-3 space-y-2">
              {order.documents.map((d) => (
                <li key={d}>
                  <button className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                    {d}
                    <span className="text-xs text-brand-600">Download</span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
