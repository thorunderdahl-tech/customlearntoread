import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { listOrders, updateOrderRecord } from "@/lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Only nudge orders that have sat unpaid for a little while, but aren't stale.
const MIN_AGE_MS = 60 * 60 * 1000; // 1 hour — give them time to come back on their own
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours — past this it's just spam

// Rows eligible for a recovery email. "Pending payment" = checkout still open;
// "Abandoned" = the Stripe session expired (webhook flips it at ~24h). Both are
// recoverable — /api/resume builds a fresh session either way.
const RECOVERABLE_STATUSES = new Set(["Pending payment", "Abandoned"]);

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function recoveryEmail(opts: {
  childName: string;
  productName: string;
  resumeUrl: string;
  promoCode: string;
  discountLabel: string;
}) {
  const child = escapeHtml(opts.childName) || "your reader";
  return `<div style="font-family:Inter,system-ui,sans-serif;color:#2f2a24;max-width:560px">
<h2 style="font-size:22px;margin:0 0 8px">You're one step away from ${child}'s book</h2>
<p style="color:#665d52">You started a custom <strong>${escapeHtml(opts.productName)}</strong> but didn't finish checkout. We saved every detail you entered — no need to redo the form.</p>
<p style="color:#665d52">As a little nudge, here's <strong>${escapeHtml(opts.discountLabel)} off</strong> with code <strong>${escapeHtml(opts.promoCode)}</strong> at checkout.</p>
<p style="margin:22px 0">
<a href="${escapeHtml(opts.resumeUrl)}" style="display:inline-block;background:#2f2a24;color:#fff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:999px">Finish my order &rarr;</a>
</p>
<p style="color:#665d52;font-size:13px">The code is applied on the secure Stripe checkout page. Questions? Just reply — we read every email.</p>
<p style="color:#665d52;font-size:13px;margin-top:24px">CustomLearnToRead</p>
</div>`;
}

async function run(req: NextRequest) {
  // Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We also
  // accept ?key= for manual runs. If CRON_SECRET is unset, refuse (fail closed).
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
  }
  const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";
  const ownerEmail = process.env.OWNER_EMAIL;
  const promoCode = process.env.RECOVERY_PROMO_CODE || "COMEBACK10";
  const discountLabel = process.env.RECOVERY_DISCOUNT_LABEL || "10%";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread.com";
  const resend = new Resend(resendKey);

  const now = Date.now();
  let scanned = 0;
  let sent = 0;
  const orders = await listOrders();

  for (const o of orders) {
    scanned++;
    const f = o.fields;
    if (!RECOVERABLE_STATUSES.has((f["Status"] as string) || "")) continue;
    if (f["Recovery sent"]) continue;
    const email = (f["Parent email"] as string) || "";
    if (!email || !email.includes("@")) continue;
    const age = now - new Date(o.createdTime).getTime();
    if (age < MIN_AGE_MS || age > MAX_AGE_MS) continue;

    const resumeUrl = `${siteUrl}/api/resume?id=${encodeURIComponent(o.id)}`;
    try {
      await resend.emails.send({
        from: fromEmail,
        to: email,
        reply_to: ownerEmail || undefined,
        subject: `Finish ${(f["Child name"] as string) || "your child"}'s custom book — ${discountLabel} off inside`,
        html: recoveryEmail({
          childName: (f["Child name"] as string) || "",
          productName: (f["Product"] as string) || "your custom book",
          resumeUrl,
          promoCode,
          discountLabel,
        }),
      });
      await updateOrderRecord(o.id, { "Recovery sent": new Date().toISOString() });
      sent++;
    } catch (e) {
      console.error("recovery email failed for", o.id, e);
    }
  }

  return NextResponse.json({ ok: true, scanned, sent });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
