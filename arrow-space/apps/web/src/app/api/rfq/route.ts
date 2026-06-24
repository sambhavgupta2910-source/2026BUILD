import { handleIntake } from "@/lib/server/handle-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(req: Request): Promise<Response> {
  return handleIntake(req, false);
}
