# Nihon AI — ML

The vocabulary-difficulty estimator: data ETL, the weak-labeling function, and the Phase 0
evaluation gate. Separate from `backend/` because research has a different lifecycle than serving.

**Nothing here is in the request path.** The backend does not import `nihon_ml`; `/classify` is a
stub. This unit produces a dataset and a decision, not a served model.

## Layout

```
nihon_ml/            # the importable package
├── tokenize.py      # fugashi + UniDic; OOV frame classification
└── jlpt/
    ├── lists.py     # JLPT list loading, item_key normalization
    ├── labeling.py  # the gates + the label function
    └── spotcheck.py # agreement scoring for the hand-labelled set
scripts/             # the pipeline, in order
data/                # git-ignored: raw dumps + derived parquet/csv
notebooks/           # exploration, error analysis
tests/               # 25 tests
```

## Dev

```bash
python -m venv .venv
.venv/bin/pip install -e ".[dev]"
.venv/bin/pytest          # 25 tests, no network, no GPU
```

## Pipeline

Run in this order. Every step is resumable and skips work already on disk.

```bash
python scripts/fetch_jlpt_lists.py      # Tanos JLPT decks → per-level CSVs keyed by item_key
python scripts/fetch_tatoeba.py         # Tatoeba JP dump → data/raw/tatoeba_jpn.tsv
python scripts/build_jlpt_dataset.py    # weak-label ETL → data/jlpt/weak_labels.parquet
python scripts/label_spotcheck.py       # blind human labelling, one sentence at a time
python scripts/score_spotcheck.py       # Phase 0 gate verdict; exits non-zero when it fails
```

Current corpus: **248,802 Tatoeba sentences**, labeled against **6,315** JLPT list items
(`data/jlpt/stats.json`).

## The labeling function

Three numbers are computed and **never fused** (`nihon_ml/jlpt/labeling.py`):

1. **OOV rate** — gates whether the sentence is inside the JLPT frame at all.
2. **Content-word count** — gates whether the sentence is long enough to judge.
3. **Level** — only if both gates pass, cumulative coverage over the in-frame tokens.

When a gate fails the function returns `ABSTAIN` (`-1`) rather than the nearest level. A guessed
label is worse than no label: downstream it is indistinguishable from a real answer.

`LabelResult` stores the **ingredients** — `oov_rate`, `n_content`, per-level counts — and
`weak_label(tau_oov, X, min_content)` is a pure function of them. Thresholds can be re-decided
without re-tokenizing the corpus. That is why the ETL writes ingredients and not a frozen label
column.

### The gate was re-decided once

The original criterion was a flat "abstention ≤ ~25% across the corpus". That averaged two
different refusals — high-OOV text and sentences too short to judge — and hid both. It was
replaced with **≤ 20% refusal on judgeable-length sentences (`n_content >= 3`)**.
See `docs/superpowers/specs/2026-08-03-short-sentence-gate-design.md`.

## Spot-check

The human half of the gate. `label_spotcheck.py` shows one sentence at a time **with the weak
label hidden** — the criterion says "decide before looking", and showing the machine's answer next
to the sentence would anchor the judgment and inflate agreement. Answers land in their own file,
so the pass is resumable.

**Status: in progress — 36 of 60 sentences labelled.** `score_spotcheck.py` reports agreement and
exits non-zero when the gate does not open, so it can be wired into CI later.

## Licensing of the data

The raw JLPT decks are third-party and stay git-ignored under `data/`; only normalized derived
CSVs are committed. Tatoeba sentences are CC-BY 2.0 FR and the fetch script writes an attribution
sidecar so the derived dataset can credit the source.

## Roadmap

A fine-tuned `cl-tohoku/bert-base-japanese-v3` classifier, to generalize past the lookup teacher.
It lives behind the optional `bert` extra so the default install stays CPU-only and light.
**Not built, not trained, not published.** When it exists, the backend would pull it — today
nothing does.
