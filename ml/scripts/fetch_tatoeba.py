"""Fetch the Tatoeba Japanese sentence dump (CC-BY 2.0 FR) → data/raw/tatoeba_jpn.tsv (spec §6).

Source: https://tatoeba.org — the per-language sentence export. Sentences are CC-BY 2.0 FR;
attribution is written to a sidecar so the derived dataset can credit the source.

Usage:
    python scripts/fetch_tatoeba.py          # download + extract if missing
    python scripts/fetch_tatoeba.py --force  # re-download
"""

import argparse
import bz2
import csv
import pathlib
import urllib.request

_DATA = pathlib.Path(__file__).resolve().parents[1] / "data"
_RAW = _DATA / "raw"
_OUT = _RAW / "tatoeba_jpn.tsv"
_ATTR = _RAW / "tatoeba_jpn.ATTRIBUTION.txt"
_URL = "https://downloads.tatoeba.org/exports/per_language/jpn/jpn_sentences.tsv.bz2"
_UA = {"User-Agent": "Mozilla/5.0 (nihon-ai fetch_tatoeba)"}

_ATTRIBUTION = """\
Japanese sentences sourced from Tatoeba (https://tatoeba.org).
Licensed CC-BY 2.0 FR (https://creativecommons.org/licenses/by/2.0/fr/).
Export: per_language/jpn/jpn_sentences.tsv.bz2
Columns in tatoeba_jpn.tsv: sentence_id<TAB>text
Redistribution note: raw dump stays gitignored under data/; only derived, aggregate
statistics are committed. Attribution retained per the license.
"""


def fetch(force: bool = False) -> pathlib.Path:
    _RAW.mkdir(parents=True, exist_ok=True)
    if _OUT.exists() and not force:
        return _OUT
    req = urllib.request.Request(_URL, headers=_UA)
    with urllib.request.urlopen(req, timeout=120) as r:
        raw = bz2.decompress(r.read())
    kept = 0
    with _OUT.open("w", encoding="utf-8", newline="") as out:
        w = csv.writer(out, delimiter="\t")
        for row in csv.reader(raw.decode("utf-8").splitlines(), delimiter="\t"):
            if len(row) >= 3 and row[1] == "jpn":
                w.writerow([row[0], row[2]])
                kept += 1
    _ATTR.write_text(_ATTRIBUTION, encoding="utf-8")
    print(f"tatoeba: {kept} jpn sentences -> {_OUT}")
    return _OUT


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()
    fetch(force=args.force)


if __name__ == "__main__":
    main()
