from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, HttpUrl


class SourceMetadata(BaseModel):
    platform: str
    region: Optional[str] = None
    actor_id: Optional[str] = None
    related_urls: Optional[List[HttpUrl]] = None


class ContentIntake(BaseModel):
    text: str = Field(..., min_length=20, max_length=20000)
    language: str = Field("en", min_length=2, max_length=5)
    source: str = Field("unknown")
    metadata: Optional[SourceMetadata] = None
    tags: Optional[List[str]] = None


class DetectionBreakdown(BaseModel):
    linguistic_score: float
    behavioral_score: float
    hf_probability: Optional[float] = None
    ollama_risk: Optional[float] = None
    stylometric_anomalies: Dict[str, float]
    heuristics: List[str]


class ProvenancePayload(BaseModel):
    watermark_present: bool
    watermark_hash: Optional[str] = None
    signature_valid: bool
    validation_notes: List[str]


class GraphSummary(BaseModel):
    node_count: int
    edge_count: int
    high_risk_actors: List[str]
    communities: List[Dict[str, List[str]]]


class DetectionResult(BaseModel):
    intake_id: str
    submitted_at: datetime
    composite_score: float
    classification: str
    breakdown: DetectionBreakdown
    provenance: ProvenancePayload
    graph_summary: GraphSummary


class SharingRequest(BaseModel):
    intake_id: str
    destination: str
    justification: str
    include_personal_data: bool = False


class SharingPackage(BaseModel):
    package_id: str
    created_at: datetime
    destination: str
    policy_tags: List[str]
    payload: Dict[str, str]
    signature: str
