"use client";

import { useState } from "react";
import { productById, addOnsFor } from "@/lib/products";

// Immediate post-purchase upsell shown on the confirmation page. Selecting add-ons
// starts a second Stripe checkout (Stripe Link makes it near one-tap for the card
// they just used). Dismissible — ignoring it just leaves the normal confirmation.
export default function UpsellOffers({ productId, orderId }: { productId: string; orderId: string }) {
  const product = productById(productId);
  const addons = product ? addOnsFor(product) : [];
  const [sel, setSel] = useState<string[]>([]);
  const [dedication, setDedication] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!product || addons.length === 0) return null;

  const chosen = addons.filter((a) => sel.includes(a.id));
  const total = chosen.reduce((s, a) => s + a.priceCents, 0);
  const dedicationSelected = sel.includes("dedication");
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function addToOrder() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout-addon", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product: productId, orderId, addOnIds: sel, dedication }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (e: any) {
      setError(e?.message || "Checkout failed");
      setBusy(false);
    }
  }

  return (
    <div style={{ border: "1px solid #f0e7d8", background: "#fffaf2", borderRadius: 14, padding: "20px 22px", margin: "8px 0 28px", textAlign: "left" }}>
      <p className="eyebrow" style={{ margin: 0 }}>Before you go</p>
      <h2 style={{ margin: "4px 0 4px" }}>Make it even more special</h2>
      <p style={{ marginTop: 0, color: "#6b6257" }}>Add these to this order in one tap — no need to re-enter anything.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {addons.map((a) => {
          const on = sel.includes(a.id);
          return (
            <div key={a.id}>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", border: `1px solid ${on ? "#f5b78d" : "#f0e7d8"}`, borderRadius: 10, padding: "10px 12px", background: on ? "#fff4e9" : "#fff" }}>
                <input type="checkbox" checked={on} onChange={() => toggle(a.id)} style={{ marginTop: 4, width: "auto" }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 8, fontWeight: 700 }}>
                    <span>{a.name}</span>
                    <span style={{ color: "#b96e3c", whiteSpace: "nowrap" }}>{a.priceLabel}</span>
                  </span>
                  <span style={{ display: "block", color: "#6b6257", fontSize: ".9rem", marginTop: 2 }}>{a.blurb}</span>
                </span>
              </label>
              {a.requiresText && on && (
                <input
                  type="text"
                  value={dedication}
                  onChange={(e) => setDedication(e.target.value)}
                  placeholder={a.textPlaceholder || "Your message"}
                  maxLength={200}
                  style={{ width: "100%", marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid #eadccb" }}
                />
              )}
            </div>
          );
        })}
      </div>

      {error && <p style={{ color: "#8c2f25", marginTop: 12 }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          className="button primary"
          onClick={addToOrder}
          disabled={busy || chosen.length === 0 || (dedicationSelected && !dedication.trim())}
        >
          {busy ? "Redirecting…" : chosen.length ? `Add to my order · $${(total / 100).toFixed(2)}` : "Select an add-on"}
        </button>
        <p style={{ fontSize: ".85rem", color: "#6b6257", marginTop: 10 }}>
          No thanks — your book is already confirmed. These are optional extras.
        </p>
      </div>
    </div>
  );
}
