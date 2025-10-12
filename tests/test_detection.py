import os

os.environ["HF_MODEL_NAME"] = "disabled"
os.environ["HF_TOKENIZER_NAME"] = "disabled"

from app.config import get_settings
from app.models.detection import DetectorEngine
from app.schemas import ContentIntake, SourceMetadata

get_settings.cache_clear()


def test_detection_scores_with_heuristics_only():
    engine = DetectorEngine()
    intake = ContentIntake(
        text=(
            "Breaking news: Coordinated civic unrest planned with tactical logistics. "
            "Join the secure channel now for instructions and operational updates."
        ),
        language="en",
        source="darknet",
        metadata=SourceMetadata(platform="unknown-forum", region="RU"),
        tags=["disinfo-campaign", "extremism"],
    )
    composite, classification, breakdown = engine.detect(intake)
    assert 0.0 <= composite <= 1.0
    assert classification in {"low-risk", "medium-risk", "high-risk"}
    assert breakdown.linguistic_score >= 0
    assert breakdown.behavioral_score >= 0
