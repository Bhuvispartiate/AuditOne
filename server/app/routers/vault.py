import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api/vault", tags=["Encrypted Vault"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

@router.get("/credentials", response_model=List[Dict[str, Any]])
async def get_credentials(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("vault_credentials").select("*").order("created_at", desc=True).execute()
    results = []
    for row in res.data or []:
        results.append({
            "id": row.get("id"),
            "portal_name": row.get("portal_name"),
            "login_url": row.get("login_url") or "",
            "username": row.get("username"),
            "password_encrypted": row.get("password_encrypted"),
            "registered_email": row.get("registered_email"),
            "registered_mobile": row.get("registered_mobile"),
            "account_holder_name": row.get("account_holder_name"),
            "category": row.get("category", "Taxation"),
            "client_id": row.get("client_id"),
            "client_name": row.get("client_name"),
            "assigned_employee_ids": row.get("assigned_employee_ids") or [],
            "assigned_employee_names": row.get("assigned_employee_names"),
            "notes": row.get("notes"),
            "password_history": row.get("password_history") or [],
            "last_password_changed_at": row.get("last_password_changed_at"),
            "rotation_reminder_days": int(row.get("rotation_reminder_days") or 90),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "created_by_id": row.get("created_by_id"),
            "created_by_name": row.get("created_by_name"),
        })
    return results

@router.post("/credentials", response_model=Dict[str, Any])
async def create_credential(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    cid = ensure_uuid(payload.get("id"))
    row = {
        "id": cid,
        "portal_name": payload.get("portal_name"),
        "login_url": payload.get("login_url"),
        "username": payload.get("username"),
        "password_encrypted": payload.get("password_encrypted"),
        "registered_email": payload.get("registered_email"),
        "registered_mobile": payload.get("registered_mobile"),
        "account_holder_name": payload.get("account_holder_name"),
        "category": payload.get("category", "Taxation"),
        "client_id": payload.get("client_id"),
        "client_name": payload.get("client_name"),
        "assigned_employee_ids": payload.get("assigned_employee_ids") or [],
        "assigned_employee_names": payload.get("assigned_employee_names"),
        "notes": payload.get("notes"),
        "password_history": payload.get("password_history") or [],
        "rotation_reminder_days": int(payload.get("rotation_reminder_days") or 90),
        "created_by_id": payload.get("created_by_id"),
        "created_by_name": payload.get("created_by_name"),
    }
    await supabase.from_("vault_credentials").insert(row).execute()
    return {**payload, "id": cid}

@router.put("/credentials/{cred_id}", response_model=Dict[str, Any])
async def update_credential(cred_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = [
        "portal_name", "login_url", "username", "password_encrypted", "registered_email",
        "registered_mobile", "account_holder_name", "category", "client_id", "client_name",
        "assigned_employee_ids", "assigned_employee_names", "notes", "password_history",
        "last_password_changed_at", "rotation_reminder_days"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("vault_credentials").update(db_updates).eq("id", cred_id).execute()
    return {"ok": True, "id": cred_id}

@router.delete("/credentials/{cred_id}")
async def delete_credential(cred_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("vault_credentials").delete().eq("id", cred_id).execute()
    return {"ok": True, "deleted_id": cred_id}

# ---------------- VAULT AUDIT LOGS ----------------
@router.get("/audit-logs", response_model=List[Dict[str, Any]])
async def get_audit_logs(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("vault_audit_logs").select("*").order("timestamp", desc=True).limit(500).execute()
    return res.data or []

@router.post("/audit-logs", response_model=Dict[str, Any])
async def create_audit_log(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    lid = ensure_uuid(payload.get("id"))
    row = {
        "id": lid,
        "credential_id": payload.get("credential_id"),
        "portal_name": payload.get("portal_name"),
        "action": payload.get("action"),
        "performed_by_id": payload.get("performed_by_id"),
        "performed_by_name": payload.get("performed_by_name") or "User",
        "details": payload.get("details"),
        "client_name": payload.get("client_name"),
    }
    await supabase.from_("vault_audit_logs").insert(row).execute()
    return {**payload, "id": lid}
