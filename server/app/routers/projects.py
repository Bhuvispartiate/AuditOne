import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api/projects", tags=["Projects"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

@router.get("", response_model=List[Dict[str, Any]])
async def get_projects(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    
    projects_res = await supabase.from_("projects").select("*, clients(client_name)").order("created_at", desc=True).execute()
    assign_res = await supabase.from_("project_assignments").select("*").execute()
    miles_res = await supabase.from_("project_milestones").select("*").order("due_date", desc=False).execute()

    assignments_by_project: Dict[str, List[str]] = {}
    for a in assign_res.data or []:
        pid = a.get("project_id")
        eid = a.get("employee_id")
        if pid and eid:
            assignments_by_project.setdefault(pid, []).append(eid)

    milestones_by_project: Dict[str, List[Dict[str, Any]]] = {}
    for m in miles_res.data or []:
        pid = m.get("project_id")
        if pid:
            milestones_by_project.setdefault(pid, []).append({
                "id": m.get("id"),
                "project_id": pid,
                "title": m.get("title"),
                "due_date": m.get("due_date"),
                "status": m.get("status", "Pending"),
                "completed_at": m.get("completed_at"),
            })

    results = []
    for row in projects_res.data or []:
        pid = row.get("id")
        client_obj = row.get("clients") or {}
        results.append({
            "id": pid,
            "project_code": row.get("project_code"),
            "project_name": row.get("project_name"),
            "project_type": row.get("project_type", "Client Project"),
            "client_id": row.get("client_id"),
            "client_name": client_obj.get("client_name") or "",
            "service_engagement_id": row.get("service_engagement_id"),
            "description": row.get("description"),
            "project_manager_id": row.get("project_manager_id"),
            "priority": row.get("priority", "Medium"),
            "start_date": row.get("start_date"),
            "due_date": row.get("due_date"),
            "status": row.get("status", "In Progress"),
            "progress_percentage": float(row.get("progress_percentage") or 0.0),
            "assigned_employee_ids": assignments_by_project.get(pid, []),
            "milestones": milestones_by_project.get(pid, []),
            "created_at": row.get("created_at"),
        })

    return results

@router.post("", response_model=Dict[str, Any])
async def create_project(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    pid = ensure_uuid(payload.get("id"))
    
    project_row = {
        "id": pid,
        "project_code": payload.get("project_code") or f"PRJ-{pid[:6].upper()}",
        "project_name": payload.get("project_name") or "",
        "project_type": payload.get("project_type", "Client Project"),
        "client_id": payload.get("client_id"),
        "service_engagement_id": payload.get("service_engagement_id"),
        "description": payload.get("description"),
        "project_manager_id": payload.get("project_manager_id"),
        "priority": payload.get("priority", "Medium"),
        "start_date": payload.get("start_date"),
        "due_date": payload.get("due_date"),
        "status": payload.get("status", "In Progress"),
        "progress_percentage": float(payload.get("progress_percentage") or 0.0),
    }
    await supabase.from_("projects").insert(project_row).execute()

    for eid in payload.get("assigned_employee_ids") or []:
        if eid:
            await supabase.from_("project_assignments").insert({
                "project_id": pid,
                "employee_id": eid,
                "role": "Contributor",
            }).execute()

    for m in payload.get("milestones") or []:
        mid = ensure_uuid(m.get("id"))
        await supabase.from_("project_milestones").insert({
            "id": mid,
            "project_id": pid,
            "title": m.get("title") or "Milestone",
            "due_date": m.get("due_date") or payload.get("due_date"),
            "status": m.get("status", "Pending"),
        }).execute()

    return {**payload, "id": pid}

@router.put("/{project_id}", response_model=Dict[str, Any])
async def update_project(project_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    
    fields = [
        "project_code", "project_name", "project_type", "client_id", "service_engagement_id",
        "description", "project_manager_id", "priority", "start_date", "due_date",
        "status", "progress_percentage"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("projects").update(db_updates).eq("id", project_id).execute()

    if "assigned_employee_ids" in updates and isinstance(updates["assigned_employee_ids"], list):
        await supabase.from_("project_assignments").delete().eq("project_id", project_id).execute()
        for eid in updates["assigned_employee_ids"]:
            if eid:
                await supabase.from_("project_assignments").insert({
                    "project_id": project_id,
                    "employee_id": eid,
                    "role": "Contributor",
                }).execute()

    return {"ok": True, "id": project_id}

@router.delete("/{project_id}")
async def delete_project(project_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("projects").delete().eq("id", project_id).execute()
    return {"ok": True, "deleted_id": project_id}
