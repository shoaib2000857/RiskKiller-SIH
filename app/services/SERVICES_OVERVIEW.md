# Services Module Overview (app/services/)

## Purpose
Coordinate the end-to-end analysis workflow and connect all core engines.

## Orchestrator (orchestrator.py)

### Pipeline stages
1. Generate intake id and timestamp.
2. Run stylometric + behavioral detection.
3. Verify provenance and watermark signatures.
4. Ingest into graph intelligence store.
5. Persist case, audit log, and fingerprints.
6. Emit SSE event for dashboards.

### Sharing workflow
- Fetch case data from local storage (or main node).
- Build policy tags and prepare payload.
- Generate sharing package with hop trace.
- Optionally publish to federated ledger destination node.

### Event streaming
- Uses an asyncio Queue to deliver realtime events to SSE endpoints.
- Drops oldest events if queue is full.

## Integration Points
- Detection engine, watermark engine, graph engine
- Storage layer for cases and audit logs
- Federated ledger for cross-node sharing

## Dependencies
- asyncio, httpx, uuid, datetime
- fastapi.concurrency
