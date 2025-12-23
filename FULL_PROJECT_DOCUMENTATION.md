# TattvaDrishti - Complete Project Documentation

## 1. Executive Summary
TattvaDrishti is a prototype platform for detecting and mitigating malign information operations. It blends stylometric heuristics, AI model inference, semantic risk scoring, provenance checks, and graph intelligence into a single pipeline. A FastAPI backend powers ingestion and analysis, while a Next.js frontend delivers analyst-grade dashboards, live updates, and federated sharing controls.

This document is the full system reference: architecture, data flow, modules, API contracts, data models, configuration, operations, and extension points.

---

## 2. System Goals
- Detect AI-generated or coordinated malicious narratives.
- Provide explainable evidence trails (heuristics, model confidence, provenance notes).
- Track actors/narratives/regions in a graph intelligence layer.
- Enable cross-node sharing with encryption and tamper evidence.
- Deliver real-time analyst UX with live events and visual intelligence.
- Support future expansion to multimedia and federated ecosystems.

---

## 3. High-Level Architecture

### 3.1 Core Components
- **Backend (FastAPI)**: ingestion, analysis, storage, SSE, sharing, ledger endpoints.
- **Detection Engines**: stylometrics + behavior + AI detectors + semantic risk.
- **Provenance**: watermark and signature checks.
- **Graph Intelligence**: community, coordination, and propagation insights.
- **Federated Ledger**: encrypted and signed block logging with peer sync.
- **Frontend (Next.js)**: dashboards, metrics, maps, and sharing workflows.

### 3.2 Data Flow - Intake
1. `POST /api/v1/intake`
2. Orchestrator runs detection, provenance, graph ingestion.
3. Results persisted to SQLite.
4. SSE event emitted.
5. UI updates in real time.

### 3.3 Data Flow - Sharing
1. `POST /api/v1/share`
2. Policy tags and hop trace generated.
3. Sharing package returned to UI.
4. Optional federated ledger block created and broadcast.

### 3.4 Data Flow - Heatmap
1. Intake includes region metadata.
2. Normalized score logged into heatmap store.
3. UI fetches heatmap grid and renders.

### 3.5 Data Flow - Image Analysis
1. UI submits image to `/api/v1/image/analyze`.
2. Backend forwards to external moderation API.
3. UI renders AI/gore/offensive risk signals.

---

## 4. Backend Deep Dive (app/)

### 4.1 app/main.py
Role: API router for the entire backend.

Endpoints (core)
- `POST /api/v1/intake`: main analysis intake.
- `GET /api/v1/cases/{intake_id}`: fetch stored case.
- `POST /api/v1/share`: generate sharing package.
- `GET /api/v1/events/stream`: SSE stream.
- `GET /api/v1/integrations/threat-intel`: threat intel feed.
- `GET /api/v1/integrations/siem`: SIEM correlation payload.

Endpoints (support)
- Heatmap: `/api/v1/heatmap/add-risk-point`, `/api/v1/heatmap/grid`.
- Federated ledger: `/api/v1/federated/*`.
- Image analysis: `/api/v1/image/analyze`.

Behavior details
- Requires region metadata for heatmap logging.
- Uses role-based access check for intake and dashboard retrieval.
- Streams events via `StreamingResponse` and SSE format.
- Enables permissive CORS for local development.
- Initializes orchestrator, storage, and federated ledger at startup.

---

### 4.2 app/config.py
Centralized environment configuration.

Key settings
- `APP_ENV`: dev/prod (dev bypasses auth).
- `APP_SECRET`: package signing secret.
- `DATABASE_URL`: SQLite connection string.
- `allowed_origins`: CORS allowlist (defaults to `*`).

AI settings
- `HF_MODEL_NAME`, `HF_TOKENIZER_NAME`, `HF_DEVICE`, `HF_SCORE_THRESHOLD`.
- `OLLAMA_ENABLED`, `OLLAMA_MODEL`, `OLLAMA_HOST`, `OLLAMA_TIMEOUT`, `OLLAMA_PROMPT_CHARS`.

Federation
- `BLOCK_ENCRYPTION_KEY`, `FEDERATED_NODES`, `NODE_URL`.

Image moderation
- `SIGHTENGINE_API_USER`, `SIGHTENGINE_API_SECRET`.

---

