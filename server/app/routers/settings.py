import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Settings & Templates"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

# ---------------- UNIVERSAL RECYCLE BIN ----------------
@router.get("/recycle-bin", response_model=List[Dict[str, Any]])
async def get_recycle_bin(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("universal_recycle_bin").select("*").order("deleted_at", desc=True).execute()
    results = []
    for row in res.data or []:
        results.append({
            "id": row.get("id"),
            "item_id": row.get("item_id") or row.get("entity_id"),
            "item_type": row.get("item_type") or row.get("entity_type"),
            "title": row.get("title") or row.get("entity_name"),
            "code": row.get("code") or row.get("entity_code"),
            "subtitle": row.get("subtitle"),
            "category_name": row.get("category_name"),
            "raw_data": row.get("raw_data") or row.get("data") or {},
            "deleted_at": row.get("deleted_at"),
            "deleted_by": row.get("deleted_by"),
            "deleted_by_name": row.get("deleted_by_name"),
            "recovery_deadline": row.get("recovery_deadline") or row.get("expires_at"),
        })
    return results

@router.post("/recycle-bin", response_model=Dict[str, Any])
async def create_recycle_bin_item(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    rid = payload.get("id") or f"bin-{str(uuid.uuid4())[:8]}"
    row = {
        "id": rid,
        "entity_type": payload.get("item_type") or payload.get("entity_type") or "item",
        "entity_id": payload.get("item_id") or payload.get("entity_id") or rid,
        "entity_name": payload.get("title") or payload.get("entity_name") or "Deleted Item",
        "entity_code": payload.get("code") or payload.get("entity_code"),
        "data": payload.get("raw_data") or payload.get("data") or {},
        "deleted_by": payload.get("deleted_by"),
        "deleted_by_name": payload.get("deleted_by_name"),
        "deleted_at": payload.get("deleted_at"),
        "expires_at": payload.get("recovery_deadline") or payload.get("expires_at"),
        "permanent_delete_eligible_at": payload.get("recovery_deadline") or payload.get("expires_at"),
    }
    await supabase.from_("universal_recycle_bin").insert(row).execute()
    return {**payload, "id": rid}

@router.delete("/recycle-bin/{bin_id}")
async def delete_recycle_bin_item(bin_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("universal_recycle_bin").delete().eq("id", bin_id).execute()
    return {"ok": True}

# ---------------- WHATSAPP TEMPLATES ----------------
@router.get("/whatsapp-templates", response_model=List[Dict[str, Any]])
async def get_whatsapp_templates():
    supabase = get_supabase_admin()
    res = await supabase.from_("whatsapp_templates").select("*").order("name", desc=False).execute()
    results = []
    for row in res.data or []:
        results.append({
            "id": row.get("id"),
            "title": row.get("name") or row.get("title"),
            "category": row.get("template_type") or row.get("category", "General"),
            "content": row.get("content"),
            "created_at": row.get("created_at"),
        })
    return results

@router.post("/whatsapp-templates", response_model=Dict[str, Any])
async def upsert_whatsapp_template(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    wid = payload.get("id") or f"wtpl-{str(uuid.uuid4())[:8]}"
    row = {
        "id": wid,
        "name": payload.get("title") or payload.get("name") or "Template",
        "template_type": payload.get("category") or payload.get("template_type") or "General",
        "content": payload.get("content") or "",
    }
    await supabase.from_("whatsapp_templates").upsert(row).execute()
    return {**payload, "id": wid}

@router.delete("/whatsapp-templates/{template_id}")
async def delete_whatsapp_template(template_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("whatsapp_templates").delete().eq("id", template_id).execute()
    return {"ok": True}

# ---------------- SYSTEM SETTINGS ----------------
@router.get("/settings/{key}")
async def get_system_setting(key: str):
    supabase = get_supabase_admin()
    res = await supabase.from_("system_settings").select("*").eq("setting_key", key).maybe_single().execute()
    return res.data or {}

@router.post("/settings")
async def save_system_setting(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    key = payload.get("setting_key")
    val = payload.get("setting_value")
    desc = payload.get("description")
    await supabase.from_("system_settings").upsert({
        "setting_key": key,
        "setting_value": val,
        "description": desc,
    }).execute()
    return {"ok": True}
