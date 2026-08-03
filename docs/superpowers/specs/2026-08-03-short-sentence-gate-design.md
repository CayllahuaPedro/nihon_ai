# v1.1 — Short-sentence gate on the weak-label function

Status: design, approved (2026-08-03).

Builds on [Phase 0 ETL design](2026-06-18-jlpt-phase0-etl-design.md). The Phase 0 EDA
notebook (`jlpt_weak_labels_eda.ipynb`) found that `oov_rate` is unreliable when a sentence's
vocab frame is tiny — a single OOV word in a 2-token sentence swings the rate by 50%. The
notebook's carry-forward note states the fix directly: **add an `n_content ≥ 3` precondition
to the gate.** This spec implements that precondition; the threshold itself is not re-decided
here.

## 1. Scope

In scope: the `n_content ≥ 3` precondition in `LabelResult.weak_label()`, its test coverage,
and regenerating the two notebook artifacts that depend on the gate
(`weak_labels_labeled.parquet`, `spotcheck_n5n4.csv`).

Out of scope: class rebalancing, the gold eval set, and the logistic-regression baseline —
separate v1.1 sub-projects.

## 2. Design

`LabelResult` already stores `n_content` (trackable/content-word count) alongside `oov_rate`
and `n_in_frame`. `weak_label()` is a pure function of those stored ingredients specifically
so thresholds can be re-decided without re-tokenizing — the same property applies here: the
gate is added as a third parameter, not as a filter upstream in the ETL.

`labeling.py`:

```python
def weak_label(self, tau_oov: float, X: float, min_content: int = 3) -> int:
    if self.n_content < min_content:
        return ABSTAIN
    if self.oov_rate > tau_oov or self.n_in_frame == 0:
        return ABSTAIN
    ...
```

The `n_content` check runs before the OOV check: a sentence too short to judge abstains
regardless of what its (unreliable) OOV rate says.

Module docstring updates from "two numbers, never fused" to reflect the third precondition.

## 3. Testing (TDD)

New test in `test_labeling.py`: a sentence with `n_content < 3` that would otherwise pass
both the OOV gate and coverage threshold must still abstain. Existing tests are unaffected —
their sentences carry `n_content` of 3 or 4, at or above the default.

## 4. Downstream regeneration

The notebook's three `weak_label(TAU, X)` calls (coverage sweep, materialization, spot-check
sample) gain `min_content=3`. Materialization and spot-check cells are re-run so
`weak_labels_labeled.parquet` and `spotcheck_n5n4.csv` reflect the gated pipeline — the
human spot-check review (pending) should judge the final v1.1 output, not the pre-gate one.
