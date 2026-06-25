import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container, PageTitle, Badge, EmptyState } from "@/components/ui";
import { currentCustomer } from "@/lib/server/session";
import { fleetOf } from "@/lib/server/dataset";

export const metadata: Metadata = { title: "My fleet" };

export default async function FleetPage() {
  const customer = await currentCustomer();
  if (!customer) redirect("/login");
  const fleet = fleetOf(customer.id);

  return (
    <Container className="py-12">
      <PageTitle sub="Your registered aircraft. Owned parts are matched to these airframes.">
        My fleet
      </PageTitle>

      {fleet.length === 0 ? (
        <EmptyState>No aircraft on file yet.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-steel">
              <tr>
                <th className="px-4 py-3 font-semibold">Registration</th>
                <th className="px-4 py-3 font-semibold">Type / model</th>
                <th className="px-4 py-3 font-semibold">Serial</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {fleet.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-3 font-mono text-ink">{a.registration}</td>
                  <td className="px-4 py-3 text-ink">{a.type_model}</td>
                  <td className="px-4 py-3 text-muted">{a.serial_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={a.in_service ? "ok" : "steel"}>{a.in_service ? "In service" : "Stored"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
