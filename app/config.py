from functools import lru_cache
from pathlib import Path
from typing import List

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    app_name: str = "LLM MalignOps Shield"
    environment: str = Field("dev", env="APP_ENV")
    secret_key: str = Field("super-secret-key", env="APP_SECRET")
    database_url: str = Field("sqlite:///./data/app.db", env="DATABASE_URL")
    allowed_origins: List[str] = Field(default_factory=lambda: ["*"])
    sharing_allowed_regions: List[str] = Field(
        default_factory=lambda: ["USA", "EU", "IN", "AUS"]
    )
    watermark_secret: str = Field("default-watermark-seed", env="WATERMARK_SEED")
    hf_model_name: str = Field(
        "roberta-base-openai-detector", env="HF_MODEL_NAME"
    )
    hf_tokenizer_name: str = Field(
        "roberta-base-openai-detector", env="HF_TOKENIZER_NAME"
    )
    hf_device: int = Field(-1, env="HF_DEVICE")  # -1 CPU, >=0 GPU id
    hf_score_threshold: float = Field(0.6, env="HF_SCORE_THRESHOLD")
    ollama_model: str = Field("mistral", env="OLLAMA_MODEL")
    ollama_enabled: bool = Field(False, env="OLLAMA_ENABLED")
    ollama_timeout: int = Field(15, env="OLLAMA_TIMEOUT")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    config_path = Path(Settings.Config.env_file)
    if config_path.exists():
        return Settings(_env_file=config_path)
    return Settings()
