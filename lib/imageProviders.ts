// Multi-provider image generation adapters (style bake-off + future volume engine).
// Providers: Gemini (Nano Banana, direct Google API, GEMINI_API_KEY) and
// FLUX.2 [pro] / Seedream 4.5 (both via fal.ai, FAL_KEY).
// All adapters take reference images as public URLs (Vercel Blob) and return base64.

import sharp from "sharp";

export type GeneratedImage = { data: string; mime: string; seconds: number };

export type ProviderId = "gemini" | "flux" | "seedream";

export function providerConfigured(p: ProviderId): boolean {
  if (p === "gemini") return Boolean(process.env.GEMINI_API_KEY);
  return Boolean(process.env.FAL_KEY);
}

/** Fetch a ref URL and downscale to ~1100px JPEG base64 — keeps Gemini payloads
 *  small and caps fal's per-input-megapixel billing. */
async function refToJpegB64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ref fetch failed (${res.status}): ${url.slice(0, 80)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = await sharp(buf).resize({ width: 1100, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return out.toString("base64");
}

// ---------------------------------------------------------------------------
// Gemini (Nano Banana) — same wire format the old lib/gemini.ts used.
// ---------------------------------------------------------------------------

export async function geminiImage(prompt: string, refUrls: string[]): Promise<GeneratedImage> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY isn't set.");
  const model = process.env.BAKEOFF_GEMINI_MODEL || "gemini-3-pro-image";
  const refs = await Promise.all(refUrls.map(refToJpegB64));
  const body = {
    contents: [{
      parts: [
        ...refs.map((d) => ({ inline_data: { mime_type: "image/jpeg", data: d } })),
        { text: prompt },
      ],
    }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig: { aspectRatio: "2:3", imageSize: "2K" },
    },
  };
  const t0 = Date.now();
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) },
  );
  if (!res.ok) throw new Error(`Gemini ${model} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }>;
  };
  for (const c of data.candidates || []) {
    for (const p of c.content?.parts || []) {
      if (p.inlineData?.data) return { data: p.inlineData.data, mime: p.inlineData.mimeType || "image/png", seconds: (Date.now() - t0) / 1000 };
    }
  }
  throw new Error("Gemini returned no image (possibly safety-filtered prompt)");
}

// ---------------------------------------------------------------------------
// fal.ai adapters (FLUX.2 [pro] edit + Seedream 4.5 edit) — synchronous fal.run.
// ---------------------------------------------------------------------------

async function falImage(
  endpoint: string,
  prompt: string,
  refUrls: string[],
  width: number,
  height: number,
): Promise<GeneratedImage> {
  const key = process.env.FAL_KEY;
  if (!key) throw new Error("FAL_KEY isn't set in Vercel env vars yet.");
  // Send refs as data URIs (downscaled) — dodges Blob-host fetch quirks and
  // keeps FLUX input-megapixel billing predictable.
  const refs = await Promise.all(refUrls.map(refToJpegB64));
  const body = {
    prompt,
    image_urls: refs.map((d) => `data:image/jpeg;base64,${d}`),
    image_size: { width, height },
    output_format: "png",
    enable_safety_checker: true,
  };
  const t0 = Date.now();
  const res = await fetch(`https://fal.run/${endpoint}`, {
    method: "POST",
    headers: { authorization: `Key ${key}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`fal ${endpoint} ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
  const data = (await res.json()) as { images?: Array<{ url?: string; content_type?: string }> };
  const url = data.images?.[0]?.url;
  if (!url) throw new Error(`fal ${endpoint} returned no image`);
  // Output arrives as a hosted URL (or data URI in sync_mode) — normalize to base64.
  if (url.startsWith("data:")) {
    const m = url.match(/^data:([^;]+);base64,(.*)$/);
    if (!m) throw new Error("fal returned unparseable data URI");
    return { data: m[2], mime: m[1], seconds: (Date.now() - t0) / 1000 };
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) throw new Error(`fal output fetch failed (${imgRes.status})`);
  const b64 = Buffer.from(await imgRes.arrayBuffer()).toString("base64");
  return { data: b64, mime: data.images?.[0]?.content_type || "image/png", seconds: (Date.now() - t0) / 1000 };
}

/** FLUX.2 [pro] — $0.03 first output MP + $0.015/extra MP (inputs count too). */
export function fluxImage(prompt: string, refUrls: string[]): Promise<GeneratedImage> {
  // 2:3 at ~4MP (multiples of 16 not required by fal, but keep parity with gpt sizes)
  return falImage("fal-ai/flux-2-pro/edit", prompt, refUrls, 1664, 2496);
}

/** Seedream 4.5 — flat $0.04/image; min total pixels 2560x1440. */
export function seedreamImage(prompt: string, refUrls: string[]): Promise<GeneratedImage> {
  return falImage("fal-ai/bytedance/seedream/v4.5/edit", prompt, refUrls, 2048, 3072);
}

export function generateWith(p: ProviderId, prompt: string, refUrls: string[]): Promise<GeneratedImage> {
  if (p === "gemini") return geminiImage(prompt, refUrls);
  if (p === "flux") return fluxImage(prompt, refUrls);
  return seedreamImage(prompt, refUrls);
}
