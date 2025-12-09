import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Dict, List

router = APIRouter(prefix="/api/v1/heatmap", tags=["heatmap"])

# City/District to coordinates mapping
REGION_COORDS: Dict[str, tuple] = {
}

DATA_DIR = os.path.join(os.getcwd(), "data")
DATA_FILE = os.path.join(DATA_DIR, "heatmap_points.json")

# In-memory storage backed by disk
POINTS: List[dict] = []


def _ensure_storage():
	try:
		os.makedirs(DATA_DIR, exist_ok=True)
		if not os.path.exists(DATA_FILE):
			with open(DATA_FILE, "w", encoding="utf-8") as f:
				json.dump({"points": []}, f)
	except Exception:
		# Best-effort; proceed with memory-only
		pass


def _load_points():
	_ensure_storage()
	try:
		with open(DATA_FILE, "r", encoding="utf-8") as f:
			data = json.load(f)
			pts = data.get("points", [])
			if isinstance(pts, list):
				return pts
	except Exception:
		return []
	return []


def _save_points():
	try:
		with open(DATA_FILE, "w", encoding="utf-8") as f:
			json.dump({"points": POINTS}, f)
	except Exception:
		# fail silently; app continues with memory copy
		pass


# Load persisted points at startup
POINTS = _load_points()


class RiskPoint(BaseModel):
	region_name: str = Field(..., min_length=1)
	final_risk_score: int = Field(..., ge=0, le=100)


def record_point(region_name: str, final_risk_score: int) -> dict:
	name = region_name.strip()
	if name not in REGION_COORDS:
		raise HTTPException(
			status_code=400,
			detail=f"Region '{name}' not found. Try one of: {', '.join(sorted(REGION_COORDS.keys()))}",
		)
	lat, lon = REGION_COORDS[name]
	record = {
		"region_name": name,
		"latitude": lat,
		"longitude": lon,
		"final_risk_score": int(max(0, min(100, final_risk_score))),
		"timestamp": datetime.now(timezone.utc).isoformat(),
	}
	POINTS.append(record)
	_save_points()
	return record


@router.post("/add-risk-point")
def add_risk_point(point: RiskPoint):
	rec = record_point(point.region_name, point.final_risk_score)
	return {"message": "Point added", "data": rec}


@router.get("/grid")
def get_grid():
	# Always return the latest saved points to survive restarts
	if not POINTS:
		# reload if empty in memory
		persisted = _load_points()
		return {"points": persisted}
	return {"points": POINTS}

