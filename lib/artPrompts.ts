// Shared illustration prompt builders — single source of truth for BOTH the
// interactive admin route (app/api/admin/art/route.ts) and the unattended
// generation pipeline (lib/pipeline.ts). Keeping these in one place means the
// overnight queue and the manual create screen can never drift apart on the
// character-lock language that keeps kids looking the same across pages.
import { BRAND_ART_STYLE } from "./brand";

const STYLE = BRAND_ART_STYLE;

/** Character reference sheet (turnaround: front + back view). `photo` = a parent
 * reference photo is attached and should be stylized. `photoSubject` = the
 * admin's authoritative note on WHO in the photo is the hero and who to leave
 * out — critical when the photo shows more than one person. */
export function characterSheetPrompt(desc: string, cast?: string, note?: string, photo = false, photoSubject?: string): string {
  const companionLine = cast
    ? `\n\nALSO on the sheet, standing in a row beside the child, IN EXACTLY THE ORDER LISTED (left to right, so each one is identifiable by position): EVERY recurring character in this book — ${cast}. Draw each one unmistakably (exact skin tone, hair, eyes, clothing; or species, coloring, markings, collar), and keep similar-looking characters clearly DISTINCT — if two characters differ mainly by hair color or skin tone, exaggerate that difference enough that no one could confuse them. This one sheet locks the look of the ENTIRE cast for the whole book.`
    : "";
  const noteLine = note
    ? `\n\nART DIRECTOR'S INSTRUCTION (follow it exactly, it overrides conflicting defaults): ${note}`
    : "";
  const rosterLine = `\n\nEXACT CAST RULE: the finished sheet must contain EXACTLY the character(s) described in this prompt — no more, no fewer. NEVER add an extra person, NEVER merge two people into one, and NEVER replace an excluded or omitted person with a new invented character (not even one of a different gender or age). If someone is excluded, the sheet simply has one fewer figure.`;
  const subjectBlock = photoSubject
    ? `\n\nPHOTO CAST MAP (authoritative — obey this before every other photo consideration; it says who in the photo is who): ${photoSubject}. Draw each mapped person as their named character, copying that exact person's features. Anyone in the photo NOT identified here as a character to draw must be COMPLETELY OMITTED from the sheet — do not draw them, do not adapt their features into another character, and do not substitute a replacement figure for them.`
    : "";
  return photo
    ? `${STYLE}

Using the attached real photo as visual reference (provided by the child's parent), create a STYLIZED storybook character version of the child — warm illustrated picture-book style, clearly NOT photorealistic. Faithfully capture the child's hair color and texture, eye color, skin tone, and overall vibe from the photo. If a pet appears in the photo, include the pet beside the child on the sheet with its breed, coloring and fur faithfully stylized too.

MULTI-PERSON PHOTOS: the photo may show more than one person (other children, adults, people in the background). Draw ONLY the character(s) this prompt asks for. Every other person in the photo must be left out entirely — never drawn, never adapted, never replaced by a stand-in.${subjectBlock}

IDENTITY FIDELITY — THE PHOTO IS GROUND TRUTH: every character drawn from the photo must map ONE-TO-ONE to a single, specific person in the photo. NEVER blend two people's features into one character, and NEVER give one character another person's skin, hair or face. For each mapped person, copy EXACTLY as the photo shows: their SKIN TONE (never darker, never lighter, never a different complexion or ethnicity than that exact person), their hair color, texture and length, and their eye color. If the written description below disagrees with the photo about skin tone, hair or eye color, THE PHOTO WINS — the written description may only add or override clothing and accessories.

Character reference sheet (turnaround): the SAME child drawn TWICE, side by side — full-body FRONT view and full-body BACK view — neutral happy pose, plain soft cream background. Both views must show identical hair length/style and the identical outfit; the BACK view must show the true back of the hair and the PLAIN back of the top (never repeat a front graphic on the back). This sheet defines the look for a whole book — make every feature unmistakable. Also honor this description: ${desc}${companionLine}${rosterLine}${noteLine}`
    : `${STYLE}

Character reference sheet (turnaround): the SAME single child character drawn TWICE, side by side on a plain soft cream background — full-body FRONT view and full-body BACK view, neutral happy pose. Both views must show the identical hair length/style and the identical outfit; the BACK view must show the true back of the hair and the PLAIN back of the top (never repeat a front graphic on the back). The character: ${desc}. This image defines the character's exact look for a whole book; make hair (its exact length), eyes, skin and outfit unmistakable. Dress the child in EXACTLY the outfit named in the description — the same garments, colors and any graphic — and do NOT invent or substitute a different shirt, sweater or colors unless the art director's instruction below explicitly changes the clothing.${companionLine}${rosterLine}${noteLine}`;
}

