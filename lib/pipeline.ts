// Unattended book-generation pipeline (the "runs while you sleep" lane).
//
// Mirrors the interactive create screen's orchestration, but server-side and
// RESUMABLE: each call to advanceOrder() does a bounded chunk of work (respecting
// a wall-clock deadline), persists progress to the Airtable order, and returns.
// The cron route (/api/cron/generate) drains orders every run, so a 16-page book
// completes across a few invocations without ever hitting serverless timeouts.
//
// State machine (Airtable "Status" field, options auto-created via typecast):
//   Paid -> Generating -> Ready for review            (clean candidate)
//                      -> Needs attention             (QA-flagged pages / cap hit / stuck)
// The human stays in the loop AFTER generation: review happens in the existing
// create screen ("Load overnight candidate"), delivery stays a manual click.
//
// Progress lives in two order fields:
//   "Story draft"    — the draft JSON (same field the manual lane uses)
//   "Pipeline state" — JSON: phase, image-call count, per-page art URLs + QA
// Art is stored in Vercel Blob under candidates/{recordId}/.

import { put } from "@vercel/blob";
import sharp from "sharp";
import { updateOrderRecord, listOrders, type AirtableOrder } from "./airtable";
import { claude, parseJsonBlock, llmConfigured } from "./llm";
import { generateImage, visionAsk, geminiConfigured } from "./gemini";
import {
  orderInfoFromFields, buildGeneratePrompt, buildGradePrompt, buildRevisePrompt,
  buildArtDirectionPrompt, STORY_SYSTEM, type StoryExtras,
} from "./story";
import { LEVELS, resolveLevel, checkStory, type StoryDraft } from "./leveling";
import { pickCombination, planFromKey } from "./reading/storySystem";
import { characterSheetPrompt, pagePrompt, qaPrompt, sheetQaPrompt, photoAnalysisPrompt } from "./artPrompts";

// ---- tunables (env-overridable) ----
const IMAGE_CAP = Number(process.env.PIPELINE_IMAGE_CAP) || 40; // hard ceiling per book — cost protection
const MAX_REVISES = 4; // rules-revise budget across the whole story phase
const PAGE_ATTEMPTS = 3; // generation attempts per page (QA issues fed back as fix notes)
const DEADLINE_MARGIN_MS = 25_000; // stop starting new work this long before the deadline

export interface PipelinePage {
  url: string;
  mime: string;
  pass: boolean;
  issues?: string[];
}

export interface PipelineState {
  version: 1;
  phase: "story" | "revise" | "grade" | "character" | "pages" | "done" | "stuck";
  imageCalls: number;
  revises: number;
  gradeRevised?: boolean;
  grade?: { pass: boolean; score: number };
  charUrl?: string;
  charMime?: string;
  pages: Record<string, PipelinePage>; // "0" = cover
  error?: string;
  runFailures: number; // consecutive advanceOrder() crashes — 3 strikes -> Needs attention
  startedAt: string;
  updatedAt: string;
}

export type AdvanceResult =
  | { kind: "progress"; note: string } // did work, more remains — resume next run
  | { kind: "ready"; note: string }    // candidate complete, all pages passed QA
  | { kind: "attention"; note: string } // finished but flagged, capped, or stuck
  | { kind: "skipped"; note: string };

function newState(): PipelineState {
  return { version: 1, phase: "story", imageCalls: 0, revises: 0, pages: {}, runFailures: 0, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

function parseState(raw: unknown): PipelineState | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const s = JSON.parse(raw) as PipelineState;
    return s && s.version === 1 && s.phase ? s : null;
  } catch { return null; }
}

async function saveState(recordId: string, state: PipelineState, extraFields: Record<string, unknown> = {}): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await updateOrderRecord(recordId, {
    "Pipeline state": JSON.stringify(state),
    "AI images": state.imageCalls,
    ...extraFields,
  });
}

// ---- image helpers (sharp replaces the browser canvas the manual lane uses) ----

