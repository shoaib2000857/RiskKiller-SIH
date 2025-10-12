from __future__ import annotations

import json
import subprocess
from typing import Optional

from ..config import get_settings


class OllamaClient:
    """
    Lightweight wrapper to query a local Ollama model for qualitative risk scoring.
    Expects Ollama CLI to be installed and running on localhost.
    """

    def __init__(self) -> None:
        self.settings = get_settings()

    def risk_assessment(self, text: str) -> Optional[float]:
        if not self.settings.ollama_enabled:
            return None
        prompt = (
            "You are a counter-disinformation analyst. Read the following content and "
            "respond with a single JSON object containing keys `risk` (0-1 float) and "
            "`justification` (short string). Content:\n"
            "```"
            f"{text[:1200]}"
            "```"
        )
        try:
            result = subprocess.run(
                ["ollama", "run", self.settings.ollama_model, prompt],
                capture_output=True,
                text=True,
                timeout=self.settings.ollama_timeout,
                check=False,
            )
        except FileNotFoundError:
            return None
        except subprocess.TimeoutExpired:
            return None

        if result.returncode != 0:
            return None

        output = result.stdout.strip()
        data = self._extract_json(output)
        if not data:
            return None
        try:
            risk = float(data.get("risk", 0.0))
        except (TypeError, ValueError):
            return None
        return max(0.0, min(1.0, risk))

    @staticmethod
    def _extract_json(text: str) -> Optional[dict]:
        """
        Attempt to recover a JSON object from model output, even if surrounded
        with prose or fenced code blocks.
        """
        if not text:
            return None
        stripped_lines = [line.strip() for line in text.splitlines() if line.strip()]
        for line in reversed(stripped_lines):
            candidate = line
            if candidate.startswith("```"):
                candidate = candidate.strip("`")
            if candidate.startswith("{") and candidate.endswith("}"):
                try:
                    return json.loads(candidate)
                except json.JSONDecodeError:
                    continue
        # Last resort: remove code fences globally and try once.
        cleanup = text.replace("```json", "").replace("```", "").strip()
        try:
            return json.loads(cleanup)
        except json.JSONDecodeError:
            return None
