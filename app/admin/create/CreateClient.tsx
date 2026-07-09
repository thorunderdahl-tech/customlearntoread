"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { upload } from "@vercel/blob/client";
import type { AirtableOrder } from "@/lib/airtable";
import { LEVELS, patternWords, wordKind } from "@/lib/leveling";

type Draft = {
  title: string;
  levelId: string;
  childName: string;
  characterDescription: string;
  companionDescription?: string; // legacy
  castDescriptions?: string[];
  coverArtPrompt: string;
  pages: { n: number; text: string; artPrompt: string; adultLine?: string }[];
};
// Appearance locks for every recurring character other than the hero.
const castText = (d: Draft | null) =>
  (d?.castDescriptions?.length ? d.castDescriptions.join(" ") : d?.companionDescription || "").trim() || undefined;
type Check = { pass: boolean; problems: string[]; warnings?: string[]; stats: { totalWords: number; pages: number } };
type Grade = { pass: boolean; score: number; issues: string[]; praise: string };
type ArtQA = { pass: boolean; issues: string[] };

const field = (o: AirtableOrder, k: string) => (o.fields?.[k] ?? "") as string;

async function api(path: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}
const story = (b: Record<string, unknown>) => api("/api/admin/story", b);
const art = (b: Record<string, unknown>) => api("/api/admin/art", b);

function newToken(): string {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  let t = "";
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  for (let i = 0; i < 8; i++) t += abc[a[i] % abc.length];
  return t;
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30);

async function downscale(dataUrl: string, w: number, q: number): Promise<string> {
  const img = await loadImg(dataUrl);
  const h = Math.round((img.height / img.width) * w);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", q);
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error("image decode failed")); i.src = src; });
}

// Natural pixel dimensions of a base64 image — used by the print pre-flight guard.
async function imgDims(b64: string): Promise<{ w: number; h: number }> {
  const i = await loadImg("data:image/png;base64," + b64);
  return { w: i.naturalWidth || i.width, h: i.naturalHeight || i.height };
}

async function fileToJpegB64(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImg(url);
    const max = 1024;
    const s = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally { URL.revokeObjectURL(url); }
}

// ---- Print spec (brand sheet): 5.5"x8.5" trim + 0.125" bleed, 300 DPI, 0.5" safe area ----
const DPI = 300;
const PAGE_W = Math.round(5.75 * DPI); // 1725 px = trim 5.5" + 0.125" bleed each side
const PAGE_H = Math.round(8.75 * DPI); // 2625 px
const SAFE = Math.round(0.625 * DPI);  // 188 px from page edge to safe area (0.125" bleed + 0.5" safe)
const TRIM_PT_W = 5.75 * 72;           // 414 pt — bleed page in PDF points (1 px = 1/300", so 300 DPI)
const TRIM_PT_H = 8.75 * 72;           // 630 pt
const pt = (n: number) => Math.round((n * DPI) / 72); // type points -> px at 300 DPI

// Load the book fonts before rasterizing text onto the canvas (Andika interior,
// Montserrat cover). Falls back to system fonts if Google Fonts is unreachable.
async function ensureBookFonts(): Promise<void> {
  try {
    const fonts: any = (document as any).fonts;
    if (!fonts?.load) return;
    await Promise.all([
      fonts.load(`700 ${pt(36)}px Andika`),
      fonts.load(`400 ${pt(36)}px Andika`),
      fonts.load(`800 ${pt(40)}px Montserrat`),
    ]);
    await fonts.ready;
  } catch { /* system fallback */ }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const ws = text.split(/\s+/); const lines: string[] = []; let line = "";
  for (const w of ws) { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line);
  return lines;
}

// Per-book interior text-band top (the art→text cutoff). Sized once per book to
// fit its wordiest page, then reused on EVERY interior page — so the cutoff can
// vary book to book but never page to page within a book. Clamped to a sane band.
function interiorBandTop(maxLines: number, maxAdultLines = 0): number {
  const fs = pt(36), lh = fs * 1.32, pad = pt(30);
  const afs = pt(19), alh = afs * 1.34;
  const childH = Math.max(1, maxLines) * lh;
  const adultH = maxAdultLines > 0 ? maxAdultLines * alh + pt(14) : 0;
  const top = (PAGE_H - SAFE) - childH - adultH - pad * 2;
  // Allow a lower band start when there are read-along lines (taller text block).
  const minTop = Math.round(PAGE_H * (maxAdultLines > 0 ? 0.5 : 0.58));
  return Math.min(Math.max(top, minTop), Math.round(PAGE_H * 0.82));
}

// Composite a print-ready book page: full-bleed art (to the 0.125" bleed edge) +
// typeset text kept inside the 0.5" safe area. Text is never AI-rendered.
// Interior text is Andika at ~36pt (brand-required 32-40pt); cover is Montserrat.
// bandTop (interior only) is the fixed cutoff line, computed once per book.
async function compositePage(artB64: string, text: string, pageNo: number, isCover: boolean, bandTop?: number, adultLine?: string): Promise<string> {
  const W = PAGE_W, H = PAGE_H;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d")!;
  // Cream ground so any rounding gap never shows as white.
  ctx.fillStyle = "#faf7f2"; ctx.fillRect(0, 0, W, H);
  // Full-bleed art: cover-fit so it reaches every edge, including the bleed.
  const img = await loadImg("data:image/png;base64," + artB64);
  const s = Math.max(W / img.width, H / img.height);
  ctx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);

  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const maxW = W - SAFE * 2; // keep all text inside the safe area

  if (isCover) {
    const fs = pt(40);
    ctx.font = `800 ${fs}px Montserrat, "Segoe UI", system-ui, sans-serif`;
    const lines = wrapText(ctx, text, maxW);
    const lh = fs * 1.18;
    const blockH = lines.length * lh;
    const blockTop = H - SAFE - blockH; // title block ends at the safe-area bottom line
    ctx.fillStyle = "rgba(250,247,242,0.92)";
    ctx.fillRect(0, blockTop - pt(22), W, H - (blockTop - pt(22)));
    ctx.fillStyle = "#1f2a44";
    lines.forEach((l, i) => ctx.fillText(l, W / 2, blockTop + lh / 2 + i * lh));
    return c.toDataURL("image/jpeg", 0.92);
  }

  // Interior reading text — Andika, big and literacy-safe. The cream text band
  // starts at a FIXED line on every page (BAND_TOP) so the art→text cutoff lines
  // up exactly across the whole book. Text is vertically centered in the band,
  // kept above the safe-area bottom, regardless of how many lines it wraps to.
  const BAND_TOP = bandTop ?? Math.round(H * 0.74); // per-book fixed cutoff (fallback if not provided)
  ctx.fillStyle = "#faf7f2"; // solid cream so the cutoff is clean and consistent
  ctx.fillRect(0, BAND_TOP, W, H - BAND_TOP);
  const fs = pt(36);
  ctx.font = `700 ${fs}px Andika, "Comic Sans MS", system-ui, sans-serif`;
  const lines = wrapText(ctx, text, maxW);
  const lh = fs * 1.32;
  const childH = lines.length * lh;
  // Parent Read-Along Lines: a smaller, italic, muted grown-up line under the
  // child line. Distinguished by type alone (the front-of-book key explains it).
  const afs = pt(19), alh = afs * 1.34, gap = adultLine ? pt(14) : 0;
  let adultLines: string[] = [];
  if (adultLine) {
    ctx.font = `italic 400 ${afs}px Andika, "Comic Sans MS", system-ui, sans-serif`;
    adultLines = wrapText(ctx, adultLine, maxW);
  }
  const adultH = adultLines.length ? adultLines.length * alh : 0;
  const blockH = childH + gap + adultH;
  const areaBottom = H - SAFE; // never let text cross the safe-area line
  const center = Math.min((BAND_TOP + areaBottom) / 2, areaBottom - blockH / 2);
  const top = center - blockH / 2;
  ctx.font = `700 ${fs}px Andika, "Comic Sans MS", system-ui, sans-serif`;
  ctx.fillStyle = "#2f2a24";
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + lh / 2 + i * lh));
  if (adultLines.length) {
    ctx.font = `italic 400 ${afs}px Andika, "Comic Sans MS", system-ui, sans-serif`;
    ctx.fillStyle = "#6b6257";
    const aTop = top + childH + gap;
    adultLines.forEach((l, i) => ctx.fillText(l, W / 2, aTop + alh / 2 + i * alh));
  }

  // Page number — small, inside the safe area.
  ctx.fillStyle = "#8c5b37";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.font = `600 ${pt(11)}px Andika, system-ui, sans-serif`;
  ctx.fillText(String(pageNo), SAFE, H - SAFE + pt(18));
  return c.toDataURL("image/jpeg", 0.92);
}

