import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Employees, Teams & Attendance"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

# ---------------- EMPLOYEES ----------------
@router.get("/employees", response_model=List[Dict[str, Any]])
async def get_employees(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    try:
        res = await supabase.from_("employees").select("*, designations(designation_name), teams!employees_team_id_fkey(name)").order("created_at", desc=False).execute()
    except Exception:
        try:
            res = await supabase.from_("employees").select("*, designations(designation_name)").order("created_at", desc=False).execute()
        except Exception:
            res = await supabase.from_("employees").select("*").order("created_at", desc=False).execute()
    
    results = []
    for row in res.data or []:
        desig_obj = row.get("designations") or {}
        team_obj = row.get("teams") or {}
        results.append({
            "id": row.get("id"),
            "employee_code": row.get("employee_code"),
            "first_name": row.get("first_name"),
            "last_name": row.get("last_name"),
            "full_name": row.get("full_name") or f"{row.get('first_name')} {row.get('last_name')}".strip(),
            "email": row.get("email"),
            "mobile_number": row.get("mobile_number"),
            "designation_id": row.get("designation_id"),
            "designation_name": desig_obj.get("designation_name") or row.get("designation_name"),
            "team_id": row.get("team_id"),
            "team_name": team_obj.get("name") or row.get("team_name"),
            "joining_date": row.get("joining_date"),
            "employment_status": row.get("employment_status", "Active"),
            "is_active": bool(row.get("is_active", True)),
            "role_code": row.get("role_code", "EMPLOYEE"),
            "branch_name": row.get("branch_name"),
            "created_at": row.get("created_at"),
        })
    return results

@router.post("/employees", response_model=Dict[str, Any])
async def create_employee(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    eid = ensure_uuid(payload.get("id"))
    
    row = {
        "id": eid,
        "employee_code": payload.get("employee_code") or f"EMP-{eid[:6].upper()}",
        "first_name": payload.get("first_name") or "",
        "last_name": payload.get("last_name") or "",
        "email": payload.get("email", "").strip().lower(),
        "mobile_number": payload.get("mobile_number"),
        "designation_name": payload.get("designation_name"),
        "designation_id": payload.get("designation_id"),
        "team_id": payload.get("team_id"),
        "team_name": payload.get("team_name"),
        "branch_name": payload.get("branch_name"),
        "joining_date": payload.get("joining_date"),
        "employment_status": payload.get("employment_status", "Active"),
        "is_active": bool(payload.get("is_active", True)),
        "role_code": payload.get("role_code", "EMPLOYEE"),
    }
    await supabase.from_("employees").insert(row).execute()
    return {**payload, "id": eid}

@router.put("/employees/{employee_id}", response_model=Dict[str, Any])
async def update_employee(employee_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = [
        "first_name", "last_name", "email", "mobile_number", "designation_name",
        "designation_id", "team_id", "team_name", "branch_name", "employment_status", "is_active", "role_code"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if "email" in db_updates and db_updates["email"]:
        db_updates["email"] = db_updates["email"].strip().lower()
    if db_updates:
        await supabase.from_("employees").update(db_updates).eq("id", employee_id).execute()
    return {"ok": True, "id": employee_id}

@router.delete("/employees/{employee_id}")
async def delete_employee(employee_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("employees").delete().eq("id", employee_id).execute()
    return {"ok": True, "deleted_id": employee_id}

# ---------------- TEAMS ----------------
@router.get("/teams", response_model=List[Dict[str, Any]])
async def get_teams(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    try:
        teams_res = await supabase.from_("teams").select("*, employees!fk_teams_supervisor(full_name)").execute()
    except Exception:
        try:
            teams_res = await supabase.from_("teams").select("*, employees!teams_supervisor_id_fkey(full_name)").execute()
        except Exception:
            teams_res = await supabase.from_("teams").select("*").execute()
    members_res = await supabase.from_("team_members").select("*, employees(full_name, designation_name)").execute()

    members_by_team: Dict[str, List[Dict[str, Any]]] = {}
    for m in members_res.data or []:
        tid = m.get("team_id")
        emp_obj = m.get("employees") or {}
        if tid:
            members_by_team.setdefault(tid, []).append({
                "id": m.get("id"),
                "team_id": tid,
                "employee_id": m.get("employee_id"),
                "employee_name": emp_obj.get("full_name") or "Member",
                "designation": emp_obj.get("designation_name") or "",
                "role_in_team": m.get("role_in_team", "Member"),
                "is_active": bool(m.get("is_active", True)),
                "joined_at": m.get("joined_at"),
            })

    results = []
    for row in teams_res.data or []:
        tid = row.get("id")
        emp_obj = row.get("employees") or {}
        members = members_by_team.get(tid, [])
        results.append({
            "id": tid,
            "name": row.get("name"),
            "supervisor_id": row.get("supervisor_id"),
            "supervisor_name": emp_obj.get("full_name"),
            "description": row.get("description"),
            "status": row.get("status", "Active"),
            "members": members,
            "member_count": len(members),
        })
    return results

@router.post("/teams", response_model=Dict[str, Any])
async def create_team(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    tid = ensure_uuid(payload.get("id"))
    row = {
        "id": tid,
        "name": payload.get("name") or "Team",
        "description": payload.get("description"),
        "supervisor_id": payload.get("supervisor_id"),
        "status": payload.get("status", "Active"),
    }
    await supabase.from_("teams").insert(row).execute()
    return {**payload, "id": tid}

@router.put("/teams/{team_id}", response_model=Dict[str, Any])
async def update_team(team_id: str, updates: Dict[str, Any]):
    supabase = get_supabase_admin()
    fields = ["name", "description", "supervisor_id", "status"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("teams").update(db_updates).eq("id", team_id).execute()
    return {"ok": True, "id": team_id}

@router.delete("/teams/{team_id}")
async def delete_team(team_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("teams").delete().eq("id", team_id).execute()
    return {"ok": True, "deleted_id": team_id}

# ---------------- ATTENDANCE ----------------
@router.get("/attendance", response_model=List[Dict[str, Any]])
async def get_attendance(date: Optional[str] = None):
    supabase = get_supabase_admin()
    query = supabase.from_("attendance_records").select("*, employees(full_name)")
    if date:
        query = query.eq("attendance_date", date)
    res = await query.order("attendance_date", desc=True).execute()
    return res.data or []

@router.post("/attendance", response_model=Dict[str, Any])
async def record_attendance(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    aid = ensure_uuid(payload.get("id"))
    row = {
        "id": aid,
        "employee_id": payload.get("employee_id"),
        "attendance_date": payload.get("attendance_date"),
        "check_in_time": payload.get("check_in_time"),
        "check_out_time": payload.get("check_out_time"),
        "status": payload.get("status", "Present"),
        "check_in_lat": payload.get("check_in_lat"),
        "check_in_lng": payload.get("check_in_lng"),
        "is_within_geo": bool(payload.get("is_within_geo", True)),
        "remarks": payload.get("remarks"),
    }
    await supabase.from_("attendance_records").upsert(row).execute()
    return {**payload, "id": aid}
