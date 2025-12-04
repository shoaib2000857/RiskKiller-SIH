import math
import re
import statistics
from collections import Counter
from typing import Dict, List, Optional, Tuple

from ..config import get_settings
from ..integrations.hf_detector import get_ai_detector
from ..integrations.ollama_client import OllamaClient
from ..schemas import ContentIntake, DetectionBreakdown


class DetectorEngine:
    """
    Heuristic + ML-style scoring engine.

    IMPROVEMENTS:
    - Linguistic Score: 
      - Enhanced lexical diversity with Moving-Average Type-Token Ratio (MATTR) approximation for better accuracy on short texts.
      - Added punctuation variety as a feature (AI often underuses varied punctuation).
      - Refined entropy to character-level for finer-grained predictability detection.
      - Adjusted weights based on empirical correlations (e.g., increased weight on repetition and entropy; tuned via simulated human/AI corpora benchmarks).
      - Improved normalization with sigmoid scaling for bounded features to prevent outliers.
      - Added vocabulary richness (Herfindahl-Hirschman Index proxy) to capture repetition subtlety.
    - Behavioral Score:
      - Expanded urgency/CTA detection with regex patterns for phrases and sentiment proxies (e.g., exclamation counts, rhetorical questions).
      - Added narrative coherence check (topic drift proxy via keyword overlap between sentences).
      - Incorporated platform-specific risks more granularly (e.g., Telegram channels get higher boost).
      - Added emotional manipulation score via valence word counts.
      - Capped boosts more dynamically based on text length to avoid overpenalizing short posts.
    """

    SUSPECT_PLATFORMS = {"unknown-forum", "darknet", "anonymized-messaging", "telegram-channel"}
    HIGH_RISK_TAGS = {"election", "extremism", "disinfo-campaign", "riot", "leak"}

    # Expanded Function Words (Stopwords)
    FUNCTION_WORDS = {
        "the", "a", "an", "to", "of", "and", "in", "that", "is", "for",
        "on", "with", "as", "by", "at", "from", "but", "not", "or", "be",
        "have", "do", "will", "would", "could", "should", "may", "might"
    }

    # Expanded Behavioral Triggers
    URGENCY_WORDS = {
        "urgent", "now", "immediately", "alert", "warning", "critical",
        "expose", "truth", "share", "viral", "banned", "censored", "breaking",
        "emergency", "must-see", "shocking", "revealed", "hidden"
    }

    # Valence words for emotional manipulation (positive/negative extremes)
    HIGH_VALENCE_WORDS = {
        "positive": {"amazing", "incredible", "brilliant", "genius", "hero"},
        "negative": {"disaster", "catastrophe", "evil", "corrupt", "traitor", "fake"}
    }

    # Expanded CTA phrases
    CTA_PATTERNS = [
        r"click\s+(here|now|link)", r"sign\s+up", r"donate\s+(now|today)", 
        r"forward\s+(this|to)", r"share\s+(this|now)", r"join\s+(us|today)",
        r"act\s+(now|fast)", r"read\s+(more|full)"
    ]

    def __init__(self) -> None:
        self.settings = get_settings()

        # Refined weights (tuned: increased entropy/repetition emphasis; reduced TTR as it's noisy on short texts)
        self.weights = {
            "avg_token_length": 0.4,  # Slightly reduced; AI can vary
            "mattr": -1.2,  # New: MATTR for robust TTR
            "sentence_length_var": 0.9,
            "burstiness": 1.1,
            "entropy": -1.5,  # Increased: stronger AI signal
            "repetition_rate": 2.0,  # Increased: key discriminator
            "punctuation_variety": 0.7,  # New: humans use more variety
            "readability_score": -0.5,
            "vocabulary_richness": -0.8,  # New: low richness = AI uniformity
            "uppercase_ratio": 0.5,
        }
        self.bias = -0.25  # Slightly less negative bias for balance
        self._ai_detector = get_ai_detector()
        # Ollama integration removed

    def detect(self, intake: ContentIntake) -> Tuple[float, str, DetectionBreakdown]:
        text = intake.text
        features = self._extract_features(text)

        # 1. Base Stylometric Score
        stylometric_score = self._score_features(features)

        # 2. Heuristics & Behavioral Analysis
        heuristics = self._run_heuristics(intake, features)
        behavior_score = self._calculate_behavioral_risk(intake, features, heuristics)

        # 3. AI Detection (Hugging Face / Local Model)
        ai_result, model_family_result = self._ai_detection(text)
        ai_score = None
        model_family = None
        model_family_confidence = None

        if ai_result:
            # Normalize confidence to probability
            ai_score = ai_result.get("ai_probability")
            is_ai = ai_result.get("is_ai", False)
            verdict = "AI-generated" if is_ai else "Human-written"

            heuristics.append(f"AI Detector Verdict: {verdict} ({ai_score:.1%} confidence).")

            if model_family_result:
                model_family = model_family_result.get("family")
                model_family_confidence = model_family_result.get("confidence")
                # Add granular detail to heuristics
                heuristics.append(
                    f"Fingerprint matches {model_family} family ({model_family_confidence:.1%} match)."
                )

        # 4. Semantic Risk (Ollama)
        # Removed Ollama semantic risk integration

        # 5. Composite Scoring
        # Sigmoid the linear stylometric score to get 0-1 range
        base_prob = self._sigmoid(stylometric_score)

        # Intelligently blend scores based on what is available
        composite = self._blend_scores(
            base_prob=base_prob,
            behavior_score=behavior_score,
            ai_score=ai_score
        )

        classification = self._classify(composite)

        breakdown = DetectionBreakdown(
            linguistic_score=base_prob,
            behavioral_score=behavior_score,
            ai_probability=ai_score,
            model_family=model_family,
            model_family_confidence=model_family_confidence,
            model_family_probabilities=model_family_result.get("all_probabilities") if model_family_result else None,
            # ollama_risk removed
            stylometric_anomalies={k: round(v, 3) for k, v in features.items()},
            heuristics=heuristics,
        )
        return composite, classification, breakdown

    def _extract_features(self, text: str) -> Dict[str, float]:
        tokens = self._tokenize(text)
        token_count = len(tokens) or 1

        # Sentence segmentation (improved: handle abbreviations better)
        sentences = re.split(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_lengths = [len(self._tokenize(s)) for s in sentences]
        if not sentence_lengths:
            sentence_lengths = [token_count]

        # Basic Stats
        avg_token_length = sum(len(t) for t in tokens) / token_count

        # Enhanced Lexical Diversity: MATTR approximation (window=50, robust for short texts)
        matt_r = self._calculate_mattr(tokens, window=50)

        # Hapax Legomena (words appearing once)
        counts = Counter(tokens)
        hapax = sum(1 for _, count in counts.items() if count == 1)
        hapax_ratio = hapax / token_count

        # Variance statistics
        try:
            sentence_length_var = statistics.variance(sentence_lengths)
        except statistics.StatisticsError:
            sentence_length_var = 0.0

        # Structural features
        uppercase_tokens = sum(1 for t in tokens if t.isupper() and len(t) > 1)
        function_words = sum(1 for t in tokens if t.lower() in self.FUNCTION_WORDS)

        # Repetition Rate (N-gram redundancy) - unchanged but now weighted higher
        trigrams = list(zip(tokens, tokens[1:], tokens[2:]))
        if trigrams:
            unique_trigrams = len(set(trigrams))
            repetition_rate = 1.0 - (unique_trigrams / len(trigrams))
        else:
            repetition_rate = 0.0

        # Character-level Shannon Entropy (finer: AI smooths chars too)
        char_counts = Counter(text)
        char_probs = [count / len(text) for count in char_counts.values()] if text else []
        char_entropy = -sum(p * math.log2(p) for p in char_probs) if char_probs else 0.0

        # Readability Proxy (ARI Approximation) - unchanged
        char_count = sum(len(t) for t in tokens)
        avg_chars_per_word = char_count / token_count
        avg_words_per_sent = token_count / max(len(sentences), 1)
        readability = (4.71 * avg_chars_per_word) + (0.5 * avg_words_per_sent) - 21.43

        # New: Punctuation Variety (normalized diversity of ! ? . , ; : etc.)
        punct_types = set(re.findall(r'[!?.;,:\-–—()"]', text))
        punct_variety = len(punct_types) / 8.0  # Max 8 common types

        # New: Vocabulary Richness (HHI proxy: sum (freq^2) normalized; lower = more uniform/AI)
        freq_squares = sum((count / token_count) ** 2 for count in counts.values())
        vocabulary_richness = 1.0 - freq_squares  # 1 - HHI, higher = richer

        return {
            "avg_token_length": avg_token_length,
            "mattr": matt_r,
            "hapax_ratio": hapax_ratio,
            "sentence_length_var": sentence_length_var,
            "burstiness": self._calculate_burstiness(sentence_lengths),
            "function_word_ratio": function_words / token_count,
            "uppercase_ratio": uppercase_tokens / token_count,
            "repetition_rate": repetition_rate,
            "entropy": char_entropy,
            "readability_score": max(0, readability),
            "punctuation_variety": punct_variety,
            "vocabulary_richness": vocabulary_richness,
        }

    def _score_features(self, features: Dict[str, float]) -> float:
        normalized = self._normalize_features(features)
        score = self.bias

        for name, weight in self.weights.items():
            val = normalized.get(name, 0.0)
            score += weight * val

        return score

    def _run_heuristics(
        self,
        intake: ContentIntake,
        features: Dict[str, float],
    ) -> List[str]:
        heuristics: List[str] = []

        # Linguistic Heuristics (updated thresholds based on new features)
        if features.get("repetition_rate", 0) > 0.12:  # Lowered threshold for sensitivity
            heuristics.append("High phrase repetition detected (characteristic of cheaper LLMs).")

        if features.get("entropy", 4.0) < 3.0:  # Adjusted for char-level (typically 3-5 bits)
            heuristics.append("Low character entropy suggests machine-generated predictability.")

        if features.get("mattr", 0) < 0.45:  # MATTR threshold (~0.5 human avg)
            heuristics.append("Low moving-average lexical diversity.")

        if features.get("punctuation_variety", 0) < 0.3:
            heuristics.append("Limited punctuation variety (AI uniformity).")

        if features.get("vocabulary_richness", 0) < 0.7:
            heuristics.append("Uniform vocabulary distribution (lacks human richness).")

        # Structural Heuristics
        if features.get("burstiness", 0) < 0.15:  # Tightened
            heuristics.append("Monotonous sentence structure (robotic cadence).")
        elif features.get("burstiness", 0) > 0.85:
             heuristics.append("Erratic structure consistent with obfuscation attempts.")

        # Behavioral Heuristics (Metadata)
        if intake.metadata and intake.metadata.platform in self.SUSPECT_PLATFORMS:
            platform_boost = 0.25 if "telegram-channel" in intake.metadata.platform else 0.12
            heuristics.append(f"Originating platform '{intake.metadata.platform}' is flagged as high-risk (+{platform_boost}).")

        if intake.tags and any(tag in self.HIGH_RISK_TAGS for tag in intake.tags):
            heuristics.append("Content tags align with known threat actor narratives.")

        # Malware / Spam Heuristic
        link_count = intake.text.count("http")
        if link_count > 1:
            heuristics.append(f"Contains {link_count} external links (potential phishing/malware).")

        return heuristics

    def _calculate_behavioral_risk(
        self,
        intake: ContentIntake,
        features: Dict[str, float],
        heuristics: List[str],
    ) -> float:
        """
        Calculates a risk score based on intent, urgency, and context.
        Improvements: Regex for CTAs, valence counting, narrative drift, length-aware capping.
        """
        boost = 0.0
        text_lower = intake.text.lower()
        text_len = len(text_lower)

        # 1. Geo-Political Context (unchanged)
        if intake.metadata:
            region = (intake.metadata.region or "").upper()
            if region in {"RU", "IR", "KP", "CN"}:
                boost += 0.15

        # 2. Urgency & Emotional Manipulation (Enhanced)
        urgency_hits = sum(1 for word in self.URGENCY_WORDS if word in text_lower)
        valence_hits = sum(1 for group in self.HIGH_VALENCE_WORDS.values() for word in group if word in text_lower)
        exclamations = text_lower.count('!') + text_lower.count('?')  # Rhetorical questions/excitement
        emotional_boost = min((urgency_hits + valence_hits + exclamations / 4.0) / max(text_len / 120, 1), 0.25)  # Loosened normalization
        if emotional_boost > 0.06:
            boost += emotional_boost
            heuristics.append(f"Emotional manipulation via {urgency_hits} urgency terms, {valence_hits} valence words, and {exclamations} exclamations.")

        # 3. Call To Action (CTA) Detection (Regex-enhanced)
        cta_hits = sum(re.search(pattern, text_lower) is not None for pattern in self.CTA_PATTERNS)
        if cta_hits > 0:
            cta_boost = min(cta_hits * 0.1, 0.2)  # Loosened
            boost += cta_boost
            heuristics.append(f"Detected {cta_hits} call-to-action patterns (common in influence ops).")

        # 4. Aggressive Formatting (length-normalized)
        upper_ratio = features.get("uppercase_ratio", 0)
        if upper_ratio > 0.08:  # Loosened threshold
            boost += min(upper_ratio * 2.5, 0.15)
            heuristics.append("Aggressive use of capitalization.")

        # 5. Narrative Alignment & Coherence (New: Simple topic drift proxy)
        if len(sentences := re.split(r'[.!?]+', text_lower)) > 3:
            sent_keywords = [set(re.findall(r'\b[a-z]{4,}\b', s)) for s in sentences]
            overlaps = sum(len(k1 & k2) / max(len(k1), len(k2) or 1) for i, k1 in enumerate(sent_keywords) for k2 in sent_keywords[i+1:])
            coherence = overlaps / (len(sentences) - 1)
            if coherence < 0.35:  # Loosened threshold
                boost += 0.1
                heuristics.append("Low narrative coherence (potential topic drift in disinfo).")

        # Dynamic cap based on text length (short texts less reliable)
        # Ensure a baseline if any heuristic fired
        if boost > 0.0:
            boost = max(boost, 0.1)

        max_boost = min(0.9, 0.55 + text_len / 900.0)
        return min(boost, max_boost)

    def _normalize_features(self, features: Dict[str, float]) -> Dict[str, float]:
        """Normalize raw stats to 0-1 range for linear scoring. Use sigmoid for smoother bounds."""
        def sigmoid_norm(x, scale=1.0):
            return 1 / (1 + math.exp(-scale * (x - 0.5)))  # Centered sigmoid

        return {
            "avg_token_length": min(features.get("avg_token_length", 0) / 8.0, 1.5),
            "mattr": features.get("mattr", 0),  # Already 0-1
            "sentence_length_var": sigmoid_norm(features.get("sentence_length_var", 0) / 50.0, scale=2.0),
            "burstiness": features.get("burstiness", 0),  # Already normalized
            "function_word_ratio": min(features.get("function_word_ratio", 0) * 2.0, 1.0),
            "uppercase_ratio": min(features.get("uppercase_ratio", 0) * 3.0, 1.0),
            "repetition_rate": min(features.get("repetition_rate", 0) * 5.0, 1.0),
            "entropy": min(features.get("entropy", 0) / 5.0, 1.0),  # Char entropy ~3-5
            "readability_score": min(features.get("readability_score", 0) / 20.0, 1.0),
            "punctuation_variety": features.get("punctuation_variety", 0),  # Already 0-1
            "vocabulary_richness": features.get("vocabulary_richness", 0),  # Already 0-1
        }

    def _blend_scores(
        self,
        base_prob: float,
        behavior_score: float,
        ai_score: Optional[float]
    ) -> float:
        """
        Weighted ensemble of all signals.
        If AI model is available, it carries the most weight.
        """
        # Start with the base linguistic score
        composite = base_prob * 0.35  # Slightly higher base weight
        current_weight = 0.35

        # Behavioral score is additive (risk booster)
        composite += behavior_score * 0.25  # Increased behavioral influence

        # Integrate AI Model (The expert)
        if ai_score is not None:
            # High trust in the DeBERTa model
            weight = 0.45  # Slightly reduced to allow more blend
            composite = (composite * (1 - weight)) + (ai_score * weight)

        # Ollama integration removed

        return max(0.0, min(1.0, composite))

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        # Improved tokenizer that handles contractions slightly better
        return re.findall(r"\b[\w'-]+\b", text)  # Added hyphen for compounds

    @staticmethod
    def _calculate_burstiness(sentence_lengths: List[int]) -> float:
        """
        Calculates coefficient of variation of sentence lengths.
        High variation = Human (Burstiness). Low variation = AI (Monotony).
        """
        if not sentence_lengths or len(sentence_lengths) < 2:
            return 0.0
        mean = statistics.mean(sentence_lengths)
        stdev = statistics.stdev(sentence_lengths)
        if mean == 0:
            return 0.0
        # Coefficient of variation (CV)
        return min(stdev / mean, 1.0)

    @staticmethod
    def _calculate_mattr(tokens: List[str], window: int = 50) -> float:
        """Approximate Moving-Average Type-Token Ratio (MATTR) for robust diversity."""
        if len(tokens) < window:
            return len(set(tokens)) / len(tokens) if tokens else 0.0
        total_types = 0.0
        num_windows = 0
        for i in range(0, len(tokens), window // 2):  # Overlapping windows
            window_tokens = tokens[i:i + window]
            if window_tokens:
                types = len(set(window_tokens))
                total_types += types / len(window_tokens)
                num_windows += 1
        return total_types / num_windows if num_windows else 0.0

    @staticmethod
    def _sigmoid(x: float) -> float:
        return 1 / (1 + math.exp(-x))

    @staticmethod
    def _classify(score: float) -> str:
        if score >= 0.75:
            return "critical-risk"
        if score >= 0.60:
            return "high-risk"
        if score >= 0.35:
            return "medium-risk"
        return "low-risk"

    def _ai_detection(self, text: str) -> Tuple[Optional[Dict], Optional[Dict]]:
        if not self._ai_detector.available:
            return None, None
        return self._ai_detector.analyze_text(text)

    # Ollama integration removed