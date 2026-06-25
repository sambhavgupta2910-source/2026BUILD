import { Container, PageTitle, Badge, Link } from "@/components/ui";
import { consoleData, queue } from "@/lib/server/dataset";

export const dynamic = "force-dynamic";

function channelTone(channel: string): "navy" | "steel" {
  return channel === "portal" ? "navy" : "steel";
}

export default function QueuePage() {
  const rfqs = queue();
  const { customerById, liveSources } = consoleData();

  const aog = rfqs.filter((r) => r.urgency === "aog").length;
  const live = liveSources.size;
  const flagged = rfqs.filter((r) => r.export_control_review).length;

  return (
    <Container className="py-12">
      <PageTitle
        sub={`${rfqs.length} RFQs across all channels · ${aog} AOG · ${flagged} export-control · ${live} live (web/portal)`}
      >
        RFQ queue
      </PageTitle>

      <div className="overflow-hidden rounded-lg border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-paper text-left text-xs uppercase tracking-wider text-steel">
            <tr>
              <th className="px-4 py-3 font-semibold">RFQ</th>
              <th className="px-4 py-3 font-semibold">Channel</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Urgency</th>
              <th className="px-4 py-3 font-semibold">Lines</th>
              <th className="px-4 py-3 font-semibold">Flags</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rfqs.slice(0, 200).map((r) => {
              const customer = customerById.get(r.customer_id);
              return (
                <tr key={r.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/rfq/${r.id}`} className="font-mono text-azure hover:underline">
                      {r.id}
                    </Link>
                    {liveSources.get(r.id) ? (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-gold">live</span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={channelTone(r.channel)}>{r.channel}</Badge>
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {customer?.name ?? r.customer_id}
                    <span className="ml-1 text-xs text-muted">· {r.end_user_type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.urgency === "aog" ? "warn" : r.urgency === "critical" ? "gold" : "steel"}>
                      {r.urgency}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-ink">{r.lines.length}</td>
                  <td className="px-4 py-3">
                    {r.export_control_review ? <Badge tone="warn">export-control</Badge> : <span className="text-xs text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3 text-ink">{r.status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Container>
  );
}
