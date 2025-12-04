from datetime import datetime
from typing import Any, Dict, List, Optional

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
    ai_probability: Optional[float] = None
    model_family: Optional[str] = None
    model_family_confidence: Optional[float] = None
    model_family_probabilities: Optional[Dict[str, float]] = None
    stylometric_anomalies: Dict[str, float]
    heuristics: List[str]


class ProvenancePayload(BaseModel):
    watermark_present: bool
    watermark_hash: Optional[str] = None
    signature_valid: bool
    validation_notes: List[str]
    content_hash: str


class GNNCluster(BaseModel):
    cluster_id: str
    score: float
    actors: List[str] = Field(default_factory=list)
    narratives: List[str] = Field(default_factory=list)
    content: List[str] = Field(default_factory=list)


class CoordinationAlert(BaseModel):
    actor: str
    peer_actors: List[str] = Field(default_factory=list)
    shared_tags: List[str] = Field(default_factory=list)
    platforms: List[str] = Field(default_factory=list)
    risk: float


class PropagationChain(BaseModel):
    path: List[str] = Field(default_factory=list)
    likelihood: float
    platforms: List[str] = Field(default_factory=list)


class CommunitySnapshot(BaseModel):
    actors: List[str] = Field(default_factory=list)
    content: List[str] = Field(default_factory=list)
    narratives: List[str] = Field(default_factory=list)
    regions: List[str] = Field(default_factory=list)
    gnn_score: float = 0.0


class GraphSummary(BaseModel):
    node_count: int
    edge_count: int
    high_risk_actors: List[str]
    communities: List[CommunitySnapshot]
    gnn_clusters: List[GNNCluster] = Field(default_factory=list)
    coordination_alerts: List[CoordinationAlert] = Field(default_factory=list)
    propagation_chains: List[PropagationChain] = Field(default_factory=list)


class DetectionResult(BaseModel):
    intake_id: str
    submitted_at: datetime
    composite_score: float
    classification: str
    breakdown: DetectionBreakdown
    provenance: ProvenancePayload
    graph_summary: GraphSummary


class ThreatIntelFeed(BaseModel):
    generated_at: datetime
    graph_summary: GraphSummary
    indicators: List[str]
    dataset_fingerprint: str


class SIEMCorrelationPayload(BaseModel):
    generated_at: datetime
    alerts: List[CoordinationAlert]
    propagation_chains: List[PropagationChain]
    correlation_keys: List[str]
    node_count: int


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
