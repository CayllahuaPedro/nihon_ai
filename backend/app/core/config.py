# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    # Origins the browser app is served from. The LAN and Tailscale entries let
    # the Next.js dev server be opened on a phone and still reach this API.
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    chroma_path: str = ".chroma"
    database_url: str = "sqlite:///./nihon_ai.db"


settings = Settings()
