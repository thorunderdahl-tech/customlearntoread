import { NextRequest, NextResponse } from "next/server";
import { updateOrderRecord, FULFILLMENT_STATUSES } from "@/lib/airtable";

export const runtime = "nodejs";

// Update a single order's fulfillment status. (Auth enforced by middleware.)
// Body: { id: string, status: string }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    const status = body?.status;
    if (!id) {
      return NextResponse.json({ error: "Missing order id" }, { status: 400 });
    }
    if (!status || !FULFILLMENT_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    await updateOrderRecord(id, { Status: status });
    return NextResponse.json({ ok: true, status });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Update failed" },
      { status: 500 },
    );
  }
}
