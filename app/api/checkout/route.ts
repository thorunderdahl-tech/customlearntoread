import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { productById } from "@/lib/products";
import {
  createOrderRecord,
  orderToAirtableFields,
  airtableConfigured,
} from "@/lib/airtable";

export const runtime = "nodejs";

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
    if (
      typeof body.parent_email !== "string" ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.parent_email.trim())
    ) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 },
      );
    }
    body.parent_email = body.parent_email.trim();

    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const isSubscription = product.cadence === "monthly";
    const isDigital = product.id === "digital";

    // Only accept photo URLs from our own Cloudinary account (these get embedded
    // as <img> in the owner email and stored in Airtable), and cap at 3 each.
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "";
    const isOurPhoto = (p: any): p is string =>
      typeof p === "string" &&
      (cloudName
        ? p.startsWith(`https://res.cloudinary.com/${cloudName}/`)
        : p.startsWith("https://res.cloudinary.com/"));
    const photos = Array.isArray(body.photos) ? body.photos.filter(isOurPhoto).slice(0, 3) : [];
    const themePhotos = Array.isArray(body.theme_photos) ? body.theme_photos.filter(isOurPhoto).slice(0, 3) : [];

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
    if (photos.length > 0) {
      metadata.photos = truncate(photos.join(" "));
    }
    if (themePhotos.length > 0) {
      metadata.theme_photos = truncate(themePhotos.join(" "));
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
          }),
          Status: "Pending payment",
        });
        if (recordId) metadata.airtable_record_id = recordId;
      } catch (e) {
        // Don't block checkout if Airtable is down — the order email is the backup.
        console.error("airtable create failed (continuing to checkout)", e);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      line_items: [{ price: priceId, quantity: 1 }],
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
