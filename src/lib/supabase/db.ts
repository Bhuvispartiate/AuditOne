// ============================================================================
// DIRECT SUPABASE DATA CLIENT (ZERO MIDDLEMAN PROXY)
// Directly connects React frontend to Supabase PostgreSQL over secure HTTPS
// Fully eliminates Python /api backend dependency and ECONNREFUSED errors
// ============================================================================

import { createClient } from "./client";
import {
  Client,
  ClientContact,
  ClientAddress,
  ClientRegistration,
  ClientBankAccount,
  Service,
  ServiceEngagement,
  Project,
  Task,
  TaskComment,
  TaskCategory,
  TaskSubCategory,
  TaskStatusConfig,
  WorkflowTemplate,
  WorkflowMilestoneTemplate,
  Invoice,
  Payment,
  FileObject,
  Employee,
  UniversalRecycleBinItem,
  WhatsAppTemplate,
  VaultCredential,
  VaultAuditLog,
  InvoiceRequest,
  RecurringInvoice,
  BulkInvoiceBatch,
  InvoiceApprovalLog,
  Team,
  DocumentFolder,
} from "@/types";

export function isUuid(id?: string | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

export function ensureUuid(id?: string | null): string {
  if (id && isUuid(id)) return id;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ----------------------------------------------------------------------------
// CLIENTS, CONTACTS, ADDRESSES & REGISTRATIONS
// ----------------------------------------------------------------------------

export async function fetchClientsFromDb(): Promise<Client[]> {
  const supabase = createClient();
  const [clientsRes, contactsRes, addressesRes, regsRes, banksRes] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("client_contacts").select("*"),
    supabase.from("client_addresses").select("*"),
    supabase.from("client_registrations").select("*"),
    supabase.from("client_bank_accounts").select("*"),
  ]);

  if (clientsRes.error) {
    console.warn("Direct Supabase fetchClients error:", clientsRes.error);
    return [];
  }

  const contactsByClient: Record<string, ClientContact[]> = {};
  for (const c of contactsRes.data || []) {
    if (c.client_id) {
      if (!contactsByClient[c.client_id]) contactsByClient[c.client_id] = [];
      contactsByClient[c.client_id].push({
        id: c.id,
        client_id: c.client_id,
        contact_person: c.contact_person,
        designation: c.designation,
        mobile_number: c.mobile_number,
        email: c.email,
        is_primary: Boolean(c.is_primary),
      });
    }
  }

  const addressesByClient: Record<string, ClientAddress[]> = {};
  for (const a of addressesRes.data || []) {
    if (a.client_id) {
      if (!addressesByClient[a.client_id]) addressesByClient[a.client_id] = [];
      addressesByClient[a.client_id].push({
        id: a.id,
        client_id: a.client_id,
        address_type: a.address_type,
        street_address: a.street_address,
        city: a.city,
        state: a.state,
        pin_code: a.pin_code,
        country: a.country || "India",
        is_primary: Boolean(a.is_primary),
      });
    }
  }

  const regsByClient: Record<string, ClientRegistration> = {};
  for (const r of regsRes.data || []) {
    if (r.client_id) {
      regsByClient[r.client_id] = {
        id: r.id,
        client_id: r.client_id,
        pan: r.pan,
        gstin: r.gstin,
        cin: r.cin,
        dob_or_doi: r.dob_or_doi,
        additional_registrations: r.additional_registrations || [],
      };
    }
  }

  const banksByClient: Record<string, ClientBankAccount[]> = {};
  for (const b of banksRes.data || []) {
    if (b.client_id) {
      if (!banksByClient[b.client_id]) banksByClient[b.client_id] = [];
      banksByClient[b.client_id].push({
        id: b.id,
        client_id: b.client_id,
        bank_name: b.bank_name,
        account_number: b.account_number_encrypted || b.account_number || "",
        account_holder_name: b.account_holder_name,
        ifsc_code: b.ifsc_code,
        branch_name: b.branch_name,
        account_type: b.account_type || "Current",
        upi_id: b.upi_id,
        is_primary: Boolean(b.is_primary),
      });
    }
  }

  return (clientsRes.data || []).map((row) => {
    const cid = row.id;
    const contacts = contactsByClient[cid] || [];
    const primaryContact = contacts.find((c) => c.is_primary) || contacts[0] || undefined;
    return {
      id: cid,
      client_code: row.client_code,
      client_name: row.client_name,
      legal_name: row.legal_name || row.client_name,
      nick_name: row.nick_name,
      folder_name: row.folder_name,
      reference_name: row.reference_name,
      constitution: row.constitution || "Proprietorship",
      category: row.category,
      nature_of_income: row.nature_of_income,
      relationship_manager_id: row.relationship_manager_id,
      status: row.status || "Active",
      remarks: row.remarks,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString(),
      primary_contact: primaryContact,
      contacts: contacts,
      addresses: addressesByClient[cid] || [],
      registration: regsByClient[cid],
      bank_accounts: banksByClient[cid] || [],
    };
  });
}

export async function insertClientToDb(client: Client): Promise<Client> {
  const supabase = createClient();
  const cid = ensureUuid(client.id);

  const clientRow = {
    id: cid,
    client_code: client.client_code || `CL-${cid.slice(0, 8).toUpperCase()}`,
    client_name: client.client_name || "",
    legal_name: client.legal_name || client.client_name || "",
    nick_name: client.nick_name || null,
    folder_name: client.folder_name || null,
    reference_name: client.reference_name || null,
    constitution: client.constitution || "Proprietorship",
    category: client.category || null,
    nature_of_income: client.nature_of_income || null,
    relationship_manager_id: client.relationship_manager_id || null,
    status: client.status || "Active",
    remarks: client.remarks || null,
  };

  await supabase.from("clients").insert(clientRow);

  if (client.contacts && client.contacts.length > 0) {
    const contactRows = client.contacts.map((c) => ({
      id: ensureUuid(c.id),
      client_id: cid,
      contact_person: c.contact_person || "Primary Contact",
      designation: c.designation || null,
      mobile_number: c.mobile_number || "",
      email: c.email || "",
      is_primary: Boolean(c.is_primary),
    }));
    await supabase.from("client_contacts").insert(contactRows);
  }

  if (client.addresses && client.addresses.length > 0) {
    const addrRows = client.addresses.map((a) => ({
      id: ensureUuid(a.id),
      client_id: cid,
      address_type: a.address_type || "Registered",
      street_address: a.street_address || "",
      city: a.city || "",
      state: a.state || "",
      pin_code: a.pin_code || "",
      country: a.country || "India",
      is_primary: Boolean(a.is_primary),
    }));
    await supabase.from("client_addresses").insert(addrRows);
  }

  if (client.registration) {
    await supabase.from("client_registrations").insert({
      id: ensureUuid(client.registration.id),
      client_id: cid,
      pan: client.registration.pan || null,
      gstin: client.registration.gstin || null,
      cin: client.registration.cin || null,
      dob_or_doi: client.registration.dob_or_doi || null,
      additional_registrations: client.registration.additional_registrations || [],
    });
  }

  if (client.bank_accounts && client.bank_accounts.length > 0) {
    const bankRows = client.bank_accounts.map((b) => ({
      id: ensureUuid(b.id),
      client_id: cid,
      bank_name: b.bank_name || "",
      account_number: b.account_number || "",
      account_number_encrypted: b.account_number || "",
      account_holder_name: b.account_holder_name || null,
      ifsc_code: b.ifsc_code || "",
      branch_name: b.branch_name || null,
      account_type: b.account_type || "Current",
      upi_id: b.upi_id || null,
      is_primary: Boolean(b.is_primary),
    }));
    await supabase.from("client_bank_accounts").insert(bankRows);
  }

  return { ...client, id: cid };
}

