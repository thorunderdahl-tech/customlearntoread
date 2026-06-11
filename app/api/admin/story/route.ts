import { NextRequest, NextResponse } from "next/server";
import { getOrderRecord, updateOrderRecord } from "@/lib/airtable";
import { claude, llmConfigured, parseJsonBlock } from "@/lib/llm";
import { LEVELS, resolveLevel, checkStory, type StoryDraft } from "@/lib/leveling";
import { orderInfoFromFields, buildGeneratePrompt, buildGradePrompt, buildRevisePrompt, type OrderInfo } from "@/lib/story";

export const runtime = "nodejs";
export const maxDuration = 60;

const STORY_SYSTEM = `You write personalized learn-to-read books for the family business "Custom Learn to Read". The hero of every book is a real child; the book exists to make THAT child feel seen and to meet them exactly at their reading level. Warm, joyful, encouraging tone. Never scary, never sad endings. You follow level rules EXACTLY — they are hard constraints, not suggestions. You reply with a single JSON object and nothing else.`;

// One pipeline step per request so each call stays well under function limits.
// Actions: generate | grade | revise | save
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action !== "save" && !llmConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY isn't set in Vercel yet — add it under Project → Environment Variables to enable story generation." },
        { status: 503 },
      );
    }

    if (action === "generate") {
      const rec = await getOrderRecord(body.recordId);
      if (!rec) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const order = orderInfoFromFields(rec.fields);
      const level = body.levelId
        ? LEVELS.find((l) => l.id === body.levelId)!
        : resolveLevel(rec.fields["Reading level"], order.age);
      const pageCount = Math.min(Math.max(parseInt(body.pageCount, 10) || 10, 4), 20);
      const raw = await claude({ system: STORY_SYSTEM, user: buildGeneratePrompt(order, level, pageCount), maxTokens: 4000 });
      const draft = parseJsonBlock<StoryDraft>(raw);
      const check = checkStory(draft, level);
      return NextResponse.json({ draft, check, levelId: level.id, order });
    }

    if (action === "grade") {
      const draft = body.draft as StoryDraft;
      const level = LEVELS.find((l) => l.id === draft.levelId) || LEVELS[0];
      const order = body.order as OrderInfo;
      const raw = await claude({ system: STORY_SYSTEM, user: buildGradePrompt(draft, level, order), maxTokens: 1200 });
      const grade = parseJsonBlock<{ pass: boolean; score: number; issues: string[]; praise: string }>(raw);
      return NextResponse.json({ grade });
    }

    if (action === "revise") {
      const draft = body.draft as StoryDraft;
      const level = LEVELS.find((l) => l.id === draft.levelId) || LEVELS[0];
      const issues = (body.issues as string[]) || [];
      const raw = await claude({ system: STORY_SYSTEM, user: buildRevisePrompt(draft, level, issues), maxTokens: 4000 });
      const revised = parseJsonBlock<StoryDraft>(raw);
      const check = checkStory(revised, level);
      return NextResponse.json({ draft: revised, check });
    }

    if (action === "save") {
      const draft = body.draft as StoryDraft;
      if (!body.recordId) return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
      await updateOrderRecord(body.recordId, {
        "Story draft": JSON.stringify(draft, null, 1),
        "Story status": body.approved ? "Story approved" : "Story drafted",
        Status: "Designing",
      });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Story step failed" }, { status: 500 });
  }
}
