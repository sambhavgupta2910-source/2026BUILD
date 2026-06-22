import Link from "next/link";
import {
  Card,
  PageHeader,
  PriorityBadge,
  StatCard,
  StatusBadge,
} from "@/components/ui";
import { orders, orderTotal } from "@/lib/data/orders";
import { quotes } from "@/lib/data/quotes";
import { account } from "@/lib/data/account";
import { usd, shortDate } from "@/lib/format";

export default function DashboardPage() {
  const openOrders = orders.filter(
    (o) => o.status !== "Delivered",
  ).length;
  const activeQuotes = quotes.filter(
    (q) => q.status === "Submitted" || q.status === "Quoted",
  ).length;
  const aogOpen = [...orders, ...quotes].filter(
    (x) => x.priority === "AOG",
  ).length;
  const creditAvailable =
    account.org.creditLimitUsd - account.org.creditUsedUsd;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${account.contact.name.split(" ")[0]}`}
        description={`${account.org.name} · ${account.org.accountNumber}`}
        actions={
          <Link
            href="/catalog"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            Find a part
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open orders" value={openOrders} sub="In progress" tone="brand" />
        <StatCard label="Active quotes" value={activeQuotes} sub="Awaiting action" tone="sky" />
        <StatCard
          label="AOG / urgent"
          value={aogOpen}
          sub={aogOpen > 0 ? "Needs attention" : "All clear"}
          tone={aogOpen > 0 ? "red" : "green"}
        />
        <StatCard
          label="Credit available"
          value={usd(creditAvailable)}
          sub={`${account.org.terms} terms`}
          tone="slate"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
            <Link href="/orders" className="text-sm font-medium text-brand-600 hover:text-brand-500">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {orders.slice(0, 4).map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="mono text-sm font-medium text-ink">{o.id}</span>
                    <PriorityBadge priority={o.priority} />
                  </div>
                  <div className="truncate text-xs text-slate-500">
                    {o.lines.length} line{o.lines.length > 1 ? "s" : ""} ·{" "}
                    {o.lines[0].description}
                    {o.lines.length > 1 ? " + more" : ""}
                  </div>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-ink">
                    {usd(orderTotal(o))}
                  </div>
                  <div className="text-xs text-slate-400">{shortDate(o.placedDate)}</div>
                </div>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Active quotes</h2>
            <Link href="/quotes" className="text-sm font-medium text-brand-600 hover:text-brand-500">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {quotes
              .filter((q) => q.status === "Submitted" || q.status === "Quoted")
              .map((q) => (
                <Link
                  key={q.id}
                  href={`/quotes/${q.id}`}
                  className="block px-5 py-3 hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="mono text-sm font-medium text-ink">{q.id}</span>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {q.lines[0].description}
                  </div>
                  <div className="mt-1">
                    <PriorityBadge priority={q.priority} />
                  </div>
                </Link>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
