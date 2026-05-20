# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from fastapi import APIRouter

router = APIRouter(prefix="/classify", tags=["classify"])


@router.post("")
def classify_text() -> dict[str, str]:
    return {"detail": "not implemented"}
