"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PRODUCTS, type ProductId } from "@/lib/products";

type FormState = {
  product: ProductId;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: string;
  reading_level: string;
  pronouns: string;
  hair: string;
  eyes: string;
  skin_tone: string;
  glasses: string;
  clothing: string;
  look_notes: string;
  theme_1: string;
  theme_2: string;
  theme_3: string;
  special_details: string;
  shipping_address: string;
  other_notes: string;
  consent: boolean;
};

const initial: FormState = {
  product: "paperback_set",
  parent_name: "",
  parent_email: "",
  child_name: "",
  child_age: "",
  reading_level: "Level 1 — brand-new reader",
  pronouns: "",
  hair: "",
  eyes: "",
  skin_tone: "",
  glasses: "",
  clothing: "",
  look_notes: "",
  theme_1: "",
  theme_2: "",
  theme_3: "",
  special_details: "",
  shipping_address: "",
  other_notes: "",
  consent: false,
};

export default function OrderForm() {
  const params = useSearchParams();
  const [state, setState] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preselect product from query string (?plan=subscription_monthly)
  useEffect(() => {
    const plan = params.get("plan");
    if (plan && PRODUCTS.some((p) => p.id === plan)) {
      setState((s) => ({ ...s, product: plan as ProductId }));
    }
  }, [params]);

  const product = PRODUCTS.find((p) => p.id === state.product)!;
  const isSubscription = product.cadence === "monthly";
  const isDigital = product.id === "digital";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic required-field checks
    const missing: string[] = [];
    if (!state.parent_name.trim()) missing.push("Your name");
    if (!state.parent_email.trim()) missing.push("Email");
    if (!state.child_name.trim()) missing.push("Child's name");
    if (!state.child_age.trim()) missing.push("Age");
    if (!state.theme_1.trim()) missing.push("Theme 1");
    if (!isDigital && !state.shipping_address.trim()) {
      missing.push("Shipping address");
    }
    if (!state.consent) missing.push("Personalization consent");
    if (missing.length) {
      setError(`Please fill in: ${missing.join(", ")}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: any) {
      setError(err.message || "Checkout failed");
      setSubmitting(false);
    }
  }

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <fieldset className="card">
        <legend>1. Pick your book</legend>
        <div className="format-grid">
          {PRODUCTS.map((p) => (
            <label
              key={p.id}
              className={`format-option${
                state.product === p.id ? " checked" : ""
              }`}
            >
              <input
                type="radio"
                name="product"
                value={p.id}
                checked={state.product === p.id}
                onChange={() => update("product", p.id)}
              />
              <span className="name">{p.name}</span>
              <span className="desc">{p.blurb}</span>
              <span className="price-row">
                <span>{p.priceLabel}</span>
                <span>{p.cadence === "monthly" ? "Subscription" : "One-time"}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="card">
        <legend>2. Reader details</legend>
        <label>
          Child&apos;s first name *
          <input
            type="text"
            value={state.child_name}
            onChange={(e) => update("child_name", e.target.value)}
            placeholder="Odin"
            required
          />
        </label>
        <label>
          Age *
          <input
            type="text"
            value={state.child_age}
            onChange={(e) => update("child_age", e.target.value)}
            placeholder="5"
            required
          />
        </label>
        <label>
          Reading level
          <select
            value={state.reading_level}
            onChange={(e) => update("reading_level", e.target.value)}
          >
            <option>Level 1 — brand-new reader</option>
            <option>Level 2 — very early reader</option>
            <option>Level 3 — growing reader</option>
            <option>Level 4 — more confident reader</option>
            <option>Not sure — please pick for me</option>
          </select>
          <span className="hint">When in doubt, choose the easier one.</span>
        </label>
        <label>
          Pronouns (optional)
          <input
            type="text"
            value={state.pronouns}
            onChange={(e) => update("pronouns", e.target.value)}
            placeholder="he/him, she/her, they/them"
          />
        </label>
      </fieldset>

      <fieldset className="card">
        <legend>3. Their look</legend>
        <label>
          Hair
          <input
            type="text"
            value={state.hair}
            onChange={(e) => update("hair", e.target.value)}
            placeholder="Short brown hair, curly blonde, etc."
          />
        </label>
        <label>
          Eyes
          <input
            type="text"
            value={state.eyes}
            onChange={(e) => update("eyes", e.target.value)}
            placeholder="Blue, brown, hazel..."
          />
        </label>
        <label>
          Skin tone
          <input
            type="text"
            value={state.skin_tone}
            onChange={(e) => update("skin_tone", e.target.value)}
            placeholder="Describe in your own words"
          />
        </label>
        <label>
          Glasses / accessories
          <input
            type="text"
            value={state.glasses}
            onChange={(e) => update("glasses", e.target.value)}
            placeholder="Round glasses, bow in hair, freckles..."
          />
        </label>
        <label>
          Favorite outfit / clothing style
          <input
            type="text"
            value={state.clothing}
            onChange={(e) => update("clothing", e.target.value)}
            placeholder="Yellow soccer jersey, pink dress, dinosaur shirt..."
          />
        </label>
        <label>
          Anything else about how they should look
          <textarea
            value={state.look_notes}
            onChange={(e) => update("look_notes", e.target.value)}
            placeholder="Hearing aid, wheelchair, limb difference, dimples, etc. — anything important to represent."
          />
        </label>
      </fieldset>

      <fieldset className="card">
        <legend>4. Story themes</legend>
        <label>
          Theme 1 *
          <input
            type="text"
            value={state.theme_1}
            onChange={(e) => update("theme_1", e.target.value)}
            placeholder="Baseball, dinosaurs, grandma, dogs..."
            required
          />
        </label>
        <label>
          Theme 2
          <input
            type="text"
            value={state.theme_2}
            onChange={(e) => update("theme_2", e.target.value)}
          />
        </label>
        <label>
          Theme 3
          <input
            type="text"
            value={state.theme_3}
            onChange={(e) => update("theme_3", e.target.value)}
          />
        </label>
        <label>
          Favorite colors, numbers, pets, family members, sayings
          <textarea
            value={state.special_details}
            onChange={(e) => update("special_details", e.target.value)}
            placeholder="Favorite color: orange. Jersey #7. Dog is Biscuit. Grandma is 'Nana'. Etc."
          />
        </label>
      </fieldset>

      <fieldset className="card">
        <legend>5. Parent contact</legend>
        <label>
          Your name *
          <input
            type="text"
            value={state.parent_name}
            onChange={(e) => update("parent_name", e.target.value)}
            required
          />
        </label>
        <label>
          Email *
          <input
            type="email"
            value={state.parent_email}
            onChange={(e) => update("parent_email", e.target.value)}
            required
          />
          <span className="hint">
            We&apos;ll use this for order updates and (for digital books) delivery.
          </span>
        </label>
        {!isDigital && (
          <label>
            Shipping address *
            <textarea
              value={state.shipping_address}
              onChange={(e) => update("shipping_address", e.target.value)}
              placeholder="Full name, street, city, state, ZIP, country"
              required={!isDigital}
            />
            <span className="hint">US shipping only at the moment.</span>
          </label>
        )}
        <label>
          Anything else we should know?
          <textarea
            value={state.other_notes}
            onChange={(e) => update("other_notes", e.target.value)}
            placeholder="Bilingual preferences, sensory notes, gift dates, pronunciation, etc."
          />
        </label>
        <label
          style={{
            flexDirection: "row",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            fontWeight: 500,
          }}
        >
          <input
            type="checkbox"
            checked={state.consent}
            onChange={(e) => update("consent", e.target.checked)}
            style={{ width: "auto", marginTop: 4 }}
          />
          <span>
            I understand details about my child will only be used to create this
            custom book and will not be shared publicly. *
          </span>
        </label>
      </fieldset>

      {error && <div className="notice error">{error}</div>}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong>{product.name}</strong> —{" "}
          <span>
            {product.priceLabel}
            {isSubscription ? " billed monthly" : ""}
          </span>
        </div>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting
            ? "Redirecting to checkout…"
            : isSubscription
            ? "Subscribe & checkout"
            : "Continue to secure checkout"}
        </button>
      </div>
      <p style={{ textAlign: "center", fontSize: ".85rem", marginTop: 6 }}>
        Payment is processed securely by Stripe. We never see your card
        details.
      </p>
    </form>
  );
}