// ---- printer-file geometry (softcover): home PDF is trim size; printer files keep bleed ----
const HOME_PT_W = 5.5 * 72, HOME_PT_H = 8.5 * 72; // 396 × 612 — customer home-print PDF (bleed cropped)
const BLEED_OFF_PT = 0.125 * 72;                  // 9 pt
const SPINE_IN_PER_PAGE = 0.002252;               // 50 lb white paper (KDP/Lulu)
const MIN_INTERIOR = 24;                          // perfect-bound minimum; interior count must also be even
const NAVY = "#1f2a44", INKC = "#2f2a24", CREAMC = "#faf7f2", CARAMEL = "#c68a52", CARAMEL_DARK = "#8c5b37";
const ANDIKA = 'Andika, "Comic Sans MS", system-ui, sans-serif';
const MONTSERRAT = 'Montserrat, "Segoe UI", system-ui, sans-serif';

function newTypesetPage(): { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const c = document.createElement("canvas"); c.width = PAGE_W; c.height = PAGE_H;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = "high";
  ctx.fillStyle = CREAMC; ctx.fillRect(0, 0, PAGE_W, PAGE_H);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  return { c, ctx };
}

function titlePage(title: string, childName: string): string {
  const { c, ctx } = newTypesetPage();
  const fs = pt(38);
  ctx.font = `800 ${fs}px ${MONTSERRAT}`; ctx.fillStyle = NAVY;
  const lines = wrapText(ctx, title, PAGE_W - SAFE * 2.2);
  const lh = fs * 1.22;
  const cy = PAGE_H * 0.4 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, PAGE_W / 2, cy + i * lh));
  ctx.fillStyle = CARAMEL;
  ctx.fillRect(PAGE_W / 2 - pt(30), cy + lines.length * lh + pt(8), pt(60), pt(3));
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `700 ${pt(16)}px ${ANDIKA}`;
  ctx.fillText(`Made just for ${childName}`, PAGE_W / 2, cy + lines.length * lh + pt(40));
  ctx.font = `600 ${pt(10)}px ${MONTSERRAT}`;
  ctx.fillText("C U S T O M   L E A R N   T O   R E A D", PAGE_W / 2, PAGE_H - SAFE - pt(10));
  return c.toDataURL("image/jpeg", 0.92);
}

function copyrightPage(childName: string, year: number): string {
  const { c, ctx } = newTypesetPage();
  ctx.fillStyle = CARAMEL_DARK;
  const fs = pt(10.5);
  ctx.font = `400 ${fs}px ${ANDIKA}`;
  [`This book was made with love for ${childName}.`,
   `© ${year} Custom Learn to Read · customlearntoread.com`,
   "All rights reserved."].forEach((l, i) => ctx.fillText(l, PAGE_W / 2, PAGE_H - SAFE - pt(52) + i * fs * 1.7));
  return c.toDataURL("image/jpeg", 0.92);
}

// Front-of-book key for Parent Read-Along Lines: taught once, then the two type
// styles do the work on every page.
function readAlongKeyPage(): string {
  const { c, ctx } = newTypesetPage();
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${pt(22)}px ${MONTSERRAT}`;
  ctx.fillText("How to read this book together", PAGE_W / 2, PAGE_H * 0.30);
  ctx.fillStyle = INKC;
  ctx.font = `700 ${pt(28)}px ${ANDIKA}`;
  ctx.fillText("The big words", PAGE_W / 2, PAGE_H * 0.44);
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `400 ${pt(15)}px ${ANDIKA}`;
  ctx.fillText("are for your child to read.", PAGE_W / 2, PAGE_H * 0.44 + pt(34));
  ctx.fillStyle = "#6b6257";
  ctx.font = `italic 400 ${pt(20)}px ${ANDIKA}`;
  ctx.fillText("The small words in italics", PAGE_W / 2, PAGE_H * 0.58);
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `400 ${pt(15)}px ${ANDIKA}`;
  ctx.fillText("are for a grown-up to read aloud.", PAGE_W / 2, PAGE_H * 0.58 + pt(34));
  return c.toDataURL("image/jpeg", 0.92);
}

// Inside-front-cover bookplate: "This book belongs to <name>" (pre-printed — a
// young child recognizing their own name is a small reading win), plus an optional
// gift message from the giver. The warmest page in the book, and near-zero effort.
function bookplatePage(childName: string, giftMessage: string): string {
  const { c, ctx } = newTypesetPage();
  const cx = PAGE_W / 2;
  const msg = (giftMessage || "").trim();
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `700 ${pt(13)}px ${MONTSERRAT}`;
  ctx.fillText("This book belongs to", cx, PAGE_H * 0.34);
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${pt(34)}px ${MONTSERRAT}`;
  ctx.fillText(childName || "________", cx, PAGE_H * 0.42);
  ctx.fillStyle = CARAMEL;
  ctx.fillRect(cx - pt(30), PAGE_H * 0.42 + pt(32), pt(60), pt(3));
  if (msg) {
    ctx.fillStyle = "#6b6257";
    const fs = pt(15);
    ctx.font = `italic 400 ${fs}px ${ANDIKA}`;
    let y = PAGE_H * 0.6;
    wrapText(ctx, msg, PAGE_W - SAFE * 2.4).forEach((l) => { ctx.fillText(l, cx, y); y += fs * 1.5; });
  }
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `600 ${pt(9.5)}px ${MONTSERRAT}`;
  ctx.fillText("Custom Learn to Read", cx, PAGE_H - SAFE - pt(8));
  return c.toDataURL("image/jpeg", 0.92);
}

