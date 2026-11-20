import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Tasks & Categories"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

# ---------------- TASKS ----------------
@router.get("/tasks", response_model=List[Dict[str, Any]])
async def get_tasks(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    
    try:
        tasks_res = await supabase.from_("tasks").select("*, projects(project_name), employees!tasks_assigned_employee_id_fkey(full_name)").order("created_at", desc=True).execute()
    except Exception:
        tasks_res = await supabase.from_("tasks").select("*, projects(project_name)").order("created_at", desc=True).execute()
    assign_res = await supabase.from_("task_assignments").select("*, employees(full_name)").execute()

    assignments_by_task: Dict[str, List[str]] = {}
    assigned_emps_by_task: Dict[str, List[Dict[str, Any]]] = {}
    for a in assign_res.data or []:
        tid = a.get("task_id")
        eid = a.get("employee_id")
        emp_obj = a.get("employees") or {}
        if tid and eid:
            assignments_by_project = assignments_by_task.setdefault(tid, [])
            assignments_by_project.append(eid)
            assigned_emps_by_task.setdefault(tid, []).append({
                "id": eid,
                "name": emp_obj.get("full_name") or "Assignee",
            })

    results = []
    for row in tasks_res.data or []:
        tid = row.get("id")
        proj_obj = row.get("projects") or {}
        emp_obj = row.get("employees") or {}
        assigned_ids = assignments_by_task.get(tid, [])
        assigned_emps = assigned_emps_by_task.get(tid, [])

        results.append({
            "id": tid,
            "task_code": row.get("task_code"),
            "project_id": row.get("project_id"),
            "project_name": proj_obj.get("project_name") or "",
            "parent_task_id": row.get("parent_task_id"),
            "title": row.get("title"),
            "description": row.get("description"),
            "assigned_employee_id": row.get("assigned_employee_id"),
            "assigned_employee_name": emp_obj.get("full_name"),
            "assigned_employee_ids": assigned_ids,
            "assigned_employees": assigned_emps,
            "priority": row.get("priority", "Medium"),
            "start_date": row.get("start_date"),
            "due_date": row.get("due_date"),
            "status": row.get("status", "To Do"),
            "category_id": row.get("category_id"),
            "sub_category_id": row.get("sub_category_id"),
            "milestone_id": row.get("milestone_id"),
            "milestone_title": row.get("milestone_title"),
            "stage_id": row.get("stage_id"),
            "stage_title": row.get("stage_title"),
            "sub_stage_id": row.get("sub_stage_id"),
            "sub_stage_title": row.get("sub_stage_title"),
            "whatsapp_enabled": bool(row.get("whatsapp_enabled", True)),
            "client_id": row.get("client_id"),
            "client_name": row.get("client_name"),
            "is_billable": bool(row.get("is_billable", False)),
            "billing_amount": float(row.get("billing_amount") or 0.0),
            "billed_amount": float(row.get("billed_amount") or 0.0),
            "remaining_amount": float(row.get("remaining_amount") or 0.0),
            "pending_approval_amount": float(row.get("pending_approval_amount") or 0.0),
            "billing_status": row.get("billing_status", "To Be Billed"),
            "billing_description": row.get("billing_description"),
            "currency": row.get("currency", "INR"),
            "created_by": row.get("created_by"),
            "completed_at": row.get("completed_at"),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        })

    return results

@router.post("/tasks", response_model=Dict[str, Any])
async def create_task(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    tid = ensure_uuid(payload.get("id"))

    task_row = {
        "id": tid,
        "task_code": payload.get("task_code") or f"TSK-{tid[:6].upper()}",
        "project_id": payload.get("project_id"),
        "parent_task_id": payload.get("parent_task_id"),
        "title": payload.get("title") or "Untitled Task",
        "description": payload.get("description"),
        "assigned_employee_id": payload.get("assigned_employee_id"),
        "priority": payload.get("priority", "Medium"),
        "start_date": payload.get("start_date"),
        "due_date": payload.get("due_date"),
        "status": payload.get("status", "To Do"),
        "category_id": payload.get("category_id"),
        "sub_category_id": payload.get("sub_category_id"),
        "milestone_id": payload.get("milestone_id"),
        "milestone_title": payload.get("milestone_title"),
        "stage_id": payload.get("stage_id"),
        "stage_title": payload.get("stage_title"),
        "sub_stage_id": payload.get("sub_stage_id"),
        "sub_stage_title": payload.get("sub_stage_title"),
        "whatsapp_enabled": bool(payload.get("whatsapp_enabled", True)),
        "client_id": payload.get("client_id"),
        "client_name": payload.get("client_name"),
        "is_billable": bool(payload.get("is_billable", False)),
        "billing_amount": float(payload.get("billing_amount") or 0.0),
        "billed_amount": float(payload.get("billed_amount") or 0.0),
        "remaining_amount": float(payload.get("remaining_amount") or 0.0),
        "pending_approval_amount": float(payload.get("pending_approval_amount") or 0.0),
        "billing_status": payload.get("billing_status", "To Be Billed"),
        "billing_description": payload.get("billing_description"),
        "currency": payload.get("currency", "INR"),
        "created_by": payload.get("created_by"),
    }
    await supabase.from_("tasks").insert(task_row).execute()

    # Multi-assignee support
    assigned_ids = payload.get("assigned_employee_ids") or []
    if payload.get("assigned_employee_id") and payload["assigned_employee_id"] not in assigned_ids:
        assigned_ids.append(payload["assigned_employee_id"])

    for eid in assigned_ids:
        if eid:
            await supabase.from_("task_assignments").insert({
                "task_id": tid,
                "employee_id": eid,
            }).execute()

    return {**payload, "id": tid}

@router.put("/tasks/{task_id}", response_model=Dict[str, Any])
async def update_task(task_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    
    fields = [
        "task_code", "project_id", "parent_task_id", "title", "description",
        "assigned_employee_id", "priority", "start_date", "due_date", "status",
        "category_id", "sub_category_id", "milestone_id", "milestone_title",
        "stage_id", "stage_title", "sub_stage_id", "sub_stage_title",
        "whatsapp_enabled", "client_id", "client_name", "is_billable",
        "billing_amount", "billed_amount", "remaining_amount", "pending_approval_amount",
        "billing_status", "billing_description", "currency", "completed_at"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("tasks").update(db_updates).eq("id", task_id).execute()

    if "assigned_employee_ids" in updates and isinstance(updates["assigned_employee_ids"], list):
        await supabase.from_("task_assignments").delete().eq("task_id", task_id).execute()
        for eid in updates["assigned_employee_ids"]:
            if eid:
                await supabase.from_("task_assignments").insert({
                    "task_id": task_id,
                    "employee_id": eid,
                }).execute()

    return {"ok": True, "id": task_id}

@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("tasks").delete().eq("id", task_id).execute()
    return {"ok": True, "deleted_id": task_id}

# ---------------- TASK COMMENTS ----------------
@router.get("/task-comments", response_model=List[Dict[str, Any]])
async def get_comments(task_id: Optional[str] = None):
    supabase = get_supabase_admin()
    query = supabase.from_("task_comments").select("*, employees(full_name)").order("created_at", desc=False)
    if task_id:
        query = query.eq("task_id", task_id)
    res = await query.execute()
    
    results = []
    for row in res.data or []:
        emp_obj = row.get("employees") or {}
        results.append({
            "id": row.get("id"),
            "task_id": row.get("task_id"),
            "employee_id": row.get("employee_id"),
            "employee_name": emp_obj.get("full_name") or "Employee",
            "comment": row.get("comment"),
            "created_at": row.get("created_at"),
        })
    return results

@router.post("/task-comments", response_model=Dict[str, Any])
async def create_comment(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    cid = ensure_uuid(payload.get("id"))
    row = {
        "id": cid,
        "task_id": payload.get("task_id"),
        "employee_id": payload.get("employee_id"),
        "comment": payload.get("comment") or "",
    }
    await supabase.from_("task_comments").insert(row).execute()
    return {**payload, "id": cid}

@router.delete("/task-comments/{comment_id}")
async def delete_comment(comment_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("task_comments").delete().eq("id", comment_id).execute()
    return {"ok": True}

# ---------------- TASK STATUSES ----------------
@router.get("/task-statuses", response_model=List[Dict[str, Any]])
async def get_statuses():
    supabase = get_supabase_admin()
    res = await supabase.from_("task_statuses").select("*").order("position", desc=False).execute()
    return res.data or []

@router.post("/task-statuses", response_model=Dict[str, Any])
async def create_status(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    sid = payload.get("id") or f"status-{str(uuid.uuid4())[:8]}"
    row = {
        "id": sid,
        "name": payload.get("name") or payload.get("label") or "Status",
        "label": payload.get("label") or payload.get("name") or "Status",
        "color": payload.get("color", "#64748B"),
        "position": int(payload.get("position") or 1),
        "is_system": bool(payload.get("is_system", False)),
        "is_completed": bool(payload.get("is_completed", False)),
    }
    await supabase.from_("task_statuses").upsert(row).execute()
    return {**payload, "id": sid}

@router.put("/task-statuses/{status_id}", response_model=Dict[str, Any])
async def update_status(status_id: str, updates: Dict[str, Any]):
    supabase = get_supabase_admin()
    fields = ["name", "label", "color", "position", "is_system", "is_completed"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("task_statuses").update(db_updates).eq("id", status_id).execute()
    return {"ok": True, "id": status_id}

@router.delete("/task-statuses/{status_id}")
async def delete_status(status_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("task_statuses").delete().eq("id", status_id).execute()
    return {"ok": True}

# ---------------- TASK CATEGORIES & SUB-CATEGORIES ----------------
@router.get("/task-categories", response_model=List[Dict[str, Any]])
async def get_categories():
    supabase = get_supabase_admin()
    cats_res = await supabase.from_("task_categories").select("*").order("name", desc=False).execute()
    subcats_res = await supabase.from_("task_sub_categories").select("*").order("name", desc=False).execute()

    subcats_by_cat: Dict[str, List[Dict[str, Any]]] = {}
    for s in subcats_res.data or []:
        cid = s.get("category_id")
        if cid:
            subcats_by_cat.setdefault(cid, []).append(s)

    results = []
    for c in cats_res.data or []:
        cid = c.get("id")
        results.append({
            **c,
            "sub_categories": subcats_by_cat.get(cid, []),
        })
    return results

@router.post("/task-categories", response_model=Dict[str, Any])
async def create_category(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    cid = payload.get("id") or f"cat-{str(uuid.uuid4())[:8]}"
    row = {
        "id": cid,
        "name": payload.get("name") or "",
        "code": payload.get("code") or cid[:6].upper(),
        "description": payload.get("description"),
        "color": payload.get("color", "violet"),
        "icon": payload.get("icon", "Layers"),
        "whatsapp_enabled": bool(payload.get("whatsapp_enabled", True)),
    }
    await supabase.from_("task_categories").insert(row).execute()
    return {**payload, "id": cid}

@router.put("/task-categories/{category_id}", response_model=Dict[str, Any])
async def update_category(category_id: str, updates: Dict[str, Any]):
    supabase = get_supabase_admin()
    fields = ["name", "code", "description", "color", "icon", "whatsapp_enabled"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("task_categories").update(db_updates).eq("id", category_id).execute()
    return {"ok": True, "id": category_id}

@router.delete("/task-categories/{category_id}")
async def delete_category(category_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("task_categories").delete().eq("id", category_id).execute()
    return {"ok": True}

@router.post("/task-sub-categories", response_model=Dict[str, Any])
async def create_sub_category(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    scid = payload.get("id") or f"subcat-{str(uuid.uuid4())[:8]}"
    row = {
        "id": scid,
        "category_id": payload.get("category_id"),
        "name": payload.get("name") or "",
        "code": payload.get("code") or scid[:6].upper(),
        "description": payload.get("description"),
        "whatsapp_enabled": bool(payload.get("whatsapp_enabled", True)),
    }
    await supabase.from_("task_sub_categories").insert(row).execute()
    return {**payload, "id": scid}

@router.put("/task-sub-categories/{sub_id}", response_model=Dict[str, Any])
async def update_sub_category(sub_id: str, updates: Dict[str, Any]):
    supabase = get_supabase_admin()
    fields = ["name", "code", "description", "whatsapp_enabled"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("task_sub_categories").update(db_updates).eq("id", sub_id).execute()
    return {"ok": True, "id": sub_id}

@router.delete("/task-sub-categories/{sub_id}")
async def delete_sub_category(sub_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("task_sub_categories").delete().eq("id", sub_id).execute()
    return {"ok": True}
