// ============================================================================
// DIRECT SUPABASE DATABASE CLIENT & REPOSITORY SERVICE
// Pure, single-source-of-truth direct database persistence
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
  WorkflowStageTemplate,
  WorkflowProjectTaskTemplate,
  Invoice,
  InvoiceItem,
  Payment,
  FileObject,
  Employee,
  UniversalRecycleBinItem,
  WhatsAppTemplate,
  VaultCredential,
  VaultAuditLog,
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
  const [clientsRes, contactsRes, addressesRes, regsRes, bankAccountsRes] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: false }),
    supabase.from("client_contacts").select("*"),
    supabase.from("client_addresses").select("*"),
    supabase.from("client_registrations").select("*"),
    supabase.from("client_bank_accounts").select("*"),
  ]);

  if (clientsRes.error) {
    console.error("Error fetching clients from Supabase:", clientsRes.error);
    throw new Error(clientsRes.error.message);
  }

  const contactsByClient = new Map<string, ClientContact[]>();
  (contactsRes.data || []).forEach((c: any) => {
    const list = contactsByClient.get(c.client_id) || [];
    list.push({
      id: c.id,
      client_id: c.client_id,
      contact_person: c.contact_person,
      designation: c.designation || undefined,
      mobile_number: c.mobile_number,
      email: c.email,
      is_primary: Boolean(c.is_primary),
    });
    contactsByClient.set(c.client_id, list);
  });

  const addressesByClient = new Map<string, ClientAddress[]>();
  (addressesRes.data || []).forEach((a: any) => {
    const list = addressesByClient.get(a.client_id) || [];
    list.push({
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
    addressesByClient.set(a.client_id, list);
  });

  const regsByClient = new Map<string, ClientRegistration>();
  (regsRes.data || []).forEach((r: any) => {
    regsByClient.set(r.client_id, {
      id: r.id,
      client_id: r.client_id,
      pan: r.pan,
      gstin: r.gstin || undefined,
      cin: r.cin || undefined,
      dob_or_doi: r.dob_or_doi || undefined,
      additional_registrations: r.additional_registrations || [],
    });
  });

  const bankAccountsByClient = new Map<string, ClientBankAccount[]>();
  (bankAccountsRes.data || []).forEach((b: any) => {
    const list = bankAccountsByClient.get(b.client_id) || [];
    list.push({
      id: b.id,
      client_id: b.client_id,
      bank_name: b.bank_name,
      account_number: b.account_number_encrypted || b.account_number || "",
      account_holder_name: b.account_holder_name || undefined,
      ifsc_code: b.ifsc_code,
      branch_name: b.branch_name || undefined,
      account_type: b.account_type || "Current",
      upi_id: b.upi_id || undefined,
      is_primary: Boolean(b.is_primary),
    });
    bankAccountsByClient.set(b.client_id, list);
  });

  return (clientsRes.data || []).map((row: any): Client => {
    const contacts = contactsByClient.get(row.id) || [];
    const primaryContact = contacts.find((c) => c.is_primary) || contacts[0];
    const addresses = addressesByClient.get(row.id) || [];
    const registration = regsByClient.get(row.id);
    const bankAccounts = bankAccountsByClient.get(row.id) || [];

    return {
      id: row.id,
      client_code: row.client_code,
      client_name: row.client_name,
      legal_name: row.legal_name,
      nick_name: row.nick_name || undefined,
      folder_name: row.folder_name || undefined,
      reference_name: row.reference_name || undefined,
      constitution: row.constitution,
      category: row.category || undefined,
      nature_of_income: row.nature_of_income || undefined,
      remarks: row.remarks || undefined,
      relationship_manager_id: row.relationship_manager_id || undefined,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      contact: primaryContact,
      contacts: contacts.length > 0 ? contacts : undefined,
      addresses: addresses.length > 0 ? addresses : undefined,
      registration,
      bank_accounts: bankAccounts.length > 0 ? bankAccounts : undefined,
      active_services_count: 0,
      total_projects_count: 0,
      completed_projects_count: 0,
      pending_tasks_count: 0,
      total_invoiced_amount: 0,
      total_payments_received: 0,
      outstanding_amount: 0,
    };
  });
}

export async function insertClientToDb(client: Client): Promise<Client> {
  const supabase = createClient();
  const clientId = ensureUuid(client.id);
  const clientRecord = { ...client, id: clientId };

  const { error } = await supabase.from("clients").insert({
    id: clientId,
    client_code: clientRecord.client_code,
    client_name: clientRecord.client_name,
    legal_name: clientRecord.legal_name,
    nick_name: clientRecord.nick_name || null,
    folder_name: clientRecord.folder_name || null,
    reference_name: clientRecord.reference_name || null,
    constitution: clientRecord.constitution,
    category: clientRecord.category || null,
    nature_of_income: clientRecord.nature_of_income || null,
    remarks: clientRecord.remarks || null,
    relationship_manager_id: isUuid(clientRecord.relationship_manager_id)
      ? clientRecord.relationship_manager_id
      : null,
    status: clientRecord.status || "Active",
    created_at: clientRecord.created_at || new Date().toISOString(),
    updated_at: clientRecord.updated_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert client error:", error);
    throw new Error(error.message);
  }

  // Insert contacts
  const contactsToInsert = (clientRecord.contacts && clientRecord.contacts.length > 0)
    ? clientRecord.contacts
    : clientRecord.contact ? [clientRecord.contact] : [];

  if (contactsToInsert.length > 0) {
    const contactRows = contactsToInsert.map((c, idx) => ({
      id: ensureUuid(c.id),
      client_id: clientId,
      contact_person: c.contact_person,
      designation: c.designation || null,
      mobile_number: c.mobile_number,
      email: c.email,
      is_primary: c.is_primary !== undefined ? c.is_primary : idx === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error: cErr } = await supabase.from("client_contacts").insert(contactRows);
    if (cErr) console.warn("Supabase insert client_contacts error:", cErr);
  }

  // Insert addresses
  if (clientRecord.addresses && clientRecord.addresses.length > 0) {
    const addrRows = clientRecord.addresses.map((a, idx) => ({
      id: ensureUuid(a.id),
      client_id: clientId,
      address_type: a.address_type || (idx === 0 ? "Registered" : "Communication"),
      street_address: a.street_address,
      city: a.city,
      state: a.state,
      pin_code: a.pin_code,
      country: a.country || "India",
      is_primary: a.is_primary !== undefined ? a.is_primary : idx === 0,
    }));
    const { error: aErr } = await supabase.from("client_addresses").insert(addrRows);
    if (aErr) console.warn("Supabase insert client_addresses error:", aErr);
  }

  // Insert registration
  if (clientRecord.registration && clientRecord.registration.pan) {
    const { error: rErr } = await supabase.from("client_registrations").insert({
      id: ensureUuid(clientRecord.registration.id),
      client_id: clientId,
      pan: clientRecord.registration.pan,
      gstin: clientRecord.registration.gstin || null,
      cin: clientRecord.registration.cin || null,
      dob_or_doi: clientRecord.registration.dob_or_doi || null,
      additional_registrations: clientRecord.registration.additional_registrations || [],
    });
    if (rErr) console.warn("Supabase insert client_registrations error:", rErr);
  }

  // Insert bank accounts
  if (clientRecord.bank_accounts && clientRecord.bank_accounts.length > 0) {
    const bankRows = clientRecord.bank_accounts.map((b, idx) => ({
      id: ensureUuid(b.id),
      client_id: clientId,
      bank_name: b.bank_name,
      account_number_encrypted: b.account_number,
      ifsc_code: b.ifsc_code,
      account_type: b.account_type || "Current",
      is_primary: b.is_primary !== undefined ? b.is_primary : idx === 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    const { error: bErr } = await supabase.from("client_bank_accounts").insert(bankRows);
    if (bErr) console.warn("Supabase insert client_bank_accounts error:", bErr);
  }

  return clientRecord;
}

export async function upsertClientBankAccountInDb(account: ClientBankAccount): Promise<ClientBankAccount> {
  const supabase = createClient();
  const id = ensureUuid(account.id);
  const row = {
    id,
    client_id: ensureUuid(account.client_id),
    bank_name: account.bank_name,
    account_number_encrypted: account.account_number,
    ifsc_code: account.ifsc_code,
    account_type: account.account_type || "Current",
    is_primary: account.is_primary ?? true,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("client_bank_accounts").upsert(row);
  if (error) {
    console.error("Supabase upsert client_bank_accounts error:", error);
    throw new Error(error.message);
  }
  return { ...account, id };
}

export async function deleteClientBankAccountFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("client_bank_accounts").delete().eq("id", id);
  if (error) {
    console.error("Supabase delete client_bank_accounts error:", error);
    throw new Error(error.message);
  }
}

export async function updateClientInDb(id: string, updates: Partial<Client>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.client_name !== undefined) dbUpdates.client_name = updates.client_name;
  if (updates.legal_name !== undefined) dbUpdates.legal_name = updates.legal_name;
  if (updates.nick_name !== undefined) dbUpdates.nick_name = updates.nick_name || null;
  if (updates.folder_name !== undefined) dbUpdates.folder_name = updates.folder_name || null;
  if (updates.reference_name !== undefined) dbUpdates.reference_name = updates.reference_name || null;
  if (updates.constitution !== undefined) dbUpdates.constitution = updates.constitution;
  if (updates.category !== undefined) dbUpdates.category = updates.category || null;
  if (updates.nature_of_income !== undefined) dbUpdates.nature_of_income = updates.nature_of_income || null;
  if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks || null;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.relationship_manager_id !== undefined) {
    dbUpdates.relationship_manager_id = isUuid(updates.relationship_manager_id)
      ? updates.relationship_manager_id
      : null;
  }

  const { error } = await supabase.from("clients").update(dbUpdates).eq("id", id);
  if (error) {
    console.error("Supabase update client error:", error);
    throw new Error(error.message);
  }

  // Upsert primary contact if provided
  if (updates.contact) {
    await upsertClientContactInDb({
      ...updates.contact,
      client_id: id,
    });
  }

  // Upsert all contacts if provided
  if (updates.contacts && updates.contacts.length > 0) {
    for (const c of updates.contacts) {
      await upsertClientContactInDb({
        ...c,
        client_id: id,
      });
    }
  }

  // Upsert registration if provided (PAN, GSTIN, CIN, DOB)
  if (updates.registration && (updates.registration.pan || updates.registration.dob_or_doi)) {
    const regPayload = {
      id: ensureUuid(updates.registration.id),
      client_id: id,
      pan: updates.registration.pan || "",
      gstin: updates.registration.gstin || null,
      cin: updates.registration.cin || null,
      dob_or_doi: updates.registration.dob_or_doi || null,
      additional_registrations: updates.registration.additional_registrations || [],
      updated_at: new Date().toISOString(),
    };
    const { error: rErr } = await supabase.from("client_registrations").upsert(regPayload);
    if (rErr) console.warn("Supabase upsert client_registrations error:", rErr);
  }

  // Upsert bank accounts if provided
  if (updates.bank_accounts && updates.bank_accounts.length > 0) {
    for (const b of updates.bank_accounts) {
      await upsertClientBankAccountInDb({
        ...b,
        client_id: id,
      });
    }
  }

  // Upsert addresses if provided
  if (updates.addresses && updates.addresses.length > 0) {
    for (const addr of updates.addresses) {
      await upsertClientAddressInDb({
        ...addr,
        client_id: id,
      });
    }
  }
}

export async function upsertClientAddressInDb(address: ClientAddress): Promise<ClientAddress> {
  const supabase = createClient();
  const addressId = ensureUuid(address.id);
  const clientId = ensureUuid(address.client_id);

  const payload = {
    id: addressId,
    client_id: clientId,
    address_type: address.address_type || "Registered",
    street_address: address.street_address,
    city: address.city,
    state: address.state,
    pin_code: address.pin_code,
    country: address.country || "India",
    is_primary: address.is_primary ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("client_addresses")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Supabase upsert client_addresses error:", error);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    client_id: data.client_id,
    address_type: data.address_type,
    street_address: data.street_address,
    city: data.city,
    state: data.state,
    pin_code: data.pin_code,
    country: data.country,
    is_primary: Boolean(data.is_primary),
  };
}

export async function deleteClientFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) {
    console.error("Supabase delete client error:", error);
    throw new Error(error.message);
  }
}

export async function upsertClientContactInDb(contact: ClientContact): Promise<ClientContact> {
  const supabase = createClient();
  const contactId = ensureUuid(contact.id);
  const clientId = ensureUuid(contact.client_id);

  const payload = {
    id: contactId,
    client_id: clientId,
    contact_person: contact.contact_person,
    designation: contact.designation || null,
    mobile_number: contact.mobile_number,
    email: contact.email,
    is_primary: contact.is_primary ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("client_contacts")
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Supabase upsert client_contacts error:", error);
    throw new Error(error.message);
  }

  return {
    id: data.id,
    client_id: data.client_id,
    contact_person: data.contact_person,
    designation: data.designation || undefined,
    mobile_number: data.mobile_number,
    email: data.email,
    is_primary: Boolean(data.is_primary),
  };
}

export async function deleteClientContactFromDb(contactId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("client_contacts").delete().eq("id", contactId);
  if (error) {
    console.error("Supabase delete client_contacts error:", error);
    throw new Error(error.message);
  }
}

// ----------------------------------------------------------------------------
// SERVICES & ENGAGEMENTS
// ----------------------------------------------------------------------------

export async function fetchServicesFromDb(): Promise<Service[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("services").select("*").order("service_code");
  if (error) {
    console.error("Supabase fetch services error:", error);
    throw new Error(error.message);
  }
  return (data || []).map((row: any): Service => ({
    id: row.id,
    service_code: row.service_code,
    service_name: row.service_name,
    description: row.description || "",
    default_fee: Number(row.default_fee) || 0,
    default_gst_rate: Number(row.default_gst_rate) || 18,
    billing_type: row.billing_type,
    status: row.status,
    created_at: row.created_at,
  }));
}

export async function insertServiceToDb(service: Service): Promise<Service> {
  const supabase = createClient();
  const id = ensureUuid(service.id);
  const { error } = await supabase.from("services").insert({
    id,
    service_code: service.service_code,
    service_name: service.service_name,
    description: service.description || null,
    default_fee: service.default_fee || 0,
    default_gst_rate: service.default_gst_rate || 18,
    billing_type: service.billing_type || "Recurring",
    status: service.status || "Active",
    created_at: service.created_at || new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ...service, id };
}

export async function updateServiceInDb(id: string, updates: Partial<Service>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("services").update({
    ...(updates.service_name !== undefined ? { service_name: updates.service_name } : {}),
    ...(updates.service_code !== undefined ? { service_code: updates.service_code } : {}),
    ...(updates.description !== undefined ? { description: updates.description || null } : {}),
    ...(updates.default_fee !== undefined ? { default_fee: updates.default_fee } : {}),
    ...(updates.default_gst_rate !== undefined ? { default_gst_rate: updates.default_gst_rate } : {}),
    ...(updates.billing_type !== undefined ? { billing_type: updates.billing_type } : {}),
    ...(updates.status !== undefined ? { status: updates.status } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteServiceFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchEngagementsFromDb(): Promise<ServiceEngagement[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("service_engagements").select("*, clients(client_name), services(service_name, service_code)");
  if (error) {
    console.error("Supabase fetch service_engagements error:", error);
    throw new Error(error.message);
  }
  return (data || []).map((row: any): ServiceEngagement => ({
    id: row.id,
    client_id: row.client_id,
    client_name: row.clients?.client_name || "Client",
    service_id: row.service_id,
    service_name: row.services?.service_name || "Service",
    service_code: row.services?.service_code || "",
    agreed_fee: Number(row.agreed_fee) || 0,
    gst_rate: Number(row.gst_rate) || 18,
    billing_frequency: row.billing_frequency,
    payment_terms: row.payment_terms || "Immediate",
    relationship_manager_id: row.relationship_manager_id || undefined,
    start_date: row.start_date,
    end_date: row.end_date || undefined,
    status: row.status,
    remarks: row.remarks || undefined,
    created_at: row.created_at,
  }));
}

export async function insertEngagementToDb(eng: ServiceEngagement): Promise<ServiceEngagement> {
  const supabase = createClient();
  const id = ensureUuid(eng.id);
  const { error } = await supabase.from("service_engagements").insert({
    id,
    client_id: ensureUuid(eng.client_id),
    service_id: ensureUuid(eng.service_id),
    agreed_fee: eng.agreed_fee,
    gst_rate: eng.gst_rate || 18,
    billing_frequency: eng.billing_frequency,
    payment_terms: eng.payment_terms || "Immediate",
    relationship_manager_id: isUuid(eng.relationship_manager_id) ? eng.relationship_manager_id : null,
    start_date: eng.start_date || new Date().toISOString().slice(0, 10),
    end_date: eng.end_date || null,
    status: eng.status || "Active",
    remarks: eng.remarks || null,
  });
  if (error) throw new Error(error.message);
  return { ...eng, id };
}

export async function deleteEngagementFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("service_engagements").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// PROJECTS
// ----------------------------------------------------------------------------

export async function fetchProjectsFromDb(): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(client_name), employees!projects_project_manager_id_fkey(full_name), service_engagements(services(service_name))")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch projects error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any): Project => ({
    id: row.id,
    project_code: row.project_code,
    project_name: row.project_name,
    project_type: row.project_type,
    client_id: row.client_id || undefined,
    client_name: row.clients?.client_name || undefined,
    service_engagement_id: row.service_engagement_id || undefined,
    service_name: row.service_engagements?.services?.service_name || undefined,
    description: row.description || "",
    project_manager_id: row.project_manager_id || undefined,
    project_manager_name: row.employees?.full_name || undefined,
    priority: row.priority,
    start_date: row.start_date,
    due_date: row.due_date,
    status: row.status,
    progress_percentage: Number(row.progress_percentage) || 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    assigned_employees: [],
  }));
}

export async function insertProjectToDb(project: Project): Promise<Project> {
  const supabase = createClient();
  const id = ensureUuid(project.id);
  const { error } = await supabase.from("projects").insert({
    id,
    project_code: project.project_code,
    project_name: project.project_name,
    project_type: project.project_type || "Client Project",
    client_id: isUuid(project.client_id) ? project.client_id : null,
    service_engagement_id: isUuid(project.service_engagement_id) ? project.service_engagement_id : null,
    description: project.description || null,
    project_manager_id: isUuid(project.project_manager_id) ? project.project_manager_id : null,
    priority: project.priority || "Medium",
    start_date: project.start_date || new Date().toISOString().slice(0, 10),
    due_date: project.due_date,
    status: project.status || "In Progress",
    progress_percentage: project.progress_percentage || 0,
    created_at: project.created_at || new Date().toISOString(),
    updated_at: project.updated_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert project error:", error);
    throw new Error(error.message);
  }

  return { ...project, id };
}

export async function updateProjectInDb(id: string, updates: Partial<Project>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.project_name !== undefined) dbUpdates.project_name = updates.project_name;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
  if (updates.progress_percentage !== undefined) dbUpdates.progress_percentage = updates.progress_percentage;
  if (updates.project_manager_id !== undefined) {
    dbUpdates.project_manager_id = isUuid(updates.project_manager_id) ? updates.project_manager_id : null;
  }
  if (updates.client_id !== undefined) {
    dbUpdates.client_id = isUuid(updates.client_id) ? updates.client_id : null;
  }

  const { error } = await supabase.from("projects").update(dbUpdates).eq("id", id);
  if (error) {
    console.error("Supabase update project error:", error);
    throw new Error(error.message);
  }
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// TASKS & SUBTASKS
// ----------------------------------------------------------------------------

export async function fetchTasksFromDb(): Promise<Task[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(project_name, client_id, clients(client_name)), employees(full_name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase fetch tasks error:", error);
    throw new Error(error.message);
  }

  const rawTasks = (data || []).map((row: any) => ({
    id: row.id,
    task_code: row.task_code,
    project_id: row.project_id,
    project_name: row.projects?.project_name || "Project",
    client_id: (row.projects as any)?.client_id || undefined,
    client_name: (row.projects as any)?.clients?.client_name || undefined,
    parent_task_id: row.parent_task_id || undefined,
    title: row.title,
    description: row.description || "",
    assigned_employee_id: row.assigned_employee_id || undefined,
    assigned_employee_name: row.employees?.full_name || undefined,
    priority: row.priority,
    start_date: row.start_date,
    due_date: row.due_date,
    status: row.status,
    completed_at: row.completed_at || undefined,
    category_id: row.category_id || undefined,
    sub_category_id: row.sub_category_id || undefined,
    whatsapp_enabled: Boolean(row.whatsapp_enabled ?? true),
    created_at: row.created_at,
    updated_at: row.updated_at,
    comments_count: 0,
    subtasks: [] as Task[],
  }));

  // Build parent-subtask tree
  const subtasksByParent = new Map<string, Task[]>();
  rawTasks.forEach((t) => {
    if (t.parent_task_id) {
      const list = subtasksByParent.get(t.parent_task_id) || [];
      list.push(t as Task);
      subtasksByParent.set(t.parent_task_id, list);
    }
  });

  return rawTasks
    .filter((t) => !t.parent_task_id)
    .map((t) => ({
      ...t,
      subtasks: subtasksByParent.get(t.id) || [],
    })) as Task[];
}

export async function insertTaskToDb(task: Task): Promise<Task> {
  const supabase = createClient();
  const id = ensureUuid(task.id);
  const { error } = await supabase.from("tasks").insert({
    id,
    task_code: task.task_code,
    project_id: ensureUuid(task.project_id),
    parent_task_id: task.parent_task_id && isUuid(task.parent_task_id) ? task.parent_task_id : null,
    title: task.title,
    description: task.description || null,
    assigned_employee_id: isUuid(task.assigned_employee_id) ? task.assigned_employee_id : null,
    priority: task.priority || "Medium",
    start_date: task.start_date || new Date().toISOString().slice(0, 10),
    due_date: task.due_date,
    status: task.status || "To Do",
    category_id: task.category_id || null,
    sub_category_id: task.sub_category_id || null,
    whatsapp_enabled: task.whatsapp_enabled ?? true,
    created_at: task.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert task error:", error);
    throw new Error(error.message);
  }

  return { ...task, id };
}

export async function updateTaskInDb(id: string, updates: Partial<Task>): Promise<void> {
  const supabase = createClient();
  let targetId = id;

  if (!isUuid(targetId)) {
    // If id is not a valid UUID, attempt to resolve via task_code (e.g. "TSK-003")
    const { data: found } = await supabase.from("tasks").select("id").eq("task_code", id.toUpperCase()).maybeSingle();
    if (found?.id) {
      targetId = found.id;
    } else {
      console.warn("Task id is not a valid UUID and no task_code match found, skipping Supabase direct update:", id);
      return;
    }
  }

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.title !== undefined) dbUpdates.title = updates.title;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.status !== undefined) {
    dbUpdates.status = updates.status;
    if (updates.status === "Completed") dbUpdates.completed_at = new Date().toISOString();
    else dbUpdates.completed_at = null;
  }
  if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
  if (updates.due_date !== undefined) dbUpdates.due_date = updates.due_date;
  if (updates.start_date !== undefined) dbUpdates.start_date = updates.start_date;
  if (updates.category_id !== undefined) dbUpdates.category_id = updates.category_id || null;
  if (updates.sub_category_id !== undefined) dbUpdates.sub_category_id = updates.sub_category_id || null;
  if (updates.whatsapp_enabled !== undefined) dbUpdates.whatsapp_enabled = updates.whatsapp_enabled;
  if (updates.assigned_employee_id !== undefined) {
    dbUpdates.assigned_employee_id = isUuid(updates.assigned_employee_id) ? updates.assigned_employee_id : null;
  }
  if (updates.project_id !== undefined && isUuid(updates.project_id)) {
    dbUpdates.project_id = updates.project_id;
  }

  const { error } = await supabase.from("tasks").update(dbUpdates).eq("id", targetId);
  if (error) {
    console.error("Supabase update task error:", error);
    throw new Error(error.message);
  }
}

export async function deleteTaskFromDb(id: string): Promise<void> {
  const supabase = createClient();
  let targetId = id;

  if (!isUuid(targetId)) {
    const { data: found } = await supabase.from("tasks").select("id").eq("task_code", id.toUpperCase()).maybeSingle();
    if (found?.id) {
      targetId = found.id;
    } else {
      console.warn("Task id is not a valid UUID and no task_code match found, skipping Supabase direct delete:", id);
      return;
    }
  }

  const { error } = await supabase.from("tasks").delete().eq("id", targetId);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// WORKFLOWS
// ----------------------------------------------------------------------------

export async function fetchWorkflowsFromDb(): Promise<WorkflowTemplate[]> {
  const supabase = createClient();
  const [wfsRes, msRes, stgRes, tasksRes] = await Promise.all([
    supabase.from("workflow_templates").select("*, services(service_name)"),
    supabase.from("workflow_milestones").select("*").order("sequence_number"),
    supabase.from("workflow_stages").select("*").order("sequence_number"),
    supabase.from("workflow_tasks").select("*").order("sequence_number"),
  ]);

  if (wfsRes.error) {
    console.error("Supabase fetch workflows error:", wfsRes.error);
    throw new Error(wfsRes.error.message);
  }

  const tasksByStage = new Map<string, WorkflowProjectTaskTemplate[]>();
  (tasksRes.data || []).forEach((t: any) => {
    const list = tasksByStage.get(t.stage_id) || [];
    list.push({
      id: t.id,
      task_name: t.task_name,
      description: t.description || "",
      sequence_number: t.sequence_number,
      start_day_offset: 0,
      duration_days: t.default_days || 2,
      priority: t.priority,
      status: "To Do",
      subtasks: [],
      default_comments: [],
    });
    tasksByStage.set(t.stage_id, list);
  });

  const stagesByMilestone = new Map<string, WorkflowStageTemplate[]>();
  (stgRes.data || []).forEach((s: any) => {
    const list = stagesByMilestone.get(s.milestone_id) || [];
    const stageTasks = tasksByStage.get(s.id) || [];
    list.push({
      id: s.id,
      stage_name: s.stage_name,
      sequence_number: s.sequence_number,
      sub_stages: [
        {
          id: `substg-${s.id}`,
          sub_stage_name: "Deliverables",
          sequence_number: 1,
          tasks: stageTasks,
        },
      ],
    });
    stagesByMilestone.set(s.milestone_id, list);
  });

  const milestonesByWf = new Map<string, WorkflowMilestoneTemplate[]>();
  (msRes.data || []).forEach((m: any) => {
    const list = milestonesByWf.get(m.workflow_template_id) || [];
    list.push({
      id: m.id,
      title: m.title,
      sequence_number: m.sequence_number,
      start_date: m.start_date || undefined,
      end_date: m.end_date || undefined,
      stages: stagesByMilestone.get(m.id) || [],
    });
    milestonesByWf.set(m.workflow_template_id, list);
  });

  return (wfsRes.data || []).map((row: any): WorkflowTemplate => {
    const milestones = milestonesByWf.get(row.id) || [];
    const templateTasks = milestones.flatMap((m) =>
      (m.stages || []).flatMap((s) => (s.sub_stages || []).flatMap((sub) => sub.tasks || []))
    );

    return {
      id: row.id,
      workflow_code: row.workflow_code,
      workflow_name: row.workflow_name,
      service_id: row.service_id || undefined,
      service_name: row.services?.service_name || undefined,
      description: row.description || "",
      is_active: Boolean(row.is_active),
      version: 1,
      stages_count: templateTasks.length,
      template_tasks: templateTasks,
      milestones: milestones.length > 0 ? milestones : undefined,
      whatsapp_enabled: Boolean(row.whatsapp_enabled ?? true),
      created_at: row.created_at,
    };
  });
}

export async function insertWorkflowToDb(wf: WorkflowTemplate): Promise<WorkflowTemplate> {
  const supabase = createClient();
  const id = ensureUuid(wf.id);

  const { error } = await supabase.from("workflow_templates").insert({
    id,
    workflow_code: wf.workflow_code,
    workflow_name: wf.workflow_name,
    service_id: isUuid(wf.service_id) ? wf.service_id : null,
    description: wf.description || null,
    is_active: wf.is_active ?? true,
    whatsapp_enabled: wf.whatsapp_enabled ?? true,
    created_at: wf.created_at || new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { ...wf, id };
}

export async function updateWorkflowInDb(id: string, updates: Partial<WorkflowTemplate>): Promise<void> {
  const supabase = createClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.workflow_name !== undefined) dbUpdates.workflow_name = updates.workflow_name;
  if (updates.workflow_code !== undefined) dbUpdates.workflow_code = updates.workflow_code;
  if (updates.description !== undefined) dbUpdates.description = updates.description || null;
  if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
  if (updates.whatsapp_enabled !== undefined) dbUpdates.whatsapp_enabled = updates.whatsapp_enabled;

  const { error } = await supabase.from("workflow_templates").update(dbUpdates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteWorkflowFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("workflow_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// INVOICES & PAYMENTS
// ----------------------------------------------------------------------------

export async function fetchInvoicesFromDb(): Promise<Invoice[]> {
  const supabase = createClient();
  const [invRes, itemsRes] = await Promise.all([
    supabase.from("invoices").select("*, clients(client_name)").order("created_at", { ascending: false }),
    supabase.from("invoice_items").select("*"),
  ]);

  if (invRes.error) {
    console.error("Supabase fetch invoices error:", invRes.error);
    throw new Error(invRes.error.message);
  }

  const itemsByInvoice = new Map<string, InvoiceItem[]>();
  (itemsRes.data || []).forEach((item: any) => {
    const list = itemsByInvoice.get(item.invoice_id) || [];
    list.push({
      id: item.id,
      invoice_id: item.invoice_id,
      description: item.description,
      sac_code: item.sac_code || "",
      quantity: Number(item.quantity) || 1,
      rate: Number(item.rate) || 0,
      discount_amount: Number(item.discount_amount) || 0,
      taxable_amount: Number(item.taxable_amount) || 0,
      gst_rate: Number(item.gst_rate) || 18,
      cgst_amount: Number(item.cgst_amount) || 0,
      sgst_amount: Number(item.sgst_amount) || 0,
      igst_amount: Number(item.igst_amount) || 0,
      total_amount: Number(item.total_amount) || 0,
    });
    itemsByInvoice.set(item.invoice_id, list);
  });

  return (invRes.data || []).map((row: any): Invoice => ({
    id: row.id,
    invoice_number: row.invoice_number,
    financial_year: row.financial_year,
    client_id: row.client_id,
    client_name: row.clients?.client_name || row.client_legal_name,
    service_engagement_id: row.service_engagement_id || undefined,
    invoice_date: row.invoice_date,
    due_date: row.due_date,
    place_of_supply: row.place_of_supply,
    is_interstate: Boolean(row.is_interstate),
    reverse_charge: Boolean(row.reverse_charge),
    client_legal_name: row.client_legal_name,
    client_address: row.client_address,
    client_pan: row.client_pan || "",
    client_gstin: row.client_gstin || undefined,
    client_state: row.client_state || "",
    client_contact: row.client_contact || "",
    items: itemsByInvoice.get(row.id) || [],
    subtotal: Number(row.subtotal) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    taxable_amount: Number(row.taxable_amount) || 0,
    cgst_amount: Number(row.cgst_amount) || 0,
    sgst_amount: Number(row.sgst_amount) || 0,
    igst_amount: Number(row.igst_amount) || 0,
    total_gst: Number(row.total_gst) || 0,
    grand_total: Number(row.grand_total) || 0,
    paid_amount: Number(row.paid_amount) || 0,
    outstanding_balance: Number(row.outstanding_balance) || 0,
    status: row.status,
    notes: row.notes || undefined,
    terms_conditions: row.terms_conditions || undefined,
    created_at: row.created_at,
  }));
}

export async function insertInvoiceToDb(invoice: Invoice): Promise<Invoice> {
  const supabase = createClient();
  const id = ensureUuid(invoice.id);

  const { error } = await supabase.from("invoices").insert({
    id,
    invoice_number: invoice.invoice_number,
    financial_year: invoice.financial_year || "2026-27",
    client_id: ensureUuid(invoice.client_id),
    service_engagement_id: isUuid(invoice.service_engagement_id) ? invoice.service_engagement_id : null,
    invoice_date: invoice.invoice_date || new Date().toISOString().slice(0, 10),
    due_date: invoice.due_date,
    place_of_supply: invoice.place_of_supply || "Tamil Nadu",
    is_interstate: Boolean(invoice.is_interstate),
    reverse_charge: Boolean(invoice.reverse_charge),
    client_legal_name: invoice.client_legal_name || invoice.client_name,
    client_address: invoice.client_address || "",
    client_pan: invoice.client_pan || null,
    client_gstin: invoice.client_gstin || null,
    client_state: invoice.client_state || null,
    client_contact: invoice.client_contact || null,
    subtotal: invoice.subtotal || 0,
    discount_amount: invoice.discount_amount || 0,
    taxable_amount: invoice.taxable_amount || 0,
    cgst_amount: invoice.cgst_amount || 0,
    sgst_amount: invoice.sgst_amount || 0,
    igst_amount: invoice.igst_amount || 0,
    total_gst: invoice.total_gst || 0,
    grand_total: invoice.grand_total || 0,
    paid_amount: invoice.paid_amount || 0,
    outstanding_balance: invoice.outstanding_balance || invoice.grand_total || 0,
    status: invoice.status || "Draft",
    notes: invoice.notes || null,
    terms_conditions: invoice.terms_conditions || null,
    created_at: invoice.created_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert invoice error:", error);
    throw new Error(error.message);
  }

  // Insert items
  if (invoice.items && invoice.items.length > 0) {
    const itemRows = invoice.items.map((item) => ({
      id: ensureUuid(item.id),
      invoice_id: id,
      description: item.description,
      sac_code: item.sac_code || null,
      quantity: item.quantity || 1,
      rate: item.rate || 0,
      discount_amount: item.discount_amount || 0,
      taxable_amount: item.taxable_amount || 0,
      gst_rate: item.gst_rate || 18,
      cgst_amount: item.cgst_amount || 0,
      sgst_amount: item.sgst_amount || 0,
      igst_amount: item.igst_amount || 0,
      total_amount: item.total_amount || 0,
    }));
    const { error: itErr } = await supabase.from("invoice_items").insert(itemRows);
    if (itErr) console.warn("Supabase insert invoice_items error:", itErr);
  }

  return { ...invoice, id };
}

export async function deleteInvoiceFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchPaymentsFromDb(): Promise<Payment[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*, clients(client_name), invoices(invoice_number)")
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Supabase fetch payments error:", error);
    throw new Error(error.message);
  }

  return (data || []).map((row: any): Payment => ({
    id: row.id,
    payment_number: row.payment_number,
    client_id: row.client_id,
    client_name: row.clients?.client_name || "Client",
    invoice_id: row.invoice_id || undefined,
    invoice_number: row.invoices?.invoice_number || undefined,
    payment_date: row.payment_date,
    amount: Number(row.amount) || 0,
    payment_mode: row.payment_mode,
    transaction_reference: row.transaction_reference || undefined,
    remarks: row.remarks || undefined,
    status: row.status,
    created_at: row.created_at,
  }));
}

export async function insertPaymentToDb(payment: Payment): Promise<Payment> {
  const supabase = createClient();
  const id = ensureUuid(payment.id);

  const { error } = await supabase.from("payments").insert({
    id,
    payment_number: payment.payment_number,
    client_id: ensureUuid(payment.client_id),
    invoice_id: isUuid(payment.invoice_id) ? payment.invoice_id : null,
    payment_date: payment.payment_date || new Date().toISOString().slice(0, 10),
    amount: payment.amount,
    payment_mode: payment.payment_mode || "Bank Transfer",
    transaction_reference: payment.transaction_reference || null,
    remarks: payment.remarks || null,
    status: payment.status || "Completed",
    created_at: payment.created_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert payment error:", error);
    throw new Error(error.message);
  }

  return { ...payment, id };
}

// ----------------------------------------------------------------------------
// TASK CATEGORIES & SUB-GROUPS
// ----------------------------------------------------------------------------

export async function fetchTaskCategoriesFromDb(): Promise<TaskCategory[]> {
  const supabase = createClient();
  const [catRes, subRes] = await Promise.all([
    supabase.from("task_categories").select("*").order("name"),
    supabase.from("task_sub_categories").select("*").order("name"),
  ]);

  if (catRes.error) {
    console.error("Supabase fetch task_categories error:", catRes.error);
    throw new Error(catRes.error.message);
  }

  const subsByCategory = new Map<string, TaskSubCategory[]>();
  (subRes.data || []).forEach((s: any) => {
    const list = subsByCategory.get(s.category_id) || [];
    list.push({
      id: s.id,
      category_id: s.category_id,
      name: s.name,
      code: s.code || undefined,
      description: s.description || undefined,
      whatsapp_enabled: Boolean(s.whatsapp_enabled ?? true),
      created_at: s.created_at,
    });
    subsByCategory.set(s.category_id, list);
  });

  return (catRes.data || []).map((c: any): TaskCategory => ({
    id: c.id,
    name: c.name,
    code: c.code || undefined,
    description: c.description || undefined,
    color: c.color || "violet",
    icon: c.icon || undefined,
    whatsapp_enabled: Boolean(c.whatsapp_enabled ?? true),
    created_at: c.created_at,
    sub_categories: subsByCategory.get(c.id) || [],
  }));
}

export async function insertTaskCategoryToDb(cat: TaskCategory): Promise<TaskCategory> {
  const supabase = createClient();
  const id = cat.id || `cat-${Date.now()}`;
  const { error } = await supabase.from("task_categories").insert({
    id,
    name: cat.name,
    code: cat.code || null,
    description: cat.description || null,
    color: cat.color || "violet",
    icon: cat.icon || null,
    whatsapp_enabled: cat.whatsapp_enabled ?? true,
    created_at: cat.created_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert task_categories error:", error);
    throw new Error(error.message);
  }

  return { ...cat, id, sub_categories: cat.sub_categories || [] };
}

export async function updateTaskCategoryInDb(id: string, updates: Partial<TaskCategory>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("task_categories").update({
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.code !== undefined ? { code: updates.code || null } : {}),
    ...(updates.description !== undefined ? { description: updates.description || null } : {}),
    ...(updates.color !== undefined ? { color: updates.color } : {}),
    ...(updates.whatsapp_enabled !== undefined ? { whatsapp_enabled: updates.whatsapp_enabled } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTaskCategoryFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("task_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertTaskSubCategoryToDb(sub: TaskSubCategory): Promise<TaskSubCategory> {
  const supabase = createClient();
  const id = sub.id || `subcat-${Date.now()}`;
  const { error } = await supabase.from("task_sub_categories").insert({
    id,
    category_id: sub.category_id,
    name: sub.name,
    code: sub.code || null,
    description: sub.description || null,
    whatsapp_enabled: sub.whatsapp_enabled ?? true,
    created_at: sub.created_at || new Date().toISOString(),
  });

  if (error) {
    console.error("Supabase insert task_sub_categories error:", error);
    throw new Error(error.message);
  }

  return { ...sub, id };
}

export async function updateTaskSubCategoryInDb(id: string, updates: Partial<TaskSubCategory>): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("task_sub_categories").update({
    ...(updates.name !== undefined ? { name: updates.name } : {}),
    ...(updates.code !== undefined ? { code: updates.code || null } : {}),
    ...(updates.description !== undefined ? { description: updates.description || null } : {}),
    ...(updates.whatsapp_enabled !== undefined ? { whatsapp_enabled: updates.whatsapp_enabled } : {}),
  }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteTaskSubCategoryFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("task_sub_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// WHATSAPP TEMPLATES & UNIVERSAL RECYCLE BIN
// ----------------------------------------------------------------------------

export async function fetchWhatsAppTemplatesFromDb(): Promise<WhatsAppTemplate[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("whatsapp_templates").select("*").order("title");
  if (error) {
    console.error("Supabase fetch whatsapp_templates error:", error);
    throw new Error(error.message);
  }
  return (data || []).map((t: any): WhatsAppTemplate => ({
    id: t.id,
    title: t.title,
    category: t.category,
    content: t.content,
    created_at: t.created_at,
  }));
}

export async function upsertWhatsAppTemplateInDb(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
  const supabase = createClient();
  const id = template.id || `wtpl-${Date.now()}`;
  const { error } = await supabase.from("whatsapp_templates").upsert({
    id,
    title: template.title,
    category: template.category || "General",
    content: template.content,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ...template, id };
}

export async function deleteWhatsAppTemplateFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("whatsapp_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchRecycleBinFromDb(): Promise<UniversalRecycleBinItem[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("universal_recycle_bin").select("*").order("deleted_at", { ascending: false });
  if (error) {
    console.error("Supabase fetch universal_recycle_bin error:", error);
    return [];
  }
  return (data || []).map((row: any): UniversalRecycleBinItem => ({
    id: row.id,
    item_id: row.item_id,
    item_type: row.item_type,
    title: row.title,
    code: row.code || undefined,
    subtitle: row.subtitle || undefined,
    category_name: row.category_name || undefined,
    raw_data: row.raw_data || {},
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by || undefined,
    deleted_by_name: row.deleted_by_name || undefined,
    recovery_deadline: row.recovery_deadline,
  }));
}

export async function insertRecycleBinItemToDb(item: UniversalRecycleBinItem): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("universal_recycle_bin").insert({
    id: item.id,
    item_id: item.item_id,
    item_type: item.item_type,
    title: item.title,
    code: item.code || null,
    subtitle: item.subtitle || null,
    category_name: item.category_name || null,
    raw_data: item.raw_data || {},
    deleted_at: item.deleted_at || new Date().toISOString(),
    deleted_by: item.deleted_by || null,
    deleted_by_name: item.deleted_by_name || null,
    recovery_deadline: item.recovery_deadline,
  });
  if (error) console.warn("Supabase insert universal_recycle_bin error:", error);
}

export async function deleteRecycleBinItemFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("universal_recycle_bin").delete().eq("id", id);
  if (error) console.warn("Supabase delete universal_recycle_bin error:", error);
}

// ----------------------------------------------------------------------------
// EMPLOYEES & DOCUMENTS
// ----------------------------------------------------------------------------

export async function fetchEmployeesFromDb(): Promise<Employee[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("employees").select("*, designations(title)");
  if (error) {
    console.error("Supabase fetch employees error:", error);
    throw new Error(error.message);
  }
  return (data || []).map((row: any): Employee => ({
    id: row.id,
    employee_code: row.employee_code,
    first_name: row.first_name,
    last_name: row.last_name,
    full_name: row.full_name,
    email: row.email,
    mobile_number: row.mobile_number,
    designation_id: row.designation_id || undefined,
    designation_name: row.designations?.title || undefined,
    team_id: row.team_id || undefined,
    team_name: row.team_name || undefined,
    joining_date: row.joining_date,
    employment_status: row.employment_status,
    is_active: Boolean(row.is_active),
    role_code: "EMPLOYEE",
    created_at: row.created_at,
  }));
}

export async function fetchDocumentsFromDb(): Promise<FileObject[]> {
  const supabase = createClient();
  const { data, error } = await supabase.from("file_objects").select("*").order("created_at", { ascending: false });
  if (error) {
    console.error("Supabase fetch file_objects error:", error);
    throw new Error(error.message);
  }
  return (data || []).map((row: any): FileObject => ({
    id: row.id,
    bucket_name: row.bucket_name,
    r2_object_key: row.r2_object_key,
    file_name: row.file_name,
    file_size: Number(row.file_size) || 0,
    mime_type: row.mime_type,
    category: row.category,
    entity_type: row.entity_type || undefined,
    entity_id: row.entity_id || undefined,
    uploaded_by: row.uploaded_by || undefined,
    version_number: row.version_number || 1,
    created_at: row.created_at,
  }));
}

export async function insertDocumentToDb(doc: FileObject): Promise<FileObject> {
  const supabase = createClient();
  const id = ensureUuid(doc.id);
  const { error } = await supabase.from("file_objects").insert({
    id,
    bucket_name: doc.bucket_name || "pms-vault",
    r2_object_key: doc.r2_object_key,
    file_name: doc.file_name,
    file_size: doc.file_size,
    mime_type: doc.mime_type,
    category: doc.category || "Other",
    entity_type: doc.entity_type || null,
    entity_id: isUuid(doc.entity_id) ? doc.entity_id : null,
    created_at: doc.created_at || new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  return { ...doc, id };
}

export async function deleteDocumentFromDb(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("file_objects").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ----------------------------------------------------------------------------
// CREDENTIAL VAULT (PASSWORDS & SECURE PORTALS)
// ----------------------------------------------------------------------------

export async function fetchVaultCredentialsFromDb(): Promise<VaultCredential[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vault_credentials")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("Supabase fetch vault_credentials error (fallback to local snapshot):", error);
    return [];
  }
  return (data || []).map((row: any): VaultCredential => ({
    id: row.id,
    portal_name: row.portal_name,
    login_url: row.login_url || "",
    username: row.username,
    password_encrypted: row.password_encrypted,
    registered_email: row.registered_email || undefined,
    registered_mobile: row.registered_mobile || undefined,
    account_holder_name: row.account_holder_name || undefined,
    category: row.category || "Taxation",
    client_id: row.client_id || undefined,
    client_name: row.client_name || undefined,
    assigned_employee_ids: row.assigned_employee_ids || [],
    assigned_employee_names: row.assigned_employee_names || undefined,
    notes: row.notes || undefined,
    password_history: row.password_history || [],
    last_password_changed_at: row.last_password_changed_at || row.created_at,
    rotation_reminder_days: row.rotation_reminder_days || 90,
    created_at: row.created_at,
    updated_at: row.updated_at || row.created_at,
    created_by_id: row.created_by_id || undefined,
    created_by_name: row.created_by_name || undefined,
  }));
}

export async function insertVaultCredentialToDb(cred: VaultCredential): Promise<VaultCredential> {
  const supabase = createClient();
  const id = ensureUuid(cred.id);
  const now = new Date().toISOString();
  const { error } = await supabase.from("vault_credentials").insert({
    id,
    portal_name: cred.portal_name,
    login_url: cred.login_url || null,
    username: cred.username,
    password_encrypted: cred.password_encrypted,
    registered_email: cred.registered_email || null,
    registered_mobile: cred.registered_mobile || null,
    account_holder_name: cred.account_holder_name || null,
    category: cred.category || "Taxation",
    client_id: isUuid(cred.client_id) ? cred.client_id : null,
    client_name: cred.client_name || null,
    assigned_employee_ids: cred.assigned_employee_ids || [],
    assigned_employee_names: cred.assigned_employee_names || null,
    notes: cred.notes || null,
    password_history: cred.password_history || [],
    last_password_changed_at: cred.last_password_changed_at || now,
    rotation_reminder_days: cred.rotation_reminder_days || 90,
    created_at: cred.created_at || now,
    updated_at: cred.updated_at || now,
    created_by_id: isUuid(cred.created_by_id) ? cred.created_by_id : null,
    created_by_name: cred.created_by_name || null,
  });
  if (error) {
    console.warn("Supabase insert vault_credentials warning:", error.message || error);
  }
  return { ...cred, id };
}

export async function updateVaultCredentialInDb(id: string, updates: Partial<VaultCredential>): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (updates.portal_name !== undefined) dbUpdates.portal_name = updates.portal_name;
  if (updates.login_url !== undefined) dbUpdates.login_url = updates.login_url || null;
  if (updates.username !== undefined) dbUpdates.username = updates.username;
  if (updates.password_encrypted !== undefined) dbUpdates.password_encrypted = updates.password_encrypted;
  if (updates.registered_email !== undefined) dbUpdates.registered_email = updates.registered_email || null;
  if (updates.registered_mobile !== undefined) dbUpdates.registered_mobile = updates.registered_mobile || null;
  if (updates.account_holder_name !== undefined) dbUpdates.account_holder_name = updates.account_holder_name || null;
  if (updates.category !== undefined) dbUpdates.category = updates.category;
  if (updates.client_id !== undefined) dbUpdates.client_id = isUuid(updates.client_id) ? updates.client_id : null;
  if (updates.client_name !== undefined) dbUpdates.client_name = updates.client_name || null;
  if (updates.assigned_employee_ids !== undefined) dbUpdates.assigned_employee_ids = updates.assigned_employee_ids;
  if (updates.assigned_employee_names !== undefined) dbUpdates.assigned_employee_names = updates.assigned_employee_names || null;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes || null;
  if (updates.password_history !== undefined) dbUpdates.password_history = updates.password_history;
  if (updates.last_password_changed_at !== undefined) dbUpdates.last_password_changed_at = updates.last_password_changed_at;
  if (updates.rotation_reminder_days !== undefined) dbUpdates.rotation_reminder_days = updates.rotation_reminder_days;

  const { error } = await supabase.from("vault_credentials").update(dbUpdates).eq("id", id);
  if (error) {
    console.warn("Supabase update vault_credentials warning:", error.message || error);
  }
}

export async function deleteVaultCredentialFromDb(id: string): Promise<void> {
  if (!isUuid(id)) return;
  const supabase = createClient();
  const { error } = await supabase.from("vault_credentials").delete().eq("id", id);
  if (error) {
    console.warn("Supabase delete vault_credentials warning:", error.message || error);
  }
}

export async function fetchVaultAuditLogsFromDb(): Promise<VaultAuditLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("vault_audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(500);
  if (error) {
    console.warn("Supabase fetch vault_audit_logs error (fallback to local snapshot):", error);
    return [];
  }
  return (data || []).map((row: any): VaultAuditLog => ({
    id: row.id,
    credential_id: row.credential_id,
    portal_name: row.portal_name,
    action: row.action,
    performed_by_id: row.performed_by_id,
    performed_by_name: row.performed_by_name,
    timestamp: row.timestamp,
    details: row.details || undefined,
    client_name: row.client_name || undefined,
  }));
}

export async function insertVaultAuditLogToDb(log: VaultAuditLog): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("vault_audit_logs").insert({
    id: ensureUuid(log.id),
    credential_id: isUuid(log.credential_id) ? log.credential_id : ensureUuid(),
    portal_name: log.portal_name,
    action: log.action,
    performed_by_id: isUuid(log.performed_by_id) ? log.performed_by_id : ensureUuid(),
    performed_by_name: log.performed_by_name,
    timestamp: log.timestamp || new Date().toISOString(),
    details: log.details || null,
    client_name: log.client_name || null,
  });
  if (error) {
    console.warn("Supabase insert vault_audit_logs warning:", error.message || error);
  }
}
