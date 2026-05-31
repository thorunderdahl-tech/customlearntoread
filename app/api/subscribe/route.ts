import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    const ownerEmail = process.env.OWNER_EMAIL;
    const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";

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
        <p>While you're here, peek at our personalized books at <a href="https://customlearntoread-z3hs.vercel.app">customlearntoread.com</a>.</p>
        <p style="color:#665d52;font-size:13px;margin-top:24px">- The CustomLearnToRead team</p>
      </div>`,
    });

    if (ownerEmail) {
      await resend.emails.send({
        from: fromEmail,
        to: ownerEmail,
        subject: `New newsletter signup: ${email}`,
        html: `<p>New subscriber: <strong>${email}</strong></p>`,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Subscribe error:", err);
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
