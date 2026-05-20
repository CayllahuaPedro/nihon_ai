# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from fastapi import APIRouter

router = APIRouter(prefix="/mining", tags=["mining"])


@router.get("/queue")
def mining_queue() -> dict[str, str]:
    return {"detail": "not implemented"}