export async function updateClientInDb(id: string, updates: Partial<Client>): Promise<void> {
  const supabase = createClient();
  const fields = [
    "client_code",
    "client_name",
    "legal_name",
    "nick_name",
    "folder_name",
    "reference_name",
    "constitution",
    "category",
    "nature_of_income",
    "relationship_manager_id",
    "status",
    "remarks",
  ] as const;

  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) {
      dbUpdates[f] = updates[f as keyof Client];
    }
  }

  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("clients").update(dbUpdates).eq("id", id);
  }
}

export async function deleteClientFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("clients").delete().eq("id", id);
}

export async function upsertClientContactInDb(contact: ClientContact): Promise<ClientContact> {
  const supabase = createClient();
  const contactId = ensureUuid(contact.id);
  const row = {
    id: contactId,
    client_id: contact.client_id,
    contact_person: contact.contact_person || "",
    designation: contact.designation || null,
    mobile_number: contact.mobile_number || "",
    email: contact.email || "",
    is_primary: Boolean(contact.is_primary),
  };
  await supabase.from("client_contacts").upsert(row);
  return { ...contact, id: contactId };
}

export async function deleteClientContactFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("client_contacts").delete().eq("id", id);
}

export async function upsertClientBankAccountInDb(bank: ClientBankAccount): Promise<ClientBankAccount> {
  const supabase = createClient();
  const bankId = ensureUuid(bank.id);
  const row = {
    id: bankId,
    client_id: bank.client_id,
    bank_name: bank.bank_name || "",
    account_number: bank.account_number || "",
    account_number_encrypted: bank.account_number || "",
    account_holder_name: bank.account_holder_name || null,
    ifsc_code: bank.ifsc_code || "",
    branch_name: bank.branch_name || null,
    account_type: bank.account_type || "Current",
    upi_id: bank.upi_id || null,
    is_primary: Boolean(bank.is_primary),
  };
  await supabase.from("client_bank_accounts").upsert(row);
  return { ...bank, id: bankId };
}

export async function deleteClientBankAccountFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("client_bank_accounts").delete().eq("id", id);
}

export async function deleteClientAddressFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("client_addresses").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// SERVICES & ENGAGEMENTS
// ----------------------------------------------------------------------------

export async function fetchServicesFromDb(): Promise<Service[]> {
  const supabase = createClient();
  const res = await supabase.from("services").select("*").order("created_at", { ascending: true });
  if (res.error) {
    console.warn("Direct Supabase fetchServices error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertServiceToDb(service: Service): Promise<Service> {
  const supabase = createClient();
  const sid = ensureUuid(service.id);
  const row = {
    id: sid,
    service_code: service.service_code || `SRV-${sid.slice(0, 6).toUpperCase()}`,
    service_name: service.service_name || "",
    description: service.description || null,
    default_fee: Number(service.default_fee) || 0,
    default_gst_rate: Number(service.default_gst_rate) || 18.0,
    billing_type: service.billing_type || "Recurring",
    status: service.status || "Active",
  };
  await supabase.from("services").insert(row);
  return { ...service, id: sid };
}

export async function updateServiceInDb(id: string, updates: Partial<Service>): Promise<void> {
  const supabase = createClient();
  const fields = ["service_code", "service_name", "description", "default_fee", "default_gst_rate", "billing_type", "status"] as const;
  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) dbUpdates[f] = updates[f];
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("services").update(dbUpdates).eq("id", id);
  }
}

export async function deleteServiceFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("services").delete().eq("id", id);
}

export async function fetchEngagementsFromDb(): Promise<ServiceEngagement[]> {
  const supabase = createClient();
  const res = await supabase
    .from("service_engagements")
    .select("*, clients(client_name), services(service_name)")
    .order("created_at", { ascending: false });

  if (res.error) {
    console.warn("Direct Supabase fetchEngagements error:", res.error);
    return [];
  }

  return (res.data || []).map((row: any) => ({
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.client_name || "",
    service_id: row.service_id,
    service_name: row.services?.service_name || "",
    agreed_fee: Number(row.agreed_fee) || 0,
    gst_rate: Number(row.gst_rate) || 18.0,
    billing_frequency: row.billing_frequency || "Monthly",
    payment_terms: row.payment_terms || "Immediate",
    relationship_manager_id: row.relationship_manager_id || null,
    start_date: row.start_date || "",
    end_date: row.end_date || null,
    status: row.status || "Active",
    remarks: row.remarks || null,
    created_at: row.created_at || new Date().toISOString(),
  }));
}

export async function insertEngagementToDb(eng: ServiceEngagement): Promise<ServiceEngagement> {
  const supabase = createClient();
  const eid = ensureUuid(eng.id);
  const row = {
    id: eid,
    client_id: eng.client_id,
    service_id: eng.service_id,
    agreed_fee: Number(eng.agreed_fee) || 0,
    gst_rate: Number(eng.gst_rate) || 18.0,
    billing_frequency: eng.billing_frequency || "Monthly",
    payment_terms: eng.payment_terms || "Immediate",
    relationship_manager_id: eng.relationship_manager_id || null,
    start_date: eng.start_date || new Date().toISOString().slice(0, 10),
    end_date: eng.end_date || null,
    status: eng.status || "Active",
    remarks: eng.remarks || null,
  };
  await supabase.from("service_engagements").insert(row);
  return { ...eng, id: eid };
}

export async function deleteEngagementFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("service_engagements").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// PROJECTS
// ----------------------------------------------------------------------------

export async function fetchProjectsFromDb(): Promise<Project[]> {
  const supabase = createClient();
  const [projRes, assignRes, milesRes] = await Promise.all([
    supabase.from("projects").select("*, clients(client_name)").order("created_at", { ascending: false }),
    supabase.from("project_assignments").select("*, employees(id, full_name)"),
    supabase.from("project_milestones").select("*").order("due_date", { ascending: true }),
  ]);

  if (projRes.error) {
    console.warn("Direct Supabase fetchProjects error:", projRes.error);
    return [];
  }

  const assignedEmployeesByProject: Record<string, Array<{ id: string; full_name: string; role_in_project?: string }>> = {};
  for (const a of assignRes.data || []) {
    if (a.project_id && a.employee_id) {
      if (!assignedEmployeesByProject[a.project_id]) assignedEmployeesByProject[a.project_id] = [];
      const emp = (a as any).employees;
      assignedEmployeesByProject[a.project_id].push({
        id: a.employee_id,
        full_name: emp?.full_name || "Member",
        role_in_project: a.role || "Contributor",
      });
    }
  }

  const milestonesByProject: Record<string, any[]> = {};
  for (const m of milesRes.data || []) {
    if (m.project_id) {
      if (!milestonesByProject[m.project_id]) milestonesByProject[m.project_id] = [];
      milestonesByProject[m.project_id].push({
        id: m.id,
        project_id: m.project_id,
        title: m.title,
        due_date: m.due_date,
        status: m.status || "Pending",
        completed_at: m.completed_at,
      });
    }
  }

  return (projRes.data || []).map((row: any) => {
    const pid = row.id;
    return {
      id: pid,
      project_code: row.project_code,
      project_name: row.project_name,
      project_type: row.project_type || "Client Project",
      client_id: row.client_id,
      client_name: row.clients?.client_name || "",
      service_engagement_id: row.service_engagement_id,
      description: row.description || "",
      project_manager_id: row.project_manager_id,
      priority: row.priority || "Medium",
      start_date: row.start_date,
      due_date: row.due_date,
      status: row.status || "In Progress",
      progress_percentage: Number(row.progress_percentage) || 0,
      assigned_employees: assignedEmployeesByProject[pid] || [],
      milestones: milestonesByProject[pid] || [],
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || row.created_at || new Date().toISOString(),
    };
  });
}

