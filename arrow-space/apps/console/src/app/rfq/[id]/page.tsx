import { notFound } from "next/navigation";
import { Container, PageTitle, Card, Badge, Link } from "@/components/ui";
import { consoleData, getRfq } from "@/lib/server/dataset";
import { getApproval } from "@/lib/server/approvals";
import { suggestedMarginPct } from "@/lib/margins";
import { buildDraftQuote } from "@arrow-space/engine";
import { canQuoteBeSent } from "@arrow-space/schema";
import { ApproveButton } from "@/components/approve-button";

export const dynamic = "force-dynamic";

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rfq = getRfq(id);
  if (!rfq) notFound();

  const data = consoleData();
  const customer = data.customerById.get(rfq.customer_id);

  const { quote, warnings, chosen } = buildDraftQuote(rfq, {
    partIdByNumber: (pn) => data.partByNumber.get(pn)?.id,
    supplierPathsFor: (pid) => data.pathsByPart.get(pid) ?? [],
    marginPctFor: (pid) => {
      const p = data.partById.get(pid);
      return p ? suggestedMarginPct(p) : 0.15;
    },
    now: new Date(rfq.received_at),
    idSuffix: rfq.id.slice(-6),
  });

  const approval = getApproval(rfq.id);
  const approved = Boolean(approval);
  const sendable = quote ? canQuoteBeSent({ margin_floor_ok: quote.margin_floor_ok, approved_by_human: approved }) : false;

  return (
    <Container className="py-12">
      <Link href="/" className="text-sm text-azure hover:underline">
        ← RFQ queue
      </Link>
      <PageTitle sub={`${customer?.name ?? rfq.customer_id} · ${rfq.end_user_type} · received ${new Date(rfq.received_at).toLocaleString()}`}>
        <span className="font-mono">{rfq.id}</span>{" "}
        <Badge tone={rfq.channel === "portal" ? "navy" : "steel"}>{rfq.channel}</Badge>{" "}
        <Badge tone={rfq.urgency === "aog" ? "warn" : rfq.urgency === "critical" ? "gold" : "steel"}>{rfq.urgency}</Badge>
      </PageTitle>

      {rfq.export_control_review ? (
        <div className="mb-6 rounded-md border border-warn/40 bg-warn/5 p-4 text-sm text-ink">
          <strong className="text-warn">Export-control review required.</strong> US-origin (or unknown
          origin) to a {rfq.end_user_type} end-user. Complete end-use review + ITAR/EAR classification
          and obtain human sign-off before any release. The platform assists; it never bypasses a control.
        </div>
      ) : null}

      {rfq.clarifications_needed.length > 0 ? (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-ink">Clarifications needed</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            {rfq.clarifications_needed.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Requested lines</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-steel">
            <tr>
              <th className="py-2 font-semibold">Part number</th>
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 font-semibold">Qty</th>
              <th className="py-2 font-semibold">Cond.</th>
              <th className="py-2 font-semibold">ATA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rfq.lines.map((l, i) => {
              const part = data.partByNumber.get(l.part_number);
              return (
                <tr key={i}>
                  <td className="py-2 font-mono text-ink">{l.part_number}</td>
                  <td className="py-2 text-muted">{part?.description ?? "— not in catalogue —"}</td>
                  <td className="py-2 text-ink">{l.qty}</td>
                  <td className="py-2 text-ink">{l.condition}</td>
                  <td className="py-2 text-ink">{l.ata_chapter || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Draft quote */}
      <Card className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Draft quote <span className="ml-2 rounded bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">DRAFT — not sent</span>
          </h2>
          {quote ? (
            <Badge tone={quote.margin_floor_ok ? "ok" : "warn"}>
              {quote.margin_floor_ok ? "meets margin floor" : "below margin floor"}
            </Badge>
          ) : null}
        </div>

        {!quote ? (
          <p className="text-sm text-muted">Cannot draft a quote — no priceable lines.</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-steel">
                <tr>
                  <th className="py-2 font-semibold">Part</th>
                  <th className="py-2 font-semibold">Supplier path</th>
                  <th className="py-2 font-semibold text-right">Unit cost</th>
                  <th className="py-2 font-semibold text-right">Margin</th>
                  <th className="py-2 font-semibold text-right">Unit price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {quote.lines.map((ql, i) => {
                  const part = data.partById.get(ql.part_id);
                  const sp = chosen[i]?.supplier_path;
                  return (
                    <tr key={i}>
                      <td className="py-2 font-mono text-ink">{part?.oem_part_number ?? ql.part_id}</td>
                      <td className="py-2">
                        <Badge>{sp?.source_type ?? "—"}</Badge>
                      </td>
                      <td className="py-2 text-right font-mono text-muted">
                        {sp ? `${sp.currency} ${sp.unit_cost.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2 text-right text-ink">{Math.round(ql.margin_pct * 1000) / 10}%</td>
                      <td className="py-2 text-right font-mono text-ink">{ql.unit_price.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-right text-sm text-ink">
              Draft total: <span className="font-mono font-semibold">{quote.total.toLocaleString()}</span>
            </p>
            {warnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-warn">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </Card>

      {/* Human approval gate */}
      {quote ? (
        <Card className="mb-6">
          <h2 className="text-sm font-semibold text-ink">Price approval (human)</h2>
          <p className="mt-1.5 text-sm text-muted">
            No quote is sent automatically. A quote may go to the customer only when it clears the
            margin floor <em>and</em> a human approves it.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <Badge tone={sendable ? "ok" : "warn"}>
              {sendable ? "Cleared to send (manually)" : approved ? "Approved but below floor — cannot send" : "Awaiting human approval"}
            </Badge>
            {approved ? (
              <span className="text-xs text-muted">
                approved by {approval?.approver} · {approval ? new Date(approval.at).toLocaleString() : ""}
              </span>
            ) : (
              <ApproveButton rfqId={rfq.id} disabled={!quote.margin_floor_ok} />
            )}
          </div>
          {!quote.margin_floor_ok && !approved ? (
            <p className="mt-3 text-xs text-warn">
              Below the margin floor — renegotiate cost or margin before this can be approved for send.
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* Vendor sourcing handoff */}
      {quote ? (
        <Card>
          <h2 className="text-sm font-semibold text-ink">Vendor sourcing handoff</h2>
          <p className="mt-1.5 text-sm text-muted">
            Draft sourcing requests to route to vendors. <strong>Dispatch via your authorized
            channel</strong> — the platform drafts and routes; it does not order from OEM / Textron /
            David Clark channels.
          </p>
          <ul className="mt-4 space-y-2">
            {quote.lines.map((ql, i) => {
              const part = data.partById.get(ql.part_id);
              const sp = chosen[i]?.supplier_path;
              const line = rfq.lines.find((l) => data.partByNumber.get(l.part_number)?.id === ql.part_id);
              return (
                <li key={i} className="rounded-md border border-line bg-paper p-3 font-mono text-xs text-ink">
                  SOURCE {line?.qty ?? "?"} × {part?.oem_part_number ?? ql.part_id} ({line?.condition ?? "?"}) via{" "}
                  {sp?.source_type ?? "?"} — target ~{sp ? `${sp.currency} ${sp.unit_cost.toLocaleString()}` : "?"} ·
                  lead {sp?.lead_time_days ?? "?"}d
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}
    </Container>
  );
}
