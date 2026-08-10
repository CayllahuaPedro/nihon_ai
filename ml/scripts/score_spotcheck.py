"""Score the hand-filled N5/N4 spot-check and report the Phase 0 product gate verdict.

Usage:
    python scripts/score_spotcheck.py [--csv data/jlpt/spotcheck_n5n4.csv] [--min-agreement 0.85]

Exits non-zero when the gate does not open, so it can be wired into CI later.
"""

import argparse
import csv
import pathlib
import sys

from nihon_ml.jlpt.spotcheck import LEVELS, score_spotcheck

DEFAULT_CSV = pathlib.Path(__file__).resolve().parents[1] / "data/jlpt/spotcheck_n5n4.csv"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", type=pathlib.Path, default=DEFAULT_CSV)
    parser.add_argument("--min-agreement", type=float, default=0.85)
    args = parser.parse_args()

    with args.csv.open(encoding="utf-8") as f:
        res = score_spotcheck(list(csv.DictReader(f)))

    print(f"spot-check: {args.csv}")
    print(f"  rows            {res.n_rows}")
    print(f"  human-labeled   {res.n_scored}")
    print(f"  unlabeled       {res.n_missing}")

    if res.n_scored:
        print(f"\n  agreement       {res.agreement:.1%}  ({res.n_agree}/{res.n_scored})")
        print(f"  weak too hard   {res.n_too_hard}")
        print(f"  weak too easy   {res.n_too_easy}")

        print("\n  confusion (rows = weak label, cols = human label)")
        print("        " + "".join(f"{l:>6}" for l in LEVELS))
        for weak in LEVELS:
            counts = [res.confusion.get((weak, human), 0) for human in LEVELS]
            if any(counts):
                print(f"    {weak:<4}" + "".join(f"{c:>6}" for c in counts))

    if res.n_missing:
        print(f"\nGATE: NOT EVALUATED — {res.n_missing} sentence(s) still need a human label.")
        return 1

    verdict = "OPEN" if res.passes(args.min_agreement) else "CLOSED"
    print(f"\nGATE: {verdict} — {res.agreement:.1%} vs required {args.min_agreement:.0%}.")
    if verdict == "CLOSED":
        print("Fallback (spec §4): relax lookup keying to (lemma, reading) without POS,")
        print("or narrow the shipped range to the bands that clear the bar.")
    return 0 if verdict == "OPEN" else 1


if __name__ == "__main__":
    sys.exit(main())