/** Fetch an image URL and return a downscaled JPEG as base64 (no data: prefix). */
async function fetchAsJpegB64(url: string, width: number, cache: Map<string, string>): Promise<string> {
  const key = `${url}@${width}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ref fetch failed (${res.status}): ${url.slice(0, 80)}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const out = await sharp(buf).resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  const b64 = out.toString("base64");
  cache.set(key, b64);
  return b64;
}

/** Downscale a base64 image (fresh from Gemini) to a JPEG base64 for QA/refs. */
async function b64ToJpegB64(b64: string, width: number): Promise<string> {
  const out = await sharp(Buffer.from(b64, "base64")).resize({ width, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return out.toString("base64");
}

/** Store a generated image in Blob under this order's candidate folder. */
async function storeArt(recordId: string, name: string, b64: string, mime: string): Promise<string> {
  const ext = mime.includes("png") ? "png" : "jpg";
  const blob = await put(`candidates/${recordId}/${name}-${Date.now()}.${ext}`, Buffer.from(b64, "base64"), {
    access: "public",
    contentType: mime,
    addRandomSuffix: false,
  });
  return blob.url;
}

// ---- story phase ----

async function priorCombinationKeys(all: AirtableOrder[], email?: string, childName?: string, excludeId?: string): Promise<string[]> {
  const keys: string[] = [];
  for (const o of all) {
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
}

function orderExtras(f: Record<string, any>): StoryExtras {
  return { readAlong: f["Parent read-along"] === "Yes" };
}

// ---- the resumable step function ----

/** Advance one order as far as time allows. Persists progress before returning.
 * Never throws for content problems (those become Needs attention); only
 * infrastructure errors propagate to the caller's catch. */
export async function advanceOrder(order: AirtableOrder, deadline: number, allOrders: AirtableOrder[]): Promise<AdvanceResult> {
  const f = order.fields as Record<string, any>;
  const recordId = order.id;
  if (!llmConfigured() || !geminiConfigured()) return { kind: "skipped", note: "LLM/Gemini not configured" };
  const timeLeft = () => deadline - DEADLINE_MARGIN_MS - Date.now();

  const state = parseState(f["Pipeline state"]) ?? newState();
  let draft: StoryDraft | null = null;
  try { draft = f["Story draft"] ? (JSON.parse(f["Story draft"]) as StoryDraft) : null; } catch { draft = null; }

  const info = orderInfoFromFields(f);
  const level = draft?.levelId
    ? LEVELS.find((l) => l.id === draft!.levelId) || resolveLevel(f["Reading level"], info.age)
    : resolveLevel(f["Reading level"], info.age);
  const digitalOnly = f["Product"] === "Digital Book";
  const imageSize = digitalOnly ? "2K" : "4K";
  // Numbered roster (matches the manual lane's castText) — explicit numbering
  // tells the image model the exact cast COUNT, which stops it inventing or
  // substituting extra characters.
  const cast = () =>
    (draft?.castDescriptions?.length
      ? draft.castDescriptions.map((c, i) => `(${i + 1}) ${String(c).trim()}`).join(" ")
      : (draft as any)?.companionDescription || ""
    ).trim() || undefined;

  const stuck = async (why: string): Promise<AdvanceResult> => {
    state.phase = "stuck";
    state.error = why;
    await saveState(recordId, state, { Status: "Needs attention" });
    return { kind: "attention", note: why };
  };
  const progress = async (note: string): Promise<AdvanceResult> => {
    await saveState(recordId, state, { Status: "Generating" });
    return { kind: "progress", note };
  };

  // ---------- STORY ----------
  if (state.phase === "story") {
    if (timeLeft() < 60_000) return progress("waiting for a fresh time budget (story)");
    const plan = pickCombination(level.id, await priorCombinationKeys(allOrders, f["Parent email"], info.childName, recordId));
    const raw = await claude({ system: STORY_SYSTEM, user: buildGeneratePrompt(info, level, 16, orderExtras(f), plan), maxTokens: 8000 });
    draft = parseJsonBlock<StoryDraft>(raw);
    draft.combination = { key: plan.key, template: plan.template, arc: plan.arc, setting: plan.setting, tone: plan.tone, objective: plan.objective };
    const check = checkStory(draft, level);
    state.phase = check.pass ? "grade" : "revise";
    await saveState(recordId, state, { "Story draft": JSON.stringify(draft, null, 1), "Story status": "Story drafted", Status: "Generating" });
    if (timeLeft() < 60_000) return { kind: "progress", note: "story drafted" };
  }

  if (!draft) return stuck("No story draft on record — story phase produced nothing parseable.");

  // ---------- REVISE (rules convergence) ----------
  while (state.phase === "revise") {
    if (state.revises >= MAX_REVISES) return stuck(`Story failed the rules check after ${MAX_REVISES} revisions — needs a human pass.`);
    if (timeLeft() < 60_000) return progress(`revising (pass ${state.revises + 1})`);
    const check = checkStory(draft, level);
    if (check.pass) { state.phase = "grade"; break; }
    const raw = await claude({ system: STORY_SYSTEM, user: buildRevisePrompt(draft, level, check.problems, planFromKey(draft.combination?.key), orderExtras(f)), maxTokens: 8000 });
    draft = parseJsonBlock<StoryDraft>(raw);
    state.revises++;
    await saveState(recordId, state, { "Story draft": JSON.stringify(draft, null, 1) });
  }

  // ---------- GRADE (AI quality gate; advisory like the manual lane) ----------
  if (state.phase === "grade") {
    if (timeLeft() < 60_000) return progress("waiting for a fresh time budget (grade)");
    const raw = await claude({ system: STORY_SYSTEM, user: buildGradePrompt(draft, level, info), maxTokens: 1200 });
    const grade = parseJsonBlock<{ pass: boolean; score: number; issues: string[] }>(raw);
    state.grade = { pass: grade.pass, score: grade.score };
    if (!grade.pass && grade.issues?.length && !state.gradeRevised && state.revises < MAX_REVISES) {
      // One arc-revise on grader issues, then re-converge rules and re-grade —
      // mirrors the manual lane's single grade-revise cycle.
      const rv = await claude({ system: STORY_SYSTEM, user: buildRevisePrompt(draft, level, grade.issues, planFromKey(draft.combination?.key), orderExtras(f)), maxTokens: 8000 });
      draft = parseJsonBlock<StoryDraft>(rv);
      state.gradeRevised = true;
      state.revises++;
      state.phase = "revise";
      await saveState(recordId, state, { "Story draft": JSON.stringify(draft, null, 1) });
      if (checkStory(draft, level).pass) state.phase = "grade"; // straight back to a re-grade next run
      return progress("grader flagged issues — revised, re-checking");
    }
    state.phase = "character";
    await saveState(recordId, state);
  }

  // ---------- CHARACTER SHEET ----------
  const refCache = new Map<string, string>();
  if (state.phase === "character") {
    if (timeLeft() < 60_000) return progress("waiting for a fresh time budget (character)");
    if (state.imageCalls >= IMAGE_CAP) return stuck(`Image cap (${IMAGE_CAP}) hit before the character sheet.`);
    // Parent reference photo (first URL, if any) gets stylized into the sheet.
    let photoB64: string | undefined;
    const firstPhoto = String(f["Reference photos"] || "").split(/\s+/).filter(Boolean)[0];
    if (firstPhoto) {
      try { photoB64 = await fetchAsJpegB64(firstPhoto, 1024, refCache); } catch { /* sheet from description only */ }
    }
    // "Photo subject" Airtable column (optional): the parent's casual hint about
    // who's in the photo ("Reeva is in the middle"). Missing column reads as
    // undefined — safe. Parents won't write forensic detail, so a vision
    // pre-analysis expands the photo (plus any hint) into a precise cast map;
    // the raw hint is only the fallback if analysis fails.
    const rawHint = String(f["Photo subject"] || "").trim() || undefined;
    let photoSubject = rawHint;
    if (photoB64) {
      try {
        const typedLook = [f["Hair"] && `hair: ${f["Hair"]}`, f["Eyes"] && `eyes: ${f["Eyes"]}`, f["Skin tone"] && `skin tone: ${f["Skin tone"]}`].filter(Boolean).join("; ") || undefined;
        const raw = await visionAsk(photoAnalysisPrompt(info.childName, typedLook, rawHint), [photoB64]);
        const a = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
        if (a?.castMap) photoSubject = String(a.castMap);
      } catch { /* fall back to the raw hint (or nothing) */ }
    }
    state.imageCalls++;
    let img = await generateImage(characterSheetPrompt(draft.characterDescription, cast(), undefined, !!photoB64, photoSubject), photoB64 ? [photoB64] : [], "2:3", imageSize);
    // Sheet-vs-photo fidelity gate: a sheet with the wrong skin tone or hair
    // poisons every page, so verify against the real photo BEFORE pages. One
    // retry with the issues as an art-director note; still failing -> human.
    if (photoB64) {
      const checkSheet = async (sheetB64: string): Promise<{ pass: boolean; issues: string[] } | undefined> => {
        try {
          const raw = await visionAsk(sheetQaPrompt(draft!.characterDescription, cast(), photoSubject), [await b64ToJpegB64(sheetB64, 1000), photoB64!]);
          const v = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
          return { pass: !!v.pass, issues: Array.isArray(v.issues) ? v.issues : [] };
        } catch { return undefined; } // fidelity check unavailable — don't block on it
      };
      let verdict = await checkSheet(img.data);
      if (verdict && !verdict.pass && state.imageCalls < IMAGE_CAP && timeLeft() > 60_000) {
        state.imageCalls++;
        img = await generateImage(
          characterSheetPrompt(draft.characterDescription, cast(), `FIX these problems (the sheet must match the reference photo exactly): ${verdict.issues.join("; ")}`, true, photoSubject),
          [photoB64], "2:3", imageSize,
        );
        verdict = await checkSheet(img.data);
      }
      if (verdict && !verdict.pass) {
        state.charUrl = await storeArt(recordId, "char", img.data, img.mime);
        state.charMime = img.mime;
        return stuck(`Character sheet doesn't match the reference photo after a retry: ${verdict.issues.join("; ")} — fix in the create screen (add a photo cast map).`);
      }
    }
    state.charUrl = await storeArt(recordId, "char", img.data, img.mime);
    state.charMime = img.mime;
    state.phase = "pages";
    await saveState(recordId, state);
  }

  // ---------- PAGES (cover = 0, then interiors) ----------
  if (state.phase === "pages") {
    if (!state.charUrl) return stuck("Pages phase reached without a character sheet.");
    const targets: { n: number; text: string; artPrompt: string }[] = [
      { n: 0, text: draft.title, artPrompt: draft.coverArtPrompt },
      ...draft.pages.map((p) => ({ n: p.n, text: p.text, artPrompt: p.artPrompt })),
    ];
    for (const page of targets) {
      if (state.pages[String(page.n)]?.pass) continue; // already done
      if (timeLeft() < 90_000) return progress(`illustrated ${Object.keys(state.pages).length}/${targets.length} pages`);
      if (state.imageCalls >= IMAGE_CAP) {
        return stuck(`Image cap (${IMAGE_CAP}) hit with ${targets.filter((t) => !state.pages[String(t.n)]?.pass).length} page(s) unfinished — finish manually in the create screen.`);
      }

      // Art-direction expansion (best-effort, same as the manual lane).
      let scene = page.artPrompt;
      try {
        const expanded = (await claude({
          system: "You are an expert children's picture-book art director.",
          user: buildArtDirectionPrompt(page.text, page.artPrompt, draft.characterDescription, cast()),
          maxTokens: 400,
        })).trim();
        if (expanded) scene = expanded;
      } catch { /* raw scene */ }

      // Refs: sheet first (sharp, 1100px), then earliest + nearest passed pages.
      const passed = Object.entries(state.pages)
        .filter(([k, v]) => Number(k) !== page.n && Number(k) !== 0 && v.pass)
        .map(([k, v]) => ({ n: Number(k), url: v.url }))
        .sort((a, b) => a.n - b.n);
      const nearest = passed.length
        ? passed.reduce((best, cur) => (Math.abs(cur.n - page.n) < Math.abs(best.n - page.n) ? cur : best))
        : undefined;
      const anchorUrls = [...new Set([passed[0]?.url, nearest?.url].filter(Boolean) as string[])];
      const refs = [
        await fetchAsJpegB64(state.charUrl, 1100, refCache),
        ...(await Promise.all(anchorUrls.slice(0, 2).map((u) => fetchAsJpegB64(u, 900, refCache)))),
      ];

      // Up to PAGE_ATTEMPTS tries; QA issues feed the next attempt; best attempt wins.
      let notes = "";
      let best: { img: string; mime: string; pass: boolean; issues: string[]; score: number } | undefined;
      for (let attempt = 0; attempt < PAGE_ATTEMPTS; attempt++) {
        if (state.imageCalls >= IMAGE_CAP || (attempt > 0 && timeLeft() < 60_000)) break;
        state.imageCalls++;
        const img = await generateImage(pagePrompt(scene, draft.characterDescription, cast(), undefined, notes || undefined), refs, "2:3", imageSize);
        let pass = false, issues: string[] = [];
        try {
          const raw = await visionAsk(
            qaPrompt(page.text, draft.characterDescription, cast(), page.artPrompt, true),
            [await b64ToJpegB64(img.data, 1200), await fetchAsJpegB64(state.charUrl, 1000, refCache)],
          );
          const v = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
          pass = !!v.pass; issues = Array.isArray(v.issues) ? v.issues : [];
        } catch { issues = ["QA could not run — verify manually"]; }
        const score = pass ? -1 : issues.length || 98;
        if (!best || score < best.score) best = { img: img.data, mime: img.mime, pass, issues, score };
        if (pass) break;
        notes = issues.join("; ");
      }
      if (!best) return progress(`paused before page ${page.n} (cap or time)`);
      const url = await storeArt(recordId, `p${page.n}`, best.img, best.mime);
      state.pages[String(page.n)] = { url, mime: best.mime, pass: best.pass, issues: best.issues.length ? best.issues : undefined };
      await saveState(recordId, state); // persist after EVERY page — a timeout loses at most one page
    }

    // All targets have art. Clean book -> Ready for review; flagged -> Needs attention.
    const flagged = targets.filter((t) => !state.pages[String(t.n)]?.pass).map((t) => (t.n === 0 ? "cover" : `page ${t.n}`));
    state.phase = "done";
    if (flagged.length) {
      state.error = `QA flagged: ${flagged.join(", ")} — redo or accept in the create screen.`;
      await saveState(recordId, state, { Status: "Needs attention" });
      return { kind: "attention", note: state.error };
    }
    state.error = undefined;
    await saveState(recordId, state, { Status: "Ready for review" });
    return { kind: "ready", note: `candidate complete (${state.imageCalls} image calls)` };
  }

  if (state.phase === "done") return { kind: "skipped", note: "already complete" };
  if (state.phase === "stuck") return { kind: "skipped", note: `stuck: ${state.error || "unknown"}` };
  return { kind: "skipped", note: `unknown phase ${state.phase}` };
}