function endPage(childName: string): string {
  const { c, ctx } = newTypesetPage();
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${pt(42)}px ${MONTSERRAT}`;
  ctx.fillText("The End", PAGE_W / 2, PAGE_H * 0.42);
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `700 ${pt(18)}px ${ANDIKA}`;
  ctx.fillText(`You did it, ${childName}!`, PAGE_W / 2, PAGE_H * 0.42 + pt(60));
  return c.toDataURL("image/jpeg", 0.92);
}

// "The End" page: reuse the character reference sheet — it already shows the
// child + the book's companion/favorite-thing (dinosaur, pet, friend) on a plain
// cream background, exactly what this page wants: just those characters, very
// little else. A warm caption sits below. No extra AI generation needed.
async function endArtPage(charB64: string, childName: string): Promise<string> {
  const { c, ctx } = newTypesetPage(); // cream ground, centered text
  const img = await loadImg("data:image/png;base64," + charB64);
  const boxTop = SAFE + pt(8), boxH = PAGE_H * 0.62, boxW = PAGE_W - SAFE * 2;
  const s = Math.min(boxW / img.width, boxH / img.height);
  const dw = img.width * s, dh = img.height * s;
  ctx.drawImage(img, (PAGE_W - dw) / 2, boxTop + (boxH - dh) / 2, dw, dh);
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${pt(40)}px ${MONTSERRAT}`;
  ctx.fillText("The End", PAGE_W / 2, PAGE_H * 0.80);
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `700 ${pt(18)}px ${ANDIKA}`;
  ctx.fillText(`You did it, ${childName || "friend"}!`, PAGE_W / 2, PAGE_H * 0.80 + pt(48));
  return c.toDataURL("image/jpeg", 0.92);
}

// Inside-back-cover "Why These Words?": parent/educator-facing. Splits the book's
// practiced words into SOUND-OUT (decodable at this level) and LEARN-BY-HEART
// (high-frequency / heart words) — the structured-literacy distinction — and
// explains WHY each word is there. Method language, not efficacy claims. The whole
// block is measured, then vertically centred, so it stays balanced no matter how
// many words each group has.
function wordsPage(soundOut: string[], heart: string[], childName: string): string {
  const { c, ctx } = newTypesetPage();
  const name = childName || "Your child";
  const cx = PAGE_W / 2, maxW = PAGE_W - SAFE * 2.1;
  const startY0 = SAFE + pt(6);

  // Lay the page out once to MEASURE, then again (offset) to DRAW it centred.
  const render = (top: number, dry: boolean): number => {
    let y = top;
    const block = (t: string, size: number, color: string, weight: string, fam: string, gapBefore: number, gapAfter: number) => {
      y += pt(gapBefore);
      ctx.font = `${weight} ${pt(size)}px ${fam}`;
      wrapText(ctx, t, maxW).forEach((l) => { y += pt(size) * 1.4; if (!dry) { ctx.fillStyle = color; ctx.fillText(l, cx, y); } });
      y += pt(gapAfter);
    };
    const wordRow = (list: string[]) => { if (list.length) block(list.join("   ·   "), 14, INKC, "700", ANDIKA, 0, 6); };

    block("Why These Words?", 20, NAVY, "800", MONTSERRAT, 12, 4);
    block("Every word in this book was chosen for a reason.", 10.5, CARAMEL_DARK, "700", ANDIKA, 0, 8);
    if (soundOut.length) {
      block("Words to sound out", 10.5, CARAMEL_DARK, "700", MONTSERRAT, 6, 2);
      wordRow(soundOut);
      block(`These are decodable words. ${name} can read them by applying the letter-sound patterns they have already learned — not by guessing.`, 9.5, "#5f5952", "400", ANDIKA, 0, 6);
    }
    if (heart.length) {
      block("Words to learn by heart", 10.5, CARAMEL_DARK, "700", MONTSERRAT, 6, 2);
      wordRow(heart);
      block("These are high-frequency words that appear often in children's books. Many can still be sounded out, while a few contain an unexpected spelling that readers learn through repeated reading.", 9.5, "#5f5952", "400", ANDIKA, 0, 8);
    }
    block("A child's name, favorite interests, and a handful of carefully chosen story words make each book personal and engaging while keeping the text overwhelmingly decodable.", 9.5, "#5f5952", "400", ANDIKA, 0, 6);
    block("Children become confident readers when they practice books that match what they have been taught — so nearly every word here can be decoded using the phonics skills at this reading level.", 9.5, "#5f5952", "400", ANDIKA, 0, 8);
    block("The illustrations support understanding — but the words do the reading.", 10, "#6b6257", "italic 400", ANDIKA, 0, 12);
    block("Informed by the science of reading", 10.5, NAVY, "700", MONTSERRAT, 4, 4);
    block("Structured literacy • Systematic phonics • Decodable text • High-frequency word practice", 8.5, CARAMEL_DARK, "700", MONTSERRAT, 0, 8);
    block("Because every child deserves books that are both joyful and instructionally meaningful.", 9, "#8c8478", "italic 400", ANDIKA, 0, 0);
    return y;
  };

  const contentH = render(startY0, true) - startY0;
  const usableH = (PAGE_H - SAFE) - startY0;
  const offset = Math.max(0, (usableH - contentH) / 2);
  render(startY0 + offset, false);
  return c.toDataURL("image/jpeg", 0.92);
}

function drawingPage(): string {
  const { c, ctx } = newTypesetPage();
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `700 ${pt(15)}px ${ANDIKA}`;
  ctx.fillText("My drawing", PAGE_W / 2, SAFE + pt(30));
  ctx.strokeStyle = CARAMEL; ctx.lineWidth = pt(2);
  const x = PAGE_W * 0.12, y = SAFE + pt(60), w = PAGE_W * 0.76, h = PAGE_H - SAFE - pt(30) - y;
  ctx.beginPath();
  if ((ctx as any).roundRect) (ctx as any).roundRect(x, y, w, h, pt(10)); else ctx.rect(x, y, w, h);
  ctx.stroke();
  return c.toDataURL("image/jpeg", 0.92);
}

// Back cover: just the Custom Learn to Read wordmark, small and centered — no
// title, no child name. (Swap in an image logo asset here later if desired.)
function backCoverPage(): string {
  const { c, ctx } = newTypesetPage();
  ctx.fillStyle = NAVY;
  ctx.font = `800 ${pt(15)}px ${MONTSERRAT}`;
  ctx.fillText("Custom Learn to Read", PAGE_W / 2, PAGE_H / 2 - pt(6));
  ctx.fillStyle = CARAMEL;
  ctx.fillRect(PAGE_W / 2 - pt(22), PAGE_H / 2 + pt(9), pt(44), pt(2.5));
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `600 ${pt(9)}px ${MONTSERRAT}`;
  ctx.fillText("customlearntoread.com", PAGE_W / 2, PAGE_H / 2 + pt(28));
  return c.toDataURL("image/jpeg", 0.92);
}

