import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { productById, addOnById } from "@/lib/products";
import { truncate, orderToCheckoutMetadata } from "@/lib/checkout";
import {
  createOrderRecord,
  orderToAirtableFields,
  airtableConfigured,
} from "@/lib/airtable";

export const runtime = "nodejs";

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

    const photos = Array.isArray(body.photos) ? body.photos.filter((p: any) => typeof p === "string") : [];
    const themePhotos = Array.isArray(body.theme_photos) ? body.theme_photos.filter((p: any) => typeof p === "string") : [];

    // Resolve add-ons. Never offered on the subscription; gift wrap is physical-only.
    const selectedAddons = (Array.isArray(body.addons) ? body.addons : [])
      .map((id: any) => addOnById(typeof id === "string" ? id : ""))
      .filter((a: any): a is NonNullable<ReturnType<typeof addOnById>> => !!a)
      .filter((a: NonNullable<ReturnType<typeof addOnById>>) =>
        !isSubscription && !(a.physicalOnly && isDigital),
      );
    const addOnSummary = selectedAddons
      .map((a: NonNullable<ReturnType<typeof addOnById>>) => `${a.name} (+$${(a.priceCents / 100).toFixed(2)})`)
      .join(", ");

    const metadata: Record<string, string> = orderToCheckoutMetadata(body, product);
    if (photos.length > 0) {
      metadata.photos = truncate(photos.join(" "));
    }
    if (themePhotos.length > 0) {
      metadata.theme_photos = truncate(themePhotos.join(" "));
    }
    if (addOnSummary) {
      metadata.add_ons = truncate(addOnSummary);
    }

    // Save the FULL, untruncated order to Airtable before payment so nothing
    // is ever lost (Stripe metadata caps each value at 500 chars). We stash the
    // returned record id in metadata so the webhook can flip its status to Paid.
    if (airtableConfigured()) {
      try {
        const recordId = await createOrderRecord({
          ...orderToAirtableFields({
            ...body,
            product_name: product.name,
            photos,
            theme_photos: themePhotos,
            add_ons: addOnSummary,
          }),
          Status: "Pending payment",
        });
        if (recordId) metadata.airtable_record_id = recordId;
      } catch (e) {
        // Don't block checkout if Airtable is down — the order email is the backup.
        console.error("airtable create failed (continuing to checkout)", e);
      }
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      { price: priceId, quantity: 1 },
    ];
    // Add-ons are inline one-time prices, so the owner never has to create a
    // Stripe Price for each. Only added on one-time orders (filtered above).
    for (const a of selectedAddons) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: a.priceCents,
          product_data: { name: a.name, description: a.blurb },
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: lineItems,
      customer_email: body.parent_email,
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/order/cancel`,
      allow_promotion_codes: true,
      metadata,
      ...(isDigital
        ? {}
        : {
            shipping_address_collection: {
              allowed_countries: ["US"],
            },
          }),
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
