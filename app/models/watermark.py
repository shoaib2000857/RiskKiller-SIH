import hashlib
import re
from datetime import datetime
from typing import List, Tuple, Optional

from ..config import get_settings
from ..schemas import ProvenancePayload


class WatermarkEngine:
    WATERMARK_PATTERN = re.compile(r"\[\[WM::(?P<mark>[0-9a-f]{16})\]\]")
    SIGNATURE_PATTERN = re.compile(r"\[\[SIG::(?P<sig>[A-Z0-9]{8})\]\]")

    def __init__(self) -> None:
        self.settings = get_settings()

    def verify(self, text: str) -> ProvenancePayload:
        notes: List[str] = []
        # Compute cryptographic hash of full content for traceability
        content_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        watermark_present, wm_hash = self._check_watermark(text, notes)
        signature_valid = self._check_signature(text, notes)
        if not watermark_present:
            notes.append(
                "No embedded watermark detected. Recommend requesting vendor metadata."
            )
        if not signature_valid:
            notes.append("Digital signature missing or invalid.")

        return ProvenancePayload(
            watermark_present=watermark_present,
            watermark_hash=wm_hash,
            signature_valid=signature_valid,
            validation_notes=notes,
            content_hash=content_hash,
        )

    def _check_watermark(self, text: str, notes: List[str]) -> Tuple[bool, Optional[str]]:
        match = self.WATERMARK_PATTERN.search(text)
        if not match:
            digest = hashlib.sha256(
                (self.settings.watermark_secret + text[:1000]).encode("utf-8")
            ).hexdigest()[:16]
            notes.append("Derived probabilistic watermark fingerprint.")
            return False, digest
        candidate = match.group("mark")
        digest = hashlib.sha256(
            (self.settings.watermark_secret + text[:1000]).encode("utf-8")
        ).hexdigest()[:16]
        if candidate == digest:
            notes.append("Embedded watermark matches configured vendor seed.")
            return True, candidate
        notes.append("Embedded watermark mismatch. Treat content as untrusted.")
        return False, candidate

    def _check_signature(self, text: str, notes: List[str]) -> bool:
        match = self.SIGNATURE_PATTERN.search(text)
        if not match:
            return False
        sig = match.group("sig")
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        expected = hashlib.sha1(
            (self.settings.secret_key + timestamp).encode("utf-8")
        ).hexdigest()[:8].upper()
        if sig == expected:
            notes.append("Signature aligns with approved vendor rotation.")
            return True
        notes.append("Signature present but hash mismatch; possible spoofing.")
        return False
