# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Token-level streaming of an answer that is still being written."""

import pytest

from app.models.tutor import ExampleBlock, ProseBlock, TutorAsk
from app.services.tutor import (
    BlockDelta,
    BlockEnd,
    BlockStart,
    stream_tutor_events,
)

from .conftest import FakeAnthropic

ASK = TutorAsk(question="Why 〜ていった?", level="N4", known_words=1842)

PROSE = '{"kind":"prose","text":"It adds direction."}\n'
EXAMPLE = '{"kind":"example","japanese":"色が消えていった","gloss":"kept fading"}\n'


async def collect(chunks: list[str]) -> list:
    client = FakeAnthropic(chunks)
    return [event async for event in stream_tutor_events(client, ASK)]


def kinds(events: list) -> list[str]:
    return [type(event).__name__ for event in events]


@pytest.mark.asyncio
async def test_a_prose_block_opens_streams_and_closes():
    events = await collect([PROSE])

    assert kinds(events) == ["BlockStart", "BlockDelta", "BlockEnd"]
    assert events[0].kind == "prose"
    assert isinstance(events[-1].block, ProseBlock)


@pytest.mark.asyncio
async def test_prose_text_arrives_across_several_deltas():
    events = await collect(
        ['{"kind":"prose","te', 'xt":"It adds', ' direction."', "}\n"]
    )

    deltas = [e for e in events if isinstance(e, BlockDelta)]
    assert len(deltas) > 1, "the answer arrived in one piece, not streamed"
    assert "".join(d.text for d in deltas) == "It adds direction."


@pytest.mark.asyncio
async def test_the_block_opens_before_its_text_has_arrived():
    """The reader can show the bubble while the sentence is still coming."""
    events = await collect(['{"kind":"prose",', '"text":"later"}\n'])

    assert isinstance(events[0], BlockStart)


@pytest.mark.asyncio
async def test_japanese_examples_are_not_streamed_character_by_character():
    """A Japanese sentence reads as a unit; drip-feeding it helps nobody."""
    events = await collect([EXAMPLE])

    assert kinds(events) == ["BlockStart", "BlockEnd"]
    assert isinstance(events[-1].block, ExampleBlock)


@pytest.mark.asyncio
async def test_deltas_decode_escapes_rather_than_showing_them():
    events = await collect(['{"kind":"prose","text":"a \\"quote\\" and 雪"}\n'])

    text = "".join(e.text for e in events if isinstance(e, BlockDelta))
    assert text == 'a "quote" and 雪'


@pytest.mark.asyncio
async def test_an_opened_block_that_fails_validation_is_dropped():
    """Text already on screen must be taken back, not left there half-formed."""
    events = await collect(['{"kind":"prose","text":"","extra":1}\n'])

    assert kinds(events) == ["BlockStart", "BlockDrop"]


@pytest.mark.asyncio
async def test_a_line_that_never_reveals_a_kind_emits_nothing_partial():
    events = await collect(['{"note":"chatter"}\n', PROSE])

    assert kinds(events) == ["BlockStart", "BlockDelta", "BlockEnd"]


@pytest.mark.asyncio
async def test_blocks_are_numbered_in_order():
    events = await collect([PROSE, EXAMPLE, PROSE])

    assert [e.index for e in events if isinstance(e, BlockStart)] == [0, 1, 2]


@pytest.mark.asyncio
async def test_an_end_carries_the_index_of_its_start():
    events = await collect([PROSE, EXAMPLE])

    ends = [e for e in events if isinstance(e, BlockEnd)]
    assert [e.index for e in ends] == [0, 1]


@pytest.mark.asyncio
async def test_a_final_block_without_a_trailing_newline_still_closes():
    events = await collect(['{"kind":"prose","text":"no newline"}'])

    assert isinstance(events[-1], BlockEnd)


@pytest.mark.asyncio
async def test_unformatted_output_still_reaches_the_learner():
    events = await collect(["It adds direction, ", "over time."])

    assert kinds(events) == ["BlockStart", "BlockDelta", "BlockEnd"]
    assert events[-1].block.text == "It adds direction, over time."


@pytest.mark.asyncio
async def test_an_empty_answer_emits_nothing():
    assert await collect([]) == []
