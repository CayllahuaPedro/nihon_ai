# Short-Sentence Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `n_content ≥ 3` precondition to `LabelResult.weak_label()` so sentences too
short for a reliable OOV read abstain instead of getting a noisy label, then regenerate the
notebook artifacts that depend on it.

**Architecture:** `weak_label()` stays a pure function of `LabelResult`'s stored ingredients
(`oov_rate`, `n_in_frame`, `n_content`) — a `min_content` parameter is added alongside the
existing `tau_oov`/`X` parameters, checked first. No re-tokenization, no ETL changes.

**Tech Stack:** Python 3.11, pytest, Jupyter (`ml/.venv`).

## Global Constraints

- `weak_label()` remains a pure function of `LabelResult` fields only — no new I/O, no re-tokenizing.
- Default `min_content=3` (the decided threshold from `docs/superpowers/specs/2026-08-03-short-sentence-gate-design.md`) — not re-derived here.
- All commands below run from `/home/peter/projects/nihon_ai/ml` using `.venv/bin/`.

---

### Task 1: `n_content` gate in `weak_label()`

**Files:**
- Modify: `ml/nihon_ml/jlpt/labeling.py:1-34`
- Test: `ml/tests/test_labeling.py`

**Interfaces:**
- Consumes: `LabelResult.n_content: int` (already exists, unchanged).
- Produces: `LabelResult.weak_label(self, tau_oov: float, X: float, min_content: int = 3) -> int` — same return type (`int`, `ABSTAIN = -1` sentinel) as before; callers that already call `weak_label(tau, X)` positionally keep working unchanged.

- [ ] **Step 1: Write the failing test**

Add to `ml/tests/test_labeling.py` (after `test_no_leveled_content_abstains`):

```python
def test_short_sentence_below_min_content_abstains():
    # 猫 alone: oov_rate=0.0, n_in_frame=1 -> would pass tau_oov=0.5 easily,
    # but n_content=1 < the default min_content=3, so it must still abstain.
    lv = levels(("猫", 0))
    res = label_sentence("猫", lv)

    assert res.n_content == 1
    assert res.oov_rate == 0.0
    assert res.weak_label(tau_oov=0.5, X=0.75) == ABSTAIN
    # Explicit min_content=0 disables the gate, confirming it's a real precondition
    # and not an accidental side effect of another check.
    assert res.weak_label(tau_oov=0.5, X=0.75, min_content=0) == 0
```

- [ ] **Step 2: Run test to verify it fails**

Run: `.venv/bin/pytest tests/test_labeling.py::test_short_sentence_below_min_content_abstains -v`
Expected: FAIL — `TypeError: weak_label() got an unexpected keyword argument 'min_content'`

- [ ] **Step 3: Implement the gate**

In `ml/nihon_ml/jlpt/labeling.py`, replace the `weak_label` method (lines 26-34):

```python
    def weak_label(self, tau_oov: float, X: float, min_content: int = 3) -> int:
        if self.n_content < min_content:
            return ABSTAIN
        if self.oov_rate > tau_oov or self.n_in_frame == 0:
            return ABSTAIN
        cumulative = 0
        for level in range(_N_LEVELS):
            cumulative += self.level_counts.get(level, 0)
            if cumulative / self.n_in_frame >= X:
                return level
        return _N_LEVELS - 1
```

- [ ] **Step 4: Run the new test to verify it passes**

Run: `.venv/bin/pytest tests/test_labeling.py::test_short_sentence_below_min_content_abstains -v`
Expected: PASS

- [ ] **Step 5: Run the full test file to confirm no regressions**

Run: `.venv/bin/pytest tests/test_labeling.py -v`
Expected: all 5 tests PASS (the 4 pre-existing tests use `n_content` of 3 or 4, at or above the default `min_content=3`, so their outcomes are unchanged).

- [ ] **Step 6: Update the module docstring**

In `ml/nihon_ml/jlpt/labeling.py`, replace the module docstring (lines 1-7):

