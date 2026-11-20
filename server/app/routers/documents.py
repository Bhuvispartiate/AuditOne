import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Documents & File Objects"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

# ---------------- FILE OBJECTS ----------------
@router.get("/documents", response_model=List[Dict[str, Any]])
async def get_documents(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("file_objects").select("*").order("created_at", desc=True).execute()
    results = []
    for row in res.data or []:
        results.append({
            "id": row.get("id"),
            "bucket_name": row.get("storage_bucket"),
            "r2_object_key": row.get("storage_path"),
            "file_name": row.get("file_name"),
            "file_size": int(row.get("file_size_bytes") or 0),
            "mime_type": row.get("mime_type"),
            "category": row.get("file_category", "General"),
            "entity_type": row.get("entity_type"),
            "entity_id": row.get("entity_id"),
            "uploaded_by": row.get("uploaded_by"),
            "version_number": int(row.get("version") or 1),
            "created_at": row.get("created_at"),
        })
    return results

@router.post("/documents", response_model=Dict[str, Any])
async def create_document(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fid = ensure_uuid(payload.get("id"))
    row = {
        "id": fid,
        "storage_bucket": payload.get("bucket_name") or "firm-documents",
        "storage_path": payload.get("r2_object_key") or f"files/{fid}",
        "file_name": payload.get("file_name") or "file",
        "file_size_bytes": int(payload.get("file_size") or 0),
        "mime_type": payload.get("mime_type"),
        "file_category": payload.get("category") or "General",
        "entity_type": payload.get("entity_type") or "general",
        "entity_id": str(payload.get("entity_id") or "0"),
        "uploaded_by": payload.get("uploaded_by"),
        "version": int(payload.get("version_number") or 1),
    }
    await supabase.from_("file_objects").insert(row).execute()
    return {**payload, "id": fid}

@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("file_objects").delete().eq("id", doc_id).execute()
    return {"ok": True, "deleted_id": doc_id}

# ---------------- DOCUMENT FOLDERS CONFIGURATION ----------------
@router.get("/document-folders", response_model=List[Dict[str, Any]])
async def get_document_folders():
    supabase = get_supabase_admin()
    res = await supabase.from_("system_settings").select("setting_value").eq("setting_key", "pms_document_folders_v1").maybe_single().execute()
    data = res.data or {}
    val = data.get("setting_value")
    if isinstance(val, list):
        return val
    return []

@router.post("/document-folders")
async def save_document_folders(folders: List[Dict[str, Any]]):
    supabase = get_supabase_admin()
    await supabase.from_("system_settings").upsert({
        "setting_key": "pms_document_folders_v1",
        "setting_value": folders,
        "description": "Configured document folder structure",
    }).execute()
    return {"ok": True}
