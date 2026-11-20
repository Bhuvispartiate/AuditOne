// ============================================================================
// CLIENT DATA API ADAPTER
// Routes all database persistence calls to the server-side Python Data API (/api)
// Eliminates direct Supabase PostgREST queries in the browser for maximum security
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

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token: string | undefined;
  try {
    const supabase = createClient();
    const sessionRes = await supabase.auth.getSession();
    token = sessionRes.data?.session?.access_token;
  } catch (err) {
    // Session retrieval error or logged out
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers as Record<string, string>),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || `Server API Error (${res.status})`);
  }

  return res.json();
}

// ----------------------------------------------------------------------------
// CLIENTS, CONTACTS, ADDRESSES & REGISTRATIONS
// ----------------------------------------------------------------------------

export async function fetchClientsFromDb(): Promise<Client[]> {
  return request<Client[]>("/clients");
}

export async function insertClientToDb(client: Client): Promise<Client> {
  return request<Client>("/clients", {
    method: "POST",
    body: JSON.stringify(client),
  });
}

export async function updateClientInDb(id: string, updates: Partial<Client>): Promise<void> {
  await request(`/clients/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteClientFromDb(id: string): Promise<void> {
  await request(`/clients/${id}`, {
    method: "DELETE",
  });
}

export async function upsertClientContactInDb(contact: ClientContact): Promise<ClientContact> {
  return request<ClientContact>(`/clients/${contact.client_id}/contacts`, {
    method: "POST",
    body: JSON.stringify(contact),
  });
}

export async function deleteClientContactFromDb(id: string): Promise<void> {
  await request(`/clients/contacts/${id}`, {
    method: "DELETE",
  });
}

export async function upsertClientBankAccountInDb(bank: ClientBankAccount): Promise<ClientBankAccount> {
  return request<ClientBankAccount>(`/clients/${bank.client_id}/bank-accounts`, {
    method: "POST",
    body: JSON.stringify(bank),
  });
}

export async function deleteClientBankAccountFromDb(id: string): Promise<void> {
  await request(`/clients/bank-accounts/${id}`, {
    method: "DELETE",
  });
}

export async function deleteClientAddressFromDb(id: string): Promise<void> {
  await request(`/clients/addresses/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// SERVICES & ENGAGEMENTS
// ----------------------------------------------------------------------------

export async function fetchServicesFromDb(): Promise<Service[]> {
  return request<Service[]>("/services");
}

export async function insertServiceToDb(service: Service): Promise<Service> {
  return request<Service>("/services", {
    method: "POST",
    body: JSON.stringify(service),
  });
}

export async function updateServiceInDb(id: string, updates: Partial<Service>): Promise<void> {
  await request(`/services/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteServiceFromDb(id: string): Promise<void> {
  await request(`/services/${id}`, {
    method: "DELETE",
  });
}

export async function fetchEngagementsFromDb(): Promise<ServiceEngagement[]> {
  return request<ServiceEngagement[]>("/service-engagements");
}

export async function insertEngagementToDb(eng: ServiceEngagement): Promise<ServiceEngagement> {
  return request<ServiceEngagement>("/service-engagements", {
    method: "POST",
    body: JSON.stringify(eng),
  });
}

export async function deleteEngagementFromDb(id: string): Promise<void> {
  await request(`/service-engagements/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// PROJECTS
// ----------------------------------------------------------------------------

export async function fetchProjectsFromDb(): Promise<Project[]> {
  return request<Project[]>("/projects");
}

export async function insertProjectToDb(project: Project): Promise<Project> {
  return request<Project>("/projects", {
    method: "POST",
    body: JSON.stringify(project),
  });
}

export async function updateProjectInDb(id: string, updates: Partial<Project>): Promise<void> {
  await request(`/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteProjectFromDb(id: string): Promise<void> {
  await request(`/projects/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// TASKS & SUBTASKS
// ----------------------------------------------------------------------------

export async function fetchTasksFromDb(): Promise<Task[]> {
  return request<Task[]>("/tasks");
}

export async function insertTaskToDb(task: Task): Promise<Task> {
  return request<Task>("/tasks", {
    method: "POST",
    body: JSON.stringify(task),
  });
}

export async function updateTaskInDb(id: string, updates: Partial<Task>): Promise<void> {
  await request(`/tasks/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTaskFromDb(id: string): Promise<void> {
  await request(`/tasks/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// TASK COMMENTS
// ----------------------------------------------------------------------------

export async function fetchTaskCommentsFromDb(taskId?: string): Promise<TaskComment[]> {
  const query = taskId ? `?task_id=${encodeURIComponent(taskId)}` : "";
  return request<TaskComment[]>(`/task-comments${query}`);
}

export async function insertTaskCommentToDb(comment: TaskComment): Promise<TaskComment> {
  return request<TaskComment>("/task-comments", {
    method: "POST",
    body: JSON.stringify(comment),
  });
}

export async function deleteTaskCommentFromDb(id: string): Promise<void> {
  await request(`/task-comments/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// TASK STATUSES & CATEGORIES
// ----------------------------------------------------------------------------

export async function fetchTaskStatusesFromDb(): Promise<TaskStatusConfig[]> {
  return request<TaskStatusConfig[]>("/task-statuses");
}

export async function insertTaskStatusToDb(status: TaskStatusConfig): Promise<TaskStatusConfig> {
  return request<TaskStatusConfig>("/task-statuses", {
    method: "POST",
    body: JSON.stringify(status),
  });
}

export async function updateTaskStatusInDb(id: string, updates: Partial<TaskStatusConfig>): Promise<void> {
  await request(`/task-statuses/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTaskStatusFromDb(id: string): Promise<void> {
  await request(`/task-statuses/${id}`, {
    method: "DELETE",
  });
}

export async function fetchTaskCategoriesFromDb(): Promise<TaskCategory[]> {
  return request<TaskCategory[]>("/task-categories");
}

export async function insertTaskCategoryToDb(category: TaskCategory): Promise<TaskCategory> {
  return request<TaskCategory>("/task-categories", {
    method: "POST",
    body: JSON.stringify(category),
  });
}

export async function updateTaskCategoryInDb(id: string, updates: Partial<TaskCategory>): Promise<void> {
  await request(`/task-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTaskCategoryFromDb(id: string): Promise<void> {
  await request(`/task-categories/${id}`, {
    method: "DELETE",
  });
}

export async function insertTaskSubCategoryToDb(sub: TaskSubCategory): Promise<TaskSubCategory> {
  return request<TaskSubCategory>("/task-sub-categories", {
    method: "POST",
    body: JSON.stringify(sub),
  });
}

export async function updateTaskSubCategoryInDb(id: string, updates: Partial<TaskSubCategory>): Promise<void> {
  await request(`/task-sub-categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTaskSubCategoryFromDb(id: string): Promise<void> {
  await request(`/task-sub-categories/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// WORKFLOW TEMPLATES
// ----------------------------------------------------------------------------

export async function fetchWorkflowsFromDb(): Promise<WorkflowTemplate[]> {
  return request<WorkflowTemplate[]>("/workflows");
}

export async function insertWorkflowToDb(wf: WorkflowTemplate): Promise<WorkflowTemplate> {
  return request<WorkflowTemplate>("/workflows", {
    method: "POST",
    body: JSON.stringify(wf),
  });
}

export async function updateWorkflowInDb(id: string, updates: Partial<WorkflowTemplate>): Promise<void> {
  await request(`/workflows/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteWorkflowFromDb(id: string): Promise<void> {
  await request(`/workflows/${id}`, {
    method: "DELETE",
  });
}

export async function saveWorkflowMilestonesToDb(workflowId: string, milestones: WorkflowMilestoneTemplate[]): Promise<void> {
  await request(`/workflows/${workflowId}`, {
    method: "PUT",
    body: JSON.stringify({ milestones }),
  });
}

// ----------------------------------------------------------------------------
// INVOICES & PAYMENTS
// ----------------------------------------------------------------------------

export async function fetchInvoicesFromDb(): Promise<Invoice[]> {
  return request<Invoice[]>("/invoices");
}

export async function insertInvoiceToDb(invoice: Invoice): Promise<Invoice> {
  return request<Invoice>("/invoices", {
    method: "POST",
    body: JSON.stringify(invoice),
  });
}

export async function updateInvoiceInDb(id: string, updates: Partial<Invoice>): Promise<void> {
  await request(`/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteInvoiceFromDb(id: string): Promise<void> {
  await request(`/invoices/${id}`, {
    method: "DELETE",
  });
}

export async function fetchPaymentsFromDb(): Promise<Payment[]> {
  return request<Payment[]>("/payments");
}

export async function insertPaymentToDb(payment: Payment): Promise<Payment> {
  return request<Payment>("/payments", {
    method: "POST",
    body: JSON.stringify(payment),
  });
}

export async function updatePaymentInDb(id: string, updates: Partial<Payment>): Promise<void> {
  await request(`/payments/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deletePaymentFromDb(id: string): Promise<void> {
  await request(`/payments/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// INVOICE APPROVAL REQUESTS, RECURRING & BULK BATCHES
// ----------------------------------------------------------------------------

export async function fetchInvoiceRequestsFromDb(): Promise<InvoiceRequest[]> {
  return request<InvoiceRequest[]>("/invoice-requests");
}

export async function insertInvoiceRequestToDb(req: InvoiceRequest): Promise<InvoiceRequest> {
  return request<InvoiceRequest>("/invoice-requests", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function updateInvoiceRequestInDb(id: string, updates: Partial<InvoiceRequest>): Promise<void> {
  await request(`/invoice-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function fetchRecurringInvoicesFromDb(): Promise<RecurringInvoice[]> {
  return request<RecurringInvoice[]>("/recurring-invoices");
}

export async function insertRecurringInvoiceToDb(item: RecurringInvoice): Promise<RecurringInvoice> {
  return request<RecurringInvoice>("/recurring-invoices", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function updateRecurringInvoiceInDb(id: string, updates: Partial<RecurringInvoice>): Promise<void> {
  await request(`/recurring-invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteRecurringInvoiceFromDb(id: string): Promise<void> {
  await request(`/recurring-invoices/${id}`, {
    method: "DELETE",
  });
}

export async function fetchBulkBatchesFromDb(): Promise<BulkInvoiceBatch[]> {
  return request<BulkInvoiceBatch[]>("/bulk-batches");
}

export async function insertBulkBatchToDb(batch: BulkInvoiceBatch): Promise<BulkInvoiceBatch> {
  return request<BulkInvoiceBatch>("/bulk-batches", {
    method: "POST",
    body: JSON.stringify(batch),
  });
}

export async function fetchApprovalLogsFromDb(requestId?: string): Promise<InvoiceApprovalLog[]> {
  const query = requestId ? `?request_id=${encodeURIComponent(requestId)}` : "";
  return request<InvoiceApprovalLog[]>(`/invoice-approval-logs${query}`);
}

export async function insertApprovalLogToDb(log: InvoiceApprovalLog): Promise<InvoiceApprovalLog> {
  return request<InvoiceApprovalLog>("/invoice-approval-logs", {
    method: "POST",
    body: JSON.stringify(log),
  });
}

// ----------------------------------------------------------------------------
// EMPLOYEES & TEAMS
// ----------------------------------------------------------------------------

export async function fetchEmployeesFromDb(): Promise<Employee[]> {
  return request<Employee[]>("/employees");
}

export async function insertEmployeeToDb(emp: Employee): Promise<Employee> {
  return request<Employee>("/employees", {
    method: "POST",
    body: JSON.stringify(emp),
  });
}

export async function updateEmployeeInDb(id: string, updates: Partial<Employee>): Promise<void> {
  await request(`/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteEmployeeFromDb(id: string): Promise<void> {
  await request(`/employees/${id}`, {
    method: "DELETE",
  });
}

export async function fetchTeamsFromDb(): Promise<Team[]> {
  return request<Team[]>("/teams");
}

export async function insertTeamToDb(team: Team): Promise<Team> {
  return request<Team>("/teams", {
    method: "POST",
    body: JSON.stringify(team),
  });
}

export async function updateTeamInDb(id: string, updates: Partial<Team>): Promise<void> {
  await request(`/teams/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteTeamFromDb(id: string): Promise<void> {
  await request(`/teams/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// DOCUMENTS & FILE OBJECTS
// ----------------------------------------------------------------------------

export async function fetchDocumentsFromDb(): Promise<FileObject[]> {
  return request<FileObject[]>("/documents");
}

export async function insertDocumentToDb(doc: FileObject): Promise<FileObject> {
  return request<FileObject>("/documents", {
    method: "POST",
    body: JSON.stringify(doc),
  });
}

export async function deleteDocumentFromDb(id: string): Promise<void> {
  await request(`/documents/${id}`, {
    method: "DELETE",
  });
}

export async function fetchDocumentFoldersFromDb(): Promise<DocumentFolder[]> {
  return request<DocumentFolder[]>("/document-folders");
}

export async function saveDocumentFoldersToDb(folders: DocumentFolder[]): Promise<void> {
  await request("/document-folders", {
    method: "POST",
    body: JSON.stringify(folders),
  });
}

// ----------------------------------------------------------------------------
// CREDENTIAL VAULT (PASSWORDS & SECURE PORTALS)
// ----------------------------------------------------------------------------

export async function fetchVaultCredentialsFromDb(): Promise<VaultCredential[]> {
  return request<VaultCredential[]>("/vault/credentials");
}

export async function insertVaultCredentialToDb(cred: VaultCredential): Promise<VaultCredential> {
  return request<VaultCredential>("/vault/credentials", {
    method: "POST",
    body: JSON.stringify(cred),
  });
}

export async function updateVaultCredentialInDb(id: string, updates: Partial<VaultCredential>): Promise<void> {
  await request(`/vault/credentials/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

export async function deleteVaultCredentialFromDb(id: string): Promise<void> {
  await request(`/vault/credentials/${id}`, {
    method: "DELETE",
  });
}

export async function fetchVaultAuditLogsFromDb(): Promise<VaultAuditLog[]> {
  return request<VaultAuditLog[]>("/vault/audit-logs");
}

export async function insertVaultAuditLogToDb(log: VaultAuditLog): Promise<VaultAuditLog> {
  return request<VaultAuditLog>("/vault/audit-logs", {
    method: "POST",
    body: JSON.stringify(log),
  });
}

// ----------------------------------------------------------------------------
// RECYCLE BIN & WHATSAPP TEMPLATES
// ----------------------------------------------------------------------------

export async function fetchRecycleBinFromDb(): Promise<UniversalRecycleBinItem[]> {
  return request<UniversalRecycleBinItem[]>("/recycle-bin");
}

export async function insertRecycleBinItemToDb(item: UniversalRecycleBinItem): Promise<void> {
  await request("/recycle-bin", {
    method: "POST",
    body: JSON.stringify(item),
  });
}

export async function deleteRecycleBinItemFromDb(id: string): Promise<void> {
  await request(`/recycle-bin/${id}`, {
    method: "DELETE",
  });
}

export async function fetchWhatsAppTemplatesFromDb(): Promise<WhatsAppTemplate[]> {
  return request<WhatsAppTemplate[]>("/whatsapp-templates");
}

export async function upsertWhatsAppTemplateInDb(template: WhatsAppTemplate): Promise<WhatsAppTemplate> {
  return request<WhatsAppTemplate>("/whatsapp-templates", {
    method: "POST",
    body: JSON.stringify(template),
  });
}

export async function deleteWhatsAppTemplateFromDb(id: string): Promise<void> {
  await request(`/whatsapp-templates/${id}`, {
    method: "DELETE",
  });
}

// ----------------------------------------------------------------------------
// SUPER ADMIN FULL DATABASE RESET
// ----------------------------------------------------------------------------

export async function resetFullDatabaseInSupabase(initiator: Employee): Promise<{
  ok: boolean;
  error?: string;
  clearedTablesCount?: number;
}> {
  return request<{ ok: boolean; error?: string; clearedTablesCount?: number }>("/system/reset", {
    method: "POST",
    body: JSON.stringify(initiator),
  });
}
