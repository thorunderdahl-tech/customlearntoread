import { NextRequest, NextResponse } from "next/server";
import { generateImage, visionAsk, listModels, geminiConfigured } from "@/lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 300;

const STYLE = `Children's picture-book illustration in a vibrant, warm, anime-influenced style: soft rounded features, big expressive sparkly eyes, gentle glowing light, rich saturated colors, clean shapes, magical cozy atmosphere. Full-bleed scene composition with the main subject in the upper two-thirds of the frame (the bottom quarter will be covered by a text band). ABSOLUTELY NO text, letters, numbers, signs, logos, or watermarks anywhere in the image.`;

// One image operation per request. Actions: character | page | check | models
export async function POST(req: NextRequest) {
  try {
    if (!geminiConfigured()) {
      return NextResponse.json({ error: "GEMINI_API_KEY isn't set in Vercel yet." }, { status: 503 });
    }
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action === "models") {
      return NextResponse.json({ models: await listModels() });
    }

    if (action === "character") {
      const desc = body.description as string;
      if (!desc) return NextResponse.json({ error: "Missing description" }, { status: 400 });
      const img = await generateImage(
        `${STYLE}\n\nCharacter reference sheet: a single child character shown clearly — full body, front view, neutral happy pose, plain soft cream background. The character: ${desc}. This image defines the character's exact look for a whole book; make hair, eyes, skin and outfit unmistakable.`,
        [],
        "2:3",
      );
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    if (action === "page") {
      const { artPrompt, characterDescription, refs = [], fixNotes } = body;
      if (!artPrompt) return NextResponse.json({ error: "Missing artPrompt" }, { status: 400 });
      const img = await generateImage(
        `${STYLE}\n\nThe child character in the attached reference image(s) MUST appear identical here — same face, same hair, same eyes, same skin tone, same outfit (${characterDescription}).\n\nScene for this page: ${artPrompt}${fixNotes ? `\n\nFix these problems from the previous attempt: ${fixNotes}` : ""}`,
        (refs as string[]).slice(0, 3),
        "2:3",
      );
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    if (action === "check") {
      const { image, pageText, characterDescription } = body;
      if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400 });
      const raw = await visionAsk(
        `You are QA for a children's book illustration. The page's story text is: "${pageText}". The recurring child character must look like: ${characterDescription}.
Check the image:
1. Does the child character match that description (hair, eyes, skin, outfit)?
2. Does the scene plausibly illustrate the story text?
3. Is there ANY text, lettering, numbers or watermark in the image?
4. Anything inappropriate or scary for ages 3-7? Any anatomical errors (extra fingers/limbs, deformed face)?
Reply ONLY JSON: {"pass": true|false, "issues": ["short fixable issue", ...]}`,
        image,
      );
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      const verdict = JSON.parse(raw.slice(start, end + 1));
      return NextResponse.json({ verdict });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Art step failed" }, { status: 500 });
  }
}
