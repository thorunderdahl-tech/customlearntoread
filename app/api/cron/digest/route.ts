import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { listOrders, type AirtableOrder } from "@/lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Morning owner digest — the "is the business running itself?" heartbeat.
// Sent EVERY day even when empty: if it stops arriving, something upstream
// (cron, Vercel, Airtable) is broken, which is itself the alert.
//
// Sections: needs attention (act today) · ready for review · generating now
// (with stall detection) · new orders (24h) · delivered (24h) · unpaid carts.

const STALL_MS = 3 * 60 * 60 * 1000; // Generating with no progress for 3h = the generate cron is probably failing

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function rows(orders: AirtableOrder[], note?: (o: AirtableOrder) => string): string {
  if (!orders.length) return `<p style="color:#8c8478;margin:4px 0 0">None.</p>`;
  const items = orders.map((o) => {
    const f = o.fields as Record<string, any>;
    const extra = note ? note(o) : "";
    return `<li style="margin:4px 0"><strong>${esc(String(f["Child name"] || "?"))}</strong> — ${esc(String(f["Product"] || ""))}${extra ? ` <span style="color:#a15b2e">${esc(extra)}</span>` : ""}</li>`;
  });
  return `<ul style="margin:6px 0 0;padding-left:20px;color:#4a443c">${items.join("")}</ul>`;
}

function section(title: string, body: string): string {
  return `<h3 style="font-size:15px;margin:20px 0 2px;color:#2f2a24">${title}</h3>${body}`;
}

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const resendKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!resendKey || !ownerEmail) {
    return NextResponse.json({ error: "RESEND_API_KEY / OWNER_EMAIL not configured" }, { status: 500 });
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://customlearntoread.com";

  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const orders = await listOrders();
  const by = (s: string) => orders.filter((o) => (o.fields?.["Status"] as string) === s);

  const attention = by("Needs attention");
  const ready = by("Ready for review");
  const generating = by("Generating");
  const stalled = generating.filter((o) => {
    try {
      const st = JSON.parse(String(o.fields?.["Pipeline state"] || "{}"));
      return st.updatedAt && now - new Date(st.updatedAt).getTime() > STALL_MS;
    } catch { return false; }
  });
  const newPaid = orders.filter((o) => {
    const s = (o.fields?.["Status"] as string) || "";
    return ["Paid", "Generating", "Ready for review", "Needs attention"].includes(s) && new Date(o.createdTime).getTime() > dayAgo;
  });
  const delivered = orders.filter((o) => {
    if ((o.fields?.["Status"] as string) !== "Delivered") return false;
    const on = o.fields?.["Delivered on"]; // date the deliver route stamps
    return on ? new Date(String(on)).getTime() > dayAgo - 12 * 60 * 60 * 1000 : false; // date-only field — pad half a day
  });
  const carts = orders.filter((o) => ["Pending payment", "Abandoned"].includes((o.fields?.["Status"] as string) || ""));
  const spend24h = newPaid.reduce((a, o) => a + (Number(o.fields?.["AI images"]) || 0), 0);

  const actionCount = attention.length + ready.length + stalled.length;
  const subject = actionCount
    ? `CLR morning digest — ${ready.length} to review${attention.length ? `, ${attention.length} need attention` : ""}${stalled.length ? `, ${stalled.length} STALLED` : ""}`
    : `CLR morning digest — all quiet (${newPaid.length} new order${newPaid.length === 1 ? "" : "s"})`;

  const stateNote = (o: AirtableOrder) => {
    try { return String(JSON.parse(String(o.fields?.["Pipeline state"] || "{}")).error || ""); } catch { return ""; }
  };
  const html = `<div style="font-family:Inter,system-ui,sans-serif;color:#2f2a24;max-width:600px">
<h2 style="font-size:20px;margin:0 0 4px">Good morning — here's the shop</h2>
<p style="color:#665d52;margin:0">${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · <a href="${esc(siteUrl)}/admin/review" style="color:#a15b2e">open the review queue</a></p>
${stalled.length ? section(`⚠️ Stalled mid-generation (no progress in 3h — check the generate cron)`, rows(stalled, stateNote)) : ""}
${section(`Needs attention (${attention.length})`, rows(attention, stateNote))}
${section(`Ready for review (${ready.length})`, rows(ready))}
${section(`Generating now (${generating.length})`, rows(generating))}
${section(`New orders, last 24h (${newPaid.length})`, rows(newPaid))}
${section(`Delivered, last 24h (${delivered.length})`, rows(delivered))}
${section(`Open carts (${carts.length})`, carts.length ? `<p style="color:#8c8478;margin:4px 0 0">${carts.length} unpaid — recovery emails handle these automatically.</p>` : `<p style="color:#8c8478;margin:4px 0 0">None.</p>`)}
<p style="color:#8c8478;font-size:12px;margin-top:24px">AI images across the last 24h's orders: ${spend24h}. This digest sends daily even when quiet — if it stops arriving, the crons are down.</p>
</div>`;

  const resend = new Resend(resendKey);
  await resend.emails.send({
    from: process.env.FROM_EMAIL || "orders@customlearntoread.com",
    to: ownerEmail,
    subject,
    html,
  });
  return NextResponse.json({ ok: true, attention: attention.length, ready: ready.length, generating: generating.length, stalled: stalled.length, newPaid: newPaid.length });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
