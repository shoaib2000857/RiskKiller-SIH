from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from transformers import (
    AutoModelForSequenceClassification,
    AutoTokenizer,
    pipeline,
)

from ..config import get_settings

logger = logging.getLogger(__name__)


class HuggingFaceDetector:
    """
    Wraps a Hugging Face text-classification pipeline to estimate
    AI-generated vs human-generated probability.

    The default model `roberta-base-openai-detector` yields labels:
    - `LABEL_0` → human-generated
    - `LABEL_1` → machine-generated
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._pipe = None
        self._load_pipeline()

    def _load_pipeline(self) -> None:
        model_name = self.settings.hf_model_name
        tokenizer_name = self.settings.hf_tokenizer_name
        if model_name.lower() in {"disabled", "none"}:
            self._pipe = None
            return
        try:
            tokenizer = AutoTokenizer.from_pretrained(self.settings.hf_tokenizer_name)
            model = AutoModelForSequenceClassification.from_pretrained(
                self.settings.hf_model_name
            )
            self._pipe = pipeline(
                "text-classification",
                model=model,
                tokenizer=tokenizer,
                device=self.settings.hf_device,
                return_all_scores=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Failed to load Hugging Face detector: %s", exc)
            self._pipe = None

    @property
    def available(self) -> bool:
        return self._pipe is not None

    def score(self, text: str) -> Optional[float]:
        if not self._pipe:
            return None
        try:
            outputs = self._pipe(text[:4096], top_k=None)
            if isinstance(outputs, list):
                if outputs and isinstance(outputs[0], list):
                    candidates = outputs[0]
                else:
                    candidates = outputs
            else:
                candidates = [outputs]

            machine_score = 0.0
            for candidate in candidates:
                label = str(candidate.get("label", "")).upper()
                score = float(candidate.get("score", 0.0))
                if any(
                    key in label
                    for key in {"LABEL_1", "AI", "LLM", "GEN", "FAKE", "SYNTH", "MODEL"}
                ):
                    machine_score = max(machine_score, score)
            return float(machine_score)
        except Exception as exc:  # noqa: BLE001
            logger.error("Hugging Face scoring failed: %s", exc)
            return None


@lru_cache(maxsize=1)
def get_hf_detector() -> HuggingFaceDetector:
    return HuggingFaceDetector()
