# Illustration Pipeline Requirements

Mechanics of on-brand, print-quality art. The STYLE itself lives in `lib/brand.ts` (`BRAND_ART_STYLE`, distilled from the Design System — human-readable version in `BRAND.md`); this doc covers the pipeline guardrails around it.

## Resolution

- Request **2K** output from the image model (`ART_IMAGE_SIZE`, default `2K`, in `lib/gemini.ts`; falls back gracefully if a model rejects it). Page composites are 1725 × 2625 @ 300 DPI — art must not be meaningfully upscaled or it prints soft. This was the main cause of subpar printed illustrations.

## Consistency

- **Character sheet first**: one TURNAROUND reference sheet (front view + back view of the same child) locks the child's look (and cast) for the whole book — the back view pins hair length from behind and the plain back of the top. Regenerating it invalidates existing pages.
- **References on every page generation**: character sheet first (downscaled to ~1100 px so hair length and shirt graphics survive), then up to two already-QA-passed pages (~900 px) as style anchors: the EARLIEST passed page (canonical in-scene look) plus the passed page NEAREST to the one being drawn (`genOnePage` in `CreateClient.tsx`). The page prompt states the sheet outranks anchors on any character detail.
- **Character description is structured, not vibes**: the story model must pin hair color + exact length + texture, eyes, skin tone, and the outfit garment by garment with colors (`characterDescription` in `lib/story.ts`). artPrompts and the art-direction expansion are forbidden from re-describing appearance — that's the main way outfits drifted.
- **Best attempt wins**: each page gets up to 3 generation attempts with QA fix notes; the attempt with the best QA outcome is kept (previously the last attempt shipped even if a prior one was cleaner).
- **Aspect**: generated at 2:3; the bleed page is 5.75:8.75, so ~3% of each side is cropped — compose away from edges.
- **Composition**: subject and all story-critical elements in the upper two-thirds; the bottom band is reserved for reading text (band top is computed per book, clamped 58–82% of page height).

## QA gate (vision check, every page)

Checks, in `app/api/admin/art/route.ts`: character match vs sheet, **style match vs sheet**, story match, **composition (upper-two-thirds + edge clearance)**, no text in image, age-appropriateness/anatomy, happy-by-default expressions, same-age peers. One automatic retry with fix notes. **Failed pages block assembly** in the admin UI; the admin can Redo or explicitly "Use anyway."
