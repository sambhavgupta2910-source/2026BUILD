import Link from "next/link";
import { PageHeader, PriorityBadge, StatusBadge, Card } from "@/components/ui";
import { orders, orderTotal } from "@/lib/data/orders";
import { shortDate, usd } from "@/lib/format";

export const metadata = { title: "Orders" };

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Track every order through approval, picking, shipment, and delivery — with documents per shipment."
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">PO</th>
              <th className="px-5 py-3 font-medium">Ship to</th>
              <th className="px-5 py-3 font-medium">Placed</th>
              <th className="px-5 py-3 text-right font-medium">Value</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/orders/${o.id}`}
                    className="mono font-medium text-brand-600 hover:text-brand-500"
                  >
                    {o.id}
                  </Link>
                </td>
                <td className="px-5 py-3 mono text-xs text-slate-500">{o.poNumber}</td>
                <td className="px-5 py-3 text-slate-600">{o.shipTo}</td>
                <td className="px-5 py-3 text-slate-600">{shortDate(o.placedDate)}</td>
                <td className="px-5 py-3 text-right font-medium text-ink">
                  {usd(orderTotal(o))}
                </td>
                <td className="px-5 py-3">
                  <PriorityBadge priority={o.priority} />
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
