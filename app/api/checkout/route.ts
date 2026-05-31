import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { productById } from "@/lib/products";

export const runtime = "nodejs";

// Stripe metadata values must be strings and capped at 500 chars each.
function truncate(v: unknown, max = 480): string {
  const s = typeof v === "string" ? v : v == null ? "" : String(v);
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const product = productById(body.product);
    if (!product) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }

    const priceId = process.env[product.stripePriceEnvKey];
    if (!priceId) {
      return NextResponse.json(
        {
          error: `Missing Stripe Price ID for ${product.id}. Set ${product.stripePriceEnvKey} in your environment.`,
        },
        { status: 500 },
      );
    }

    if (!body.parent_email || !body.child_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const isSubscription = product.cadence === "monthly";
    const isDigital = product.id === "digital";

    // Personalization details — flatten into Stripe metadata so it shows up
    // on the Payment / Subscription in the dashboard and in webhook events.
    const metadata: Record<string, string> = {
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

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: body.parent_email,
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order/cancel`,
      allow_promotion_codes: true,
      metadata,
      // For one-time physical orders, collect shipping address via Stripe too
      // (it's also captured on the form, but Stripe-validated addresses help).
      ...(isDigital
        ? {}
        : {
            shipping_address_collection: {
              allowed_countries: ["US"],
            },
          }),
      // Subscriptions: pass metadata to the Subscription object as well so it
      // surfaces on recurring invoices.
      ...(isSubscription
        ? { subscription_data: { metadata } }
        : { payment_intent_data: { metadata } }),
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error", err);
    return NextResponse.json(
      { error: err?.message || "Checkout failed" },
      { status: 500 },
    );
  }
}
