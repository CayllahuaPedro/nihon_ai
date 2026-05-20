# Nihon AI — Copyright (C) 2026 Pedro Villanueva. Licensed under AGPL-3.0.
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    anthropic_api_key: str = ""
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    chroma_path: str = ".chroma"
    database_url: str = "sqlite:///./nihon_ai.db"


settings = Settings()
