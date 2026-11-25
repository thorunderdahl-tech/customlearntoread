// Book sets: several orders for the same child that must share ONE look.
//
// Orders are tied together by the Airtable "Book set" column (same text on every
// book in the set). A set shares:
//   - "Character sheet"  — URL of an approved/supplied character sheet. When
//                          present, the sheet is REUSED, never redrawn, so the
//                          hero is identical in every book of the set.
//   - "Reference photos" — the first URL is the real photo of the child, used to
//                          verify the sheet.
//   - "Art Files for Reference" — an Airtable ATTACHMENT column. Drop the sheet
//                          and the child's photo straight onto the row: a file
//                          whose name says sheet/character/ChatGPT is the sheet,
//                          one that looks like a camera photo (IMG_…, photo) is
//                          the photo; otherwise 1st file = sheet, 2nd = photo.
//                          Attachment URLs EXPIRE after a couple of hours, so
//                          callers copy them into Blob (`temp: true` below).
// An order's own value wins; otherwise the value is borrowed from a sibling in
// the same set (lowest "Set book #" first). Orders with no "Book set" still
// honor their own columns.
//
// Pure functions only — imported by both the admin create screen (client) and
// the unattended pipeline (server).

export const SET_FIELD = "Book set";
export const SET_ORDER_FIELD = "Set book #";
export const SHEET_FIELD = "Character sheet";
export const PHOTO_FIELD = "Reference photos";
export const FILES_FIELD = "Art Files for Reference";

type Row = { id: string; createdTime?: string; fields?: Record<string, any> };

const urls = (v: unknown): string[] =>
  String(v ?? "").split(/\s+/).filter((s) => /^https?:\/\//i.test(s));

/** Sheet + photo picked out of the row's attachment column (expiring URLs). */
export function artFiles(o: Row | null | undefined): { sheet?: string; photo?: string } {
  const raw = o?.fields?.[FILES_FIELD];
  const list: { url: string; filename?: string; type?: string }[] = Array.isArray(raw)
    ? raw.filter((a) => a && /^https?:\/\//i.test(String(a.url || "")) && /^image\//i.test(String(a.type || "image/")))
    : [];
  if (!list.length) return {};
  const name = (a: { filename?: string }) => String(a.filename || "").toLowerCase();
  let sheet = list.find((a) => /sheet|character|chatgpt|turnaround/.test(name(a)));
  let photo = list.find((a) => a !== sheet && /photo|^img[_-]|^dsc|^pxl|portrait/.test(name(a)));
  const rest = list.filter((a) => a !== sheet && a !== photo);
  if (!sheet) sheet = rest.shift();
  if (!photo) photo = rest.shift();
  return { sheet: sheet?.url, photo: photo?.url };
}

export const setNameOf = (o: Row | null | undefined): string =>
  String(o?.fields?.[SET_FIELD] ?? "").trim();

const sameSet = (a: string, b: string) => !!a && a.toLowerCase() === b.toLowerCase();

/** Every OTHER order in the same set, in set order (then oldest first). */
export function setSiblings(order: Row, all: Row[]): Row[] {
  const name = setNameOf(order);
  if (!name) return [];
  const pos = (o: Row) => Number(o.fields?.[SET_ORDER_FIELD]) || 999;
  return all
    .filter((o) => o.id !== order.id && sameSet(setNameOf(o), name))
    .sort((a, b) => pos(a) - pos(b) || String(a.createdTime || "").localeCompare(String(b.createdTime || "")));
}

export interface SetRefs {
  setName: string;
  siblingIds: string[];
  /** Supplied/approved character sheet to reuse, if any. */
  sheetUrl?: string;
  sheetFrom?: "order" | "set";
  /** True when sheetUrl is an expiring Airtable attachment URL — copy it to Blob. */
  sheetTemp?: boolean;
  /** Real photo of the child, if any. */
  photoUrl?: string;
  photoFrom?: "order" | "set";
  photoTemp?: boolean;
}

/** Resolve the shared references for an order: its own first, then its set's. */
export function resolveSetRefs(order: Row, all: Row[]): SetRefs {
  const siblings = setSiblings(order, all);
  const out: SetRefs = { setName: setNameOf(order), siblingIds: siblings.map((s) => s.id) };

  // Saved URLs (permanent) beat attachments (expiring); own beats the set's.
  const rows: { o: Row; from: "order" | "set" }[] = [{ o: order, from: "order" }, ...siblings.map((o) => ({ o, from: "set" as const }))];

  const sheet =
    rows.map((r) => ({ url: urls(r.o.fields?.[SHEET_FIELD])[0], from: r.from, temp: false })).find((x) => x.url) ||
    rows.map((r) => ({ url: artFiles(r.o).sheet, from: r.from, temp: true })).find((x) => x.url);
  if (sheet?.url) { out.sheetUrl = sheet.url; out.sheetFrom = sheet.from; out.sheetTemp = sheet.temp; }

  const photo =
    rows.map((r) => ({ url: urls(r.o.fields?.[PHOTO_FIELD])[0], from: r.from, temp: false })).find((x) => x.url) ||
    rows.map((r) => ({ url: artFiles(r.o).photo, from: r.from, temp: true })).find((x) => x.url);
  if (photo?.url) { out.photoUrl = photo.url; out.photoFrom = photo.from; out.photoTemp = photo.temp; }
  return out;
}

/** New "Reference photos" value with `url` first and no duplicates. */
export function withPhotoFirst(existing: unknown, url: string): string {
  return [url, ...urls(existing).filter((u) => u !== url)].join("\n");
}
