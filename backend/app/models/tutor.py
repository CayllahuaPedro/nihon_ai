# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""The contract the model's output is held to.

Claude is asked for these shapes and usually obliges, but "usually" is not a
contract. Everything it sends is parsed through here before it can reach a
learner, so a malformed or creatively-extended block is rejected at one place
rather than rendered broken three layers up.
"""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, TypeAdapter

_Text = Annotated[str, Field(min_length=1)]


class _Block(BaseModel):
    # Reject nothing, keep nothing: unknown keys are dropped rather than
    # widening the wire format because the model volunteered them.
    model_config = ConfigDict(extra="ignore", str_strip_whitespace=True)


class ProseBlock(_Block):
    """One short paragraph of explanation."""

    kind: Literal["prose"]
    text: _Text


class ExampleBlock(_Block):
    """A Japanese sentence with its English gloss, quoted as a unit."""

    kind: Literal["example"]
    japanese: _Text
    gloss: _Text


TutorBlock = Annotated[ProseBlock | ExampleBlock, Field(discriminator="kind")]

_adapter: TypeAdapter[ProseBlock | ExampleBlock] = TypeAdapter(TutorBlock)


def parse_block(payload: Any) -> ProseBlock | ExampleBlock:
    """Raises ValidationError if the payload is not a renderable block."""
    return _adapter.validate_python(payload)


class TutorAsk(BaseModel):
    """One question, plus what the learner model knows about who is asking."""

    question: str = Field(min_length=1, max_length=2000)
    level: str = "N5"
    known_words: int = Field(default=0, ge=0)
    #  Word the learner tapped in the reader, when the question came from there.
    focus_word: str | None = None
