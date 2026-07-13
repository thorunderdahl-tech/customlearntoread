import { NextRequest, NextResponse } from "next/server";
import { getOrderRecord, updateOrderRecord, listOrders } from "@/lib/airtable";
import { llmText, llmConfigured, parseJsonBlock } from "@/lib/llm";
import { LEVELS, resolveLevel, checkStory, type StoryDraft } from "@/lib/leveling";
import {
  orderInfoFromFields, buildGeneratePrompt, buildGradePrompt, buildRevisePrompt,
  STORY_SYSTEM, type OrderInfo, type StoryExtras,
} from "@/lib/story";
import { pickCombination, planFromKey } from "@/lib/reading/storySystem";

export const runtime = "nodejs";
// 300s (was 60): gpt-5.6-sol spends part of its budget on internal reasoning,
// so a 16-page generate + rules-check can exceed 60s (2026-07-13: 504 timeout).
export const maxDuration = 300;

// Variety memory: gather the combination keys of this child's previous books so
// the new one can be made different. Best-effort — never blocks generation.
async function priorCombinationKeys(email?: string, childName?: string, excludeId?: string): Promise<string[]> {
  try {
    const orders = await listOrders();
    const keys: string[] = [];
    for (const o of orders) {
      if (o.id === excludeId) continue;
      const f = (o.fields || {}) as Record<string, any>;
      const sameChild = (!!email && f["Parent email"] === email) || (!!childName && f["Child name"] === childName);
      if (!sameChild) continue;
      const raw = f["Story draft"];
      if (typeof raw !== "string" || !raw.trim()) continue;
      try {
        const key = JSON.parse(raw)?.combination?.key;
        if (typeof key === "string" && key) keys.push(key);
      } catch { /* skip unparseable draft */ }
    }
    return keys;
  } catch {
    return [];
  }
}

// One pipeline step per request so each call stays well under function limits.
// Actions: generate | grade | revise | save
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;

    if (action !== "save" && !llmConfigured()) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY isn't set in Vercel yet — add it under Project → Environment Variables to enable story generation." },
        { status: 503 },
      );
    }

    if (action === "generate") {
      const rec = await getOrderRecord(body.recordId);
      if (!rec) return NextResponse.json({ error: "Order not found" }, { status: 404 });
      const order = orderInfoFromFields(rec.fields);
      const level = body.levelId
        ? LEVELS.find((l) => l.id === body.levelId) || resolveLevel(rec.fields["Reading level"], order.age)
        : resolveLevel(rec.fields["Reading level"], order.age);
      const pageCount = Math.min(Math.max(parseInt(body.pageCount, 10) || 16, 4), 24);
      const extras: StoryExtras = {
        emotionalGoal: body.emotionalGoal || undefined,
        mustUseWords: body.mustUseWords || undefined,
        avoidWords: body.avoidWords || undefined,
        readAlong: !!body.readAlong,
      };
      // Variety engine: pick a fresh template × arc × setting × tone × objective
      // that differs from this child's previous books.
      const avoidKeys = await priorCombinationKeys(rec.fields["Parent email"], order.childName, body.recordId);
      const plan = pickCombination(level.id, avoidKeys);
      // 8000 output tokens: a 24-page book with adultLines + rich artPrompts can
      // exceed 6000, which truncated the JSON mid-draft.
      const raw = await llmText({ system: STORY_SYSTEM, user: buildGeneratePrompt(order, level, pageCount, extras, plan), maxTokens: 8000 });
      const draft = parseJsonBlock<StoryDraft>(raw);
      draft.combination = { key: plan.key, template: plan.template, arc: plan.arc, setting: plan.setting, tone: plan.tone, objective: plan.objective };
      const check = checkStory(draft, level);
      return NextResponse.json({ draft, check, levelId: level.id, order, parentEmail: rec.fields["Parent email"] || "", plan: { template: plan.templateName, arc: plan.arcName, setting: plan.setting, tone: plan.tone, objective: plan.objective, priorBooks: avoidKeys.length } });
    }

    if (action === "grade") {
      const draft = body.draft as StoryDraft;
      const level = LEVELS.find((l) => l.id === draft.levelId) || LEVELS[1];
      const order = body.order as OrderInfo;
      const raw = await llmText({ system: STORY_SYSTEM, user: buildGradePrompt(draft, level, order), maxTokens: 1200 });
      const grade = parseJsonBlock<{ pass: boolean; score: number; issues: string[]; praise: string }>(raw);
      return NextResponse.json({ grade });
    }

    if (action === "revise") {
      const draft = body.draft as StoryDraft;
      const level = LEVELS.find((l) => l.id === draft.levelId) || LEVELS[1];
      const issues = (body.issues as string[]) || [];
      // Recover the story plan the draft was written to (revising without it is
      // how stories flatten into page catalogs), and re-state the order extras so
      // a revision can't drop a must-use word or reintroduce an avoided one.
      const plan = planFromKey(draft.combination?.key);
      const extras: StoryExtras = {
        emotionalGoal: body.emotionalGoal || undefined,
        mustUseWords: body.mustUseWords || undefined,
        avoidWords: body.avoidWords || undefined,
      };
      const raw = await llmText({ system: STORY_SYSTEM, user: buildRevisePrompt(draft, level, issues, plan, extras), maxTokens: 8000 });
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
