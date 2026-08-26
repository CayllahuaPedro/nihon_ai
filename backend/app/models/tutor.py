# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from typing import Literal

from pydantic import BaseModel, Field


class TutorAsk(BaseModel):
    """One question, plus what the learner model knows about who is asking."""

    question: str = Field(min_length=1, max_length=2000)
    level: str = "N5"
    known_words: int = Field(default=0, ge=0)
    #  Word the learner tapped in the reader, when the question came from there.
    focus_word: str | None = None


BlockKind = Literal["prose", "example"]

# Every kind, and the fields an answer block of that kind must carry to be
# renderable. A block missing any of them is dropped rather than shown broken.
BLOCK_FIELDS: dict[str, tuple[str, ...]] = {
    "prose": ("text",),
    "example": ("japanese", "gloss"),
}
