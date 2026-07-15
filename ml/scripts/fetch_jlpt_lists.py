"""Fetch + normalize the Tanos JLPT vocab lists into per-level CSVs keyed by item_key (spec §4).

Source: Jonathan Waller's JLPT resources (https://www.tanos.co.uk/jlpt/) — the reconstructed
N5–N1 vocab lists, shipped as old-Anki (SQLite) decks. Each headword is run through the SAME
fugashi pipeline as the corpus (`headword_to_item_key`), so list and text share one identity.

LICENSE / DISTRIBUTION (spec §9): the raw decks are third-party and stay gitignored under
`data/`. This script documents how to fetch them; only the normalized derived CSV may be
committed if the source license permits — by default nothing under data/ is committed.

Usage:
    python scripts/fetch_jlpt_lists.py            # all levels
    python scripts/fetch_jlpt_lists.py --levels 5 # just N5, for a quick check
"""

import argparse
import csv
import json
import pathlib
import sqlite3
import sys
import urllib.request
from collections import defaultdict

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from nihon_ml.jlpt.lists import headword_to_item_key  # noqa: E402

_DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
_RAW = _DATA / "raw" / "jlpt"
_OUT = _DATA / "jlpt" / "lists"
_UA = {"User-Agent": "Mozilla/5.0 (nihon-ai fetch_jlpt_lists)"}

# Tanos level n -> output ordinal (N5=0 … N1=4, easiest→hardest).
_LEVEL_ORDINAL = {5: 0, 4: 1, 3: 2, 2: 3, 1: 4}
# The kanji+hiragana deck is the one filename that exists for every level N5-N1
# (the -eng-hiragana variant only exists for N5). Fields are Front=surface, Back=reading.
_URL = "http://www.tanos.co.uk/jlpt/jlpt{n}/vocab/n{n}-vocab-kanji-hiragana.anki"
_HEADER = ["item_key", "lemma", "reading", "pos", "level", "source_surface", "source_reading"]


def _download(n: int) -> pathlib.Path:
    _RAW.mkdir(parents=True, exist_ok=True)
    dest = _RAW / f"n{n}-vocab.anki"
    if not dest.exists():
        req = urllib.request.Request(_URL.format(n=n), headers=_UA)
        with urllib.request.urlopen(req, timeout=30) as r:
            dest.write_bytes(r.read())
    return dest


def _extract_vocab(db_path: pathlib.Path) -> list[tuple[str, str]]:
    """Return (surface, source_reading) per fact from the old-Anki SQLite deck."""
    con = sqlite3.connect(db_path)
    try:
        name_by_fm = dict(con.execute("select id, name from fieldModels"))
        by_fact: dict[int, dict[str, str]] = defaultdict(dict)
        for fact_id, fm_id, value in con.execute(
            "select factId, fieldModelId, value from fields"
        ):
            by_fact[fact_id][name_by_fm.get(fm_id, "")] = value
    finally:
        con.close()
    rows = []
    for fields in by_fact.values():
        surface = (fields.get("Expression") or fields.get("Front") or "").strip()
        reading = (fields.get("Hiragana") or fields.get("Back") or "").strip()
        if surface:
            rows.append((surface, reading))
    return rows


def _normalize_level(n: int) -> dict:
    raw = _extract_vocab(_download(n))
    ordinal = _LEVEL_ORDINAL[n]
    _OUT.mkdir(parents=True, exist_ok=True)
    out_path = _OUT / f"n{n}.csv"

    seen: set[str] = set()
    kept = skipped = 0
    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(_HEADER)
        for surface, source_reading in raw:
            key = headword_to_item_key(surface)
            if key is None:
                skipped += 1
                continue
            if key in seen:
                continue
            seen.add(key)
            lemma, reading, pos = key.split("|")
            writer.writerow([key, lemma, reading, pos, ordinal, surface, source_reading])
            kept += 1
    return {"level": f"n{n}", "ordinal": ordinal, "headwords": len(raw),
            "kept": kept, "skipped_multitoken": skipped, "csv": str(out_path)}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--levels", type=int, nargs="*", default=[5, 4, 3, 2, 1])
    args = ap.parse_args()

    stats = [_normalize_level(n) for n in args.levels]
    (_OUT / "stats.json").write_text(
        json.dumps({"source": "tanos.co.uk JLPT vocab (reconstructed N5-N1)", "levels": stats},
                   ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    for s in stats:
        rate = s["skipped_multitoken"] / s["headwords"] if s["headwords"] else 0
        print(f"{s['level']}: {s['kept']} kept, {s['skipped_multitoken']} skipped "
              f"({rate:.1%} multi-token) -> {s['csv']}")


if __name__ == "__main__":
    main()
