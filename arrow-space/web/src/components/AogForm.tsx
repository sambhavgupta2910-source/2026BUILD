"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";

const field =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const label = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export function AogForm() {
  const prefill = useSearchParams().get("part") ?? "";
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [priority, setPriority] = useState(prefill ? "AOG" : "AOG");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const ref = "RFQ-" + Math.floor(58200 + Math.random() * 600);
    setSubmitted(ref);
  }

  if (submitted) {
    return (
      <Card className="p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          ✓
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink">
          Request {submitted} received
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {priority === "AOG"
            ? "This has been routed to the AOG desk — expect a response within 20 minutes, 24/7."
            : "Our desk will respond with pricing and lead time shortly."}{" "}
          (Demo: nothing is actually sent.)
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/quotes"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
          >
            View quotes
          </Link>
          <button
            onClick={() => setSubmitted(null)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            New request
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-5">
        <div>
          <span className={label}>Priority</span>
          <div className="grid grid-cols-3 gap-2">
            {["AOG", "Expedite", "Routine"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ring-1 transition ${
                  priority === p
                    ? p === "AOG"
                      ? "bg-red-50 text-red-700 ring-red-300"
                      : "bg-brand-50 text-brand-700 ring-brand-300"
                    : "text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Part number</label>
            <input defaultValue={prefill} placeholder="e.g. HON-49-2210-11" className={`mono ${field}`} required />
          </div>
          <div>
            <label className={label}>Condition needed</label>
            <select className={field} defaultValue="NEW">
              <option value="NEW">New</option>
              <option value="OH">Overhauled</option>
              <option value="SV">Serviceable</option>
              <option value="AR">As removed</option>
            </select>
          </div>
          <div>
            <label className={label}>Quantity</label>
            <input type="number" min={1} defaultValue={1} className={field} />
          </div>
          <div>
            <label className={label}>Aircraft registration</label>
            <input placeholder="e.g. A6-SKY" className={field} />
          </div>
        </div>

        <div>
          <label className={label}>Notes for the desk</label>
          <textarea
            rows={3}
            placeholder="Tail location, exchange acceptable, required certs, target date…"
            className={field}
          />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Demo form — submission is simulated locally.
          </p>
          <button
            type="submit"
            className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white ${
              priority === "AOG" ? "bg-red-600 hover:bg-red-500" : "bg-brand-600 hover:bg-brand-500"
            }`}
          >
            Submit {priority} request
          </button>
        </div>
      </form>
    </Card>
  );
}
