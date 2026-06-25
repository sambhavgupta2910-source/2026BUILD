"use client";

import { useState } from "react";

export function ApproveButton({ rfqId, disabled }: { rfqId: string; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quote/approve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rfq_id: rfqId, approver: "operator (demo)" }),
      });
      const data: { ok: boolean; error?: string } = await res.json();
      if (data.ok) window.location.reload();
      else setError(data.error ?? "Approval failed");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span>
      <button
        onClick={approve}
        disabled={busy || disabled}
        title={disabled ? "Below margin floor — cannot approve for send" : undefined}
        className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-steel disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Approving…" : "Approve price (human)"}
      </button>
      {error ? <span className="ml-3 text-xs text-warn">{error}</span> : null}
    </span>
  );
}
