"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { PRODUCTS, type ProductId } from "@/lib/products";

type FormState = {
  product: ProductId;
  parent_name: string;
  parent_email: string;
  child_name: string;
  child_age: string;
  reading_level: string;
  read_check_behavior: string;
  parent_read_along: boolean;
  pronouns: string;
  hair: string;
  eyes: string;
  skin_tone: string;
  glasses: string;
  clothing: string;
  look_notes: string;
  photos: string[];
  theme_photos: string[];
  theme_1: string;
  theme_2: string;
  theme_3: string;
  special_details: string;
  shipping_street: string;
  shipping_street2: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  other_notes: string;
  gift_message: string;
  consent: boolean;
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC",
];

// Level options carry a sample sentence so both the dropdown AND the helper are
// concrete, not abstract. The "Level N — " prefix is load-bearing: resolveLevel()
// matches on it and the order summary splits on " — ", so keep it.
const LEVEL_STRINGS = [
  "",
  "Level 1 — brand-new reader · “Sam can run.”",
  "Level 2 — very early reader · “Sam runs to the ball.”",
  "Level 3 — growing reader · “Sam sees the big red ball.”",
  "Level 4 — confident reader · “Sam kicks the ball down the hill.”",
];
const NOT_SURE_LEVEL = "Not sure — we'll match their age";

// Optional placement helper: ONE passive-observation question a parent can answer
// without quizzing their child. Combined with the age they already gave, it lands
// a good-enough starting level; the post-delivery feedback loop fine-tunes it.
const READ_BEHAVIOR = [
  { v: "listens", label: "mostly listens and looks at the pictures", delta: -99 }, // floors to Level 1
  { v: "chimes", label: "chimes in on words they know", delta: -1 },
  { v: "help", label: "reads simple sentences with a little help", delta: 0 },
  { v: "own", label: "reads most of it on their own", delta: 1 },
];

function baseLevelFromAge(ageStr: string): number {
  const age = parseInt(ageStr, 10);
  if (!Number.isFinite(age)) return 2; // neutral prior when age unknown
  if (age <= 5) return 1;
  if (age === 6) return 2;
  if (age === 7) return 3;
  return 4;
}

// Age sets the starting point; the observation nudges it (confidence-first — the
// lowest-engagement answer floors to Level 1, only "reads on their own" pushes up).
function inferReadingLevel(ageStr: string, behavior: string): string {
  const b = READ_BEHAVIOR.find((o) => o.v === behavior);
  if (!b) return NOT_SURE_LEVEL;
  if (b.v === "listens") return LEVEL_STRINGS[1];
  const lvl = Math.max(1, Math.min(4, baseLevelFromAge(ageStr) + b.delta));
  return LEVEL_STRINGS[lvl];
}

const initial: FormState = {
  product: "paperback_set",
  parent_name: "",
  parent_email: "",
  child_name: "",
  child_age: "",
  reading_level: NOT_SURE_LEVEL,
  read_check_behavior: "",
  parent_read_along: false,
  pronouns: "",
  hair: "",
  eyes: "",
  skin_tone: "",
  glasses: "",
  clothing: "",
  look_notes: "",
  photos: [],
  theme_photos: [],
  theme_1: "",
  theme_2: "",
  theme_3: "",
  special_details: "",
  shipping_street: "",
  shipping_street2: "",
  shipping_city: "",
  shipping_state: "",
  shipping_zip: "",
  other_notes: "",
  gift_message: "",
  consent: false,
};

// Draft persistence: a customer who reaches Stripe checkout and cancels (or
// closes the tab) keeps everything they typed. Cleared on the success page
// (which uses the same literal key in ClearDraft.tsx).
const DRAFT_KEY = "clr_order_draft_v1";
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

const TOTAL_STEPS = 5;
const STEP_TITLES = [
  "Pick your book",
  "Reader details",
  "Their look",
  "Story themes",
  "Parent contact",
];

