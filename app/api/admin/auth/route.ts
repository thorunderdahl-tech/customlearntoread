import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  checkPassword,
  sessionSecret,
  ADMIN_COOKIE,
} from "@/lib/auth";

export const runtime = "nodejs";

const COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
};

// Log in: verify password, set a signed session cookie.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Admin login isn't configured yet. Set ADMIN_PASSWORD." },
      { status: 500 },
    );
  }
  if (!checkPassword(body?.password, expected)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  const token = await createSession(sessionSecret());
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    ...COOKIE_OPTS,
    maxAge: 7 * 24 * 60 * 60,
  });
  return res;
}

// Log out: clear the cookie.
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...COOKIE_OPTS, maxAge: 0 });
  return res;
}
