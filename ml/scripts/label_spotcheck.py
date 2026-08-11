"""Blind labelling pass over the N5/N4 spot-check — the human half of the Phase 0 gate.

One sentence at a time, with the weak label hidden. The accept criterion says "decide before
looking", so showing the labelling function's answer next to the sentence would anchor the
judgment and inflate agreement. Answers land in their own file, so the pass is resumable and
the source sheet stays untouched until the pass is complete.

    python scripts/label_spotcheck.py

What you are judging is VOCABULARY, not grammar: at what JLPT level do you know essentially
all of this sentence's content words? Grammar is a separate axis and must not leak in.

    5   the content words are all N5
    4   at least one content word needs N4
    s   skip for now (comes back at the end)
    u   undo the previous answer
    q   save and quit
"""

import argparse
import csv
import pathlib
import sys
import termios
import tty

from nihon_ml.jlpt.spotcheck import merge_human_labels, pending, score_spotcheck

DATA = pathlib.Path(__file__).resolve().parents[1] / "data/jlpt"
DEFAULT_SHEET = DATA / "spotcheck_n5n4.csv"
DEFAULT_ANSWERS = DATA / "spotcheck_human.csv"

KEYS = {"5": "n5", "4": "n4"}


def read_key() -> str:
    fd = sys.stdin.fileno()
    saved = termios.tcgetattr(fd)
    try:
        tty.setraw(fd)
        return sys.stdin.read(1)
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, saved)


def load_answers(path: pathlib.Path) -> tuple[dict[str, str], list[str]]:
    if not path.exists():
        return {}, []
    with path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    answers = {r["sentence_id"]: r["human_label"] for r in rows}
    return answers, [r["sentence_id"] for r in rows]


def save_answers(path: pathlib.Path, answers: dict[str, str], order: list[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["sentence_id", "human_label"])
        writer.writerows([sid, answers[sid]] for sid in order)


def prompt(row: dict[str, str], done: int, total: int) -> None:
    print("\n" + "─" * 72)
    print(f"  {done}/{total} labelled\n")
    print(f"    {row['text']}\n")
    print("  [5] n5   [4] n4   [s] skip   [u] undo   [q] save & quit")


def run(sheet_path: pathlib.Path, answers_path: pathlib.Path, min_agreement: float) -> int:
    with sheet_path.open(encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    total = len(rows)
    answers, order = load_answers(answers_path)

    print(__doc__.split("    python")[0].strip())

    cursor = 0
    while True:
        todo = pending(rows, answers)
        if not todo:
            break
        cursor = min(cursor, len(todo) - 1)
        row = todo[cursor]
        prompt(row, len(answers), total)

        key = read_key().lower()
        if key in ("q", "\x03"):
            break
        if key in KEYS:
            answers[row["sentence_id"]] = KEYS[key]
            order.append(row["sentence_id"])
            save_answers(answers_path, answers, order)
        elif key == "s":
            cursor = (cursor + 1) % len(todo)
        elif key == "u" and order:
            undone = order.pop()
            del answers[undone]
            save_answers(answers_path, answers, order)
            cursor = next(
                (i for i, r in enumerate(pending(rows, answers)) if r["sentence_id"] == undone),
                0,
            )

    remaining = len(pending(rows, answers))
    print(f"\n\n{len(answers)}/{total} labelled -> {answers_path}")
    if remaining:
        print(f"{remaining} left. Re-run this script to pick up where you stopped.")
        return 1

    merged = merge_human_labels(rows, answers)
    with sheet_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(merged[0]))
        writer.writeheader()
        writer.writerows(merged)
    print(f"merged into {sheet_path}\n")

    res = score_spotcheck(merged)
    print(f"agreement {res.agreement:.1%} ({res.n_agree}/{res.n_scored})")
    print(f"weak too hard {res.n_too_hard} | weak too easy {res.n_too_easy}")
    verdict = "OPEN" if res.passes(min_agreement) else "CLOSED"
    print(f"\nGATE: {verdict} — required {min_agreement:.0%}.")
    print("Run scripts/score_spotcheck.py for the full confusion matrix.")
    return 0 if verdict == "OPEN" else 1


def main() -> int:
    parser = argparse.ArgumentParser(description="Blind spot-check labelling pass.")
    parser.add_argument("--sheet", type=pathlib.Path, default=DEFAULT_SHEET)
    parser.add_argument("--answers", type=pathlib.Path, default=DEFAULT_ANSWERS)
    parser.add_argument("--min-agreement", type=float, default=0.85)
    args = parser.parse_args()
    return run(args.sheet, args.answers, args.min_agreement)


if __name__ == "__main__":
    sys.exit(main())
