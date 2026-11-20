import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api/workflows", tags=["Workflows"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

@router.get("", response_model=List[Dict[str, Any]])
async def get_workflows(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    
    wfs_res = await supabase.from_("workflow_templates").select("*, services(service_name)").execute()
    ms_res = await supabase.from_("workflow_milestones").select("*").order("milestone_order", desc=False).execute()
    stg_res = await supabase.from_("workflow_stages").select("*").order("stage_order", desc=False).execute()
    tasks_res = await supabase.from_("workflow_tasks").select("*").order("task_order", desc=False).execute()

    tasks_by_stage: Dict[str, List[Dict[str, Any]]] = {}
    for t in tasks_res.data or []:
        sid = t.get("workflow_stage_id")
        if sid:
            tasks_by_stage.setdefault(sid, []).append({
                "id": t.get("id"),
                "task_name": t.get("task_name"),
                "description": t.get("description") or "",
                "sequence_number": t.get("task_order", 1),
                "start_day_offset": t.get("start_day_offset", 0),
                "duration_days": t.get("duration_days", 1),
                "priority": t.get("priority", "Medium"),
                "status": "To Do",
                "subtasks": [],
                "default_comments": [],
            })

    stages_by_milestone: Dict[str, List[Dict[str, Any]]] = {}
    for s in stg_res.data or []:
        wfid = s.get("workflow_template_id")
        stage_tasks = tasks_by_stage.get(s.get("id"), [])
        if wfid:
            stages_by_milestone.setdefault(wfid, []).append({
                "id": s.get("id"),
                "stage_name": s.get("stage_name"),
                "sequence_number": s.get("stage_order", 1),
                "sub_stages": [
                    {
                        "id": f"substg-{s.get('id')}",
                        "sub_stage_name": "Deliverables",
                        "sequence_number": 1,
                        "tasks": stageTasks if (stageTasks := stage_tasks) else [],
                    }
                ],
            })

    milestones_by_wf: Dict[str, List[Dict[str, Any]]] = {}
    for m in ms_res.data or []:
        wfid = m.get("workflow_template_id")
        if wfid:
            milestones_by_wf.setdefault(wfid, []).append({
                "id": m.get("id"),
                "title": m.get("title"),
                "sequence_number": m.get("milestone_order", 1),
                "stages": stages_by_milestone.get(wfid, []),
            })

    results = []
    for row in wfs_res.data or []:
        wfid = row.get("id")
        service_obj = row.get("services") or {}
        milestones = milestones_by_wf.get(wfid, [])
        template_tasks = [
            t for m in milestones
            for s in m.get("stages", [])
            for sub in s.get("sub_stages", [])
            for t in sub.get("tasks", [])
        ]

        results.append({
            "id": wfid,
            "workflow_code": row.get("workflow_code"),
            "workflow_name": row.get("workflow_name"),
            "service_id": row.get("service_id"),
            "service_name": service_obj.get("service_name"),
            "description": row.get("description") or "",
            "is_active": bool(row.get("is_active", True)),
            "version": 1,
            "stages_count": len(template_tasks),
            "template_tasks": template_tasks,
            "milestones": milestones if milestones else None,
            "whatsapp_enabled": bool(row.get("whatsapp_enabled", True)),
            "created_at": row.get("created_at"),
        })

    return results

@router.post("", response_model=Dict[str, Any])
async def create_workflow(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    wfid = ensure_uuid(payload.get("id"))
    
    wf_row = {
        "id": wfid,
        "workflow_code": payload.get("workflow_code") or f"WF-{wfid[:6].upper()}",
        "workflow_name": payload.get("workflow_name") or "New Workflow",
        "service_id": payload.get("service_id"),
        "description": payload.get("description"),
        "is_active": bool(payload.get("is_active", True)),
        "whatsapp_enabled": bool(payload.get("whatsapp_enabled", True)),
    }
    await supabase.from_("workflow_templates").insert(wf_row).execute()
    return {**payload, "id": wfid}

@router.put("/{workflow_id}", response_model=Dict[str, Any])
async def update_workflow(workflow_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = ["workflow_name", "workflow_code", "service_id", "description", "is_active", "whatsapp_enabled"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("workflow_templates").update(db_updates).eq("id", workflow_id).execute()
    return {"ok": True, "id": workflow_id}

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("workflow_templates").delete().eq("id", workflow_id).execute()
    return {"ok": True, "deleted_id": workflow_id}
