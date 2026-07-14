import { NextRequest, NextResponse } from "next/server";
import { put, list } from "@vercel/blob";
import { generateWith, providerConfigured, type ProviderId } from "@/lib/imageProviders";
import { visionAsk, openaiConfigured } from "@/lib/openai";
import { pagePrompt, qaPrompt } from "@/lib/artPrompts";

export const runtime = "nodejs";
export const maxDuration = 300;

// Provider bake-off harness (2026-07): render the same page spec across
// Gemini / FLUX.2 / Seedream with gpt-image-2 style plates as style refs,
// QA-score each with the same gate the production lanes use.
//
// Actions:
//   saveRef  { name, image(b64), mime }               -> store a style plate / char ref in Blob
//   run      { provider, scene, characterDescription, cast?, charRefUrls[], styleRefUrls[],
//              pageText?, artPrompt? (both enable QA) } -> { url, seconds, verdict? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "saveRef") {
      const { name, image, mime } = body as { name: string; image: string; mime?: string };
      if (!name || !image) return NextResponse.json({ error: "Missing name or image" }, { status: 400 });
      const ext = (mime || "image/png").includes("png") ? "png" : "jpg";
      const blob = await put(`styleplates/${name}.${ext}`, Buffer.from(image, "base64"), {
        access: "public",
        contentType: mime || "image/png",
        addRandomSuffix: true,
      });
      return NextResponse.json({ url: blob.url });
    }

    if (action === "listRefs") {
      const { blobs } = await list({ prefix: (body.prefix as string) || "styleplates/", limit: 100 });
      return NextResponse.json({
        refs: blobs.map((b) => ({ path: b.pathname, url: b.url, size: b.size, uploadedAt: b.uploadedAt })),
      });
    }

    if (action === "run") {
      const provider = body.provider as ProviderId;
      if (!["gemini", "flux", "seedream"].includes(provider)) {
        return NextResponse.json({ error: `Unknown provider: ${provider}` }, { status: 400 });
      }
      if (!providerConfigured(provider)) {
        return NextResponse.json(
          { error: provider === "gemini" ? "GEMINI_API_KEY isn't set." : "FAL_KEY isn't set in Vercel yet." },
          { status: 503 },
        );
      }
      const { scene, characterDescription, cast, pageText, artPrompt } = body as Record<string, string | undefined>;
      const charRefUrls = (body.charRefUrls as string[] | undefined) || [];
      const styleRefUrls = (body.styleRefUrls as string[] | undefined) || [];
      if (!scene || !characterDescription) {
        return NextResponse.json({ error: "Missing scene or characterDescription" }, { status: 400 });
      }

      // Same page prompt production uses, plus an explicit style-plate directive.
      const styleLine = styleRefUrls.length
        ? `\n\nSTYLE PLATES — the LAST ${styleRefUrls.length} attached image(s) are finished pages from this book series. Match their illustration style EXACTLY: the same medium and texture, palette, warm golden-hour lighting, line treatment and level of detail. They define the book's look; only the scene content should differ.`
        : "";
      const prompt = pagePrompt(scene, characterDescription, cast) + styleLine;
      const refs = [...charRefUrls, ...styleRefUrls];

      const img = await generateWith(provider, prompt, refs);
      const blob = await put(`bakeoff/${provider}-${Date.now()}.png`, Buffer.from(img.data, "base64"), {
        access: "public",
        contentType: img.mime,
        addRandomSuffix: false,
      });

      // QA with the production gate (gpt-5.6-sol vision) when we have page text.
      let verdict: unknown = null;
      if (pageText && openaiConfigured()) {
        try {
          const qaImages = [img.data, ...(charRefUrls[0] ? [await urlToB64(charRefUrls[0])] : [])];
          const raw = await visionAsk(
            qaPrompt(pageText, characterDescription!, cast, artPrompt, qaImages.length > 1),
            qaImages,
            "image/png",
          );
          verdict = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        } catch (e: any) {
          verdict = { error: `QA failed: ${String(e?.message).slice(0, 200)}` };
        }
      }

      return NextResponse.json({ url: blob.url, seconds: Math.round(img.seconds), verdict });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("bakeoff route failed:", e?.message || e);
    return NextResponse.json({ error: e?.message || "Bake-off step failed" }, { status: 500 });
  }
}

async function urlToB64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ref fetch failed (${res.status})`);
  return Buffer.from(await res.arrayBuffer()).toString("base64");
}