export async function insertProjectToDb(project: Project): Promise<Project> {
  const supabase = createClient();
  const pid = ensureUuid(project.id);
  const row = {
    id: pid,
    project_code: project.project_code || `PRJ-${pid.slice(0, 6).toUpperCase()}`,
    project_name: project.project_name || "",
    project_type: project.project_type || "Client Project",
    client_id: project.client_id || null,
    service_engagement_id: project.service_engagement_id || null,
    description: project.description || null,
    project_manager_id: project.project_manager_id || null,
    priority: project.priority || "Medium",
    start_date: project.start_date || new Date().toISOString().slice(0, 10),
    due_date: project.due_date || new Date().toISOString().slice(0, 10),
    status: project.status || "In Progress",
    progress_percentage: Number(project.progress_percentage) || 0,
  };
  await supabase.from("projects").insert(row);

  const assignedList = project.assigned_employees || [];
  if (assignedList.length > 0) {
    const assignRows = assignedList.map((e) => ({
      project_id: pid,
      employee_id: e.id,
      role: e.role_in_project || "Contributor",
    }));
    await supabase.from("project_assignments").insert(assignRows);
  }

  return { ...project, id: pid };
}

export async function updateProjectInDb(id: string, updates: Partial<Project>): Promise<void> {
  const supabase = createClient();
  const fields = [
    "project_code", "project_name", "project_type", "client_id", "service_engagement_id",
    "description", "project_manager_id", "priority", "start_date", "due_date", "status", "progress_percentage"
  ] as const;
  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) dbUpdates[f] = updates[f];
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("projects").update(dbUpdates).eq("id", id);
  }
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("projects").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// TASKS & SUBTASKS
// ----------------------------------------------------------------------------

export async function fetchTasksFromDb(): Promise<Task[]> {
  const supabase = createClient();
  const [tasksRes, assignRes] = await Promise.all([
    supabase.from("tasks").select("*, projects(project_name)").order("created_at", { ascending: false }),
    supabase.from("task_assignments").select("*, employees(id, full_name, designation_name, email)"),
  ]);

  if (tasksRes.error) {
    console.warn("Direct Supabase fetchTasks error:", tasksRes.error);
    return [];
  }

  const assignmentsByTask: Record<string, string[]> = {};
  const assignedEmpsByTask: Record<string, Array<{ id: string; full_name: string; designation?: string; email?: string }>> = {};

  for (const a of assignRes.data || []) {
    const tid = a.task_id;
    const eid = a.employee_id;
    const emp = (a as any).employees;
    if (tid && eid) {
      if (!assignmentsByTask[tid]) assignmentsByTask[tid] = [];
      assignmentsByTask[tid].push(eid);

      if (!assignedEmpsByTask[tid]) assignedEmpsByTask[tid] = [];
      assignedEmpsByTask[tid].push({
        id: eid,
        full_name: emp?.full_name || "Assignee",
        designation: emp?.designation_name,
        email: emp?.email,
      });
    }
  }

  return (tasksRes.data || []).map((row: any) => {
    const tid = row.id;
    const emps = assignedEmpsByTask[tid] || [];
    return {
      id: tid,
      task_code: row.task_code,
      project_id: row.project_id,
      project_name: row.projects?.project_name || "",
      parent_task_id: row.parent_task_id,
      title: row.title || "",
      description: row.description || "",
      assigned_employee_id: row.assigned_employee_id,
      assigned_employee_name: emps[0]?.full_name || undefined,
      assigned_employee_ids: assignmentsByTask[tid] || [],
      assigned_employees: emps,
      priority: row.priority || "Medium",
      start_date: row.start_date,
      due_date: row.due_date,
      status: row.status || "To Do",
      category_id: row.category_id,
      sub_category_id: row.sub_category_id,
      milestone_id: row.milestone_id,
      milestone_title: row.milestone_title,
      stage_id: row.stage_id,
      stage_title: row.stage_title,
      sub_stage_id: row.sub_stage_id,
      sub_stage_title: row.sub_stage_title,
      whatsapp_enabled: Boolean(row.whatsapp_enabled ?? true),
      client_id: row.client_id,
      client_name: row.client_name,
      is_billable: Boolean(row.is_billable),
      billing_amount: Number(row.billing_amount) || 0,
      billed_amount: Number(row.billed_amount) || 0,
      remaining_amount: Number(row.remaining_amount) || 0,
      pending_approval_amount: Number(row.pending_approval_amount) || 0,
      billing_status: row.billing_status || "To Be Billed",
      billing_description: row.billing_description,
      currency: row.currency || "INR",
      created_by: row.created_by,
      completed_at: row.completed_at,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at,
    };
  });
}

export async function insertTaskToDb(task: Task): Promise<Task> {
  const supabase = createClient();
  const tid = ensureUuid(task.id);
  const row = {
    id: tid,
    task_code: task.task_code || `TSK-${tid.slice(0, 6).toUpperCase()}`,
    project_id: task.project_id || null,
    parent_task_id: task.parent_task_id || null,
    title: task.title || "",
    description: task.description || "",
    assigned_employee_id: task.assigned_employee_id || null,
    priority: task.priority || "Medium",
    start_date: task.start_date || null,
    due_date: task.due_date || new Date().toISOString().slice(0, 10),
    status: task.status || "To Do",
    category_id: task.category_id || null,
    sub_category_id: task.sub_category_id || null,
    milestone_id: task.milestone_id || null,
    milestone_title: task.milestone_title || null,
    stage_id: task.stage_id || null,
    stage_title: task.stage_title || null,
    sub_stage_id: task.sub_stage_id || null,
    sub_stage_title: task.sub_stage_title || null,
    whatsapp_enabled: Boolean(task.whatsapp_enabled ?? true),
    client_id: task.client_id || null,
    client_name: task.client_name || null,
    is_billable: Boolean(task.is_billable),
    billing_amount: Number(task.billing_amount) || 0,
    billed_amount: Number(task.billed_amount) || 0,
    remaining_amount: Number(task.remaining_amount) || 0,
    pending_approval_amount: Number(task.pending_approval_amount) || 0,
    billing_status: task.billing_status || "To Be Billed",
    billing_description: task.billing_description || null,
    currency: task.currency || "INR",
    created_by: task.created_by || null,
  };
  await supabase.from("tasks").insert(row);

  const assignedIds = task.assigned_employee_ids || task.assigned_employees?.map((e) => e.id) || [];
  if (assignedIds.length > 0) {
    const assignRows = assignedIds.map((eid) => ({
      task_id: tid,
      employee_id: eid,
    }));
    await supabase.from("task_assignments").insert(assignRows);
  }

  return { ...task, id: tid };
}

