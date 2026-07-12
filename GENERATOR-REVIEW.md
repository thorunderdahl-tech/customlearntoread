# Book Generator Review — July 1, 2026

Scope: story pipeline (`lib/story.ts`, `lib/leveling.ts`, `lib/llm.ts`), art pipeline (`lib/gemini.ts`, `app/api/admin/art`), assembly/delivery (`app/admin/create/CreateClient.tsx`, `app/api/admin/deliver`, `public/flipbook/template.html`).

## Headline finding: the requirement docs don't exist in the repo

There is no brand guide, illustration requirements doc, reading-level requirements doc, or softcover printing requirements doc anywhere in the project. The only "requirements" are fragments embedded in code: a one-paragraph `STYLE` constant in the art route, the level rules in `lib/leveling.ts`, and hardcoded numbers in `compositePage()`. If these documents were written, they were never committed. This matters: the generator can only enforce guardrails that are written down, and several print-critical rules (bleed, DPI, safe margins, spine/cover specs) are enforced nowhere.

---

## 1. Print PDF — does NOT meet softcover printing requirements

**Resolution is 293 DPI, not 300.** `compositePage()` renders 1614 × 2494 px onto a 5.5 × 8.5 in page: 1614 / 5.5 = 293.5 DPI. It fails the 300 DPI floor — most printers flag anything under 300. Fix: render at 1650 × 2550 (trim) or larger with bleed.

**Effective art resolution is far lower (~180–190 DPI).** Gemini's 2:3 output is roughly 832–1024 px wide; the canvas upscales it ~1.6–2× to 1614 px. The pixels say 293 DPI but the optical detail is ~180 DPI — this is very likely a big part of why printed illustrations look soft/muddy ("not up to par"). Fix: request the largest model output available and add an upscale pass (e.g., Real-ESRGAN or a hosted upscaler) before compositing.

**No bleed.** Pages are exactly trim size (396 × 612 pt) with full-bleed art. Every POD printer (KDP, Lulu, IngramSpark) requires 0.125 in bleed — page should be 5.75 × 8.75 in (414 × 630 pt) with art extended to the bleed edge. As-is, trimming variance will leave white slivers on edges.

**Safe-margin violation.** The page number is drawn ~0.15 in from the bottom edge; printers require ≥ 0.25 in (0.375 in with bleed shift). Page numbers will randomly get trimmed off.

**No separate cover file, no spine, no back cover.** Softcover printing needs a one-piece wraparound cover PDF: back + spine + front, spine width computed from page count × paper thickness, with its own bleed and barcode zone. The pipeline embeds the front cover as page 1 of the interior and never generates a back cover at all. (The flipbook even labels the last story page "Back cover" — a mislabel, since none exists.)

**Interior page count is invalid.** Default book = cover + 20 pages = 21 PDF pages (odd — impossible to bind). Perfect-bound minimums: KDP 24, Lulu 32. The generator allows as few as 4 pages. Also missing: title page, copyright page, "This book belongs to" page — standard for a premium product and helpful for hitting page minimums.

**Color/format.** RGB JPEG at quality 0.86. Fine for KDP (auto-converts), but offset/pro printers want CMYK with an embedded ICC profile; JPEG artifacts at 0.86 are visible in flat color areas — use 0.92+ or PNG for print.

**One PDF serves two masters.** The same file is the customer's "printable PDF" and the would-be printer file. They should diverge: a home-print PDF (trim size, no bleed — what exists today is close) and a printer-ready package (bleed interior + wraparound cover).

Note: `public/books/emma-sample.pdf` is from an older path — 1009 × 1559 pt pages (14 × 21.6 in!) at 72 DPI. Don't send anything from that vintage to a printer.

## 2. Virtual flipbook — solid, minor fixes

The page-flip engine, sizing, keyboard nav, fullscreen, and lazy PDF link all work. Issues: (a) "Back cover" label bug above; (b) images downscaled to 1000 px wide is a bit soft on tablets/desktop fullscreen — 1400 px at q0.8 is a better tradeoff; (c) no download-protection expectations to the customer either way — fine, just noting the blob URLs are public-if-known.

