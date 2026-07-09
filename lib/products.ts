// Central product catalog. Edit prices/copy here; Stripe Price IDs live in env.
export type ProductId =
  | "digital"
  | "paperback_single"
  | "hardcover_single"
  | "paperback_set"
  | "hardcover_set"
  | "subscription_quarterly";

export type Product = {
  id: ProductId;
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
  perBookLabel?: string;
  cadence: "one_time" | "quarterly";
  /** One-time surcharge added to the FIRST invoice only (in cents). Used so the
   * first quarterly shipment is full price and the discount applies from Q2 on —
   * one-and-done subscribers never get the subscribe-and-save discount. */
  firstInvoiceSurchargeCents?: number;
  stripePriceEnvKey: string;
  popular?: boolean;
  bestValue?: boolean;
  bookCount?: number;
  includes?: string[];
  gift?: string;
};

export const PRODUCTS: Product[] = [
  {
    id: "digital",
    name: "Digital Book",
    blurb: "Flip-the-page digital book plus a printable PDF. Fastest delivery.",
    priceCents: 1900,
    priceLabel: "$19",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_DIGITAL",
    bookCount: 1,
    includes: [
      "Fully personalized story & art",
      "Written at your child's reading level",
      "Private link — pages turn like a real book",
      "Printable PDF, emailed within 5 business days",
    ],
  },
  {
    id: "paperback_single",
    name: "Single Paperback",
    blurb: "One custom printed book made just for your early reader.",
    priceCents: 3400,
    priceLabel: "$34",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_PAPERBACK_SINGLE",
    bookCount: 1,
    includes: [
      "One fully personalized paperback",
      "Thick matte paper, full-color art",
      "Free US shipping",
    ],
  },
  {
    id: "hardcover_single",
    name: "Single Hardcover",
    blurb: "One personalized hardcover — a keepsake single, built to last.",
    priceCents: 5900,
    priceLabel: "$59",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_HARDCOVER_SINGLE",
    bookCount: 1,
    gift: "A keepsake single — gift-ready, with a free gift message inside",
    includes: [
      "One fully personalized hardcover",
      "Sewn binding, heavier stock — built to last",
      "Gift-ready — free gift message inside",
      "Free US shipping",
    ],
  },
  {
    id: "paperback_set",
    name: "Paperback Set of 3",
    blurb: "Three personalized stories starring your child, with familiar characters and themes.",
    priceCents: 8900,
    priceLabel: "$89",
    perBookLabel: "$29.67 per book",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_PAPERBACK_SET",
    popular: true,
    bookCount: 3,
    includes: [
      "3 fully personalized paperbacks",
      "The same hero and familiar themes across all three",
      "Thick matte paper, full-color art",
      "Free US shipping",
    ],
  },
  {
    id: "hardcover_set",
    name: "Hardcover Set of 3",
    blurb: "A polished keepsake gift version for families and grandparents.",
    priceCents: 13900,
    priceLabel: "$139",
    perBookLabel: "$46.33 per book",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_HARDCOVER_SET",
    bestValue: true,
    bookCount: 3,
    gift: "The keepsake gift — perfect for grandparents & birthdays",
    includes: [
      "3 fully personalized hardcovers",
      "Sewn binding, heavier stock — built to last",
      "Gift-ready — free gift message inside",
      "Free US shipping",
    ],
  },
  {
    id: "subscription_quarterly",
    name: "Quarterly Reading Club",
    blurb:
      "Three new personalized paperbacks every season, always matched to where your reader actually is — we check in before each set and adjust the level and topics as your child grows. Cancel any time.",
    // Recurring price is $69/quarter; the first shipment is billed at $89 (same
    // as the one-time set) via firstInvoiceSurchargeCents, so subscribers only
    // get the ~22% saving once they continue past the first season.
    priceCents: 6900,
    priceLabel: "$69/season",
    perBookLabel: "$23 per book after your first set",
    cadence: "quarterly",
    stripePriceEnvKey: "STRIPE_PRICE_SUBSCRIPTION_QUARTERLY",
    firstInvoiceSurchargeCents: 2000,
    bookCount: 3,
    gift: "Give a year of reading — a season-by-season gift for grandparents",
    includes: [
      "3 personalized paperbacks each season (4 sets a year)",
      "We check your child's reading level before every set — the books grow with them",
      "Fresh topics each season — new favorite things, new adventures",
      "First season $89, then $69 every season · cancel any time",
      "Free US shipping",
    ],
  },
];

export const productById = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);

export const productByName = (name: string): Product | undefined =>
  PRODUCTS.find((p) => p.name === name);

// ── Checkout add-ons (order bumps) ───────────────────────────────────────────
// Optional extras offered on the final order step. Priced inline at checkout via
// Stripe `price_data`, so no extra Stripe Price IDs are needed. All add-ons are
// one-time charges and only appear for one-time orders (not the monthly club).
export type AddOnId = "digital_copy" | "extra_character" | "practice_cards" | "rush";

export type AddOn = {
  id: AddOnId;
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
  /** Hide for the digital PDF (nothing to wrap / ship). */
  physicalOnly?: boolean;
  /** Show a free-text field when selected (e.g. the dedication message). */
  requiresText?: boolean;
  textPlaceholder?: string;
  /** Teaser only — shown but not selectable/purchasable yet. */
  comingSoon?: boolean;
};

export const ADDONS: AddOn[] = [
  {
    id: "digital_copy",
    name: "Add the digital book",
    blurb: "Get the flip-the-page digital book + printable PDF alongside your printed copy — read it tonight and share with grandparents.",
    priceCents: 800,
    priceLabel: "+$8",
    physicalOnly: true, // only meaningful when they've already bought a printed book
  },
  {
    id: "extra_character",
    name: "Add a loved one to the story",
    blurb: "Write a grandparent, the gift-giver, a sibling, friend, or pet into the story as a special guest — they appear on a few pages, and in every book you order. (A gift message is always free.)",
    priceCents: 1200,
    priceLabel: "+$12",
  },
  {
    id: "practice_cards",
    name: "Reading practice pack",
    blurb: "Cut-out flashcards and a matching game built from your book's own words — extra decoding practice at home.",
    priceCents: 0,
    priceLabel: "Coming soon",
    comingSoon: true,
  },
  {
    id: "rush",
    name: "Rush production",
    blurb: "Jump to the front of the queue — your book is designed first.",
    priceCents: 1500,
    priceLabel: "+$15",
  },
];

export const addOnById = (id: string): AddOn | undefined =>
  ADDONS.find((a) => a.id === id);

/** Add-ons available for a given product (filters out physical-only on digital,
 * and hides all add-ons for the subscription). */
export function addOnsFor(product: Product): AddOn[] {
  if (product.cadence !== "one_time") return [];
  const isDigital = product.id === "digital";
  return ADDONS.filter((a) => !(a.physicalOnly && isDigital));
}
