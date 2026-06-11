import { NextRequest, NextResponse } from "next/server";
import { head } from "@vercel/blob";

export const runtime = "nodejs";

// Serves customer books stored in Vercel Blob at branded private URLs:
//   /books/<token>      -> books/<token>.html  (the flipbook)
//   /books/<token>.pdf  -> books/<token>.pdf   (the print PDF)
// Static files in public/books/ (e.g. the Emma sample) take precedence
// automatically, so this route only handles Blob-stored books.
export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } },
) {
  const raw = params.token || "";
  if (!/^[a-z0-9-]{4,80}(\.pdf|\.html)?$/.test(raw)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const isPdf = raw.endsWith(".pdf");
  const base = raw.replace(/\.(pdf|html)$/, "");
  const pathname = `books/${base}.${isPdf ? "pdf" : "html"}`;

  try {
    const blob = await head(pathname);
    const upstream = await fetch(blob.url);
    if (!upstream.ok || !upstream.body) {
      return new NextResponse("Not found", { status: 404 });
    }
    return new NextResponse(upstream.body, {
      headers: {
        "Content-Type": isPdf
          ? "application/pdf"
          : "text/html; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
