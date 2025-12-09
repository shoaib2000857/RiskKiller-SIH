import asyncio
import os
from datetime import datetime
from typing import Any, AsyncGenerator, Dict, Optional
from uuid import uuid4

import httpx
from fastapi.concurrency import run_in_threadpool

from ..models.detection import DetectorEngine
from ..models.graph_intel import GraphIntelEngine
from ..models.sharing import SharingEngine
from ..models.watermark import WatermarkEngine
from ..schemas import ContentIntake, DetectionResult, SharingPackage, SharingRequest
from ..storage.database import Database

try:
    from ..federated.manager import LedgerManager
    from ..federated.node import Node
    from ..federated.ledger import Block
    from ..federated.crypto import encrypt_data
    FEDERATED_ENABLED = True
except ImportError:
    FEDERATED_ENABLED = False


class AnalysisOrchestrator:
    def __init__(self) -> None:
        self.detector = DetectorEngine()
        self.watermark = WatermarkEngine()
        self.graph = GraphIntelEngine()
        self.sharing = SharingEngine()
        self.db = Database()
        self._event_queue: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue(maxsize=200)
        
        # Initialize federated ledger if available
        if FEDERATED_ENABLED:
            try:
                self.ledger = LedgerManager()
                self.node = Node()
            except Exception:
                self.ledger = None
                self.node = None
        else:
            self.ledger = None
            self.node = None

    async def process_intake(self, intake: ContentIntake) -> DetectionResult:
        return await run_in_threadpool(self._process_sync, intake)

    def _process_sync(self, intake: ContentIntake) -> DetectionResult:
        intake_id = str(uuid4())
        submitted_at = datetime.utcnow()

        composite_score, classification, breakdown = self.detector.detect(intake)
        provenance = self.watermark.verify(intake.text)
        graph_summary = self.graph.ingest(intake_id, intake, classification, composite_score)

        summary_text = self._generate_summary(intake, classification, composite_score, breakdown)
        decision_reason = self._build_decision_reason(classification, composite_score, breakdown)

        self.db.save_case(
            intake_id=intake_id,
            raw_text=intake.text,
            classification=classification,
            composite_score=composite_score,
            metadata=intake.dict().get("metadata", {}) or {},
            breakdown=breakdown.dict(),
            provenance=provenance.dict(),
            summary=summary_text,
            decision_reason=decision_reason,
        )
        self.db.log_action(
            intake_id=intake_id,
            action="analysis_completed",
            actor="system",
            payload={"score": composite_score, "classification": classification},
        )

        # Store fingerprint for post-hoc verification
        try:
            self.db.store_fingerprint(intake_id, intake.text, provenance.content_hash)
        except Exception:
            # non-fatal; continue
            pass

        result = DetectionResult(
            intake_id=intake_id,
            submitted_at=submitted_at,
            composite_score=composite_score,
            classification=classification,
            breakdown=breakdown,
            provenance=provenance,
            graph_summary=graph_summary,
            summary=summary_text,
            findings=breakdown.heuristics[:5] if breakdown.heuristics else None,
            decision_reason=decision_reason,
        )

        self._emit_event(
            {
                "type": "analysis_completed",
                "intake_id": intake_id,
                "score": composite_score,
                "classification": classification,
                "submitted_at": submitted_at.isoformat(),
            }
        )
        return result

    async def stream_events(self) -> AsyncGenerator[Dict[str, Any], None]:
        while True:
            event = await self._event_queue.get()
            yield event

    def check_fingerprint(self, text: str) -> list[Dict[str, Any]]:
        return self.db.check_fingerprint(text)

    async def _fetch_case_from_main_api(self, intake_id: str) -> Optional[Dict[str, Any]]:
        """Fetch case data from main API if not found locally (for federated nodes)."""
        main_api_url = os.getenv("MAIN_API_URL", "http://localhost:8000")
        # Don't fetch from self
        if main_api_url == os.getenv("NODE_URL"):
            return None
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{main_api_url}/api/v1/cases/{intake_id}")
                if response.status_code == 200:
                    data = response.json()
                    # Convert DetectionResult to the format expected by build_sharing_package
                    return {
                        "classification": data.get("classification"),
                        "composite_score": data.get("composite_score"),
                        "created_at": data.get("submitted_at"),
                        "metadata": data.get("metadata", {}),
                    }
        except Exception as e:
            print(f"Failed to fetch case from main API: {e}")
        return None

    async def build_sharing_package(self, request: SharingRequest) -> SharingPackage:
        record = self.db.fetch_case(request.intake_id)
        
        # If not found locally, try fetching from main API (for federated nodes)
        if not record:
            record = await self._fetch_case_from_main_api(request.intake_id)
        
        if not record:
            raise ValueError("Unknown intake reference.")
        payload = {
            "intake_id": request.intake_id,
            "classification": record["classification"],
            "composite_score": record["composite_score"],
            "created_at": record["created_at"],
        }
        metadata = record["metadata"]
        if not request.include_personal_data and isinstance(metadata, dict):
            metadata = {k: v for k, v in metadata.items() if k not in {"actor_id", "user_id"}}
        payload["metadata"] = metadata
        policy_tags = self._determine_policy(request)
        package = self.sharing.create_package(
            intake_id=request.intake_id,
            destination=request.destination,
            payload=payload,
            policy_tags=policy_tags,
        )
        self.db.log_action(
            intake_id=request.intake_id,
            action="package_generated",
            actor="system",
            payload={"destination": request.destination, "policy": policy_tags},
        )
        
        # Publish to federated blockchain if enabled
        if self.ledger and self.node:
            try:
                chain = self.ledger.get_chain()
                prev_block = chain[-1]
                
                federated_payload = {
                    "type": "intelligence_sharing",
                    "package_id": package.package_id,
                    "destination": request.destination,
                    "classification": record["classification"],
                    "composite_score": record["composite_score"],
                    "timestamp": package.created_at.isoformat(),
                    "policy_tags": policy_tags
                }
                
                encrypted_data = encrypt_data(federated_payload)
                new_block = Block.create_new(
                    index=len(chain),
                    data_encrypted=encrypted_data,
                    previous_hash=prev_block.hash
                )
                
                self.ledger.save_block(new_block)
                self.node.broadcast_block(new_block)
            except Exception as e:
                # Log error but don't fail the sharing request
                print(f"Failed to publish to blockchain: {e}")
        
        return package

    def _generate_summary(
        self,
        intake: ContentIntake,
        classification: str,
        composite_score: float,
        breakdown,
    ) -> str:
        metadata = intake.metadata.dict() if intake.metadata else {}
        platform = metadata.get("platform") or intake.source or "an unspecified platform"
        region = metadata.get("region") or "an unspecified region"
        score_pct = f"{max(0, min(100, round(composite_score * 100)))}%"
        heuristics = (breakdown.heuristics or [])[:2]
        if heuristics:
            heuristics_text = "; ".join(heuristics)
            heuristics_sentence = f"Key signals: {heuristics_text}."
        else:
            heuristics_sentence = "No heuristics were triggered during analysis."
        ai_prob = breakdown.ai_probability
        ai_clause = ""
        if isinstance(ai_prob, (int, float)):
            ai_clause = f" AI detector confidence registered at {max(0, min(100, round(ai_prob * 100)))}%."
        return (
            f"{classification.title()} classification for a narrative originating from {region} "
            f"on {platform}. Composite risk scored {score_pct}.{ai_clause} {heuristics_sentence}"
        )

    def _build_decision_reason(
        self,
        classification: str,
        composite_score: float,
        breakdown,
    ) -> str:
        heuristics = breakdown.heuristics or []
        reason_parts: list[str] = []
        if heuristics:
            primary = "; ".join(heuristics[:3])
            reason_parts.append(f"Triggered heuristics: {primary}.")
        ai_prob = breakdown.ai_probability
        if isinstance(ai_prob, (int, float)):
            reason_parts.append(
                f"AI detector flagged a {max(0, min(100, round(ai_prob * 100)))}% likelihood."
            )
        behavior = breakdown.behavioral_score
        if isinstance(behavior, (int, float)) and behavior > 0.5:
            reason_parts.append(
                "Behavioral cues indicated urgent or coordinated language patterns."
            )
        if not reason_parts:
            reason_parts.append(
                f"Composite risk score of {max(0, min(100, round(composite_score * 100)))}% exceeded the {classification.lower()} threshold."
            )
        return " ".join(reason_parts)

    def _emit_event(self, event: Dict[str, Any]) -> None:
        try:
            self._event_queue.put_nowait(event)
        except asyncio.QueueFull:
            # Drop oldest if backpressure occurs
            self._event_queue.get_nowait()
            self._event_queue.put_nowait(event)

    def _determine_policy(self, request: SharingRequest) -> list[str]:
        policy = ["classified:restricted"]
        if request.destination not in {"USA", "EU", "IN", "AUS"}:
            policy.append("export-control:review")
        if request.include_personal_data:
            policy.append("privacy:pii-included")
        else:
            policy.append("privacy:pii-redacted")
        policy.append(f"justification:{hash(request.justification) % 10000}")
        return policy
