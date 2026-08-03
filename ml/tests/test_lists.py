"""JLPT list ingestion: headword → item_key normalization + level loading (spec §4)."""

from nihon_ml.jlpt.lists import headword_to_item_key, load_jlpt_levels

_HEADER = "item_key,lemma,reading,pos,level,source_surface,source_reading"


def test_headword_resolves_to_single_item_key():
    assert headword_to_item_key("食べる") == "食べる|タベル|動詞"
    assert headword_to_item_key("猫") == "猫|ネコ|名詞"


def test_suru_headword_fuses_to_one_item():
    assert headword_to_item_key("勉強する") == "勉強する|ベンキョウスル|動詞"


def test_multitoken_headword_is_skipped():
    # An expression that tokenizes to several content tokens has no single identity → skip.
    assert headword_to_item_key("本を読む") is None


def test_load_jlpt_levels_merges_per_level_csvs(tmp_path):
    (tmp_path / "n5.csv").write_text(
        _HEADER + "\n食べる|タベル|動詞,食べる,タベル,動詞,0,食べる,たべる\n",
        encoding="utf-8",
    )
    (tmp_path / "n3.csv").write_text(
        _HEADER + "\n経済|ケイザイ|名詞,経済,ケイザイ,名詞,2,経済,けいざい\n",
        encoding="utf-8",
    )
    lv = load_jlpt_levels(tmp_path)
    assert lv == {"食べる|タベル|動詞": 0, "経済|ケイザイ|名詞": 2}
