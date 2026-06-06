// Central product catalog. Edit prices/copy here; Stripe Price IDs live in env.
export type ProductId =
  | "digital"
  | "paperback_single"
  | "hardcover_single"
  | "paperback_set"
  | "hardcover_set"
  | "subscription_monthly";

export type Product = {
  id: ProductId;
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
  perBookLabel?: string;
  cadence: "one_time" | "monthly";
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
    name: "Digital PDF",
    blurb: "Printable PDF for home reading and practice. Fastest delivery.",
    priceCents: 1900,
    priceLabel: "$19",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_DIGITAL",
    bookCount: 1,
    includes: [
      "Fully personalized story & art",
      "Written at your child's reading level",
      "Emailed within 5 business days",
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
    priceCents: 5400,
    priceLabel: "$54",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_HARDCOVER_SINGLE",
    bookCount: 1,
    gift: "A keepsake single — gift-ready with a dedication page",
    includes: [
      "One fully personalized hardcover",
      "Sewn binding, heavier stock — built to last",
      "Gift-ready with a dedication page",
      "Free US shipping",
    ],
  },
  {
    id: "paperback_set",
    name: "Paperback Set of 3",
    blurb: "Three personalized stories with repeated words and familiar themes.",
    priceCents: 8900,
    priceLabel: "$89",
    perBookLabel: "$29.67 per book",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_PAPERBACK_SET",
    popular: true,
    bookCount: 3,
    includes: [
      "3 fully personalized paperbacks",
      "Themes & reading level build together",
      "Thick matte paper, full-color art",
      "Free US shipping",
    ],
  },
  {
    id: "hardcover_set",
    name: "Hardcover Set of 3",
    blurb: "A polished keepsake gift version for families and grandparents.",
    priceCents: 12900,
    priceLabel: "$129",
    perBookLabel: "$43 per book",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_HARDCOVER_SET",
    bestValue: true,
    bookCount: 3,
    gift: "The keepsake gift — perfect for grandparents & birthdays",
    includes: [
      "3 fully personalized hardcovers",
      "Sewn binding, heavier stock — built to last",
      "Gift-ready with a dedication page",
      "Free US shipping",
    ],
  },
  {
    id: "subscription_monthly",
    name: "Monthly Book Club",
    blurb:
      "One new personalized paperback book every month. Cancel any time. Themes change as your reader grows.",
    priceCents: 2400,
    priceLabel: "$24/mo",
    perBookLabel: "Just $24 per book",
    cadence: "monthly",
    stripePriceEnvKey: "STRIPE_PRICE_SUBSCRIPTION_MONTHLY",
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
export type AddOnId = "rush" | "extra_character" | "gift_wrap";

export type AddOn = {
  id: AddOnId;
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
  /** Hide for the digital PDF (nothing to wrap / ship). */
  physicalOnly?: boolean;
};

export const ADDONS: AddOn[] = [
  {
    id: "rush",
    name: "Rush production",
    blurb: "Jump to the front of the queue — your book is designed first.",
    priceCents: 1500,
    priceLabel: "+$15",
  },
  {
    id: "extra_character",
    name: "Add a 2nd character",
    blurb: "Write in a sibling, friend, or pet as a second star of the story.",
    priceCents: 1200,
    priceLabel: "+$12",
  },
  {
    id: "gift_wrap",
    name: "Gift wrap + handwritten note",
    blurb: "Gift-wrapped with a handwritten card — birthday & grandparent ready.",
    priceCents: 600,
    priceLabel: "+$6",
    physicalOnly: true,
  },
];

export const addOnById = (id: string): AddOn | undefined =>
  ADDONS.find((a) => a.id === id);

/** Add-ons available for a given product (filters out physical-only on digital,
 * and hides all add-ons for the subscription). */
export function addOnsFor(product: Product): AddOn[] {
  if (product.cadence === "monthly") return [];
  const isDigital = product.id === "digital";
  return ADDONS.filter((a) => !(a.physicalOnly && isDigital));
}