### 4.3 app/schemas.py
Pydantic models for input/output.

Core models
- `ContentIntake`: text (min 20 chars), language, source, metadata, tags.
- `SourceMetadata`: platform, region, actor_id, related_urls.
- `DetectionBreakdown`: stylometrics, heuristics, AI signals.
- `DetectionResult`: full output for API and UI.
- `GraphSummary`, `GNNCluster`, `CoordinationAlert`, `PropagationChain`.
- `SharingRequest`, `SharingPackage`.

---

### 4.4 app/models/detection.py
Stylometric + heuristic detection engine that blends linguistic statistics, behavioral cues, and AI inference into a composite risk score.

Feature extraction (linguistic)
- MATTR lexical diversity (windowed type-token ratio).
- Sentence length variance for cadence irregularities.
- Token burstiness and repetition rate for templated phrasing.
- Character entropy for predictability signals.
- Punctuation variety and uppercase ratio.
- Vocabulary richness proxy (HHI-style concentration).

Behavioral heuristics
- Urgency and CTA detection (regex-based patterns).
- Emotional manipulation indicators via valence words.
- High-risk platform boosts (e.g., anonymized/telegram).
- Tag-based risk boosts (e.g., extremism, disinfo-campaign).

AI fusion
- Hugging Face AI detector + optional model-family attribution.
- Optional Ollama semantic risk scoring for qualitative context.
- Weighted blending with sigmoid-normalized stylometric score.

Classification logic
- Composite score mapped to `low-risk`, `medium-risk`, `high-risk` buckets.
- Decision rationale generated from dominant heuristics and AI confidence.

Outputs
- Composite score (0-1).
- Classification bucket.
- DetectionBreakdown with anomalies, heuristics, and optional AI signals.

---

### 4.5 app/integrations/hf_detector.py
Hugging Face inference pipeline.

Primary models
- AI vs Human detector: DeBERTa v3 base + LoRA adapter.
  - Adapter repo: `ShoaibSSM/ai_vs_human_detector_deberta_v3_lora`.
  - Default checkpoint: `checkpoint-68090`.
  - Base model pulled dynamically from adapter config.
- Model family classifier: `XOmar/model_family_detector_deberta_v3_balanced`.
  - Used to attribute likely model family when AI text is detected.

Loading behavior
- Adapter-aware loading with checkpoint subfolder resolution.
  - If `/checkpoint-*` is present, resolves repo + subfolder.
  - Falls back to parent repo if config not found in subfolder.
- Tokenizer loading prioritizes adapter repo; falls back to base model tokenizer.
- Automatic device selection (CUDA if available, else CPU).
- `DISABLE_AI_MODELS=true` skips all model loading for deterministic tests or lighter nodes.

Inference outputs
- `ai_probability`, `human_probability`, `is_ai`, `verdict`.
- `model_family`, `model_family_confidence`, and full family probabilities if available.

---

### 4.6 app/integrations/ollama_client.py
Local LLM semantic scoring.

Features
- Prompt truncation to fit token budgets.
- JSON-first extraction with numeric fallback.
- Defensive initialization (no crash if Ollama missing).

Expected model response
- JSON only: `{\"risk\": 0.0, \"justification\": \"brief\"}`.
- Parser also accepts numeric fallbacks like `risk: 0.7`.

Runtime behavior
- Uses low temperature for consistent scoring.
- Limits generation length for faster responses.
- Returns `None` if server is unavailable or output is malformed.

---

### 4.7 app/models/graph_intel.py
Graph intelligence engine that builds an interaction graph for actors, content, narratives, and regions to surface coordination and propagation risk.

Core features
- Adds nodes for content, actors, narratives, and regions.
- Tracks per-actor score history and averages.
- Builds edges for publication, targeting, and origin relations.
- Uses optional torch tensors for a GNN-like score projection.
- Summarizes:
  - High-risk actors
  - Communities
  - GNN clusters
  - Coordination alerts
  - Propagation chains

Outputs
- `GraphSummary` for UI.
- `ThreatIntelFeed` and `SIEMCorrelationPayload` for integrations.

---

### 4.8 app/models/watermark.py
Provenance checks for watermark and signature validation.

Features
- Regex-based watermark and signature detection.
- Probabilistic watermark fingerprint when missing.
- Time-based signature validation using a rotating daily hash.
- Returns validation notes to preserve analyst context.

