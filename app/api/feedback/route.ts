import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getOrderRecord, updateOrderRecord } from "@/lib/airtable";
import { verifyTag } from "@/lib/auth";

export const runtime = "nodejs";

// Post-delivery reading-level feedback. Linked from the delivery email so the
// parent rates the level AFTER their child reads the book — early in the order's
// life, never near a subscription renewal. Link-based (no auth); best-effort
// storage + owner notification, always ending in a friendly thank-you page.
const MAP: Record<string, { label: string; nudge: string }> = {
  easy: { label: "Too easy", nudge: "level UP the next book" },
  right: { label: "Just right", nudge: "keep the same level" },
  hard: { label: "Too hard", nudge: "level DOWN the next book" },
};

function htmlPage(heading: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading}</title></head>
<body style="margin:0;background:#fff8ed;font-family:Inter,system-ui,-apple-system,sans-serif;color:#2f2a24">
  <div style="max-width:520px;margin:56px auto;padding:0 16px">
    <div style="background:#fff;border:1px solid #f0e7d8;border-radius:16px;padding:36px 32px;text-align:center">
      <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6b6257;font-weight:600;margin:0 0 12px">Custom Learn to Read</p>
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;margin:0 0 14px">${heading}</h1>
      <p style="font-size:15px;line-height:1.6;color:#4a3520;margin:0">${body}</p>
      <p style="margin:28px 0 0"><a href="https://customlearntoread.com" style="background:#f5b78d;color:#4a3520;text-decoration:none;font-weight:700;font-size:15px;padding:12px 26px;border-radius:999px;display:inline-block">Back to Custom Learn to Read</a></p>
    </div>
  </div>
</body></html>`;
}

function html(heading: string, body: string, status = 200): NextResponse {
  return new NextResponse(htmlPage(heading, body), {
    status,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderId = (url.searchParams.get("o") || "").trim();
  const rating = (url.searchParams.get("r") || "").toLowerCase().trim();
  const sig = (url.searchParams.get("s") || "").trim();
  const m = MAP[rating];
  if (!m) {
    return html("Thanks!", "We couldn't read that response, but thank you for letting us know.");
  }

  // The link is signed in the delivery email (signTag over the order id). Without
  // a valid signature we still show a friendly page but never touch Airtable or
  // email the owner — this stops anonymous callers from enumerating order ids to
  // tamper with the feedback field, spam the owner, or read a child's name back.
  const authed = orderId ? await verifyTag(orderId, "feedback", sig) : false;

  if (authed) {
    try {
      // Best-effort: needs a "Reading feedback" column in Airtable; harmless if absent.
      await updateOrderRecord(orderId, { "Reading feedback": m.label });
    } catch (e) {
      console.error("feedback: airtable update failed (continuing)", e);
    }
    try {
      const key = process.env.RESEND_API_KEY;
      const owner = (process.env.OWNER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
      const from = process.env.FROM_EMAIL || "orders@customlearntoread.com";
      if (key && owner.length) {
        const resend = new Resend(key);
        await resend.emails.send({
          from,
          to: owner,
          subject: `Reading feedback: ${m.label}`,
          html: `<div style="font-family:Inter,system-ui,sans-serif;color:#2f2a24"><p>A parent rated the last book: <strong>${m.label}</strong>.</p><p>Suggestion for the next book: <strong>${m.nudge}</strong>.</p><p style="color:#6b6257;font-size:13px">Order: ${orderId}</p></div>`,
        });
      }
    } catch (e) {
      console.error("feedback: owner email failed (continuing)", e);
    }
  }

  // Response is intentionally generic — no per-order data is reflected back.
  const kind =
    rating === "right"
      ? "So glad it was a good fit! We'll keep the next book at the same level."
      : "Thanks for telling us — we'll use this to make the next book just right.";
  return html("Thank you!", kind);
}
