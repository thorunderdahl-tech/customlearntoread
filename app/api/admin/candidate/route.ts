import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// Streams a candidate image from Vercel Blob to the admin create screen.
// The proxy (same-origin, admin-authed via /api/admin/* middleware) avoids any
// cross-origin/canvas-taint issues when the browser composites the pages.
// Only blob storage URLs are allowed — this must never become an open proxy.
export async function GET(req: NextRequest) {
  const src = req.nextUrl.searchParams.get("src") || "";
  let host = "";
  try { host = new URL(src).hostname; } catch { /* invalid URL */ }
  if (!/\.blob\.vercel-storage\.com$/.test(host)) {
    return NextResponse.json({ error: "Only blob storage URLs are allowed" }, { status: 400 });
  }
  const res = await fetch(src, { cache: "no-store" });
  if (!res.ok) return NextResponse.json({ error: `Fetch failed (${res.status})` }, { status: 502 });
  return new NextResponse(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") || "image/jpeg",
      "cache-control": "private, max-age=300",
    },
  });
}