/** One interior/cover page. `scene` is the (ideally expanded) art direction. */
export function pagePrompt(scene: string, characterDescription: string, cast?: string, directorNote?: string, fixNotes?: string): string {
  const companionLine = cast
    ? `\n\nCAST LOCK — this book's ONLY recurring characters besides the hero are the following, exactly as drawn on the sheet: ${cast} Wherever the scene includes one of them, they MUST appear identical — the exact same skin tone, hair, clothing, species, coloring and markings. NEVER change any character's skin tone or hair between pages, NEVER swap one cast member for another, and NEVER invent a new recurring character who is not on this list.`
    : "";
  const directorLine = directorNote
    ? `\n\nART DIRECTOR'S INSTRUCTION (HIGHEST priority — where it conflicts, it OVERRIDES the scene, the CHARACTER LOCK, the CAST LOCK, the character sheet and the style anchors): ${directorNote}\nIf this instruction says to REMOVE, EXCLUDE or LEAVE OUT a character, that character must not appear in ANY form — do NOT replace them with a new or different character (of any gender, age or species), do NOT keep the same number of figures by adding someone else. The scene simply contains one fewer character, and that is correct even if the reference sheet or anchor pages still show them.`
    : "";
  return `${STYLE}\n\nCHARACTER LOCK — the FIRST attached reference image is this book's character sheet (front view and back view of the same child). The child character MUST match the sheet EXACTLY:\n- face and eyes: identical\n- hair: identical color, texture, and the EXACT same length and style — never longer, shorter, curlier or straighter\n- skin tone: identical\n- outfit: the EXACT same garments, their colors and any graphic — NEVER change, swap or recolor any clothing between pages\nThe locked description: ${characterDescription}${companionLine}\n\nCHARACTER COUNT: draw ONLY the characters this page's scene (and the art director's instruction) calls for — never add an extra child, adult or bystander to fill space, and never draw a person or creature who is not the hero, a listed cast member, or an explicitly-called-for background figure.\n\nSTYLE ANCHORS — any additional attached images are approved pages from this same book: match their rendering style, palette and level of detail exactly so all pages look like one printed book. If an anchor page conflicts with the character sheet on any character detail, the CHARACTER SHEET wins.\n\nCLOTHING FROM BEHIND: if a character is turned so the back of their top is visible, draw it exactly as the sheet's BACK view shows — PLAIN fabric, no front graphic, logo or print copied onto the back. A front graphic on a back-facing body makes the head look reversed.\n\nSCENE FOR THIS PAGE: ${scene}${directorLine}${fixNotes ? `\n\nFIX these problems from the previous attempt: ${fixNotes}` : ""}`;
}

/** Reference-photo analysis. Run by a VISION model on the parent's photo BEFORE
 * the character sheet is drawn. It turns a casual photo (possibly with several
 * people) into a precise "photo cast map" and per-person locked looks — so
 * neither parents nor the admin have to write forensic descriptions by hand.
 * `typedLook` = the parent's order-form appearance fields; `hint` = any casual
 * note like "Reeva is the one in the middle". */
