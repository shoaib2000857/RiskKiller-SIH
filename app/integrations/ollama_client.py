from __future__ import annotations

import json
import logging
from typing import Optional, Dict, Any

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("Ollama library not installed. Install with: pip install ollama")

from ..config import get_settings

logger = logging.getLogger(__name__)


class OllamaClient:
    """
    Python wrapper to query a local Ollama model for qualitative risk scoring.
    Uses the official Ollama Python library for efficient async communication.
    Expects Ollama server to be running on localhost:11434.
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self.available = OLLAMA_AVAILABLE and self.settings.ollama_enabled
        
        if not OLLAMA_AVAILABLE and self.settings.ollama_enabled:
            logger.error(
                "Ollama is enabled in config but the library is not installed. "
                "Run: pip install ollama"
            )
        
        if self.available:
            # Test connection to Ollama server
            try:
                ollama.list()
                logger.info(f"Ollama client initialized successfully with model: {self.settings.ollama_model}")
            except Exception as e:
                logger.warning(f"Ollama server not accessible: {e}")
                self.available = False

    def risk_assessment(self, text: str) -> Optional[float]:
        """
        Analyze text for disinformation risk using Ollama LLM.
        Returns a risk score between 0.0 and 1.0.
        """
        if not self.available:
            return None
            
        # Truncate/sample text if too long
        limit = max(256, int(self.settings.ollama_prompt_chars))
        if len(text) <= limit:
            snippet = text
        else:
            head = text[: limit // 2]
            tail = text[-(limit // 2) :]
            snippet = f"{head}\n...\n{tail}"
        
        # Construct analysis prompt
        prompt = self._build_prompt(snippet)
        
        try:
            # Call Ollama with timeout handling
            response = ollama.generate(
                model=self.settings.ollama_model,
                prompt=prompt,
                options={
                    'temperature': 0.3,  # Lower temperature for more consistent scoring
                    'top_p': 0.9,
                    'num_predict': 150,  # Limit response length for efficiency
                }
            )
            
            if not response or 'response' not in response:
                logger.warning(f"Ollama returned empty response for model {self.settings.ollama_model}")
                return None
            
            output = response['response'].strip()
            logger.debug(f"Ollama raw response (first 200 chars): {output[:200]}")
            logger.info("Ollama raw response (full): %s", output)
            
            # Extract risk score from response
            risk_score = self._parse_risk_score(output)
            
            if risk_score is not None:
                logger.info(
                    f"Ollama risk assessment: {risk_score:.2%} "
                    f"(model: {self.settings.ollama_model}, chars: {len(snippet)})"
                )
            
            return risk_score
            
        except Exception as e:
            logger.warning(f"Ollama risk assessment failed: {e}")
            return None

    def _build_prompt(self, snippet: str) -> str:
        """Construct a detailed prompt for risk assessment."""
        return f"""You are an expert counter-disinformation analyst. Analyze the following content for potential risks including:
- Misinformation or false claims
- Manipulation tactics (urgency, fear, outrage)
- Coordinated influence operations
- Malicious intent (phishing, scams, propaganda)

Content to analyze:
```
{snippet}
```

Respond with ONLY a JSON object in this exact format:
{{"risk": 0.0, "justification": "brief explanation"}}

Where risk is a float between 0.0 (no risk) and 1.0 (critical risk).
JSON response:"""

    def _parse_risk_score(self, output: str) -> Optional[float]:
        """Extract risk score from Ollama response with multiple fallback strategies."""
        # Try to extract JSON
        data = self._extract_json(output)
        
        if data and 'risk' in data:
            try:
                risk = float(data['risk'])
                return max(0.0, min(1.0, risk))
            except (TypeError, ValueError):
                logger.warning(f"Invalid risk value in JSON: {data.get('risk')}")
        
        # Fallback: Look for numeric patterns
        import re
        patterns = [
            r'"risk"\s*:\s*([0-9]*\.?[0-9]+)',  # JSON format
            r'risk[:\s]+([0-9]*\.?[0-9]+)',      # Natural language
            r'score[:\s]+([0-9]*\.?[0-9]+)',     # Alternative phrasing
        ]
        
        for pattern in patterns:
            match = re.search(pattern, output, re.IGNORECASE)
            if match:
                try:
                    risk = float(match.group(1))
                    # Normalize if out of 0-1 range (e.g., 0-10 or 0-100 scale)
                    if risk > 1.0:
                        if risk <= 10.0:
                            risk = risk / 10.0
                        elif risk <= 100.0:
                            risk = risk / 100.0
                        else:
                            risk = 1.0
                    return max(0.0, min(1.0, risk))
                except (TypeError, ValueError):
                    continue
        
        logger.warning(f"Could not parse risk score from Ollama output: {output[:300]}")
        logger.info("Full Ollama output for debugging: %s", output)
        return None

    @staticmethod
    def _extract_json(text: str) -> Optional[dict]:
        """
        Attempt to recover a JSON object from model output, even if surrounded
        with prose or fenced code blocks.
        """
        if not text:
            return None
        cleaned = text.replace("```json", "").replace("```", "").strip()

        # Fast path: exact JSON block on a single line.
        stripped_lines = [line.strip() for line in cleaned.splitlines() if line.strip()]
        for line in reversed(stripped_lines):
            if line.startswith("{") and line.endswith("}"):
                try:
                    return json.loads(line)
                except json.JSONDecodeError:
                    continue

        decoder = json.JSONDecoder()
        index = 0
        while index < len(cleaned):
            try:
                payload, end = decoder.raw_decode(cleaned, index)
            except json.JSONDecodeError as error:
                index = error.pos + 1
                continue
            if isinstance(payload, dict):
                return payload
            index = end
        return None
