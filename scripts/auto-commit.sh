#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat << 'EOF'
Auto-commit all changes in the current Git repository.

Usage: auto-commit.sh [-m message] [-r remote] [-b branch] [--no-push]

Options:
  -m  Commit message. Default: Auto-commit with timestamp + branch + short sha.
  -r  Remote name. Default: origin.
  -b  Branch name. Default: current branch (fallback: remote HEAD or main).
  --no-push  Do not push after commit.
  -h  Show this help.

Notes:
- Skips if there are no staged changes after adding.
- On push failure, tries `git pull --rebase` then retries push.
- If no upstream is set, uses `git push -u <remote> <branch>`.
EOF
}

msg=""
remote="origin"
branch=""
push=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m)
      msg="${2:-}"
      shift 2
      ;;
    -r)
      remote="${2:-origin}"
      shift 2
      ;;
    -b)
      branch="${2:-}"
      shift 2
      ;;
    --no-push)
      push=false
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

# Ensure git is available
if ! command -v git >/dev/null 2>&1; then
  echo "git is not installed or not in PATH" >&2
  exit 1
fi

# Ensure we're inside a git repo
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a Git repository" >&2
  exit 1
fi

# Determine branch if not provided
if [[ -z "${branch}" ]]; then
  branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
  if [[ "${branch}" == "HEAD" || -z "${branch}" ]]; then
    # Fallback to remote HEAD, else main
    branch=$(git symbolic-ref refs/remotes/"${remote}"/HEAD 2>/dev/null | sed -e "s@^refs/remotes/${remote}/@@") || true
    branch=${branch:-main}
    echo "Using fallback branch '${branch}'"
  fi
fi

# Default message if not provided
if [[ -z "${msg}" ]]; then
  ts=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
  short_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "new")
  msg="Auto-commit: ${ts} (${branch}) ${short_sha}"
fi

# Stage everything
git add -A

# Skip if nothing to commit
if git diff --cached --quiet; then
  echo "No changes to commit."
  exit 0
fi

# Commit
git commit -m "${msg}"

echo "Committed on branch '${branch}': ${msg}"

# Push if enabled
if ${push}; then
  # If no upstream, set it on first push
  if ! git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    echo "Setting upstream to ${remote}/${branch}"
    if ! git push -u "${remote}" "${branch}"; then
      echo "Initial push failed, attempting pull --rebase then retry..."
      git pull --rebase "${remote}" "${branch}" || true
      git push -u "${remote}" "${branch}"
    fi
  else
    if ! git push "${remote}" "${branch}"; then
      echo "Push failed, attempting pull --rebase then retry..."
      git pull --rebase "${remote}" "${branch}" || true
      git push "${remote}" "${branch}"
    fi
  fi
  echo "Pushed to ${remote}/${branch}."
else
  echo "Commit created locally. Skipping push (--no-push)."
fi
