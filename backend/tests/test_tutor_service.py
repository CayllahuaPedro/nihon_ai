# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""What the tutor asks the model, and on whose behalf.

Parsing of the answer lives in test_tutor_stream.py; the schema it is held to
lives in test_tutor_blocks.py.
"""

import pytest

from app.models.tutor import TutorAsk
from app.services.tutor import build_system_prompt, stream_tutor_events

from .conftest import FakeAnthropic

ASK = TutorAsk(question="Why 〜ていった and not 〜ていた?", level="N4", known_words=1842)
ONE_BLOCK = '{"kind":"prose","text":"x"}\n'


async def drain(client: FakeAnthropic) -> None:
    async for _ in stream_tutor_events(client, ASK):
        pass


@pytest.mark.asyncio
async def test_sends_the_learners_question():
    client = FakeAnthropic([ONE_BLOCK])

    await drain(client)

    messages = client.messages.captured["messages"]
    assert ASK.question in messages[0]["content"]


@pytest.mark.asyncio
async def test_uses_the_configured_model():
    from app.core import config

    client = FakeAnthropic([ONE_BLOCK])

    await drain(client)

    assert client.messages.captured["model"] == config.settings.tutor_model


@pytest.mark.asyncio
async def test_the_configured_model_can_be_changed(monkeypatch):
    """Swapping tiers for cost is a setting, not an edit."""
    from app.core import config

    monkeypatch.setattr(config.settings, "tutor_model", "claude-haiku-4-5")
    client = FakeAnthropic([ONE_BLOCK])

    await drain(client)

    assert client.messages.captured["model"] == "claude-haiku-4-5"


def test_defaults_to_sonnet():
    from app.core.config import Settings

    assert Settings().tutor_model == "claude-sonnet-5"


def test_system_prompt_states_the_learner_level():
    assert "N4" in build_system_prompt(ASK)


def test_system_prompt_states_the_known_word_count():
    assert "1,842" in build_system_prompt(ASK)


def test_system_prompt_names_the_focus_word_when_one_is_given():
    prompt = build_system_prompt(ASK.model_copy(update={"focus_word": "消える"}))

    assert "消える" in prompt


def test_system_prompt_omits_focus_wording_when_no_word_is_given():
    assert "focus" not in build_system_prompt(ASK).lower()
