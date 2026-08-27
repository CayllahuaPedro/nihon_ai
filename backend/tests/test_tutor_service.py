# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
import pytest

from app.models.tutor import TutorAsk
from app.services.tutor import build_system_prompt, stream_tutor_blocks

from .conftest import FakeAnthropic

ASK = TutorAsk(question="Why 〜ていった and not 〜ていた?", level="N4", known_words=1842)


async def collect(client: FakeAnthropic, ask: TutorAsk = ASK) -> list[dict]:
    return [block async for block in stream_tutor_blocks(client, ask)]


@pytest.mark.asyncio
async def test_parses_one_json_line_into_one_block():
    client = FakeAnthropic(['{"kind":"prose","text":"It adds direction."}\n'])

    assert await collect(client) == [{"kind": "prose", "text": "It adds direction."}]


@pytest.mark.asyncio
async def test_parses_an_example_block_with_japanese_and_gloss():
    client = FakeAnthropic(
        ['{"kind":"example","japanese":"色が消えていった","gloss":"kept fading"}\n']
    )

    assert await collect(client) == [
        {"kind": "example", "japanese": "色が消えていった", "gloss": "kept fading"}
    ]


@pytest.mark.asyncio
async def test_emits_a_block_per_line_in_order():
    client = FakeAnthropic(
        [
            '{"kind":"prose","text":"first"}\n',
            '{"kind":"example","japanese":"雪","gloss":"snow"}\n',
            '{"kind":"prose","text":"last"}\n',
        ]
    )

    assert [block["kind"] for block in await collect(client)] == [
        "prose",
        "example",
        "prose",
    ]


@pytest.mark.asyncio
async def test_reassembles_a_block_split_across_chunks():
    """A real stream cuts wherever it likes, including mid-token."""
    client = FakeAnthropic(['{"kind":"pro', 'se","text":"sp', 'lit"}\n'])

    assert await collect(client) == [{"kind": "prose", "text": "split"}]


@pytest.mark.asyncio
async def test_emits_a_trailing_block_that_never_got_a_newline():
    client = FakeAnthropic(['{"kind":"prose","text":"no trailing newline"}'])

    assert await collect(client) == [
        {"kind": "prose", "text": "no trailing newline"}
    ]


@pytest.mark.asyncio
async def test_skips_lines_that_are_not_valid_json():
    client = FakeAnthropic(
        [
            "Here are the blocks:\n",
            '{"kind":"prose","text":"kept"}\n',
        ]
    )

    assert await collect(client) == [{"kind": "prose", "text": "kept"}]


@pytest.mark.asyncio
async def test_skips_json_whose_kind_is_not_a_block_kind():
    client = FakeAnthropic(
        [
            '{"kind":"nonsense","text":"dropped"}\n',
            '{"kind":"prose","text":"kept"}\n',
        ]
    )

    assert await collect(client) == [{"kind": "prose", "text": "kept"}]


@pytest.mark.asyncio
async def test_skips_a_block_missing_a_required_field():
    client = FakeAnthropic(
        [
            '{"kind":"example","japanese":"雪"}\n',
            '{"kind":"prose","text":"kept"}\n',
        ]
    )

    assert await collect(client) == [{"kind": "prose", "text": "kept"}]


@pytest.mark.asyncio
async def test_falls_back_to_one_prose_block_when_nothing_parses():
    """The answer is still useful even when the model ignores the format."""
    client = FakeAnthropic(["It adds direction, ", "over time."])

    assert await collect(client) == [
        {"kind": "prose", "text": "It adds direction, over time."}
    ]


@pytest.mark.asyncio
async def test_emits_nothing_when_the_model_returns_nothing():
    client = FakeAnthropic([])

    assert await collect(client) == []


@pytest.mark.asyncio
async def test_asks_the_model_with_the_learners_question():
    client = FakeAnthropic(['{"kind":"prose","text":"x"}\n'])

    await collect(client)

    messages = client.messages.captured["messages"]
    assert ASK.question in messages[0]["content"]


@pytest.mark.asyncio
async def test_uses_the_configured_model():
    from app.core import config

    client = FakeAnthropic(['{"kind":"prose","text":"x"}\n'])

    await collect(client)

    assert client.messages.captured["model"] == config.settings.tutor_model


@pytest.mark.asyncio
async def test_the_configured_model_can_be_changed(monkeypatch):
    """Swapping tiers for cost is a setting, not an edit."""
    from app.core import config

    monkeypatch.setattr(config.settings, "tutor_model", "claude-haiku-4-5")
    client = FakeAnthropic(['{"kind":"prose","text":"x"}\n'])

    await collect(client)

    assert client.messages.captured["model"] == "claude-haiku-4-5"


def test_defaults_to_sonnet():
    from app.core.config import Settings

    assert Settings().tutor_model == "claude-sonnet-5"


def test_system_prompt_states_the_learner_level():
    prompt = build_system_prompt(ASK)

    assert "N4" in prompt


def test_system_prompt_states_the_known_word_count():
    prompt = build_system_prompt(ASK)

    assert "1,842" in prompt


def test_system_prompt_names_the_focus_word_when_one_is_given():
    prompt = build_system_prompt(ASK.model_copy(update={"focus_word": "消える"}))

    assert "消える" in prompt


def test_system_prompt_omits_focus_wording_when_no_word_is_given():
    assert "focus" not in build_system_prompt(ASK).lower()
