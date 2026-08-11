"""Scoring for the N5/N4 label-quality spot-check — the Phase 0 product gate (spec §7).

The labeling function ships with no model downstream to clean its noise, so human agreement is
a release criterion. This module turns a hand-filled spot-check CSV into a verdict: the exact
agreement rate, which direction the disagreements run, and whether the gate opens. An incomplete
human pass never opens it — partial evidence is not evidence.
"""

from collections.abc import Iterable, Mapping
from dataclasses import dataclass, field

# Ordered easiest -> hardest, so a level's index is its difficulty.
LEVELS = ("n5", "n4", "n3", "n2", "n1")


@dataclass(frozen=True)
class SpotcheckResult:
    n_rows: int
    n_missing: int
    n_scored: int
    n_agree: int
    n_too_hard: int  # weak label harder than the human's
    n_too_easy: int  # weak label easier than the human's
    confusion: dict[tuple[str, str], int] = field(default_factory=dict)

    @property
    def agreement(self) -> float:
        return self.n_agree / self.n_scored if self.n_scored else 0.0

    def passes(self, min_agreement: float) -> bool:
        if self.n_missing or not self.n_scored:
            return False
        return self.agreement >= min_agreement


def _level(value: str, column: str) -> str:
    if value not in LEVELS:
        raise ValueError(f"{column}: unknown JLPT level {value!r} (expected one of {list(LEVELS)})")
    return value


def pending(
    rows: Iterable[Mapping[str, str]], answers: Mapping[str, str]
) -> list[Mapping[str, str]]:
    """Rows still awaiting a human judgment, in sheet order — the resume queue."""
    return [r for r in rows if str(r["sentence_id"]) not in answers]


def merge_human_labels(
    rows: Iterable[Mapping[str, str]], answers: Mapping[str, str]
) -> list[dict[str, str]]:
    """Fold a blind labelling pass back into the spot-check sheet.

    Answers are keyed by sentence_id rather than position so a partial pass merges cleanly.
    An answer with no matching row means the sheet was resampled under the labeller's feet;
    that is raised, never dropped, because silently discarding it would leave the human's
    judgment attached to nothing.
    """
    merged = [dict(r) for r in rows]
    known = {str(r["sentence_id"]) for r in merged}
    for sentence_id in answers:
        if str(sentence_id) not in known:
            raise ValueError(f"answer for unknown sentence_id {sentence_id!r} (sheet resampled?)")

    for row in merged:
        human = answers.get(str(row["sentence_id"]))
        if human is None:
            continue
        row["human_label"] = _level(human, "human_label")
        row["agree"] = "yes" if human == row["weak_label"] else "no"
    return merged


def score_spotcheck(rows: Iterable[Mapping[str, str]]) -> SpotcheckResult:
    n_rows = n_missing = n_agree = n_too_hard = n_too_easy = 0
    confusion: dict[tuple[str, str], int] = {}

    for row in rows:
        n_rows += 1
        human = (row.get("human_label") or "").strip()
        if not human:
            n_missing += 1
            continue

        weak = _level((row.get("weak_label") or "").strip(), "weak_label")
        human = _level(human, "human_label")

        confusion[(weak, human)] = confusion.get((weak, human), 0) + 1
        if weak == human:
            n_agree += 1
        elif LEVELS.index(weak) > LEVELS.index(human):
            n_too_hard += 1
        else:
            n_too_easy += 1

    return SpotcheckResult(
        n_rows=n_rows,
        n_missing=n_missing,
        n_scored=n_rows - n_missing,
        n_agree=n_agree,
        n_too_hard=n_too_hard,
        n_too_easy=n_too_easy,
        confusion=confusion,
    )
