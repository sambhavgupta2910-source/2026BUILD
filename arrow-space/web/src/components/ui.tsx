import type { ReactNode } from "react";
import { conditionLabel } from "@/lib/format";

type Tone =
  | "brand"
  | "slate"
  | "green"
  | "amber"
  | "red"
  | "violet"
  | "sky";

const toneClasses: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  sky: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function Badge({
  children,
  tone = "slate",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "slate",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: Tone;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {sub ? (
        <div className="mt-1">
          {typeof sub === "string" ? <Badge tone={tone}>{sub}</Badge> : sub}
        </div>
      ) : null}
    </Card>
  );
}

export function SourceBadge({ source }: { source: "OWN" | "DISTRIBUTED" }) {
  return source === "OWN" ? (
    <Badge tone="brand">Arrow Space line</Badge>
  ) : (
    <Badge tone="slate">Distributed</Badge>
  );
}

export function ConditionBadge({ code }: { code: string }) {
  const tone: Tone = code === "NEW" ? "green" : code === "AR" ? "amber" : "sky";
  return (
    <Badge tone={tone}>
      <span className="font-semibold">{code}</span>
      <span className="text-[10px] opacity-70">{conditionLabel(code)}</span>
    </Badge>
  );
}

const statusTone: Record<string, Tone> = {
  Delivered: "green",
  Shipped: "sky",
  Confirmed: "brand",
  Picking: "violet",
  "Pending Approval": "amber",
  Backorder: "amber",
  Quote: "slate",
  Submitted: "slate",
  Quoted: "sky",
  Accepted: "green",
  Expired: "red",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone[status] ?? "slate"}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "AOG") {
    return (
      <Badge tone="red">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        AOG
      </Badge>
    );
  }
  if (priority === "Expedite") return <Badge tone="amber">Expedite</Badge>;
  return <Badge tone="slate">Routine</Badge>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