// Printer wraparound softcover cover: back panel + spine (sized to page count) + front cover, with barcode zone.
async function buildCoverWrap(coverDataUrl: string, title: string, childName: string, interiorPages: number): Promise<{ dataUrl: string; wPt: number; hPt: number }> {
  const BLEED_PX = Math.round(0.125 * DPI);
  const spineIn = interiorPages * SPINE_IN_PER_PAGE;
  const wIn = 2 * 0.125 + 2 * 5.5 + spineIn;
  const wPx = Math.round(wIn * DPI), hPx = PAGE_H;
  const c = document.createElement("canvas"); c.width = wPx; c.height = hPx;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = true; (ctx as any).imageSmoothingQuality = "high";
  ctx.fillStyle = CREAMC; ctx.fillRect(0, 0, wPx, hPx);

  const backW = BLEED_PX + Math.round(5.5 * DPI); // back panel incl. its outer bleed
  const spinePx = Math.round(spineIn * DPI);
  ctx.fillStyle = CARAMEL; ctx.fillRect(backW, 0, spinePx, hPx); // spine — too thin for text at these counts

  // Front cover art on the right (crop the composite's left bleed so it doesn't invade the spine).
  const img = await loadImg(coverDataUrl);
  const sx = BLEED_PX * (img.width / PAGE_W);
  ctx.drawImage(img, sx, 0, img.width - sx, img.height, backW + spinePx, 0, PAGE_W - BLEED_PX, PAGE_H);

  // Back panel typography (brand: Montserrat/navy + Andika/caramel).
  const cx = BLEED_PX + Math.round((5.5 * DPI) / 2);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = NAVY;
  const fs = pt(24);
  ctx.font = `800 ${fs}px ${MONTSERRAT}`;
  const lines = wrapText(ctx, title, 5.5 * DPI * 0.7);
  const lh = fs * 1.28;
  const cy = hPx * 0.34 - ((lines.length - 1) * lh) / 2;
  lines.forEach((l, i) => ctx.fillText(l, cx, cy + i * lh));
  ctx.fillStyle = CARAMEL_DARK;
  ctx.font = `700 ${pt(14)}px ${ANDIKA}`;
  ctx.fillText(`A book made just for ${childName}`, cx, cy + lines.length * lh + pt(38));
  ctx.font = `600 ${pt(10)}px ${MONTSERRAT}`;
  ctx.fillText("customlearntoread.com", cx, hPx - SAFE - pt(40));

  // Reserved barcode zone: 2" × 1.2" white, 0.25" inside the back-panel trim, spine side.
  const bw = 2 * DPI, bh = 1.2 * DPI, m = 0.25 * DPI;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(backW - m - bw, hPx - BLEED_PX - m - bh, bw, bh);

  return { dataUrl: c.toDataURL("image/jpeg", 0.92), wPt: wIn * 72, hPt: 8.75 * 72 };
}

/** Shrink a base64 image for use as a generation/QA reference (keeps request bodies small). */
async function refJpeg(b64: string, w = 900): Promise<string> {
  const d = await downscale("data:image/png;base64," + b64, w, 0.82);
  return d.split(",")[1];
}