---

### 4.9 app/models/sharing.py
Sharing package engine that builds secure, auditable bundles for federated exchange.

Features
- Signed JSON envelope using `APP_SECRET`.
- Policy tags: privacy redaction + export-control markers.
- Multi-hop route simulation with latency and provider metadata.
- Stable package IDs and timestamped creation metadata.

---

### 4.10 app/services/orchestrator.py
Pipeline orchestrator that connects detection, provenance, graph intel, storage, and federation.

Stages
1. Generate intake id and timestamp.
2. Run detection and behavioral heuristics.
3. Run provenance and watermark checks.
4. Ingest into graph intelligence.
5. Persist case, audit, and fingerprint records.
6. Emit SSE event for dashboards.

Sharing workflow
- Fetches case data locally or from a main node.
- Applies policy tags and redaction rules.
- Builds hop trace and signs package.
- Optionally publishes a ledger block to destination node.

---

### 4.11 app/storage/database.py
SQLite persistence layer for cases, audit logs, and fingerprints.

Tables
- `cases`: full analysis output (classification, composite, breakdown, provenance).
- `audit_log`: append-only action log.
- `fingerprints`: normalized hashes for re-identification.

Behavior
- Auto-initialize tables and add missing columns.
- Inserts or replaces cases by intake id.
- Normalized hashing for fuzzy matching.

---

### 4.12 app/federated/*
Federated ledger subsystem for tamper-evident intelligence sharing.

Components
- `ledger.py`: block structure with canonical payload serialization.
- `manager.py`: chain storage, validation, and reset.
- `node.py`: peer discovery and block broadcast.
- `crypto.py`: Fernet encryption + Ed25519 signing and verification.

Key behaviors
- Genesis block creation on first run.
- Validation checks: previous hash, hash integrity, signature verification.
- Peer broadcast for replication.
- Chain sync from the longest valid peer chain.

---

## 5. Frontend Deep Dive (frontend/)

### 5.1 Routes
- `/`: full analyst dashboard
- `/simple`: simplified workflow
- `/superuser`: admin-level monitoring

### 5.2 Main Features
- Live SSE updates with reconnection logic.
- Intake form with metadata, tags, region hints, and optional speech capture.
- Case list + drill-down with decision rationale and graph summary.
- Sharing package generation with PII redaction controls.
- Federated ledger inspection and validation tools.
- Heatmap visualization for geo risk.
- Image analyzer for AI and safety signals.

### 5.3 Key Components
- `IntakeForm`: structured input + region hints + speech capture
- `CaseTable` / `CaseDetail`: triage and forensic drilldown
- `EventsFeed`: SSE updates
- `RadarChart` + `Speedometer`: risk visuals
- `HopTraceMap`: route visualization
- `FederatedBlockchain`: ledger validation and sync
- `WorldHeatmapLeaflet`: geo risk
- `ImageAnalyzer`: AI and moderation signals

### 5.4 Frontend API Layer
- `submitIntake`, `fetchCase`, `requestSharingPackage`, `createEventStream`
- Environment variables for API/node URLs

Behavior notes
- `createEventStream` uses `EventSource` and reconnect logic in pages.
- Case hydration occurs after SSE events to fetch full breakdowns.
- Sharing always targets the main API so it can access stored cases.

---

### 5.5 UX Design Intent
- Analyst-first workflows: quick risk readouts, deep drill-down on demand.
- Progressive disclosure: summary metrics first, detailed panels second.
- Live feedback: SSE updates, toasts, and status indicators.
- Multi-role views: simplified vs superuser surfaces show capability breadth.

---

## 6. API Contract Reference (Detailed)

### 6.1 POST /api/v1/intake
Request
```json
{
  "text": "string (min 20 chars)",
  "language": "en",
  "source": "unknown",
  "metadata": {
    "platform": "telegram-channel",
    "region": "Mumbai",
    "actor_id": "actor_123",
    "related_urls": ["https://example.com"]
  },
  "tags": ["disinfo-campaign"]
}
```

