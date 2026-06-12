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

// Best-effort brute-force throttle (per warm serverless instance):
// after MAX_FAILS failed attempts from one IP within the window, return 429.
const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 5;
const failMap = new Map<string, { count: number; windowStart: number }>();
function tooManyFails(ip: string): boolean {
  const e = failMap.get(ip);
  if (!e || Date.now() - e.windowStart > FAIL_WINDOW_MS) return false;
  return e.count >= MAX_FAILS;
}
function recordFail(ip: string) {
  const now = Date.now();
  const e = failMap.get(ip);
  if (!e || now - e.windowStart > FAIL_WINDOW_MS) {
    failMap.set(ip, { count: 1, windowStart: now });
  } else {
    e.count += 1;
  }
}

// Log in: verify password, set a signed session cookie.
export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
  if (tooManyFails(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }
  const body = await req.json().catch(() => ({}));
  const expected = process.env.SIM_PASSWORD;
  if (!expected) {
    return NextResponse.json(
      { error: "Login isn't configured yet. Set SIM_PASSWORD in the environment." },
      { status: 500 },
    );
  }
  if (!checkPassword(body?.password, expected)) {
    recordFail(ip);
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  failMap.delete(ip);
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
