import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildIntakeRfq } from "@/lib/intake";
import { usOriginLookup } from "./parts-origin";
import { persistIntake } from "./intake-store";

/**
 * Shared RFQ / AOG intake handler. Validates against the RFQ schema, applies
 * the export-control rule, persists to the synthetic intake queue, and returns
 * a structured acknowledgement. It NEVER returns a price, NEVER auto-quotes,
 * and NEVER emails the customer.
 */
export async function handleIntake(req: Request, isAog: boolean): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const result = buildIntakeRfq(body, { isAog, usOrigin: usOriginLookup() });
    persistIntake(result);

    return NextResponse.json({
      ok: true,
      id: result.rfq.id,
      status: result.rfq.status,
      urgency: result.rfq.urgency,
      export_control_review: result.rfq.export_control_review,
      clarifications_needed: result.rfq.clarifications_needed,
      aog_sla_minutes: result.aogEvent?.sla_minutes ?? null,
      message:
        "Received. A specialist will review and respond. No price is generated automatically — Arrow confirms pricing and any compliance release.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", issues: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
