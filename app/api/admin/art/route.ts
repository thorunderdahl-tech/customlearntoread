import { NextRequest, NextResponse } from "next/server";
import { generateImage, visionAsk, listModels, geminiConfigured } from "@/lib/gemini";
import { BRAND_ART_STYLE } from "@/lib/brand";

export const runtime = "nodejs";
export const maxDuration = 300;

// On-brand illustration style — single source of truth in lib/brand.ts.
const STYLE = BRAND_ART_STYLE;

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
      const photo = body.photo as string | undefined; // parent-provided reference photo (base64 JPEG)
      if (!desc) return NextResponse.json({ error: "Missing description" }, { status: 400 });
      const prompt = photo
        ? `${STYLE}

Using the attached real photo as visual reference (provided by the child's parent), create a STYLIZED storybook character version of the child — warm illustrated picture-book style, clearly NOT photorealistic. Faithfully capture the child's hair color and texture, eye color, skin tone, and overall vibe from the photo. If a pet appears in the photo, include the pet beside the child on the sheet with its breed, coloring and fur faithfully stylized too.

Character reference sheet: full body, front view, neutral happy pose, plain soft cream background. This sheet defines the look for a whole book — make every feature unmistakable. Also honor this description: ${desc}`
        : `${STYLE}

Character reference sheet: a single child character shown clearly — full body, front view, neutral happy pose, plain soft cream background. The character: ${desc}. This image defines the character's exact look for a whole book; make hair, eyes, skin and outfit unmistakable.`;
      const img = await generateImage(prompt, photo ? [photo] : [], "2:3");
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    if (action === "page") {
      const { artPrompt, characterDescription, refs = [], fixNotes } = body;
      if (!artPrompt) return NextResponse.json({ error: "Missing artPrompt" }, { status: 400 });
      const img = await generateImage(
        `${STYLE}\n\nThe FIRST attached reference image is the character sheet: the child character MUST appear identical here — same face, same hair, same eyes, same skin tone, same outfit (${characterDescription}). Any additional attached images are approved pages from this same book: match their rendering style, palette and level of detail exactly so all pages look like one printed book.\n\nScene for this page: ${artPrompt}${fixNotes ? `\n\nFix these problems from the previous attempt: ${fixNotes}` : ""}`,
        (refs as string[]).slice(0, 3),
        "2:3",
      );
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    if (action === "check") {
      const { image, pageText, characterDescription, styleRef, artPrompt } = body;
      if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400 });
      const raw = await visionAsk(
        `You are the strict QA gate for a children's book illustration. A page that fails QA is regenerated, so it is much better to flag a real problem than to wave it through. ${styleRef ? "IMAGE 1 is the page to check; IMAGE 2 is the approved character/style reference sheet for this book." : "The attached image is the page to check."} The page's story text is: "${pageText}".${artPrompt ? ` The art direction this image was generated from: "${artPrompt}".` : ""} The recurring child character must look like: ${characterDescription}.
Check the page image:
1. CHARACTER: does the child match that description EXACTLY (hair color/texture/length, eye color, skin tone, glasses/accessories, outfit and its colors)${styleRef ? " and the reference sheet" : ""}? Any drift is a fail.
2. ${styleRef ? "STYLE: does the rendering style (medium, palette, line treatment) match the reference sheet closely enough that both could be pages of the same printed book?" : "STYLE: warm hand-illustrated picture-book style — no 3D/CGI, no anime, no photorealism?"}
3. SCENE FIDELITY: does the image match the story text${artPrompt ? " and art direction" : ""}? CRITICAL: verify every COUNT and COLOR that the text or art direction names — if the text says three apples, count the apples; if it names a red ball, the ball must be red. Wrong counts or colors are a fail.
4. RECURRING ELEMENTS: any companion animal or repeated object must have consistent species, coloring and markings${styleRef ? " with the reference sheet" : ""} — a pet that changes breed or color between pages is a fail.
5. ANATOMY / AI ERRORS: count fingers and limbs on every character; check for extra/missing/fused fingers or limbs, deformed faces or hands, warped or melting objects, duplicated features, garbled background details. Any AI artifact is a fail.
6. COMPOSITION: are the subject's face, hands and every story-critical object fully inside the UPPER TWO-THIRDS of the frame, with the bottom of the frame simple background only, and nothing important within ~5% of any edge? (The reading-text band covers the bottom of the page and print trimming crops the edges.)
7. Is there ANY text, lettering, numbers or watermark in the image?
8. Anything inappropriate or scary for ages 3-7?
9. Expressions: do the characters look happy/warm? Flag any unintended angry, sad, scared or distressed face that the story text does NOT call for (the default should be happy).
10. If more than one child appears, do they look like SAME-AGE peers? Flag it if any child looks clearly older or younger than the others.
Reply ONLY JSON: {"pass": true|false, "issues": ["short fixable issue", ...]}`,
        styleRef ? [image, styleRef] : image,
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
