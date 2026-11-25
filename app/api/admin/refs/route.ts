import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { listOrders, updateOrderRecord } from "@/lib/airtable";
import { SHEET_FIELD, PHOTO_FIELD, setSiblings, withPhotoFirst } from "@/lib/bookSet";

export const runtime = "nodejs";
export const maxDuration = 60;

// Persist a SUPPLIED reference image for an order — and, by default, for every
// other book in the same "Book set" — so the same character sheet / child photo
// is used every time, on every book. (Auth enforced by middleware.)
//
// Body: { recordId, kind: "sheet" | "photo", image: <base64 JPEG>, applyToSet?: boolean }
//   sheet -> stored in Blob, URL written to the "Character sheet" column
//   photo -> stored in Blob, URL put FIRST in the "Reference photos" column
// NOTE: the "Character sheet" column must exist in Airtable (long text). If it
// doesn't, Airtable writes drop it silently and nothing is shared.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const recordId = String(body?.recordId || "");
    const kind = body?.kind as "sheet" | "photo";
    const image = String(body?.image || "");
    const applyToSet = body?.applyToSet !== false;
    if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) return NextResponse.json({ error: "Missing or invalid recordId" }, { status: 400 });
    if (kind !== "sheet" && kind !== "photo") return NextResponse.json({ error: "kind must be sheet or photo" }, { status: 400 });
    if (!image || !/^[A-Za-z0-9+/=\s]+$/.test(image)) return NextResponse.json({ error: "Missing image" }, { status: 400 });
    const buf = Buffer.from(image, "base64");
    if (buf.length < 1000 || buf.length > 4_000_000) return NextResponse.json({ error: "Image must be under 4 MB" }, { status: 400 });

    const blob = await put(`refs/${recordId}/${kind}-${Date.now()}.jpg`, buf, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: false,
    });

    const all = await listOrders();
    const order = all.find((o) => o.id === recordId);
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    const targets = [order, ...(applyToSet ? setSiblings(order, all) : [])];
    const updated: string[] = [];
    for (const o of targets) {
      await updateOrderRecord(
        o.id,
        kind === "sheet"
          ? { [SHEET_FIELD]: blob.url }
          : { [PHOTO_FIELD]: withPhotoFirst(o.fields?.[PHOTO_FIELD], blob.url) },
      );
      updated.push(o.id);
    }
    return NextResponse.json({ ok: true, url: blob.url, updated });
  } catch (e: any) {
    console.error("refs route failed:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Saving the reference failed" }, { status: 500 });
  }
}
