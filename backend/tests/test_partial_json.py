# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Decoding a JSON string value that has not finished arriving.

This is the sharp edge of token streaming: the model's output can stop at any
byte, including halfway through `\\u30 66`. Decoding must consume only what is
unambiguously complete and leave the rest for the next chunk.
"""

from app.services.partial_json import decode_partial_string


def test_decodes_a_plain_prefix():
    assert decode_partial_string("It adds") == ("It adds", False, 7)


def test_reports_the_closing_quote():
    text, closed, _ = decode_partial_string('done."')

    assert (text, closed) == ("done.", True)


def test_stops_at_the_closing_quote_and_leaves_the_rest():
    _, _, consumed = decode_partial_string('done." , "gloss"')

    assert consumed == 6


def test_decodes_an_escaped_quote():
    assert decode_partial_string(r"say \"hi\"")[0] == 'say "hi"'


def test_decodes_an_escaped_backslash():
    assert decode_partial_string(r"a\\b")[0] == "a\\b"


def test_a_closing_quote_after_an_escaped_backslash_still_closes():
    text, closed, _ = decode_partial_string(r'a\\"')

    assert (text, closed) == ("a\\", True)


def test_decodes_newline_and_tab_escapes():
    assert decode_partial_string(r"a\nb\tc")[0] == "a\nb\tc"


def test_decodes_a_unicode_escape():
    assert decode_partial_string(r"雪")[0] == "雪"


def test_withholds_a_dangling_backslash():
    """The next chunk decides what this escape is."""
    text, _, consumed = decode_partial_string("ok\\")

    assert (text, consumed) == ("ok", 2)


def test_withholds_a_truncated_unicode_escape():
    text, _, consumed = decode_partial_string(r"snow \u96")

    assert (text, consumed) == ("snow ", 5)


def test_decodes_japanese_arriving_raw():
    assert decode_partial_string("色が消え")[0] == "色が消え"


def test_handles_an_empty_prefix():
    assert decode_partial_string("") == ("", False, 0)
