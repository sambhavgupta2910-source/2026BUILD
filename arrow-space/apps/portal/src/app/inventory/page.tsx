import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, PageTitle, Badge, EmptyState } from "@/components/ui";
import { currentCustomer } from "@/lib/server/session";
import { inventoryOf } from "@/lib/server/dataset";
import { ReorderButton } from "@/components/reorder-button";

export const metadata: Metadata = { title: "My inventory" };

export default async function InventoryPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/login");
  const rows = inventoryOf(customer.id);

  return (
    <Container className="py-12">
      <PageTitle sub="Parts you own or have bought from Arrow. Traceability is shown where it exists — never fabricated.">
        My inventory
      </PageTitle>

      {rows.length === 0 ? (
        <EmptyState>No inventory on file yet. Parts you order will appear here.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-steel">
              <tr>
                <th className="px-4 py-3 font-semibold">Part</th>
                <th className="px-4 py-3 font-semibold">Cond.</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">On aircraft</th>
                <th className="px-4 py-3 font-semibold">Traceability</th>
                <th className="px-4 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map(({ inventory, part, aircraft, traceDocs }) => (
                <tr key={inventory.id}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-ink">{part?.oem_part_number ?? inventory.part_id}</p>
                    <p className="text-xs text-muted">{part?.description ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-ink">{inventory.condition}</td>
                  <td className="px-4 py-3 text-ink">{inventory.qty_on_hand}</td>
                  <td className="px-4 py-3 text-muted">{aircraft?.registration ?? "—"}</td>
                  <td className="px-4 py-3">
                    {traceDocs.length === 0 ? (
                      <span className="text-xs text-muted">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {traceDocs.map((t) => (
                          <Badge key={t.id}>{t.type}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {part ? (
                      <ReorderButton partId={part.id} condition={inventory.condition} />
                    ) : (
                      <span className="text-xs text-muted">unavailable</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-muted">
        Reorder creates an inquiry (an RFQ) into Arrow&apos;s desk — no price is shown or charged. The
        margin floor and human approval still apply to any resulting quote.
      </p>
    </Container>
  );
}
