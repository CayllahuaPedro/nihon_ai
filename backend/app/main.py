# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from fastapi import FastAPI

from app.api import classify, mining, progress, tutor

app = FastAPI(title="Nihon AI", version="0.1.0")

app.include_router(classify.router)
app.include_router(tutor.router)
app.include_router(mining.router)
app.include_router(progress.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
