# Illustration Pipeline Requirements

Mechanics of on-brand, print-quality art. The STYLE itself lives in `lib/brand.ts` (`BRAND_ART_STYLE`, distilled from the Design System — human-readable version in `BRAND.md`); this doc covers the pipeline guardrails around it.

## Resolution

- Request **2K** output from the image model (`ART_IMAGE_SIZE`, default `2K`, in `lib/gemini.ts`; falls back gracefully if a model rejects it). Page composites are 1725 × 2625 @ 300 DPI — art must not be meaningfully upscaled or it prints soft. This was the main cause of subpar printed illustrations.

## Consistency

- **Character sheet first**: one reference sheet locks the child's look (and pet) for the whole book. Regenerating it invalidates existing pages.
- **References on every page generation**: character sheet first, then up to two already-QA-passed pages from the same book as style anchors (`genOnePage` in `CreateClient.tsx`). References are downscaled to ~900 px before sending to keep request bodies small.
- **Aspect**: generated at 2:3; the bleed page is 5.75:8.75, so ~3% of each side is cropped — compose away from edges.
- **Composition**: subject and all story-critical elements in the upper two-thirds; the bottom band is reserved for reading text (band top is computed per book, clamped 58–82% of page height).

## QA gate (vision check, every page)

Checks, in `app/api/admin/art/route.ts`: character match vs sheet, **style match vs sheet**, story match, **composition (upper-two-thirds + edge clearance)**, no text in image, age-appropriateness/anatomy, happy-by-default expressions, same-age peers. One automatic retry with fix notes. **Failed pages block assembly** in the admin UI; the admin can Redo or explicitly "Use anyway."
