export function usd(value: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(value);
}

export function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const conditionLabels: Record<string, string> = {
  NEW: "New",
  OH: "Overhauled",
  SV: "Serviceable",
  AR: "As Removed",
  NE: "New Surplus",
};

export function conditionLabel(code: string): string {
  return conditionLabels[code] ?? code;
}
