from fastapi import Request, HTTPException
from app.auth.user_role_service import get_permissions, Role
from app.config import get_settings

async def role_protection(request: Request, required_permission: str):
    settings = get_settings()

    # Allow open access in dev to reduce friction during local testing
    if settings.environment == "dev":
        return request.headers.get("X-User-Id") or request.query_params.get("user_id") or "dev-admin"

    user_id = request.headers.get("X-User-Id") or request.query_params.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Missing user identifier")

    permissions = get_permissions(user_id)
    if required_permission not in permissions:
        raise HTTPException(status_code=403, detail="Access denied")
    return user_id
