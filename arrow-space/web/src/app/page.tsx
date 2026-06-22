import Link from "next/link";
import { Wordmark } from "@/components/Logo";

const features = [
  {
    title: "One catalog, every source",
    body: "Search the Arrow Space proprietary line and distributed parts from the leading aerospace manufacturers — with cross-references and alternates.",
  },
  {
    title: "Quote to order in minutes",
    body: "Request a quote on anything not listed, then convert it to a confirmed order with your contract pricing and ship-to addresses.",
  },
  {
    title: "AOG when it counts",
    body: "A dedicated 24/7 fast lane for aircraft-on-ground events, with expedited handling and live shipment tracking.",
  },
  {
    title: "Certified and traceable",
    body: "Download airworthiness and material certificates (FAA 8130-3, EASA Form 1) and invoices for every shipment.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-brand-950 text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="rounded-lg bg-white/5 px-2 py-1">
          <Wordmark light />
        </div>
        <Link
          href="/dashboard"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-950 transition hover:bg-brand-100"
        >
          Sign in
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-10 pt-12 sm:pt-20">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-300">
          Aerospace parts & aftermarket services
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          The procurement portal for aircraft parts, quotes, and AOG support.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-brand-100">
          Arrow Space gives airlines, MROs, and operators a single browser-based
          workspace to source parts, see contract pricing and availability,
          place orders, and track everything through delivery and certification.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-400"
          >
            Enter the portal
          </Link>
          <Link
            href="/catalog"
            className="rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Browse the catalog
          </Link>
          <span className="text-xs text-brand-300">
            Demo environment · seeded data
          </span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-6"
            >
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-100">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-brand-300">
          <span>© {new Date().getFullYear()} Arrow Space — demo prototype</span>
          <span>Not for operational use · seeded sample data only</span>
        </div>
      </footer>
    </div>
  );
}
