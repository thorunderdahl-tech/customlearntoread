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

/**
 * Create a new order row. Returns the Airtable record id, or null if Airtable
 * isn't configured. Throws on a real API error so callers can log it.
 */
export async function createOrderRecord(fields: Fields): Promise<string | null> {
  const c = cfg();
  if (!c) return null;
  const res = await fetch(
    `${AIRTABLE_API}/${c.baseId}/${encodeURIComponent(c.table)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, typecast: true }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable create failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { id: string };
  return data.id;
}

/** Fetch a single order row by record id. Returns null if not configured or not found. */
export async function getOrderRecord(
  recordId: string,
): Promise<{ id: string; fields: Record<string, any> } | null> {
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
  return (await res.json()) as { id: string; fields: Record<string, any> };
}

/** Patch an existing order row (e.g. to mark it Paid). No-op if not configured. */
export async function updateOrderRecord(
  recordId: string,
  fields: Fields,
): Promise<void> {
  const c = cfg();
  if (!c) return;
  const res = await fetch(
    `${AIRTABLE_API}/${c.baseId}/${encodeURIComponent(c.table)}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${c.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields, typecast: true }),
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Airtable update failed (${res.status}): ${text}`);
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
    "Shipping address": o.shipping_address || "",
    "Other notes": o.other_notes || "",
    "Reference photos": photos.join("\n"),
    "Theme photos": themePhotos.join("\n"),
  };
}

/** Fulfillment pipeline stages, in order. Status is a single-select in Airtable;
 * typecast:true auto-creates any option that doesn't exist yet. */
export const FULFILLMENT_STATUSES = [
  "Pending payment",
  "Abandoned",
  "Paid",
  "Designing",
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
