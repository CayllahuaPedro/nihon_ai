# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Turns a learner's question into a stream of renderable answer blocks.

The model is asked for JSON Lines — one object per line, one line per block —
rather than prose. A block is the unit the reader renders, so streaming at that
granularity means each piece of the answer lands whole: an explanation, then a
quoted Japanese example, then the next explanation.
"""

import json
from collections.abc import AsyncIterator
from typing import Any

from app.core.config import settings
from app.models.tutor import BLOCK_FIELDS, TutorAsk

MAX_TOKENS = 64_000

_FORMAT_RULES = """\
Answer as JSON Lines: one JSON object per line, nothing else. No prose outside
the objects, no markdown, no code fences.

Two object shapes are allowed:
{"kind": "prose", "text": "<one short paragraph of explanation, in English>"}
{"kind": "example", "japanese": "<a Japanese sentence or phrase>", "gloss": "<a short English gloss>"}

Alternate them. Lead with a prose object that answers the question directly,
then show the grammar working in an example rather than describing it further.
Three to five objects is the right length; a learner reading a page does not
want an essay."""


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


def _valid_block(payload: Any) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    required = BLOCK_FIELDS.get(payload.get("kind"))
    if required is None:
        return None

    if any(not isinstance(payload.get(field), str) or not payload[field] for field in required):
        return None

    return {"kind": payload["kind"], **{field: payload[field] for field in required}}


def _parse_line(line: str) -> dict[str, Any] | None:
    stripped = line.strip()
    if not stripped:
        return None

    try:
        return _valid_block(json.loads(stripped))
    except json.JSONDecodeError:
        return None


async def stream_tutor_blocks(client: Any, ask: TutorAsk) -> AsyncIterator[dict[str, Any]]:
    buffer = ""
    seen = ""
    emitted = 0

    async with client.messages.stream(
        # Read per call, not captured at import, so the setting is a real knob.
        model=settings.tutor_model,
        max_tokens=MAX_TOKENS,
        system=build_system_prompt(ask),
        messages=[{"role": "user", "content": ask.question}],
    ) as stream:
        async for chunk in stream.text_stream:
            buffer += chunk
            seen += chunk

            # A chunk boundary lands anywhere, including mid-token, so only the
            # text before the last newline is known to hold complete lines.
            *complete, buffer = buffer.split("\n")
            for line in complete:
                block = _parse_line(line)
                if block is not None:
                    emitted += 1
                    yield block

    trailing = _parse_line(buffer)
    if trailing is not None:
        emitted += 1
        yield trailing

    # The model ignored the format but still said something useful. Showing it
    # as one paragraph beats showing the learner nothing.
    if emitted == 0 and seen.strip():
        yield {"kind": "prose", "text": seen.strip()}
