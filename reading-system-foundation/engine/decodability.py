#!/usr/bin/env python3
"""
CustomLearnToRead — decoding engine.

Turns the phonics scope-and-sequence (gpc-table.json) + heart-words.json into a
machine-checkable decodability + book validator. This is the keystone that makes
validation-rules.json's word_eligibility / decodability_ratio / sentence_length
checks actually runnable.

Pragmatic, not a full linguistic decoder: a greedy longest-match grapheme
tokenizer with special handling for the split-vowel (magic-e) pattern. Heart
words and allowed personalization/theme tokens cover the irregular exceptions.
Reference accent: General American.

Usage:
    python3 decodability.py                      # run built-in tests + sample book
    python3 decodability.py word LEVEL WORD ...   # check words at a level
    python3 decodability.py book LEVEL path.json  # validate a book-spec
"""
import json, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
SCHEMAS = os.path.join(BASE, "..", "schemas")

def _load(name):
    with open(os.path.join(SCHEMAS, name)) as f:
        return json.load(f)

GPC = _load("gpc-table.json")
HEARTS = _load("heart-words.json")
LEVELS = {l["level"]: l for l in _load("reading-levels.json")["levels"]}

# grapheme -> minimum level taught, and grapheme -> type
GRAPHEME_LEVEL = {}
GRAPHEME_TYPE = {}
for g in GPC["graphemes"]:
    key = g["grapheme"]
    GRAPHEME_TYPE.setdefault(key, g["type"])
    if "_" in key:          # split vowels handled separately
        continue
    lv = g["level"]
    if key not in GRAPHEME_LEVEL or lv < GRAPHEME_LEVEL[key]:
        GRAPHEME_LEVEL[key] = lv

_VOWEL_TYPES = {"vowel", "split_vowel", "vowel_team", "diphthong", "r_controlled", "trigraph"}

def _is_consonant(tok):
    return GRAPHEME_TYPE.get(tok, "consonant") not in _VOWEL_TYPES and tok.isalpha()

def _has_blend(word):
    """Two adjacent consonant graphemes (a cluster) — the structural focus of Level 5."""
    toks = _tokenize(re.sub(r"[^a-z]", "", word.lower()))
    return any(_is_consonant(toks[i]) and _is_consonant(toks[i + 1]) for i in range(len(toks) - 1))

def _syllables(word):
    """Approx syllable count = number of vowel-grapheme groups (magic-e counts as one)."""
    w = re.sub(r"[^a-z]", "", word.lower())
    stripped, magic = _magic_e(w)
    toks = _tokenize(stripped)
    count, prev_vowel = 0, False
    for t in toks:
        is_v = GRAPHEME_TYPE.get(t, "consonant") in _VOWEL_TYPES or (len(t) == 1 and t in "aeiou")
        if is_v and not prev_vowel:
            count += 1
        prev_vowel = is_v
    if magic:  # silent-e adds no syllable
        pass
    return max(count, 1)

def practices_level(word, level):
    """Does decoding this word exercise the level's NEW focus (not just review)?"""
    mx = word_max_level(word)
    if mx == level:
        return True
    if level == 5 and _has_blend(word):
        return True
    if level == 10 and _syllables(word) >= 2:
        return True
    return False

# split-vowel level (min of a_e,i_e,...)
SPLIT_LEVEL = min(g["level"] for g in GPC["graphemes"] if "_" in g["grapheme"])

# multi-letter graphemes, longest first for greedy matching
MULTI = sorted((k for k in GRAPHEME_LEVEL if len(k) > 1), key=len, reverse=True)

HEART_LEVEL = {h["word"].lower(): h["level"] for h in HEARTS["heart_words"]}

_MAGIC_E = re.compile(r"^[a-z]*[aeiou][bcdfghjklmnpqrstvz]e$")

def _magic_e(word):
    """If word is a split-vowel (magic-e) word, return (stripped, required_level)."""
    if len(word) >= 3 and _MAGIC_E.match(word):
        return word[:-1], SPLIT_LEVEL
    return word, None

def _tokenize(word):
    toks, i, n = [], 0, len(word)
    while i < n:
        hit = None
        for g in MULTI:
            if word.startswith(g, i):
                hit = g
                break
        if hit:
            toks.append(hit); i += len(hit)
        else:
            toks.append(word[i]); i += 1
    return toks

def decodable_at(word, level):
    """Can a child at `level` decode `word` using taught GPCs? Returns (bool, detail)."""
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return True, []
    stripped, req = _magic_e(w)
    detail, ok = [], True
    for t in _tokenize(stripped):
        lv = GRAPHEME_LEVEL.get(t)
        detail.append((t, lv if lv is not None else "unknown"))
        if lv is None or lv > level:
            ok = False
    if req and req > level:
        ok = False
    if req:
        detail.append(("(silent-e)", req))
    return ok, detail

def word_max_level(word):
    """Highest grapheme level required to decode `word` (None if undecodable)."""
    w = re.sub(r"[^a-z]", "", word.lower())
    if not w:
        return 0
    stripped, req = _magic_e(w)
    levels = []
    for t in _tokenize(stripped):
        lv = GRAPHEME_LEVEL.get(t)
        if lv is None:
            return None
        levels.append(lv)
    if req:
        levels.append(req)
    return max(levels) if levels else 0

