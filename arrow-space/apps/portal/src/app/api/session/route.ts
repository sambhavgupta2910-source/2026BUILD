import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomer } from "@/lib/server/dataset";
import { SESSION_COOKIE } from "@/lib/server/session";

export const runtime = "nodejs";

const BodySchema = z.object({
  customer_id: z.string().optional(),
  logout: z.boolean().optional(),
});

export async function POST(req: Request): Promise<Response> {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  if (body.logout) {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (!body.customer_id || !getCustomer(body.customer_id)) {
    return NextResponse.json({ ok: false, error: "Unknown or non-portal account" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, body.customer_id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return res;
}
