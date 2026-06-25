import { redirect } from "next/navigation";
import Link from "next/link";
import { Container, PageTitle, StatLink, Card, Badge } from "@/components/ui";
import { currentCustomer } from "@/lib/server/session";
import { fleetOf, inventoryOf, ordersOf } from "@/lib/server/dataset";

export default async function DashboardPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/login");

  const fleet = fleetOf(customer.id);
  const inventory = inventoryOf(customer.id);
  const orders = ordersOf(customer.id);
  const recent = orders.slice(0, 5);

  return (
    <Container className="py-12">
      <PageTitle sub={`${customer.name} · ${customer.type} · ${customer.country}`}>
        Overview
      </PageTitle>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatLink href="/fleet" label="Aircraft in fleet" value={fleet.length} />
        <StatLink href="/inventory" label="Inventory lines" value={inventory.length} />
        <StatLink href="/orders" label="Orders" value={orders.length} />
      </div>

      <div className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Recent orders</h2>
          <Link href="/orders" className="text-sm font-medium text-azure hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <Card>No orders yet.</Card>
        ) : (
          <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
            {recent.map((o) => (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-paper">
                <div>
                  <p className="font-mono text-sm text-ink">{o.id}</p>
                  <p className="text-xs text-muted">{new Date(o.placed_at).toLocaleDateString()} · {o.lines.length} line(s)</p>
                </div>
                <Badge tone={o.status === "closed" || o.status === "delivered" ? "ok" : "steel"}>{o.status}</Badge>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Card className="mt-10">
        <h3 className="text-sm font-semibold text-ink">Reordering</h3>
        <p className="mt-1.5 text-sm text-muted">
          From <Link href="/inventory" className="text-azure hover:underline">My inventory</Link> you
          can reorder any part you&apos;ve bought before. A reorder is an inquiry: it goes to Arrow&apos;s
          desk, we source it, and we respond with a quote. No price is shown or charged automatically.
        </p>
      </Card>
    </Container>
  );
}