export async function updateTaskInDb(id: string, updates: Partial<Task>): Promise<void> {
  const supabase = createClient();
  const fields = [
    "title", "description", "assigned_employee_id", "priority", "start_date", "due_date",
    "status", "category_id", "sub_category_id", "milestone_id", "milestone_title",
    "stage_id", "stage_title", "sub_stage_id", "sub_stage_title", "whatsapp_enabled",
    "client_id", "client_name", "is_billable", "billing_amount", "billed_amount",
    "remaining_amount", "pending_approval_amount", "billing_status", "billing_description",
    "currency", "completed_at", "parent_task_id", "project_id"
  ] as const;

  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) dbUpdates[f] = updates[f];
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("tasks").update(dbUpdates).eq("id", id);
  }
}

export async function deleteTaskFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("tasks").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// TASK COMMENTS
// ----------------------------------------------------------------------------

export async function fetchTaskCommentsFromDb(taskId?: string): Promise<TaskComment[]> {
  const supabase = createClient();
  let query = supabase.from("task_comments").select("*").order("created_at", { ascending: true });
  if (taskId) {
    query = query.eq("task_id", taskId);
  }
  const res = await query;
  if (res.error) {
    console.warn("Direct Supabase fetchTaskComments error:", res.error);
    return [];
  }
  return (res.data || []).map((row: any) => ({
    id: row.id,
    task_id: row.task_id,
    employee_id: row.author_id || row.employee_id || "",
    employee_name: row.author_name || row.employee_name || "User",
    comment: row.comment_text || row.comment || "",
    read_by: row.read_by || [],
    mentioned_employee_ids: row.mentioned_employee_ids || [],
    created_at: row.created_at || new Date().toISOString(),
  }));
}

export async function insertTaskCommentToDb(comment: TaskComment): Promise<TaskComment> {
  const supabase = createClient();
  const cid = ensureUuid(comment.id);
  const row = {
    id: cid,
    task_id: comment.task_id,
    author_id: comment.employee_id,
    author_name: comment.employee_name,
    comment_text: comment.comment,
    read_by: comment.read_by || [],
  };
  await supabase.from("task_comments").insert(row);
  return { ...comment, id: cid };
}

export async function deleteTaskCommentFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_comments").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// TASK STATUSES & CATEGORIES
// ----------------------------------------------------------------------------

export async function fetchTaskStatusesFromDb(): Promise<TaskStatusConfig[]> {
  const supabase = createClient();
  const res = await supabase.from("task_statuses").select("*").order("order_index", { ascending: true });
  if (res.error) {
    console.warn("Direct Supabase fetchTaskStatuses error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertTaskStatusToDb(status: TaskStatusConfig): Promise<TaskStatusConfig> {
  const supabase = createClient();
  const sid = ensureUuid(status.id);
  const row = { ...status, id: sid };
  await supabase.from("task_statuses").insert(row);
  return { ...status, id: sid };
}

export async function updateTaskStatusInDb(id: string, updates: Partial<TaskStatusConfig>): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_statuses").update(updates).eq("id", id);
}

export async function deleteTaskStatusFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_statuses").delete().eq("id", id);
}

export async function fetchTaskCategoriesFromDb(): Promise<TaskCategory[]> {
  const supabase = createClient();
  const [catRes, subRes] = await Promise.all([
    supabase.from("task_categories").select("*").order("category_name", { ascending: true }),
    supabase.from("task_sub_categories").select("*"),
  ]);

  if (catRes.error) {
    console.warn("Direct Supabase fetchTaskCategories error:", catRes.error);
    return [];
  }

  const subsByCat: Record<string, TaskSubCategory[]> = {};
  for (const s of subRes.data || []) {
    if (s.category_id) {
      if (!subsByCat[s.category_id]) subsByCat[s.category_id] = [];
      subsByCat[s.category_id].push({
        id: s.id,
        category_id: s.category_id,
        name: s.sub_category_name || s.name || "Sub-category",
        description: s.description,
        created_at: s.created_at || new Date().toISOString(),
      });
    }
  }

  return (catRes.data || []).map((c: any) => ({
    id: c.id,
    name: c.category_name || c.name || "Category",
    code: c.category_code || c.code || "CAT",
    description: c.description,
    sub_categories: subsByCat[c.id] || [],
    created_at: c.created_at || new Date().toISOString(),
  }));
}

export async function insertTaskCategoryToDb(category: TaskCategory): Promise<TaskCategory> {
  const supabase = createClient();
  const cid = ensureUuid(category.id);
  const row = {
    id: cid,
    category_code: category.code || `CAT-${cid.slice(0, 6).toUpperCase()}`,
    category_name: category.name || "Category",
    description: category.description || null,
  };
  await supabase.from("task_categories").insert(row);
  return { ...category, id: cid };
}

export async function updateTaskCategoryInDb(id: string, updates: Partial<TaskCategory>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {};
  if ("name" in updates) dbUpdates.category_name = updates.name;
  if ("code" in updates) dbUpdates.category_code = updates.code;
  if ("description" in updates) dbUpdates.description = updates.description;

  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("task_categories").update(dbUpdates).eq("id", id);
  }
}

export async function deleteTaskCategoryFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_categories").delete().eq("id", id);
}

export async function insertTaskSubCategoryToDb(sub: TaskSubCategory): Promise<TaskSubCategory> {
  const supabase = createClient();
  const sid = ensureUuid(sub.id);
  const row = {
    id: sid,
    category_id: sub.category_id,
    sub_category_name: sub.name || "Sub-category",
    description: sub.description || null,
  };
  await supabase.from("task_sub_categories").insert(row);
  return { ...sub, id: sid };
}

export async function updateTaskSubCategoryInDb(id: string, updates: Partial<TaskSubCategory>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {};
  if ("name" in updates) dbUpdates.sub_category_name = updates.name;
  if ("description" in updates) dbUpdates.description = updates.description;

  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("task_sub_categories").update(dbUpdates).eq("id", id);
  }
}

export async function deleteTaskSubCategoryFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("task_sub_categories").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// WORKFLOW TEMPLATES
// ----------------------------------------------------------------------------

