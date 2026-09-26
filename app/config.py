"""App configuration (env-driven, Vercel-safe)."""
from __future__ import annotations

import os


class Config:
    MAX_CONTENT_LENGTH_MB: int = int(os.getenv("MAX_CONTENT_LENGTH_MB", "32"))
    DEBUG: bool = os.getenv("FLASK_DEBUG", "0") == "1"

    @property
    def MAX_CONTENT_LENGTH(self) -> int:
        return self.MAX_CONTENT_LENGTH_MB * 1024 * 1024


def get_config() -> Config:
    return Config()
