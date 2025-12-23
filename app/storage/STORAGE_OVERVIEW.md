# Storage Module Overview (app/storage/)

## Purpose
Provide a minimal SQLite persistence layer for cases, audit logs, and fingerprints.

## Schema (logical)
- cases
  - intake_id (PK)
  - raw_text, classification, composite_score
  - metadata_json, breakdown_json, provenance_json
  - summary_text, decision_reason, created_at

- audit_log
  - id (PK)
  - intake_id, action, actor, payload, created_at

- fingerprints
  - id (PK)
  - intake_id, content_hash, normalized_hash, created_at

## Data Lifecycle
- Each intake inserts/updates a case record.
- Each analysis emits an audit entry.
- A normalized hash is stored for fingerprint matches.

## Design Signals
- No heavy ORM: direct sqlite3 for clarity and portability.
- Automatic schema creation and minimal migration logic.
- Text normalization for fuzzy matching.

## Dependencies
- sqlite3, hashlib, json, pathlib
