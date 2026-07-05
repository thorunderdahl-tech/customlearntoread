# Story Generation Framework

**The "Adventure System" — how one set of rules becomes thousands of fresh, safe books.**
_Specs: `schemas/story-templates.json`, `schemas/story-arcs.json`, `schemas/story-framework.json`._

This layer sits **on top of** the reading engine and never overrides it. Reading constraints
always win: if a story idea can't be told within the level's decodable words, the story bends,
not the reading rules.

## The five combination axes

Every book is one point in a large combination space:

```
TEMPLATE   × ARC        × THEME       × SETTING     × OBJECTIVE   (+ personalization)
(structure)  (emotion)    (surface)     (place)       (core verb)

Journey     Adventure    Dinosaurs     museum        find
Try-again   Funny        Space         volcano       build
Discovery   Helping      Firefighters  backyard      learn
Someone-    Mystery      Dogs          jungle        help
 needs-help Cozy         Sports        castle        explore
...         ...          ...           ...           celebrate / solve
```

Multiply these out and a single reading level already yields tens of thousands of distinct
books — before personalization. The **educational progression stays identical** across all of
them; only the *experience* changes. That's the whole point: scale the story space without ever
touching the reading foundation.

## The four questions (story spine)

Every book must answer **Who / What / Why / How** (`book-spec.four_questions`). This is a hard
guardrail — it's what prevents "things just happen" plots. The **How** is the most important:
it's the *value* the child uses to succeed (effort, kindness, cleverness, practice, teamwork),
and each book focuses on just one.

## Guardrails (what keeps 10,000 auto-generated books safe and good)

The hard rules — enforced before a book can ship — are in `story-framework.json`. The ones that
matter most:

- **Child agency.** The child solves the problem through their own effort/kindness/cleverness —
  *never* by luck, coincidence, a magic fix, or an adult stepping in. This is the difference
  between an empowering book and a passive one, and it's the easiest thing for an automated
  generator to get wrong.
- **Safe stakes + emotional return.** Mild, resolvable problems only; any worry introduced is
  relieved by the end; the child always ends safe and capable.
- **Single problem** at Levels 1–4; **positive resolution** always; **earned resolution** (the
  "How" is set up earlier, e.g., the red ball appears before it saves the day).
- **Show, don't moralize** — convey the value through action, no tacked-on "The End, remember to
  share!"

## Pacing by level

`story-framework.json -> pacing_by_level` maps each reading level to how much story it can
carry: beat count, sentences per page, and how much tension is age-appropriate. Levels 1–2 get a
barely-there wobble and suit cozy/helping/discovery arcs; by Levels 7–8 complex sentences allow
real cause-and-effect and named feelings.

## Variety ("no two books alike")

For a given child, the `combination_key` (template, arc, setting, tone, objective) is logged for
every book. The selector then enforces: **never an exact repeat**, and within the same theme +
level, **each new book differs from the last three on at least 3 of the 5 axes** — changing
*objective* and *setting* first, since those most change how a book feels. So three Level-2
dinosaur books might be: a museum *discovery* (curious) → a backyard *fossil dig* (proud) → a
volcano *rescue-help* (brave). Same words taught; three different experiences.

## The generation contract

The end-to-end process (`story-framework.json -> generation_contract`):

1. Inputs: child profile, target level, theme.
2. **Select** template + arc + setting + tone + objective (variety engine).
3. Resolve name + allowed out-of-level tokens.
4. Frame the four questions; pick the value driving the How.
5. Assemble beats across the level's page budget.
6. Generate each page: child track (constrained) + optional adult track (rich).
7. **Self-check** (the checklist below).
8. **Validate** (reading + story guardrails + safety); regenerate flagged pages on hard fail.
9. Illustrate with the reference sheet.
10. Record the combination_key to the child's memory.

**Pre-validation self-check:** every child word at-level? Who/What/Why/How answered? Child
solves it (not luck/adult)? How set up earlier? One problem, resolved, warm ending? Practices
this level's new focus? Combination different enough from recent books?

Pass all of that and the book is, by construction, decodable-at-level, structurally complete,
emotionally safe, and fresh — with no human review required per title. That is the production
system.