Response (DetectionResult)
```json
{
  "intake_id": "uuid",
  "submitted_at": "2025-01-01T00:00:00Z",
  "composite_score": 0.78,
  "classification": "high-risk",
  "breakdown": {
    "linguistic_score": 0.63,
    "behavioral_score": 0.72,
    "ai_probability": 0.85,
    "model_family": "gpt",
    "model_family_confidence": 0.64,
    "ollama_risk": 0.7,
    "stylometric_anomalies": {"entropy": 0.42},
    "heuristics": ["Urgent CTA detected"]
  },
  "provenance": {
    "watermark_present": false,
    "watermark_hash": "abc",
    "signature_valid": false,
    "validation_notes": ["No embedded watermark detected"],
    "content_hash": "sha256..."
  },
  "graph_summary": {
    "node_count": 10,
    "edge_count": 9,
    "high_risk_actors": ["actor::anon::123"],
    "communities": []
  },
  "summary": "High-risk classification for a narrative...",
  "findings": ["Urgent CTA detected"],
  "decision_reason": "Triggered heuristics..."
}
```

Errors
- 400: missing region
- 401/403: permission check failed

---

### 6.2 GET /api/v1/cases/{intake_id}
Returns stored case with full breakdown.

Notes
- `graph_summary` is generated from the current in-memory graph state.
- Used by the UI to hydrate detail panels after SSE events.

---

### 6.3 POST /api/v1/share
Request
```json
{
  "intake_id": "uuid",
  "destination": "USA",
  "justification": "Joint task force request",
  "include_personal_data": false
}
```

Response (SharingPackage)
```json
{
  "package_id": "pkg-uuid",
  "created_at": "2025-01-01T00:00:00Z",
  "destination": "USA",
  "policy_tags": ["classified:restricted", "privacy:pii-redacted"],
  "payload": {"intake_id": "uuid"},
  "signature": "sha256...",
  "hop_trace": [
    {
      "id": "HOP-1-Mumbai-IN",
      "name": "Analyst Edge Relay",
      "city": "Mumbai, IN",
      "coords": [19.076, 72.8777],
      "ip": "10.0.0.1",
      "provider": "ISP Edge",
      "latency": 22,
      "note": "Forwarding payload via encrypted tunnel."
    }
  ],
  "risk_level": "high-risk",
  "composite_score": 0.78
}
```

Errors
- 404: unknown intake

---

### 6.4 GET /api/v1/events/stream
SSE stream with events:
```
data: {"type":"analysis_completed","intake_id":"uuid","score":0.7}
```

Event fields
- type: event name (`analysis_completed`).
- intake_id: case identifier.
- score: composite score.
- classification: bucket label.
- submitted_at: ISO timestamp.

---

### 6.5 Federated Endpoints
- `POST /api/v1/federated/add_block`
- `POST /api/v1/federated/receive_block`
- `GET /api/v1/federated/chain`
- `GET /api/v1/federated/validate`
- `GET /api/v1/federated/validate_local`
- `POST /api/v1/federated/reset_chain`
- `POST /api/v1/federated/sync_chain`
- `GET /api/v1/federated/decrypt_block/{index}`

Typical use
- `validate_local`: quick integrity check for a node.
- `validate`: network-wide consensus scan.
- `sync_chain`: recovery from tampering or drift.
- `decrypt_block`: admin-only inspection of encrypted payloads.

---

### 6.6 Image Analysis
`POST /api/v1/image/analyze` with multipart form data.

Request fields
- `file`: image file.
- `models`: comma-separated model list (e.g., genai, violence, gore-2.0).

Behavior
- Backend forwards image and parameters to Sightengine API.
- UI renders confidence values and risk-level labels.

Common model flags
- genai, violence, gore-2.0, offensive-2.0, self-harm, text-content, qr-content, properties.

---

### 6.7 Threat Intel Feed
`GET /api/v1/integrations/threat-intel`

Purpose
- Returns a normalized threat intel feed derived from graph summaries.

Response highlights
- `graph_summary`: same structure as case summaries.
- `indicators`: aggregated IOC list from high-risk actors, clusters, and alerts.
- `dataset_fingerprint`: SHA1 of the summary payload for deduplication.

---

### 6.8 SIEM Correlation Payload
`GET /api/v1/integrations/siem`

Purpose
- Returns correlation keys and alert signals designed for SIEM pipelines.

Response highlights
- `alerts`: coordination alerts with risk scores.
- `propagation_chains`: potential spread paths.
- `correlation_keys`: identifiers for clustering downstream.

