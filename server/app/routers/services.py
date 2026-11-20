import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Services & Engagements"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

# ---------------- SERVICES ----------------
@router.get("/services", response_model=List[Dict[str, Any]])
async def get_services(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("services").select("*").order("created_at", desc=False).execute()
    return res.data or []

@router.post("/services", response_model=Dict[str, Any])
async def create_service(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    sid = ensure_uuid(payload.get("id"))
    row = {
        "id": sid,
        "service_code": payload.get("service_code") or f"SRV-{sid[:6].upper()}",
        "service_name": payload.get("service_name") or "",
        "description": payload.get("description"),
        "default_fee": float(payload.get("default_fee") or 0),
        "default_gst_rate": float(payload.get("default_gst_rate") or 18.0),
        "billing_type": payload.get("billing_type", "Recurring"),
        "status": payload.get("status", "Active"),
    }
    await supabase.from_("services").insert(row).execute()
    return {**payload, "id": sid}

@router.put("/services/{service_id}", response_model=Dict[str, Any])
async def update_service(service_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = ["service_code", "service_name", "description", "default_fee", "default_gst_rate", "billing_type", "status"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("services").update(db_updates).eq("id", service_id).execute()
    return {"ok": True, "id": service_id}

@router.delete("/services/{service_id}")
async def delete_service(service_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("services").delete().eq("id", service_id).execute()
    return {"ok": True, "deleted_id": service_id}

# ---------------- ENGAGEMENTS ----------------
@router.get("/service-engagements", response_model=List[Dict[str, Any]])
async def get_engagements(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("service_engagements").select("*, clients(client_name), services(service_name)").order("created_at", desc=True).execute()
    results = []
    for row in res.data or []:
        client_obj = row.get("clients") or {}
        service_obj = row.get("services") or {}
        results.append({
            "id": row.get("id"),
            "client_id": row.get("client_id"),
            "client_name": client_obj.get("client_name") or "",
            "service_id": row.get("service_id"),
            "service_name": service_obj.get("service_name") or "",
            "agreed_fee": float(row.get("agreed_fee") or 0),
            "gst_rate": float(row.get("gst_rate") or 18.0),
            "billing_frequency": row.get("billing_frequency", "Monthly"),
            "payment_terms": row.get("payment_terms", "Immediate"),
            "relationship_manager_id": row.get("relationship_manager_id"),
            "start_date": row.get("start_date"),
            "end_date": row.get("end_date"),
            "status": row.get("status", "Active"),
            "remarks": row.get("remarks"),
        })
    return results

@router.post("/service-engagements", response_model=Dict[str, Any])
async def create_engagement(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    eid = ensure_uuid(payload.get("id"))
    row = {
        "id": eid,
        "client_id": payload.get("client_id"),
        "service_id": payload.get("service_id"),
        "agreed_fee": float(payload.get("agreed_fee") or 0),
        "gst_rate": float(payload.get("gst_rate") or 18.0),
        "billing_frequency": payload.get("billing_frequency", "Monthly"),
        "payment_terms": payload.get("payment_terms", "Immediate"),
        "relationship_manager_id": payload.get("relationship_manager_id"),
        "start_date": payload.get("start_date"),
        "end_date": payload.get("end_date"),
        "status": payload.get("status", "Active"),
        "remarks": payload.get("remarks"),
    }
    await supabase.from_("service_engagements").insert(row).execute()
    return {**payload, "id": eid}

@router.delete("/service-engagements/{engagement_id}")
async def delete_engagement(engagement_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("service_engagements").delete().eq("id", engagement_id).execute()
    return {"ok": True, "deleted_id": engagement_id}
