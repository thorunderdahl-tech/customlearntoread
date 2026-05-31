// Central product catalog. Edit prices/copy here; Stripe Price IDs live in env.
export type ProductId =
  | "digital"
  | "paperback_single"
  | "paperback_set"
  | "hardcover_set"
  | "subscription_monthly";

export type Product = {
  id: ProductId;
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
  cadence: "one_time" | "monthly";
  stripePriceEnvKey: string;
  popular?: boolean;
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
  },
  {
    id: "paperback_single",
    name: "Single Paperback",
    blurb: "One custom printed book made just for your early reader.",
    priceCents: 3400,
    priceLabel: "$34",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_PAPERBACK_SINGLE",
  },
  {
    id: "paperback_set",
    name: "Paperback Set of 3",
    blurb: "Three personalized stories with repeated words and familiar themes.",
    priceCents: 8900,
    priceLabel: "$89",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_PAPERBACK_SET",
    popular: true,
  },
  {
    id: "hardcover_set",
    name: "Hardcover Set of 3",
    blurb: "A polished keepsake gift version for families and grandparents.",
    priceCents: 12900,
    priceLabel: "$129",
    cadence: "one_time",
    stripePriceEnvKey: "STRIPE_PRICE_HARDCOVER_SET",
  },
  {
    id: "subscription_monthly",
    name: "Monthly Book Club",
    blurb:
      "One new personalized paperback book every month. Cancel any time. Themes change as your reader grows.",
    priceCents: 2400,
    priceLabel: "$24/mo",
    cadence: "monthly",
    stripePriceEnvKey: "STRIPE_PRICE_SUBSCRIPTION_MONTHLY",
  },
];

export const productById = (id: string): Product | undefined =>
  PRODUCTS.find((p) => p.id === id);