/** Record a run-level crash against the order; three strikes -> Needs attention
 * (otherwise a persistent infra error would retry forever, silently). */
export async function recordRunFailure(order: AirtableOrder, message: string): Promise<void> {
  const state = parseState((order.fields as any)["Pipeline state"]) ?? newState();
  state.runFailures = (state.runFailures || 0) + 1;
  state.error = message;
  const giveUp = state.runFailures >= 3;
  if (giveUp) state.phase = "stuck";
  try {
    await saveState(order.id, state, giveUp ? { Status: "Needs attention" } : {});
  } catch { /* Airtable itself down — nothing more to do */ }
}

/** Which orders the cron should touch, resumes first so books finish before new
 * ones start. Auto-start only takes orders NOBODY has touched (no draft, no
 * pipeline state) so it can never trample manual work in progress. */
export function pickQueue(all: AirtableOrder[], autoStart: boolean): AirtableOrder[] {
  const resumes = all.filter((o) => o.fields?.["Status"] === "Generating");
  const fresh = autoStart
    ? all.filter((o) => o.fields?.["Status"] === "Paid" && !o.fields?.["Story draft"] && !o.fields?.["Pipeline state"])
    : [];
  // Oldest first — first come, first served.
  const byAge = (a: AirtableOrder, b: AirtableOrder) => (a.createdTime < b.createdTime ? -1 : 1);
  return [...resumes.sort(byAge), ...fresh.sort(byAge)];
}
