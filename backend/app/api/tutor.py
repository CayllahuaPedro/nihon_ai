# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
"""Server-sent stream of tutor answer events.

A block announces itself (`start`), streams its prose as it is written
(`delta`), and closes with the validated block (`end`) — or is withdrawn
(`drop`) if the model's line never passed the schema. Deltas are text to show,
never text to trust; the `end` is the authority.
"""

import json
import logging
from collections.abc import AsyncIterator
from typing import Annotated

from anthropic import AsyncAnthropic
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse

from app.core.config import settings
from app.models.tutor import TutorAsk
from app.services.tutor import stream_tutor_events

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tutor", tags=["tutor"])


def get_anthropic_client() -> AsyncAnthropic:
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="The tutor is not configured: ANTHROPIC_API_KEY is unset.",
        )
    return AsyncAnthropic(api_key=settings.anthropic_api_key)


def _frame(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


async def _events(client: AsyncAnthropic, ask: TutorAsk) -> AsyncIterator[str]:
    try:
        async for event in stream_tutor_events(client, ask):
            yield _frame(event.type, event.model_dump())
    except Exception:
        # The status line went out with the first byte, so a failure here can
        # only be reported inside the stream. The cause is logged rather than
        # sent on: an upstream message can carry credentials.
        logger.exception("tutor stream failed")
        yield _frame("error", {"message": "The tutor stopped answering. Ask again."})
        return

    yield _frame("done", {})


@router.post("")
async def ask_tutor(
    ask: TutorAsk,
    client: Annotated[AsyncAnthropic, Depends(get_anthropic_client)],
) -> StreamingResponse:
    return StreamingResponse(
        _events(client, ask),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Tells nginx and friends not to buffer the stream into one blob.
            "X-Accel-Buffering": "no",
        },
    )
