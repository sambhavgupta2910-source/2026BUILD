"use client";

import { useState } from "react";
import { CONDITIONS, END_USER_TYPES } from "@/lib/content";

type Variant = "rfq" | "aog";

interface LineState {
  part_number: string;
  qty: string;
  condition: string;
  ata_chapter: string;
}

interface IntakeOk {
  ok: true;
  id: string;
  urgency: string;
  export_control_review: boolean;
  clarifications_needed: string[];
  aog_sla_minutes: number | null;
  message: string;
}
interface IntakeErr {
  ok: false;
  error: string;
  issues?: { formErrors: string[]; fieldErrors: Record<string, string[]> };
}

const emptyLine = (): LineState => ({ part_number: "", qty: "1", condition: "NEW", ata_chapter: "" });

const inputCls =
  "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-azure focus:ring-2 focus:ring-azure/20";
const labelCls = "block text-xs font-semibold uppercase tracking-wider text-steel";

export function IntakeForm({ variant }: { variant: Variant }) {
  const isAog = variant === "aog";
  const endpoint = isAog ? "/api/aog" : "/api/rfq";

  const [lines, setLines] = useState<LineState[]>([emptyLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeOk | null>(null);
  const [error, setError] = useState<IntakeErr | null>(null);

  function updateLine(i: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }
  function removeLine(i: number) {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      organisation: String(form.get("organisation") ?? ""),
      end_user_type: String(form.get("end_user_type") ?? ""),
      contact_email: String(form.get("contact_email") ?? ""),
      contact_phone: String(form.get("contact_phone") ?? ""),
      message: String(form.get("message") ?? ""),
      tail_number: isAog ? String(form.get("tail_number") ?? "") : undefined,
      aircraft_type: isAog ? String(form.get("aircraft_type") ?? "") : undefined,
      urgency: isAog ? undefined : String(form.get("urgency") ?? "routine"),
      lines: lines.map((l) => ({
        part_number: l.part_number,
        qty: Number(l.qty),
        condition: l.condition,
        ...(l.ata_chapter.trim() === "" ? {} : { ata_chapter: Number(l.ata_chapter) }),
      })),
    };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: IntakeOk | IntakeErr = await res.json();
      if (data.ok) setResult(data);
      else setError(data);
    } catch {
      setError({ ok: false, error: "Network error — please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-line bg-white p-6">
        <h3 className="text-lg font-semibold text-ink">Request received</h3>
        <p className="mt-2 text-sm text-muted">{result.message}</p>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-steel">Reference</dt>
            <dd className="font-mono text-ink">{result.id}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-steel">Urgency</dt>
            <dd className="text-ink">{result.urgency.toUpperCase()}</dd>
          </div>
          {result.aog_sla_minutes !== null ? (
            <div>
              <dt className="text-xs uppercase tracking-wider text-steel">AOG response target</dt>
              <dd className="text-ink">{result.aog_sla_minutes} minutes</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs uppercase tracking-wider text-steel">Export-control review</dt>
            <dd className="text-ink">{result.export_control_review ? "Required — human sign-off" : "Not flagged"}</dd>
          </div>
        </dl>
        {result.clarifications_needed.length > 0 ? (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wider text-steel">We may follow up on</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
              {result.clarifications_needed.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="mt-6 text-xs text-muted">
          No price is generated automatically. Arrow confirms pricing and any compliance release.
        </p>
      </div>
    );
  }

  const fieldErrors = error?.issues?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error ? (
        <div className="rounded-md border border-gold/40 bg-gold/5 p-4 text-sm text-ink">
          {error.error}
          {error.issues?.formErrors?.length ? (
            <ul className="mt-1 list-disc pl-5">
              {error.issues.formErrors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelCls} htmlFor="organisation">Organisation</label>
          <input id="organisation" name="organisation" className={inputCls} required />
          {fieldErrors.organisation ? (
            <p className="mt-1 text-xs text-gold">{fieldErrors.organisation[0]}</p>
          ) : null}
        </div>
        <div>
          <label className={labelCls} htmlFor="end_user_type">End-user type</label>
          <select id="end_user_type" name="end_user_type" className={inputCls} defaultValue="operator">
            {END_USER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls} htmlFor="contact_email">Contact email</label>
          <input id="contact_email" name="contact_email" type="email" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="contact_phone">Contact phone</label>
          <input id="contact_phone" name="contact_phone" className={inputCls} />
        </div>
      </div>

      {isAog ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelCls} htmlFor="tail_number">Tail number</label>
            <input id="tail_number" name="tail_number" className={inputCls} placeholder="e.g. VT-ABC" />
          </div>
          <div>
            <label className={labelCls} htmlFor="aircraft_type">Aircraft type</label>
            <input id="aircraft_type" name="aircraft_type" className={inputCls} placeholder="e.g. King Air B200" />
          </div>
        </div>
      ) : (
        <div className="sm:max-w-xs">
          <label className={labelCls} htmlFor="urgency">Urgency</label>
          <select id="urgency" name="urgency" className={inputCls} defaultValue="routine">
            <option value="routine">Routine</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label className={labelCls}>Requested lines</label>
          <button type="button" onClick={addLine} className="text-xs font-semibold text-azure hover:underline">
            + Add line
          </button>
        </div>
        <div className="mt-3 space-y-3">
          {lines.map((l, i) => (
            <div key={i} className="grid gap-2 rounded-md border border-line bg-paper p-3 sm:grid-cols-[1fr_5rem_8rem_6rem_2rem]">
              <input
                aria-label="Part number"
                className={inputCls}
                placeholder="OEM part number"
                value={l.part_number}
                onChange={(e) => updateLine(i, { part_number: e.target.value })}
                required
              />
              <input
                aria-label="Quantity"
                className={inputCls}
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) => updateLine(i, { qty: e.target.value })}
              />
              <select
                aria-label="Condition"
                className={inputCls}
                value={l.condition}
                onChange={(e) => updateLine(i, { condition: e.target.value })}
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <input
                aria-label="ATA chapter"
                className={inputCls}
                placeholder="ATA"
                value={l.ata_chapter}
                onChange={(e) => updateLine(i, { ata_chapter: e.target.value })}
              />
              <button
                type="button"
                aria-label="Remove line"
                onClick={() => removeLine(i)}
                className="text-muted hover:text-gold"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {fieldErrors.lines ? <p className="mt-1 text-xs text-gold">{fieldErrors.lines[0]}</p> : null}
      </div>

      <div>
        <label className={labelCls} htmlFor="message">
          {isAog ? "Situation (what's grounded, where, since when)" : "Notes"}
        </label>
        <textarea id="message" name="message" rows={4} className={inputCls} />
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-steel disabled:opacity-60"
        >
          {submitting ? "Submitting…" : isAog ? "Open AOG request" : "Submit RFQ"}
        </button>
        <p className="text-xs text-muted">No price is shown or sent. Submitting creates a structured request.</p>
      </div>
    </form>
  );
}
