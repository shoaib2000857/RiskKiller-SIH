from fastapi import Request, HTTPException
from app.user_role_service import get_permissions

async def role_protection(request: Request, required_permission: str):
    user_id = request.headers.get("X-User-Id") or request.query_params.get("user_id")
    permissions = get_permissions(user_id)
    if required_permission not in permissions:
        raise HTTPException(status_code=403, detail="Access denied")
    return user_id