export default function CreateClient({ initialOrders, loadError }: { initialOrders: AirtableOrder[]; loadError: string | null }) {
  const params = useSearchParams();
  const [selectedId, setSelectedId] = useState(params.get("recordId") || "");
  const [pageCount, setPageCount] = useState(16);
  const [levelId, setLevelId] = useState("");
  const [emotionalGoal, setEmotionalGoal] = useState("");
  const [mustUseWords, setMustUseWords] = useState("");
  const [avoidWords, setAvoidWords] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [check, setCheck] = useState<Check | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [order, setOrder] = useState<unknown>(null);
  const [saved, setSaved] = useState("");
  const [note, setNote] = useState("");

  // Phase 2: art + assembly + delivery
  const [charRef, setCharRef] = useState("");
  const [photoB64, setPhotoB64] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const [arts, setArts] = useState<Record<number, { img: string; qa?: ArtQA; accepted?: boolean }>>({});
  const [artBusy, setArtBusy] = useState("");
  const [assembling, setAssembling] = useState("");
  const [pdfUrl, setPdfUrl] = useState(""); // customer home-print PDF (trim size)
  const [printUrls, setPrintUrls] = useState<{ interior: string; cover: string } | null>(null); // printer-ready files
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [pageLabels, setPageLabels] = useState<string[]>([]);
  const [parentEmail, setParentEmail] = useState("");
  const [delivered, setDelivered] = useState<{ bookLink: string; pdfLink: string } | null>(null);
  const pdfBlobRef = useRef<Blob | null>(null);

  const candidates = useMemo(
    () => initialOrders.filter((o) => ["Paid", "Designing"].includes(field(o, "Status"))),
    [initialOrders],
  );
  const selected = candidates.find((o) => o.id === selectedId) || initialOrders.find((o) => o.id === selectedId);
  // Digital-only orders don't need print resolution — save cost with 2K; every
  // physical format gets 4K so print art is downscaled to 300 DPI, never upscaled.
  const digitalOnly = !!selected && field(selected, "Product") === "Digital Book";
  const artImageSize = digitalOnly ? "2K" : "4K";
  // Parent Read-Along Lines: auto-checked when the order carries the flag (an
  // "Parent read-along" = "Yes" Airtable field), and operator-toggleable.
  const [readAlong, setReadAlong] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  useEffect(() => {
    setReadAlong(!!selected && field(selected, "Parent read-along") === "Yes");
    setGiftMessage((selected && field(selected, "Gift message")) || "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetAll() {
    setDraft(null); setGrade(null); setCheck(null); setSaved("");
    setCharRef(""); setArts({}); setPdfUrl(""); setPrintUrls(null); setPageImages([]); setPageLabels([]); setDelivered(null);
  }

  async function generate() {
    if (!selectedId) return;
    setError(""); resetAll();
    try {
      setBusy("Writing the story…");
      const g = await story({ action: "generate", recordId: selectedId, pageCount, levelId: levelId || undefined, emotionalGoal: emotionalGoal || undefined, mustUseWords: mustUseWords.trim() || undefined, avoidWords: avoidWords.trim() || undefined, readAlong });
      let d: Draft = g.draft; let c: Check = g.check;
      setDraft(d); setCheck(c); setOrder(g.order); setParentEmail(g.parentEmail || "");
      // Retry the rules-revise a few times, re-checking each pass — one pass often
      // fixes most issues but leaves a couple; a second/third pass usually converges.
      for (let attempt = 1; attempt <= 3 && !c.pass; attempt++) {
        setBusy(`Rules check failed — revising… (pass ${attempt})`);
        const r = await story({ action: "revise", draft: d, issues: c.problems });
        d = r.draft; c = r.check; setDraft(d); setCheck(c);
      }
      setBusy("AI quality grading…");
      const q = await story({ action: "grade", draft: d, order: g.order });
      let gr: Grade = q.grade; setGrade(gr);
      if (!gr.pass && gr.issues?.length) {
        setBusy("Grader flagged issues — revising…");
        const r2 = await story({ action: "revise", draft: d, issues: gr.issues });
        d = r2.draft; setDraft(d); setCheck(r2.check);
        setBusy("Re-grading…");
        const q2 = await story({ action: "grade", draft: d, order: g.order });
        setGrade(q2.grade);
      }
      setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  async function reviseWithNote() {
    if (!draft || !note.trim()) return;
    setError("");
    try {
      setBusy("Revising with your note…");
      const r = await story({ action: "revise", draft, issues: [note.trim()] });
      setDraft(r.draft); setCheck(r.check); setNote(""); setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  async function save(approved: boolean) {
    if (!draft || !selectedId) return;
    setError("");
    try {
      setBusy("Saving to the order…");
      await story({ action: "save", recordId: selectedId, draft, approved });
      setSaved(approved ? "Story approved & saved." : "Draft saved to the order.");
      setBusy("");
    } catch (e: any) { setError(e?.message || String(e)); setBusy(""); }
  }

  const setPageText = (n: number, text: string) =>
    draft && setDraft({ ...draft, pages: draft.pages.map((p) => (p.n === n ? { ...p, text } : p)) });

  // ---------- art ----------
  async function genCharacter() {
    if (!draft) return;
    setError(""); setArtBusy("Drawing the character sheet…");
    try {
      const r = await art({ action: "character", recordId: selectedId || undefined, description: draft.characterDescription, cast: castText(draft), photo: photoB64 || undefined, imageSize: artImageSize });
      setCharRef(r.image); setArts({}); setPdfUrl(""); setPrintUrls(null); setDelivered(null);
    } catch (e: any) { setError(e?.message || String(e)); }
    setArtBusy("");
  }

  // QA is NOT optional: transient API failures are retried, and if QA still can't
  // run, the tile is marked unverified (?) and blocks assembly like a failure —
  // unverified pages were the #1 source of consistency bugs shipping to customers.
  async function qaCheck(image: string, pageText: string, characterDescription: string, artPrompt?: string): Promise<ArtQA | undefined> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const [img, styleRef] = await Promise.all([refJpeg(image, 1200), refJpeg(charRef, 800)]);
        return (await art({ action: "check", image: img, styleRef, pageText, characterDescription, cast: castText(draft), artPrompt })).verdict;
      } catch { await new Promise((r) => setTimeout(r, 3000)); }
    }
    return undefined; // QA unavailable — tile shows "?" and blocks until Redo or Use anyway
  }

  async function genOnePage(n: number) {
    if (!draft || !charRef) return;
    const page = n === 0
      ? { n: 0, text: draft.title, artPrompt: draft.coverArtPrompt }
      : draft.pages.find((p) => p.n === n)!;
    // Refs: character sheet first, then up to 2 already-passing pages as style
    // anchors so every page matches both the character AND the book's style.
    const anchors = Object.entries(arts)
      .filter(([k, v]) => Number(k) !== n && Number(k) !== 0 && v.qa?.pass)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .slice(-2)
      .map(([, v]) => v.img);
    const refs = await Promise.all([charRef, ...anchors].slice(0, 3).map((b) => refJpeg(b)));
    // Up to 3 attempts: regenerate with the QA issues as fix notes until QA passes.
    let img = "", qa: ArtQA | undefined, notes = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await art({ action: "page", recordId: selectedId || undefined, artPrompt: page.artPrompt, pageText: page.text, characterDescription: draft.characterDescription, cast: castText(draft), refs, fixNotes: notes || undefined, imageSize: artImageSize });
      img = r.image;
      qa = await qaCheck(img, page.text, draft.characterDescription, page.artPrompt);
      if (!qa || qa.pass || !qa.issues?.length) break;
      notes = qa.issues.join("; ");
    }
    setArts((a) => ({ ...a, [n]: { img, qa } }));
  }

  async function genAllArt() {
    if (!draft || !charRef) return;
    setError(""); setPdfUrl(""); setPrintUrls(null); setDelivered(null);
    const already = { ...arts }; // skip pages finished in a previous run
    const targets = [0, ...draft.pages.map((p) => p.n)].filter((n) => !already[n]);
    const failed: number[] = [];
    for (const n of targets) {
      const label = n === 0 ? "the cover" : `page ${n} of ${draft.pages.length}`;
      let ok = false;
      for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        setArtBusy(`Illustrating ${label}${attempt > 1 ? " (retry)" : ""}…`);
        try { await genOnePage(n); ok = true; }
        catch { if (attempt < 2) await new Promise((r) => setTimeout(r, 4000)); }
      }
      if (!ok) failed.push(n); // keep going — Redo buttons handle stragglers
    }
    setArtBusy("");
    if (failed.length) setError(`Couldn't illustrate: ${failed.map((n) => (n === 0 ? "cover" : "page " + n)).join(", ")} — hit Redo on those tiles.`);
  }

  async function redoOne(n: number) {
    setError(""); setArtBusy(n === 0 ? "Redoing the cover…" : `Redoing page ${n}…`);
    try { await genOnePage(n); } catch (e: any) { setError(e?.message || String(e)); }
    setArtBusy("");
  }

  // ---------- assembly + delivery ----------
  // A tile is done ONLY when it has art AND its QA ran and passed (or the admin
  // explicitly accepted it). Failed OR missing QA blocks assembly — a page that
  // was never verified must not ship just because the checker errored.
  const tileOk = (a?: { img: string; qa?: ArtQA; accepted?: boolean }) => !!a && ((a.qa?.pass ?? false) || !!a.accepted);
  const allTiles = [0, ...(draft?.pages.map((p) => p.n) || [])];
  const artDone = draft && charRef && allTiles.every((n) => tileOk(arts[n]));
  const artBlocked = draft && charRef && allTiles.every((n) => arts[n]) && !artDone;

  async function ensurePdfLib() {
    if ((window as any).PDFLib) return;
    await new Promise<void>((res, rej) => {
      const s = document.createElement("script");
      s.src = "/flipbook/pdf-lib.min.js";
      s.onload = () => res(); s.onerror = () => rej(new Error("pdf-lib failed to load"));
      document.head.appendChild(s);
    });
  }

  async function imagesToPdf(PDFDocument: any, imgs: string[], pagePt: [number, number], drawBox: { x: number; y: number; width: number; height: number }): Promise<Blob> {
    const doc = await PDFDocument.create();
    for (const dURL of imgs) {
      const jpg = await doc.embedJpg(await fetch(dURL).then((r) => r.arrayBuffer()));
      const page = doc.addPage([...pagePt]);
      page.drawImage(jpg, drawBox);
    }
    return new Blob([await doc.save()], { type: "application/pdf" });
  }

  async function assemble() {
    if (!draft) return;
    setError(""); setDelivered(null);
    // Print pre-flight: for physical books, no art may be upscaled below the
    // full-bleed print size (that's how soft, sub-300-DPI pages shipped before).
    if (!digitalOnly) {
      const soft: string[] = [];
      for (const n of [0, ...draft.pages.map((p) => p.n)]) {
        const a = arts[n];
        if (!a?.img) continue;
        const { w, h } = await imgDims(a.img);
        if (Math.max(PAGE_W / w, PAGE_H / h) > 1.02) soft.push(n === 0 ? "cover" : `page ${n}`);
      }
      if (soft.length) {
        setError(`Low-resolution art for print (would upscale below 300 DPI): ${soft.join(", ")}. Regenerate these at 4K before assembling a printed book.`);
        return;
      }
    }
    try {
      setAssembling("Typesetting pages…");
      await ensureBookFonts();
      // Size the text band to THIS book's wordiest page, then use that same cutoff
      // on every page (varies by book, never by page — so cutoffs line up in the book).
      const mctx = document.createElement("canvas").getContext("2d")!;
      mctx.font = `700 ${pt(36)}px Andika, "Comic Sans MS", system-ui, sans-serif`;
      let maxLines = 1;
      for (const p of draft.pages) maxLines = Math.max(maxLines, wrapText(mctx, p.text, PAGE_W - SAFE * 2).length);
      const hasReadAlong = draft.pages.some((p) => p.adultLine && p.adultLine.trim());
      let maxAdult = 0;
      if (hasReadAlong) {
        mctx.font = `italic 400 ${pt(19)}px Andika, "Comic Sans MS", system-ui, sans-serif`;
        for (const p of draft.pages) if (p.adultLine) maxAdult = Math.max(maxAdult, wrapText(mctx, p.adultLine, PAGE_W - SAFE * 2).length);
      }
      const bandTop = interiorBandTop(maxLines, maxAdult);
      const cover = await compositePage(arts[0].img, draft.title, 0, true, bandTop);
      const story: string[] = [];
      for (const p of draft.pages) story.push(await compositePage(arts[p.n].img, p.text, p.n, false, bandTop, p.adultLine));
      // "Words in This Book" lists only the PATTERN words the book actually teaches
      // (repeated backbone) — never the child's name, topic-cluster words, or one-off
      // story words. Same source as the QA validator, so the two can't disagree.
      const bookLevel = LEVELS.find((l) => l.id === draft.levelId) || LEVELS[0];
      const vocab = patternWords(draft, bookLevel);
      const soundOut = vocab.filter((w) => wordKind(w, bookLevel) === "sound-out");
      const heartWds = vocab.filter((w) => wordKind(w, bookLevel) === "heart");

      // Interior (what gets bound): front matter + story + back matter, padded
      // to an even count and the perfect-bound minimum of MIN_INTERIOR pages.
      // No title page and no dedication (by design — nothing per-book to fill in).
      const front = [bookplatePage(draft.childName, giftMessage), ...(hasReadAlong ? [readAlongKeyPage()] : [])];
      const back = [charRef ? await endArtPage(charRef, draft.childName) : endPage(draft.childName), wordsPage(soundOut, heartWds, draft.childName)];
      const interior = [...front, ...story, ...back];
      while (interior.length < MIN_INTERIOR || interior.length % 2 !== 0) interior.push(drawingPage());

      // Digital book (flipbook + customer home-print PDF): cover→back cover, no pad pages.
      const digital = [cover, ...front, ...story, ...back, backCoverPage()];
      const labels = ["Cover", "Bookplate", ...(hasReadAlong ? ["Read-along key"] : []), ...draft.pages.map((p) => `Page ${p.n}`), "The End", "Why These Words?", "Back cover"];
      setPageImages(digital); setPageLabels(labels);

      setAssembling("Building the PDFs…");
      await ensurePdfLib();
      const { PDFDocument } = (window as any).PDFLib;
      // 1) Customer home-print PDF: trim size (5.5 × 8.5), bleed cropped off.
      const homeBlob = await imagesToPdf(PDFDocument, digital, [HOME_PT_W, HOME_PT_H], { x: -BLEED_OFF_PT, y: -BLEED_OFF_PT, width: TRIM_PT_W, height: TRIM_PT_H });
      // 2) Printer interior: full bleed size (5.75 × 8.75), no cover, even count ≥ MIN_INTERIOR.
      const interiorBlob = await imagesToPdf(PDFDocument, interior, [TRIM_PT_W, TRIM_PT_H], { x: 0, y: 0, width: TRIM_PT_W, height: TRIM_PT_H });
      // 3) Printer wraparound cover: back + spine (sized to page count) + front, with barcode zone.
      setAssembling("Building the wraparound cover…");
      const wrap = await buildCoverWrap(cover, draft.title, draft.childName, interior.length);
      const coverDoc = await PDFDocument.create();
      const wrapJpg = await coverDoc.embedJpg(await fetch(wrap.dataUrl).then((r) => r.arrayBuffer()));
      const coverPage = coverDoc.addPage([wrap.wPt, wrap.hPt]);
      coverPage.drawImage(wrapJpg, { x: 0, y: 0, width: wrap.wPt, height: wrap.hPt });
      const coverBlob = new Blob([await coverDoc.save()], { type: "application/pdf" });

      pdfBlobRef.current = homeBlob;
      setPdfUrl(URL.createObjectURL(homeBlob));
      setPrintUrls({ interior: URL.createObjectURL(interiorBlob), cover: URL.createObjectURL(coverBlob) });
      setAssembling("");
    } catch (e: any) { setError(e?.message || String(e)); setAssembling(""); }
  }

  async function deliverNow() {
    if (!draft || !pdfBlobRef.current || !pageImages.length) return;
    if (!/.+@.+\..+/.test(parentEmail)) { setError("Enter the customer's email."); return; }
    setError("");
    try {
      const token = `${slugify(draft.childName) || "book"}-${newToken()}`;
      setAssembling("Building the flipbook…");
      const tplRes = await fetch("/flipbook/template.html");
      if (!tplRes.ok) throw new Error("Couldn't load flipbook template");
      const template = await tplRes.text();
      // The print PDF keeps full resolution; the flipbook gets a lighter copy
      // so the page loads fast on phones.
      const flipPages = [];
      for (const d of pageImages) flipPages.push(await downscale(d, 1400, 0.8));
      const cfg = {
        title: draft.title, pageW: 1400, pageH: Math.round((PAGE_H / PAGE_W) * 1400), pages: flipPages,
        labels: pageLabels,
        pdf: { mode: "url", url: `/books/${token}.pdf`, name: `${slugify(draft.title) || "book"}.pdf` },
      };
      const html = template
        .replace("__TITLE__", draft.title.replace(/&/g, "&amp;").replace(/</g, "&lt;"))
        .replace("__CONFIG_JSON__", () => JSON.stringify(cfg).replace(/</g, "\\u003c"));
      setAssembling("Uploading the flipbook…");
      await upload(`books/${token}.html`, new Blob([html], { type: "text/html" }), { access: "public", handleUploadUrl: "/api/admin/blob", contentType: "text/html" });
      setAssembling("Uploading the print PDF…");
      await upload(`books/${token}.pdf`, pdfBlobRef.current, { access: "public", handleUploadUrl: "/api/admin/blob", contentType: "application/pdf" });
      setAssembling("Emailing the customer + updating the order…");
      const res = await api("/api/admin/deliver", { token, childName: draft.childName, bookTitle: draft.title, email: parentEmail, recordId: selectedId || undefined });
      setDelivered({ bookLink: res.bookLink, pdfLink: res.pdfLink });
      setAssembling("");
    } catch (e: any) { setError(e?.message || String(e)); setAssembling(""); }
  }

  const artTiles = draft ? [
    { n: 0, label: "Cover", text: draft.title },
    ...draft.pages.map((p) => ({ n: p.n, label: `Page ${p.n}`, text: p.text })),
  ] : [];

  return (
    <div className="crt-wrap">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="crt-top">
        <div>
          <h1>Create a book</h1>
          <p className="sub">Order → leveled story → illustrations → print PDF + flipbook → customer email. You approve at each step.</p>
        </div>
        <a className="crt-btn" href="/admin">&larr; Back to orders</a>
      </div>

      {loadError && <p className="crt-error">{loadError}</p>}

      <div className="crt-card">
        <h2>1 · Order</h2>
        <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); resetAll(); }}>
          <option value="">Choose an order…</option>
          {candidates.map((o) => (
            <option key={o.id} value={o.id}>
              {field(o, "Child name") || "?"} — {field(o, "Product")} — {field(o, "Status")}
            </option>
          ))}
        </select>
        {selected && (
          <p className="hint">
            {field(selected, "Child name")}, age {field(selected, "Age") || "?"} · {field(selected, "Reading level") || "level not set"} · loves: {[field(selected, "Theme 1"), field(selected, "Theme 2"), field(selected, "Theme 3")].filter(Boolean).join(", ") || "—"}
          </p>
        )}
        {selected && field(selected, "Reading feedback") && (
          <p className="crt-note">
            Last book feedback: <strong>{field(selected, "Reading feedback")}</strong>
            {field(selected, "Reading feedback") === "Too hard" && " — consider an easier level below."}
            {field(selected, "Reading feedback") === "Too easy" && " — consider a harder level below."}
          </p>
        )}
        <div className="crt-row">
          <label>Story pages
            <input type="number" min={4} max={24} value={pageCount} onChange={(e) => setPageCount(parseInt(e.target.value, 10) || 16)} />
          </label>
          <label>Level override (optional)
            <select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
              <option value="">Use order / age</option>
              <option value="tiny">Tiny Reader — 1-3 words a page</option>
              <option value="beginner">Beginner Reader — 3-6 words a page</option>
              <option value="growing">Growing Reader — one fuller sentence a page</option>
              <option value="confident">Confident Reader — short paragraph a page</option>
            </select>
          </label>
        </div>
        <div className="crt-row">
          <label>Emotional goal (optional)
            <select value={emotionalGoal} onChange={(e) => setEmotionalGoal(e.target.value)}>
              <option value="">Let the engine pick</option>
              <option>Confidence</option>
              <option>Friendship</option>
              <option>Kindness</option>
              <option>Trying Something New</option>
              <option>Teamwork</option>
              <option>Courage</option>
            </select>
          </label>
          <label>Must-use words (optional)
            <input value={mustUseWords} onChange={(e) => setMustUseWords(e.target.value)} placeholder="hop, dog, big" />
          </label>
          <label>Words to avoid (optional)
            <input value={avoidWords} onChange={(e) => setAvoidWords(e.target.value)} placeholder="scary, monster" />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={readAlong} onChange={(e) => setReadAlong(e.target.checked)} style={{ width: "auto" }} />
            Parent Read-Along Lines {selected && field(selected, "Parent read-along") === "Yes" ? "(ordered)" : "(add grown-up read-aloud line)"}
          </label>
        </div>
        <div className="crt-row">
          <label style={{ flex: 1 }}>Gift message (optional — prints on the inside front cover)
            <input value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="To Reeva — love, Grandma" />
          </label>
        </div>
        <button className="crt-btn crt-primary" disabled={!selectedId || !!busy} onClick={generate}>
          {busy || (draft ? "Regenerate from scratch" : "Generate story draft")}
        </button>
      </div>

      {draft && (
        <div className="crt-card">
          <h2>2 · Story — “{draft.title}”</h2>
          <div className="crt-badges">
            {check && <span className={"badge " + (check.pass ? "ok" : "bad")}>{check.pass ? "✓ Level rules pass" : `✗ ${check.problems.length} rule issue(s)`}</span>}
            {grade && <span className={"badge " + (grade.pass ? "ok" : "bad")}>{grade.pass ? `✓ QA grade ${grade.score}/10` : `✗ QA grade ${grade.score}/10`}</span>}
            <span className="badge">{check?.stats.totalWords ?? "?"} words · {draft.pages.length} pages</span>
          </div>
          {check && !check.pass && <ul className="crt-issues">{check.problems.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {check && check.warnings && check.warnings.length > 0 && <ul className="crt-warnings">{check.warnings.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {grade && !grade.pass && <ul className="crt-issues">{grade.issues.map((p, i) => <li key={i}>{p}</li>)}</ul>}
          {grade?.praise && <p className="hint">“{grade.praise}”</p>}
          <div className="crt-pages">
            {draft.pages.map((p) => (
              <div className="crt-page" key={p.n}>
                <div className="pn">Page {p.n}</div>
                <textarea value={p.text} onChange={(e) => setPageText(p.n, e.target.value)} rows={2} />
                <details><summary>Art direction</summary><p>{p.artPrompt}</p></details>
              </div>
            ))}
          </div>
          <div className="crt-revise">
            <input placeholder="Ask for a change… e.g. 'make page 3 about her dog Biscuit'" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="crt-btn" disabled={!note.trim() || !!busy} onClick={reviseWithNote}>Revise</button>
          </div>
          <div className="crt-actions">
            <button className="crt-btn" disabled={!!busy} onClick={() => save(false)}>Save draft</button>
            <button className="crt-btn" disabled={!!busy} onClick={() => save(true)}>Approve story ✓</button>
          </div>
          {saved && <p className="crt-saved">{saved}</p>}
        </div>
      )}

      {draft && (
        <div className="crt-card">
          <h2>3 · Illustrations</h2>
          <input ref={photoInput} type="file" accept="image/jpeg,image/png" style={{ display: "none" }} onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhotoB64(await fileToJpegB64(f)); }} />
          {photoB64 ? (
            <p className="hint">✓ Reference photo attached — the character (and any pet in the photo) will be drawn from it, stylized, never photorealistic.{" "}
              <button className="crt-btn tsmall" onClick={() => setPhotoB64("")}>Remove</button></p>
          ) : (
            <p className="hint">Optional: <button className="crt-btn tsmall" onClick={() => photoInput.current?.click()}>Attach a reference photo</button> of the child (and pet) — the character sheet will match it. JPG or PNG.</p>
          )}
          {!charRef ? (
            <>
              <p className="hint">First, a character sheet locks {draft.childName}&rsquo;s look so every page matches.</p>
              <button className="crt-btn crt-primary" disabled={!!artBusy} onClick={genCharacter}>{artBusy || "Draw character sheet"}</button>
            </>
          ) : (
            <>
              <div className="crt-char">
                <img src={"data:image/png;base64," + charRef} alt="Character sheet" />
                <div>
                  <p className="hint">{draft.characterDescription}</p>
                  <div className="crt-actions" style={{ justifyContent: "flex-start" }}>
                    <button className="crt-btn" disabled={!!artBusy} onClick={genCharacter}>Redraw character</button>
                    <button className="crt-btn crt-primary" disabled={!!artBusy} onClick={genAllArt}>
                      {artBusy || (Object.keys(arts).length ? "Regenerate all pages" : `Illustrate cover + ${draft.pages.length} pages`)}
                    </button>
                  </div>
                </div>
              </div>
              {Object.keys(arts).length > 0 && (
                <div className="crt-grid">
                  {artTiles.map((t) => {
                    const a = arts[t.n];
                    return (
                      <div className="crt-tile" key={t.n}>
                        <div className="tlabel">{t.label} {a ? (a.qa ? (a.qa.pass ? "✓" : "⚠") : "?") : ""}</div>
                        {a ? <img src={"data:image/png;base64," + a.img} alt={t.label} /> : <div className="tempty">…</div>}
                        {a?.qa && !a.qa.pass && !a.accepted && <p className="tissue">{a.qa.issues.join("; ")}</p>}
                        {a && !a.qa && !a.accepted && <p className="tissue">QA couldn&rsquo;t verify this page — Redo it or Use anyway.</p>}
                        {a?.accepted && <p className="hint">accepted despite QA</p>}
                        <button className="crt-btn tsmall" disabled={!!artBusy} onClick={() => redoOne(t.n)}>Redo</button>
                        {a && !a.accepted && (!a.qa || !a.qa.pass) && (
                          <button className="crt-btn tsmall" disabled={!!artBusy} onClick={() => setArts((s) => ({ ...s, [t.n]: { ...s[t.n], accepted: true } }))}>Use anyway</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {artBlocked && (
        <div className="crt-card">
          <h2>4 · Assemble &amp; deliver</h2>
          <p className="crt-error">Some illustrations failed QA (⚠) or couldn&rsquo;t be verified (?). Redo them or press &ldquo;Use anyway&rdquo; to unblock assembly.</p>
        </div>
      )}
      {artDone && (
        <div className="crt-card">
          <h2>4 · Assemble &amp; deliver</h2>
          <button className="crt-btn crt-primary" disabled={!!assembling} onClick={assemble}>{assembling || (pdfUrl ? "Re-assemble book" : "Assemble book")}</button>
          {pdfUrl && (
            <>
              <iframe className="crt-preview" src={pdfUrl} title="Book preview" />
              <p>
                <a className="crt-btn" href={pdfUrl} download={(slugify(draft!.title) || "book") + ".pdf"}>Home-print PDF (5.5×8.5)</a>{" "}
                {printUrls && <a className="crt-btn" href={printUrls.interior} download={(slugify(draft!.title) || "book") + "-interior-print.pdf"}>Printer interior (bleed, 300 DPI)</a>}{" "}
                {printUrls && <a className="crt-btn" href={printUrls.cover} download={(slugify(draft!.title) || "book") + "-cover-wrap.pdf"}>Printer cover wrap (spine + barcode zone)</a>}
              </p>
              <p className="hint">Send the two printer files (not the home-print PDF) to the print shop — see docs/print-spec.md.</p>
              <div className="crt-row">
                <label>Customer email
                  <input value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="parent@example.com" />
                </label>
              </div>
              {!delivered && (
                <button className="crt-btn crt-primary" disabled={!!assembling} onClick={deliverNow}>
                  {assembling || `Send book to ${parentEmail || "customer"} ✓`}
                </button>
              )}
              {delivered && (
                <div className="crt-done">
                  <p className="big">✓ Delivered!</p>
                  <p>Book link: <a href={delivered.bookLink} target="_blank" rel="noreferrer">{delivered.bookLink}</a></p>
                  <p>Print PDF: <a href={delivered.pdfLink} target="_blank" rel="noreferrer">{delivered.pdfLink}</a></p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <p className="crt-error">{error}</p>}
    </div>
  );
}

const CSS = `
  .crt-wrap { max-width: 920px; margin: 0 auto; padding: 32px 20px 64px; color: #2f2a24; font-family: Inter, system-ui, sans-serif; }
  .crt-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .crt-top h1 { margin: 0; font-size: 1.7rem; }
  .crt-top .sub { color: #7a7164; margin: 4px 0 0; font-size: .92rem; }
  .crt-card { background: #fff; border: 1px solid #e7e0d4; border-radius: 16px; padding: 22px; margin-bottom: 16px; }
  .crt-card h2 { font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; color: #7a7164; margin: 0 0 14px; }
  .crt-card select, .crt-card input, .crt-card textarea { width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: .95rem; border: 1.5px solid #e0d8c8; border-radius: 10px; background: #fffdf8; font-family: inherit; }
  .crt-row { display: flex; gap: 14px; margin: 12px 0; } .crt-row label { flex: 1; font-size: .82rem; font-weight: 700; }
  .crt-row input, .crt-row select { margin-top: 5px; }
  .crt-btn { border: 1px solid #e7e0d4; background: #fff; color: #2f2a24; border-radius: 999px; padding: 10px 18px; font-weight: 700; font-size: .92rem; cursor: pointer; text-decoration: none; display: inline-block; font-family: inherit; }
  .crt-primary { background: #f5b78d; border-color: #f5b78d; color: #4a3520; }
  .crt-btn:disabled { opacity: .55; cursor: not-allowed; }
  .crt-badges { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
  .badge { font-size: .78rem; font-weight: 700; padding: 5px 11px; border-radius: 999px; background: #f6f0e4; }
  .badge.ok { background: #e3efdd; color: #2f5e38; } .badge.bad { background: #f7e0dd; color: #8c2f25; }
  .crt-issues { margin: 8px 0; padding-left: 20px; font-size: .85rem; color: #8c2f25; }
  .crt-warnings { margin: 8px 0; padding-left: 20px; font-size: .82rem; color: #8c5b37; }
  .crt-note { margin: 6px 0 0; font-size: .85rem; color: #b96e3c; background: #fff3e6; border-radius: 8px; padding: 8px 12px; }
  .crt-pages { display: flex; flex-direction: column; gap: 10px; margin: 14px 0; }
  .crt-page { border: 1px solid #efe8da; border-radius: 12px; padding: 10px 12px; background: #fffdf8; }
  .crt-page .pn { font-size: .72rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; color: #b96e3c; margin-bottom: 6px; }
  .crt-page textarea { border: none; background: transparent; padding: 0; font-size: 1rem; resize: vertical; }
  .crt-page details { font-size: .82rem; color: #7a7164; margin-top: 6px; } .crt-page summary { cursor: pointer; font-weight: 600; }
  .crt-revise { display: flex; gap: 10px; margin: 12px 0; } .crt-revise input { flex: 1; }
  .crt-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
  .crt-saved { color: #2f5e38; font-weight: 700; }
  .crt-error { color: #b3261e; font-weight: 600; }
  .hint { font-size: .84rem; color: #7a7164; }
  .crt-char { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 14px; }
  .crt-char img { width: 140px; border-radius: 10px; box-shadow: 0 3px 10px rgba(47,42,36,.18); }
  .crt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; margin-top: 14px; }
  .crt-tile { text-align: center; }
  .crt-tile img { width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(47,42,36,.15); }
  .crt-tile .tlabel { font-size: .74rem; font-weight: 800; color: #7a7164; margin-bottom: 4px; }
  .crt-tile .tissue { font-size: .7rem; color: #8c2f25; }
  .crt-tile .tsmall { padding: 4px 12px; font-size: .76rem; margin-top: 4px; }
  .tempty { height: 180px; background: #f6f0e4; border-radius: 8px; }
  .crt-preview { width: 100%; height: 560px; border: 1px solid #e7e0d4; border-radius: 12px; margin: 14px 0; background: #fff; }
  .crt-done .big { color: #2f5e38; font-weight: 800; font-size: 1.05rem; }
  .crt-done a { color: #b96e3c; word-break: break-all; }
  @media (max-width: 640px) { .crt-row, .crt-char { flex-direction: column; } }
`;
