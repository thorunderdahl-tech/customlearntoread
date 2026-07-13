// Custom Learn to Read — brand guide, as code.
// Single source of truth for the brand voice and illustration style that feed
// the book generator. Distilled from the official Design System (the
// "Custom Learn to Read — Design System": brand personality, voice & tone,
// visual foundations, and print/book standards). Human-readable version: BRAND.md.
//
// Edit HERE to change how every generated book reads and looks.

/** Warm brand palette (hex), for any prompt or asset that needs the colors. */
export const BRAND_PALETTE = {
  cream: "#faf7f2", // page / background ground
  navy: "#1f2a44", // headings
  caramel: "#c68a52", // primary accent
  caramelDark: "#8c5b37", // links / deeper accent
  peach: "#f5b78d", // warm accent
  ink: "#2f2a24", // soft warm near-black text (never pure black)
  // One accent per reading level (covers, badges, level pickers)
  level1: "green",
  level2: "coral",
  level3: "gold",
  level4: "blue",
} as const;

/**
 * Brand voice for the STORY text. Folded into the story system prompt so the
 * writing matches the brand: warm, encouraging, child-as-hero, confidence-first.
 */
export const BRAND_STORY_VOICE = `BRAND VOICE (Custom Learn to Read):
- Warm, plain-spoken, confident, encouraging — reassuring, never hype-y. Confidence over challenge.
- The child is ALWAYS the hero and ALWAYS succeeds; the ending is positive; the child is NEVER the joke. Every book builds reading confidence.
- Personal and modern; never flashy, overstimulating, babyish, corporate, or "AI-sounding."
- Do NOT feature the brand mascot (Bella, a calm goldendoodle) inside the child's story unless the order specifically asks for a dog — the child is the star, not a mascot.
- Default feeling is happy and positive for every character. Only give a page a different emotion if the story genuinely needs it; keep any non-positive feeling rare and mild, and resolve it warmly. In the illustration directions (artPrompts), describe characters as happy/smiling unless the beat truly calls for another gentle feeling.`;

/**
 * Brand ILLUSTRATION style — the heart of on-brand art. Prepended to every
 * image prompt (character sheet, each page, redos). Captures the design
 * system's "imagery vibe" + palette + the hard guardrails.
 */
export const BRAND_ART_STYLE = `Custom Learn to Read house illustration style:
Warm, friendly, modern children's PICTURE-BOOK illustration — a soft, hand-made storybook feel. Golden-hour light, gently warm and calm, soft (not neon) saturation. Rich but cozy colors drawn from a warm palette: cream and soft gold grounds (cream ${"#faf7f2"}), with warm caramel, peach, gentle gold and sage accents; soft warm-tinted shadows (never cold grey); soft warm near-black line/ink, never pure black.
Clean, uncluttered compositions with generous breathing room (protect white/negative space). Large, readable, friendly facial expressions; clear simple shapes; one clear focal action per page. The picture must tell the story on its own.
GLOBAL LIGHTING LOCK: every page of one book shares the SAME light — warm late-afternoon golden-hour, soft warm-tinted shadows. Never switch a page to flat midday light, a cool/blue sky palette, overcast grey, or night unless the story text explicitly demands it. If style-anchor pages are attached, match their lighting and palette exactly.
Full-bleed scene with the main subject in the UPPER TWO-THIRDS of the frame (the bottom band is reserved for the reading text, so keep that area simple). FULL-BLEED MEANS FULL-BLEED: paint the real scene all the way to every edge of the frame — the ground, grass, floor or sky simply continues, uncluttered, into the bottom third. NEVER render a blank/solid strip, cream or white band, letterbox, border or frame at any edge; a baked-in band ruins the page when the real text band is composited on top.
NOT this: no anime, manga, or comic-book look; no 3D / Pixar / CGI render; no glossy "AI-fantasy" look; nothing flashy, overstimulating, babyish, or corporate. No bluish-purple gradients, no heavy textures.
CHARACTERS: Draw children a touch MORE REALISTIC and natural — lifelike faces, hair and proportions, less cartoony and never babyish — while staying a warm, hand-illustrated picture-book (still NOT 3D, CGI, or photorealistic). When more than one child appears, render them as SAME-AGE peers/classmates: keep every kid similar in age, height and scale — do NOT make any child look older or younger than the others. Expressions are warm and HAPPY by default; only show a different emotion when the page's story text explicitly calls for it, and even then keep it rare, mild and age-appropriate — never angry, scary, sad or distressed unless the story truly requires it.
HARD RULES: ABSOLUTELY NO text, letters, numbers, signs, logos, brands, or watermarks anywhere in the image. No trademarked or franchise characters — generic versions only.`;
