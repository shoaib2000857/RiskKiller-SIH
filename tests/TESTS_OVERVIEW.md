# Tests Overview (tests/)

## Purpose
Validate critical logic in the detection and sharing pipeline while keeping test runtime lightweight.

## Current Coverage
- test_detection.py
  - Ensures heuristic scoring returns a valid composite score.
  - Confirms classification stays within expected buckets.

- test_sharing.py
  - Ensures sharing payload redacts personal identifiers.

## Test Strategy
- Disable AI model loading to keep tests deterministic.
- Use temporary SQLite databases via monkeypatch.

## How to Run
```bash
pytest
```

## Future Additions
- Federated ledger validation and sync tests.
- Heatmap persistence tests.
- Image analysis endpoint smoke tests (with mocks).

## Dependencies
- pytest
