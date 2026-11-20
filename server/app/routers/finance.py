import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api", tags=["Invoicing & Finance"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

# ---------------- INVOICES ----------------
@router.get("/invoices", response_model=List[Dict[str, Any]])
async def get_invoices(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    inv_res = await supabase.from_("invoices").select("*, clients(client_name)").order("created_at", desc=True).execute()
    items_res = await supabase.from_("invoice_items").select("*").order("item_order", desc=False).execute()

    items_by_inv: Dict[str, List[Dict[str, Any]]] = {}
    for item in items_res.data or []:
        iid = item.get("invoice_id")
        if iid:
            items_by_inv.setdefault(iid, []).append({
                "id": item.get("id"),
                "invoice_id": iid,
                "description": item.get("description") or "",
                "sac_code": item.get("hsn_sac") or "",
                "quantity": float(item.get("quantity") or 1.0),
                "rate": float(item.get("unit_price") or 0.0),
                "taxable_amount": float(item.get("line_total") or 0.0),
                "gst_rate": float(item.get("gst_rate") or 18.0),
                "total_amount": float(item.get("line_total") or 0.0),
            })

    results = []
    for row in inv_res.data or []:
        iid = row.get("id")
        client_obj = row.get("clients") or {}
        results.append({
            "id": iid,
            "invoice_number": row.get("invoice_number"),
            "client_id": row.get("client_id"),
            "client_name": client_obj.get("client_name") or "",
            "service_engagement_id": row.get("service_engagement_id"),
            "invoice_date": row.get("invoice_date"),
            "due_date": row.get("due_date"),
            "subtotal": float(row.get("subtotal") or 0.0),
            "tax_amount": float(row.get("tax_amount") or 0.0),
            "total_amount": float(row.get("total_amount") or 0.0),
            "paid_amount": float(row.get("paid_amount") or 0.0),
            "status": row.get("status", "Draft"),
            "notes": row.get("notes"),
            "terms_and_conditions": row.get("terms_and_conditions"),
            "items": items_by_inv.get(iid, []),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        })
    return results

@router.post("/invoices", response_model=Dict[str, Any])
async def create_invoice(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    iid = ensure_uuid(payload.get("id"))

    inv_row = {
        "id": iid,
        "invoice_number": payload.get("invoice_number") or f"INV-{iid[:6].upper()}",
        "client_id": payload.get("client_id"),
        "service_engagement_id": payload.get("service_engagement_id"),
        "invoice_date": payload.get("invoice_date"),
        "due_date": payload.get("due_date"),
        "subtotal": float(payload.get("subtotal") or 0.0),
        "tax_amount": float(payload.get("tax_amount") or 0.0),
        "total_amount": float(payload.get("total_amount") or 0.0),
        "paid_amount": float(payload.get("paid_amount") or 0.0),
        "status": payload.get("status", "Draft"),
        "notes": payload.get("notes"),
        "terms_and_conditions": payload.get("terms_and_conditions"),
    }
    await supabase.from_("invoices").insert(inv_row).execute()

    for item in payload.get("items") or []:
        item_id = ensure_uuid(item.get("id"))
        await supabase.from_("invoice_items").insert({
            "id": item_id,
            "invoice_id": iid,
            "description": item.get("description") or "",
            "hsn_sac": item.get("sac_code") or item.get("hsn_sac"),
            "quantity": float(item.get("quantity") or 1.0),
            "unit_price": float(item.get("rate") or item.get("unit_price") or 0.0),
            "gst_rate": float(item.get("gst_rate") or 18.0),
            "line_total": float(item.get("taxable_amount") or item.get("line_total") or item.get("total_amount") or 0.0),
        }).execute()

    return {**payload, "id": iid}

@router.put("/invoices/{invoice_id}", response_model=Dict[str, Any])
async def update_invoice(invoice_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = [
        "invoice_number", "client_id", "service_engagement_id", "invoice_date",
        "due_date", "subtotal", "tax_amount", "total_amount", "paid_amount", "status",
        "notes", "terms_and_conditions"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("invoices").update(db_updates).eq("id", invoice_id).execute()
    return {"ok": True, "id": invoice_id}

@router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("invoices").delete().eq("id", invoice_id).execute()
    return {"ok": True, "deleted_id": invoice_id}

# ---------------- PAYMENTS ----------------
@router.get("/payments", response_model=List[Dict[str, Any]])
async def get_payments(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    pay_res = await supabase.from_("payments").select("*, clients(client_name)").order("created_at", desc=True).execute()
    alloc_res = await supabase.from_("payment_allocations").select("*").execute()

    alloc_by_pay: Dict[str, List[Dict[str, Any]]] = {}
    for a in alloc_res.data or []:
        pid = a.get("payment_id")
        if pid:
            alloc_by_pay.setdefault(pid, []).append({
                "invoice_id": a.get("invoice_id"),
                "allocated_amount": float(a.get("allocated_amount") or 0.0),
            })

    results = []
    for row in pay_res.data or []:
        pid = row.get("id")
        client_obj = row.get("clients") or {}
        results.append({
            "id": pid,
            "payment_number": row.get("payment_number"),
            "client_id": row.get("client_id"),
            "client_name": client_obj.get("client_name") or "",
            "payment_date": row.get("payment_date"),
            "amount": float(row.get("amount") or 0.0),
            "payment_mode": row.get("payment_mode", "Bank Transfer"),
            "transaction_reference": row.get("transaction_reference"),
            "status": row.get("status", "Cleared"),
            "notes": row.get("notes"),
            "allocations": alloc_by_pay.get(pid, []),
            "created_at": row.get("created_at"),
        })
    return results

@router.post("/payments", response_model=Dict[str, Any])
async def create_payment(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    pid = ensure_uuid(payload.get("id"))

    pay_row = {
        "id": pid,
        "payment_number": payload.get("payment_number") or f"PAY-{pid[:6].upper()}",
        "client_id": payload.get("client_id"),
        "payment_date": payload.get("payment_date"),
        "amount": float(payload.get("amount") or 0.0),
        "payment_mode": payload.get("payment_mode", "Bank Transfer"),
        "transaction_reference": payload.get("transaction_reference"),
        "status": payload.get("status", "Cleared"),
        "notes": payload.get("notes"),
    }
    await supabase.from_("payments").insert(pay_row).execute()

    for alloc in payload.get("allocations") or []:
        await supabase.from_("payment_allocations").insert({
            "id": ensure_uuid(None),
            "payment_id": pid,
            "invoice_id": alloc.get("invoice_id"),
            "allocated_amount": float(alloc.get("allocated_amount") or 0.0),
        }).execute()

    return {**payload, "id": pid}

@router.put("/payments/{payment_id}", response_model=Dict[str, Any])
async def update_payment(payment_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = ["payment_number", "payment_date", "amount", "payment_mode", "transaction_reference", "status", "notes"]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("payments").update(db_updates).eq("id", payment_id).execute()
    return {"ok": True, "id": payment_id}

@router.delete("/payments/{payment_id}")
async def delete_payment(payment_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("payments").delete().eq("id", payment_id).execute()
    return {"ok": True, "deleted_id": payment_id}

# ---------------- INVOICE REQUESTS (APPROVAL WORKFLOW) ----------------
@router.get("/invoice-requests", response_model=List[Dict[str, Any]])
async def get_invoice_requests(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    req_res = await supabase.from_("invoice_requests").select("*").order("created_at", desc=True).execute()
    items_res = await supabase.from_("invoice_request_items").select("*").execute()

    items_by_req: Dict[str, List[Dict[str, Any]]] = {}
    for item in items_res.data or []:
        rid = item.get("invoice_request_id")
        if rid:
            items_by_req.setdefault(rid, []).append(item)

    results = []
    for r in req_res.data or []:
        rid = r.get("id")
        results.append({
            **r,
            "items": items_by_req.get(rid, []),
        })
    return results

@router.post("/invoice-requests", response_model=Dict[str, Any])
async def create_invoice_request(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    rid = ensure_uuid(payload.get("id"))

    req_row = {
        "id": rid,
        "request_number": payload.get("request_number") or f"REQ-{rid[:6].upper()}",
        "request_type": payload.get("request_type", "SINGLE"),
        "client_id": payload.get("client_id"),
        "client_name": payload.get("client_name") or "",
        "bulk_batch_id": payload.get("bulk_batch_id"),
        "recurring_profile_id": payload.get("recurring_profile_id"),
        "status": payload.get("status", "Pending Approval"),
        "subtotal": float(payload.get("subtotal") or 0.0),
        "gst_rate": float(payload.get("gst_rate") or 18.0),
        "cgst_amount": float(payload.get("cgst_amount") or 0.0),
        "sgst_amount": float(payload.get("sgst_amount") or 0.0),
        "igst_amount": float(payload.get("igst_amount") or 0.0),
        "total_gst": float(payload.get("total_gst") or 0.0),
        "grand_total": float(payload.get("grand_total") or payload.get("total_amount") or 0.0),
        "place_of_supply": payload.get("place_of_supply", "Tamil Nadu"),
        "is_interstate": bool(payload.get("is_interstate", False)),
        "notes": payload.get("notes"),
        "terms_conditions": payload.get("terms_conditions"),
        "requested_by_name": payload.get("requested_by_name") or "System User",
    }
    await supabase.from_("invoice_requests").insert(req_row).execute()

    for item in payload.get("items") or []:
        await supabase.from_("invoice_request_items").insert({
            "id": ensure_uuid(item.get("id")),
            "invoice_request_id": rid,
            "task_id": item.get("task_id"),
            "task_code": item.get("task_code"),
            "task_title": item.get("task_title"),
            "description": item.get("description") or "Item",
            "sac_code": item.get("sac_code", "998222"),
            "quantity": float(item.get("quantity") or 1.0),
            "unit_price": float(item.get("unit_price") or item.get("amount") or 0.0),
            "amount": float(item.get("amount") or 0.0),
            "gst_rate": float(item.get("gst_rate") or 18.0),
            "total_amount": float(item.get("total_amount") or 0.0),
        }).execute()

    return {**payload, "id": rid}

@router.put("/invoice-requests/{request_id}", response_model=Dict[str, Any])
async def update_invoice_request(request_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    fields = [
        "status", "approved_by", "approved_by_name", "approved_at",
        "rejection_reason", "generated_invoice_id", "generated_invoice_number"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("invoice_requests").update(db_updates).eq("id", request_id).execute()
    return {"ok": True, "id": request_id}

# ---------------- RECURRING INVOICES ----------------
@router.get("/recurring-invoices", response_model=List[Dict[str, Any]])
async def get_recurring_invoices(user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    res = await supabase.from_("recurring_invoices").select("*").order("created_at", desc=True).execute()
    return res.data or []

@router.post("/recurring-invoices", response_model=Dict[str, Any])
async def create_recurring_invoice(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    rid = ensure_uuid(payload.get("id"))
    row = {
        "id": rid,
        "schedule_code": payload.get("schedule_code") or f"REC-{rid[:6].upper()}",
        "client_id": payload.get("client_id"),
        "client_name": payload.get("client_name") or "",
        "service_id": payload.get("service_id"),
        "service_name": payload.get("service_name"),
        "title": payload.get("title") or "Recurring Retainer",
        "description": payload.get("description"),
        "frequency": payload.get("frequency", "Monthly"),
        "base_amount": float(payload.get("base_amount") or 0.0),
        "gst_rate": float(payload.get("gst_rate") or 18.0),
        "tax_amount": float(payload.get("tax_amount") or 0.0),
        "total_amount": float(payload.get("total_amount") or 0.0),
        "start_date": payload.get("start_date"),
        "end_date": payload.get("end_date"),
        "next_billing_date": payload.get("next_billing_date"),
        "status": payload.get("status", "Active"),
        "auto_submit_for_approval": bool(payload.get("auto_submit_for_approval", True)),
    }
    await supabase.from_("recurring_invoices").insert(row).execute()
    return {**payload, "id": rid}

@router.put("/recurring-invoices/{recurring_id}", response_model=Dict[str, Any])
async def update_recurring_invoice(recurring_id: str, updates: Dict[str, Any]):
    supabase = get_supabase_admin()
    fields = [
        "title", "description", "frequency", "base_amount", "gst_rate",
        "tax_amount", "total_amount", "next_billing_date", "status",
        "invoices_generated_count", "last_generated_date"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    if db_updates:
        await supabase.from_("recurring_invoices").update(db_updates).eq("id", recurring_id).execute()
    return {"ok": True, "id": recurring_id}

@router.delete("/recurring-invoices/{recurring_id}")
async def delete_recurring_invoice(recurring_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("recurring_invoices").delete().eq("id", recurring_id).execute()
    return {"ok": True, "deleted_id": recurring_id}

# ---------------- BULK BATCHES ----------------
@router.get("/bulk-batches", response_model=List[Dict[str, Any]])
async def get_bulk_batches():
    supabase = get_supabase_admin()
    res = await supabase.from_("bulk_invoice_batches").select("*").order("created_at", desc=True).execute()
    return res.data or []

@router.post("/bulk-batches", response_model=Dict[str, Any])
async def create_bulk_batch(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    bid = ensure_uuid(payload.get("id"))
    row = {
        "id": bid,
        "batch_code": payload.get("batch_code") or f"BATCH-{bid[:6].upper()}",
        "batch_name": payload.get("batch_name"),
        "total_clients": int(payload.get("total_clients") or 0),
        "total_tasks": int(payload.get("total_tasks") or 0),
        "total_amount": float(payload.get("total_amount") or 0.0),
        "status": payload.get("status", "Pending Approval"),
        "created_by_name": payload.get("created_by_name"),
    }
    await supabase.from_("bulk_invoice_batches").insert(row).execute()
    return {**payload, "id": bid}

# ---------------- APPROVAL LOGS ----------------
@router.get("/invoice-approval-logs", response_model=List[Dict[str, Any]])
async def get_approval_logs(request_id: Optional[str] = None):
    supabase = get_supabase_admin()
    query = supabase.from_("invoice_approval_logs").select("*").order("created_at", desc=True)
    if request_id:
        query = query.eq("invoice_request_id", request_id)
    res = await query.execute()
    return res.data or []

@router.post("/invoice-approval-logs", response_model=Dict[str, Any])
async def create_approval_log(payload: Dict[str, Any]):
    supabase = get_supabase_admin()
    lid = ensure_uuid(payload.get("id"))
    row = {
        "id": lid,
        "invoice_request_id": payload.get("invoice_request_id"),
        "action": payload.get("action") or "APPROVAL_ACTION",
        "actor_name": payload.get("actor_name") or "Admin",
        "actor_role": payload.get("actor_role", "Admin"),
        "notes": payload.get("notes") or payload.get("comments"),
    }
    await supabase.from_("invoice_approval_logs").insert(row).execute()
    return {**payload, "id": lid}
