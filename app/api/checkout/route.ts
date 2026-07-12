import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { productById } from "@/lib/products";
import {
  createOrderRecord,
  orderToAirtableFields,
  airtableConfigured,
} from "@/lib/airtable";
import { screenFields } from "@/lib/moderation";

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

    // Privacy/consent must be accepted server-side, not just in the browser — a
    // crafted request could otherwise skip the checkbox. Photos raise the bar:
    // uploading a child's photo requires the same accepted consent.
    if (body.consent !== true) {
      return NextResponse.json(
        { error: "Please accept the privacy terms to continue." },
        { status: 400 },
      );
    }

    // Content moderation: nothing offensive can reach a printed, permanent book.
    // Screen every free-text field the customer can type (and the gift message).
    const screen = screenFields({
      parent_name: body.parent_name,
      child_name: body.child_name,
      look_notes: body.look_notes,
      photo_note: body.photo_note,
      clothing: body.clothing,
      special_details: body.special_details,
      other_notes: body.other_notes,
      gift_message: body.gift_message,
      loved_one: body.loved_one,
      theme_1: body.theme_1,
      theme_2: body.theme_2,
      theme_3: body.theme_3,
    });
    if (!screen.ok) {
      return NextResponse.json(
        { error: "Sorry — one of your entries contains language we can't print in a children's book. Please edit it and try again." },
        { status: 400 },
      );
    }

    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      "http://localhost:3000";

    const isSubscription = product.cadence !== "one_time";
    const isDigital = product.id === "digital";

    // Subscription line items: the recurring price plus, for plans that set it,
    // a one-time surcharge added to the FIRST invoice only. This makes the first
    // shipment full price ($89) and the discounted rate ($69) apply from the
    // second season on — a one-and-done subscriber never gets the discount.
    const lineItems: any[] = [{ price: priceId, quantity: 1 }];
    if (isSubscription && product.firstInvoiceSurchargeCents) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "First season — full-price setup" },
          unit_amount: product.firstInvoiceSurchargeCents,
        },
        quantity: 1,
      });
    }

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

    // ---- Friends & family / tester bypass ----------------------------------
    // A matching code (env FRIENDS_CODE, default FAMILYANDFRIENDS) skips Stripe
    // entirely: the order files straight to Airtable as Paid, flows through the
    // normal admin + pipeline path, and the buyer lands on the regular success
    // page. Checked server-side only; the order is labeled in the Add-ons
    // column so it can never be mistaken for revenue. No webhook fires, so no
    // payment emails go out — it appears in the admin dropdown and daily digest.
    const enteredCode = String(body.friends_code || "").replace(/[\s-]/g, "").toUpperCase();
    if (enteredCode) {
      const friendsCode = (process.env.FRIENDS_CODE || "FAMILYANDFRIENDS").replace(/[\s-]/g, "").toUpperCase();
      if (enteredCode !== friendsCode) {
        return NextResponse.json(
          { error: "That friends & family code isn't valid — double-check it, or clear the field to pay by card." },
          { status: 400 },
        );
      }
      if (!airtableConfigured()) {
        return NextResponse.json({ error: "Friends & family orders aren't available right now — please try again later." }, { status: 503 });
      }
      const recordId = await createOrderRecord({
        ...orderToAirtableFields({
          ...body,
          product_name: product.name,
          photos,
          theme_photos: themePhotos,
          add_ons: [body.add_ons, "FRIENDS & FAMILY — no payment (code)"].filter(Boolean).join(" | "),
        }),
        Status: "Paid",
      });
      return NextResponse.json({
        url: `${siteUrl}/order/success?ff=1${body.parent_read_along ? "&rla=1" : ""}&pid=${encodeURIComponent(product.id)}${recordId ? `&oid=${recordId}` : ""}`,
      });
    }

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
      gift_message: truncate(body.gift_message),
      shipping_address: truncate(body.shipping_address),
      other_notes: truncate(body.other_notes),
    };
    if (photos.length > 0) {
      metadata.photos = truncate(photos.join(" "));
    }
    if (body.photo_note) {
      metadata.photo_note = truncate(body.photo_note);
    }
    if (themePhotos.length > 0) {
      metadata.theme_photos = truncate(themePhotos.join(" "));
    }
    // Optional, free content option (opt-in). Carried as metadata only — no line item.
    if (body.parent_read_along) {
      metadata.parent_read_along = "Yes";
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
      line_items: lineItems,
      customer_email: body.parent_email,
      success_url: `${siteUrl}/order/success?session_id={CHECKOUT_SESSION_ID}${body.parent_read_along ? "&rla=1" : ""}&pid=${encodeURIComponent(product.id)}${metadata.airtable_record_id ? `&oid=${metadata.airtable_record_id}` : ""}`,
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
    // Log only the message — the full error can echo request params (PII).
    console.error("checkout error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Checkout failed" },
      { status: 500 },
    );
  }
}
