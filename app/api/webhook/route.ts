import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { Resend } from "resend";
import type Stripe from "stripe";
import { updateOrderRecord, getOrderRecord } from "@/lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function field(label: string, value?: string) {
  if (!value || !value.trim()) return "";
  return `<tr><td style="padding:6px 12px;font-weight:700;background:#f3eadb;border:1px solid #eadccb;vertical-align:top">${label}</td><td style="padding:6px 12px;border:1px solid #eadccb;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`;
}
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildOrderEmail(meta: Record<string, string>, opts: { orderType: string; amount: string; stripeId: string }) {
  const rows = [
    field("Product", meta.product_name),
    field("Add-ons", meta.add_ons),
    field("Order type", opts.orderType),
    field("Amount", opts.amount),
    field("Stripe ID", opts.stripeId),
    field("Parent name", meta.parent_name),
    field("Parent email", meta.parent_email),
    field("Child name", meta.child_name),
    field("Age", meta.child_age),
    field("Reading level", meta.reading_level),
    field("Pronouns", meta.pronouns),
    field("Hair", meta.hair),
    field("Eyes", meta.eyes),
    field("Skin tone", meta.skin_tone),
    field("Glasses / accessories", meta.glasses),
    field("Clothing", meta.clothing),
    field("Look notes", meta.look_notes),
    field("Theme 1", meta.theme_1),
    field("Theme 2", meta.theme_2),
    field("Theme 3", meta.theme_3),
    field("Special details", meta.special_details),
    field("Shipping address", meta.shipping_address),
    field("Other notes", meta.other_notes),
    (meta.photos || "").trim() ? `<tr><td style="padding:6px 12px;font-weight:700;background:#f3eadb;border:1px solid #eadccb;vertical-align:top">Child reference photos</td><td style="padding:6px 12px;border:1px solid #eadccb">${meta.photos.split(/\s+/).filter(Boolean).map((u: string) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" style="display:inline-block;margin:4px 6px 0 0"><img src="${escapeHtml(u)}" alt="Child reference photo" style="max-width:140px;max-height:140px;border-radius:8px;border:1px solid #eadccb" /></a>`).join("")}</td></tr>` : "",
    (meta.theme_photos || "").trim() ? `<tr><td style="padding:6px 12px;font-weight:700;background:#f3eadb;border:1px solid #eadccb;vertical-align:top">Theme reference photos</td><td style="padding:6px 12px;border:1px solid #eadccb">${meta.theme_photos.split(/\s+/).filter(Boolean).map((u: string) => `<a href="${escapeHtml(u)}" target="_blank" rel="noopener" style="display:inline-block;margin:4px 6px 0 0"><img src="${escapeHtml(u)}" alt="Theme reference photo" style="max-width:140px;max-height:140px;border-radius:8px;border:1px solid #eadccb" /></a>`).join("")}</td></tr>` : "",
  ].filter(Boolean).join("");
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:680px"><h2 style="font-size:22px;margin:0 0 12px">New order - ${escapeHtml(meta.product_name || "Custom book")}</h2><p style="color:#665d52;margin:0 0 18px">Charged successfully through Stripe.</p><table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table></div>`;
}

