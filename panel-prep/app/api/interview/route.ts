import { NextRequest, NextResponse } from "next/server";
import { claude, llmConfigured, parseJsonBlock } from "@/lib/llm";
import {
  getPanelist, CANDIDATE_PROFILE, STATE_OF_PLAY, COACHING_RUBRIC, THREE_MESSAGES,
} from "@/lib/interview";

export const runtime = "nodejs";
export const maxDuration = 60;

// Actions: respond (score one answer + in-character follow-up) | debrief (whole session)

type RespondBody = {
  action: "respond";
  panelistId: string;
  question: string;
  answer: string;
  spokenSeconds?: number;
  isFollowUp?: boolean;
  priorQuestion?: string;
  priorAnswer?: string;
};

type DebriefEntry = {
  panelist: string;
  question: string;
  answer: string;
  score?: number;
};

export type Feedback = {
  score: number;
  headline: string;
  strengths: string[];
  fixes: string[];
  followUp: string | null;
};

export type Debrief = {
  readiness: string;
  summary: string;
  messages: Array<{ message: string; landed: boolean; note: string }>;
  topFixes: string[];
};

const COACH_CONTEXT = `${CANDIDATE_PROFILE}\n\n${STATE_OF_PLAY}\n\n${COACHING_RUBRIC}`;

export async function POST(req: NextRequest) {
  try {
    if (!llmConfigured()) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY isn't set — AI coaching unavailable, using dossier hints instead." },
        { status: 503 },
      );
    }
    const body = await req.json().catch(() => ({}));

    if (body?.action === "respond") {
      const b = body as RespondBody;
      const panelist = getPanelist(b.panelistId);
      if (!panelist || !b.question || !b.answer?.trim()) {
        return NextResponse.json({ error: "Missing panelist, question, or answer" }, { status: 400 });
      }
      const system = `You are a brutally useful mock-interview coach preparing a candidate for a six-person panel interview at WSP USA. You also role-play the panelists. Ground every judgment in the dossier facts below — reward answers that use them correctly and flag answers that miss obvious ammunition or violate the rubric.\n\n${COACH_CONTEXT}`;

      const followUpRule = b.isFollowUp
        ? "This was already a follow-up exchange, so set followUp to null."
        : `Then, in character as ${panelist.name} (style: ${panelist.style}), ask ONE realistic follow-up probing the weakest or most interesting part of the answer. Keep it to a single spoken sentence or two.`;

      const user = `PANELIST ASKING:\n${panelist.name} — ${panelist.title}. ${panelist.role}.\n${panelist.brief}\nCandidate's ammunition for this panelist: ${panelist.connections.join("; ") || "n/a"}\n\n${
        b.priorQuestion ? `EARLIER IN THIS EXCHANGE:\nQ: ${b.priorQuestion}\nA: ${b.priorAnswer}\n\n` : ""
      }QUESTION: ${b.question}\n\nCANDIDATE'S ANSWER (typed; estimated spoken length ~${Math.round(b.spokenSeconds || 0)}s — over 120s is too long for this panel):\n${b.answer}\n\nEvaluate the answer against the rubric and this panelist's lens. ${followUpRule}\n\nReply with ONLY a JSON object:\n{\n  "score": <1-5, 5 = would visibly land with this panelist>,\n  "headline": "<one blunt sentence: did it land with ${panelist.name}, and why>",\n  "strengths": ["<what worked, max 3, specific to what they actually said>"],\n  "fixes": ["<what to tighten or add, max 3, citing specific dossier ammunition they missed>"],\n  "followUp": ${b.isFollowUp ? "null" : `"<the in-character follow-up question>"`}\n}`;

      const raw = await claude({ system, user, maxTokens: 900 });
      const fb = parseJsonBlock<Feedback>(raw);
      return NextResponse.json(fb);
    }

    if (body?.action === "debrief") {
      const entries = (body.entries || []) as DebriefEntry[];
      if (!entries.length) {
        return NextResponse.json({ error: "No answers to debrief" }, { status: 400 });
      }
      const system = `You are a mock-interview coach delivering an end-of-session debrief for a six-person WSP panel simulation. Be direct, specific, and grounded in the dossier facts below.\n\n${COACH_CONTEXT}`;
      const transcript = entries
        .map((e, i) => `${i + 1}. [${e.panelist}] Q: ${e.question}\nA: ${e.answer}${e.score ? `\n(per-answer score: ${e.score}/5)` : ""}`)
        .join("\n\n");
      const user = `SESSION TRANSCRIPT:\n${transcript}\n\nTHE THREE MESSAGES the candidate must land no matter what:\n${THREE_MESSAGES.map((m, i) => `${i + 1}. ${m}`).join("\n")}\n\nReply with ONLY a JSON object:\n{\n  "readiness": "<one of: 'Ready for the room', 'Close — tighten and re-run', 'Needs another full rep'>",\n  "summary": "<3-4 sentences: overall performance, the single biggest pattern to fix, and what's already working>",\n  "messages": [\n    { "message": "<message 1 short label>", "landed": <true/false>, "note": "<where it landed or the missed opening>" },\n    { "message": "<message 2 short label>", "landed": <true/false>, "note": "..." },\n    { "message": "<message 3 short label>", "landed": <true/false>, "note": "..." }\n  ],\n  "topFixes": ["<the 3 highest-leverage changes before the real panel>"]\n}`;

      const raw = await claude({ system, user, maxTokens: 1100 });
      const db = parseJsonBlock<Debrief>(raw);
      return NextResponse.json(db);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
