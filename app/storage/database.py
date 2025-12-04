import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from ..config import get_settings


class Database:
    def __init__(self) -> None:
        settings = get_settings()
        self.path = settings.database_url.replace("sqlite:///", "")
        Path(self.path).parent.mkdir(parents=True, exist_ok=True)
        self._initialise()

    def _initialise(self) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS cases (
                    intake_id TEXT PRIMARY KEY,
                    raw_text TEXT NOT NULL,
                    classification TEXT NOT NULL,
                    composite_score REAL NOT NULL,
                    metadata_json TEXT,
                    breakdown_json TEXT,
                    provenance_json TEXT,
                    created_at TEXT NOT NULL
                )
            """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intake_id TEXT,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    payload TEXT,
                    created_at TEXT NOT NULL
                )
            """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS fingerprints (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    intake_id TEXT NOT NULL,
                    content_hash TEXT NOT NULL,
                    normalized_hash TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """
            )

    @contextmanager
    def _cursor(self):
        conn = sqlite3.connect(self.path)
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        finally:
            conn.close()

    def save_case(
        self,
        intake_id: str,
        raw_text: str,
        classification: str,
        composite_score: float,
        metadata: Dict[str, Any],
        breakdown: Dict[str, Any],
        provenance: Dict[str, Any],
    ) -> None:
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT OR REPLACE INTO cases (
                    intake_id,
                    raw_text,
                    classification,
                    composite_score,
                    metadata_json,
                    breakdown_json,
                    provenance_json,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    intake_id,
                    raw_text,
                    classification,
                    composite_score,
                    json.dumps(metadata),
                    json.dumps(breakdown),
                    json.dumps(provenance),
                    datetime.utcnow().isoformat(),
                ),
            )

    def _normalize_text(self, text: str) -> str:
        # simple normalization for fuzzy match: lowercase and collapse whitespace
        return "".join(text.lower().split())

    def store_fingerprint(self, intake_id: str, text: str, content_hash: str) -> None:
        normalized_hash = hashlib.sha256(self._normalize_text(text).encode("utf-8")).hexdigest()
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO fingerprints (intake_id, content_hash, normalized_hash, created_at)
                VALUES (?, ?, ?, ?)
            """,
                (intake_id, content_hash, normalized_hash, datetime.utcnow().isoformat()),
            )

    def check_fingerprint(self, text: str) -> list[Dict[str, Any]]:
        normalized_hash = hashlib.sha256(self._normalize_text(text).encode("utf-8")).hexdigest()
        with self._cursor() as cur:
            cur.execute(
                """
                SELECT intake_id, content_hash, normalized_hash, created_at
                FROM fingerprints
                WHERE normalized_hash = ? OR content_hash = ?
            """,
                (normalized_hash, normalized_hash),
            )
            rows = cur.fetchall() or []
            return [
                {
                    "intake_id": r[0],
                    "content_hash": r[1],
                    "normalized_hash": r[2],
                    "created_at": r[3],
                }
                for r in rows
            ]

    def fetch_case(self, intake_id: str) -> Optional[Dict[str, Any]]:
        with self._cursor() as cur:
            cur.execute(
                "SELECT raw_text, classification, composite_score, metadata_json, breakdown_json, provenance_json, created_at FROM cases WHERE intake_id=?",
                (intake_id,),
            )
            row = cur.fetchone()
            if not row:
                return None
            metadata_json = json.loads(row[3]) if row[3] else {}
            breakdown = json.loads(row[4]) if row[4] else {}
            provenance = json.loads(row[5]) if row[5] else {}
            return {
                "raw_text": row[0],
                "classification": row[1],
                "composite_score": row[2],
                "metadata": metadata_json,
                "breakdown": breakdown,
                "provenance": provenance,
                "created_at": row[6],
            }

    def log_action(self, intake_id: str, action: str, actor: str, payload: Dict[str, Any]):
        with self._cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_log (intake_id, action, actor, payload, created_at)
                VALUES (?, ?, ?, ?, ?)
            """,
                (
                    intake_id,
                    action,
                    actor,
                    json.dumps(payload),
                    datetime.utcnow().isoformat(),
                ),
            )
