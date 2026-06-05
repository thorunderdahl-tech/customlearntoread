import { NextRequest, NextResponse } from "next/server";
import { verifySession, sessionSecret, ADMIN_COOKIE } from "@/lib/auth";

// Gate the admin dashboard and its API. Everything else is untouched.
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public endpoints needed to log in.
  if (pathname === "/admin/login" || pathname === "/api/admin/auth") {
    return NextResponse.next();
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const ok = await verifySession(token, sessionSecret());
  if (ok) return NextResponse.next();

  // API calls get a clean 401; page requests get redirected to login.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