function buildCustomerEmail(childName: string, productName: string, isSub: boolean) {
  return `<div style="font-family:Inter,system-ui,sans-serif;max-width:600px;color:#2f2a24"><h2 style="font-size:22px">Thanks - we got your order!</h2><p>We're so glad you're making a custom book for ${escapeHtml(childName) || "your reader"}.</p><p><strong>Order:</strong> ${escapeHtml(productName)}</p>${isSub ? `<p>You're enrolled in the Monthly Book Club. A new personalized book will ship each month. You can manage or cancel any time by replying to this email.</p>` : `<p>We'll start working on your book right away. Most one-time orders ship within 7-10 business days; digital PDFs are emailed within 5 business days.</p>`}<p>If anything about your child's details needs to change, just reply to this email - we read every reply.</p><p style="color:#665d52;font-size:13px;margin-top:24px">CustomLearnToRead</p></div>`;
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }
  const stripe = getStripe();
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whSecret);
  } catch (err: any) {
    console.error("webhook signature failed", err.message);
    return NextResponse.json({ error: `Bad signature` }, { status: 400 });
  }
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const full = (await stripe.checkout.sessions.retrieve(session.id)) as unknown as Stripe.Checkout.Session & Record<string, any>;
      const meta = (full.metadata || {}) as Record<string, string>;
      const isSub = full.mode === "subscription";
      let stripeShipping: { name?: string | null; address?: any } | null = null;
      if (full.shipping_details) {
        stripeShipping = full.shipping_details;
      } else if (full.collected_information?.shipping_details) {
        stripeShipping = full.collected_information.shipping_details;
      } else if (full.customer_details?.address) {
        stripeShipping = { name: full.customer_details.name, address: full.customer_details.address };
      }
      if (!meta.shipping_address && stripeShipping?.address) {
        const a = stripeShipping.address;
        meta.shipping_address = [stripeShipping.name, a.line1, a.line2, `${a.city || ""}, ${a.state || ""} ${a.postal_code || ""}`, a.country].filter(Boolean).join("\n");
      }
      const amount = full.amount_total ? `$${(full.amount_total / 100).toFixed(2)} ${full.currency?.toUpperCase() || ""}` : "-";

      // Idempotency guard: Stripe retries webhooks (and can deliver duplicates).
      // If the Airtable row is already Paid, this event was processed — skip
      // re-sending emails. Best effort: if Airtable is unreachable, proceed.
      if (meta.airtable_record_id) {
        try {
          const existing = await getOrderRecord(meta.airtable_record_id);
          if (existing?.fields?.Status === "Paid") {
            console.log("duplicate checkout.session.completed — already Paid, skipping", full.id);
            return NextResponse.json({ received: true, duplicate: true });
          }
        } catch (e) {
          console.error("airtable idempotency check failed (continuing)", e);
        }
      }

      // Mark the Airtable order Paid (created at checkout time with full details).
      if (meta.airtable_record_id) {
        try {
          await updateOrderRecord(meta.airtable_record_id, {
            Status: "Paid",
            Amount: amount,
            "Stripe ID": full.id,
            "Shipping address": meta.shipping_address || "",
          });
        } catch (e) {
          console.error("airtable update (paid) failed", e);
        }
      }

      const resendKey = process.env.RESEND_API_KEY;
      // OWNER_EMAIL may be a comma-separated list (e.g. "a@x.com, b@y.com"); send to all.
      const ownerEmails = (process.env.OWNER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
      const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";
      if (resendKey && ownerEmails.length) {
        const resend = new Resend(resendKey);
        // Each send is isolated so an owner-email failure can never block the
        // customer's confirmation (or vice versa). Failures are logged — the
        // Airtable row is the durable record either way.
        try {
          await resend.emails.send({
            from: fromEmail,
            to: ownerEmails,
            reply_to: meta.parent_email || undefined,
            subject: `New ${isSub ? "subscription" : "order"} - ${meta.child_name || "custom book"} (${meta.product_name || ""})`,
            html: buildOrderEmail(meta, { orderType: isSub ? "Monthly subscription" : "One-time order", amount, stripeId: full.id }),
          });
        } catch (e) {
          console.error("owner order email failed", e);
        }
        if (meta.parent_email) {
          try {
            await resend.emails.send({
              from: fromEmail,
              to: meta.parent_email,
              reply_to: ownerEmails,
              subject: `Your CustomLearnToRead order is in!`,
              html: buildCustomerEmail(meta.child_name || "your reader", meta.product_name || "Custom book", isSub),
            });
          } catch (e) {
            console.error("customer confirmation email failed", e);
          }
        }
      } else {
        console.warn("RESEND_API_KEY / OWNER_EMAIL not configured - skipping email. Order metadata:", meta);
      }
    }
    if (event.type === "checkout.session.expired") {
      // Customer filled the form but never paid. The full order already lives in
      // Airtable as "Pending payment" — mark it Abandoned and tell the owner so
      // they can follow up personally (highest-converting recovery at this scale).
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = (session.metadata || {}) as Record<string, string>;
      if (meta.airtable_record_id) {
        try {
          const existing = await getOrderRecord(meta.airtable_record_id);
          // Only flip rows still pending — never touch one that got Paid.
          if (!existing || existing.fields?.Status === "Pending payment") {
            await updateOrderRecord(meta.airtable_record_id, { Status: "Abandoned" });
          }
        } catch (e) {
          console.error("airtable update (abandoned) failed", e);
        }
      }
      const resendKey = process.env.RESEND_API_KEY;
      const ownerEmails = (process.env.OWNER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
      const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";
      if (resendKey && ownerEmails.length && (meta.parent_email || meta.child_name)) {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: ownerEmails,
            reply_to: meta.parent_email || undefined,
            subject: `Abandoned checkout - ${meta.child_name || "unknown"} (${meta.product_name || ""})`,
            html: `<div style="font-family:Inter,system-ui,sans-serif;max-width:600px"><h2 style="font-size:20px">Checkout started but not completed</h2><p>${escapeHtml(meta.parent_name || "A parent")} (${escapeHtml(meta.parent_email || "no email")}) got to Stripe checkout for <strong>${escapeHtml(meta.product_name || "a book")}</strong> for <strong>${escapeHtml(meta.child_name || "their child")}</strong> but didn't pay. Their full personalization details are saved in Airtable (status: Abandoned).</p><p>A short personal reply-to note often wins these back — their email is set as reply-to on this message.</p></div>`,
          });
        } catch (e) {
          console.error("abandoned-checkout owner email failed", e);
        }
      }
    }
    if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice & Record<string, any>;
      const subId: string | null = (typeof invoice.subscription === "string" ? invoice.subscription : null) || invoice.parent?.subscription_details?.subscription || null;
      if (invoice.billing_reason === "subscription_cycle" && subId) {
        const sub = await stripe.subscriptions.retrieve(subId);
        const meta = (sub.metadata || {}) as Record<string, string>;
        const resendKey = process.env.RESEND_API_KEY;
        const ownerEmails = (process.env.OWNER_EMAIL || "").split(",").map((s) => s.trim()).filter(Boolean);
        const fromEmail = process.env.FROM_EMAIL || "orders@customlearntoread.com";
        if (resendKey && ownerEmails.length) {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: ownerEmails,
            reply_to: meta.parent_email || undefined,
            subject: `Monthly book cycle - ${meta.child_name || "subscriber"} (${meta.product_name || ""})`,
            html: buildOrderEmail(meta, { orderType: "Monthly cycle renewal", amount: invoice.amount_paid ? `$${(invoice.amount_paid / 100).toFixed(2)} ${invoice.currency?.toUpperCase() || ""}` : "-", stripeId: invoice.id || sub.id }),
          });
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("webhook handler error", err);
    return NextResponse.json({ error: err?.message || "Handler error" }, { status: 500 });
  }
}
