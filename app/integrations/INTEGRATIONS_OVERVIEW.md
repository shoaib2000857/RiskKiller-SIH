# Integrations Module Overview (app/integrations/)

## Purpose
Wrap external AI services with resilient, testable interfaces so the core pipeline can run even when optional services are offline.

## Hugging Face Detector (hf_detector.py)
- Dual model workflow:
  - AI vs Human detector (LoRA on DeBERTa v3)
  - Model family classifier for attribution
- Automatic device selection (CUDA if available).
- Adapter-aware model loading with checkpoint fallbacks.
- Graceful degradation when model loading fails.

Inputs
- Raw text from intake.

Outputs
- ai_probability, human_probability, verdict
- Optional model_family + family probabilities

Environment and runtime controls
- DISABLE_AI_MODELS=true to skip model loading.
- HF_AI_HUMAN_MODEL to override the adapter checkpoint.

## Ollama Client (ollama_client.py)
- Local LLM semantic risk scoring.
- JSON-first response parsing with fallback regex extraction.
- Truncation logic to keep prompts bounded.
- Safe initialization: if Ollama is not running, the pipeline continues.

Inputs
- Raw text from intake.

Outputs
- risk score (0.0 - 1.0) or None

Environment and runtime controls
- OLLAMA_ENABLED, OLLAMA_MODEL, OLLAMA_HOST
- OLLAMA_PROMPT_CHARS, OLLAMA_TIMEOUT

## Reliability and Fallbacks
- All integrations are optional; the pipeline continues if models are missing.
- Errors are logged, not raised, to keep ingestion stable.

## Dependencies
- transformers, torch, peft
- ollama
- logging, json
