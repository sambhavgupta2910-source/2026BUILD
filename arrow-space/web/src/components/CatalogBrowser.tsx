"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  parts,
  ataChapters,
  aircraftTypes,
  totalStock,
  bestLeadTime,
} from "@/lib/data/parts";
import { manufacturerName } from "@/lib/data/manufacturers";
import { Badge, ConditionBadge, SourceBadge } from "@/components/ui";
import { usd } from "@/lib/format";
import type { Part } from "@/lib/types";

type SourceFilter = "ALL" | "OWN" | "DISTRIBUTED";
type Sort = "relevance" | "price-asc" | "price-desc" | "stock";

function matches(part: Part, q: string): boolean {
  if (!q) return true;
  const hay = [
    part.partNumber,
    part.description,
    part.category,
    part.ataChapter,
    manufacturerName(part.manufacturerId),
    ...part.aircraft,
    ...part.alternates,
  ]
    .join(" ")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term));
}

function PartRow({ part }: { part: Part }) {
  const stock = totalStock(part);
  const lead = bestLeadTime(part);
  return (
    <Link
      href={`/catalog/${part.partNumber}`}
      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-sm sm:flex-row sm:items-center"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono text-sm font-semibold text-brand-700 group-hover:text-brand-600">
            {part.partNumber}
          </span>
          <SourceBadge source={part.source} />
        </div>
        <div className="mt-1 font-medium text-ink">{part.description}</div>
        <div className="mt-1 text-xs text-slate-500">
          {manufacturerName(part.manufacturerId)} · {part.ataChapter} ·{" "}
          {part.aircraft.join(", ")}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {part.conditions.map((c) => (
            <ConditionBadge key={c} code={c} />
          ))}
        </div>
      </div>

      <div className="shrink-0 text-left sm:w-44 sm:text-right">
        <div className="text-xs text-slate-400">From</div>
        <div className="text-lg font-semibold text-ink">
          {usd(part.unitPriceUsd)}
        </div>
        <div className="text-xs text-slate-500">per {part.uom}</div>
        <div className="mt-2">
          {stock > 0 ? (
            <Badge tone="green">
              {stock} in stock · {lead}d
            </Badge>
          ) : (
            <Badge tone="amber">Request quote</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}

export function CatalogBrowser() {
  const initialQ = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initialQ);
  const [source, setSource] = useState<SourceFilter>("ALL");
  const [ata, setAta] = useState("");
  const [aircraft, setAircraft] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<Sort>("relevance");

  const results = useMemo(() => {
    let list = parts.filter((p) => matches(p, q));
    if (source !== "ALL") list = list.filter((p) => p.source === source);
    if (ata) list = list.filter((p) => p.ataChapter === ata);
    if (aircraft) list = list.filter((p) => p.aircraft.includes(aircraft));
    if (inStockOnly) list = list.filter((p) => totalStock(p) > 0);

    const sorted = [...list];
    if (sort === "price-asc") sorted.sort((a, b) => a.unitPriceUsd - b.unitPriceUsd);
    if (sort === "price-desc") sorted.sort((a, b) => b.unitPriceUsd - a.unitPriceUsd);
    if (sort === "stock") sorted.sort((a, b) => totalStock(b) - totalStock(a));
    return sorted;
  }, [q, source, ata, aircraft, inStockOnly, sort]);

  const sourceTabs: { id: SourceFilter; label: string }[] = [
    { id: "ALL", label: "All sources" },
    { id: "OWN", label: "Arrow Space line" },
    { id: "DISTRIBUTED", label: "Distributed" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Filters */}
      <aside className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Search
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Part #, name, aircraft…"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Source
          </span>
          <div className="flex flex-col gap-1">
            {sourceTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSource(t.id)}
                className={`rounded-lg px-3 py-1.5 text-left text-sm transition ${
                  source === t.id
                    ? "bg-brand-50 font-medium text-brand-700 ring-1 ring-brand-200"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            ATA chapter
          </label>
          <select
            value={ata}
            onChange={(e) => setAta(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All chapters</option>
            {ataChapters.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Aircraft
          </label>
          <select
            value={aircraft}
            onChange={(e) => setAircraft(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">All platforms</option>
            {aircraftTypes.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setInStockOnly(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
          />
          In stock only
        </label>
      </aside>

      {/* Results */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-ink">{results.length}</span>{" "}
            part{results.length === 1 ? "" : "s"}
          </p>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
            <option value="stock">Most in stock</option>
          </select>
        </div>

        <div className="space-y-3">
          {results.map((p) => (
            <PartRow key={p.partNumber} part={p} />
          ))}
          {results.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="font-medium text-ink">No parts match your filters.</p>
              <p className="mt-1 text-sm text-slate-500">
                Try a different part number, or submit a quote request and our
                desk will source it.
              </p>
              <Link
                href="/aog"
                className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
              >
                Request a quote
              </Link>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
