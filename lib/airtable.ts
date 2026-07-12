// Lightweight Airtable REST client (no SDK dependency — uses fetch).
// Configure via env: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME (optional, defaults to "Orders").
const AIRTABLE_API = "https://api.airtable.com/v0";

function cfg() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const table = process.env.AIRTABLE_TABLE_NAME || "Orders";
  if (!apiKey || !baseId) return null;
  return { apiKey, baseId, table };
}

export function airtableConfigured(): boolean {
  return cfg() !== null;
}

type Fields = Record<string, unknown>;

const UNKNOWN_FIELD_RE = /Unknown field name:\s*"?([^"]+?)"?\s*$/i;

/**
 * Write to Airtable, gracefully dropping any column that doesn't exist in the
 * table yet. New fields (e.g. "Add-ons", "Recovery sent") may not have been
 * added to the base; rather than fail the whole record, we strip the unknown
 * field and retry so the rest of the order still saves.
 */
async function writeWithFieldFallback(
  url: string,
  method: "POST" | "PATCH",
  apiKey: string,
  fields: Fields,
): Promise<Response> {
  const working: Fields = { ...fields };
  // At most one retry per field, plus a safety bound.
  for (let attempt = 0; attempt <= Object.keys(fields).length + 1; attempt++) {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields: working, typecast: true }),
    });
    if (res.ok) return res;
    if (res.status === 422) {
      const text = await res.text().catch(() => "");
      const match = text.match(UNKNOWN_FIELD_RE);
      const missing = match?.[1];
      if (missing && missing in working) {
        delete working[missing];
        console.warn(`Airtable: column "${missing}" not found — saving without it.`);
        continue;
      }
      throw new Error(`Airtable ${method} failed (422): ${text}`);
    }
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable ${method} failed (${res.status}): ${text}`);
  }
  throw new Error("Airtable write failed after stripping unknown fields");
}

/**
 * Create a new order row. Returns the Airtable record id, or null if Airtable
 * isn't configured. Throws on a real API error so callers can log it.
 */
export async function createOrderRecord(fields: Fields): Promise<string | null> {
  const c = cfg();
  if (!c) return null;
  const res = await writeWithFieldFallback(
    `${AIRTABLE_API}/${c.baseId}/${encodeURIComponent(c.table)}`,
    "POST",
    c.apiKey,
    fields,
  );
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Patch an existing order row (e.g. to mark it Paid). No-op if not configured. */
export async function updateOrderRecord(
  recordId: string,
  fields: Fields,
): Promise<void> {
  const c = cfg();
  if (!c) return;
  await writeWithFieldFallback(
    `${AIRTABLE_API}/${c.baseId}/${encodeURIComponent(c.table)}/${recordId}`,
    "PATCH",
    c.apiKey,
    fields,
  );
}

/**
 * Best-effort per-book AI image spend counter. Reads the current "AI images"
 * count on the order and writes count+1. Fire-and-forget: callers should NOT
 * await this on the image-generation hot path, and any failure (missing column,
 * Airtable down) is swallowed so it can never break book generation. If the
 * "AI images" column doesn't exist yet, writeWithFieldFallback drops it silently
 * and this becomes a no-op until the column is added.
 */
export async function bumpImageCount(recordId: string): Promise<void> {
  const c = cfg();
  if (!c || !recordId) return;
  try {
    const rec = await getOrderRecord(recordId);
    const current = Number(rec?.fields?.["AI images"] ?? 0) || 0;
    await updateOrderRecord(recordId, { "AI images": current + 1 });
  } catch (e) {
    console.warn("bumpImageCount failed (continuing):", (e as Error)?.message || e);
  }
}

/** Maps a raw order (full, untruncated) to Airtable column names. */
export function orderToAirtableFields(o: Record<string, any>): Fields {
  const photos = Array.isArray(o.photos)
    ? o.photos
    : typeof o.photos === "string"
      ? o.photos.split(/\s+/).filter(Boolean)
      : [];
  const themePhotos = Array.isArray(o.theme_photos)
    ? o.theme_photos
    : typeof o.theme_photos === "string"
      ? o.theme_photos.split(/\s+/).filter(Boolean)
      : [];
  return {
    Product: o.product_name || o.product || "",
    "Parent name": o.parent_name || "",
    "Parent email": o.parent_email || "",
    "Child name": o.child_name || "",
    Age: o.child_age || "",
    "Reading level": o.reading_level || "",
    Pronouns: o.pronouns || "",
    Hair: o.hair || "",
    Eyes: o.eyes || "",
    "Skin tone": o.skin_tone || "",
    "Glasses / accessories": o.glasses || "",
    Clothing: o.clothing || "",
    "Look notes": o.look_notes || "",
    "Theme 1": o.theme_1 || "",
    "Theme 2": o.theme_2 || "",
    "Theme 3": o.theme_3 || "",
    "Special details": o.special_details || "",
    "Gift message": o.gift_message || "",
    "Add-ons": o.add_ons || "",
    "Shipping address": o.shipping_address || "",
    "Other notes": o.other_notes || "",
    "Parent read-along": o.parent_read_along ? "Yes" : "",
    "Reference photos": photos.join("\n"),
    "Theme photos": themePhotos.join("\n"),
    // Parent's casual "who's in the photo" hint. Sent ONLY when non-empty so
    // orders without it can't fail on a missing column — but once a parent
    // fills it, the "Photo subject" column MUST exist in Airtable (single line
    // text) or order creation 422s. Add the column before deploying this.
    ...(o.photo_note ? { "Photo subject": String(o.photo_note) } : {}),
  };
}

/** Inverse of orderToAirtableFields: rebuild the raw order body (the shape the
 * checkout route expects) from a stored Airtable row. Used to resume an
 * abandoned checkout from the recovery email. */
export function airtableFieldsToOrder(f: Record<string, any>): Record<string, any> {
  const lines = (v: any): string[] =>
    typeof v === "string" ? v.split(/\s+/).filter(Boolean) : [];
  return {
    product_name: f["Product"] || "",
    parent_name: f["Parent name"] || "",
    parent_email: f["Parent email"] || "",
    child_name: f["Child name"] || "",
    child_age: f["Age"] || "",
    reading_level: f["Reading level"] || "",
    pronouns: f["Pronouns"] || "",
    hair: f["Hair"] || "",
    eyes: f["Eyes"] || "",
    skin_tone: f["Skin tone"] || "",
    glasses: f["Glasses / accessories"] || "",
    clothing: f["Clothing"] || "",
    look_notes: f["Look notes"] || "",
    theme_1: f["Theme 1"] || "",
    theme_2: f["Theme 2"] || "",
    theme_3: f["Theme 3"] || "",
    special_details: f["Special details"] || "",
    gift_message: f["Gift message"] || "",
    shipping_address: f["Shipping address"] || "",
    other_notes: f["Other notes"] || "",
    photos: lines(f["Reference photos"]),
    photo_note: f["Photo subject"] || "",
    theme_photos: lines(f["Theme photos"]),
  };
}

/** Fulfillment pipeline stages, in order. Status is a single-select in Airtable;
 * typecast:true auto-creates any option that doesn't exist yet.
 * "Abandoned" is set automatically by the webhook on checkout.session.expired. */
export const FULFILLMENT_STATUSES = [
  "Pending payment",
  "Abandoned",
  "Paid",
  "Generating", // unattended pipeline is producing the candidate (lib/pipeline.ts)
  "Ready for review", // candidate complete, every page passed QA — approve & deliver
  "Needs attention", // pipeline flagged pages / hit the image cap / got stuck
  "Designing", // manual lane (admin create screen)
  "Printing",
  "Shipped",
  "Delivered",
  "Cancelled",
] as const;

export interface AirtableOrder {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

/** Fetch a single order row by record id, or null if not found / not configured. */
export async function getOrderRecord(recordId: string): Promise<AirtableOrder | null> {
  const c = cfg();
  if (!c) return null;
  const res = await fetch(
    `${AIRTABLE_API}/${c.baseId}/${encodeURIComponent(c.table)}/${recordId}`,
    { headers: { Authorization: `Bearer ${c.apiKey}` }, cache: "no-store" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable get failed (${res.status}): ${text}`);
  }
  return (await res.json()) as AirtableOrder;
}

/** Fetch every order row (handles pagination), newest first. */
export async function listOrders(): Promise<AirtableOrder[]> {
  const c = cfg();
  if (!c) return [];
  const records: AirtableOrder[] = [];
  let offset: string | undefined;
  do {
    const url = new URL(`${AIRTABLE_API}/${c.baseId}/${encodeURIComponent(c.table)}`);
    url.searchParams.set("pageSize", "100");
    if (offset) url.searchParams.set("offset", offset);
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${c.apiKey}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Airtable list failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as {
      records: AirtableOrder[];
      offset?: string;
    };
    records.push(...data.records);
    offset = data.offset;
  } while (offset);
  records.sort((a, b) => (a.createdTime < b.createdTime ? 1 : -1));
  return records;
}
