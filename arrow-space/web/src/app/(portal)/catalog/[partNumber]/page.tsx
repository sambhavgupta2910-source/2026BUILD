import Link from "next/link";
import { notFound } from "next/navigation";
import { getPart, parts } from "@/lib/data/parts";
import { manufacturerName } from "@/lib/data/manufacturers";
import { Badge, Card, ConditionBadge, SourceBadge } from "@/components/ui";
import { PartActions } from "@/components/PartActions";
import { usd } from "@/lib/format";

export function generateStaticParams() {
  return parts.map((p) => ({ partNumber: p.partNumber }));
}

export default async function PartPage({
  params,
}: {
  params: Promise<{ partNumber: string }>;
}) {
  const { partNumber } = await params;
  const part = getPart(decodeURIComponent(partNumber));
  if (!part) notFound();

  const spec: [string, string][] = [
    ["Manufacturer", manufacturerName(part.manufacturerId)],
    ["ATA chapter", part.ataChapter],
    ["Category", part.category],
    ["Aircraft", part.aircraft.join(", ")],
    ["Unit of measure", part.uom],
    ["Min order qty", String(part.minOrderQty)],
    ["Weight", `${part.weightKg} kg`],
    ...(part.shelfLifeMonths
      ? ([["Shelf life", `${part.shelfLifeMonths} months`]] as [string, string][])
      : []),
    ...(part.hazmat ? ([["Handling", "Hazmat / DG"]] as [string, string][]) : []),
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/catalog"
        className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-500"
      >
        ← Back to catalog
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mono text-lg font-semibold text-brand-700">
                {part.partNumber}
              </span>
              <SourceBadge source={part.source} />
              {part.hazmat ? <Badge tone="amber">Hazmat</Badge> : null}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">
              {part.description}
            </h1>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {part.conditions.map((c) => (
                <ConditionBadge key={c} code={c} />
              ))}
            </div>
          </div>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Specifications</h2>
            <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {spec.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
                  <dt className="text-sm text-slate-500">{k}</dt>
                  <dd className="text-right text-sm font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Availability</h2>
            {part.stock.length > 0 ? (
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="pb-2 font-medium">Warehouse</th>
                    <th className="pb-2 font-medium">Region</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Lead time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {part.stock.map((s) => (
                    <tr key={s.warehouse}>
                      <td className="py-2 mono font-medium text-ink">{s.warehouse}</td>
                      <td className="py-2 text-slate-600">{s.region}</td>
                      <td className="py-2 text-right text-slate-600">{s.quantity}</td>
                      <td className="py-2 text-right text-slate-600">{s.leadTimeDays} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                No stock on hand. Submit a quote request and our desk will source
                this part from the repair/exchange pool.
              </p>
            )}
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink">Certifications</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {part.certifications.map((c) => (
                  <Badge key={c} tone="brand">
                    {c}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="text-sm font-semibold text-ink">Alternates & cross-refs</h2>
              {part.alternates.length > 0 ? (
                <ul className="mt-3 space-y-1.5">
                  {part.alternates.map((alt) => {
                    const known = getPart(alt);
                    return (
                      <li key={alt}>
                        {known ? (
                          <Link
                            href={`/catalog/${alt}`}
                            className="mono text-sm font-medium text-brand-600 hover:text-brand-500"
                          >
                            {alt}
                          </Link>
                        ) : (
                          <span className="mono text-sm text-slate-600">{alt}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No alternates listed.</p>
              )}
            </Card>
          </div>
        </div>

        {/* Buy box */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="p-5">
            <div className="text-xs text-slate-400">Your contract price, from</div>
            <div className="text-3xl font-semibold text-ink">
              {usd(part.unitPriceUsd)}
            </div>
            <div className="text-xs text-slate-500">
              per {part.uom} · min order {part.minOrderQty}
            </div>
            <div className="my-4 h-px bg-slate-100" />
            <PartActions partNumber={part.partNumber} />
            <p className="mt-4 text-xs text-slate-400">
              Pricing and availability are indicative seed data for this demo.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
