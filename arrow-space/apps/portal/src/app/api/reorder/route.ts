import { NextResponse } from "next/server";
import { z } from "zod";
import { currentCustomer } from "@/lib/server/session";
import { dataset } from "@/lib/server/dataset";
import { buildReorderRfq } from "@/lib/reorder";
import { persistReorder } from "@/lib/server/reorder-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const customer = await currentCustomer();
  if (!customer) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const db = dataset();
    const { rfq, note } = buildReorderRfq(body, {
      customerId: customer.id,
      endUserType: customer.type,
      getPart: (id) => db.partById.get(id),
    });
    persistReorder(rfq, note, customer.id);

    return NextResponse.json({
      ok: true,
      id: rfq.id,
      status: rfq.status,
      channel: rfq.channel,
      export_control_review: rfq.export_control_review,
      message:
        "Reorder received as an inquiry. Arrow will source and respond with a quote — pricing is confirmed by a person, never automatically.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: "Validation failed", issues: err.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 400 });
  }
}
