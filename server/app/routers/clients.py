import uuid
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.dependencies.supabase import get_supabase_admin
from app.dependencies.auth import get_current_user_optional

router = APIRouter(prefix="/api/clients", tags=["Clients"])

def ensure_uuid(val: Optional[str]) -> str:
    if val:
        try:
            return str(uuid.UUID(val))
        except (ValueError, AttributeError):
            pass
    return str(uuid.uuid4())

@router.get("", response_model=List[Dict[str, Any]])
async def get_clients(user: Optional[Dict] = Depends(get_current_user_optional)):
    """Fetch all clients with nested contacts, addresses, registrations, and bank accounts."""
    supabase = get_supabase_admin()
    
    # Fetch all related client records concurrently
    clients_res = await supabase.from_("clients").select("*").order("created_at", desc=True).execute()
    contacts_res = await supabase.from_("client_contacts").select("*").execute()
    addresses_res = await supabase.from_("client_addresses").select("*").execute()
    regs_res = await supabase.from_("client_registrations").select("*").execute()
    banks_res = await supabase.from_("client_bank_accounts").select("*").execute()

    contacts_by_client: Dict[str, List[Dict[str, Any]]] = {}
    for c in contacts_res.data or []:
        cid = c.get("client_id")
        if cid:
            contacts_by_client.setdefault(cid, []).append({
                "id": c.get("id"),
                "client_id": cid,
                "contact_person": c.get("contact_person"),
                "designation": c.get("designation"),
                "mobile_number": c.get("mobile_number"),
                "email": c.get("email"),
                "is_primary": bool(c.get("is_primary")),
            })

    addresses_by_client: Dict[str, List[Dict[str, Any]]] = {}
    for a in addresses_res.data or []:
        cid = a.get("client_id")
        if cid:
            addresses_by_client.setdefault(cid, []).append({
                "id": a.get("id"),
                "client_id": cid,
                "address_type": a.get("address_type"),
                "street_address": a.get("street_address"),
                "city": a.get("city"),
                "state": a.get("state"),
                "pin_code": a.get("pin_code"),
                "country": a.get("country", "India"),
                "is_primary": bool(a.get("is_primary")),
            })

    regs_by_client: Dict[str, Dict[str, Any]] = {}
    for r in regs_res.data or []:
        cid = r.get("client_id")
        if cid:
            regs_by_client[cid] = {
                "id": r.get("id"),
                "client_id": cid,
                "pan": r.get("pan"),
                "gstin": r.get("gstin"),
                "cin": r.get("cin"),
                "dob_or_doi": r.get("dob_or_doi"),
                "additional_registrations": r.get("additional_registrations") or [],
            }

    banks_by_client: Dict[str, List[Dict[str, Any]]] = {}
    for b in banks_res.data or []:
        cid = b.get("client_id")
        if cid:
            banks_by_client.setdefault(cid, []).append({
                "id": b.get("id"),
                "client_id": cid,
                "bank_name": b.get("bank_name"),
                "account_number": b.get("account_number_encrypted") or b.get("account_number") or "",
                "account_holder_name": b.get("account_holder_name"),
                "ifsc_code": b.get("ifsc_code"),
                "branch_name": b.get("branch_name"),
                "account_type": b.get("account_type", "Current"),
                "upi_id": b.get("upi_id"),
                "is_primary": bool(b.get("is_primary")),
            })

    results = []
    for row in clients_res.data or []:
        cid = row.get("id")
        contacts = contacts_by_client.get(cid, [])
        primary_contact = next((c for c in contacts if c.get("is_primary")), contacts[0] if contacts else None)
        addresses = addresses_by_client.get(cid, [])
        registration = regs_by_client.get(cid)
        bank_accounts = banks_by_client.get(cid, [])

        results.append({
            "id": cid,
            "client_code": row.get("client_code"),
            "client_name": row.get("client_name"),
            "legal_name": row.get("legal_name") or row.get("client_name"),
            "nick_name": row.get("nick_name"),
            "folder_name": row.get("folder_name"),
            "reference_name": row.get("reference_name"),
            "constitution": row.get("constitution", "Proprietorship"),
            "category": row.get("category"),
            "nature_of_income": row.get("nature_of_income"),
            "relationship_manager_id": row.get("relationship_manager_id"),
            "status": row.get("status", "Active"),
            "remarks": row.get("remarks"),
            "created_at": row.get("created_at"),
            "primary_contact": primary_contact,
            "contacts": contacts,
            "addresses": addresses,
            "registration": registration,
            "bank_accounts": bank_accounts,
        })

    return results

