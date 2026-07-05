import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { productById, addOnsFor } from "@/lib/products";

export const runtime = "nodejs";

// Immediate post-purchase upsell: a SECOND, separate transaction started from the
// order-confirmation page. Charges only the selected add-ons; the original book
// order is already paid. Linked back to the Airtable order via metadata so the
// webhook can record the extras before the operator makes the book.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const product = productById(body.product);
    if (!product) {
      return NextResponse.json({ error: "Unknown product" }, { status: 400 });
    }
    const available = addOnsFor(product);
    const ids: string[] = Array.isArray(body.addOnIds) ? body.addOnIds : [];
    const selected = available.filter((a) => ids.includes(a.id));
    if (!selected.length) {
      return NextResponse.json({ error: "No add-ons selected" }, { status: 400 });
    }

    const orderId = typeof body.orderId === "string" ? body.orderId : "";
    const dedication =
      selected.some((a) => a.id === "dedication") && typeof body.dedication === "string"
        ? body.dedication.trim().slice(0, 300)
        : "";

    const stripe = getStripe();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || "http://localhost:3000";

    const metadata: Record<string, string> = {
      kind: "addon",
      airtable_record_id: orderId,
      add_ons: selected.map((a) => a.name).join(", "),
    };
    if (dedication) metadata.dedication_message = dedication;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: selected.map((a) => ({
        price_data: {
          currency: "usd",
          product_data: { name: a.name },
          unit_amount: a.priceCents,
        },
        quantity: 1,
      })),
      success_url: `${siteUrl}/order/success?addon=done`,
      cancel_url: `${siteUrl}/order/success?addon=cancel`,
      allow_promotion_codes: true,
      metadata,
      payment_intent_data: { metadata },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("addon checkout error", err);
    return NextResponse.json({ error: err?.message || "Add-on checkout failed" }, { status: 500 });
  }
}
