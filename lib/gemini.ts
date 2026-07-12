// Minimal Gemini API client for image generation + vision QA (plain fetch).
// Requires GEMINI_API_KEY. Models overridable via ART_MODEL / VISION_MODEL.

const BASE = "https://generativelanguage.googleapis.com/v1beta";

export function geminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY isn't set in Vercel env vars yet.");
  return k;
}

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

async function generate(model: string, parts: Part[], imageOut: boolean, aspectRatio?: string, imageSize?: string) {
  const body: Record<string, unknown> = { contents: [{ parts }] };
  if (imageOut) {
    body.generationConfig = {
      responseModalities: ["IMAGE"],
      ...(aspectRatio || imageSize
        ? { imageConfig: { ...(aspectRatio ? { aspectRatio } : {}), ...(imageSize ? { imageSize } : {}) } }
        : {}),
    };
  }
  const res = await fetch(`${BASE}/models/${model}:generateContent?key=${key()}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${model} ${res.status}: ${text.slice(0, 400)}`);
  }
  return (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> } }>;
  };
}

/** Generate one image at print resolution. Returns base64 JPEG/PNG data (no data: prefix) + mime.
 *  Requests 2K output by default (ART_IMAGE_SIZE=1K|2K|4K) so print pages aren't upscaled;
 *  falls back to a plain request if the model rejects imageSize. */
export async function generateImage(
  prompt: string,
  referenceImagesB64: string[] = [],
  aspectRatio = "2:3",
  imageSizeOverride?: string,
): Promise<{ data: string; mime: string }> {
  // Nano Banana Pro (stable). Strongest for character consistency: up to 5 character
  // refs + 3 style refs + 6 object refs per request, native 2K/4K print output.
  // (gemini-3.1-flash-image is cheaper/faster but only 4 character refs, no style refs.)
  const model = process.env.ART_MODEL || "gemini-3-pro-image";
  // Caller decides resolution (4K for print/physical, 2K for digital-only) so we
  // pay for 4K only where print sharpness matters. Falls back to env then 2K.
  const imageSize = imageSizeOverride || process.env.ART_IMAGE_SIZE || "2K";
  const parts: Part[] = [
    ...referenceImagesB64.map((d) => ({ inline_data: { mime_type: "image/jpeg", data: d } })),
    { text: prompt },
  ];
  let out: Awaited<ReturnType<typeof generate>>;
  try {
    out = await generate(model, parts, true, aspectRatio, imageSize);
  } catch (e: any) {
    // Older image models reject imageSize — retry without rather than failing the page.
    if (/imageSize|image_size/i.test(String(e?.message))) {
      out = await generate(model, parts, true, aspectRatio);
    } else throw e;
  }
  for (const c of out.candidates || []) {
    for (const p of c.content?.parts || []) {
      if (p.inlineData?.data) return { data: p.inlineData.data, mime: p.inlineData.mimeType || "image/png" };
    }
  }
  throw new Error("Gemini returned no image (possibly safety-filtered prompt)");
}

/** Ask a vision model a question about one or more images; returns raw text. */
export async function visionAsk(prompt: string, imagesB64: string | string[], mime = "image/jpeg"): Promise<string> {
  const model = process.env.VISION_MODEL || "gemini-2.5-flash";
  const imgs = Array.isArray(imagesB64) ? imagesB64 : [imagesB64];
  const parts: Part[] = [
    ...imgs.map((d) => ({ inline_data: { mime_type: mime, data: d } })),
    { text: prompt },
  ];
  const out = await generate(model, parts, false);
  const text = out.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) throw new Error("Vision model returned no text");
  return text;
}

/** List model names available to this key (debugging helper). */
export async function listModels(): Promise<string[]> {
  const res = await fetch(`${BASE}/models?key=${key()}&pageSize=100`);
  if (!res.ok) throw new Error(`Gemini models list ${res.status}`);
  const data = (await res.json()) as { models?: Array<{ name: string }> };
  return (data.models || []).map((m) => m.name.replace("models/", ""));
}