export async function fetchWorkflowsFromDb(): Promise<WorkflowTemplate[]> {
  const supabase = createClient();
  const [wfsRes, msRes, stgRes, tasksRes] = await Promise.all([
    supabase.from("workflow_templates").select("*, services(service_name)"),
    supabase.from("workflow_milestones").select("*").order("milestone_order", { ascending: true }),
    supabase.from("workflow_stages").select("*").order("stage_order", { ascending: true }),
    supabase.from("workflow_tasks").select("*").order("task_order", { ascending: true }),
  ]);

  if (wfsRes.error) {
    console.warn("Direct Supabase fetchWorkflows error:", wfsRes.error);
    return [];
  }

  const tasksByStage: Record<string, any[]> = {};
  for (const t of tasksRes.data || []) {
    if (t.workflow_stage_id) {
      if (!tasksByStage[t.workflow_stage_id]) tasksByStage[t.workflow_stage_id] = [];
      tasksByStage[t.workflow_stage_id].push({
        id: t.id,
        task_name: t.task_name,
        description: t.description || "",
        sequence_number: t.task_order || 1,
        start_day_offset: t.start_day_offset || 0,
        duration_days: t.duration_days || 1,
        priority: t.priority || "Medium",
        status: "To Do",
        subtasks: [],
        default_comments: [],
      });
    }
  }

  const stagesByWf: Record<string, any[]> = {};
  for (const s of stgRes.data || []) {
    const wfid = s.workflow_template_id;
    if (wfid) {
      if (!stagesByWf[wfid]) stagesByWf[wfid] = [];
      stagesByWf[wfid].push({
        id: s.id,
        stage_name: s.stage_name,
        sequence_number: s.stage_order || 1,
        sub_stages: [
          {
            id: `substg-${s.id}`,
            sub_stage_name: "Deliverables",
            sequence_number: 1,
            tasks: tasksByStage[s.id] || [],
          },
        ],
      });
    }
  }

  const milestonesByWf: Record<string, any[]> = {};
  for (const m of msRes.data || []) {
    const wfid = m.workflow_template_id;
    if (wfid) {
      if (!milestonesByWf[wfid]) milestonesByWf[wfid] = [];
      milestonesByWf[wfid].push({
        id: m.id,
        title: m.title,
        sequence_number: m.milestone_order || 1,
        stages: stagesByWf[wfid] || [],
      });
    }
  }

  return (wfsRes.data || []).map((row: any) => {
    const wfid = row.id;
    const milestones = milestonesByWf[wfid] || [];
    const templateTasks = milestones.flatMap((m) =>
      (m.stages || []).flatMap((s: any) =>
        (s.sub_stages || []).flatMap((sub: any) => sub.tasks || [])
      )
    );

    return {
      id: wfid,
      workflow_code: row.workflow_code,
      workflow_name: row.workflow_name,
      service_id: row.service_id,
      service_name: row.services?.service_name,
      description: row.description || "",
      is_active: Boolean(row.is_active),
      version: 1,
      stages_count: templateTasks.length,
      template_tasks: templateTasks,
      milestones: milestones.length > 0 ? milestones : undefined,
      whatsapp_enabled: Boolean(row.whatsapp_enabled ?? true),
      created_at: row.created_at || new Date().toISOString(),
    };
  });
}

export async function insertWorkflowToDb(wf: WorkflowTemplate): Promise<WorkflowTemplate> {
  const supabase = createClient();
  const wfid = ensureUuid(wf.id);
  const row = {
    id: wfid,
    workflow_code: wf.workflow_code || `WF-${wfid.slice(0, 6).toUpperCase()}`,
    workflow_name: wf.workflow_name,
    service_id: wf.service_id || null,
    description: wf.description || null,
    is_active: Boolean(wf.is_active),
    whatsapp_enabled: Boolean(wf.whatsapp_enabled ?? true),
  };
  await supabase.from("workflow_templates").insert(row);
  return { ...wf, id: wfid };
}

export async function updateWorkflowInDb(id: string, updates: Partial<WorkflowTemplate>): Promise<void> {
  const supabase = createClient();
  const fields = ["workflow_code", "workflow_name", "service_id", "description", "is_active", "whatsapp_enabled"] as const;
  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) dbUpdates[f] = updates[f];
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("workflow_templates").update(dbUpdates).eq("id", id);
  }
}

export async function deleteWorkflowFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("workflow_templates").delete().eq("id", id);
}

export async function saveWorkflowMilestonesToDb(workflowId: string, milestones: WorkflowMilestoneTemplate[]): Promise<void> {
  const supabase = createClient();
  await supabase.from("workflow_milestones").delete().eq("workflow_template_id", workflowId);

  for (const [mIdx, m] of milestones.entries()) {
    const mid = ensureUuid(m.id);
    await supabase.from("workflow_milestones").insert({
      id: mid,
      workflow_template_id: workflowId,
      title: m.title,
      milestone_order: mIdx + 1,
    });
  }
}

// ----------------------------------------------------------------------------
// INVOICES & PAYMENTS
// ----------------------------------------------------------------------------

export async function fetchInvoicesFromDb(): Promise<Invoice[]> {
  const supabase = createClient();
  const [invRes, itemsRes] = await Promise.all([
    supabase.from("invoices").select("*, clients(client_name, legal_name)").order("created_at", { ascending: false }),
    supabase.from("invoice_items").select("*").order("item_order", { ascending: true }),
  ]);

  if (invRes.error) {
    console.warn("Direct Supabase fetchInvoices error:", invRes.error);
    return [];
  }

  const itemsByInv: Record<string, any[]> = {};
  for (const item of itemsRes.data || []) {
    if (item.invoice_id) {
      if (!itemsByInv[item.invoice_id]) itemsByInv[item.invoice_id] = [];
      itemsByInv[item.invoice_id].push({
        id: item.id,
        invoice_id: item.invoice_id,
        description: item.description || "",
        sac_code: item.hsn_sac || "",
        quantity: Number(item.quantity) || 1.0,
        rate: Number(item.unit_price) || 0.0,
        discount_amount: 0,
        taxable_amount: Number(item.line_total) || 0.0,
        gst_rate: Number(item.gst_rate) || 18.0,
        cgst_amount: 0,
        sgst_amount: 0,
        igst_amount: 0,
        total_amount: Number(item.line_total) || 0.0,
      });
    }
  }

  return (invRes.data || []).map((row: any) => {
    const iid = row.id;
    const items = itemsByInv[iid] || [];
    const subtotal = Number(row.subtotal) || 0.0;
    const taxAmount = Number(row.tax_amount) || 0.0;
    const totalAmount = Number(row.total_amount) || subtotal + taxAmount;
    const paidAmount = Number(row.paid_amount) || 0.0;

    return {
      id: iid,
      invoice_number: row.invoice_number,
      financial_year: row.financial_year || "2026-27",
      client_id: row.client_id,
      client_name: row.clients?.client_name || "",
      client_legal_name: row.clients?.legal_name || row.clients?.client_name || "",
      client_address: row.client_address || "",
      service_engagement_id: row.service_engagement_id,
      invoice_date: row.invoice_date,
      due_date: row.due_date,
      place_of_supply: row.place_of_supply || "State",
      is_interstate: Boolean(row.is_interstate),
      reverse_charge: Boolean(row.reverse_charge),
      subtotal: subtotal,
      discount_amount: Number(row.discount_amount) || 0,
      taxable_amount: Number(row.taxable_amount) || subtotal,
      cgst_amount: Number(row.cgst_amount) || taxAmount / 2,
      sgst_amount: Number(row.sgst_amount) || taxAmount / 2,
      igst_amount: Number(row.igst_amount) || 0,
      total_gst: taxAmount,
      grand_total: totalAmount,
      paid_amount: paidAmount,
      outstanding_balance: Math.max(0, totalAmount - paidAmount),
      status: row.status || "Draft",
      notes: row.notes,
      terms_conditions: row.terms_and_conditions || row.terms_conditions,
      items: items,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at,
    } as Invoice;
  });
}

export async function insertInvoiceToDb(invoice: Invoice): Promise<Invoice> {
  const supabase = createClient();
  const iid = ensureUuid(invoice.id);
  const invRow = {
    id: iid,
    invoice_number: invoice.invoice_number || `INV-${iid.slice(0, 6).toUpperCase()}`,
    client_id: invoice.client_id || null,
    service_engagement_id: invoice.service_engagement_id || null,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    subtotal: Number(invoice.subtotal) || 0.0,
    tax_amount: Number(invoice.total_gst) || 0.0,
    total_amount: Number(invoice.grand_total) || 0.0,
    paid_amount: Number(invoice.paid_amount) || 0.0,
    status: invoice.status || "Draft",
    notes: invoice.notes || null,
    terms_and_conditions: invoice.terms_conditions || null,
  };
  await supabase.from("invoices").insert(invRow);

  if (invoice.items && invoice.items.length > 0) {
    const itemRows = invoice.items.map((item, idx) => ({
      id: ensureUuid(item.id),
      invoice_id: iid,
      description: item.description || "",
      hsn_sac: item.sac_code || null,
      quantity: Number(item.quantity) || 1.0,
      unit_price: Number(item.rate) || 0.0,
      gst_rate: Number(item.gst_rate) || 18.0,
      line_total: Number(item.total_amount || item.taxable_amount) || 0.0,
      item_order: idx + 1,
    }));
    await supabase.from("invoice_items").insert(itemRows);
  }

  return { ...invoice, id: iid };
}

