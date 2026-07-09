import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { productByName } from "@/lib/products";
import { orderToCheckoutMetadata, truncate } from "@/lib/checkout";
import { getOrderRecord, airtableFieldsToOrder } from "@/lib/airtable";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Statuses that mean "this checkout never completed" — both are resumable.
// "Abandoned" is set by the webhook when the Stripe session expires (~24h).
const RESUMABLE_STATUSES = new Set(["Pending payment", "Abandoned", "Recovery sent"]);

// One-click "finish your order" link from the abandoned-order recovery email.
// Rebuilds a fresh Stripe Checkout session from the order we already stored in
// Airtable, reusing the same record id so the webhook flips THIS row to Paid.
export async function GET(req: NextRequest) {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    "http://localhost:3000";
  const fallback = NextResponse.redirect(`${siteUrl}/order`);

  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return fallback;

    const record = await getOrderRecord(id);
    if (!record) return fallback;

    // Already paid (or being fulfilled) — send them to a friendly thank-you.
    const status = (record.fields["Status"] as string) || "";
    if (status && !RESUMABLE_STATUSES.has(status)) {
      return NextResponse.redirect(`${siteUrl}/order/success`);
    }

    const body = airtableFieldsToOrder(record.fields);
    const product = productByName(body.product_name);
    if (!product) return fallback;

    const priceId = process.env[product.stripePriceEnvKey];
    if (!priceId) return fallback;

    const isSubscription = product.cadence === "quarterly";
    const isDigital = product.id === "digital";

    const metadata: Record<string, string> = orderToCheckoutMetadata(body, product);
    if (Array.isArray(body.photos) && body.photos.length > 0) {
      metadata.photos = truncate(body.photos.join(" "));
    }
    if (Array.isArray(body.theme_photos) && body.theme_photos.length > 0) {
      metadata.theme_photos = truncate(body.theme_photos.join(" "));
    }
    metadata.airtable_record_id = record.id;
    metadata.resumed = "true";

    const stripe = getStripe();
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: lineItems,
      customer_email: body.parent_email || undefined,
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order/cancel`,
      allow_promotion_codes: true,
      metadata,
      ...(isDigital
        ? {}
        : { shipping_address_collection: { allowed_countries: ["US"] } }),
      ...(isSubscription
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
    });

    return NextResponse.redirect(session.url || `${siteUrl}/order`);
  } catch (err) {
    console.error("resume checkout error", err);
    return fallback;
  }
}