## 3. Illustrations — why they're not up to par, and missing guardrails

Root causes, in order of impact:

1. **Low source resolution** (see above) — upscaled art prints soft.
2. **No pinned art style.** The `STYLE` prompt is adjectives ("warm, premium, modern… bright rich colors, soft friendly shapes") with no medium, line treatment, or palette. Gemini interprets that differently page to page → style drift across the book. A real illustration spec should pin: rendering medium (e.g., "flat gouache textures with soft grain, no gradients-only rendering"), line quality, a 6–8 hex color palette, lighting rule, and level of background detail.
3. **Weak character-consistency mechanism.** Each page gets only the character sheet (1 ref) + a text description. The API accepts 3 refs but only 1 is ever passed. Better: pass the character sheet + 1–2 already-approved pages so both character AND style anchor each generation.
4. **Thin art direction per page.** `artPrompt` is one sentence from the story model. No composition, camera angle, or emotion vocabulary. Add an art-direction expansion pass before generation.
5. **QA gaps.** The vision check verifies character match, scene match, no text, no anatomy errors — good — but never checks: composition (subject in upper two-thirds, bottom band clear), style consistency with the character sheet/previous pages, or palette adherence. Only one retry, and QA failures don't block assembly — a ⚠ page can ship.
6. **Prompt/layout mismatch.** The prompt reserves the "bottom quarter" for the text band, but the band is actually 20% (16% on covers). Minor, but it means art is composed for the wrong crop.
7. **Aspect crop.** Art is generated at 2:3 (0.667) but the page is 0.647 — every image loses ~3% on the sides via cover-crop. Compose with that in mind or request the exact ratio.

Brand consistency: interior text is set in Inter bold, purple `#3b2a82`, pink `#e87dab` page numbers — none of which appear in the site palette (cream `#fff8ed`, ink `#2f2a24`, peach `#f5b78d`, gold `#f7d58b`, sage `#b8c8ad`, serif Fraunces). The books don't visually match the brand. Decide the book palette/typography deliberately and write it into the (currently nonexistent) brand guide.

## 4. Reading-level guardrails — good skeleton, enforcement gaps

What works: three-level rubric, deterministic `checkStory()` (sentence count, word count, avg word length, name-share), AI grade pass, auto-revise loop, admin override. The topic-word exemption (word on 3+ pages is being "taught") is a smart BOB-Books-style rule.

Gaps — rules stated in prompts but never checked in code:

- **No decodability check.** Tiny/Beginner promise "CVC words + common sight words," but code only checks average word length. "Yacht" (5 letters) passes where "running" might fail. Add a sight-word whitelist (Dolch pre-primer/primer) + CVC pattern check; flag anything outside it.
- **No punctuation checks.** "No commas, no dialogue, no contractions" — unenforced. Trivial to check deterministically.
- **Topic-word loophole.** ANY word repeated on 3+ pages is exempt from length rules, so a draft full of hard repeated words passes the code gate. Cap exemptions at 1–2 words per book.
- **Tense check missing.** "Present tense" is promptware only.
- Title is never leveled — a title the child can't read undercuts the premise.

## 5. Recommended priority order

1. **Print-blocking (do before selling softcovers):** bleed + 300 DPI page geometry; upscale pass on art; safe margins; wraparound cover generator with spine math; even/minimum page counts + front matter; printer-ready vs home-print PDF split.
2. **Illustration quality:** pinned style spec (write the brand guide → paste it as the `STYLE` source of truth); multi-ref generation; art-direction expansion pass; QA additions (composition + style) with hard block on failed pages.
3. **Reading levels:** deterministic decodability + punctuation checks; exemption cap.
4. **Small fixes:** flipbook "Back cover" label; 1400 px flipbook images; band % consistency in prompts.
5. **Write the four documents into the repo** (`docs/brand-guide.md`, `docs/illustration-spec.md`, `docs/reading-levels.md`, `docs/print-spec.md`) so code and prompts have a single source of truth to cite and enforce.
