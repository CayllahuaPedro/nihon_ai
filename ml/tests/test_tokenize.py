"""Contract cases for item_key() and frame bucketing (spec §3, §8)."""

from nihon_ml.tokenize import IGNORE, OOV_FRAME, TRACKABLE, tokens


def _by_surface(text, surface):
    return [t for t in tokens(text) if t.surface == surface][0]


def test_conjugations_collapse_to_one_key():
    expected = "食べる|タベル|動詞"
    for sentence in ("ご飯を食べる", "ご飯を食べた", "ご飯を食べて", "ごはんをたべる"):
        verb = [t for t in tokens(sentence) if t.pos1 == "動詞"][0]
        assert verb.item_key == expected, sentence


def test_homograph_splits_by_reading():
    kyou = _by_surface("今日はいい天気", "今日")
    konnichi = _by_surface("今日的な問題", "今日")
    assert kyou.item_key == "今日|キョウ|名詞"
    assert konnichi.item_key == "今日|コンニチ|名詞"
    assert kyou.item_key != konnichi.item_key


def test_suru_fusion_makes_one_item():
    content = [t.item_key for t in tokens("毎日勉強する") if t.frame_bucket == TRACKABLE]
    assert "勉強する|ベンキョウスル|動詞" in content
    assert "勉強|ベンキョウ|名詞" not in content
    assert all("為る" not in k for k in content)


def test_trackability_buckets():
    assert _by_surface("猫と犬", "と").frame_bucket == IGNORE
    assert _by_surface("猫が好き", "猫").frame_bucket == TRACKABLE
    assert _by_surface("東京に行く", "東京").frame_bucket == OOV_FRAME
    assert _by_surface("三つある", "三").frame_bucket == OOV_FRAME
