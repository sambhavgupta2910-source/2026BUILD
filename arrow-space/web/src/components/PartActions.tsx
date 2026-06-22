"use client";

import { useState } from "react";
import Link from "next/link";

export function PartActions({ partNumber }: { partNumber: string }) {
  const [added, setAdded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setAdded(true)}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
      >
        {added ? "Added to order ✓" : "Add to order"}
      </button>
      <Link
        href={`/aog?part=${encodeURIComponent(partNumber)}`}
        className="block w-full rounded-lg border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Request a quote
      </Link>
      {added ? (
        <p className="text-center text-xs text-slate-500">
          Demo only — no live cart or checkout is wired up yet.
        </p>
      ) : null}
    </div>
  );
}
