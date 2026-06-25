import { NextResponse } from "next/server";
import { z } from "zod";
import { getRfq } from "@/lib/server/dataset";
import { recordApproval } from "@/lib/server/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  rfq_id: z.string().min(1),
  approver: z.string().min(1).default("operator"),
});

export async function POST(req: Request): Promise<Response> {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (!getRfq(body.rfq_id)) {
    return NextResponse.json({ ok: false, error: "Unknown RFQ" }, { status: 404 });
  }

  const approval = recordApproval(body.rfq_id, body.approver);
  if (!approval) {
    return NextResponse.json({ ok: false, error: "Could not record approval (read-only?)" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, approval });
}
