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
from .federated.manager import LedgerManager
from .federated.node import Node
from .federated.ledger import Block
from .federated.crypto import encrypt_data, decrypt_data
from .heatmap import router as heatmap_router, record_point

settings = get_settings()
app = FastAPI(title=settings.app_name)
template_engine = Jinja2Templates(directory="templates")
orchestrator = AnalysisOrchestrator()
database = Database()
ledger = LedgerManager()
node = Node()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Heatmap API
app.include_router(heatmap_router)


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
    # Require region from intake
    region = None
    try:
        region = (payload.metadata.region if payload.metadata else None)
    except Exception:
        region = None
    if not region or not str(region).strip():
        raise HTTPException(status_code=400, detail="Region (city/district) is required.")

    result = await orchestrator.process_intake(payload)

    # Normalize composite score and record point for heatmap (non-blocking)
    try:
        score = result.composite_score
        norm = int(round(score * 100)) if 0 <= score <= 1 else int(round(score))
        norm = max(0, min(100, norm))
        record_point(str(region).strip(), norm)
    except Exception:
        pass

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


# ==================== Federated Blockchain Routes ====================

@app.post("/api/v1/federated/add_block")
async def add_federated_block(payload: dict):
    """Add a new block to the federated ledger and broadcast to peers."""
    chain = ledger.get_chain()
    prev_block = chain[-1]
    
    encrypted_data = encrypt_data(payload)
    new_block = Block.create_new(
        index=len(chain),
        data_encrypted=encrypted_data,
        previous_hash=prev_block.hash
    )
    
    ledger.save_block(new_block)
    node.broadcast_block(new_block)
    
    from dataclasses import asdict
    return {"message": "Block added to federated ledger", "block": asdict(new_block)}


@app.post("/api/v1/federated/receive_block")
async def receive_federated_block(block_data: dict):
    """Receive and validate a block from a peer node."""
    chain = ledger.get_chain()
    prev_block = chain[-1]
    
    incoming_block = Block(
        index=block_data["index"],
        timestamp=block_data["timestamp"],
        data_encrypted=block_data["data_encrypted"],
        previous_hash=block_data["previous_hash"],
        public_key=block_data["public_key"],
        hash=block_data["hash"],
        signature=block_data["signature"]
    )
    
    if not ledger.validate_block(incoming_block, prev_block):
        raise HTTPException(status_code=400, detail="Block validation failed")
    
    ledger.save_block(incoming_block)
    return {"message": "Block accepted"}


@app.get("/api/v1/federated/chain")
async def get_federated_chain():
    """Retrieve the entire federated blockchain."""
    from dataclasses import asdict
    chain = ledger.get_chain()
    return {"chain": [asdict(block) for block in chain], "length": len(chain)}


@app.get("/api/v1/federated/validate")
async def validate_federated_chain():
    """Validate the local chain and check network consensus."""
    import requests
    
    chain = ledger.get_chain()
    self_valid = ledger.validate_chain(chain)
    
    results = {}
    tampered = []
    
    for node_url in node.nodes:
        if node_url != node.my_url:
            try:
                resp = requests.get(f"{node_url}/api/v1/federated/validate_local", timeout=2)
                is_valid = resp.json().get("valid", False)
                results[node_url] = is_valid
                if not is_valid:
                    tampered.append(node_url)
            except Exception:
                results[node_url] = False
                tampered.append(node_url)
    
    network_valid = self_valid and all(results.values())
    
    return {
        "self_valid": self_valid,
        "nodes": results,
        "network_valid": network_valid,
        "tampered_nodes": tampered,
        "chain_length": len(chain)
    }


@app.get("/api/v1/federated/validate_local")
async def validate_local_chain():
    """Local chain validation endpoint for peer nodes."""
    chain = ledger.get_chain()
    return {"valid": ledger.validate_chain(chain)}


@app.get("/api/v1/federated/decrypt_block/{block_index}")
async def decrypt_federated_block(block_index: int):
    """Decrypt a specific block's data (requires proper authorization in production)."""
    chain = ledger.get_chain()
    if block_index >= len(chain) or block_index < 0:
        raise HTTPException(status_code=404, detail="Block not found")
    
    block = chain[block_index]
    try:
        decrypted = decrypt_data(block.data_encrypted)
        return {"block_index": block_index, "data": decrypted}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Decryption failed: {str(e)}")
