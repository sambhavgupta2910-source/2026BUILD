import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/** Gate every portal page behind a session. API routes do their own auth, and
 *  /login is public. No session → redirect to /login. */
export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (pathname === "/login") return NextResponse.next();
  if (req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  // run on everything except Next internals, static assets, and API routes
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
