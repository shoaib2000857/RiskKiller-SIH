# Scripts Overview (scripts/)

## Purpose
Automate repetitive developer tasks and reduce setup friction.

## auto-commit.sh
- Stages all changes, commits with a timestamp, and optionally pushes.
- Detects branch automatically or allows explicit overrides.
- Handles push failures by attempting a rebase retry.

Usage
```bash
scripts/auto-commit.sh -m "Auto update"
```

## setup_ollama.sh
- Helper to install or bootstrap the Ollama runtime.
- Pulls the required model and starts the service.

Usage
```bash
scripts/setup_ollama.sh
```

## Dependencies
- bash
- git CLI
