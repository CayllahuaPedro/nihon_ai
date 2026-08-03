"""JLPT list ingestion (spec §4).

Tanos lists give surface + reading but no POS, so a naive lookup would miss conjugations and
fail to split homographs. The fix: run every headword through the *same* fugashi pipeline as the
corpus to derive its item_key, keeping one identity function across list and text. Headwords that
don't resolve to a single content token are skipped (and counted upstream, not silently dropped).
"""

import csv
import pathlib

from nihon_ml.tokenize import TRACKABLE, tokens

_LEVEL_FILES = {"n5": 0, "n4": 1, "n3": 2, "n2": 3, "n1": 4}


def headword_to_item_key(surface: str) -> str | None:
    content = [t for t in tokens(surface) if t.frame_bucket == TRACKABLE]
    if len(content) != 1:
        return None
    return content[0].item_key


def load_jlpt_levels(csv_dir: pathlib.Path) -> dict[str, int]:
    levels: dict[str, int] = {}
    for stem, level in _LEVEL_FILES.items():
        path = pathlib.Path(csv_dir) / f"{stem}.csv"
        if not path.exists():
            continue
        with path.open(encoding="utf-8") as f:
            for row in csv.DictReader(f):
                key = row["item_key"]
                # A key can appear across lists (homograph, or fugashi collapsing two
                # surfaces to one lemma). It's known as soon as its easiest level is reached,
                # so the minimum level wins — never inflate difficulty by taking a later list.
                prev = levels.get(key)
                if prev is None or level < prev:
                    levels[key] = level
    return levels
