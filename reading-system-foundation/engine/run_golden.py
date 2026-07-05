#!/usr/bin/env python3
"""
Golden regression harness.

Validates every hand-checked 'golden' book against the decoding engine and the
level rules. Run this after any change to the schemas or engine to catch drift.
Exit code 0 iff every golden book passes all HARD checks.

    python3 run_golden.py
"""
import glob, json, os, sys
from decodability import validate_book

BASE = os.path.dirname(os.path.abspath(__file__))
EX = os.path.join(BASE, "..", "examples")

def main():
    paths = sorted(glob.glob(os.path.join(EX, "golden", "*.json")))
    paths.append(os.path.join(EX, "sample-book-spec.json"))  # L3 golden
    all_ok = True
    print(f"{'book':16} {'lvl':>3} {'words':>5} {'sent_len':>8} {'eligible':>8} {'cum_rev':>8} {'own_lvl':>8}")
    print("-" * 66)
    for p in paths:
        spec = json.load(open(p))
        r = validate_book(spec)
        c = r["checks"]
        hard_ok = not r["hard_fail"]
        all_ok &= hard_ok
        print(f"{spec['book_id']:16} {r['level']:>3} {r['distinct_words']:>5} "
              f"{('PASS' if c['sentence_length']['pass'] else 'FAIL'):>8} "
              f"{('PASS' if c['word_eligibility']['pass'] else 'FAIL'):>8} "
              f"{str(c['cumulative_review']['below_level_ratio']):>8} "
              f"{('PASS' if c['practices_own_level']['pass'] else 'warn'):>8}")
        if not hard_ok:
            for name, chk in c.items():
                if not chk["pass"] and chk.get("type") != "soft":
                    print(f"    HARD FAIL {name}: {chk.get('violations')}")
    print("-" * 66)
    print("ALL GOLDEN BOOKS PASS" if all_ok else "REGRESSION: a golden book failed a hard check")
    return 0 if all_ok else 1

if __name__ == "__main__":
    sys.exit(main())
