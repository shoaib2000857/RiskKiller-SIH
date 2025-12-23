import sys, time, subprocess, os
from pathlib import Path
from datetime import datetime
from threading import Event
from git import Repo
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# === CONFIGURE HERE ===
IDLE_SECONDS = 10              # Time in seconds before auto-commit
BRANCH = "main"                  # Branch to push to
COMMIT_PREFIX = "Auto-save"     # Commit message prefix
# ========================

REPO_DIR = Path(__file__).resolve().parent  # root of repo
repo = Repo(REPO_DIR)
idle_event = Event()

class ChangeHandler(FileSystemEventHandler):
    def on_any_event(self, event):
        if ".git" not in Path(event.src_path).parts:
            idle_event.set()

def commit_now():
    repo.git.add(A=True)
    if repo.is_dirty():
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        repo.index.commit(f"{COMMIT_PREFIX}: {ts}")
        try:
            repo.git.push("origin", BRANCH)
            print(f"[✓] Auto-pushed at {ts}")
        except Exception as e:
            print(f"[!] Commit saved, but push failed: {e}")

def main():
    observer = Observer()
    observer.schedule(ChangeHandler(), str(REPO_DIR), recursive=True)
    observer.start()
    print(f"[AutoCommit] Watching for changes in: {REPO_DIR}")
    print(f"[AutoCommit] Will commit after {IDLE_SECONDS} seconds of inactivity")

    try:
        last_activity = time.time()
        while True:
            if idle_event.is_set():
                last_activity = time.time()
                idle_event.clear()
            if time.time() - last_activity > IDLE_SECONDS:
                commit_now()
                last_activity = time.time()
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    if not (REPO_DIR / ".git").exists():
        print("Not a Git repo!")
        sys.exit(1)
    main()