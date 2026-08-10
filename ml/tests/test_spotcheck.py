import pytest

from nihon_ml.jlpt.spotcheck import SpotcheckResult, score_spotcheck

LEVELS = ["n5", "n4", "n3", "n2", "n1"]


def rows(*pairs):
    return [{"weak_label": w, "human_label": h} for w, h in pairs]


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
