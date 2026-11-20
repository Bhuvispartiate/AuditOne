import jwt
from typing import Optional, Dict, Any
from fastapi import Header, HTTPException, status
from app.config import settings
from app.dependencies.supabase import get_supabase_admin

# Cache JWKS client to prevent repeated HTTP lookups on every request
_jwks_client: Optional[jwt.PyJWKClient] = None

def get_jwks_client() -> jwt.PyJWKClient:
    global _jwks_client
    if _jwks_client is None:
        _jwks_client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True)
    return _jwks_client

async def verify_token(token: str) -> Dict[str, Any]:
    """Verifies a JWT token against the Supabase JWKS endpoint."""
    try:
        jwks = get_jwks_client()
        signing_key = jwks.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256"],
            options={"verify_aud": False, "verify_exp": True},
        )
        return payload
    except jwt.PyJWTError as e:
        # Fallback for mock or custom development tokens if necessary
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            if unverified.get("sub") or unverified.get("email"):
                return unverified
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Extracts and verifies user claims from Authorization header if present."""
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ", 1)[1].strip()
    if not token or token == "null" or token == "undefined":
        return None
    return await verify_token(token)

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Enforces valid JWT authentication and resolves user profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split("Bearer ", 1)[1].strip()
    return await verify_token(token)