```python
"""Weak JLPT labeling: coverage + OOV gate, gated further by sentence length (spec §5, v1.1
short-sentence gate).

Three numbers, never fused: an OOV rate that gates whether the sentence is even inside the JLPT
frame, a content-word count that gates whether the sentence is even long enough to judge, and —
only if both gates pass — a level from cumulative coverage over the in-frame tokens.
`LabelResult` stores the *ingredients*; `weak_label(tau_oov, X, min_content)` is a pure function
of them, so a threshold can be re-decided without re-tokenizing.
"""
```

- [ ] **Step 7: Run the full test suite**

Run: `.venv/bin/pytest -v`
Expected: all tests across `test_labeling.py`, `test_lists.py`, `test_tokenize.py` PASS.

- [ ] **Step 8: Commit**

```bash
git add ml/nihon_ml/jlpt/labeling.py ml/tests/test_labeling.py
git commit -m "feat(jlpt): add n_content>=3 gate to weak_label"
```

---

### Task 2: Regenerate notebook-dependent artifacts

**Files:**
- Modify: `ml/notebooks/jlpt_weak_labels_eda.ipynb`
- Regenerate: `ml/data/jlpt/weak_labels_labeled.parquet`, `ml/data/jlpt/spotcheck_n5n4.csv`

**Interfaces:**
- Consumes: `LabelResult.weak_label(tau_oov, X, min_content=3)` from Task 1.
- Produces: no new interfaces — these are data artifacts, not code.

- [ ] **Step 1: Update the three `weak_label` call sites in the notebook**

Open `ml/notebooks/jlpt_weak_labels_eda.ipynb` and update each of the three cells that call
`weak_label(TAU, X)` (or `weak_label(0.40, 0.80)`) to pass `min_content=3` explicitly, e.g.:

```python
lab = weak_label(TAU, X, min_content=3)
```

and

```python
lab = weak_label(0.40, 0.80, min_content=3)
```

This is an explicit, documented value — even though it's the default, the notebook's job is
to record decisions, so the gate parameter should be visible at each call site rather than
implied.

- [ ] **Step 2: Re-execute the notebook in place**

Run: `.venv/bin/jupyter nbconvert --to notebook --execute --inplace notebooks/jlpt_weak_labels_eda.ipynb`
Expected: exits 0, no cell errors. This overwrites `ml/data/jlpt/weak_labels_labeled.parquet`
and `ml/data/jlpt/spotcheck_n5n4.csv` (the materialization and spot-check-sample cells write
these files as a side effect).

- [ ] **Step 3: Confirm the gate visibly changed the output**

Run:

```bash
.venv/bin/python -c "
import json
nb = json.load(open('notebooks/jlpt_weak_labels_eda.ipynb'))
for c in nb['cells']:
    if c['cell_type'] == 'code' and any('abstention rate' in s for s in c.get('source', [])):
        for out in c.get('outputs', []):
            print(''.join(out.get('text', [])))
"
```

Expected: prints `abstention rate: NN.N%` where `NN.N% >= 20%` — the pre-gate rate was ~20%,
and the new `n_content` gate can only add abstentions, never remove them.

- [ ] **Step 4: Spot-check the regenerated CSV**

Run: `.venv/bin/python -c "import pandas as pd; df = pd.read_csv('data/jlpt/spotcheck_n5n4.csv'); print(len(df)); print(df.columns.tolist())"`
Expected: 60 rows, columns `sentence_id, text, oov_rate, weak_label, human_label, agree` — same
shape as before, content resampled under the gated pipeline.

- [ ] **Step 5: Commit**

```bash
git add ml/notebooks/jlpt_weak_labels_eda.ipynb ml/data/jlpt/weak_labels_labeled.parquet ml/data/jlpt/spotcheck_n5n4.csv
git commit -m "chore(jlpt): regenerate weak-label artifacts under n_content>=3 gate"
```
