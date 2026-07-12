# Print Specification — 5.5 × 8.5 (Cornerstone softcover · Lulu hardcover)

Source of truth for every printed book. Enforced in `app/admin/create/CreateClient.tsx` (geometry constants at the top of the file). If a printer's requirements differ, change the constants, not scattered numbers.

## Printer routing (July 2026)

| Product | Printer | Output file(s) |
|---|---|---|
| Softcover | **Cornerstone Copy** (cornerstonecopy.com/booklets — saddle-stitch) | ONE reader-order booklet PDF, covers included |
| Hardcover | **Lulu** | Interior PDF (no marks) + cover from Lulu's own template |
| Digital Book | — | Flipbook + customer home-print PDF only |

## Trim, bleed, safe zone

| Spec | Value | Pixels @300 DPI | Points |
|---|---|---|---|
| Trim size | 5.5 × 8.5 in | 1650 × 2550 | 396 × 612 |
| Bleed (each side) | 0.125 in | 38 | 9 |
| Page with bleed | 5.75 × 8.75 in | 1725 × 2625 | 414 × 630 |
| Safe zone (from trim) | 0.375 in | ~113 | 27 |

All art is composited at full-bleed size (1725 × 2625 @ 300 DPI). Text and page numbers must sit inside the safe zone. Backgrounds must extend to the bleed edge.

## Resolution & color

- **300 DPI minimum** at final size — never upscale art to reach it. Physical orders request **4K** source art (~4096 px, downscaled into the 2625 px page for a true 300 DPI); digital-only orders use 2K to save cost. Resolution is chosen per order in `CreateClient` (`artImageSize`) and passed through `generateImage`. A **pre-flight guard** in `assemble()` blocks a physical book if any page's art would be upscaled below the full-bleed size.
- JPEG quality 0.92 for print composites.
- Color is sRGB. KDP/Lulu accept RGB and convert; for offset printing, request a CMYK conversion proof from the printer.

## The output files

1. **Home-print PDF** (customer, every order): trim-size pages (396 × 612 pt), bleed cropped, cover + interior + back cover. This is the file emailed/linked to families.
2. **Cornerstone booklet PDF** (softcover): ONE PDF, reader order, **covers included in the page count**, one printed side per PDF page (Cornerstone does the imposition — never supply spreads). Bleed-size pages (414 × 630 pt) with **visible crop marks** and Trim/Bleed boxes. Total page count must be a **multiple of 4 between 8 and 60**; pad pages ("My drawing") are inserted before the back cover. When ordering, "Number of Pages Including Covers" must match the PDF exactly — a mismatch puts the order ON HOLD.
3. **Lulu interior PDF** (hardcover): bleed-size pages (414 × 630 pt), **NO crop marks** (Lulu rejects printer's marks), no cover, even count ≥ 24 (case-bind minimum). The case-wrap cover is built from **Lulu's own cover template** for the exact page count — never our wrap math (board thickness + wrap allowance live in their template).

Legacy: a perfect-bound wraparound-cover generator (`buildCoverWrap`, spine = pages × 0.002252 in, barcode zone) remains in the code unused, kept for a future KDP-style perfect-bound product.

## Interior structure

Bookplate ("This book belongs to…", + gift message) → optional read-along key → story pages → "The End" (cover art reprise) → "Why These Words?" page → "My drawing" pad pages as needed to hit the binding's page-count rule. Cover + back cover are part of the booklet file for Cornerstone; separate (Lulu template) for hardcover.

## Pre-flight checklist (before sending to a printer)

- [ ] **Cornerstone**: total pages (incl. covers) multiple of 4, 8–60; crop marks visible; order form page count matches the PDF exactly
- [ ] **Lulu**: interior even and ≥ 24, NO marks; cover built from Lulu's template for this exact page count
- [ ] All pages 414 × 630 pt, art reaches bleed edges
- [ ] No text or page numbers within 0.375 in of trim
- [ ] Order a physical proof before the first customer shipment of any new format
