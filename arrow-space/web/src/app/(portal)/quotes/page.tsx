import Link from "next/link";
import { PageHeader, PriorityBadge, StatusBadge, Card } from "@/components/ui";
import { quotes } from "@/lib/data/quotes";
import { shortDate } from "@/lib/format";

export const metadata = { title: "Quotes & RFQ" };

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotes & RFQ"
        description="Request quotes for parts not in stock or for negotiated pricing, then convert them to orders."
        actions={
          <Link
            href="/aog"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            New quote request
          </Link>
        }
      />

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="px-5 py-3 font-medium">RFQ</th>
              <th className="px-5 py-3 font-medium">Part</th>
              <th className="px-5 py-3 font-medium">Requested</th>
              <th className="px-5 py-3 font-medium">Priority</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.map((q) => (
              <tr key={q.id} className="hover:bg-slate-50">
                <td className="px-5 py-3">
                  <Link
                    href={`/quotes/${q.id}`}
                    className="mono font-medium text-brand-600 hover:text-brand-500"
                  >
                    {q.id}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="block text-ink">{q.lines[0].description}</span>
                  <span className="mono text-xs text-slate-400">
                    {q.lines[0].partNumber}
                    {q.lines.length > 1 ? ` +${q.lines.length - 1}` : ""}
                  </span>
                </td>
                <td className="px-5 py-3 text-slate-600">{shortDate(q.requestedDate)}</td>
                <td className="px-5 py-3">
                  <PriorityBadge priority={q.priority} />
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={q.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
