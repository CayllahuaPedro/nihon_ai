# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Turns a learner's question into a stream of answer-block events.

The model is asked for JSON Lines — one object per line, one line per block.
Each line is scanned as it arrives, so a block announces itself and streams its
prose while the rest of the object is still being written:

    BlockStart(kind="prose") → BlockDelta("It adds") → BlockDelta(" direction.")
    → BlockEnd(validated block)

Validation and streaming pull against each other — half an object cannot be
validated — so they are separated in time rather than traded off. Deltas are
unvalidated text for the reader to show immediately; BlockEnd carries the block
only once the whole line parsed and passed the schema. A block that opened and
then failed is withdrawn with BlockDrop, so nothing half-formed stays on screen.

Japanese is deliberately not streamed. A sentence reads as a unit, and watching
色が消えていった assemble itself character by character helps nobody read it.
"""

import json
import re
from collections.abc import AsyncIterator
from typing import Any, Literal

from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.models.tutor import ProseBlock, TutorAsk, TutorBlock, parse_block
from app.services.partial_json import decode_partial_string

MAX_TOKENS = 64_000

# Only the fields worth watching a learner read letter by letter.
_STREAMED_FIELD: dict[str, str] = {"prose": "text"}

_KIND = re.compile(r'"kind"\s*:\s*"(prose|example)"')

_FORMAT_RULES = """\
Answer as JSON Lines: one JSON object per line, nothing else. No prose outside
the objects, no markdown, no code fences.

Two object shapes are allowed:
{"kind": "prose", "text": "<one short paragraph of explanation, in English>"}
{"kind": "example", "japanese": "<a Japanese sentence or phrase>", "gloss": "<a short English gloss>"}

Write "kind" first in every object. Alternate the two shapes: lead with a prose
object that answers the question directly, then show the grammar working in an
example rather than describing it further. Three to five objects is the right
length; a learner reading a page does not want an essay."""


class BlockStart(BaseModel):
    type: Literal["start"] = "start"
    index: int
    kind: Literal["prose", "example"]


class BlockDelta(BaseModel):
    """Unvalidated text, safe to show and certain to be superseded by the end."""

    type: Literal["delta"] = "delta"
    index: int
    text: str


class BlockEnd(BaseModel):
    type: Literal["end"] = "end"
    index: int
    block: TutorBlock


class BlockDrop(BaseModel):
    """The block opened but never validated. Remove whatever was shown."""

    type: Literal["drop"] = "drop"
    index: int


TutorEvent = BlockStart | BlockDelta | BlockEnd | BlockDrop


def build_system_prompt(ask: TutorAsk) -> str:
    """The whole point of this app: an answer pitched at one specific learner."""
    parts = [
        (
            "You are a Japanese reading tutor. The learner is studying at JLPT "
            f"{ask.level} and knows roughly {ask.known_words:,} words."
        ),
        (
            f"Explain using grammar and vocabulary at or below {ask.level}. When a "
            "harder word is unavoidable, gloss it in the same breath. Never answer "
            "with grammar the learner has not met yet just because it is more "
            "precise."
        ),
    ]

    if ask.focus_word:
        parts.append(
            f"The learner tapped 「{ask.focus_word}」 while reading and is asking "
            "about it. Answer about that word in the sentence it appeared in, "
            "not about the dictionary entry in isolation."
        )

    parts.append(_FORMAT_RULES)
    return "\n\n".join(parts)


class _LineScanner:
    """Reads one JSONL line as it arrives and reports what can be shown yet."""

    def __init__(self) -> None:
        self.raw = ""
        self.kind: str | None = None
        self.opened = False
        # Offset in `raw` where the streamed field's value begins, and how much
        # of that value has already been handed out.
        self._value_at: int | None = None
        self._cursor = 0
        self._value_closed = False

    def feed(self, text: str, index: int) -> list[TutorEvent]:
        self.raw += text
        events: list[TutorEvent] = []

        if not self.opened:
            match = _KIND.search(self.raw)
            if match is None:
                return events
            self.kind = match.group(1)
            self.opened = True
            events.append(BlockStart(index=index, kind=self.kind))

        field = _STREAMED_FIELD.get(self.kind or "")
        if field is None or self._value_closed:
            return events

        if self._value_at is None:
            opening = re.search(rf'"{field}"\s*:\s*"', self.raw)
            if opening is None:
                return events
            self._value_at = opening.end()

        chunk, closed, consumed = decode_partial_string(
            self.raw[self._value_at + self._cursor :]
        )
        self._cursor += consumed
        self._value_closed = closed

        if chunk:
            events.append(BlockDelta(index=index, text=chunk))
        return events

    def finish(self, index: int) -> list[TutorEvent]:
        if not self.raw.strip():
            return []

        try:
            block = parse_block(json.loads(self.raw))
        except (json.JSONDecodeError, ValidationError):
            return [BlockDrop(index=index)] if self.opened else []

        return [BlockEnd(index=index, block=block)]


async def stream_tutor_events(client: Any, ask: TutorAsk) -> AsyncIterator[TutorEvent]:
    scanner = _LineScanner()
    index = 0
    opened_any = False
    seen = ""

    async with client.messages.stream(
        # Read per call, not captured at import, so the setting is a real knob.
        model=settings.tutor_model,
        max_tokens=MAX_TOKENS,
        system=build_system_prompt(ask),
        messages=[{"role": "user", "content": ask.question}],
    ) as stream:
        async for chunk in stream.text_stream:
            seen += chunk
            pending = chunk

            # A chunk can carry several line endings, one, or none at all.
            while "\n" in pending:
                head, _, pending = pending.partition("\n")

                for event in scanner.feed(head, index):
                    yield event
                for event in scanner.finish(index):
                    yield event

                if scanner.opened:
                    opened_any = True
                    index += 1
                scanner = _LineScanner()

            if pending:
                for event in scanner.feed(pending, index):
                    yield event

    for event in scanner.finish(index):
        yield event
    if scanner.opened:
        opened_any = True
        index += 1

    # The model ignored the format entirely but still said something useful.
    # Showing it as one paragraph beats showing the learner nothing. A block
    # that opened and then failed is not this case — it was already withdrawn.
    if not opened_any and seen.strip():
        text = seen.strip()
        yield BlockStart(index=index, kind="prose")
        yield BlockDelta(index=index, text=text)
        yield BlockEnd(index=index, block=ProseBlock(kind="prose", text=text))
