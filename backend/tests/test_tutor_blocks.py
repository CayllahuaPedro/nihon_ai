# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""The schema the model's output is held to."""

import pytest
from pydantic import ValidationError

from app.models.tutor import ExampleBlock, ProseBlock, parse_block


def test_parses_a_prose_block():
    block = parse_block({"kind": "prose", "text": "It adds direction."})

    assert isinstance(block, ProseBlock)
    assert block.text == "It adds direction."


def test_parses_an_example_block():
    block = parse_block(
        {"kind": "example", "japanese": "色が消えていった", "gloss": "kept fading"}
    )

    assert isinstance(block, ExampleBlock)
    assert block.japanese == "色が消えていった"


def test_rejects_an_unknown_kind():
    with pytest.raises(ValidationError):
        parse_block({"kind": "haiku", "text": "nope"})


def test_rejects_a_block_missing_a_field():
    with pytest.raises(ValidationError):
        parse_block({"kind": "example", "japanese": "雪"})


def test_rejects_an_empty_field():
    with pytest.raises(ValidationError):
        parse_block({"kind": "prose", "text": "   "})


def test_rejects_a_non_string_field():
    with pytest.raises(ValidationError):
        parse_block({"kind": "prose", "text": 42})


def test_drops_fields_the_schema_does_not_declare():
    """A model that volunteers extra keys must not widen the wire format."""
    block = parse_block(
        {"kind": "prose", "text": "kept", "confidence": 0.9, "note": "ignore me"}
    )

    assert block.model_dump() == {"kind": "prose", "text": "kept"}


def test_trims_surrounding_whitespace():
    assert parse_block({"kind": "prose", "text": "  padded  "}).text == "padded"
