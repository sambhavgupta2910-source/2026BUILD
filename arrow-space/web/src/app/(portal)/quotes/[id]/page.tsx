import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote, quotes } from "@/lib/data/quotes";
import {
  Badge,
  Card,
  ConditionBadge,
  PriorityBadge,
  StatusBadge,
} from "@/components/ui";
import { usd, shortDate } from "@/lib/format";

export function generateStaticParams() {
  return quotes.map((q) => ({ id: q.id }));
}

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const quote = getQuote(decodeURIComponent(id));
  if (!quote) notFound();

  const quoted = quote.status === "Quoted";
  const total = quote.lines.reduce(
    (sum, l) => sum + (l.quotedUnitPriceUsd ?? 0) * l.quantity,
    0,
  );

  return (
    <div className="space-y-6">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500"
      >
        ← Back to quotes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="mono text-2xl font-semibold text-ink">{quote.id}</h1>
            <StatusBadge status={quote.status} />
            <PriorityBadge priority={quote.priority} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Requested {shortDate(quote.requestedDate)} by {quote.buyer}
            {quote.validUntil ? ` · valid until ${shortDate(quote.validUntil)}` : ""}
          </p>
        </div>
        {quoted ? (
          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500">
            Accept & convert to order
          </button>
        ) : null}
      </div>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">Part</th>
              <th className="px-5 py-3 font-medium">Condition</th>
              <th className="px-5 py-3 text-right font-medium">Qty</th>
              <th className="px-5 py-3 text-right font-medium">Quoted unit</th>
              <th className="px-5 py-3 text-right font-medium">Lead time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quote.lines.map((l) => (
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
                <td className="px-5 py-3 text-right font-medium text-ink">
                  {l.quotedUnitPriceUsd ? usd(l.quotedUnitPriceUsd) : "—"}
                </td>
                <td className="px-5 py-3 text-right text-slate-600">
                  {l.leadTimeDays ? `${l.leadTimeDays} days` : "TBC"}
                </td>
              </tr>
            ))}
          </tbody>
          {quoted ? (
            <tfoot>
              <tr className="border-t border-slate-200">
                <td colSpan={4} className="px-5 py-3 text-right text-sm font-medium text-slate-500">
                  Quote total
                </td>
                <td className="px-5 py-3 text-right text-base font-semibold text-ink">
                  {usd(total)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </Card>

      {quote.note ? (
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-ink">Desk note</h2>
          <p className="mt-2 text-sm text-slate-600">{quote.note}</p>
          {quote.priority === "AOG" ? (
            <div className="mt-3">
              <Badge tone="red">Routed to AOG desk</Badge>
            </div>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
