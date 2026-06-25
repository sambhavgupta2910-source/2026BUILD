import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Container, PageTitle, Badge, EmptyState } from "@/components/ui";
import { currentCustomer } from "@/lib/server/session";
import { ordersOf } from "@/lib/server/dataset";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/login");
  const orders = ordersOf(customer.id);

  return (
    <Container className="py-12">
      <PageTitle sub="Your order history. This shows what was bought and when — not current pricing.">
        Orders
      </PageTitle>

      {orders.length === 0 ? (
        <EmptyState>No orders yet.</EmptyState>
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-card">
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between p-4 hover:bg-paper">
              <div>
                <p className="font-mono text-sm text-ink">{o.id}</p>
                <p className="text-xs text-muted">
                  {new Date(o.placed_at).toLocaleDateString()} · {o.lines.length} line(s) ·{" "}
                  {o.trace_doc_ids.length} trace doc(s)
                </p>
              </div>
              <Badge tone={o.status === "closed" || o.status === "delivered" ? "ok" : "steel"}>{o.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
