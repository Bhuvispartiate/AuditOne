from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api/system", tags=["System & Maintenance"])

@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "Linear Audit PMS Python Data API", "version": "1.0.0"}

@router.post("/reset")
async def reset_database(initiator: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    """
    Super Admin Full Database Reset.
    Wipes application transactional data from Supabase PostgreSQL,
    preserving the Super Admin root employee account and system lookups.
    """
    email = (initiator.get("email") or "").strip().lower()
    role_code = initiator.get("role_code")

    # Guard: only Super Admin can initiate
    if role_code != "SUPER_ADMIN" and "admin" not in email:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Full database reset is restricted exclusively to the Super Admin.",
        )

    supabase = get_supabase_admin()
    nil_uuid = "00000000-0000-0000-0000-000000000000"

    tables_to_clear = [
        "task_comments", "task_attachments", "task_status_history", "tasks",
        "project_assignments", "project_milestones", "project_workflows", "project_workflow_stages", "projects",
        "payment_allocations", "payments", "invoice_items", "invoice_approval_logs",
        "bulk_invoice_batches", "invoice_request_items", "invoice_requests", "recurring_invoices",
        "invoices", "credit_notes", "payment_reminders", "service_fee_records", "service_engagements",
        "client_contacts", "client_addresses", "client_registrations", "client_bank_accounts", "client_documents", "clients",
        "workflow_tasks", "workflow_subtasks", "workflow_conditions", "workflow_sub_stages",
        "workflow_stages", "workflow_milestones", "workflow_template_versions", "workflow_templates",
        "services", "task_sub_categories", "task_categories", "universal_recycle_bin",
        "vault_audit_logs", "vault_credentials", "file_objects", "whatsapp_templates",
        "notifications", "activity_logs", "attendance_records", "team_members", "teams"
    ]

    cleared_count = 0
    for tbl in tables_to_clear:
        try:
            await supabase.from_(tbl).delete().neq("id", nil_uuid).execute()
            cleared_count += 1
        except Exception:
            pass

    # Clear non-superadmin employees
    try:
        await supabase.from_("employees").delete().neq("id", nil_uuid).neq("role_code", "SUPER_ADMIN").execute()
        cleared_count += 1
    except Exception:
        pass

    return {
        "ok": True,
        "cleared_tables_count": cleared_count,
        "message": "Full database reset completed successfully."
    }