export function photoAnalysisPrompt(childName?: string, typedLook?: string, hint?: string): string {
  return `You are preparing a reference-photo analysis for a children's picture-book illustrator. Examine the attached photo carefully.${childName ? ` The book's hero is a child named ${childName}.` : ""}${typedLook ? ` The parent described the hero on the order form as: ${typedLook}.` : ""}${hint ? ` The parent's note about the photo: "${hint}" — this note is authoritative for deciding who is who.` : ""}

Do this:
1. Find EVERY person in the photo, including anyone partly visible or in the background. Give each a clear position ("on the left", "in the middle", "in the background behind the fence").
2. Decide which person is the hero: the parent's note wins if present; otherwise pick the person who best matches the order-form description (hair color, age, skin tone). If you genuinely cannot tell, set "heroFound" to false — do NOT guess between two similar children.
3. For EACH person, write one "lockedLook" sentence an illustrator could follow exactly: precise SKIN TONE (e.g. "fair", "light olive", "warm tan", "medium brown", "deep brown" — never vague), hair color + length + texture + style, eye color only if clearly visible, apparent age, then clothing garment by garment with colors, and shoes. STRICT rules for clothing: NEVER name a brand or trademark (say "rubber clogs", not a brand), and NEVER mention printed words or lettering — the illustrations may contain no text, so describe a printed shirt as e.g. "a white tee with a colorful sun-and-rainbow graphic".
4. Write "castMap": ONE compact paragraph naming who is who by position and one visible detail — the hero first, then each other person — ending with "nobody else is in the photo" (or listing anyone who should be ignored, like background strangers).

Reply ONLY JSON:
{"heroFound": true|false, "castMap": "the paragraph", "people": [{"position": "...", "isHero": true|false, "lockedLook": "..."}]}`;
}

/** Sheet-vs-photo fidelity gate. Run right after a character sheet is generated
 * FROM a reference photo, before any pages are drawn — a sheet with the wrong
 * skin tone or hair poisons every page of the book. IMAGE 1 = the generated
 * sheet, IMAGE 2 = the parent's real photo. */
export function sheetQaPrompt(characterDescription: string, cast?: string, photoSubject?: string): string {
  return `You are the fidelity gate for a children's book character sheet. IMAGE 1 is a generated, stylized character reference sheet. IMAGE 2 is the real photo it was drawn from (provided by the child's parent). A sheet that fails is regenerated, so flag every real problem.

The sheet was supposed to contain: the hero — ${characterDescription}${cast ? `; plus these other characters, drawn beside the hero in the numbered order listed (use that left-to-right order to tell similar-looking characters apart) — ${cast}` : "; and NO other characters"}.${photoSubject ? ` PHOTO CAST MAP (who in the photo is who): ${photoSubject}. Anyone in the photo not named in this map must NOT appear on the sheet in any form.` : ""}

Check, comparing the sheet against the photo:
1. SKIN TONE (most important): for every sheet character drawn from a person in the photo, is the skin tone a faithful match to THAT EXACT person — not noticeably darker, lighter, or a different complexion/ethnicity? A skin-tone mismatch is a HARD FAIL — name the character and say whether the sheet made them darker or lighter than the photo.
2. HAIR: does each character's hair color, texture and length match their photo person? Blonde must stay blonde, dark brown must stay dark brown, curly must stay curly. Mismatch = HARD FAIL.
3. ONE-TO-ONE MAPPING: does each sheet character correspond to exactly one photo person, with no blending of two people into one figure, and no invented character who matches nobody in the photo or the descriptions?
4. COUNT: does the sheet contain exactly the characters listed above — none missing, none extra, no excluded person from the photo sneaking in or being replaced by a substitute figure?
5. STYLE: is it a warm stylized picture-book illustration (NOT photorealistic), with front AND back views of the hero, on a plain background, with no text or logos?
Reply ONLY JSON: {"pass": true|false, "issues": ["short fixable issue naming the character and attribute", ...]}`;
}

/** Vision-QA gate prompt. `styleRef` = the character sheet is attached as image 2.
 * `directorNote` = a binding admin edit instruction for THIS page (e.g. "remove
 * the boy") — QA must treat compliance with it as correct, never as drift. */
