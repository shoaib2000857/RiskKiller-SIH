import json

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates

from .config import Settings, get_settings
from .schemas import (
    ContentIntake,
    BaseModel,
    DetectionResult,
    SharingPackage,
    SharingRequest,
    SIEMCorrelationPayload,
    ThreatIntelFeed,
)
from .services.orchestrator import AnalysisOrchestrator
from .storage.database import Database

settings = get_settings()
app = FastAPI(title=settings.app_name)
template_engine = Jinja2Templates(directory="templates")
orchestrator = AnalysisOrchestrator()
database = Database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_app_settings() -> Settings:
    return settings


@app.get("/", response_class=HTMLResponse)
async def dashboard(request: Request):
    return template_engine.TemplateResponse("dashboard.html", {"request": request})


@app.post("/api/v1/intake", response_model=DetectionResult)
async def submit_content(
    payload: ContentIntake,
    _: Settings = Depends(get_app_settings),
) -> DetectionResult:
    result = await orchestrator.process_intake(payload)
    return result


@app.get("/api/v1/cases/{intake_id}", response_model=DetectionResult)
async def get_case(intake_id: str) -> DetectionResult:
    record = database.fetch_case(intake_id)
    if not record:
        raise HTTPException(status_code=404, detail="Case not found")
    graph_snapshot = orchestrator.graph.summary()
    # reconstruct result for client convenience
    return DetectionResult.parse_obj(
        {
            "intake_id": intake_id,
            "submitted_at": record["created_at"],
            "composite_score": record["composite_score"],
            "classification": record["classification"],
            "breakdown": record["breakdown"],
            "provenance": record["provenance"],
            "graph_summary": graph_snapshot.dict(),
        }
    )


@app.post("/api/v1/share", response_model=SharingPackage)
async def request_sharing_package(request_payload: SharingRequest) -> SharingPackage:
    try:
        return orchestrator.build_sharing_package(request_payload)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error))


@app.get("/api/v1/integrations/threat-intel", response_model=ThreatIntelFeed)
async def threat_intel_feed() -> ThreatIntelFeed:
    return orchestrator.graph.threat_intel_feed()


@app.get("/api/v1/integrations/siem", response_model=SIEMCorrelationPayload)
async def siem_feed() -> SIEMCorrelationPayload:
    return orchestrator.graph.siem_payload()


@app.get("/api/v1/events/stream")
async def stream_events():
    async def event_generator():
        async for event in orchestrator.stream_events():
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


class FingerprintCheckPayload(BaseModel):
    text: str


@app.post("/api/v1/fingerprint/check")
async def fingerprint_check(payload: FingerprintCheckPayload):
    matches = orchestrator.check_fingerprint(payload.text)
    return {"matches": matches}
