# Auto-Commit Tool Overview (autocommit.py)

## Purpose
Automatically commit and push changes after a short idle window to preserve rapid iteration history.

## How It Works
- Watches the repo for file changes (ignores .git).
- When no activity is detected for IDLE_SECONDS, stages all changes.
- Commits with a timestamped message and pushes to origin.
- Handles push failure with a warning and keeps the local commit.

## Configuration
- IDLE_SECONDS: idle time before committing.
- BRANCH: target branch for push.
- COMMIT_PREFIX: commit message prefix.

## Usage
```bash
python autocommit.py
```

## Dependencies
- GitPython
- watchdog