export async function updateInvoiceInDb(id: string, updates: Partial<Invoice>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {};
  if ("status" in updates) dbUpdates.status = updates.status;
  if ("notes" in updates) dbUpdates.notes = updates.notes;
  if ("paid_amount" in updates) dbUpdates.paid_amount = updates.paid_amount;
  if ("terms_conditions" in updates) dbUpdates.terms_and_conditions = updates.terms_conditions;

  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("invoices").update(dbUpdates).eq("id", id);
  }
}

export async function deleteInvoiceFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("invoices").delete().eq("id", id);
}

export async function fetchPaymentsFromDb(): Promise<Payment[]> {
  const supabase = createClient();
  const res = await supabase.from("payments").select("*").order("payment_date", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchPayments error:", res.error);
    return [];
  }
  return (res.data || []).map((row: any) => ({
    id: row.id,
    payment_number: row.payment_number,
    invoice_id: row.invoice_id,
    client_id: row.client_id,
    payment_date: row.payment_date,
    amount: Number(row.amount) || 0.0,
    payment_mode: row.payment_mode || "Bank Transfer",
    transaction_reference: row.reference_number || row.transaction_reference,
    remarks: row.notes || row.remarks,
    status: row.status || "Completed",
    created_at: row.created_at || new Date().toISOString(),
  }));
}

export async function insertPaymentToDb(payment: Payment): Promise<Payment> {
  const supabase = createClient();
  const pid = ensureUuid(payment.id);
  const row = {
    id: pid,
    payment_number: payment.payment_number || `PAY-${pid.slice(0, 6).toUpperCase()}`,
    invoice_id: payment.invoice_id || null,
    client_id: payment.client_id || null,
    payment_date: payment.payment_date,
    amount: Number(payment.amount) || 0.0,
    payment_mode: payment.payment_mode || "Bank Transfer",
    reference_number: payment.transaction_reference || null,
    notes: payment.remarks || null,
    status: payment.status || "Completed",
  };
  await supabase.from("payments").insert(row);
  return { ...payment, id: pid };
}

export async function updatePaymentInDb(id: string, updates: Partial<Payment>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, unknown> = {};
  if ("amount" in updates) dbUpdates.amount = updates.amount;
  if ("payment_mode" in updates) dbUpdates.payment_mode = updates.payment_mode;
  if ("transaction_reference" in updates) dbUpdates.reference_number = updates.transaction_reference;
  if ("remarks" in updates) dbUpdates.notes = updates.remarks;
  if ("status" in updates) dbUpdates.status = updates.status;

  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("payments").update(dbUpdates).eq("id", id);
  }
}

export async function deletePaymentFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("payments").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// INVOICE APPROVAL REQUESTS, RECURRING & BULK BATCHES
// ----------------------------------------------------------------------------

export async function fetchInvoiceRequestsFromDb(): Promise<InvoiceRequest[]> {
  const supabase = createClient();
  const res = await supabase.from("invoice_requests").select("*").order("created_at", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchInvoiceRequests error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertInvoiceRequestToDb(req: InvoiceRequest): Promise<InvoiceRequest> {
  const supabase = createClient();
  const rid = ensureUuid(req.id);
  const row = { ...req, id: rid };
  await supabase.from("invoice_requests").insert(row);
  return { ...req, id: rid };
}

export async function updateInvoiceRequestInDb(id: string, updates: Partial<InvoiceRequest>): Promise<void> {
  const supabase = createClient();
  await supabase.from("invoice_requests").update(updates).eq("id", id);
}

export async function fetchRecurringInvoicesFromDb(): Promise<RecurringInvoice[]> {
  const supabase = createClient();
  const res = await supabase.from("recurring_invoices").select("*").order("created_at", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchRecurringInvoices error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertRecurringInvoiceToDb(item: RecurringInvoice): Promise<RecurringInvoice> {
  const supabase = createClient();
  const rid = ensureUuid(item.id);
  const row = { ...item, id: rid };
  await supabase.from("recurring_invoices").insert(row);
  return { ...item, id: rid };
}

export async function updateRecurringInvoiceInDb(id: string, updates: Partial<RecurringInvoice>): Promise<void> {
  const supabase = createClient();
  await supabase.from("recurring_invoices").update(updates).eq("id", id);
}

export async function deleteRecurringInvoiceFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("recurring_invoices").delete().eq("id", id);
}

export async function fetchBulkBatchesFromDb(): Promise<BulkInvoiceBatch[]> {
  const supabase = createClient();
  const res = await supabase.from("bulk_invoice_batches").select("*").order("created_at", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchBulkBatches error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertBulkBatchToDb(batch: BulkInvoiceBatch): Promise<BulkInvoiceBatch> {
  const supabase = createClient();
  const bid = ensureUuid(batch.id);
  const row = { ...batch, id: bid };
  await supabase.from("bulk_invoice_batches").insert(row);
  return { ...batch, id: bid };
}

export async function fetchApprovalLogsFromDb(requestId?: string): Promise<InvoiceApprovalLog[]> {
  const supabase = createClient();
  let query = supabase.from("invoice_approval_logs").select("*").order("created_at", { ascending: false });
  if (requestId) {
    query = query.eq("request_id", requestId);
  }
  const res = await query;
  if (res.error) {
    console.warn("Direct Supabase fetchApprovalLogs error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertApprovalLogToDb(log: InvoiceApprovalLog): Promise<InvoiceApprovalLog> {
  const supabase = createClient();
  const lid = ensureUuid(log.id);
  const row = { ...log, id: lid };
  await supabase.from("invoice_approval_logs").insert(row);
  return { ...log, id: lid };
}

// ----------------------------------------------------------------------------
// EMPLOYEES & TEAMS
// ----------------------------------------------------------------------------

export async function fetchEmployeesFromDb(): Promise<Employee[]> {
  const supabase = createClient();
  const res = await supabase
    .from("employees")
    .select("*, designations(designation_name), teams!employees_team_id_fkey(name)")
    .order("created_at", { ascending: true });

  let data = res.data;
  if (res.error) {
    const fallback = await supabase.from("employees").select("*").order("created_at", { ascending: true });
    if (fallback.error) {
      console.warn("Direct Supabase fetchEmployees error:", fallback.error);
      return [];
    }
    data = fallback.data;
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    email: row.email,
    mobile_number: row.mobile_number,
    designation_id: row.designation_id,
    designation_name: row.designations?.designation_name || row.designation_name,
    team_id: row.team_id,
    team_name: row.teams?.name || row.team_name,
    joining_date: row.joining_date,
    employment_status: row.employment_status || "Active",
    is_active: Boolean(row.is_active ?? true),
    role_code: row.role_code || "EMPLOYEE",
    branch_name: row.branch_name,
    created_at: row.created_at || new Date().toISOString(),
  }));
}

export async function insertEmployeeToDb(emp: Employee): Promise<Employee> {
  const supabase = createClient();
  const eid = ensureUuid(emp.id);
  const row = {
    id: eid,
    employee_code: emp.employee_code || `EMP-${eid.slice(0, 6).toUpperCase()}`,
    first_name: emp.first_name || "",
    last_name: emp.last_name || "",
    email: (emp.email || "").trim().toLowerCase(),
    mobile_number: emp.mobile_number || null,
    designation_name: emp.designation_name || null,
    designation_id: emp.designation_id || null,
    team_id: emp.team_id || null,
    team_name: emp.team_name || null,
    branch_name: emp.branch_name || null,
    joining_date: emp.joining_date || new Date().toISOString().slice(0, 10),
    employment_status: emp.employment_status || "Active",
    is_active: Boolean(emp.is_active ?? true),
    role_code: emp.role_code || "EMPLOYEE",
  };
  await supabase.from("employees").insert(row);
  return { ...emp, id: eid };
}

export async function updateEmployeeInDb(id: string, updates: Partial<Employee>): Promise<void> {
  const supabase = createClient();
  const fields = [
    "first_name", "last_name", "email", "mobile_number", "designation_name",
    "designation_id", "team_id", "team_name", "branch_name", "employment_status", "is_active", "role_code"
  ] as const;
  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) {
      if (f === "email" && updates[f]) {
        dbUpdates[f] = updates[f]!.trim().toLowerCase();
      } else {
        dbUpdates[f] = updates[f];
      }
    }
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("employees").update(dbUpdates).eq("id", id);
  }
}

export async function deleteEmployeeFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("employees").delete().eq("id", id);
}

export async function fetchTeamsFromDb(): Promise<Team[]> {
  const supabase = createClient();
  const [teamsRes, membersRes] = await Promise.all([
    supabase.from("teams").select("*, employees!teams_supervisor_id_fkey(full_name)"),
    supabase.from("team_members").select("*, employees(full_name, designation_name)"),
  ]);

  let teamsData = teamsRes.data;
  if (teamsRes.error) {
    const fallback = await supabase.from("teams").select("*");
    if (fallback.error) {
      console.warn("Direct Supabase fetchTeams error:", fallback.error);
      return [];
    }
    teamsData = fallback.data;
  }

  const membersByTeam: Record<string, any[]> = {};
  for (const m of membersRes.data || []) {
    if (m.team_id) {
      if (!membersByTeam[m.team_id]) membersByTeam[m.team_id] = [];
      membersByTeam[m.team_id].push({
        id: m.id,
        team_id: m.team_id,
        employee_id: m.employee_id,
        employee_name: (m as any).employees?.full_name || "Member",
        designation: (m as any).employees?.designation_name || "",
        role_in_team: m.role_in_team || "Member",
        is_active: Boolean(m.is_active ?? true),
        joined_at: m.joined_at,
      });
    }
  }

  return (teamsData || []).map((row: any) => {
    const tid = row.id;
    const members = membersByTeam[tid] || [];
    return {
      id: tid,
      name: row.name,
      supervisor_id: row.supervisor_id,
      supervisor_name: row.employees?.full_name,
      description: row.description,
      status: row.status || "Active",
      members: members,
      member_count: members.length,
    };
  });
}

export async function insertTeamToDb(team: Team): Promise<Team> {
  const supabase = createClient();
  const tid = ensureUuid(team.id);
  const row = {
    id: tid,
    name: team.name || "Team",
    description: team.description || null,
    supervisor_id: team.supervisor_id || null,
    status: team.status || "Active",
  };
  await supabase.from("teams").insert(row);
  return { ...team, id: tid };
}

export async function updateTeamInDb(id: string, updates: Partial<Team>): Promise<void> {
  const supabase = createClient();
  const fields = ["name", "description", "supervisor_id", "status"] as const;
  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) dbUpdates[f] = updates[f];
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("teams").update(dbUpdates).eq("id", id);
  }
}

