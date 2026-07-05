# Print Specification — 5.5 × 8.5 Softcover (and Hardcover)

Source of truth for every printed book. Enforced in `app/admin/create/CreateClient.tsx` (geometry constants at the top of the file). If a printer's requirements differ, change the constants, not scattered numbers.

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

## The three output files

1. **Home-print PDF** (customer): trim-size pages (396 × 612 pt), bleed cropped, cover + interior + back cover. This is the file emailed/linked to families.
2. **Printer interior PDF**: bleed-size pages (414 × 630 pt), **no cover**, front matter + story + back matter, padded to an **even count ≥ 24 pages** (perfect-bound minimum).
3. **Printer cover wrap PDF**: one page: back panel + spine + front panel + 0.125 in bleed all around.
   - Spine width = interior pages × **0.002252 in** (50 lb white paper). Update the constant for cream paper (0.0025 in).
   - Spine is a solid brand color — no spine text below ~80 pages.
   - Reserved **barcode zone**: 2 × 1.2 in white box, 0.25 in inside the back-panel trim (spine side, bottom). Leave empty; the printer or KDP places the barcode.

Hardcover (case-laminate) uses different wrap math (wrap allowance ~0.75 in per edge + board thickness) — get the printer's template before promising hardcover; the interior PDF is reusable as-is.

## Interior structure

Title page → copyright/dedication page → story pages (1 per spread side) → "The End" page → "Words I can read" vocabulary page → "My drawing" pad pages as needed to reach even ≥ 24.

## Pre-flight checklist (before sending to a printer)

- [ ] Interior page count even and ≥ 24
- [ ] All pages 414 × 630 pt, art reaches bleed edges
- [ ] No text or page numbers within 0.375 in of trim
- [ ] Cover wrap width = 2 × 5.75 + spine; barcode zone clear
- [ ] Order a physical proof before the first customer shipment of any new format