export function qaPrompt(pageText: string, characterDescription: string, cast?: string, artPrompt?: string, styleRef = false, directorNote?: string): string {
  return `You are the strict QA gate for a children's book illustration. A page that fails QA is regenerated, so it is much better to flag a real problem than to wave it through. ${styleRef ? "IMAGE 1 is the page to check; IMAGE 2 is the approved cast/style reference sheet for this book — every recurring character's canonical look (it may show the child from the front AND the back; use the matching view when a character faces away)." : "The attached image is the page to check."} The page's story text is: "${pageText}".${artPrompt ? ` The art direction this image was generated from: "${artPrompt}".` : ""} The child hero must look like: ${characterDescription}.${cast ? ` The other recurring cast members must look like: ${cast}.` : ""}${directorNote ? `
BINDING EDIT INSTRUCTION for this page (it OVERRIDES the reference sheet and the descriptions above where they conflict): "${directorNote}". Judge the page as CORRECT where it follows this instruction — e.g. if it says a character was removed, their absence is intentional and must NOT be flagged, even though the reference sheet still shows them. DO flag it if the page violates the instruction — e.g. the "removed" character still appears, or a NEW substitute character appears in their place.` : ""}
Check the page image:
1. CAST IDENTITY (most important): check EVERY character in the image — the hero AND every recurring friend, sibling or pet — against their locked description${styleRef ? " and the reference sheet" : ""}. Compare attribute by attribute and garment by garment: hair color, hair texture, hair LENGTH, eye color, SKIN TONE, glasses/accessories, then EACH garment (top, its color, any graphic; bottoms and color; shoes and color), species/markings/collar. A character whose skin tone, hair, or ANY garment differs from the sheet — even slightly, even in the background — is a HARD FAIL. Name which character drifted and which attribute. Hair that is clearly LONGER or SHORTER than the sheet is a HARD FAIL. Also check the CAST ROSTER itself: a prominent character in the image who matches NO locked description (an invented extra child, adult or creature) is a HARD FAIL — name them. If a character is shown from behind, the back of their top must be PLAIN fabric${styleRef ? " (match the sheet's back view if it has one)" : ""} — a front graphic, logo or print appearing on the BACK (which makes the head look put on backwards) is a HARD FAIL.
2. ${styleRef ? "STYLE: does the rendering style (medium, palette, line treatment) match the reference sheet closely enough that both could be pages of the same printed book?" : "STYLE: warm hand-illustrated picture-book style — no 3D/CGI, no anime, no photorealism?"}
3. SCENE FIDELITY: does the image match the story text${artPrompt ? " and art direction" : ""}? CRITICAL: verify every COUNT and COLOR that the text or art direction names — if the text says three apples, count the apples; if it names a red ball, the ball must be red. Wrong counts or colors are a fail.
4. RECURRING ELEMENTS: any companion animal or repeated object must have consistent species, coloring and markings${styleRef ? " with the reference sheet" : ""} — a pet that changes breed or color between pages is a fail.
5. ANATOMY / AI ERRORS: count fingers and limbs on every character; check for extra/missing/fused fingers or limbs, deformed faces or hands, warped or melting objects, duplicated features, garbled background details. Any AI artifact is a fail.
6. COMPOSITION: are the subject's face, hands and every story-critical object fully inside the UPPER TWO-THIRDS of the frame, with the bottom of the frame simple background only, and nothing important within ~5% of any edge? (The reading-text band covers the bottom of the page and print trimming crops the edges.)
7. Is there ANY text, lettering, numbers or watermark in the image?
8. Anything inappropriate or scary for ages 3-7?
9. Expressions: do the characters look happy/warm? Flag any unintended angry, sad, scared or distressed face that the story text does NOT call for (the default should be happy).
10. If more than one child appears, do they look like SAME-AGE peers? Flag it if any child looks clearly older or younger than the others.
Reply ONLY JSON: {"pass": true|false, "issues": ["short fixable issue", ...]}`;
}
