# Print Specification — 5.5 × 8.5 Softcover (and Hardcover)

Source of truth for every printed book. Enforced by the geometry constants in `app/admin/create/CreateClient.tsx`. If a printer's requirements differ, change the constants, not scattered numbers.

## Trim, bleed, safe zone

| Spec | Value | Pixels @300 DPI | Points |
|---|---|---|---|
| Trim size | 5.5 × 8.5 in | 1650 × 2550 | 396 × 612 |
| Bleed (each side) | 0.125 in | 38 | 9 |
| Page with bleed | 5.75 × 8.75 in | 1725 × 2625 | 414 × 630 |
| Safe zone (from trim) | 0.5 in | 150 | 36 |

All pages are composited at full-bleed size (1725 × 2625 @ 300 DPI). Text and page numbers must sit inside the safe zone. Backgrounds/art must extend to the bleed edge.

## Resolution & color

- **300 DPI minimum** at final size — never upscale art to reach it. Illustration source images are requested at 2K from the model (`ART_IMAGE_SIZE`, `lib/gemini.ts`).
- JPEG quality 0.92 for print composites.
- Color is sRGB. KDP/Lulu accept RGB and convert; for offset printing, request a CMYK conversion proof from the printer.
- Interior reading text is Andika ~36 pt (brand requirement 32–40 pt); cover title Montserrat.

## The three output files (built by "Assemble book")

1. **Home-print PDF** (customer): trim-size pages (396 × 612 pt), bleed cropped, cover + interior + back cover. This is the file emailed/linked to families.
2. **Printer interior PDF**: bleed-size pages (414 × 630 pt), **no cover**, front matter + story + back matter, padded with "My drawing" pages to an **even count ≥ 24** (perfect-bound minimum).
3. **Printer cover wrap PDF**: one page: back panel + spine + front panel + 0.125 in bleed all around.
   - Spine width = interior pages × **0.002252 in** (50 lb white paper; use 0.0025 for cream).
   - Spine is solid brand caramel — no spine text below ~80 pages.
   - Reserved **barcode zone**: 2 × 1.2 in white box, 0.25 in inside the back-panel trim (spine side, bottom). Leave empty; the printer/KDP places the barcode.

Hardcover (case-laminate) needs the printer's own wrap template (wrap allowance + board thickness); the interior PDF is reusable as-is.

## Interior structure

Title page → dedication/copyright → story pages → "The End" → "Words I can read" → "My drawing" pad pages to even ≥ 24.

## Pre-flight checklist (before sending to a printer)

- [ ] Interior page count even and ≥ 24
- [ ] All pages 414 × 630 pt, art reaches bleed edges
- [ ] No text or page numbers within 0.5 in of trim
- [ ] Cover wrap width = 2 × 5.75 + spine; barcode zone clear
- [ ] Order a physical proof before the first customer shipment of any new format
