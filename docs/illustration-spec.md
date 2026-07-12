# Illustration Specification

Source of truth for book art. Enforced as the `STYLE` constant in `app/api/admin/art/route.ts` — keep the two in sync when editing.

## House style (fixed — every page of every book)

- **Medium:** hand-painted gouache with colored-pencil texture. Soft visible paper grain, clean confident shapes, soft darker-tone edges — never hard black outlines. Never photorealistic, 3D-rendered, flat vector, or anime.
- **Palette:** cream `#FFF8ED`, peach `#F5B78D`, golden yellow `#F7D58B`, sage `#B8C8AD`, soft sky blue `#A9C7E4`, terracotta `#D98A5F`, deep warm brown `#2F2A24` (darkest accent). No neon, no pure black.
- **Light:** soft warm daylight, gentle shadows.
- **Composition:** one clear focal action per image. Subject, faces, hands and story-critical objects fully inside the **upper 75%** of the frame; the bottom 25% is simple ground/background (the text band covers the bottom 20% of the trim, and print trimming crops the outer ~5% of edges). Clean uncluttered background; large readable expressions; the picture must tell the story without the words.
- **Never:** text, letters, numbers, signs, logos, brands, watermarks, trademarked or franchise characters.

## Pipeline requirements

1. **Resolution:** request 2K output (`ART_IMAGE_SIZE`, default `2K`) — page composites are 1725 × 2625 @ 300 DPI and art must not be meaningfully upscaled. If a model can't do 2K, don't ship its output in print books.
2. **Character sheet first:** one reference sheet locks the child's look (and pet, if photographed) for the whole book. Regenerating the sheet invalidates existing pages.
3. **References on every page generation:** character sheet first, then up to two already-QA-passed pages from the same book as style anchors.
4. **Aspect:** generated at 2:3; the page is 5.75:8.75 (≈0.657), so ~3% of each side is crop — compose away from edges.

## QA gate (vision check, every page)

Checks: character match vs sheet, style match vs sheet, story match vs page text, composition (upper-75% rule), no text in image, age-appropriateness/anatomy. One automatic retry with fix notes on failure. **Failed pages block assembly** in the admin UI; the admin can Redo or explicitly "Use anyway."
