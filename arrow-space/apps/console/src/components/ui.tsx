import Link from "next/link";
import type { ReactNode } from "react";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-line bg-card p-5 shadow-[0_1px_2px_rgba(10,22,38,0.04)] ${className}`}>
      {children}
    </div>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{children}</h1>
      {sub ? <p className="mt-2 text-sm text-muted">{sub}</p> : null}
    </div>
  );
}

type Tone = "steel" | "gold" | "ok" | "warn" | "navy";

export function Badge({ children, tone = "steel" }: { children: ReactNode; tone?: Tone }) {
  const color =
    tone === "gold"
      ? "text-gold"
      : tone === "ok"
        ? "text-ok"
        : tone === "warn"
          ? "text-warn"
          : tone === "navy"
            ? "text-navy"
            : "text-steel";
  return (
    <span className={`inline-flex items-center rounded border border-line bg-white px-2 py-0.5 font-mono text-xs ${color}`}>
      {children}
    </span>
  );
}

export { Link };
