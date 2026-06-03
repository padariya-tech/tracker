from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = f"sqlite:///{Path(__file__).resolve().parents[1] / 'activities.db'}"
    cors_origins: List[str] = [
        "http://127.0.0.1:8000",
        "http://localhost:8000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        
    ]

    class Config:
        env_file = ".env"


settings = Settings()