---

### 6.9 Heatmap API
Endpoints
- `POST /api/v1/heatmap/add-risk-point`
- `GET /api/v1/heatmap/grid`

Purpose
- Persist regional risk points for geographic visualization.

Request (add-risk-point)
```json
{
  "region_name": "Mumbai",
  "final_risk_score": 72
}
```

Response (grid)
```json
{
  "points": [
    {
      "region_name": "Mumbai",
      "latitude": 19.076,
      "longitude": 72.8777,
      "final_risk_score": 72,
      "timestamp": "2025-01-01T00:00:00Z"
    }
  ]
}
```

Notes
- Region names must exist in the backend region map.
- Points are persisted to `data/heatmap_points.json`.

---

## 7. Storage Schema Reference

### 7.1 cases
- intake_id (PK)
- raw_text
- classification
- composite_score
- metadata_json
- breakdown_json
- provenance_json
- summary_text
- decision_reason
- created_at

### 7.2 audit_log
- id (PK)
- intake_id
- action
- actor
- payload
- created_at

### 7.3 fingerprints
- id (PK)
- intake_id
- content_hash
- normalized_hash
- created_at

### 7.4 federated ledger
- idx
- ts
- data_encrypted
- previous_hash
- hash
- signature
- public_key

Schema notes
- `cases.intake_id` is the natural primary key for all related tables.
- `audit_log` is append-only for traceability.
- `fingerprints` enable exact and normalized hash matches.
- Ledger uses `idx` as the block index and ordering key.

---

## 8. Environment Variables Reference

Backend
- APP_ENV (dev/prod behavior)
- APP_SECRET (sharing package signature seed)
- DATABASE_URL (SQLite path)
- HF_MODEL_NAME / HF_TOKENIZER_NAME (HF model override)
- HF_DEVICE (CPU or GPU id)
- HF_SCORE_THRESHOLD (AI detector cutoff)
- OLLAMA_ENABLED / OLLAMA_MODEL / OLLAMA_HOST / OLLAMA_TIMEOUT
- BLOCK_ENCRYPTION_KEY (Fernet key shared by nodes)
- FEDERATED_NODES (comma-separated node list)
- NODE_URL (this node's URL)
- SIGHTENGINE_API_USER / SIGHTENGINE_API_SECRET

Frontend
- NEXT_PUBLIC_API_BASE_URL (backend base URL)
- NEXT_PUBLIC_NODE1_URL..NEXT_PUBLIC_NODE4_URL (federated node URLs)

---

## 9. Operational Guides

### 9.1 Local Development
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

```bash
cd frontend
npm install
npm run dev
```

Optional local setup
- Create `.env` for backend settings (DB path, HF/Ollama toggles).
- Create `frontend/.env.local` for API base URL.
- Start Ollama if semantic risk is enabled:
  - `ollama serve`
  - `ollama pull llama3.2:3b`

### 9.2 Multi-node Federation
```bash
docker-compose up --build
```

### 9.3 Tests
```bash
pytest
```

---

## 10. Constraints and Tradeoffs
- SQLite chosen for portability; not optimized for high concurrency or large datasets.
- Optional AI integrations require large model downloads and GPU for speed.
- Ollama semantic scoring depends on a local LLM runtime.
- Federated ledger is a lightweight simulation without economic consensus.
- Heatmap requires region-to-coordinates mapping to be populated.

---

## 11. Roadmap Ideas
- Upgrade storage to Postgres or distributed DB.
- Add external social data ingestion.
- Extend to image/video watermark detection.
- Add role-based UI gating.

---

## 12. Feature Index

Backend
- app/main.py
- app/config.py
- app/schemas.py
- app/models/detection.py
- app/models/graph_intel.py
- app/models/watermark.py
- app/models/sharing.py
- app/integrations/hf_detector.py
- app/integrations/ollama_client.py
- app/services/orchestrator.py
- app/storage/database.py
- app/federated/*

Frontend
- frontend/app/page.js
- frontend/app/simple/page.js
- frontend/app/superuser/page.js
- frontend/components/*
- frontend/lib/api.js

Docs
- docs/architecture.md
- docs/FEDERATED_BLOCKCHAIN.md
- docs/OLLAMA_SETUP.md
- docs/OLLAMA_INTEGRATION.md