export async function deleteTeamFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("teams").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// DOCUMENTS & FILE OBJECTS
// ----------------------------------------------------------------------------

export async function fetchDocumentsFromDb(): Promise<FileObject[]> {
  const supabase = createClient();
  const res = await supabase.from("file_objects").select("*").order("created_at", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchDocuments error:", res.error);
    return [];
  }
  return (res.data || []).map((row: any) => ({
    id: row.id,
    bucket_name: row.storage_bucket,
    r2_object_key: row.storage_path,
    file_name: row.file_name,
    file_size: Number(row.file_size_bytes) || 0,
    mime_type: row.mime_type,
    category: row.file_category || "General",
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    uploaded_by: row.uploaded_by,
    version_number: Number(row.version) || 1,
    created_at: row.created_at || new Date().toISOString(),
  }));
}

export async function insertDocumentToDb(doc: FileObject): Promise<FileObject> {
  const supabase = createClient();
  const fid = ensureUuid(doc.id);
  const row = {
    id: fid,
    storage_bucket: doc.bucket_name || "firm-documents",
    storage_path: doc.r2_object_key || `files/${fid}`,
    file_name: doc.file_name || "file",
    file_size_bytes: Number(doc.file_size) || 0,
    mime_type: doc.mime_type || null,
    file_category: doc.category || "General",
    entity_type: doc.entity_type || "general",
    entity_id: String(doc.entity_id || "0"),
    uploaded_by: doc.uploaded_by || null,
    version: Number(doc.version_number) || 1,
  };
  await supabase.from("file_objects").insert(row);
  return { ...doc, id: fid };
}

export async function deleteDocumentFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("file_objects").delete().eq("id", id);
}

export async function fetchDocumentFoldersFromDb(): Promise<DocumentFolder[]> {
  const supabase = createClient();
  const res = await supabase
    .from("system_settings")
    .select("setting_value")
    .eq("setting_key", "pms_document_folders_v1")
    .maybeSingle();

  if (res.data && Array.isArray(res.data.setting_value)) {
    return res.data.setting_value;
  }
  return [];
}

export async function saveDocumentFoldersToDb(folders: DocumentFolder[]): Promise<void> {
  const supabase = createClient();
  await supabase.from("system_settings").upsert({
    setting_key: "pms_document_folders_v1",
    setting_value: folders,
    description: "Configured document folder structure",
  });
}

// ----------------------------------------------------------------------------
// CREDENTIAL VAULT (PASSWORDS & SECURE PORTALS)
// ----------------------------------------------------------------------------

export async function fetchVaultCredentialsFromDb(): Promise<VaultCredential[]> {
  const supabase = createClient();
  const res = await supabase.from("vault_credentials").select("*").order("created_at", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchVaultCredentials error:", res.error);
    return [];
  }
  return (res.data || []).map((row: any) => ({
    id: row.id,
    portal_name: row.portal_name,
    login_url: row.login_url || "",
    username: row.username,
    password_encrypted: row.password_encrypted,
    registered_email: row.registered_email,
    registered_mobile: row.registered_mobile,
    account_holder_name: row.account_holder_name,
    category: row.category || "Taxation",
    client_id: row.client_id,
    client_name: row.client_name,
    assigned_employee_ids: row.assigned_employee_ids || [],
    assigned_employee_names: row.assigned_employee_names,
    notes: row.notes,
    password_history: row.password_history || [],
    last_password_changed_at: row.last_password_changed_at,
    rotation_reminder_days: Number(row.rotation_reminder_days) || 90,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at,
    created_by_id: row.created_by_id,
    created_by_name: row.created_by_name,
  }));
}

