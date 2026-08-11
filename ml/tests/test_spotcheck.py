import pytest

from nihon_ml.jlpt.spotcheck import (
    SpotcheckResult,
    merge_human_labels,
    pending,
    score_spotcheck,
)

LEVELS = ["n5", "n4", "n3", "n2", "n1"]


def rows(*pairs):
    return [{"weak_label": w, "human_label": h} for w, h in pairs]


def sheet(*triples):
    return [
        {"sentence_id": sid, "text": text, "weak_label": weak, "human_label": "", "agree": ""}
        for sid, text, weak in triples
    ]


def test_agreement_is_exact_match_rate():
    res = score_spotcheck(rows(("n5", "n5"), ("n4", "n4"), ("n5", "n4"), ("n4", "n4")))

    assert res.n_scored == 4
    assert res.n_agree == 3
    assert res.agreement == 0.75


def test_unlabeled_rows_are_reported_not_scored():
    # A blank human_label is a gap in the human pass, never a disagreement — counting it
    # as one would understate agreement and fail the gate for work that was never done.
    res = score_spotcheck(rows(("n5", "n5"), ("n4", ""), ("n5", "  ")))

    assert res.n_missing == 2
    assert res.n_scored == 1
    assert res.agreement == 1.0


def test_disagreement_direction_is_separated():
    # Which way the labeling function is wrong decides the fix: systematically too easy
    # points at list gaps, systematically too hard at the coverage parameter X.
    res = score_spotcheck(rows(("n4", "n5"), ("n4", "n5"), ("n5", "n4"), ("n5", "n5")))

    assert res.n_too_hard == 2
    assert res.n_too_easy == 1


def test_verdict_reads_the_accept_criterion():
    passing = score_spotcheck(rows(*[("n5", "n5")] * 17, ("n5", "n4"), ("n4", "n4"), ("n4", "n4")))
    failing = score_spotcheck(rows(*[("n5", "n5")] * 16, *[("n5", "n4")] * 4))

    assert passing.agreement == 0.95
    assert passing.passes(min_agreement=0.85)
    assert failing.agreement == 0.80
    assert not failing.passes(min_agreement=0.85)


def test_incomplete_human_pass_cannot_pass_the_gate():
    # 100% agreement on 2 of 60 sentences is not evidence — the gate stays closed until
    # the pass is complete, otherwise a half-finished review reads as a release approval.
    res = score_spotcheck(rows(("n5", "n5"), ("n4", "n4"), *[("n5", "")] * 58))

    assert res.agreement == 1.0
    assert not res.passes(min_agreement=0.85)


def test_unknown_human_label_is_rejected_loudly():
    with pytest.raises(ValueError, match="n6"):
        score_spotcheck(rows(("n5", "n6")))


def test_result_is_reportable():
    res = score_spotcheck(rows(("n5", "n5"), ("n4", "n5")))

    assert isinstance(res, SpotcheckResult)
    assert res.confusion[("n4", "n5")] == 1
    assert res.confusion[("n5", "n5")] == 1


def test_merge_fills_human_label_and_agreement():
    merged = merge_human_labels(
        sheet(("1", "猫が好きです。", "n5"), ("2", "彼女は普通８時間眠ります。", "n4")),
        {"1": "n5", "2": "n5"},
    )

    assert [r["human_label"] for r in merged] == ["n5", "n5"]
    assert [r["agree"] for r in merged] == ["yes", "no"]


def test_merge_leaves_unanswered_rows_blank():
    merged = merge_human_labels(sheet(("1", "a", "n5"), ("2", "b", "n4")), {"1": "n4"})

    assert merged[1]["human_label"] == ""
    assert merged[1]["agree"] == ""


def test_merge_does_not_mutate_the_input_rows():
    original = sheet(("1", "a", "n5"))
    merge_human_labels(original, {"1": "n5"})

    assert original[0]["human_label"] == ""


def test_merge_rejects_an_answer_for_an_unknown_sentence():
    # A stale answer file against a resampled spot-check must not be merged silently —
    # it would attach a judgment to a sentence the human never saw.
    with pytest.raises(ValueError, match="99"):
        merge_human_labels(sheet(("1", "a", "n5")), {"1": "n5", "99": "n4"})


def test_pending_returns_unanswered_rows_in_order():
    todo = pending(sheet(("1", "a", "n5"), ("2", "b", "n4"), ("3", "c", "n5")), {"2": "n4"})

    assert [r["sentence_id"] for r in todo] == ["1", "3"]
