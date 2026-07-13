// Minimal OpenAI API client (plain fetch — no SDK dependency).
// Covers all three AI lanes: story text, image generation, and vision QA.
// Requires OPENAI_API_KEY. Models overridable via STORY_MODEL / ART_MODEL / VISION_MODEL.
//
// Defaults (newest as of 2026-07):
//   text/vision: gpt-5.6-sol   (frontier tier of GPT-5.6, GA 2026-07-09)
//   images:      gpt-image-2   (flexible sizes up to ~8.3MP, native multi-reference edits)

const BASE = "https://api.openai.com/v1";

export function openaiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

function key(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY isn't set in Vercel env vars yet.");
  return k;
}

// ---------------------------------------------------------------------------
// Text + vision (Responses API)
// ---------------------------------------------------------------------------

type InputPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

/** One text-out call to the Responses API; images (base64, no data: prefix) optional. */
async function respond(opts: {
  model: string;
  system?: string;
  user: string;
  imagesB64?: string[];
  mime?: string;
  maxTokens?: number;
}): Promise<string> {
  const content: InputPart[] = [
    ...(opts.imagesB64 || []).map((d) => ({
      type: "input_image" as const,
      image_url: `data:${opts.mime || "image/jpeg"};base64,${d}`,
    })),
    { type: "input_text", text: opts.user },
  ];
  const body: Record<string, unknown> = {
    model: opts.model,
    input: [{ role: "user", content }],
    // GPT-5.6 spends part of the output budget on internal reasoning before the
    // visible text, so pad the caller's budget rather than starving the reply.
    max_output_tokens: (opts.maxTokens ?? 3000) + 2048,
  };
  if (opts.system) body.instructions = opts.system;
  const res = await fetch(`${BASE}/responses`, {
    method: "POST",
    headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${opts.model} ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as {
    status?: string;
    incomplete_details?: { reason?: string };
    output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  };
  const text = (data.output || [])
    .filter((o) => o.type === "message")
    .flatMap((o) => o.content || [])
    .filter((c) => c.type === "output_text")
    .map((c) => c.text || "")
    .join("");
  if (!text) {
    const why = data.status === "incomplete" ? ` (incomplete: ${data.incomplete_details?.reason || "?"})` : "";
    throw new Error(`OpenAI ${opts.model} returned no text${why}`);
  }
  return text;
}

/** Story/text generation. Same signature the Anthropic client exposed. */
export async function llmText(opts: {
  system?: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  return respond({
    model: opts.model || process.env.STORY_MODEL || "gpt-5.6-sol",
    system: opts.system,
    user: opts.user,
    maxTokens: opts.maxTokens,
  });
}

/** Ask a vision model a question about one or more images; returns raw text. */
export async function visionAsk(prompt: string, imagesB64: string | string[], mime = "image/jpeg"): Promise<string> {
  const imgs = Array.isArray(imagesB64) ? imagesB64 : [imagesB64];
  return respond({
    model: process.env.VISION_MODEL || "gpt-5.6-sol",
    user: prompt,
    imagesB64: imgs,
    mime,
    maxTokens: 2000,
  });
}

// ---------------------------------------------------------------------------
// Image generation (Images API: /images/generations + /images/edits)
// ---------------------------------------------------------------------------

/** Map our legacy 1K/2K/4K + aspect-ratio knobs onto gpt-image-2 pixel sizes.
 *  Constraints: edges ≤3840px, multiples of 16, ratio ≤3:1, total ≤8,294,400px. */
function pixelSize(aspectRatio: string, tier: string): string {
  const t = (tier || "2K").toUpperCase();
  const table: Record<string, Record<string, string>> = {
    "2:3": { "1K": "1024x1536", "2K": "1664x2496", "4K": "2336x3504" },
    "3:2": { "1K": "1536x1024", "2K": "2496x1664", "4K": "3504x2336" },
    "1:1": { "1K": "1024x1024", "2K": "2048x2048", "4K": "2880x2880" },
  };
  return table[aspectRatio]?.[t] || table[aspectRatio]?.["2K"] || "1024x1536";
}

/** Generate one image at print resolution. Returns base64 PNG data (no data: prefix) + mime.
 *  Reference images (base64 JPEG) route through /images/edits, which is how gpt-image-2
 *  does character/style consistency; it processes all inputs at high fidelity natively. */
export async function generateImage(
  prompt: string,
  referenceImagesB64: string[] = [],
  aspectRatio = "2:3",
  imageSizeOverride?: string,
): Promise<{ data: string; mime: string }> {
  const model = process.env.ART_MODEL || "gpt-image-2";
  // Caller decides resolution (4K for print/physical, 2K for digital-only) so we
  // pay for 4K only where print sharpness matters. Falls back to env then 2K.
  const size = pixelSize(aspectRatio, imageSizeOverride || process.env.ART_IMAGE_SIZE || "2K");

  let res: Response;
  if (referenceImagesB64.length > 0) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", prompt);
    form.append("size", size);
    form.append("quality", "high");
    referenceImagesB64.forEach((d, i) => {
      form.append("image[]", new Blob([Buffer.from(d, "base64")], { type: "image/jpeg" }), `ref-${i}.jpg`);
    });
    res = await fetch(`${BASE}/images/edits`, {
      method: "POST",
      headers: { authorization: `Bearer ${key()}` },
      body: form,
    });
  } else {
    res = await fetch(`${BASE}/images/generations`, {
      method: "POST",
      headers: { authorization: `Bearer ${key()}`, "content-type": "application/json" },
      body: JSON.stringify({ model, prompt, size, quality: "high" }),
    });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenAI ${model} ${res.status}: ${text.slice(0, 400)}`);
  }
  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI returned no image (possibly safety-filtered prompt)");
  return { data: b64, mime: "image/png" };
}

/** List model IDs available to this key (debugging helper). */
export async function listModels(): Promise<string[]> {
  const res = await fetch(`${BASE}/models`, { headers: { authorization: `Bearer ${key()}` } });
  if (!res.ok) throw new Error(`OpenAI models list ${res.status}`);
  const data = (await res.json()) as { data?: Array<{ id: string }> };
  return (data.data || []).map((m) => m.id).sort();
}
