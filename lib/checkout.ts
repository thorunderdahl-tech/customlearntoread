// Shared checkout helpers used by both the live order checkout
// (app/api/checkout) and the abandoned-order resume flow (app/api/resume).
// Keeping the metadata shape in one place ensures the Stripe webhook always
// finds the keys it expects, no matter which path created the session.
import type { Product } from "./products";

export function truncate(v: unknown, max = 480): string {
  const s = typeof v === "string" ? v : v == null ? "" : String(v);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Build the Stripe metadata blob from a raw order body. Photos/theme photos and
 * add-ons are added by the caller since they vary by path. */
export function orderToCheckoutMetadata(
  body: Record<string, any>,
  product: Product,
): Record<string, string> {
  return {
    product_id: product.id,
    product_name: product.name,
    parent_name: truncate(body.parent_name),
    parent_email: truncate(body.parent_email),
    child_name: truncate(body.child_name),
    child_age: truncate(body.child_age),
    reading_level: truncate(body.reading_level),
    pronouns: truncate(body.pronouns),
    hair: truncate(body.hair),
    eyes: truncate(body.eyes),
    skin_tone: truncate(body.skin_tone),
    glasses: truncate(body.glasses),
    clothing: truncate(body.clothing),
    look_notes: truncate(body.look_notes),
    theme_1: truncate(body.theme_1),
    theme_2: truncate(body.theme_2),
    theme_3: truncate(body.theme_3),
    special_details: truncate(body.special_details),
    shipping_address: truncate(body.shipping_address),
    other_notes: truncate(body.other_notes),
  };
}
