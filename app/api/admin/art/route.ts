import { NextRequest, NextResponse } from "next/server";
import { generateImage, visionAsk, listModels, geminiConfigured } from "@/lib/gemini";
import { claude, llmConfigured } from "@/lib/llm";
import { buildArtDirectionPrompt } from "@/lib/story";
import { characterSheetPrompt, pagePrompt, qaPrompt, sheetQaPrompt, photoAnalysisPrompt, soloRefPrompt } from "@/lib/artPrompts";

export const runtime = "nodejs";
export const maxDuration = 300;

// One image operation per request. Actions: character | page | check | models
// Prompt text lives in lib/artPrompts.ts, shared with the unattended pipeline
// (lib/pipeline.ts) so the two lanes can never drift.
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
      const companion = ((body.cast as string | undefined) ?? (body.companion as string | undefined))?.trim();
      const photo = body.photo as string | undefined; // parent-provided reference photo (base64 JPEG)
      const note = (body.note as string | undefined)?.trim(); // admin's art-direction note
      const photoSubject = (body.photoSubject as string | undefined)?.trim(); // who in the photo is the hero / who to exclude
      if (!desc) return NextResponse.json({ error: "Missing description" }, { status: 400 });
      const prompt = characterSheetPrompt(desc, companion, note, !!photo, photoSubject);
      const img = await generateImage(prompt, photo ? [photo] : [], "2:3", body.imageSize);
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    // Solo cast reference: redraw one cast member off the approved master sheet
    // onto their own turnaround. Generated once per book (after the sheet), then
    // attached as a separate per-character reference on every page — separate
    // character images are how Gemini 3 Pro's reference slots work best.
    if (action === "soloRef") {
      const { sheet, memberDesc } = body;
      const position = Number(body.position) || 1; // 1-based, left-to-right beside the hero
      if (!sheet || !memberDesc) return NextResponse.json({ error: "Missing sheet or memberDesc" }, { status: 400 });
      const img = await generateImage(soloRefPrompt(memberDesc, position), [sheet], "2:3", body.imageSize);
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    if (action === "page") {
      const { artPrompt, characterDescription, refs = [], fixNotes } = body;
      const soloRefCount = Math.max(0, Number(body.soloRefCount) || 0);
      const castText = ((body.cast as string | undefined) ?? (body.companionDescription as string | undefined))?.trim();
      const directorNote = (body.directorNote as string | undefined)?.trim(); // admin's art-direction note for this page
      if (!artPrompt) return NextResponse.json({ error: "Missing artPrompt" }, { status: 400 });
      // Art-direction expansion pass: turn the story model's one-line scene into
      // detailed, print-safe direction before drawing. Best-effort — falls back
      // to the raw scene if the text model is unavailable or errors.
      let scene = artPrompt as string;
      if (body.expand !== false && llmConfigured()) {
        try {
          const expanded = (await claude({
            system: "You are an expert children's picture-book art director.",
            user: buildArtDirectionPrompt(body.pageText || "", artPrompt, characterDescription, castText),
            maxTokens: 400,
          })).trim();
          if (expanded) scene = expanded;
        } catch { /* keep the raw scene */ }
      }
      // editPrevious: the caller appended the page's previous version as the
      // LAST ref — the prompt applies the director note as an EDIT to it.
      const editPrevious = !!body.editPrevious;
      // Ref budget: master sheet + up to 4 solo cast refs + 2 anchors (+ previous
      // version in edit mode). Gemini 3 Pro accepts up to 14 reference images.
      const img = await generateImage(
        pagePrompt(scene, characterDescription, castText, directorNote, fixNotes, editPrevious, soloRefCount),
        (refs as string[]).slice(0, 8),
        "2:3",
        body.imageSize,
      );
      return NextResponse.json({ image: img.data, mime: img.mime });
    }

    // Vision pre-analysis of the parent's photo: writes the precise "photo cast
    // map" and per-person locked looks automatically, so nobody has to.
    if (action === "analyzePhoto") {
      const { photo, childName, typedLook, hint } = body;
      if (!photo) return NextResponse.json({ error: "Missing photo" }, { status: 400 });
      const raw = await visionAsk(photoAnalysisPrompt(childName, typedLook, (hint as string | undefined)?.trim() || undefined), [photo]);
      try {
        const analysis = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        return NextResponse.json({ analysis });
      } catch {
        return NextResponse.json({ error: "Photo analysis returned unparseable output" }, { status: 502 });
      }
    }

    // Sheet-vs-photo fidelity check: catches a wrong skin tone / wrong hair /
    // blended-kids sheet BEFORE 16+ pages get drawn from it.
    if (action === "sheetCheck") {
      const { sheet, photo, characterDescription } = body;
      const castText = ((body.cast as string | undefined) ?? "")?.trim() || undefined;
      const photoSubject = (body.photoSubject as string | undefined)?.trim();
      if (!sheet || !photo) return NextResponse.json({ error: "Missing sheet or photo" }, { status: 400 });
      const raw = await visionAsk(sheetQaPrompt(characterDescription, castText, photoSubject), [sheet, photo]);
      try {
        const verdict = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        return NextResponse.json({ verdict });
      } catch {
        return NextResponse.json({ error: "Sheet check returned unparseable output" }, { status: 502 });
      }
    }

    if (action === "check") {
      const { image, pageText, characterDescription, styleRef, artPrompt } = body;
      const castText = ((body.cast as string | undefined) ?? (body.companionDescription as string | undefined))?.trim();
      const directorNote = (body.directorNote as string | undefined)?.trim(); // binding edit note — QA must not flag compliance with it
      if (!image) return NextResponse.json({ error: "Missing image" }, { status: 400 });
      const raw = await visionAsk(
        qaPrompt(pageText, characterDescription, castText, artPrompt, !!styleRef, directorNote),
        styleRef ? [image, styleRef] : image,
      );
      // Malformed vision output must read as "QA couldn't verify" (the client
      // treats an error as unverified-and-blocking), not a raw 500.
      try {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const verdict = JSON.parse(raw.slice(start, end + 1));
        return NextResponse.json({ verdict });
      } catch {
        return NextResponse.json({ error: "QA returned unparseable output" }, { status: 502 });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("art route failed:", e?.message || e); // keep observable in Vercel runtime logs
    return NextResponse.json({ error: e?.message || "Art step failed" }, { status: 500 });
  }
}
