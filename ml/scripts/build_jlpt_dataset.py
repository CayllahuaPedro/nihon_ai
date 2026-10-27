"""Weak-label ETL: Tatoeba JP + JLPT labeling function → weak_labels.parquet (spec §6).

Stores *ingredients, not a frozen label* — per-sentence oov_rate and per-level token counts —
so the EDA can sweep (tau_oov, X) without re-tokenizing. The label column is materialized later,
once the notebook decides the thresholds.

Usage:
    python scripts/build_jlpt_dataset.py            # full corpus
    python scripts/build_jlpt_dataset.py --limit 5000
"""

import argparse
import csv
import json
import pathlib
import sys

import pandas as pd

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from nihon_ml.jlpt.labeling import label_sentence
from nihon_ml.jlpt.lists import load_jlpt_levels

_DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
_TATOEBA = _DATA / "raw" / "tatoeba_jpn.tsv"
_LISTS = _DATA / "jlpt" / "lists"
_OUT = _DATA / "jlpt" / "weak_labels.parquet"
_STATS = _DATA / "jlpt" / "stats.json"


def _read_sentences(limit: int | None):
    with _TATOEBA.open(encoding="utf-8") as f:
        for i, row in enumerate(csv.reader(f, delimiter="\t")):
            if limit is not None and i >= limit:
                return
            if len(row) >= 2 and row[1].strip():
                yield row[0], row[1].strip()


def build(limit: int | None) -> pd.DataFrame:
    levels = load_jlpt_levels(_LISTS)
    if not levels:
        sys.exit(f"no JLPT lists under {_LISTS} — run fetch_jlpt_lists.py first")

    records = []
    for sid, text in _read_sentences(limit):
        r = label_sentence(text, levels)
        records.append(
            {
                "sentence_id": sid,
                "text": text,
                "n_content": r.n_content,
                "n_in_frame": r.n_in_frame,
                "oov_rate": r.oov_rate,
                "n5_count": r.level_counts.get(0, 0),
                "n4_count": r.level_counts.get(1, 0),
                "n3_count": r.level_counts.get(2, 0),
                "n2_count": r.level_counts.get(3, 0),
                "n1_count": r.level_counts.get(4, 0),
            }
        )
    return pd.DataFrame.from_records(records)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    df = build(args.limit)
    _OUT.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(_OUT, index=False)

    has_frame = df["n_in_frame"] > 0
    stats = {
        "corpus": "tatoeba jpn (CC-BY 2.0 FR)",
        "n_sentences": len(df),
        "n_with_no_content": int((df["n_content"] == 0).sum()),
        "n_with_in_frame_tokens": int(has_frame.sum()),
        "oov_rate": {
            "mean": float(df["oov_rate"].mean()),
            "std": float(df["oov_rate"].std()),
            "median": float(df["oov_rate"].median()),
        },
        "jlpt_list_items": len(load_jlpt_levels(_LISTS)),
    }
    _STATS.write_text(json.dumps(stats, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {len(df)} rows -> {_OUT}")
    print(json.dumps(stats, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