@router.post("", response_model=Dict[str, Any])
async def create_client(payload: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    cid = ensure_uuid(payload.get("id"))

    # 1. Insert Client Record
    client_row = {
        "id": cid,
        "client_code": payload.get("client_code") or f"CL-{cid[:8].upper()}",
        "client_name": payload.get("client_name") or "",
        "legal_name": payload.get("legal_name") or payload.get("client_name") or "",
        "nick_name": payload.get("nick_name"),
        "folder_name": payload.get("folder_name"),
        "reference_name": payload.get("reference_name"),
        "constitution": payload.get("constitution", "Proprietorship"),
        "category": payload.get("category"),
        "nature_of_income": payload.get("nature_of_income"),
        "relationship_manager_id": payload.get("relationship_manager_id"),
        "status": payload.get("status", "Active"),
        "remarks": payload.get("remarks"),
    }
    await supabase.from_("clients").insert(client_row).execute()

    # 2. Insert Contacts
    for c in payload.get("contacts") or []:
        contact_id = ensure_uuid(c.get("id"))
        await supabase.from_("client_contacts").insert({
            "id": contact_id,
            "client_id": cid,
            "contact_person": c.get("contact_person") or "Primary Contact",
            "designation": c.get("designation"),
            "mobile_number": c.get("mobile_number") or "",
            "email": c.get("email") or "",
            "is_primary": bool(c.get("is_primary", True)),
        }).execute()

    # 3. Insert Addresses
    for a in payload.get("addresses") or []:
        addr_id = ensure_uuid(a.get("id"))
        await supabase.from_("client_addresses").insert({
            "id": addr_id,
            "client_id": cid,
            "address_type": a.get("address_type", "Registered"),
            "street_address": a.get("street_address") or "",
            "city": a.get("city") or "",
            "state": a.get("state") or "",
            "pin_code": a.get("pin_code") or "",
            "country": a.get("country", "India"),
            "is_primary": bool(a.get("is_primary", True)),
        }).execute()

    # 4. Insert Registrations
    reg = payload.get("registration")
    if reg:
        await supabase.from_("client_registrations").insert({
            "id": ensure_uuid(reg.get("id")),
            "client_id": cid,
            "pan": reg.get("pan"),
            "gstin": reg.get("gstin"),
            "cin": reg.get("cin"),
            "dob_or_doi": reg.get("dob_or_doi"),
            "additional_registrations": reg.get("additional_registrations") or [],
        }).execute()

    # 5. Insert Bank Accounts
    for b in payload.get("bank_accounts") or []:
        bank_id = ensure_uuid(b.get("id"))
        await supabase.from_("client_bank_accounts").insert({
            "id": bank_id,
            "client_id": cid,
            "bank_name": b.get("bank_name") or "",
            "account_number": b.get("account_number") or "",
            "account_number_encrypted": b.get("account_number") or "",
            "account_holder_name": b.get("account_holder_name"),
            "ifsc_code": b.get("ifsc_code") or "",
            "branch_name": b.get("branch_name"),
            "account_type": b.get("account_type", "Current"),
            "upi_id": b.get("upi_id"),
            "is_primary": bool(b.get("is_primary", True)),
        }).execute()

    payload["id"] = cid
    return payload

@router.put("/{client_id}", response_model=Dict[str, Any])
async def update_client(client_id: str, updates: Dict[str, Any], user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    
    fields = [
        "client_code", "client_name", "legal_name", "nick_name", "folder_name",
        "reference_name", "constitution", "category", "nature_of_income",
        "relationship_manager_id", "status", "remarks"
    ]
    db_updates = {f: updates[f] for f in fields if f in updates}
    
    if db_updates:
        await supabase.from_("clients").update(db_updates).eq("id", client_id).execute()
        
    return {"ok": True, "id": client_id}

@router.delete("/{client_id}")
async def delete_client(client_id: str, user: Optional[Dict] = Depends(get_current_user_optional)):
    supabase = get_supabase_admin()
    await supabase.from_("clients").delete().eq("id", client_id).execute()
    return {"ok": True, "deleted_id": client_id}

@router.post("/{client_id}/contacts")
async def upsert_contact(client_id: str, contact: Dict[str, Any]):
    supabase = get_supabase_admin()
    contact_id = ensure_uuid(contact.get("id"))
    row = {
        "id": contact_id,
        "client_id": client_id,
        "contact_person": contact.get("contact_person") or "",
        "designation": contact.get("designation"),
        "mobile_number": contact.get("mobile_number") or "",
        "email": contact.get("email") or "",
        "is_primary": bool(contact.get("is_primary", False)),
    }
    await supabase.from_("client_contacts").upsert(row).execute()
    return {**contact, "id": contact_id, "client_id": client_id}

@router.delete("/contacts/{contact_id}")
async def delete_contact(contact_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("client_contacts").delete().eq("id", contact_id).execute()
    return {"ok": True}

@router.post("/{client_id}/bank-accounts")
async def upsert_bank_account(client_id: str, bank: Dict[str, Any]):
    supabase = get_supabase_admin()
    bank_id = ensure_uuid(bank.get("id"))
    row = {
        "id": bank_id,
        "client_id": client_id,
        "bank_name": bank.get("bank_name") or "",
        "account_number": bank.get("account_number") or "",
        "account_number_encrypted": bank.get("account_number") or "",
        "account_holder_name": bank.get("account_holder_name"),
        "ifsc_code": bank.get("ifsc_code") or "",
        "branch_name": bank.get("branch_name"),
        "account_type": bank.get("account_type", "Current"),
        "upi_id": bank.get("upi_id"),
        "is_primary": bool(bank.get("is_primary", False)),
    }
    await supabase.from_("client_bank_accounts").upsert(row).execute()
    return {**bank, "id": bank_id, "client_id": client_id}

@router.delete("/bank-accounts/{bank_account_id}")
async def delete_bank_account(bank_account_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("client_bank_accounts").delete().eq("id", bank_account_id).execute()
    return {"ok": True}

@router.delete("/addresses/{address_id}")
async def delete_address(address_id: str):
    supabase = get_supabase_admin()
    await supabase.from_("client_addresses").delete().eq("id", address_id).execute()
    return {"ok": True}
