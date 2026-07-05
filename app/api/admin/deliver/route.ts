import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { updateOrderRecord } from "@/lib/airtable";

export const runtime = "nodejs";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Finalizes a digital-book delivery: emails the customer their private
// flipbook link + print PDF, and marks the Airtable order Delivered.
// Body: { token, childName, bookTitle, email, recordId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const token: string = body?.token || "";
    const childName: string = (body?.childName || "").trim();
    const bookTitle: string = (body?.bookTitle || "").trim() || `${childName}'s Book`;
    const email: string = (body?.email || "").trim();
    const recordId: string | undefined = body?.recordId || undefined;

    if (!/^[a-z0-9-]{4,80}$/.test(token)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }
    if (!email || !/.+@.+\..+/.test(email)) {
      return NextResponse.json({ error: "Invalid customer email" }, { status: 400 });
    }

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread.com").replace(/\/$/, "");
    const bookLink = `${siteUrl}/books/${token}`;
    const pdfLink = `${siteUrl}/books/${token}.pdf`;

    // ---- customer email ----
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }
    const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";
    const ownerEmails = (process.env.OWNER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
    const resend = new Resend(resendKey);

    const first = esc(childName || "Your child");
    // Post-delivery reading-level feedback links (only when we can tie them to an
    // order). The parent clicks after their child has read it — naturally decoupled
    // from any renewal date, so it never reads as a "cancel?" prompt.
    const fb = (r: string) => `${siteUrl}/api/feedback?o=${encodeURIComponent(recordId || "")}&r=${r}`;
    const feedbackBlock = recordId
      ? `<div style="margin:24px 0 0;padding-top:18px;border-top:1px solid #f0e7d8">
      <p style="font-size:14px;line-height:1.6;color:#6b6257;margin:0 0 10px">Once ${first} has read it, how did the reading level feel? One tap helps us make the next book just right:</p>
      <p style="font-size:14px;margin:0">
        <a href="${fb("easy")}" style="color:#b96e3c;font-weight:600;text-decoration:none">Too easy</a>
        &nbsp;·&nbsp;
        <a href="${fb("right")}" style="color:#b96e3c;font-weight:600;text-decoration:none">Just right</a>
        &nbsp;·&nbsp;
        <a href="${fb("hard")}" style="color:#b96e3c;font-weight:600;text-decoration:none">Too hard</a>
      </p>
    </div>`
      : "";
    const { error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: email,
      bcc: ownerEmails.length ? ownerEmails : undefined,
      reply_to: ownerEmails[0] || undefined,
      subject: `${childName || "Your child"}'s book is ready!`,
      html: `
<div style="background:#fff8ed;padding:32px 16px;font-family:Inter,system-ui,-apple-system,sans-serif;color:#2f2a24">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:36px 32px;border:1px solid #f0e7d8">
    <p style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#6b6257;font-weight:600;margin:0 0 10px">Custom Learn to Read</p>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:26px;margin:0 0 14px">${first}&rsquo;s book is ready 🎉</h1>
    <p style="font-size:15px;line-height:1.6;margin:0 0 18px">We just finished <strong>${esc(bookTitle)}</strong> &mdash; a story made just for ${first}. Open it together and let ${first} turn the pages, just like a real book:</p>
    <p style="text-align:center;margin:26px 0">
      <a href="${bookLink}" style="background:#f5b78d;color:#4a3520;text-decoration:none;font-weight:700;font-size:16px;padding:14px 30px;border-radius:999px;display:inline-block">Open ${first}&rsquo;s book</a>
    </p>
    <p style="font-size:14px;line-height:1.6;color:#6b6257;margin:0 0 8px">It works on any phone, tablet, or computer &mdash; drag a page corner to turn it. Want a copy to print or keep forever?</p>
    <p style="font-size:14px;margin:0 0 22px"><a href="${pdfLink}" style="color:#b96e3c;font-weight:600">Download the printable PDF</a></p>
    <p style="font-size:13px;line-height:1.6;color:#6b6257;margin:0 0 4px">This link is private to your family &mdash; feel free to share it with grandparents.</p>
    ${feedbackBlock}
    <p style="font-size:13px;line-height:1.6;color:#6b6257;margin:18px 0 0">Happy reading!<br>The Custom Learn to Read family</p>
  </div>
</div>`,
    });
    if (sendError) {
      return NextResponse.json({ error: `Email failed: ${sendError.message || sendError}` }, { status: 502 });
    }

    // ---- Airtable: mark Delivered (best-effort; unknown columns are dropped) ----
    let airtableOk = true;
    if (recordId) {
      try {
        await updateOrderRecord(recordId, {
          Status: "Delivered",
          "Book link": bookLink,
          "Delivered on": new Date().toISOString().slice(0, 10),
        });
      } catch (e) {
        console.error("deliver: airtable update failed", e);
        airtableOk = false;
      }
    }

    return NextResponse.json({ ok: true, bookLink, pdfLink, airtableOk });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Delivery failed" }, { status: 500 });
  }
}