def eligible_at(word, level, allowed=None):
    """A word is eligible if decodable-by-level, a heart word by level, or an allowed token."""
    allowed = {a.lower() for a in (allowed or set())}
    raw = word.lower().strip(".,!?;:“”\"'’")
    bare = re.sub(r"[^a-z]", "", raw)
    if bare in HEART_LEVEL and HEART_LEVEL[bare] <= level:
        return True, "heart"
    if raw in allowed or bare in allowed:
        return True, "allowed"
    dec, _ = decodable_at(bare, level)
    return (True, "decodable") if dec else (False, "INELIGIBLE")

# ---------- book-level validation ----------

_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+")
_WORD = re.compile(r"[A-Za-z']+")

def validate_book(spec):
    level = spec["level"]
    lv = LEVELS[level]
    allowed = set()
    for grp in spec.get("allowed_tokens", {}).values():
        for t in grp:
            for w in _WORD.findall(t):
                allowed.add(w.lower())
    report = {"level": level, "pages": [], "hard_fail": False, "checks": {}}
    seen = {}
    ineligible, over_len = [], []
    dec_total, below_level = 0, 0
    practice_words = set()
    for pg in spec["pages"]:
        # Only the CHILD track ('text') is decodability-checked; adult_read_aloud is exempt.
        text = pg["text"].replace("“", "").replace("”", "")
        for sent in _SENT_SPLIT.split(text.strip()):
            words = _WORD.findall(sent)
            if len(words) > lv["max_sentence_words"]:
                over_len.append({"page": pg["page"], "sentence": sent.strip(), "words": len(words)})
        for w in _WORD.findall(text):
            ok, why = eligible_at(w, level, allowed)
            key = re.sub(r"[^a-z]", "", w.lower())
            seen[key] = seen.get(key, 0) + 1
            if not ok:
                ineligible.append({"page": pg["page"], "word": w})
            elif why == "decodable":
                dec_total += 1
                mx = word_max_level(key)
                if mx is not None and mx < level:
                    below_level += 1
                if practices_level(key, level):
                    practice_words.add(key)
    report["checks"]["sentence_length"] = {"pass": not over_len, "violations": over_len}
    report["checks"]["word_eligibility"] = {"pass": not ineligible, "violations": ineligible}
    # cumulative review (soft): >=40% of decodable words use below-level GPCs
    ratio = (below_level / dec_total) if dec_total else 0.0
    cr_pass = (level == 1) or (ratio >= 0.40)
    report["checks"]["cumulative_review"] = {"pass": cr_pass, "type": "soft",
                                             "below_level_ratio": round(ratio, 2)}
    # practices own level (soft): the book must exercise its level's NEW focus,
    # not only review earlier patterns. >=2 distinct words that practice the level.
    pol_pass = (level == 1) or (len(practice_words) >= 2)
    report["checks"]["practices_own_level"] = {"pass": pol_pass, "type": "soft",
                                               "practice_word_count": len(practice_words),
                                               "examples": sorted(practice_words)[:6]}
    if over_len or ineligible:
        report["hard_fail"] = True
    report["distinct_words"] = len(seen)
    return report

# ---------- self-test ----------

def _run_tests():
    cases = [
        ("cat", 1, True), ("man", 1, True), ("sad", 1, True),
        ("sun", 1, False), ("sun", 3, True),   # short u is L3
        ("dog", 1, False), ("dog", 2, True),   # short o is L2
        ("sit", 1, False), ("sit", 2, True),
        ("bed", 2, False), ("bed", 3, True),
        ("ship", 3, False), ("ship", 4, True),
        ("cake", 5, False), ("cake", 6, True),
        ("rain", 6, False), ("rain", 7, True),
        ("car", 7, False), ("car", 8, True),
        ("cow", 8, True),   # decodable via 'ow' (min level 7); note: /ow/ sound formally L9
        ("the", 1, True),   # heart word
        ("said", 3, False), # heart word not yet introduced (L4)
        ("said", 4, True),
    ]
    passed = 0
    print("== grapheme / decodability tests ==")
    for word, level, expect in cases:
        ok, _ = eligible_at(word, level)
        mark = "ok " if ok == expect else "XX "
        if ok == expect: passed += 1
        else: print(f"  {mark}{word!r} @L{level}: got {ok}, expected {expect}")
    print(f"  {passed}/{len(cases)} cases passed")
    return passed == len(cases)

def _demo_word(word, level):
    ok, detail = decodable_at(word, level)
    print(f"  {word!r} @L{level}: {'DECODABLE' if ok else 'not decodable'}  {detail}")

if __name__ == "__main__":
    if len(sys.argv) == 1:
        all_ok = _run_tests()
        print("\n== segmentation demo ==")
        for w, l in [("splash", 5), ("brave", 6), ("night", 7), ("turn", 8), ("boil", 9)]:
            _demo_word(w, l)
        sample = os.path.join(BASE, "..", "examples", "sample-book-spec.json")
        if os.path.exists(sample):
            print("\n== validate sample book ==")
            rep = validate_book(json.load(open(sample)))
            print(f"  level {rep['level']}, distinct words {rep['distinct_words']}, "
                  f"hard_fail={rep['hard_fail']}")
            for name, c in rep["checks"].items():
                print(f"    {name}: {'PASS' if c['pass'] else 'FAIL ' + str(c['violations'])}")
        sys.exit(0 if all_ok else 1)
    cmd = sys.argv[1]
    if cmd == "word":
        lvl = int(sys.argv[2])
        for w in sys.argv[3:]:
            ok, why = eligible_at(w, lvl)
            print(f"{w}: {'ELIGIBLE' if ok else 'INELIGIBLE'} ({why})")
    elif cmd == "book":
        lvl = int(sys.argv[2])
        spec = json.load(open(sys.argv[3]))
        spec["level"] = lvl
        print(json.dumps(validate_book(spec), indent=2))