export default function OrderForm() {
  const params = useSearchParams();
  const [state, setState] = useState<FormState>(initial);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showThemeIdeas, setShowThemeIdeas] = useState(false);
  const [showPhotoInfo, setShowPhotoInfo] = useState(false);
  const [showReadAlongInfo, setShowReadAlongInfo] = useState(false);
  const [showReadCheck, setShowReadCheck] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const themeFileInputRef = useRef<HTMLInputElement>(null);

  const draftLoadedRef = useRef(false);

  // On mount: restore any saved draft, then let an explicit ?plan= override
  // the product choice. Runs once.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === "object") {
          setState((s) => ({
            ...s,
            ...draft,
            photos: Array.isArray(draft.photos) ? draft.photos : [],
            theme_photos: Array.isArray(draft.theme_photos) ? draft.theme_photos : [],
            product: PRODUCTS.some((p) => p.id === draft.product) ? draft.product : s.product,
          }));
        }
      }
    } catch {
      // Corrupt or unavailable storage — start fresh.
    }
    const plan = params.get("plan");
    if (plan && PRODUCTS.some((p) => p.id === plan)) {
      setState((s) => ({ ...s, product: plan as ProductId }));
    }
    // SEO landing pages (/personalized-book-for/[name]) link here with ?child=.
    // Prefill the child's name unless the visitor already typed one (draft wins).
    const child = params.get("child");
    if (child && child.trim()) {
      setState((s) => (s.child_name.trim() ? s : { ...s, child_name: child.trim() }));
    }
    draftLoadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the draft on every change (after the initial restore).
  useEffect(() => {
    if (!draftLoadedRef.current) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(state));
    } catch {
      // Storage full/unavailable — non-fatal.
    }
  }, [state]);

  const product = PRODUCTS.find((p) => p.id === state.product)!;
  const isSubscription = product.cadence !== "one_time";
  const isDigital = product.id === "digital";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function uploadPhoto(file: File) {
    const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloud || !preset) {
      throw new Error("Photo upload is not configured. Try again later.");
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", preset);
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
      { method: "POST", body: fd },
    );
    if (!res.ok) throw new Error("Photo upload failed");
    const data = await res.json();
    return data.secure_url as string;
  }

  async function handleFiles(files: FileList | null, target: "photos" | "theme_photos" = "photos") {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const remaining = 3 - state[target].length;
      const toUpload = Array.from(files).slice(0, remaining);
      for (const file of toUpload) {
        if (!file.type.startsWith("image/")) {
          throw new Error(`"${file.name}" isn't an image — please upload a photo (JPG, PNG, HEIC).`);
        }
        if (file.size > MAX_PHOTO_BYTES) {
          throw new Error(`"${file.name}" is over 10 MB — please use a smaller photo.`);
        }
      }
      const urls: string[] = [];
      for (const file of toUpload) {
        const url = await uploadPhoto(file);
        urls.push(url);
      }
      setState((s) => ({ ...s, [target]: [...s[target], ...urls] }));
    } catch (e: any) {
      setError(e?.message || "Photo upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (themeFileInputRef.current) themeFileInputRef.current.value = "";
    }
  }

  function removePhoto(idx: number, target: "photos" | "theme_photos" = "photos") {
    setState((s) => ({ ...s, [target]: s[target].filter((_, i) => i !== idx) }));
  }

  function validateStep(s: number): string | null {
    if (s === 2) {
      if (!state.child_name.trim()) return "Please add your child's first name.";
      if (!state.child_age.trim()) return "Please add an age.";
    }
    if (s === 4) {
      if (!state.theme_1.trim()) return "Please add at least one theme.";
    }
    if (s === 5) {
      if (!state.parent_name.trim()) return "Please add your name.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(state.parent_email.trim()))
        return "Please add a valid email.";
      if (!isDigital) {
        if (!state.shipping_street.trim()) return "Please add a street address.";
        if (!state.shipping_city.trim()) return "Please add a city.";
        if (!state.shipping_state.trim()) return "Please pick a state.";
        if (!state.shipping_zip.trim()) return "Please add a ZIP code.";
      }
      if (!state.consent) return "Please check the privacy box to continue.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep(5);
    if (err) {
      setError(err);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const shipping_address = isDigital
        ? ""
        : [
            state.parent_name,
            state.shipping_street,
            state.shipping_street2,
            `${state.shipping_city}, ${state.shipping_state} ${state.shipping_zip}`,
            "US",
          ]
            .filter((s) => s && s.trim())
            .join("\n");
      const payload = { ...state, shipping_address };
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      if (data.url) window.location.href = data.url;
      else throw new Error("No checkout URL returned");
    } catch (err: any) {
      setError(err.message || "Checkout failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="order-layout">
      <main className="order-main">
        <ol className="progress-bar" aria-label="Form progress">
          {STEP_TITLES.map((title, i) => {
            const num = i + 1;
            const status = num < step ? "done" : num === step ? "current" : "todo";
            return (
              <li key={num} className={`progress-step ${status}`}>
                <span className="progress-dot" aria-hidden="true">{num < step ? "✓" : num}</span>
                <span className="progress-label">{title}</span>
              </li>
            );
          })}
        </ol>

        <form onSubmit={handleSubmit} className="intake-form" noValidate>
          {step === 1 && (
            <div className="card">
              <h3 className="legend">1. Pick your book</h3>
              <div className="format-grid">
                {PRODUCTS.map((p) => (
                  <label
                    key={p.id}
                    className={`format-option${state.product === p.id ? " checked" : ""}`}
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
                      <span>{p.cadence !== "one_time" ? "Subscription" : "One-time"}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card">
              <h3 className="legend">2. Reader details</h3>
              <label>
                Child&apos;s first name *
                <input
                  type="text"
                  value={state.child_name}
                  onChange={(e) => update("child_name", e.target.value)}
                  placeholder="First name"
                  aria-required="true"
                  required
                />
              </label>
              <label>
                Age *
                <input
                  type="text"
                  value={state.child_age}
                  onChange={(e) => update("child_age", e.target.value)}
                  placeholder=""
                  aria-required="true"
                  required
                />
              </label>
              <label>
                Reading level
                <select
                  value={state.reading_level}
                  onChange={(e) => update("reading_level", e.target.value)}
                >
                  <option>{LEVEL_STRINGS[1]}</option>
                  <option>{LEVEL_STRINGS[2]}</option>
                  <option>{LEVEL_STRINGS[3]}</option>
                  <option>{LEVEL_STRINGS[4]}</option>
                  <option>{NOT_SURE_LEVEL}</option>
                </select>
                <span className="hint">
                  Not sure? Leave it on &ldquo;we&apos;ll match their age,&rdquo; or{" "}
                  <button
                    type="button"
                    className="photo-info-link"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReadCheck((v) => !v); }}
                  >
                    {showReadCheck ? "hide the level helper" : "answer one quick question →"}
                  </button>
                </span>
              </label>

              {showReadCheck && (
                <div style={{ border: "1px solid var(--line, #eadccb)", borderRadius: 10, padding: "12px 14px", margin: "4px 0 8px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <label>
                    When you read a simple book with {state.child_name.trim() || "your child"} together, they usually&hellip;
                    <select
                      value={state.read_check_behavior}
                      onChange={(e) => {
                        const v = e.target.value;
                        setState((s) => ({ ...s, read_check_behavior: v, reading_level: v ? inferReadingLevel(s.child_age, v) : s.reading_level }));
                      }}
                    >
                      <option value="">Choose one&hellip;</option>
                      {READ_BEHAVIOR.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </select>
                  </label>
                  {state.read_check_behavior && (
                    <p className="hint" style={{ margin: 0 }}>
                      We&apos;ll start {state.child_name.trim() || "your child"} at <strong>{state.reading_level.split(" — ")[0]}</strong>. You can change it above, and we&apos;ll fine-tune it after the first book.
                    </p>
                  )}
                </div>
              )}
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
                  checked={state.parent_read_along}
                  onChange={(e) => update("parent_read_along", e.target.checked)}
                  style={{ width: "auto", marginTop: 4 }}
                />
                <span>
                  Add Parent Read-Along Lines{" "}
                  <span style={{ fontWeight: 400, color: "var(--muted)" }}>(optional)</span>
                  <span className="hint" style={{ fontWeight: 400 }}>
                    Add a second line on each page for a grown-up to read aloud &mdash; richer
                    words and a fuller story &mdash; while your child reads their own simple line. A
                    lovely way to support reading comprehension. Your child&apos;s reading stays
                    exactly at their level.{" "}
                    <button
                      type="button"
                      className="photo-info-link"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowReadAlongInfo(true); }}
                    >
                      How this works &rarr;
                    </button>
                  </span>
                </span>
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
            </div>
          )}

          {step === 3 && (
            <div className="card">
              <h3 className="legend">3. Their look</h3>
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
                  placeholder="Round glasses, bow in hair, favorite hat, freckles..."
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
                  placeholder="Anything that helps us draw them. Examples: a hearing aid or cochlear implant, a wheelchair or walker, freckles or dimples, a favorite color shirt they wear all the time, a stuffed animal that goes everywhere with them, missing front teeth - whatever makes them them."
                />
              </label>

              <div className="photo-upload">
                <p className="photo-upload-label">Reference photos (optional, up to 3)</p>
                <p className="photo-upload-hint">A photo of your child or their favorite things helps us bring the character to life. Deleted after your first book is delivered.</p>
                <div className="photo-thumbs">
                  {state.photos.map((url, i) => (
                    <div key={url} className="photo-thumb">
                      <Image src={url} width={140} height={140} alt={`Reference photo ${i + 1}`} unoptimized />
                      <button type="button" className="photo-remove" onClick={() => removePhoto(i)} aria-label={`Remove photo ${i + 1}`}>&times;</button>
                    </div>
                  ))}
                  {state.photos.length < 3 && (
                    <label className="photo-add">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFiles(e.target.files)}
                        style={{ display: "none" }}
                        disabled={uploading}
                      />
                      <span aria-hidden="true">{uploading ? "..." : "+"}</span>
                      <span className="photo-add-text">{uploading ? "Uploading..." : "Add photo"}</span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="card">
              <h3 className="legend">4. Story themes</h3>
              <label>
                Theme 1 *
                <input
                  type="text"
                  value={state.theme_1}
                  onChange={(e) => update("theme_1", e.target.value)}
                  placeholder="Baseball, dinosaurs, grandma, dogs..."
                  aria-required="true"
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
              <button type="button" className="theme-ideas-link" onClick={() => setShowThemeIdeas(true)}>
                Need ideas? &rarr; See custom theme inspiration
              </button>

              <div className="photo-upload">
                <p className="photo-upload-label">Theme reference photos (optional, up to 3)</p>
                <p className="photo-upload-hint">If one of your themes is a real pet, stuffed animal, person, or place, upload a photo so we can draw the actual one your child loves — not a generic version.</p>
                <div className="photo-thumbs">
                  {state.theme_photos.map((url, i) => (
                    <div key={url} className="photo-thumb">
                      <Image src={url} width={140} height={140} alt={`Theme reference photo ${i + 1}`} unoptimized />
                      <button type="button" className="photo-remove" onClick={() => removePhoto(i, "theme_photos")} aria-label={`Remove theme photo ${i + 1}`}>&times;</button>
                    </div>
                  ))}
                  {state.theme_photos.length < 3 && (
                    <label className="photo-add">
                      <input
                        ref={themeFileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => handleFiles(e.target.files, "theme_photos")}
                        style={{ display: "none" }}
                        disabled={uploading}
                      />
                      <span aria-hidden="true">{uploading ? "..." : "+"}</span>
                      <span className="photo-add-text">{uploading ? "Uploading..." : "Add photo"}</span>
                    </label>
                  )}
                </div>
              </div>

              <label>
                Other Important Things to Note (Optional)
                <span className="hint">Share any details that support the themes you selected above (favorite colors, jersey numbers, pet names, etc.). Please don&apos;t use this section to add additional themes&mdash;we&apos;ll focus the story on the themes you&apos;ve already chosen.</span>
                <textarea
                  value={state.special_details}
                  onChange={(e) => update("special_details", e.target.value)}
                  rows={5}
                  placeholder={"Good examples:\n• Hockey theme → Favorite team: Minnesota Wild, jersey number: 55\n• Dog theme → Dog's name: Bella, loves tennis balls\n• Grandparent theme → Grandma's nickname is Nana, she uses a walker"}
                />
              </label>
            </div>
          )}

          {step === 5 && (
            <div className="card">
              <h3 className="legend">5. Parent contact</h3>
              <label>
                Your name *
                <input
                  type="text"
                  value={state.parent_name}
                  onChange={(e) => update("parent_name", e.target.value)}
                  aria-required="true"
                  required
                />
              </label>
              <label>
                Email *
                <input
                  type="email"
                  value={state.parent_email}
                  onChange={(e) => update("parent_email", e.target.value)}
                  aria-required="true"
                  required
                />
                <span className="hint">
                  We&apos;ll use this for order updates and (for digital books) delivery.
                </span>
              </label>

              {!isDigital && (
                <>
                  <label>
                    Street address *
                    <input
                      type="text"
                      value={state.shipping_street}
                      onChange={(e) => update("shipping_street", e.target.value)}
                      placeholder="123 Main St"
                      aria-required="true"
                      required
                    />
                  </label>
                  <label>
                    Apt / Suite (optional)
                    <input
                      type="text"
                      value={state.shipping_street2}
                      onChange={(e) => update("shipping_street2", e.target.value)}
                      placeholder="Apt 4B"
                    />
                  </label>
                  <div className="city-state-zip">
                    <label>
                      City *
                      <input
                        type="text"
                        value={state.shipping_city}
                        onChange={(e) => update("shipping_city", e.target.value)}
                        aria-required="true"
                        required
                      />
                    </label>
                    <label>
                      State *
                      <select
                        value={state.shipping_state}
                        onChange={(e) => update("shipping_state", e.target.value)}
                        aria-required="true"
                        required
                      >
                        <option value="">Select</option>
                        {US_STATES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                    <label>
                      ZIP *
                      <input
                        type="text"
                        value={state.shipping_zip}
                        onChange={(e) => update("shipping_zip", e.target.value)}
                        placeholder="55044"
                        aria-required="true"
                        required
                      />
                    </label>
                  </div>
                  <span className="hint">US shipping only at the moment.</span>
                </>
              )}

              <label>
                Gift message <span className="hint">(optional &mdash; free, printed inside the front cover)</span>
                <input
                  value={state.gift_message}
                  onChange={(e) => update("gift_message", e.target.value)}
                  placeholder="To Reeva — love, Grandma. Read it a hundred times!"
                  maxLength={160}
                />
              </label>

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
                  aria-required="true"
                />
                <span>
                  We have kids too, and privacy matters. The details you share are used
                  only to make your child&apos;s book - nothing is shared publicly, and any
                  photos you upload are deleted after your first book is delivered. I confirm
                  I have the right to use any photos I&apos;ve uploaded, including any photos of
                  children. *{" "}
                  <button
                    type="button"
                    className="photo-info-link"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPhotoInfo(true); }}
                  >
                    How we use your photos &rarr;
                  </button>
                </span>
              </label>
            </div>
          )}

          {error && <div className="notice error" role="alert">{error}</div>}

          <div className="step-nav">
            {step > 1 && (
              <button type="button" className="button secondary" onClick={back}>
                &larr; Back
              </button>
            )}
            {step < TOTAL_STEPS && (
              <button type="button" className="button primary" onClick={next}>
                Continue &rarr;
              </button>
            )}
            {step === TOTAL_STEPS && (
              <button type="submit" className="button primary" disabled={submitting}>
                {submitting
                  ? "Redirecting to checkout..."
                  : isSubscription
                    ? "Subscribe & checkout"
                    : "Continue to secure checkout"}
              </button>
            )}
          </div>

          {step === TOTAL_STEPS && (
            <>
              <ul className="trust-row" aria-label="Trust signals">
                <li><span aria-hidden="true">&#128274;</span> Secure Stripe checkout</li>
                <li><span aria-hidden="true">&#128179;</span> Visa, MC, Amex, Apple Pay</li>
                <li><span aria-hidden="true">&#9993;</span> Email support, real replies</li>
                <li><span aria-hidden="true">&#8617;</span> Free reprint or refund if it&apos;s not right</li>
              </ul>
              <p style={{ textAlign: "center", fontSize: ".85rem", marginTop: 6 }}>
                Payment is processed securely by Stripe. We never see your card details.
              </p>
            </>
          )}

          {showThemeIdeas && (
            <div className="modal-overlay" onClick={() => setShowThemeIdeas(false)} role="dialog" aria-modal="true" aria-label="Custom theme ideas">
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="modal-close" onClick={() => setShowThemeIdeas(false)} aria-label="Close">&times;</button>
                <h3 style={{ marginTop: 0 }}>Custom theme ideas</h3>
                <p style={{ color: "var(--muted)", marginBottom: 16 }}>Here are some examples of themes other families have used. Mix and match — or invent your own.</p>
                <Image src="/theme-ideas.webp" width={1200} height={900} alt="Examples of custom story themes for personalized books" className="modal-image" />
                <button type="button" className="button primary" onClick={() => setShowThemeIdeas(false)} style={{ marginTop: 16 }}>Got it</button>
              </div>
            </div>
          )}

          {showPhotoInfo && (
            <div className="modal-overlay" onClick={() => setShowPhotoInfo(false)} role="dialog" aria-modal="true" aria-label="How we use your photos">
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="modal-close" onClick={() => setShowPhotoInfo(false)} aria-label="Close">&times;</button>
                <h3 style={{ marginTop: 0 }}>How we use your photos</h3>
                <p style={{ color: "var(--muted)" }}>Reference photos are optional. They help us make your book&apos;s characters look like your child and the things they love.</p>
                <p><strong>Your rights.</strong> Only upload photos you have the right to use, including any photos of children. Please don&apos;t upload photos that belong to someone else or that could harm or mislead others.</p>
                <p><strong>How we use them.</strong> We use your photos only to create your book — including using AI to help create the illustrations. We don&apos;t sell them, share them for advertising, or use them for marketing.</p>
                <p><strong>How long we keep them.</strong> We delete uploaded photos after your first book is delivered.</p>
                <button type="button" className="button primary" onClick={() => setShowPhotoInfo(false)} style={{ marginTop: 8 }}>Got it</button>
              </div>
            </div>
          )}

          {showReadAlongInfo && (
            <div className="modal-overlay" onClick={() => setShowReadAlongInfo(false)} role="dialog" aria-modal="true" aria-label="About Parent Read-Along Lines">
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="modal-close" onClick={() => setShowReadAlongInfo(false)} aria-label="Close">&times;</button>
                <h3 style={{ marginTop: 0 }}>Parent Read-Along Lines</h3>
                <p>Every book is written so your child can read it themselves. Turn this on and each page gets one extra line &mdash; smaller and in italics &mdash; for you to read aloud. It uses richer words and tells a fuller story, while your child proudly reads their own simple line.</p>
                <p>Reading has two halves: sounding out words, and understanding language. Parent Read-Along Lines are a gentle way to support both at once &mdash; especially at the earliest levels, where a child&apos;s own text is necessarily simple. It&apos;s completely optional, and it never changes the words your child reads.</p>
                <p>Inside the book, a short note up front explains which line is which. After that, the two styles make it obvious.</p>
                <button type="button" className="button primary" onClick={() => setShowReadAlongInfo(false)} style={{ marginTop: 8 }}>Got it</button>
              </div>
            </div>
          )}
        </form>
      </main>

      <aside className="order-summary" aria-label="Order summary">
        <div className="order-summary-card">
          <p className="summary-eyebrow">Your order</p>
          <h3 className="summary-product">{product.name}</h3>
          <p className="summary-price">{product.priceLabel}</p>
          {product.cadence !== "one_time" && <p className="summary-billed">First season $89, then $69 each season · cancel any time</p>}
          {product.perBookLabel && <p className="summary-per">{product.perBookLabel}</p>}
          <hr />
          {state.child_name && (
            <p className="summary-row"><strong>For:</strong> {state.child_name}{state.child_age && `, age ${state.child_age}`}</p>
          )}
          {state.reading_level && step >= 2 && (
            <p className="summary-row"><strong>Level:</strong> {state.reading_level.split(" — ")[0]}</p>
          )}
          {state.theme_1 && (
            <p className="summary-row"><strong>Themes:</strong> {[state.theme_1, state.theme_2, state.theme_3].filter(Boolean).join(", ")}</p>
          )}
          {state.parent_read_along && (
            <p className="summary-row"><strong>Read-Along:</strong> Parent lines added</p>
          )}
          {(state.photos.length + state.theme_photos.length) > 0 && (
            <p className="summary-row"><strong>Photos:</strong> {state.photos.length + state.theme_photos.length} attached</p>
          )}
          {!isDigital && <p className="summary-shipping"><span aria-hidden="true">&#10004;</span> Free US shipping · typical custom book production starts after checkout; use the order notes for gift deadlines.</p>}
        </div>
      </aside>
    </div>
  );
}
