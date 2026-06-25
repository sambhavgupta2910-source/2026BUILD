"use client";

import { useState } from "react";

interface Option {
  id: string;
  name: string;
  type: string;
}

export function LoginForm({ customers }: { customers: Option[] }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customer_id: customerId }),
      });
      const data: { ok: boolean; error?: string } = await res.json();
      if (data.ok) window.location.href = "/";
      else setError(data.error ?? "Sign-in failed");
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  if (customers.length === 0) {
    return (
      <p className="text-sm text-muted">
        No portal-enabled synthetic accounts found. Run <code>pnpm gen:synthetic</code> first.
      </p>
    );
  }

  return (
    <form onSubmit={signIn} className="space-y-4">
      <div>
        <label htmlFor="account" className="block text-xs font-semibold uppercase tracking-wider text-steel">
          Choose a demo account
        </label>
        <select
          id="account"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-azure focus:ring-2 focus:ring-azure/20"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.type}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-sm text-gold">{error}</p> : null}
      <button
        type="submit"
        disabled={busy}
        className="inline-flex items-center justify-center rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-steel disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Enter portal"}
      </button>
    </form>
  );
}
