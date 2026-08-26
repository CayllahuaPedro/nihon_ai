# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import classify, mining, progress, tutor
from app.core.config import settings

app = FastAPI(title="Nihon AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classify.router)
app.include_router(tutor.router)
app.include_router(mining.router)
app.include_router(progress.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
