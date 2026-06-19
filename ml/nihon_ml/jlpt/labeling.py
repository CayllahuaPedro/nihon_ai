"""Weak JLPT labeling: coverage + OOV gate (spec §5).

Two numbers, never fused: an OOV rate that gates whether the sentence is even inside the JLPT
frame, and — only if the gate passes — a level from cumulative coverage over the in-frame tokens.
`LabelResult` stores the *ingredients*; `weak_label(tau_oov, X)` is a pure function of them, so a
threshold can be re-decided without re-tokenizing.
"""

from dataclasses import dataclass, field

from nihon_ml.tokenize import OOV_FRAME, TRACKABLE, tokens

# Sentinel level: sentence is outside the JLPT frame / has no confident label.
ABSTAIN = -1

_N_LEVELS = 5  # N5=0 … N1=4


@dataclass(frozen=True)
class LabelResult:
    oov_rate: float
    n_content: int  # trackable tokens (content words)
    n_in_frame: int  # trackable tokens that carry a JLPT level
    level_counts: dict[int, int] = field(default_factory=dict)

    def weak_label(self, tau_oov: float, X: float) -> int:
        if self.oov_rate > tau_oov or self.n_in_frame == 0:
            return ABSTAIN
        cumulative = 0
        for level in range(_N_LEVELS):
            cumulative += self.level_counts.get(level, 0)
            if cumulative / self.n_in_frame >= X:
                return level
        return _N_LEVELS - 1


def label_sentence(text: str, levels: dict[str, int]) -> LabelResult:
    vocab_frame = [t for t in tokens(text) if t.frame_bucket in (TRACKABLE, OOV_FRAME)]
    trackable = [t for t in vocab_frame if t.frame_bucket == TRACKABLE]

    n_oov = sum(1 for t in vocab_frame if t.item_key not in levels)
    oov_rate = n_oov / len(vocab_frame) if vocab_frame else 0.0

    level_counts: dict[int, int] = {}
    n_in_frame = 0
    for t in trackable:
        level = levels.get(t.item_key)
        if level is None:
            continue
        level_counts[level] = level_counts.get(level, 0) + 1
        n_in_frame += 1

    return LabelResult(
        oov_rate=oov_rate,
        n_content=len(trackable),
        n_in_frame=n_in_frame,
        level_counts=level_counts,
    )
