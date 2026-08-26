# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Test doubles for the Anthropic streaming client.

The tutor talks to Claude through `client.messages.stream(...)`, an async
context manager exposing `.text_stream`. These fakes reproduce that shape so
the service can be driven without spending an API call, and so a response can
be chopped at arbitrary boundaries — which is what a real stream does.
"""

from collections.abc import AsyncIterator, Iterable
from typing import Self


class FakeStream:
    def __init__(self, chunks: Iterable[str], error: Exception | None = None):
        self._chunks = list(chunks)
        self._error = error

    async def __aenter__(self) -> Self:
        return self

    async def __aexit__(self, *_exc: object) -> bool:
        return False

    @property
    def text_stream(self) -> AsyncIterator[str]:
        return self._iterate()

    async def _iterate(self) -> AsyncIterator[str]:
        for chunk in self._chunks:
            yield chunk
        if self._error is not None:
            raise self._error


class FakeMessages:
    def __init__(self, chunks: Iterable[str], error: Exception | None = None):
        self._chunks = list(chunks)
        self._error = error
        self.captured: dict[str, object] = {}

    def stream(self, **kwargs: object) -> FakeStream:
        self.captured = kwargs
        return FakeStream(self._chunks, self._error)


class FakeAnthropic:
    def __init__(self, chunks: Iterable[str] = (), error: Exception | None = None):
        self.messages = FakeMessages(chunks, error)
