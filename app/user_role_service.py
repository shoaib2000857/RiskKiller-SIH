from enum import Enum

class Role(Enum):
    GUEST = "guest"
    L1 = "l1"
    L2 = "l2"

# Hardcoded user registry
USER_REGISTRY = {
    "user_123": Role.L1,
    "admin_999": Role.L2,
}

# Permission sets
PERMISSIONS = {
    Role.GUEST: {"upload"},
    Role.L1: {"upload"},
    Role.L2: {"upload", "dashboard"},
}

def resolve_role(user_id: str) -> Role:
    return USER_REGISTRY.get(user_id, Role.GUEST)

def get_permissions(user_id: str):
    role = resolve_role(user_id)
    return PERMISSIONS[role]
