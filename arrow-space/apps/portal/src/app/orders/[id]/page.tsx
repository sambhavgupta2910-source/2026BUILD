import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Container, PageTitle, Card, Badge, EmptyState } from "@/components/ui";
import { currentCustomer } from "@/lib/server/session";
import { dataset, traceDocsForOrder } from "@/lib/server/dataset";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await currentCustomer();
  if (!customer) redirect("/login");

  const { id } = await params;
  const order = dataset().orderById.get(id);
  if (!order || order.customer_id !== customer.id) notFound();

  const db = dataset();
  const traceDocs = traceDocsForOrder(order);

  return (
    <Container className="py-12">
      <Link href="/orders" className="text-sm text-azure hover:underline">
        ← Orders
      </Link>
      <PageTitle sub={`Placed ${new Date(order.placed_at).toLocaleDateString()}`}>
        <span className="font-mono">{order.id}</span>{" "}
        <Badge tone={order.status === "closed" || order.status === "delivered" ? "ok" : "steel"}>
          {order.status}
        </Badge>
      </PageTitle>

      <Card className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-ink">Lines</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-steel">
            <tr>
              <th className="py-2 font-semibold">Part</th>
              <th className="py-2 font-semibold">Cond.</th>
              <th className="py-2 font-semibold">Qty</th>
              <th className="py-2 font-semibold text-right">Price at time of order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {order.lines.map((l, i) => {
              const part = db.partById.get(l.part_id);
              return (
                <tr key={i}>
                  <td className="py-2">
                    <span className="font-mono text-ink">{part?.oem_part_number ?? l.part_id}</span>
                    <span className="ml-2 text-xs text-muted">{part?.description ?? ""}</span>
                  </td>
                  <td className="py-2 text-ink">{l.condition}</td>
                  <td className="py-2 text-ink">{l.qty}</td>
                  <td className="py-2 text-right font-mono text-muted">
                    {l.unit_price.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Historical — the price as ordered. Not a current quote.</p>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-ink">Trace pack</h2>
        {traceDocs.length === 0 ? (
          <EmptyState>No traceability documents recorded for this order.</EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {traceDocs.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-3">
                  <Badge>{t.type}</Badge>
                  <span className="text-sm text-ink">issued by {t.issued_by}</span>
                </div>
                <span className="font-mono text-xs text-muted">{t.file_ref}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </Container>
  );
}
