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
