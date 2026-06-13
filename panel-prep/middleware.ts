import { NextRequest, NextResponse } from "next/server";
import { verifySession, sessionSecret, ADMIN_COOKIE } from "@/lib/auth";

// The whole app is private: everything except the login page, the auth
// endpoint, and Next.js static assets requires a valid session cookie.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname === "/api/auth") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = await verifySession(token, sessionSecret());
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
