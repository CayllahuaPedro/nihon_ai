"""Labeling function: coverage + OOV gate, two numbers never fused (spec §5, §8).

Synthetic level lookups built from real tokenizer keys, so the tests exercise the actual
identity function but control which words carry which level.
"""

from nihon_ml.jlpt.labeling import ABSTAIN, label_sentence
from nihon_ml.tokenize import OOV_FRAME, TRACKABLE, tokens


def key_of(word):
    t = next(t for t in tokens(word) if t.frame_bucket in (TRACKABLE, OOV_FRAME))
    return t.item_key


def levels(*pairs):
    return {key_of(word): level for word, level in pairs}


def test_cumulative_coverage_picks_lowest_level_at_threshold():
    lv = levels(("猫", 0), ("犬", 0), ("水", 0), ("経済", 2))
    res = label_sentence("猫と犬と水と経済", lv)

    assert res.oov_rate == 0.0
    assert res.n_in_frame == 4
    # 3/4 of in-frame tokens are level<=0 → at X=0.75 the label is N5 (0)
    assert res.weak_label(tau_oov=0.5, X=0.75) == 0
    # need <=2 to reach 0.9 coverage → label rises to N3 (2)
    assert res.weak_label(tau_oov=0.5, X=0.9) == 2


def test_high_oov_trips_the_gate():
    lv = levels(("猫", 0))
    res = label_sentence("東京とパリとロンドンと猫", lv)

    assert res.oov_rate > 0.5
    assert res.weak_label(tau_oov=0.5, X=0.75) == ABSTAIN


def test_single_rare_in_list_word_does_not_inflate_oov():
    # 経済 is a rare/high-level word but it IS in the list → in-frame, never OOV.
    lv = levels(("猫", 0), ("経済", 2), ("食べる", 0))
    res = label_sentence("猫が経済を食べる", lv)

    assert res.oov_rate == 0.0
    assert res.level_counts.get(2, 0) == 1
    assert res.weak_label(tau_oov=0.5, X=0.9) == 2


def test_no_leveled_content_abstains():
    res = label_sentence("東京とパリ", levels())
    assert res.n_in_frame == 0
    assert res.weak_label(tau_oov=0.99, X=0.75) == ABSTAIN


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
