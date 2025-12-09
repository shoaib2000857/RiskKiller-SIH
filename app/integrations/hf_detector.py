from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Dict, Optional, Tuple, Any

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from peft import PeftModel, PeftConfig

# Keep your project config import
try:
    from ..config import get_settings
except ImportError:
    # Fallback for standalone testing
    def get_settings(): return None

logger = logging.getLogger(__name__)

class AIDetector:
    """
    Dual-model detector for AI-generated content:
    1. AI vs Human detection using DeBERTa v3 LoRA (ShoaibSSM/ai_vs_human_detector_deberta_v3_lora)
    2. Model Family detection for AI-generated text (XOmar/model_family_detector_deberta_v3_balanced)
    """

    def __init__(self) -> None:
        self.settings = get_settings()
        self._ai_human_model = None
        self._ai_human_tokenizer = None
        self._family_model = None
        self._family_tokenizer = None

        # Allow overriding the adapter checkpoint via env for flexibility
        self._ai_human_adapter_id = os.getenv(
            "HF_AI_HUMAN_MODEL",
            "ShoaibSSM/ai_vs_human_detector_deberta_v3_lora/checkpoint-68090",
        )
        
        # Skip model loading if disabled (e.g., in Docker blockchain nodes)
        if os.getenv("DISABLE_AI_MODELS", "false").lower() == "true":
            logger.warning("⚠️  AI model loading disabled via DISABLE_AI_MODELS env var")
            self._device = "cpu"
            return
        
        # Determine device automatically
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info(f"🚀 Initializing AI Detector on device: {self._device.upper()}")
        
        self._load_models()

    def _load_models(self) -> None:
        """Load both AI detection models with error handling and fallbacks."""
        try:
            # --- 1. Load AI vs Human Detector (LoRA) ---
            logger.info(
                "⏳ Loading AI vs Human detector (LoRA): %s",
                self._ai_human_adapter_id,
            )
            
            # Load the Peft Config to find the base model
            config = PeftConfig.from_pretrained(self._ai_human_adapter_id)
            
            # Load Base Model
            base_model = AutoModelForSequenceClassification.from_pretrained(
                config.base_model_name_or_path,
                num_labels=2 # Ensure binary classification head
            )
            
            # Load LoRA Adapter
            self._ai_human_model = PeftModel.from_pretrained(base_model, self._ai_human_adapter_id)
            self._ai_human_model.to(self._device)
            self._ai_human_model.eval()
            
            # Smart Tokenizer Loading (Fallback to base if adapter has no tokenizer)
            try:
                self._ai_human_tokenizer = AutoTokenizer.from_pretrained(self._ai_human_adapter_id)
            except Exception:
                logger.warning("Tokenizer not found in adapter, loading from base model...")
                self._ai_human_tokenizer = AutoTokenizer.from_pretrained(config.base_model_name_or_path)

            # --- 2. Load Model Family Detector (Full Fine-Tune) ---
            logger.info("⏳ Loading Model Family detector (Balanced)...")
            family_model_id = "XOmar/model_family_detector_deberta_v3_balanced"
            
            self._family_model = AutoModelForSequenceClassification.from_pretrained(family_model_id)
            self._family_model.to(self._device)
            self._family_model.eval()
            
            self._family_tokenizer = AutoTokenizer.from_pretrained(family_model_id)

            logger.info("✅ All AI detection models loaded successfully.")

        except Exception as exc:
            logger.error(f"❌ Critical Error loading models: {exc}")
            # Ensure we don't leave half-loaded states
            self._ai_human_model = None
            self._family_model = None

    @property
    def available(self) -> bool:
        """Check if models are loaded and ready."""
        return self._ai_human_model is not None and self._family_model is not None

    def detect_ai_human(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Detect if text is AI-generated or human-written.
        """
        if not self.available or not text.strip():
            return None

        try:
            # Tokenize (Let tokenizer handle truncation properly)
            inputs = self._ai_human_tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self._device)

            with torch.no_grad():
                outputs = self._ai_human_model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)

            # Dynamic Label Mapping (Safety check)
            id2label = self._ai_human_model.config.id2label
            
            # Find which index corresponds to "AI" or "LABEL_1"
            ai_index = 1 # Default
            for idx, label in id2label.items():
                if "AI" in str(label).upper() or "LABEL_1" in str(label).upper():
                    ai_index = int(idx)
                    break
            
            human_index = 1 - ai_index # Assuming binary 0/1

            ai_prob = float(probabilities[0][ai_index].item())
            human_prob = float(probabilities[0][human_index].item())

            return {
                "ai_probability": ai_prob,
                "human_probability": human_prob,
                "is_ai": ai_prob > 0.5,
                "verdict": "AI" if ai_prob > 0.5 else "Human"
            }

        except Exception as exc:
            logger.error(f"AI/Human detection failed: {exc}")
            return None

    def detect_model_family(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Detect which AI model family generated the text.
        """
        if not self._family_model or not text.strip():
            return None

        try:
            inputs = self._family_tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True
            ).to(self._device)

            with torch.no_grad():
                outputs = self._family_model(**inputs)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)

            id2label = self._family_model.config.id2label

            # Create readable probability dict
            all_probs = {
                id2label[i]: float(probabilities[0][i].item())
                for i in sorted(id2label.keys()) # Ensure order
            }

            top_idx = int(torch.argmax(probabilities[0]).item())
            family = id2label[top_idx]
            confidence = float(probabilities[0][top_idx].item())

            return {
                "family": family,
                "confidence": confidence,
                "all_probabilities": all_probs
            }

        except Exception as exc:
            logger.error(f"Model family detection failed: {exc}")
            return None

    def analyze_text(self, text: str) -> Tuple[Optional[Dict], Optional[Dict]]:
        """
        Full pipeline: 
        1. Check AI vs Human.
        2. If AI > 50%, check Family.
        """
        ai_result = self.detect_ai_human(text)
        
        family_result = None
        # Only burn compute on Family detection if it's actually AI
        if ai_result and ai_result.get("is_ai", False):
            family_result = self.detect_model_family(text)
        
        return ai_result, family_result

@lru_cache(maxsize=1)
def get_ai_detector() -> AIDetector:
    """Singleton accessor."""
    return AIDetector()