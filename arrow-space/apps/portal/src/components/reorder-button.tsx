"use client";

import { useState } from "react";

interface ReorderOk {
  ok: true;
  id: string;
  channel: string;
  export_control_review: boolean;
  message: string;
}
interface ReorderErr {
  ok: false;
  error: string;
}

export function ReorderButton({
  partId,
  condition,
  qty = 1,
}: {
  partId: string;
  condition: string;
  qty?: number;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReorderOk | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reorder() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reorder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [{ part_id: partId, qty, condition }] }),
      });
      const data: ReorderOk | ReorderErr = await res.json();
      if (data.ok) setResult(data);
      else setError(data.error);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="text-xs">
        <span className="font-medium text-ok">Inquiry sent</span>{" "}
        <span className="font-mono text-muted">{result.id}</span>
        {result.export_control_review ? (
          <span className="ml-1 text-gold">· export-control review</span>
        ) : null}
        <p className="mt-0.5 text-muted">No price — Arrow will respond.</p>
      </div>
    );
  }

  return (
    <div className="text-right">
      <button
        onClick={reorder}
        disabled={busy}
        className="rounded-md border border-navy bg-navy px-3 py-1.5 text-xs font-semibold text-white hover:bg-steel disabled:opacity-60"
      >
        {busy ? "Sending…" : "Reorder"}
      </button>
      {error ? <p className="mt-1 text-xs text-gold">{error}</p> : null}
    </div>
  );
}
