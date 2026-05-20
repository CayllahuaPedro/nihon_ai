# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from fastapi import APIRouter

router = APIRouter(prefix="/progress", tags=["progress"])


@router.get("")
def get_progress() -> dict[str, str]:
    return {"detail": "not implemented"}
