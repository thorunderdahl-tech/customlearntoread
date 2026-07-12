import { NextRequest, NextResponse } from "next/server";
import { listOrders, airtableConfigured } from "@/lib/airtable";
import { advanceOrder, recordRunFailure, pickQueue } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Unattended generation drain. Every run: resume any order mid-generation, then
// auto-start untouched Paid orders, advancing each as far as the time budget
// allows. Progress persists per page, so books complete across multiple runs.
// Disable auto-starting new orders with AUTO_GENERATE=0 (resumes still run).
// Manual trigger: GET /api/cron/generate?key=$CRON_SECRET
async function run(req: NextRequest) {
  // Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We also
  // accept ?key= for manual runs. If CRON_SECRET is unset, refuse (fail closed).
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  if (auth !== `Bearer ${secret}` && key !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!airtableConfigured()) return NextResponse.json({ error: "Airtable not configured" }, { status: 500 });

  const budgetMs = Number(process.env.GENERATE_BUDGET_MS) || 240_000;
  const deadline = Date.now() + budgetMs;
  const autoStart = process.env.AUTO_GENERATE !== "0";

  const all = await listOrders();
  const queue = pickQueue(all, autoStart);
  const results: Array<{ id: string; child: string; result: string; note: string }> = [];

  for (const order of queue) {
    if (Date.now() > deadline - 30_000) break; // out of budget — next run resumes
    try {
      const r = await advanceOrder(order, deadline, all);
      results.push({ id: order.id, child: String(order.fields?.["Child name"] || ""), result: r.kind, note: r.note });
      // One book at a time: if this one still has work left, spend the rest of
      // the budget on it next run rather than starting a second in parallel.
    } catch (e: any) {
      const msg = e?.message || String(e);
      console.error("pipeline crashed for", order.id, msg);
      await recordRunFailure(order, msg);
      results.push({ id: order.id, child: String(order.fields?.["Child name"] || ""), result: "error", note: msg.slice(0, 200) });
    }
  }

  return NextResponse.json({ ok: true, autoStart, queued: queue.length, processed: results });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
