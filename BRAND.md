# Custom Learn to Read — Brand Guide

*Source of truth for how every personalized book reads and looks. Distilled from the official "Custom Learn to Read — Design System." The machine-readable version that actually feeds the generator lives in [`lib/brand.ts`](lib/brand.ts) — edit there to change generation; keep this doc in sync.*

## North star
Every decision serves one moment: **"I can read this."** The child is the hero. Reading is the adventure.

## Brand personality
**We are:** warm · encouraging · personal · educational · modern · premium · trustworthy · family-focused.
**We are not:** flashy · overstimulating · babyish · corporate · trend-driven · overly academic · AI-looking.

## Voice & tone (story text)
- Warm, plain-spoken, confident, encouraging. Reassuring, never hype-y. **Confidence over challenge.**
- The child is **always the hero, always succeeds**, the ending is **positive**, and the child is **never the joke**. Every book builds reading confidence.
- Short, declarative sentences. (Reading-level word/sentence rules are enforced separately in `lib/leveling.ts`.)
- Bella the Reading Buddy (the calm goldendoodle mascot) appears on brand collateral, **not inside personalized stories** unless the order asks for it.

## Illustration style (art)
- Warm, friendly, modern **picture-book** illustration — soft, hand-made storybook feel. **Golden-hour light, soft saturation**, warm and calm.
- Warm palette: cream/gold grounds (`#faf7f2`), caramel `#c68a52`, peach `#f5b78d`, gold, sage accents; soft warm-tinted shadows; warm near-black ink (never pure black).
- Clean, uncluttered, **generous white space**. Large readable friendly faces. One clear focal action per page. The picture tells the story on its own.
- Composition: full-bleed, subject in the **upper two-thirds** (bottom band reserved for reading text).
- **Avoid:** anime/manga/comic, 3D/Pixar/CGI, glossy "AI-fantasy," flashy/overstimulating/babyish, bluish-purple gradients, heavy textures.
- **Hard rules:** no text/letters/numbers/logos/brands/watermarks in the image; no trademarked or franchise characters.

## Color palette
| Token | Hex | Use |
|---|---|---|
| Cream | `#faf7f2` | page / illustration ground |
| Navy | `#1f2a44` | headings |
| Caramel | `#c68a52` | primary accent / CTAs |
| Caramel (dark) | `#8c5b37` | links / deeper accent |
| Peach | `#f5b78d` | warm accent |
| Ink | `#2f2a24` | text (soft warm near-black) |

**Reading-level accents:** Level 1 green · Level 2 coral · Level 3 gold · Level 4 blue (covers, badges, level pickers).

## Type & print standards (reference)
- Fonts: **Montserrat** (cover titles + level badges), **Andika** (interior reading text — literacy-safe, required), Fraunces (display), Inter (UI/body).
- Trim 5.5" × 8.5" portrait, 20 pages, 300 DPI, 0.125" bleed, 0.5" safe area.
- Cover system: **top 15% title · middle 70% illustration · bottom 15% level badge + logo.** Title format: "[Child] and the [Topic]."
- Recurring brand glyphs: the ✦ four-point star and the 🐾 paw.

## How it's wired into generation
- `lib/brand.ts` → `BRAND_ART_STYLE` is prepended to every Gemini image prompt (character sheet, each page, redos) via `app/api/admin/art/route.ts`.
- `lib/brand.ts` → `BRAND_STORY_VOICE` is folded into the Claude story system prompt in `lib/story.ts`.
- Reading-level rules remain in `lib/leveling.ts`; full prompt reference in `book-generation-reference` notes.
