from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8"
    )

    app_name: str = "LLM MalignOps Shield"
    environment: str = Field("dev", alias="APP_ENV")
    secret_key: str = Field("super-secret-key", alias="APP_SECRET")
    database_url: str = Field("sqlite:///./data/app.db", alias="DATABASE_URL")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])
    sharing_allowed_regions: List[str] = Field(
        default_factory=lambda: ["USA", "EU", "IN", "AUS"]
    )
    watermark_secret: str = Field("default-watermark-seed", alias="WATERMARK_SEED")
    hf_model_name: str = Field("disabled", alias="HF_MODEL_NAME")
    hf_tokenizer_name: str = Field("disabled", alias="HF_TOKENIZER_NAME")
    hf_device: int = Field(-1, alias="HF_DEVICE")  # -1 CPU, >=0 GPU id
    hf_score_threshold: float = Field(0.6, alias="HF_SCORE_THRESHOLD")
    ollama_model: str = Field("gpt-oss:20b", alias="OLLAMA_MODEL")
    ollama_enabled: bool = Field(False, alias="OLLAMA_ENABLED")
    ollama_timeout: int = Field(30, alias="OLLAMA_TIMEOUT")
    ollama_prompt_chars: int = Field(2000, alias="OLLAMA_PROMPT_CHARS")
    ollama_timeout_ceiling: int = Field(90, alias="OLLAMA_TIMEOUT_CEILING")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
