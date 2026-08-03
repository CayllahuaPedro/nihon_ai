"""Shared tokenization identity for Nihon AI (spec §3).

One canonical key per content item — `item_key(node) -> "lemma|reading|POS"` over fugashi +
UniDic — plus a three-way frame bucket used by the OOV gate. Every module derives identity here;
none re-implements it.
"""

from dataclasses import dataclass

import fugashi

TRACKABLE = "trackable"
OOV_FRAME = "oov_frame"
IGNORE = "ignore"

# Content POS that the learner model tracks (spec §3).
_TRACKABLE_POS1 = {"名詞", "動詞", "形容詞", "形状詞", "副詞", "連体詞", "接続詞", "感動詞"}
# Not tracked, but inside the vocab frame so they count toward the OOV gate.
_OOV_FRAME_POS2 = {"固有名詞", "数詞"}

# UniDic lemma of する; suru-fusion targets it (the surface verb reads 為る as its lemma).
_SURU_LEMMA = "為る"

_tagger = fugashi.Tagger()


@dataclass(frozen=True)
class Token:
    surface: str
    item_key: str
    pos1: str
    frame_bucket: str


def item_key(node) -> str:
    f = node.feature
    return f"{f.lemma}|{f.lForm}|{f.pos1}"


def _bucket(pos1: str, pos2: str) -> str:
    if pos2 in _OOV_FRAME_POS2:
        return OOV_FRAME
    if pos1 in _TRACKABLE_POS1:
        return TRACKABLE
    return IGNORE


def _is_fusable_noun(node) -> bool:
    f = node.feature
    return f.pos1 == "名詞" and f.pos2 not in _OOV_FRAME_POS2


def _is_suru(node) -> bool:
    f = node.feature
    return f.pos1 == "動詞" and f.lemma == _SURU_LEMMA


def tokens(text: str) -> list[Token]:
    raw = list(_tagger(text))
    out: list[Token] = []
    i = 0
    while i < len(raw):
        node = raw[i]
        if _is_fusable_noun(node) and i + 1 < len(raw) and _is_suru(raw[i + 1]):
            f = node.feature
            out.append(
                Token(
                    surface=node.surface + raw[i + 1].surface,
                    item_key=f"{f.lemma}する|{f.lForm}スル|動詞",
                    pos1="動詞",
                    frame_bucket=TRACKABLE,
                )
            )
            i += 2
            continue
        f = node.feature
        out.append(
            Token(
                surface=node.surface,
                item_key=item_key(node),
                pos1=f.pos1,
                frame_bucket=_bucket(f.pos1, f.pos2),
            )
        )
        i += 1
    return out
