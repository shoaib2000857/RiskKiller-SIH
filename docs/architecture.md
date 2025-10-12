# Mitigating Malign LLM Operations — MVP Architecture

## High-Level Overview
- **Goal**: deliver an end-to-end prototype that ingests suspicious content, scores malign risk, inspects provenance, surfaces graph-level intelligence, and exposes results through secure APIs and a minimal analyst dashboard.
- **Stack**: Python (FastAPI, Pydantic, NetworkX, scikit-learn), lightweight SQLite storage, JSON-based interchange, optional browser dashboard (HTMX + Tailwind via CDN to avoid build steps).

## Core Services
1. **Content Detection Service**
   - Hybrid heuristic + ML scoring (heuristics + Hugging Face detector).
   - Stylometric features (type-token ratio, bursts, punctuation entropy).
   - Lightweight linear model with pre-baked coefficients for offline use, wrapped as `DetectorEngine`.
   - Optional Hugging Face pipeline (`roberta-base-openai-detector`) for GPU-accelerated AI-vs-human probability.
   - Optional local Ollama integration to collect qualitative risk assessments.
   - Multimodal extension points (attachments metadata, URL intel).

2. **Watermark & Provenance Service**
   - Injects/verifies soft watermarks using seeded hash digests.
   - Supports external verification tokens (e.g., vendor-signed provenance).
   - Keeps tamper log with SHA-256 digests.

3. **Threat Graph Intelligence**
   - Builds interaction graph from submissions + known IOCs.
   - Uses NetworkX for clustering, PageRank, and cascade simulation.
   - Exposes summaries (communities, top influencers, propagation risk).

4. **Federated Sharing Layer**
   - Implements policy-controlled data packaging.
   - Signed JSON bundles plus access policies.
   - Simulated cross-border exchange via message queue abstraction.

5. **Analyst Portal**
   - Server-rendered dashboard (FastAPI + Jinja/HTMX) for detections, risk trends, and alerts.
   - Real-time feel via SSE endpoint streaming updates from in-memory bus.

## Data Flow
1. External SOC pushes suspect content to `/api/v1/intake`.
2. Pipeline orchestrator:
   - Runs detection engine → risk scores, narrative category suggestion.
   - Calls provenance service → watermark verification, signature checks.
   - Updates graph intelligence store with actor/content links.
   - Emits event to dashboard + persists to SQLite `cases` table.
3. Optional sharing packages generated via `/api/v1/share`.

## Security & Compliance Hooks
- Policy guard ensures privacy fields masked unless clearance allows.
- Differential privacy noise toggle for aggregate analytics.
- Audit log recorded for every access + decision.

## Deployment Blueprint
- Containerized FastAPI app (Uvicorn) + SQLite volume.
- Background workers launched via built-in scheduler (FastAPI lifespan task).
- Use JWT auth for API; environment variable secrets.

## Extensibility Roadmap (post-MVP)
- Replace heuristic detector with fine-tuned transformer (Hugging Face integration).
- Integrate streaming social APIs, threat intel feeds.
- Add blockchain audit trail for federated sharing receipts.
- Expand to image/video fingerprinting (CLIP, watermark detectors).
