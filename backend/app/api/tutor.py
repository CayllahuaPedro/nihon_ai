# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from fastapi import APIRouter

router = APIRouter(prefix="/tutor", tags=["tutor"])


@router.post("")
def ask_tutor() -> dict[str, str]:
    return {"detail": "not implemented"}
