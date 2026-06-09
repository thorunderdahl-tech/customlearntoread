import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Best-effort per-IP rate limit (per warm serverless instance). Stops casual
// abuse of this endpoint as a way to send unsolicited welcome emails.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
const rateMap = new Map<string, { count: number; windowStart: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "unknown").split(",")[0].trim();
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many signups from this connection — please try again later." },
        { status: 429 },
      );
    }
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    // OWNER_EMAIL may be a comma-separated list; notify all owners.
    const ownerEmails = (process.env.OWNER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
    const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread.com";

    if (!resendKey) {
      return NextResponse.json(
        { error: "Email service not configured" },
        { status: 500 },
      );
    }

    const resend = new Resend(resendKey);

    if (audienceId) {
      try {
        await resend.contacts.create({ email, audienceId, unsubscribed: false });
      } catch (e) {
        // Likely already subscribed; ignore.
      }
    }

    await resend.emails.send({
      from: fromEmail,
      to: email,
      subject: "Welcome to early-reader tips from CustomLearnToRead",
      html: `<div style="font-family:Inter,system-ui,sans-serif;color:#2f2a24;max-width:560px">
        <h2 style="font-size:22px">Thanks for signing up!</h2>
        <p>You'll get short, practical tips for helping early readers love books. No spam, unsubscribe any time.</p>
        <p>While you're here, peek at our personalized books at <a href="${siteUrl}">customlearntoread.com</a>.</p>
        <p style="color:#665d52;font-size:13px;margin-top:24px">- The CustomLearnToRead team</p>
      </div>`,
    });

    if (ownerEmails.length) {
      await resend.emails.send({
        from: fromEmail,
        to: ownerEmails,
        subject: `New newsletter signup: ${email}`,
        html: `<p>New subscriber: <strong>${escapeHtml(email)}</strong></p>`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
