from postgrest import AsyncPostgrestClient
from app.config import settings

def get_supabase_admin() -> AsyncPostgrestClient:
    """
    Returns an async PostgREST client configured with the Supabase Secret Key (service role).
    Creates an instance bound to the active request event loop.
    """
    rest_url = f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1"
    headers = {
        "apikey": settings.SUPABASE_SECRET_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    return AsyncPostgrestClient(rest_url, headers=headers)