export async function insertVaultCredentialToDb(cred: VaultCredential): Promise<VaultCredential> {
  const supabase = createClient();
  const cid = ensureUuid(cred.id);
  const row = {
    id: cid,
    portal_name: cred.portal_name,
    login_url: cred.login_url || null,
    username: cred.username,
    password_encrypted: cred.password_encrypted,
    registered_email: cred.registered_email || null,
    registered_mobile: cred.registered_mobile || null,
    account_holder_name: cred.account_holder_name || null,
    category: cred.category || "Taxation",
    client_id: cred.client_id || null,
    client_name: cred.client_name || null,
    assigned_employee_ids: cred.assigned_employee_ids || [],
    assigned_employee_names: cred.assigned_employee_names || null,
    notes: cred.notes || null,
    password_history: cred.password_history || [],
    rotation_reminder_days: Number(cred.rotation_reminder_days) || 90,
    created_by_id: cred.created_by_id || null,
    created_by_name: cred.created_by_name || null,
  };
  await supabase.from("vault_credentials").insert(row);
  return { ...cred, id: cid };
}

export async function updateVaultCredentialInDb(id: string, updates: Partial<VaultCredential>): Promise<void> {
  const supabase = createClient();
  const fields = [
    "portal_name", "login_url", "username", "password_encrypted", "registered_email",
    "registered_mobile", "account_holder_name", "category", "client_id", "client_name",
    "assigned_employee_ids", "assigned_employee_names", "notes", "password_history",
    "last_password_changed_at", "rotation_reminder_days"
  ] as const;
  const dbUpdates: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in updates) dbUpdates[f] = updates[f];
  }
  if (Object.keys(dbUpdates).length > 0) {
    await supabase.from("vault_credentials").update(dbUpdates).eq("id", id);
  }
}

export async function deleteVaultCredentialFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("vault_credentials").delete().eq("id", id);
}

export async function fetchVaultAuditLogsFromDb(): Promise<VaultAuditLog[]> {
  const supabase = createClient();
  const res = await supabase.from("vault_audit_logs").select("*").order("timestamp", { ascending: false }).limit(500);
  if (res.error) {
    console.warn("Direct Supabase fetchVaultAuditLogs error:", res.error);
    return [];
  }
  return res.data || [];
}

export async function insertVaultAuditLogToDb(log: VaultAuditLog): Promise<VaultAuditLog> {
  const supabase = createClient();
  const lid = ensureUuid(log.id);
  const row = { ...log, id: lid };
  await supabase.from("vault_audit_logs").insert(row);
  return { ...log, id: lid };
}

// ----------------------------------------------------------------------------
// RECYCLE BIN & WHATSAPP TEMPLATES
// ----------------------------------------------------------------------------

export async function fetchRecycleBinFromDb(): Promise<UniversalRecycleBinItem[]> {
  const supabase = createClient();
  const res = await supabase.from("universal_recycle_bin").select("*").order("deleted_at", { ascending: false });
  if (res.error) {
    console.warn("Direct Supabase fetchRecycleBin error:", res.error);
    return [];
  }
  return (res.data || []).map((row: any) => ({
    id: row.id,
    item_id: row.item_id || row.entity_id,
    item_type: row.item_type || row.entity_type,
    title: row.title || row.entity_name,
    code: row.code || row.entity_code,
    subtitle: row.subtitle,
    category_name: row.category_name,
    raw_data: row.raw_data || row.data || {},
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    deleted_by_name: row.deleted_by_name,
    recovery_deadline: row.recovery_deadline || row.expires_at,
  }));
}

export async function insertRecycleBinItemToDb(item: UniversalRecycleBinItem): Promise<void> {
  const supabase = createClient();
  const rid = item.id || `bin-${ensureUuid()}`;
  const row = {
    id: rid,
    entity_type: item.item_type || "item",
    entity_id: item.item_id || rid,
    entity_name: item.title || "Deleted Item",
    entity_code: item.code || null,
    data: item.raw_data || {},
    deleted_by: item.deleted_by || null,
    deleted_by_name: item.deleted_by_name || null,
    deleted_at: item.deleted_at || new Date().toISOString(),
    expires_at: item.recovery_deadline || null,
    permanent_delete_eligible_at: item.recovery_deadline || null,
  };
  await supabase.from("universal_recycle_bin").insert(row);
}

export async function deleteRecycleBinItemFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("universal_recycle_bin").delete().eq("id", id);
}

export async function fetchWhatsAppTemplatesFromDb(): Promise<WhatsAppTemplate[]> {
  const supabase = createClient();
  const res = await supabase.from("whatsapp_templates").select("*").order("name", { ascending: true });
  if (res.error) {
    console.warn("Direct Supabase fetchWhatsAppTemplates error:", res.error);
    return [];
  }
  return (res.data || []).map((row: any) => ({
    id: row.id,
    title: row.name || row.title,
    category: row.template_type || row.category || "General",
    content: row.content || "",
    created_at: row.created_at,
  }));
}

export async function upsertWhatsAppTemplateInDb(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
  const supabase = createClient();
  const wid = template.id || `wtpl-${ensureUuid()}`;
  const row = {
    id: wid,
    name: template.title || "Template",
    template_type: template.category || "General",
    content: template.content || "",
  };
  await supabase.from("whatsapp_templates").upsert(row);
  return { ...template, id: wid };
}

export async function deleteWhatsAppTemplateFromDb(id: string): Promise<void> {
  const supabase = createClient();
  await supabase.from("whatsapp_templates").delete().eq("id", id);
}

// ----------------------------------------------------------------------------
// SUPER ADMIN FULL DATABASE RESET
// ----------------------------------------------------------------------------

export async function resetFullDatabaseInSupabase(initiator: Employee): Promise<{
  ok: boolean;
  error?: string;
  clearedTablesCount?: number;
}> {
  const email = (initiator.email || "").trim().toLowerCase();
  const roleCode = initiator.role_code;

  if (roleCode !== "SUPER_ADMIN" && !email.includes("admin")) {
    return {
      ok: false,
      error: "Unauthorized: Full database reset is restricted exclusively to the Super Admin.",
    };
  }

  const supabase = createClient();
  const nilUuid = "00000000-0000-0000-0000-000000000000";

  const tablesToClear = [
    "task_comments", "task_assignments", "tasks",
    "project_assignments", "project_milestones", "projects",
    "invoice_items", "invoice_approval_logs",
    "bulk_invoice_batches", "invoice_requests", "recurring_invoices",
    "invoices", "payments", "service_engagements",
    "client_contacts", "client_addresses", "client_registrations", "client_bank_accounts", "clients",
    "workflow_tasks", "workflow_stages", "workflow_milestones", "workflow_templates",
    "services", "task_sub_categories", "task_categories", "universal_recycle_bin",
    "vault_audit_logs", "vault_credentials", "file_objects", "whatsapp_templates",
    "team_members", "teams"
  ];

  let clearedCount = 0;
  for (const tbl of tablesToClear) {
    try {
      const res = await supabase.from(tbl).delete().neq("id", nilUuid);
      if (!res.error) clearedCount++;
    } catch {
      // Continue clearing
    }
  }

  // Clear non-superadmin employees
  try {
    const empRes = await supabase.from("employees").delete().neq("id", nilUuid).neq("role_code", "SUPER_ADMIN");
    if (!empRes.error) clearedCount++;
  } catch {
    // Continue
  }

  return {
    ok: true,
    clearedTablesCount: clearedCount,
  };
}
