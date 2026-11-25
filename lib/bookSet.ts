// Book sets: several orders for the same child that must share ONE look.
//
// Orders are tied together by the Airtable "Book set" column (same text on every
// book in the set). A set shares:
//   - "Character sheet"  — URL of an approved/supplied character sheet. When
//                          present, the sheet is REUSED, never redrawn, so the
//                          hero is identical in every book of the set.
//   - "Reference photos" — the first URL is the real photo of the child, used to
//                          verify the sheet.
// An order's own value wins; otherwise the value is borrowed from a sibling in
// the same set (lowest "Set book #" first). Orders with no "Book set" still
// honor their own "Character sheet" column.
//
// Pure functions only — imported by both the admin create screen (client) and
// the unattended pipeline (server).

export const SET_FIELD = "Book set";
export const SET_ORDER_FIELD = "Set book #";
export const SHEET_FIELD = "Character sheet";
export const PHOTO_FIELD = "Reference photos";

type Row = { id: string; createdTime?: string; fields?: Record<string, any> };

const urls = (v: unknown): string[] =>
  String(v ?? "").split(/\s+/).filter((s) => /^https?:\/\//i.test(s));

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
  /** Real photo of the child, if any. */
  photoUrl?: string;
  photoFrom?: "order" | "set";
}

/** Resolve the shared references for an order: its own first, then its set's. */
export function resolveSetRefs(order: Row, all: Row[]): SetRefs {
  const siblings = setSiblings(order, all);
  const out: SetRefs = { setName: setNameOf(order), siblingIds: siblings.map((s) => s.id) };

  const ownSheet = urls(order.fields?.[SHEET_FIELD])[0];
  if (ownSheet) { out.sheetUrl = ownSheet; out.sheetFrom = "order"; }
  else {
    const s = siblings.map((o) => urls(o.fields?.[SHEET_FIELD])[0]).find(Boolean);
    if (s) { out.sheetUrl = s; out.sheetFrom = "set"; }
  }

  const ownPhoto = urls(order.fields?.[PHOTO_FIELD])[0];
  if (ownPhoto) { out.photoUrl = ownPhoto; out.photoFrom = "order"; }
  else {
    const p = siblings.map((o) => urls(o.fields?.[PHOTO_FIELD])[0]).find(Boolean);
    if (p) { out.photoUrl = p; out.photoFrom = "set"; }
  }
  return out;
}

/** New "Reference photos" value with `url` first and no duplicates. */
export function withPhotoFirst(existing: unknown, url: string): string {
  return [url, ...urls(existing).filter((u) => u !== url)].join("\n");
}
