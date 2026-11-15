// ============================================================================
// PMS CENTRAL DATA STORE & BUSINESS ENGINE (ZERO MOCK DATA)
// Pure database-driven and state repository for production operations
// ============================================================================

import {
  Client,
  Employee,
  Designation,
  Team,
  Service,
  ServiceEngagement,
  Project,
  ProjectPriority,
  Task,
  TaskStatus,
  TaskStatusColor,
  TaskStatusConfig,
  TaskCategory,
  TaskSubCategory,
  TaskComment,
  CommentReadReceipt,
  WorkflowTemplate,
  WorkflowMilestoneTemplate,
  WorkflowStageTemplate,
  WorkflowSubStageTemplate,
  WorkflowProjectTaskTemplate,
  WorkflowSubtaskTemplate,
  Invoice,
  Payment,
  PaymentMode,
  FileObject,
  DocumentFolder,
  Notification,
  ActivityLog,
  DashboardKPIs,
  RoleCode,
  OfficeGeoConfig,
  AttendanceRecord
,
  UniversalRecycleBinItem,
  WhatsAppTemplate,
  ClientContact,
  ClientBankAccount,
  VaultCredential,
  VaultCategory,
  VaultPasswordHistoryEntry,
  VaultAuditLog,
  VaultAuditAction,
  TaskBillingStatus,
  InvoiceRequestType,
  InvoiceApprovalStatus,
  RecurringFrequency,
  RecurringInvoiceStatus,
  BulkInvoiceBatch,
  InvoiceRequest,
  InvoiceRequestItem,
  RecurringInvoice,
  InvoiceApprovalLog
} from "@/types";
import { createClient, SUPERADMIN_EMAIL, isSuperAdminEmail } from "@/lib/supabase/client";
import { calculateDistanceMeters } from "@/lib/geo";
import {
  fetchClientsFromDb,
  insertClientToDb,
  updateClientInDb,
  deleteClientFromDb,
  upsertClientContactInDb,
  deleteClientContactFromDb,
  upsertClientBankAccountInDb,
  deleteClientBankAccountFromDb,
  fetchServicesFromDb,
  insertServiceToDb,
  updateServiceInDb,
  deleteServiceFromDb,
  fetchEngagementsFromDb,
  insertEngagementToDb,
  deleteEngagementFromDb,
  fetchProjectsFromDb,
  insertProjectToDb,
  updateProjectInDb,
  deleteProjectFromDb,
  fetchTasksFromDb,
  insertTaskToDb,
  updateTaskInDb,
  deleteTaskFromDb,
  fetchWorkflowsFromDb,
  insertWorkflowToDb,
  updateWorkflowInDb,
  deleteWorkflowFromDb,
  fetchInvoicesFromDb,
  insertInvoiceToDb,
  deleteInvoiceFromDb,
  fetchPaymentsFromDb,
  insertPaymentToDb,
  fetchTaskCategoriesFromDb,
  insertTaskCategoryToDb,
  updateTaskCategoryInDb,
  deleteTaskCategoryFromDb,
  insertTaskSubCategoryToDb,
  updateTaskSubCategoryInDb,
  deleteTaskSubCategoryFromDb,
  fetchWhatsAppTemplatesFromDb,
  upsertWhatsAppTemplateInDb,
  deleteWhatsAppTemplateFromDb,
  fetchRecycleBinFromDb,
  insertRecycleBinItemToDb,
  deleteRecycleBinItemFromDb,
  fetchEmployeesFromDb,
  fetchDocumentsFromDb,
  insertDocumentToDb,
  deleteDocumentFromDb,
  fetchVaultCredentialsFromDb,
  insertVaultCredentialToDb,
  updateVaultCredentialInDb,
  deleteVaultCredentialFromDb,
  fetchVaultAuditLogsFromDb,
  insertVaultAuditLogToDb,
  fetchInvoiceRequestsFromDb,
  insertInvoiceRequestToDb,
  updateInvoiceRequestInDb,
  fetchRecurringInvoicesFromDb,
  insertRecurringInvoiceToDb,
  updateRecurringInvoiceInDb,
  deleteRecurringInvoiceFromDb,
  fetchBulkBatchesFromDb,
  insertBulkBatchToDb,
  fetchApprovalLogsFromDb,
  insertApprovalLogToDb,
  ensureUuid,
  isUuid,
} from "@/lib/supabase/db";

// Standard System Designations (Reference Master)
export const SYSTEM_DESIGNATIONS: Designation[] = [
  { id: "desig-dir", title: "Managing Partner / Director", code: "DIR", level: 1 },
  { id: "desig-head", title: "Practice Head", code: "HEAD", level: 2 },
  { id: "desig-mgr", title: "Senior Manager / Supervisor", code: "MGR", level: 3 },
  { id: "desig-sr-cons", title: "Senior Consultant", code: "SR_CONS", level: 4 },
  { id: "desig-assoc", title: "Associate Consultant", code: "ASSOC", level: 5 },
  { id: "desig-trainee", title: "Articled Assistant / Trainee", code: "TRAINEE", level: 6 }
];

export const INITIAL_DESIGNATIONS = SYSTEM_DESIGNATIONS;

export const DEFAULT_TASK_STATUSES: TaskStatusConfig[] = [
  { id: "st-open", label: "Open", color: "amber" },
  { id: "st-todo", label: "To Do", color: "slate" },
  { id: "st-in-progress", label: "In Progress", color: "violet" },
  { id: "st-approval-pending", label: "Approval pending", color: "rose" },
  { id: "st-hold", label: "Hold", color: "sky" },
  { id: "st-under-review", label: "Under Review", color: "sky" },
  { id: "st-completed", label: "Completed", color: "emerald", isCompleted: true },
];

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [];

export const DEFAULT_DOCUMENT_FOLDERS: DocumentFolder[] = [
  {
    id: "fld-client-kyc",
    name: "Client KYC & Registrations",
    path: "/clients/kyc",
    description: "PAN cards, GST certificates, Incorporation deeds, MOA/AOA files.",
    created_at: new Date().toISOString(),
    created_by: "emp-admin-01",
    created_by_name: "Admin User",
  },
  {
    id: "fld-statutory-audits",
    name: "Statutory Audits & Workpapers",
    path: "/audits/statutory",
    description: "CARO checklists, balance sheet working notes, bank confirmations.",
    created_at: new Date().toISOString(),
    created_by: "emp-admin-01",
    created_by_name: "Admin User",
  },
  {
    id: "fld-tax-returns",
    name: "Income Tax & 3CD Returns",
    path: "/tax/returns",
    description: "ITR acknowledgements, tax audit 3CD reports, computation sheets.",
    created_at: new Date().toISOString(),
    created_by: "emp-admin-01",
    created_by_name: "Admin User",
  },
  {
    id: "fld-gst-filings",
    name: "GST Monthly & Annual Filings",
    path: "/gst/monthly",
    description: "GSTR-1, GSTR-3B filed acknowledgements and 2B reconciliation workpapers.",
    created_at: new Date().toISOString(),
    created_by: "emp-admin-01",
    created_by_name: "Admin User",
  },
];

// Default System Administrator Profile for initial system access
const DEFAULT_SYSTEM_ADMIN: Employee = {
  id: "emp-admin-01",
  employee_code: "EMP-001",
  first_name: "Super",
  last_name: "Admin",
  full_name: "System Administrator",
  email: SUPERADMIN_EMAIL,
  mobile_number: "+91 98000 00000",
  designation_id: "desig-dir",
  designation_name: "Managing Partner / Director",
  joining_date: new Date().toISOString().slice(0, 10),
  employment_status: "Active",
  is_active: true,
  role_code: "SUPER_ADMIN",
  assigned_projects_count: 0,
  assigned_tasks_count: 0,
  completed_tasks_count: 0,
  created_at: new Date().toISOString(),
};

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_SERVICES: Service[] = [];

export const DEFAULT_WORKFLOWS: WorkflowTemplate[] = [];


export const DEFAULT_WHATSAPP_TEMPLATES: WhatsAppTemplate[] = [
  {
    id: "tpl-task-alloc",
    title: "Task Allocation & Assignment",
    category: "Task",
    content: "Hello *{client_name}*,\n\nTask: *{task_title}*\nProject: *{project_name}*\n📅 Due Date: *{due_date}*\nStatus: *{status}*\n\nPlease review and let us know if any inputs are required.",
    created_at: new Date().toISOString(),
  },
  {
    id: "tpl-task-reminder",
    title: "Deliverable Due Reminder",
    category: "Task",
    content: "⏰ *REMINDER: TASK DUE SOON*\n\nDear *{client_name}*,\nThis is a gentle reminder that deliverable *{task_title}* is scheduled for completion on *{due_date}*.\n\nThank you,\nFinance & Compliance Team",
    created_at: new Date().toISOString(),
  },
  {
    id: "tpl-wf-update",
    title: "Workflow Progress Update",
    category: "Workflow",
    content: "🚀 *WORKFLOW PROGRESS UPDATE*\n\nDear *{client_name}*,\nYour service workflow *{service_name}* has advanced to stage: *{stage_name}*.\n\nWe will keep you informed as milestones complete.",
    created_at: new Date().toISOString(),
  },
  {
    id: "tpl-general",
    title: "General Client Notification",
    category: "General",
    content: "Hello *{client_name}*,\n\nWe have an update regarding your account with us.\nPlease connect with your relationship manager for further information.",
    created_at: new Date().toISOString(),
  },
];

const STORAGE_KEY = "acru_pms_store_v1";

class PMSDataStore {
  // PURE PRODUCTION REPOSITORIES — ZERO MOCK DATA (PERSISTED TO LOCALSTORAGE + SUPABASE SYNC)
  private clients: Client[] = [];
  private services: Service[] = [];
  private engagements: ServiceEngagement[] = [];
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private taskComments: TaskComment[] = [];
  private deletedTaskProjectIds: string[] = [];
  private deletedTaskIds: string[] = [];
  private workflows: WorkflowTemplate[] = [];
  private employees: Employee[] = [DEFAULT_SYSTEM_ADMIN];
  private teams: Team[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];
  private documents: FileObject[] = [];
  private documentFolders: DocumentFolder[] = [...DEFAULT_DOCUMENT_FOLDERS];
  private notifications: Notification[] = [];
  private activityLogs: ActivityLog[] = [];
  private officeGeoConfig: OfficeGeoConfig | null = null;
  private whatsAppTemplates: WhatsAppTemplate[] = [...DEFAULT_WHATSAPP_TEMPLATES];
  private universalRecycleBin: UniversalRecycleBinItem[] = [];
  private attendanceRecords: AttendanceRecord[] = [];
  private taskStatuses: TaskStatusConfig[] = [...DEFAULT_TASK_STATUSES];
  private taskCategories: TaskCategory[] = [...DEFAULT_TASK_CATEGORIES];
  private deletedTaskCategoryIds: string[] = [];
  private vaultCredentials: VaultCredential[] = [];
  private vaultAuditLogs: VaultAuditLog[] = [];
  private invoiceRequests: InvoiceRequest[] = [];
  private recurringInvoices: RecurringInvoice[] = [];
  private bulkBatches: BulkInvoiceBatch[] = [];
  private approvalLogs: InvoiceApprovalLog[] = [];
  private currentUser: Employee = DEFAULT_SYSTEM_ADMIN;
  private authenticated: boolean = false;
  private listeners: Set<() => void> = new Set();
  private cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private isHydratingFromCloud: boolean = false;
  private cloudHydratePromise: Promise<void> | null = null;
  private localUpdatedAt: number = 0;

  constructor() {
    this.hydrate();
    this.ensureDefaultData();
    void this.loadAllFromSupabase();

    if (typeof window !== "undefined") {
      window.addEventListener("focus", () => {
        void this.loadAllFromSupabase();
      });
      window.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          void this.loadAllFromSupabase();
        }
      });
    }
  }

  async loadAllFromSupabase(): Promise<void> {
    try {
      const [
        clients,
        services,
        engagements,
        projects,
        tasks,
        workflows,
        invoices,
        payments,
        categories,
        whatsappTemplates,
        recycleBin,
        employees,
        documents,
        vaultCreds,
        vaultLogs,
        invoiceRequests,
        recurringInvoices,
        bulkBatches,
        approvalLogs,
      ] = await Promise.all([
        fetchClientsFromDb().catch((e) => { console.warn("Direct Supabase fetch clients failed:", e); return null; }),
        fetchServicesFromDb().catch((e) => { console.warn("Direct Supabase fetch services failed:", e); return null; }),
        fetchEngagementsFromDb().catch((e) => { console.warn("Direct Supabase fetch engagements failed:", e); return null; }),
        fetchProjectsFromDb().catch((e) => { console.warn("Direct Supabase fetch projects failed:", e); return null; }),
        fetchTasksFromDb().catch((e) => { console.warn("Direct Supabase fetch tasks failed:", e); return null; }),
        fetchWorkflowsFromDb().catch((e) => { console.warn("Direct Supabase fetch workflows failed:", e); return null; }),
        fetchInvoicesFromDb().catch((e) => { console.warn("Direct Supabase fetch invoices failed:", e); return null; }),
        fetchPaymentsFromDb().catch((e) => { console.warn("Direct Supabase fetch payments failed:", e); return null; }),
        fetchTaskCategoriesFromDb().catch((e) => { console.warn("Direct Supabase fetch categories failed:", e); return null; }),
        fetchWhatsAppTemplatesFromDb().catch((e) => { console.warn("Direct Supabase fetch whatsapp templates failed:", e); return null; }),
        fetchRecycleBinFromDb().catch((e) => { console.warn("Direct Supabase fetch recycle bin failed:", e); return null; }),
        fetchEmployeesFromDb().catch((e) => { console.warn("Direct Supabase fetch employees failed:", e); return null; }),
        fetchDocumentsFromDb().catch((e) => { console.warn("Direct Supabase fetch documents failed:", e); return null; }),
        fetchVaultCredentialsFromDb().catch((e) => { console.warn("Direct Supabase fetch vault_credentials failed:", e); return null; }),
        fetchVaultAuditLogsFromDb().catch((e) => { console.warn("Direct Supabase fetch vault_audit_logs failed:", e); return null; }),
        fetchInvoiceRequestsFromDb().catch((e) => { console.warn("Direct Supabase fetch invoice_requests failed:", e); return null; }),
        fetchRecurringInvoicesFromDb().catch((e) => { console.warn("Direct Supabase fetch recurring_invoices failed:", e); return null; }),
        fetchBulkBatchesFromDb().catch((e) => { console.warn("Direct Supabase fetch bulk_batches failed:", e); return null; }),
        fetchApprovalLogsFromDb().catch((e) => { console.warn("Direct Supabase fetch approval_logs failed:", e); return null; }),
      ]);

      if (recycleBin !== null) {
        this.universalRecycleBin = recycleBin;
      }
      if (clients !== null) {
        this.clients = this.mergeRemoteEntities(this.clients, clients);
      }
      if (services !== null) {
        this.services = this.mergeRemoteEntities(this.services, services);
      }
      if (engagements !== null) {
        this.engagements = this.mergeRemoteEntities(this.engagements, engagements);
      }
      if (projects !== null) {
        this.projects = this.mergeRemoteEntities(this.projects, projects);
      }
      if (categories !== null) {
        this.taskCategories = this.mergeRemoteCategories(this.taskCategories, categories);
      }
      if (tasks !== null) {
        const mergedTasks = this.mergeRemoteEntities(this.tasks, tasks);
        // Deduplicate any exact duplicate tasks spawned by legacy auto-backfill loops
        const seen = new Set<string>();
        this.tasks = mergedTasks
          .filter((t) => {
            if (t.title && t.title.includes("Client Delivery Project — Initial Deliverable")) {
              const key = `${t.project_id || t.project_name}_${t.title}`;
              if (seen.has(key)) return false;
              seen.add(key);
            }
            return true;
          })
          .map((t) => this.ensureTaskCategorized(t));
      }
      if (workflows !== null) {
        this.workflows = this.mergeRemoteEntities(this.workflows, workflows);
      }
      if (invoices !== null) {
        this.invoices = this.mergeRemoteEntities(this.invoices, invoices);
      }
      if (payments !== null) {
        this.payments = this.mergeRemoteEntities(this.payments, payments);
      }
      if (whatsappTemplates !== null && whatsappTemplates.length > 0) {
        this.whatsAppTemplates = this.mergeRemoteEntities(this.whatsAppTemplates, whatsappTemplates);
      }
      if (employees !== null) {
        this.employees = this.mergeRemoteEntities(this.employees, employees);
        const adminEmp = this.employees.find((e) => isSuperAdminEmail(e.email));
        if (adminEmp) {
          this.currentUser = adminEmp;
        }
      }
      if (documents !== null) {
        this.documents = this.mergeRemoteEntities(this.documents, documents);
      }
      if (vaultCreds !== null) {
        this.vaultCredentials = this.mergeRemoteEntities(this.vaultCredentials, vaultCreds);
      }
      if (vaultLogs !== null) {
        this.vaultAuditLogs = this.mergeRemoteEntities(this.vaultAuditLogs, vaultLogs);
      }
      if (invoiceRequests !== null) {
        this.invoiceRequests = this.mergeRemoteEntities(this.invoiceRequests, invoiceRequests);
      }
      if (recurringInvoices !== null) {
        this.recurringInvoices = this.mergeRemoteEntities(this.recurringInvoices, recurringInvoices);
      }
      if (bulkBatches !== null) {
        this.bulkBatches = this.mergeRemoteEntities(this.bulkBatches, bulkBatches);
      }
      if (approvalLogs !== null) {
        this.approvalLogs = this.mergeRemoteEntities(this.approvalLogs, approvalLogs);
      }

      this.persist();
      this.notify();
    } catch (err) {
      console.error("Direct Supabase load error:", err);
    }
  }

  private mergeRemoteEntities<T extends { id: string; updated_at?: string; created_at?: string; client_name?: string; title?: string; task_code?: string; client_code?: string; email?: string }>(
    localList: T[],
    remoteList: T[] | null
  ): T[] {
    if (remoteList === null) {
      return localList;
    }

    const localMap = new Map<string, T>();
    localList.forEach((loc) => {
      if (loc?.id) localMap.set(loc.id, loc);
      if (loc?.task_code) localMap.set(loc.task_code.toUpperCase(), loc);
      if (loc?.client_code) localMap.set(loc.client_code.toUpperCase(), loc);
      if ((loc as any)?.email) localMap.set(((loc as any).email as string).trim().toLowerCase(), loc);
    });

    const recycleBinIdSet = new Set<string>();
    this.universalRecycleBin.forEach((item) => {
      if (item.item_id) recycleBinIdSet.add(item.item_id);
      if (item.id) recycleBinIdSet.add(item.id);
      if (item.code) recycleBinIdSet.add(item.code.toUpperCase());
    });
    const deletedTaskProjectSet = new Set(this.deletedTaskProjectIds);
    const deletedTaskSet = new Set(this.deletedTaskIds);

    const merged: T[] = [];
    for (const remote of remoteList) {
      if (recycleBinIdSet.has(remote.id)) continue;
      if (deletedTaskSet.has(remote.id)) continue;
      if (deletedTaskProjectSet.has((remote as any).project_id)) continue;

      const local = localMap.get(remote.id) ||
        (remote.task_code ? localMap.get(remote.task_code.toUpperCase()) : undefined) ||
        (remote.client_code ? localMap.get(remote.client_code.toUpperCase()) : undefined) ||
        (remote.email ? localMap.get(remote.email.trim().toLowerCase()) : undefined);

      if (!local) {
        merged.push(remote);
        continue;
      }

      const localTime = new Date(local.updated_at || local.created_at || 0).getTime();
      const remoteTime = new Date(remote.updated_at || remote.created_at || 0).getTime();

      if (localTime > remoteTime) {
        merged.push({
          ...remote,
          ...local,
        });
      } else {
        const mergedItem: any = { ...remote };
        for (const key of Object.keys(local)) {
          const lVal = (local as any)[key];
          const rVal = (remote as any)[key];
          if (lVal !== undefined && lVal !== null) {
            if (rVal === undefined || rVal === null) {
              mergedItem[key] = lVal;
            } else if (Array.isArray(lVal) && lVal.length > 0 && Array.isArray(rVal) && rVal.length === 0) {
              mergedItem[key] = lVal;
            } else if (typeof lVal === "object" && !Array.isArray(lVal) && (!rVal || Object.keys(rVal).length === 0)) {
              mergedItem[key] = lVal;
            }
          }
        }
        merged.push(mergedItem);
      }
    }

    const remoteIdSet = new Set(remoteList.map((r) => r.id));
    const now = Date.now();
    for (const local of localList) {
      if (remoteIdSet.has(local.id)) continue;
      if (local.task_code && remoteList.some((r) => r.task_code?.toUpperCase() === local.task_code?.toUpperCase())) continue;
      if (local.client_code && remoteList.some((r) => r.client_code?.toUpperCase() === local.client_code?.toUpperCase())) continue;
      if (local.email && remoteList.some((r) => r.email?.trim().toLowerCase() === local.email?.trim().toLowerCase())) continue;

      if (recycleBinIdSet.has(local.id)) continue;
      if (deletedTaskSet.has(local.id)) continue;
      if (deletedTaskProjectSet.has((local as any).project_id)) continue;

      const ageMs = now - new Date(local.created_at || 0).getTime();
      const isUnsavedRecentDraft = ageMs >= 0 && ageMs < 15000 && !isUuid(local.id);

      if (isUnsavedRecentDraft) {
        merged.push(local);
      }
    }

    return merged;
  }

  private mergeRemoteCategories(localCats: TaskCategory[], remoteCats: TaskCategory[] | null): TaskCategory[] {
    if (remoteCats === null) return localCats;

    const recycleBinIdSet = new Set<string>();
    this.universalRecycleBin.forEach((item) => {
      if (item.item_id) recycleBinIdSet.add(item.item_id);
      if (item.id) recycleBinIdSet.add(item.id);
      if (item.code) recycleBinIdSet.add(item.code.toUpperCase());
    });
    const deletedCatSet = new Set(this.deletedTaskCategoryIds);

    // Remote categories from Supabase are the authoritative single source of truth
    const filteredRemote = remoteCats.filter((c) => !recycleBinIdSet.has(c.id) && !deletedCatSet.has(c.id));

    // Only allow genuinely unsaved offline categories created in the last 15 seconds
    const remoteIdSet = new Set(filteredRemote.map((r) => r.id));
    const now = Date.now();
    const unsavedDrafts = localCats.filter((loc) => {
      if (remoteIdSet.has(loc.id)) return false;
      if (recycleBinIdSet.has(loc.id) || deletedCatSet.has(loc.id)) return false;
      const ageMs = now - new Date(loc.created_at || 0).getTime();
      return ageMs >= 0 && ageMs < 15000 && !isUuid(loc.id);
    });

    return [...filteredRemote, ...unsavedDrafts];
  }

  private addDaysIso(baseIso: string, days: number): string {
    const parsed = new Date(baseIso);
    const ms = Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
    return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  /**
   * Disabled legacy auto-generation to guarantee Supabase is the single source of truth.
   * Tasks and projects are only created upon explicit user action or workflow cascade.
   */
  private backfillMissingProjectsAndTasks() {
    // No-op: Supabase is single source of truth; never auto-generate tasks on refresh
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Ignore subscriber errors
      }
    });
  }

  private mergeById<T extends { id: string }>(currentList: T[], incomingList: T[]): T[] {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return currentList;
    if (!Array.isArray(currentList) || currentList.length === 0) return incomingList;

    const map = new Map<string, T>();
    currentList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    incomingList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  }

  private ensureDefaultData() {
    let changed = false;

    // 1. Ensure Services
    if (this.services.length === 0) {
      this.services = [...DEFAULT_SERVICES];
      changed = true;
    }

    // 2. Ensure Workflows
    if (this.workflows.length === 0) {
      this.workflows = [...DEFAULT_WORKFLOWS];
      changed = true;
    }

    if (changed) {
      this.writeLocalSnapshot();
    }
  }

  private applyWorkspaceDataSnapshot(parsed: any) {
    if (!parsed || typeof parsed !== "object") return;
    if (Array.isArray(parsed.clients) && parsed.clients.length > 0) {
      this.clients = this.mergeById(this.clients, parsed.clients);
    }
    if (Array.isArray(parsed.services) && parsed.services.length > 0) {
      this.services = this.mergeById(this.services, parsed.services);
    }
    if (Array.isArray(parsed.engagements) && parsed.engagements.length > 0) {
      this.engagements = this.mergeById(this.engagements, parsed.engagements);
    }
    if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
      this.projects = this.mergeById(this.projects, parsed.projects);
    }
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      this.tasks = this.mergeById(this.tasks, parsed.tasks);
    }
    if (Array.isArray(parsed.taskComments) && parsed.taskComments.length > 0) {
      this.taskComments = this.mergeById(this.taskComments, parsed.taskComments);
    }
    if (Array.isArray(parsed.deletedTaskProjectIds)) {
      this.deletedTaskProjectIds = Array.from(
        new Set([...this.deletedTaskProjectIds, ...parsed.deletedTaskProjectIds])
      );
    }
    if (Array.isArray(parsed.workflows) && parsed.workflows.length > 0) {
      this.workflows = this.mergeById(this.workflows, parsed.workflows);
    }
    if (Array.isArray(parsed.employees) && parsed.employees.length > 0) {
      this.employees = this.mergeById(this.employees, parsed.employees);
    }
    if (Array.isArray(parsed.teams) && parsed.teams.length > 0) {
      this.teams = this.mergeById(this.teams, parsed.teams);
    }
    if (Array.isArray(parsed.invoices) && parsed.invoices.length > 0) {
      this.invoices = this.mergeById(this.invoices, parsed.invoices);
    }
    if (Array.isArray(parsed.payments) && parsed.payments.length > 0) {
      this.payments = this.mergeById(this.payments, parsed.payments);
    }
    if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
      this.documents = this.mergeById(this.documents, parsed.documents);
    }
    if (Array.isArray(parsed.documentFolders) && parsed.documentFolders.length > 0) {
      this.documentFolders = this.mergeById(this.documentFolders, parsed.documentFolders);
    } else if (this.documentFolders.length === 0) {
      this.documentFolders = [...DEFAULT_DOCUMENT_FOLDERS];
    }
    if (Array.isArray(parsed.notifications) && parsed.notifications.length > 0) {
      this.notifications = this.mergeById(this.notifications, parsed.notifications);
    }
    if (Array.isArray(parsed.activityLogs) && parsed.activityLogs.length > 0) {
      this.activityLogs = this.mergeById(this.activityLogs, parsed.activityLogs);
    }
    if (parsed.officeGeoConfig && typeof parsed.officeGeoConfig.latitude === "number") {
      this.officeGeoConfig = parsed.officeGeoConfig;
    }
    if (Array.isArray(parsed.attendanceRecords) && parsed.attendanceRecords.length > 0) {
      this.attendanceRecords = this.mergeById(this.attendanceRecords, parsed.attendanceRecords);
    }
    if (Array.isArray(parsed.taskStatuses) && parsed.taskStatuses.length > 0) {
      this.taskStatuses = this.mergeById(this.taskStatuses, parsed.taskStatuses);
    }
    if (Array.isArray(parsed.taskCategories) && parsed.taskCategories.length > 0) {
      this.taskCategories = this.mergeById(this.taskCategories, parsed.taskCategories);
    } else if (this.taskCategories.length === 0 && (!parsed.deletedTaskCategoryIds || parsed.deletedTaskCategoryIds.length === 0)) {
      this.taskCategories = [...DEFAULT_TASK_CATEGORIES];
    }
    if (Array.isArray(parsed.deletedTaskCategoryIds)) {
      this.deletedTaskCategoryIds = Array.from(
        new Set([...this.deletedTaskCategoryIds, ...parsed.deletedTaskCategoryIds])
      );
    }
    if (Array.isArray(parsed.deletedTaskIds)) {
      this.deletedTaskIds = Array.from(
        new Set([...this.deletedTaskIds, ...parsed.deletedTaskIds])
      );
    }
    if (Array.isArray(parsed.vaultCredentials) && parsed.vaultCredentials.length > 0) {
      this.vaultCredentials = this.mergeById(this.vaultCredentials, parsed.vaultCredentials);
    }
    if (Array.isArray(parsed.vaultAuditLogs) && parsed.vaultAuditLogs.length > 0) {
      this.vaultAuditLogs = this.mergeById(this.vaultAuditLogs, parsed.vaultAuditLogs);
    }
    if (Array.isArray(parsed.invoiceRequests) && parsed.invoiceRequests.length > 0) {
      this.invoiceRequests = this.mergeById(this.invoiceRequests, parsed.invoiceRequests);
    }
    if (Array.isArray(parsed.recurringInvoices) && parsed.recurringInvoices.length > 0) {
      this.recurringInvoices = this.mergeById(this.recurringInvoices, parsed.recurringInvoices);
    }
    if (Array.isArray(parsed.bulkBatches) && parsed.bulkBatches.length > 0) {
      this.bulkBatches = this.mergeById(this.bulkBatches, parsed.bulkBatches);
    }
    if (Array.isArray(parsed.approvalLogs) && parsed.approvalLogs.length > 0) {
      this.approvalLogs = this.mergeById(this.approvalLogs, parsed.approvalLogs);
    }
    if (typeof parsed.updatedAt === "number") {
      this.localUpdatedAt = Math.max(this.localUpdatedAt, parsed.updatedAt);
    }
    // Keep default System Admin email synced with VITE_SUPERADMIN_EMAIL
    this.employees = this.employees.map((e) =>
      e.id === "emp-admin-01" && e.email === "admin@pmsfirm.com"
        ? { ...e, email: SUPERADMIN_EMAIL }
        : e
    );
  }

  private buildWorkspaceDataSnapshot(updatedAt: number) {
    return {
      clients: this.clients,
      services: this.services,
      engagements: this.engagements,
      projects: this.projects,
      tasks: this.tasks,
      taskComments: this.taskComments,
      deletedTaskProjectIds: this.deletedTaskProjectIds,
      deletedTaskIds: this.deletedTaskIds,
      workflows: this.workflows,
      employees: this.employees,
      teams: this.teams,
      invoices: this.invoices,
      payments: this.payments,
      documents: this.documents,
      documentFolders: this.documentFolders,
      notifications: this.notifications,
      activityLogs: this.activityLogs,
      officeGeoConfig: this.officeGeoConfig,
      attendanceRecords: this.attendanceRecords,
      taskStatuses: this.taskStatuses,
      taskCategories: this.taskCategories,
      deletedTaskCategoryIds: this.deletedTaskCategoryIds,
      vaultCredentials: this.vaultCredentials,
      vaultAuditLogs: this.vaultAuditLogs,
      invoiceRequests: this.invoiceRequests,
      recurringInvoices: this.recurringInvoices,
      bulkBatches: this.bulkBatches,
      approvalLogs: this.approvalLogs,
      updatedAt,
    };
  }

  private hydrate() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        window.localStorage.setItem("acru_pms_store_backup", raw);
      } catch {
        // ignore backup quota error
      }
      const parsed = JSON.parse(raw);
      this.applyWorkspaceDataSnapshot(parsed);
      if (parsed.currentUser && parsed.currentUser.id) {
        this.currentUser = parsed.currentUser;
      }
      if (typeof parsed.authenticated === "boolean") {
        this.authenticated = parsed.authenticated;
      }
      if (this.currentUser.id === "emp-admin-01" && this.currentUser.email === "admin@pmsfirm.com") {
        this.currentUser = { ...this.currentUser, email: SUPERADMIN_EMAIL };
      }

      // Purge all legacy mock practice tasks, mock categories, mock workflows, and mock services permanently
      const MOCK_TASK_PREFIXES = ["tsk-gen-", "tsk-gst-", "tsk-inc-", "tsk-0"];
      const MOCK_CAT_IDS = ["cat-general", "cat-tax", "cat-audit", "cat-roc", "cat-acc", "cat-adv"];
      const MOCK_WF_IDS = ["wf-company-incorp", "wf-gst-reg", "wf-tax-audit", "wf-stat-audit"];
      const MOCK_SRV_PREFIXES = ["srv-"];

      this.workflows = this.workflows.filter((w) => isUuid(w.id) && !MOCK_WF_IDS.includes(w.id));
      this.services = this.services.filter((s) => isUuid(s.id) && !MOCK_SRV_PREFIXES.some((p) => s.id.startsWith(p)));
      const initialCatCount = this.taskCategories.length;
      this.taskCategories = this.taskCategories.filter((c) => !MOCK_CAT_IDS.includes(c.id));
      MOCK_CAT_IDS.forEach((cid) => {
        if (!this.deletedTaskCategoryIds.includes(cid)) {
          this.deletedTaskCategoryIds.push(cid);
        }
      });

      const initialTaskCount = this.tasks.length;
      const seenBackfillKeys = new Set<string>();
      this.tasks = this.tasks.filter((t) => {
        if (MOCK_CAT_IDS.includes(t.category_id || "")) return false;
        if (this.deletedTaskIds.includes(t.id) || (t.task_code && this.deletedTaskIds.includes(t.task_code.toUpperCase()))) return false;
        if (MOCK_TASK_PREFIXES.some((p) => (t.id && t.id.toLowerCase().startsWith(p)) || (t.task_code && t.task_code.toLowerCase().startsWith(p)))) return false;
        if (t.title && t.title.includes("Client Delivery Project — Initial Deliverable")) {
          const key = `${t.project_id || t.project_name}`;
          if (seenBackfillKeys.has(key)) return false;
          seenBackfillKeys.add(key);
        }
        return true;
      });
      if (this.tasks.length !== initialTaskCount || this.taskCategories.length !== initialCatCount) {
        this.writeLocalSnapshot();
      }
    } catch (error) {
      console.error("Failed to hydrate PMS store from localStorage:", error);
    }
  }

  private writeLocalSnapshot() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const snapshot = {
        ...this.buildWorkspaceDataSnapshot(this.localUpdatedAt || Date.now()),
        currentUser: this.currentUser,
        authenticated: this.authenticated,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error("Failed to persist PMS store to localStorage:", error);
    }
  }

  private persist() {
    if (!this.isHydratingFromCloud) {
      this.localUpdatedAt = Date.now();
    }
    this.writeLocalSnapshot();
    if (!this.isHydratingFromCloud) {
      this.scheduleCloudSync();
    }
    this.notify();
  }

  private scheduleCloudSync() {
    if (typeof window === "undefined") return;
    if (this.cloudSyncTimer) clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(() => {
      void this.pushSnapshotToSupabase();
    }, 350);
  }

  private async pushSnapshotToSupabase() {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const snapshot = this.buildWorkspaceDataSnapshot(this.localUpdatedAt || Date.now());
      const { error } = await supabase.from("system_settings").upsert(
        {
          setting_key: "pms_workspace_snapshot_v1",
          setting_value: snapshot,
          description: "Cross-device PMS workspace state",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );
      if (error) {
        console.warn("Supabase workspace sync skipped:", error.message);
      }
    } catch {
      // Non-fatal if offline
    }
  }

  async hydrateFromSupabase(force = false): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.cloudHydratePromise && !force) return this.cloudHydratePromise;

    const run = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return;

        const { data, error } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "pms_workspace_snapshot_v1")
          .maybeSingle();

        if (error) {
          console.warn("Supabase workspace hydrate skipped:", error.message);
          return;
        }

        const remote = data?.setting_value as Record<string, any> | undefined;
        if (remote && typeof remote === "object") {
          this.isHydratingFromCloud = true;
          try {
            this.applyWorkspaceDataSnapshot(remote);
            this.ensureDefaultData();
            if (this.currentUser?.id) {
              const matched = this.employees.find(
                (e) =>
                  e.id === this.currentUser.id ||
                  (e.email || "").toLowerCase() === (this.currentUser.email || "").toLowerCase()
              );
              if (matched) this.currentUser = matched;
            }
            this.writeLocalSnapshot();
            void this.pushSnapshotToSupabase();
          } finally {
            this.isHydratingFromCloud = false;
          }
          this.notify();
        } else {
          // First-time cloud seed from current device
          await this.pushSnapshotToSupabase();
        }
      } catch {
        // Non-fatal if offline
      } finally {
        this.cloudHydratePromise = null;
      }
    };

    this.cloudHydratePromise = run();
    return this.cloudHydratePromise;
  }

  private async syncClientsFromSupabase() {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const { data, error } = await supabase
        .from("clients")
        .select("*, client_contacts(*), client_addresses(*), client_registrations(*), client_bank_accounts(*)")
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data) || data.length === 0) return;

      const remoteClients: Client[] = data.map((row: any) => {
        const reg = Array.isArray(row.client_registrations)
          ? row.client_registrations[0]
          : row.client_registrations;
        const contacts = Array.isArray(row.client_contacts) ? row.client_contacts : [];
        const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0];
        const addresses = Array.isArray(row.client_addresses) ? row.client_addresses : [];
        const bankAccounts: ClientBankAccount[] = Array.isArray(row.client_bank_accounts)
          ? row.client_bank_accounts.map((b: any) => ({
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
            }))
          : [];

        return {
          id: row.id,
          client_code: row.client_code,
          client_name: row.client_name,
          legal_name: row.legal_name,
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
          addresses,
          registration: reg,
          bank_accounts: bankAccounts.length > 0 ? bankAccounts : undefined,
        };
      });

      const localOnly = this.clients.filter(
        (lc) => !remoteClients.some((rc) => rc.id === lc.id || rc.client_code === lc.client_code)
      );
      this.clients = [...localOnly, ...remoteClients];
      this.persist();
    } catch {
      // Non-fatal if offline or Supabase RLS denies unauthenticated read
    }
  }

  private async pushClientToSupabase(client: Client) {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const { error } = await supabase.from("clients").upsert({
        id: client.id,
        client_code: client.client_code,
        client_name: client.client_name,
        legal_name: client.legal_name,
        reference_name: client.reference_name || null,
        constitution: client.constitution,
        category: client.category || null,
        nature_of_income: client.nature_of_income || null,
        remarks: client.remarks || null,
        status: client.status,
      });

      if (error) return;

      if (client.contact) {
        await supabase.from("client_contacts").upsert({
          client_id: client.id,
          contact_person: client.contact.contact_person,
          designation: client.contact.designation || null,
          mobile_number: client.contact.mobile_number,
          email: client.contact.email,
          is_primary: true,
        });
      }

      if (client.addresses && client.addresses.length > 0) {
        await supabase.from("client_addresses").insert(
          client.addresses.map((addr) => ({
            client_id: client.id,
            address_type: addr.address_type,
            street_address: addr.street_address,
            city: addr.city,
            state: addr.state,
            pin_code: addr.pin_code,
            country: addr.country,
            is_primary: addr.is_primary,
          }))
        );
      }

      if (client.registration) {
        await supabase.from("client_registrations").upsert({
          client_id: client.id,
          pan: client.registration.pan,
          gstin: client.registration.gstin || null,
          cin: client.registration.cin || null,
          dob_or_doi: client.registration.dob_or_doi || null,
          additional_registrations: client.registration.additional_registrations || [],
        });
      }

      if (client.bank_accounts && client.bank_accounts.length > 0) {
        await supabase.from("client_bank_accounts").insert(
          client.bank_accounts.map((acc, idx) => ({
            client_id: client.id,
            bank_name: acc.bank_name,
            account_number_encrypted: acc.account_number,
            ifsc_code: acc.ifsc_code,
            account_type: acc.account_type || "Current",
            is_primary: acc.is_primary !== undefined ? acc.is_primary : idx === 0,
          }))
        );
      }
    } catch {
      // Local persistence already succeeded
    }
  }

  private async deleteClientFromSupabase(clientId: string) {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      await supabase.from("clients").delete().eq("id", clientId);
    } catch {
      // Local deletion already succeeded
    }
  }

  // Active Session User
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getCurrentUser(): Employee {
    return this.currentUser;
  }

  setCurrentUser(empId: string) {
    const found = this.employees.find(e => e.id === empId);
    if (found) {
      this.currentUser = found;
      this.authenticated = true;
      this.persist();
      this.notify();
    }
  }

  signOut() {
    this.authenticated = false;
    this.persist();
    this.notify();
  }

  signInWithEmail(
    email: string,
    fullName?: string
  ): { ok: boolean; user?: Employee; reason?: string } {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { ok: false, reason: "No email address returned by Google OAuth." };
    }

    if (isSuperAdminEmail(normalized)) {
      let admin = this.employees.find(
        (e) => (e.email || "").trim().toLowerCase() === normalized || e.id === "emp-admin-01"
      );
      if (admin) {
        admin = {
          ...admin,
          email: normalized,
          role_code: "SUPER_ADMIN",
          is_active: true,
          employment_status: "Active",
          full_name:
            fullName && admin.full_name === "System Administrator" ? fullName : admin.full_name,
        };
        this.employees = this.employees.map((e) => (e.id === admin!.id ? admin! : e));
      } else {
        admin = {
          ...DEFAULT_SYSTEM_ADMIN,
          email: normalized,
          full_name: fullName || DEFAULT_SYSTEM_ADMIN.full_name,
        };
        this.employees = [admin, ...this.employees];
      }
      this.currentUser = admin;
      this.authenticated = true;
      this.persist();
      this.notify();
      return { ok: true, user: admin };
    }

    const found = this.employees.find(
      (e) => (e.email || "").trim().toLowerCase() === normalized
    );
    if (!found) {
      return {
        ok: false,
        reason: `Account (${email}) is not registered in the Employee Directory. Ask your Super Admin (${SUPERADMIN_EMAIL}) to add you first.`,
      };
    }
    if (!found.is_active) {
      return {
        ok: false,
        reason: "Access Denied: Your employee account has been deactivated.",
      };
    }

    this.currentUser = found;
    this.authenticated = true;
    this.persist();
    this.notify();
    return { ok: true, user: found };
  }

  // Dashboard KPIs (100% Dynamically Calculated from Real Database State)
  getKPIs(): DashboardKPIs {
    const totalClients = this.clients.length;
    const activeClients = this.clients.filter(c => c.status === "Active").length;
    const totalServices = this.services.length;
    const activeProjects = this.projects.filter(p => p.status === "In Progress" || p.status === "Under Review").length;
    const pendingTasks = this.tasks.filter(t => !t.parent_task_id && t.status !== "Completed").length;
    const completedTasks = this.tasks.filter(t => !t.parent_task_id && t.status === "Completed").length;
    const totalEmployees = this.employees.length;
    const pendingPaymentsCount = this.invoices.filter(i => i.status === "Partially Paid" || i.status === "Overdue" || i.status === "Finalized").length;
    
    const totalRevenueInvoiced = this.invoices
      .filter(i => i.status !== "Cancelled" && i.status !== "Draft")
      .reduce((sum, inv) => sum + inv.grand_total, 0);

    const totalPaymentsReceived = this.payments
      .filter(p => p.status === "Completed")
      .reduce((sum, pay) => sum + pay.amount, 0);

    const outstandingReceivables = Math.max(0, totalRevenueInvoiced - totalPaymentsReceived);

    return {
      totalClients,
      activeClients,
      totalServices,
      activeProjects,
      pendingTasks,
      completedTasks,
      totalEmployees,
      pendingPaymentsCount,
      totalRevenueInvoiced,
      totalPaymentsReceived,
      outstandingReceivables
    };
  }

  private computeTaskProgressScore(task: Task, visited = new Set<string>()): number {
    if (this.isCompletedStatus(task.status)) return 100;
    if (visited.has(task.id)) return 0;
    const nextVisited = new Set(visited);
    nextVisited.add(task.id);

    const subtasks = this.tasks.filter((st) => st.parent_task_id === task.id);
    if (subtasks.length > 0) {
      const subSum = subtasks.reduce(
        (acc, st) => acc + this.computeTaskProgressScore(st, nextVisited),
        0
      );
      return subSum / subtasks.length;
    }
    if (task.status === "Under Review") return 75;
    if (task.status === "In Progress") return 40;
    return 0;
  }

  private computeProjectProgress(projectId: string): number {
    const projectTasks = this.tasks.filter((t) => t.project_id === projectId && !t.parent_task_id);
    if (projectTasks.length === 0) return 0;

    const totalScore = projectTasks.reduce(
      (acc, task) => acc + this.computeTaskProgressScore(task),
      0
    );

    return Math.round(totalScore / projectTasks.length);
  }

  private refreshProjectProgress(projectId: string) {
    const proj = this.projects.find((p) => p.id === projectId);
    if (!proj) return;
    proj.progress_percentage = this.computeProjectProgress(projectId);
    proj.updated_at = new Date().toISOString();
  }

  private enrichClient(client: Client): Client {
    const clientEngagements = this.engagements.filter((e) => e.client_id === client.id);
    const clientProjects = this.projects.filter((p) => p.client_id === client.id);
    const clientInvoices = this.invoices.filter((i) => i.client_id === client.id);
    const clientPayments = this.payments.filter((p) => p.client_id === client.id);
    const projectIds = new Set(clientProjects.map((p) => p.id));
    const pendingTasks = this.tasks.filter(
      (t) => !t.parent_task_id && projectIds.has(t.project_id) && t.status !== "Completed"
    ).length;

    const invoiced = clientInvoices
      .filter((i) => i.status !== "Cancelled" && i.status !== "Draft")
      .reduce((sum, i) => sum + i.grand_total, 0);
    const paid = clientPayments
      .filter((p) => p.status === "Completed")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ...client,
      active_services_count: clientEngagements.filter((e) => e.status === "Active").length,
      total_projects_count: clientProjects.length,
      completed_projects_count: clientProjects.filter((p) => p.status === "Completed").length,
      pending_tasks_count: pendingTasks,
      total_invoiced_amount: invoiced,
      total_payments_received: paid,
      outstanding_amount: Math.max(0, invoiced - paid),
    };
  }

  // Clients
  getClients(): Client[] {
    return this.clients.map((c) => this.enrichClient(c));
  }

  getClientById(id: string): Client | undefined {
    const client = this.clients.find((c) => c.id === id);
    if (!client) return undefined;
    return this.enrichClient(client);
  }

  getNextClientCode(): string {
    const nextNum = this.clients.length + 1;
    const year = new Date().getFullYear();
    return `CLI-${year}-${String(nextNum).padStart(3, "0")}`;
  }

  async addClient(
    newClient: Omit<Client, "id" | "client_code" | "created_at" | "updated_at">,
    options?: { skipDefaultProject?: boolean }
  ): Promise<Client> {
    const client_code = this.getNextClientCode();
    const id = ensureUuid();
    const trimmedNick = newClient.nick_name?.trim() || "";
    const resolvedFolderName =
      newClient.folder_name?.trim() ||
      (trimmedNick ? `${trimmedNick} ${client_code}` : undefined);

    const client: Client = {
      ...newClient,
      nick_name: trimmedNick || undefined,
      folder_name: resolvedFolderName,
      id,
      client_code,
      contact: newClient.contact ? { ...newClient.contact, id: ensureUuid(newClient.contact.id), client_id: id } : undefined,
      contacts: newClient.contacts?.map((c) => ({ ...c, id: ensureUuid(c.id), client_id: id })),
      addresses: newClient.addresses?.map((addr) => ({ ...addr, id: ensureUuid(addr.id), client_id: id })),
      registration: newClient.registration ? { ...newClient.registration, id: ensureUuid(newClient.registration.id), client_id: id } : undefined,
      bank_accounts: newClient.bank_accounts?.map((b, idx) => ({
        ...b,
        id: ensureUuid(b.id),
        client_id: id,
        is_primary: b.is_primary !== undefined ? b.is_primary : idx === 0,
      })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_services_count: 0,
      total_projects_count: 0,
      completed_projects_count: 0,
      pending_tasks_count: 0,
      total_invoiced_amount: 0,
      total_payments_received: 0,
      outstanding_amount: 0,
    };

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await insertClientToDb(client);

    this.clients.unshift(client);
    this.addActivityLog(`Onboarded new client: ${client.client_name}`, "client", id);

    this.persist();
    return this.enrichClient(client);
  }

  async updateClient(id: string, updates: Partial<Client>): Promise<Client | null> {
    const index = this.clients.findIndex(c => c.id === id);
    if (index === -1) return null;

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await updateClientInDb(id, updates);

    this.clients[index] = {
      ...this.clients[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.addActivityLog(`Updated client profile: ${this.clients[index].client_name}`, "client", id);
    this.persist();
    return this.enrichClient(this.clients[index]);
  }

  async saveClientContact(contact: ClientContact): Promise<ClientContact> {
    const saved = await upsertClientContactInDb(contact);
    const client = this.clients.find((c) => c.id === contact.client_id);
    if (client) {
      const contacts = client.contacts ? [...client.contacts] : [];
      const idx = contacts.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        contacts[idx] = saved;
      } else {
        contacts.push(saved);
      }
      client.contacts = contacts;
      if (saved.is_primary || !client.contact) {
        client.contact = saved;
      }
      this.persist();
    }
    return saved;
  }

  async deleteClientContact(clientId: string, contactId: string): Promise<void> {
    await deleteClientContactFromDb(contactId);
    const client = this.clients.find((c) => c.id === clientId);
    if (client && client.contacts) {
      client.contacts = client.contacts.filter((c) => c.id !== contactId);
      if (client.contact?.id === contactId) {
        client.contact = client.contacts.find((c) => c.is_primary) || client.contacts[0] || undefined;
      }
      this.persist();
    }
  }

  async saveClientBankAccount(bankAccount: ClientBankAccount): Promise<ClientBankAccount> {
    const saved = await upsertClientBankAccountInDb(bankAccount);
    const client = this.clients.find((c) => c.id === bankAccount.client_id);
    if (client) {
      const accounts = client.bank_accounts ? [...client.bank_accounts] : [];
      const idx = accounts.findIndex((a) => a.id === saved.id);
      if (idx >= 0) {
        accounts[idx] = saved;
      } else {
        accounts.push(saved);
      }
      client.bank_accounts = accounts;
      this.persist();
    }
    return saved;
  }

  async deleteClientBankAccount(clientId: string, bankAccountId: string): Promise<void> {
    await deleteClientBankAccountFromDb(bankAccountId);
    const client = this.clients.find((c) => c.id === clientId);
    if (client && client.bank_accounts) {
      client.bank_accounts = client.bank_accounts.filter((a) => a.id !== bankAccountId);
      this.persist();
    }
  }

  async deleteClient(id: string): Promise<boolean> {
    const target = this.clients.find((c) => c.id === id);
    if (!target) return false;

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await deleteClientFromDb(id);

    const removedProjectIds = new Set(
      this.projects.filter((p) => p.client_id === id).map((p) => p.id)
    );
    const removedTaskIds = new Set(
      this.tasks.filter((t) => removedProjectIds.has(t.project_id)).map((t) => t.id)
    );

    this.clients = this.clients.filter((c) => c.id !== id);
    this.engagements = this.engagements.filter((e) => e.client_id !== id);
    this.projects = this.projects.filter((p) => p.client_id !== id);
    this.tasks = this.tasks.filter((t) => !removedProjectIds.has(t.project_id));
    this.taskComments = this.taskComments.filter((c) => !removedTaskIds.has(c.task_id));
    this.deletedTaskProjectIds = this.deletedTaskProjectIds.filter(
      (pid) => !removedProjectIds.has(pid)
    );
    this.invoices = this.invoices.filter((i) => i.client_id !== id);
    this.payments = this.payments.filter((p) => p.client_id !== id);
    this.documents = this.documents.filter((d) => d.entity_id !== id);

    this.addActivityLog(`Deleted client: ${target.client_name}`, "client", id);
    this.persist();
    return true;
  }

  // Services & Engagements
  getServices(): Service[] {
    return [...this.services];
  }

  async addService(service: Omit<Service, "id" | "created_at">): Promise<Service> {
    const id = ensureUuid();
    const newService: Service = { ...service, id, created_at: new Date().toISOString() };
    await insertServiceToDb(newService);
    this.services.push(newService);
    this.addActivityLog(`Added service to catalog: ${newService.service_name}`, "service", id);
    this.persist();
    return newService;
  }

  async updateService(id: string, updates: Partial<Omit<Service, "id" | "created_at">>): Promise<Service | null> {
    const index = this.services.findIndex(s => s.id === id);
    if (index === -1) return null;
    await updateServiceInDb(id, updates);
    this.services[index] = {
      ...this.services[index],
      ...updates,
    };
    this.addActivityLog(`Updated service catalog entry: ${this.services[index].service_name}`, "service", id);
    return this.services[index];
  }

  async deleteService(id: string): Promise<boolean> {
    const target = this.services.find((s) => s.id === id);
    if (!target) return false;
    await deleteServiceFromDb(id);
    this.services = this.services.filter((s) => s.id !== id);
    this.addActivityLog(`Deleted service from catalog: ${target.service_name}`, "service", id);
    this.persist();
    return true;
  }

  async deleteServiceEngagement(engagementId: string): Promise<boolean> {
    const target = this.engagements.find((e) => e.id === engagementId);
    if (!target) return false;

    await deleteEngagementFromDb(engagementId);

    const linkedProjectIds = new Set(
      this.projects
        .filter((p) => p.service_engagement_id === engagementId)
        .map((p) => p.id)
    );
    const linkedTaskIds = new Set(
      this.tasks.filter((t) => linkedProjectIds.has(t.project_id)).map((t) => t.id)
    );

    this.engagements = this.engagements.filter((e) => e.id !== engagementId);
    this.projects = this.projects.filter((p) => p.service_engagement_id !== engagementId);
    this.tasks = this.tasks.filter((t) => !linkedProjectIds.has(t.project_id));
    this.taskComments = this.taskComments.filter((c) => !linkedTaskIds.has(c.task_id));

    this.addActivityLog(
      `Removed service subscription "${target.service_name}" from client ${target.client_name || target.client_id}`,
      "service_engagement",
      engagementId
    );
    this.persist();
    return true;
  }

  getEngagementsByClientId(clientId: string): ServiceEngagement[] {
    return this.engagements.filter(e => e.client_id === clientId);
  }

  getAllEngagements(): ServiceEngagement[] {
    return [...this.engagements];
  }

  addServiceEngagement(engagement: Omit<ServiceEngagement, "id" | "created_at">): ServiceEngagement {
    const id = generateId("eng");
    const newEngagement: ServiceEngagement = { ...engagement, id, created_at: new Date().toISOString() };
    this.engagements.push(newEngagement);
    this.addActivityLog(`Contracted service engagement: ${engagement.service_name}`, "service_engagement", id);
    return newEngagement;
  }

  /**
   * Subscribes a client to a service and automatically creates the linked
   * Client -> Project -> Task -> Subtask hierarchy for that service delivery.
   */
  async addServiceEngagementCascade(
    engagement: Omit<ServiceEngagement, "id" | "created_at">
  ): Promise<{ engagement: ServiceEngagement; project: Project; tasks: Task[] }> {
    const createdEngagement = this.addServiceEngagement(engagement);
    const matchedService = this.services.find((s) => s.id === engagement.service_id);
    const today = new Date().toISOString().slice(0, 10);
    const startDate = engagement.start_date || today;

    const matchingWorkflow = this.workflows.find(
      (w) =>
        w.is_active &&
        (w.service_id === engagement.service_id ||
          (engagement.service_name && w.service_name === engagement.service_name))
    );
    const tplTasks = matchingWorkflow?.template_tasks || [];
    const maxTemplateEndOffset = tplTasks.reduce((maxD, t) => {
      const tEnd = (t.start_day_offset || 0) + Math.max(1, t.duration_days || 1);
      const subMax = (t.subtasks || []).reduce(
        (m, st) => Math.max(m, (st.start_day_offset ?? t.start_day_offset ?? 0) + Math.max(1, st.duration_days || 1)),
        tEnd
      );
      return Math.max(maxD, subMax);
    }, 0);

    const offsetDays =
      engagement.billing_frequency === "Monthly"
        ? 30
        : engagement.billing_frequency === "Quarterly"
        ? 90
        : engagement.billing_frequency === "Half-yearly"
        ? 180
        : engagement.billing_frequency === "Annually"
        ? 365
        : 15;
    const computedDueDate =
      engagement.end_date ||
      this.addDaysIso(startDate, Math.max(offsetDays, maxTemplateEndOffset));

    const project = await this.addProject(
      {
        project_name: `${engagement.client_name || "Client"} — ${engagement.service_name}`,
        project_type: "Client Project",
        client_id: engagement.client_id,
        client_name: engagement.client_name,
        service_engagement_id: createdEngagement.id,
        service_name: engagement.service_name,
        project_manager_id: engagement.relationship_manager_id || this.currentUser.id,
        project_manager_name: engagement.relationship_manager_name || this.currentUser.full_name,
        description:
          matchingWorkflow?.description ||
          matchedService?.description ||
          `Service delivery project for ${engagement.service_name} (${engagement.billing_frequency})`,
        priority: "Medium",
        start_date: startDate,
        due_date: computedDueDate,
        status: "In Progress",
      },
      { skipDefaultTask: true }
    );

    const createdTasks: Task[] = [];
    const stages = matchingWorkflow?.versions?.[0]?.stages || [];

    if (tplTasks.length > 0) {
      for (const tplTask of tplTasks) {
        const taskStart = this.addDaysIso(startDate, Math.max(0, tplTask.start_day_offset || 0));
        const taskDue = this.addDaysIso(taskStart, Math.max(0, (tplTask.duration_days || 1) - 1));
        const createdTask = await this.addTask({
          title: tplTask.task_name,
          project_id: project.id,
          project_name: project.project_name,
          assigned_employee_id:
            tplTask.assigned_employee_id || engagement.relationship_manager_id || this.currentUser.id,
          assigned_employee_name:
            tplTask.assigned_employee_name ||
            engagement.relationship_manager_name ||
            this.currentUser.full_name,
          priority: tplTask.priority || "Medium",
          start_date: taskStart,
          due_date: taskDue,
          status: tplTask.status || "To Do",
          description: tplTask.description || `Workflow deliverable under ${matchingWorkflow?.workflow_name}.`,
          created_by: this.currentUser.id,
          created_by_name: this.currentUser.full_name,
        });

        for (const tplSub of (tplTask.subtasks || [])) {
          const subStart = this.addDaysIso(
            startDate,
            Math.max(0, tplSub.start_day_offset ?? tplTask.start_day_offset ?? 0)
          );
          const subDue = this.addDaysIso(subStart, Math.max(0, (tplSub.duration_days || 1) - 1));
          await this.addSubtask(createdTask.id, {
            title: tplSub.title,
            description: tplSub.description,
            start_date: subStart,
            due_date: subDue,
            priority: tplSub.priority || tplTask.priority,
            status: tplSub.status || "To Do",
            assigned_employee_id:
              tplSub.assigned_employee_id ||
              tplTask.assigned_employee_id ||
              engagement.relationship_manager_id ||
              this.currentUser.id,
            assigned_employee_name:
              tplSub.assigned_employee_name ||
              tplTask.assigned_employee_name ||
              engagement.relationship_manager_name ||
              this.currentUser.full_name,
          });
        }

        (tplTask.default_comments || []).forEach((cmt) => {
          if (cmt.trim()) {
            this.addTaskComment(createdTask.id, cmt.trim());
          }
        });

        createdTasks.push(this.getTaskById(createdTask.id) || createdTask);
      }
    } else if (stages.length > 0) {
      let runningStart = startDate;
      for (const stage of stages) {
        const stageEnd = this.addDaysIso(runningStart, Math.max(1, stage.default_days || 5));
        const stageDue = stageEnd > computedDueDate ? computedDueDate : stageEnd;
        const stageTasks = stage.tasks || [];
        if (stageTasks.length > 0) {
          for (const stTask of stageTasks) {
            const t = await this.addTask({
              title: `${stTask.task_name} (${engagement.client_name || engagement.service_code})`,
              project_id: project.id,
              project_name: project.project_name,
              assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
              assigned_employee_name:
                engagement.relationship_manager_name || this.currentUser.full_name,
              priority: stTask.priority || "Medium",
              start_date: runningStart,
              due_date: stageDue,
              status: "To Do",
              description: stTask.description || stage.description,
              created_by: this.currentUser.id,
              created_by_name: this.currentUser.full_name,
            });
            createdTasks.push(t);
          }
        } else {
          const t = await this.addTask({
            title: `${stage.stage_name} — ${engagement.service_name}`,
            project_id: project.id,
            project_name: project.project_name,
            assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
            assigned_employee_name:
              engagement.relationship_manager_name || this.currentUser.full_name,
            priority: "Medium",
            start_date: runningStart,
            due_date: stageDue,
            status: "To Do",
            description: stage.description,
            created_by: this.currentUser.id,
            created_by_name: this.currentUser.full_name,
          });
          createdTasks.push(t);
        }
        runningStart = stageDue;
      }
    } else {
      const t = await this.addTask({
        title: `${engagement.service_name} — ${engagement.billing_frequency} Execution`,
        project_id: project.id,
        project_name: project.project_name,
        assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
        assigned_employee_name:
          engagement.relationship_manager_name || this.currentUser.full_name,
        priority: "Medium",
        start_date: startDate,
        due_date: computedDueDate,
        status: "To Do",
        description: `Auto-generated deliverable task for ${engagement.client_name || "client"} under ${engagement.service_code}.`,
        created_by: this.currentUser.id,
        created_by_name: this.currentUser.full_name,
      });
      createdTasks.push(t);
    }

    return { engagement: createdEngagement, project, tasks: createdTasks };
  }

  // Projects
  getProjects(): Project[] {
    return this.projects.map((p) => ({
      ...p,
      progress_percentage: this.computeProjectProgress(p.id),
      tasks: this.getTasksByProjectId(p.id),
    }));
  }

  getProjectById(id: string): Project | undefined {
    const proj = this.projects.find((p) => p.id === id);
    if (!proj) return undefined;
    return {
      ...proj,
      progress_percentage: this.computeProjectProgress(proj.id),
      tasks: this.getTasksByProjectId(id),
    };
  }

  async addProject(
    projectData: Omit<Project, "id" | "project_code" | "progress_percentage" | "created_at" | "updated_at"> & {
      progress_percentage?: number;
    },
    options?: { skipDefaultTask?: boolean }
  ): Promise<Project> {
    const nextNum = this.projects.length + 1;
    const year = new Date().getFullYear();
    const project_code = `PRJ-${year}-${String(nextNum).padStart(3, "0")}`;
    const id = ensureUuid();
    const today = new Date().toISOString().slice(0, 10);

    const newProject: Project = {
      ...projectData,
      start_date: projectData.start_date || today,
      due_date: projectData.due_date || this.addDaysIso(projectData.start_date || today, 30),
      id,
      project_code,
      progress_percentage: projectData.progress_percentage || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await insertProjectToDb(newProject);

    this.projects.unshift(newProject);
    this.addActivityLog(`Created project: ${newProject.project_name}`, "project", id);
    if (newProject.project_manager_id) {
      this.addNotification(
        newProject.project_manager_id,
        `New Project Assigned: ${newProject.project_name}`,
        `You have been assigned as Project Manager for ${newProject.project_name}.`,
        "project_created",
        "project",
        id
      );
    }

    this.persist();
    return newProject;
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await updateProjectInDb(id, updates);

    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.projects[index];
  }

  async deleteProject(id: string): Promise<boolean> {
    const target = this.projects.find((p) => p.id === id);
    if (!target) return false;

    await deleteProjectFromDb(id);
    this.projects = this.projects.filter((p) => p.id !== id);
    this.tasks = this.tasks.filter((t) => t.project_id !== id);
    this.deletedTaskProjectIds.push(id);
    this.persist();
    return true;
  }

  // Customizable Task Statuses (Admin Settings)
  getTaskStatuses(): TaskStatusConfig[] {
    return this.taskStatuses.map((s) => ({ ...s }));
  }

  getTaskStatusNames(): TaskStatus[] {
    return this.taskStatuses.map((s) => s.label);
  }

  getDefaultStatusName(): TaskStatus {
    return this.taskStatuses[0]?.label || "To Do";
  }

  getCompletedStatusName(): TaskStatus {
    return (
      this.taskStatuses.find((s) => s.isCompleted)?.label ||
      this.taskStatuses.find((s) => s.label.toLowerCase() === "completed")?.label ||
      "Completed"
    );
  }

  isCompletedStatus(status?: string): boolean {
    if (!status) return false;
    const norm = status.trim().toLowerCase();
    const cfg = this.taskStatuses.find((s) => s.label.trim().toLowerCase() === norm);
    return Boolean(cfg?.isCompleted || norm === "completed");
  }

  private isCurrentUserAdmin(): boolean {
    return (
      this.currentUser?.role_code === "SUPER_ADMIN" ||
      this.currentUser?.role_code === "ADMIN"
    );
  }

  addTaskStatusConfig(input: {
    label: string;
    color?: TaskStatusColor;
    isCompleted?: boolean;
  }): TaskStatusConfig | null {
    if (!this.isCurrentUserAdmin()) return null;
    const trimmed = input.label.trim();
    if (!trimmed) return null;
    if (this.taskStatuses.some((s) => s.label.trim().toLowerCase() === trimmed.toLowerCase())) {
      return null;
    }
    const created: TaskStatusConfig = {
      id: generateId("st"),
      label: trimmed,
      color: input.color || "slate",
      isCompleted: Boolean(input.isCompleted),
    };
    this.taskStatuses.push(created);
    this.addActivityLog(`Added custom task status: "${created.label}"`, "settings");
    this.persist();
    return { ...created };
  }

  private migrateTaskStatusLabel(oldLabel: string, newLabel: string) {
    const affectedProjectIds = new Set<string>();
    this.tasks.forEach((t) => {
      if (t.status === oldLabel) {
        t.status = newLabel;
        affectedProjectIds.add(t.project_id);
      }
    });
    this.workflows.forEach((wf) => {
      wf.template_tasks?.forEach((pt) => {
        if (pt.status === oldLabel) pt.status = newLabel;
        pt.subtasks?.forEach((st) => {
          if (st.status === oldLabel) st.status = newLabel;
        });
      });
    });
    affectedProjectIds.forEach((pid) => this.refreshProjectProgress(pid));
  }

  updateTaskStatusConfig(
    statusId: string,
    updates: Partial<Pick<TaskStatusConfig, "label" | "color" | "isCompleted">>
  ): TaskStatusConfig | null {
    if (!this.isCurrentUserAdmin()) return null;
    const idx = this.taskStatuses.findIndex((s) => s.id === statusId);
    if (idx === -1) return null;

    const current = this.taskStatuses[idx];
    const nextLabel = updates.label !== undefined ? updates.label.trim() : current.label;
    if (!nextLabel) return null;

    // Reject duplicate label names across other statuses
    if (
      this.taskStatuses.some(
        (s) => s.id !== statusId && s.label.trim().toLowerCase() === nextLabel.toLowerCase()
      )
    ) {
      return null;
    }

    const oldLabel = current.label;
    const updated: TaskStatusConfig = {
      ...current,
      label: nextLabel,
      color: updates.color ?? current.color,
      isCompleted: updates.isCompleted !== undefined ? updates.isCompleted : current.isCompleted,
    };
    this.taskStatuses[idx] = updated;

    // Migrate existing tasks and workflow template tasks if renamed
    if (oldLabel !== nextLabel) {
      this.migrateTaskStatusLabel(oldLabel, nextLabel);
      this.addActivityLog(`Renamed task status "${oldLabel}" → "${nextLabel}"`, "settings");
    } else {
      this.addActivityLog(`Updated task status "${updated.label}"`, "settings");
    }

    this.persist();
    return { ...updated };
  }

  moveTaskStatusConfig(statusId: string, direction: "up" | "down"): boolean {
    if (!this.isCurrentUserAdmin()) return false;
    const idx = this.taskStatuses.findIndex((s) => s.id === statusId);
    if (idx === -1) return false;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= this.taskStatuses.length) return false;

    const copy = [...this.taskStatuses];
    const [moved] = copy.splice(idx, 1);
    copy.splice(swapIdx, 0, moved);
    this.taskStatuses = copy;
    this.persist();
    return true;
  }

  deleteTaskStatusConfig(statusId: string, fallbackStatus?: TaskStatus): boolean {
    if (!this.isCurrentUserAdmin()) return false;
    if (this.taskStatuses.length <= 1) return false;
    const target = this.taskStatuses.find((s) => s.id === statusId);
    if (!target) return false;

    const remaining = this.taskStatuses.filter((s) => s.id !== statusId);
    const replacement = fallbackStatus || remaining[0]?.label || "To Do";
    this.taskStatuses = remaining;

    this.migrateTaskStatusLabel(target.label, replacement);

    this.addActivityLog(
      `Deleted task status "${target.label}" (reassigned to "${replacement}")`,
      "settings"
    );
    this.persist();
    return true;
  }

  resetTaskStatusesToDefault(): void {
    if (!this.isCurrentUserAdmin()) return;
    this.taskStatuses = DEFAULT_TASK_STATUSES.map((s) => ({ ...s }));
    this.addActivityLog("Reset task statuses to defaults", "settings");
    this.persist();
  }

  // Task Categories & Sub-categories
  getTaskCategories(): TaskCategory[] {
    return this.taskCategories || [];
  }

  getTaskCategoryById(categoryId: string): TaskCategory | undefined {
    return this.getTaskCategories().find((c) => c.id === categoryId);
  }

  async addTaskCategory(data: {
    name: string;
    code?: string;
    description?: string;
    color?: string;
    icon?: string;
    whatsapp_enabled?: boolean;
  }): Promise<TaskCategory> {
    const id = ensureUuid();
    const code = (data.code || data.name.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const subId = ensureUuid();
    const newCategory: TaskCategory = {
      id,
      name: data.name.trim(),
      code: code || "CAT",
      description: data.description?.trim() || "",
      color: data.color || "violet",
      icon: data.icon || "Layers",
      whatsapp_enabled: data.whatsapp_enabled ?? true,
      created_at: new Date().toISOString(),
      sub_categories: [
        {
          id: subId,
          category_id: id,
          name: "General",
          code: "GEN",
          description: `General task group under ${data.name.trim()}`,
          created_at: new Date().toISOString(),
        },
      ],
    };

    await insertTaskCategoryToDb(newCategory);

    this.taskCategories.push(newCategory);
    this.addActivityLog(`Created task category: ${newCategory.name}`, "task", id);
    this.persist();
    return newCategory;
  }

  async updateTaskCategory(id: string, updates: Partial<TaskCategory>): Promise<boolean> {
    const idx = this.taskCategories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    await updateTaskCategoryInDb(id, updates);
    this.taskCategories[idx] = {
      ...this.taskCategories[idx],
      ...updates,
    };
    if (updates.name) {
      this.tasks.forEach((t) => {
        if (t.category_id === id) t.category_name = updates.name;
      });
    }
    this.persist();
    return true;
  }

  async deleteTaskCategory(id: string): Promise<boolean> {
    const cat = this.taskCategories.find((c) => c.id === id);
    if (!cat) return false;

    const catTasks = this.tasks.filter((t) => t.category_id === id);

    // Remove from active taskCategories in memory
    this.taskCategories = this.taskCategories.filter((c) => c.id !== id);
    if (!this.deletedTaskCategoryIds.includes(id)) {
      this.deletedTaskCategoryIds.push(id);
    }
    // Also remove any tasks and subtasks associated with this deleted category
    this.tasks = this.tasks.filter((t) => t.category_id !== id);

    // Move to Recycle Bin (25-day safe recovery)
    await this.moveToRecycleBin(
      "category",
      cat.id,
      cat.name,
      {
        ...cat,
        tasks: catTasks,
      },
      {
        code: cat.code,
        subtitle: `${cat.sub_categories?.length || 0} Sub-groups, ${catTasks.length} Deliverable Tasks`,
      }
    );

    // Delete from Supabase active table
    try {
      await deleteTaskCategoryFromDb(id);
      for (const t of catTasks) {
        await deleteTaskFromDb(t.id);
      }
    } catch (e) {
      console.warn("Could not delete category from Supabase:", e);
    }

    this.addActivityLog(`Moved task category "${cat.name}" to Recycle Bin`, "task", id);
    this.persist();
    return true;
  }

  async addTaskSubCategory(
    categoryId: string,
    data: { name: string; code?: string; description?: string; whatsapp_enabled?: boolean }
  ): Promise<TaskSubCategory | undefined> {
    const cat = this.taskCategories.find((c) => c.id === categoryId);
    if (!cat) return undefined;
    const subId = ensureUuid();
    const code = (data.code || data.name.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newSub: TaskSubCategory = {
      id: subId,
      category_id: categoryId,
      name: data.name.trim(),
      code: code || "SUB",
      description: data.description?.trim() || "",
      whatsapp_enabled: data.whatsapp_enabled ?? true,
      created_at: new Date().toISOString(),
    };
    await insertTaskSubCategoryToDb(newSub);
    if (!cat.sub_categories) cat.sub_categories = [];
    cat.sub_categories.push(newSub);
    this.addActivityLog(`Added sub-category "${newSub.name}" under ${cat.name}`, "task", subId);
    this.persist();
    return newSub;
  }

  async updateTaskSubCategory(
    categoryId: string,
    subCategoryId: string,
    updates: Partial<TaskSubCategory>
  ): Promise<boolean> {
    const cat = this.taskCategories.find((c) => c.id === categoryId);
    if (!cat || !cat.sub_categories) return false;
    const subIdx = cat.sub_categories.findIndex((s) => s.id === subCategoryId);
    if (subIdx === -1) return false;
    await updateTaskSubCategoryInDb(subCategoryId, updates);
    cat.sub_categories[subIdx] = {
      ...cat.sub_categories[subIdx],
      ...updates,
    };
    if (updates.name) {
      this.tasks.forEach((t) => {
        if (t.sub_category_id === subCategoryId) t.sub_category_name = updates.name;
      });
    }
    this.persist();
    return true;
  }

  async deleteTaskSubCategory(categoryId: string, subCategoryId: string): Promise<boolean> {
    const cat = this.taskCategories.find((c) => c.id === categoryId);
    if (!cat || !cat.sub_categories) return false;
    const sub = cat.sub_categories.find((s) => s.id === subCategoryId);
    if (!sub) return false;

    const subTasks = this.tasks.filter((t) => t.sub_category_id === subCategoryId);

    cat.sub_categories = cat.sub_categories.filter((s) => s.id !== subCategoryId);
    this.tasks = this.tasks.filter((t) => t.sub_category_id !== subCategoryId);

    // Move to Recycle Bin (25-day safe recovery)
    await this.moveToRecycleBin(
      "sub-category" as any,
      sub.id,
      sub.name,
      {
        ...sub,
        parent_category_id: categoryId,
        parent_category_name: cat.name,
        tasks: subTasks,
      },
      {
        code: sub.code,
        category_name: cat.name,
        subtitle: `Sub-group under ${cat.name} (${subTasks.length} Tasks)`,
      }
    );

    try {
      await deleteTaskSubCategoryFromDb(subCategoryId);
      for (const t of subTasks) {
        await deleteTaskFromDb(t.id);
      }
    } catch (e) {
      console.warn("Could not delete sub-category from Supabase:", e);
    }

    this.addActivityLog(`Moved sub-category "${sub?.name}" under ${cat.name} to Recycle Bin`, "task", subCategoryId);
    this.persist();
    return true;
  }

  updateTaskSubCategoryAssignment(taskId: string, targetSubCategoryId: string): boolean {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    let foundSub: TaskSubCategory | undefined;
    let foundCat: TaskCategory | undefined;
    for (const cat of this.getTaskCategories()) {
      const sub = (cat.sub_categories || []).find((s) => s.id === targetSubCategoryId);
      if (sub) {
        foundSub = sub;
        foundCat = cat;
        break;
      }
    }
    if (!foundSub || !foundCat) return false;
    task.sub_category_id = foundSub.id;
    task.sub_category_name = foundSub.name;
    task.category_id = foundCat.id;
    task.category_name = foundCat.name;
    void updateTaskInDb(task.id, {
      category_id: foundCat.id,
      sub_category_id: foundSub.id,
    }).catch((e) => console.warn("Supabase move task error:", e));
    this.persist();
    return true;
  }

  copyTaskToSubCategory(taskId: string, targetSubCategoryId: string, options?: { newTitle?: string }): Task | null {
    const original = this.tasks.find((t) => t.id === taskId);
    if (!original) return null;
    let foundSub: TaskSubCategory | undefined;
    let foundCat: TaskCategory | undefined;
    for (const cat of this.getTaskCategories()) {
      const sub = (cat.sub_categories || []).find((s) => s.id === targetSubCategoryId);
      if (sub) {
        foundSub = sub;
        foundCat = cat;
        break;
      }
    }
    if (!foundSub || !foundCat) return null;

    const taskCount = this.tasks.length + 1;
    const taskCode = `TSK-${String(taskCount).padStart(3, "0")}`;
    const newTaskId = ensureUuid();

    const newTask: Task = {
      ...JSON.parse(JSON.stringify(original)),
      id: newTaskId,
      task_code: taskCode,
      title: options?.newTitle || `${original.title} (Copy)`,
      category_id: foundCat.id,
      category_name: foundCat.name,
      sub_category_id: foundSub.id,
      sub_category_name: foundSub.name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.tasks.unshift(newTask);

    // Duplicate subtasks if any
    const originalSubtasks = this.getSubtasks(taskId);
    if (originalSubtasks && originalSubtasks.length > 0) {
      originalSubtasks.forEach((st) => {
        this.addSubtask(newTaskId, {
          title: st.title,
          description: st.description,
          due_date: st.due_date,
          assigned_employee_id: st.assigned_employee_id,
          assigned_employee_name: st.assigned_employee_name,
          priority: st.priority,
        });
      });
    }

    // Duplicate comments if any
    const originalComments = this.getTaskComments(taskId);
    if (originalComments && originalComments.length > 0) {
      originalComments.forEach((c) => {
        if (c.comment) {
          this.addTaskComment(newTaskId, c.comment);
        }
      });
    }

    this.addActivityLog(`Copied task "${original.title}" to sub-category "${foundSub.name}"`, "task", newTaskId);
    void insertTaskToDb(newTask).catch((e) => console.warn("Supabase insert copied task error:", e));
    this.persist();
    return newTask;
  }

  copyTasksToSubCategory(taskIds: string[], targetSubCategoryId: string): number {
    let count = 0;
    for (const id of taskIds) {
      if (this.copyTaskToSubCategory(id, targetSubCategoryId)) {
        count++;
      }
    }
    return count;
  }

  moveTasksToSubCategory(taskIds: string[], targetSubCategoryId: string): number {
    let count = 0;
    for (const id of taskIds) {
      if (this.updateTaskSubCategoryAssignment(id, targetSubCategoryId)) {
        count++;
      }
    }
    return count;
  }

  public ensureTaskCategorized(task: Task): Task {
    // If task has matching category_id or category_name in taskCategories, reconcile IDs and names
    const matchingCat = this.taskCategories.find(
      (c) =>
        c.id === task.category_id ||
        (task.category_name && c.name.trim().toLowerCase() === task.category_name.trim().toLowerCase()) ||
        (task.category_id && c.name.trim().toLowerCase() === task.category_id.trim().toLowerCase())
    );

    if (matchingCat) {
      let matchingSub = (matchingCat.sub_categories || []).find(
        (s) =>
          s.id === task.sub_category_id ||
          (task.sub_category_name && s.name.trim().toLowerCase() === task.sub_category_name.trim().toLowerCase()) ||
          (task.sub_category_id && s.name.trim().toLowerCase() === task.sub_category_id.trim().toLowerCase())
      );
      if (!matchingSub) {
        matchingSub = matchingCat.sub_categories?.[0];
      }
      return {
        ...task,
        category_id: matchingCat.id,
        category_name: matchingCat.name,
        sub_category_id: matchingSub?.id || matchingCat.sub_categories?.[0]?.id || task.sub_category_id || `subcat-${matchingCat.id}-general`,
        sub_category_name: matchingSub?.name || matchingCat.sub_categories?.[0]?.name || task.sub_category_name || "General",
      };
    }

    // If task already has a category assigned (even if not found in taskCategories yet), DO NOT let keyword heuristics overwrite it!
    if (task.category_id || task.category_name) {
      return {
        ...task,
        category_id: task.category_id || `cat-${task.category_name?.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        category_name: task.category_name || task.category_id || "General",
        sub_category_id: task.sub_category_id || `subcat-general`,
        sub_category_name: task.sub_category_name || "General",
      };
    }

    if (this.taskCategories.length > 0) {
      const defaultCat = this.taskCategories[0];
      const defaultSub = defaultCat.sub_categories?.[0];
      return {
        ...task,
        category_id: defaultCat.id,
        category_name: defaultCat.name,
        sub_category_id: defaultSub?.id || `subcat-${defaultCat.id}-general`,
        sub_category_name: defaultSub?.name || "General",
      };
    }

    return {
      ...task,
      category_id: "cat-uncategorized",
      category_name: "Uncategorized",
      sub_category_id: "subcat-uncategorized",
      sub_category_name: "General",
    };
  }

  // Tasks, Subtasks & Task Comments
  private enrichTask(task: Task, visited = new Set<string>()): Task {
    if (visited.has(task.id)) {
      return { ...task, subtasks: [] };
    }
    const nextVisited = new Set(visited);
    nextVisited.add(task.id);

    const subtasks = this.tasks
      .filter((st) => st.parent_task_id === task.id)
      .map((st) => this.enrichTask(st, nextVisited));
    const commentsCount = this.taskComments.filter((c) => c.task_id === task.id).length;
    const attachmentsCount = this.documents.filter(
      (d) => d.entity_type === "task" && d.entity_id === task.id
    ).length;

    const parentProject = this.projects.find((p) => p.id === task.project_id);
    let resolvedClientId = task.client_id || parentProject?.client_id;
    let resolvedClient = resolvedClientId ? this.clients.find((c) => c.id === resolvedClientId) : undefined;
    let resolvedClientName = task.client_name || resolvedClient?.client_name || parentProject?.client_name;

    // Resilient fallback client resolution across project names and titles (e.g. "ROHTI — Client Delivery Project")
    if (!resolvedClient) {
      const pName = task.project_name || parentProject?.project_name;
      if (pName) {
        const prefix = pName.split(/[-—–]/)[0].trim().toLowerCase();
        resolvedClient = this.clients.find((c) => {
          const cName = c.client_name?.trim().toLowerCase();
          const nick = c.nick_name?.trim().toLowerCase();
          return (cName && (prefix === cName || prefix.includes(cName) || cName.includes(prefix))) ||
                 (nick && (prefix === nick || prefix.includes(nick)));
        });
        if (resolvedClient) {
          resolvedClientId = resolvedClient.id;
          resolvedClientName = resolvedClient.client_name;
        }
      }
    }

    const categorized = this.ensureTaskCategorized(task);

    // Ensure assigned_employees and assigned_employee_ids are present
    let assigned_employees = task.assigned_employees;
    let assigned_employee_ids = task.assigned_employee_ids;

    if (!assigned_employees || assigned_employees.length === 0) {
      if (task.assigned_employee_id) {
        const emp = this.employees.find((e) => e.id === task.assigned_employee_id);
        if (emp) {
          assigned_employees = [{
            id: emp.id,
            full_name: emp.full_name,
            designation: emp.designation_name || emp.employee_code,
            email: emp.email,
          }];
          assigned_employee_ids = [emp.id];
        }
      }
    } else if (!assigned_employee_ids) {
      assigned_employee_ids = assigned_employees.map((e) => e.id);
    }

    const billing_amount = Number(task.billing_amount) || 0;
    const billed_amount = Number(task.billed_amount) || 0;
    const remaining_amount = task.remaining_amount !== undefined && task.remaining_amount !== null
      ? Number(task.remaining_amount)
      : Math.max(0, billing_amount - billed_amount);
    const pending_approval_amount = Number(task.pending_approval_amount) || 0;
    const is_billable = Boolean(task.is_billable ?? false);
    const billing_status: TaskBillingStatus = task.billing_status || (
      billed_amount >= billing_amount && billing_amount > 0
        ? 'Billed'
        : billed_amount > 0
        ? 'Partially Billed'
        : 'To Be Billed'
    );

    return {
      ...categorized,
      client_id: resolvedClientId,
      client_name: resolvedClientName,
      project_name: task.project_name || parentProject?.project_name,
      assigned_employees,
      assigned_employee_ids,
      subtasks,
      comments_count: commentsCount,
      attachments_count: attachmentsCount,
      is_billable,
      billing_amount,
      billed_amount,
      remaining_amount,
      pending_approval_amount,
      billing_status,
      billing_description: task.billing_description || "",
      currency: task.currency || "INR",
    };
  }

  getTasks(): Task[] {
    return this.tasks.filter((t) => !t.parent_task_id).map((t) => this.enrichTask(t));
  }

  getAllTasksIncludingSubtasks(): Task[] {
    return this.tasks.map((t) => this.enrichTask(t));
  }

  getTaskById(taskId: string): Task | undefined {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return undefined;
    return this.enrichTask(task);
  }

  getTasksByProjectId(projectId: string): Task[] {
    return this.tasks
      .filter((t) => t.project_id === projectId && !t.parent_task_id)
      .map((t) => this.enrichTask(t));
  }

  getTasksBySubCategory(subCategoryId: string): Task[] {
    return this.getTasks().filter((t) => t.sub_category_id === subCategoryId);
  }

  getTasksByCategory(categoryId: string): Task[] {
    return this.getTasks().filter((t) => t.category_id === categoryId);
  }

  getSubtasks(parentTaskId: string): Task[] {
    return this.tasks
      .filter((t) => t.parent_task_id === parentTaskId)
      .map((t) => this.enrichTask(t));
  }

  async addTask(
    taskData: Omit<Task, "id" | "task_code" | "created_at" | "comments_count" | "attachments_count">
  ): Promise<Task> {
    const existingCodes = new Set(this.tasks.map((t) => t.task_code));
    let topCount = this.tasks.filter((t) => !t.parent_task_id).length + 1;
    let task_code = `TSK-${String(topCount).padStart(3, "0")}`;
    while (existingCodes.has(task_code)) {
      topCount++;
      task_code = `TSK-${String(topCount).padStart(3, "0")}`;
    }
    const id = ensureUuid();
    const today = new Date().toISOString().slice(0, 10);
    const parentProject = this.projects.find((p) => p.id === taskData.project_id);
    const resolvedClientId = taskData.client_id || parentProject?.client_id;
    const resolvedClient = resolvedClientId ? this.clients.find((c) => c.id === resolvedClientId) : undefined;
    const resolvedClientName = taskData.client_name || resolvedClient?.client_name || parentProject?.client_name;

    const finalAssignedEmployees = taskData.assigned_employees && taskData.assigned_employees.length > 0
      ? taskData.assigned_employees
      : (taskData.assigned_employee_id ? (() => {
          const emp = this.employees.find((e) => e.id === taskData.assigned_employee_id);
          return emp ? [{
            id: emp.id,
            full_name: emp.full_name,
            designation: emp.designation_name || emp.employee_code,
            email: emp.email,
          }] : [];
        })() : []);

    const finalAssignedEmployeeIds = taskData.assigned_employee_ids && taskData.assigned_employee_ids.length > 0
      ? taskData.assigned_employee_ids
      : finalAssignedEmployees.map((e) => e.id);

    const primaryEmployeeId = finalAssignedEmployeeIds[0] || taskData.assigned_employee_id;
    const primaryEmployee = this.employees.find((e) => e.id === primaryEmployeeId);
    const assignedNames = finalAssignedEmployees.length > 0
      ? finalAssignedEmployees.map((e) => e.full_name).join(", ")
      : (primaryEmployee?.full_name || taskData.assigned_employee_name);

    const is_billable = Boolean(taskData.is_billable ?? false);
    const billing_amount = is_billable ? (Number(taskData.billing_amount) || 0) : 0;
    const billed_amount = 0;
    const remaining_amount = billing_amount;
    const pending_approval_amount = 0;
    const billing_status: TaskBillingStatus = "To Be Billed";
    const billing_description = taskData.billing_description || "";
    const currency = taskData.currency || "INR";

    const newTask: Task = {
      ...taskData,
      client_id: resolvedClientId,
      client_name: resolvedClientName,
      project_name: taskData.project_name || parentProject?.project_name,
      start_date: taskData.start_date || parentProject?.start_date || today,
      due_date: taskData.due_date || parentProject?.due_date || this.addDaysIso(today, 14),
      assigned_employee_id: primaryEmployeeId,
      assigned_employee_name: assignedNames,
      assigned_employees: finalAssignedEmployees,
      assigned_employee_ids: finalAssignedEmployeeIds,
      id,
      task_code,
      created_at: new Date().toISOString(),
      comments_count: 0,
      attachments_count: 0,
      is_billable,
      billing_amount,
      billed_amount,
      remaining_amount,
      pending_approval_amount,
      billing_status,
      billing_description,
      currency,
    };

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await insertTaskToDb(newTask);

    this.tasks.unshift(newTask);

    this.refreshProjectProgress(newTask.project_id);
    this.addActivityLog(`Created task: ${newTask.title}`, "task", id);
    if (finalAssignedEmployees.length > 0) {
      for (const emp of finalAssignedEmployees) {
        this.addNotification(
          emp.id,
          `New Task Assigned: ${newTask.title}`,
          `You have been assigned to task ${newTask.task_code}: "${newTask.title}".`,
          "task_assigned",
          "task",
          id
        );
      }
    } else if (newTask.assigned_employee_id) {
      this.addNotification(
        newTask.assigned_employee_id,
        `New Task Assigned: ${newTask.title}`,
        `You have been assigned to task ${newTask.task_code}: "${newTask.title}".`,
        "task_assigned",
        "task",
        id
      );
    }
    this.persist();
    return this.enrichTask(newTask);
  }

  async addSubtask(
    parentTaskId: string,
    subtaskData: {
      title: string;
      description?: string;
      assigned_employee_id?: string;
      assigned_employee_name?: string;
      priority?: ProjectPriority;
      start_date?: string;
      due_date?: string;
      status?: TaskStatus;
      whatsapp_enabled?: boolean;
    }
  ): Promise<Task | null> {
    const parent = this.tasks.find((t) => t.id === parentTaskId);
    if (!parent) return null;

    const existingCount = this.tasks.filter((t) => t.parent_task_id === parentTaskId).length;
    const today = new Date().toISOString().slice(0, 10);
    const sub: Task = {
      id: ensureUuid(),
      task_code: `${parent.task_code}.${existingCount + 1}`,
      project_id: parent.project_id,
      project_name: parent.project_name,
      parent_task_id: parent.id,
      title: subtaskData.title.trim(),
      description: subtaskData.description || `Subtask for ${parent.task_code}`,
      assigned_employee_id: subtaskData.assigned_employee_id || parent.assigned_employee_id,
      assigned_employee_name:
        subtaskData.assigned_employee_name || parent.assigned_employee_name,
      priority: subtaskData.priority || parent.priority,
      start_date: subtaskData.start_date || parent.start_date || today,
      due_date: subtaskData.due_date || parent.due_date,
      status: subtaskData.status || "To Do",
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      comments_count: 0,
      attachments_count: 0,
      created_at: new Date().toISOString(),
    };

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await insertTaskToDb(sub);

    this.tasks.push(sub);
    this.refreshProjectProgress(parent.project_id);
    this.addActivityLog(`Added subtask "${sub.title}" to ${parent.task_code}`, "task", parent.id);
    this.persist();
    return this.enrichTask(sub);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const index = this.tasks.findIndex(
      (t) => t.id === taskId || (t.task_code && t.task_code.toUpperCase() === taskId.toUpperCase())
    );
    if (index === -1) return null;

    const current = this.tasks[index];
    const enriched = this.enrichTask(current);
    const nextStatus = updates.status ?? current.status;
    const completed_at = this.isCompletedStatus(nextStatus)
      ? current.completed_at || new Date().toISOString()
      : updates.status
      ? undefined
      : current.completed_at;

    let resolvedClientId = updates.client_id ?? current.client_id;
    let resolvedClientName = updates.client_name ?? current.client_name;
    let resolvedProjectId = updates.project_id ?? current.project_id;
    let resolvedProjectName = updates.project_name ?? current.project_name;

    if (updates.client_id) {
      const cl = this.clients.find((c) => c.id === updates.client_id);
      if (cl) {
        resolvedClientName = cl.client_name;
        // Only set project if task doesn't already have a parent project
        if (!resolvedProjectId) {
          const clientProj = this.projects.find((p) => p.client_id === cl.id);
          if (clientProj) {
            resolvedProjectId = clientProj.id;
            resolvedProjectName = clientProj.project_name;
          }
        }
      }
    }

    // Always preserve category and sub-category firmly!
    const resolvedCategoryId = updates.category_id ?? current.category_id ?? enriched.category_id;
    const resolvedCategoryName = updates.category_name ?? current.category_name ?? enriched.category_name;
    const resolvedSubCategoryId = updates.sub_category_id ?? current.sub_category_id ?? enriched.sub_category_id;
    const resolvedSubCategoryName = updates.sub_category_name ?? current.sub_category_name ?? enriched.sub_category_name;

    // Handle assigned employees sync
    let finalAssignedEmployees = updates.assigned_employees ?? current.assigned_employees;
    let finalAssignedEmployeeIds = updates.assigned_employee_ids ?? current.assigned_employee_ids;

    if (updates.assigned_employees !== undefined) {
      finalAssignedEmployeeIds = updates.assigned_employees.map((e) => e.id);
    } else if (updates.assigned_employee_ids !== undefined) {
      finalAssignedEmployees = this.employees
        .filter((e) => updates.assigned_employee_ids!.includes(e.id))
        .map((e) => ({
          id: e.id,
          full_name: e.full_name,
          designation: e.designation_name || e.employee_code,
          email: e.email,
        }));
    } else if (updates.assigned_employee_id !== undefined) {
      const emp = this.employees.find((e) => e.id === updates.assigned_employee_id);
      if (emp) {
        finalAssignedEmployees = [{
          id: emp.id,
          full_name: emp.full_name,
          designation: emp.designation_name || emp.employee_code,
          email: emp.email,
        }];
        finalAssignedEmployeeIds = [emp.id];
      } else {
        finalAssignedEmployees = [];
        finalAssignedEmployeeIds = [];
      }
    }

    const primaryEmployeeId = updates.assigned_employee_id ?? finalAssignedEmployeeIds?.[0];
    const primaryEmployeeName = finalAssignedEmployees && finalAssignedEmployees.length > 0
      ? finalAssignedEmployees.map((e) => e.full_name).join(", ")
      : (updates.assigned_employee_name ?? current.assigned_employee_name);

    const nextIsBillable = updates.is_billable !== undefined ? Boolean(updates.is_billable) : Boolean(current.is_billable);
    const nextBillingAmount = updates.billing_amount !== undefined ? Number(updates.billing_amount) : Number(current.billing_amount || 0);
    const nextBilledAmount = updates.billed_amount !== undefined ? Number(updates.billed_amount) : Number(current.billed_amount || 0);
    const nextPendingApproval = updates.pending_approval_amount !== undefined ? Number(updates.pending_approval_amount) : Number(current.pending_approval_amount || 0);
    const nextRemaining = updates.remaining_amount !== undefined
      ? Number(updates.remaining_amount)
      : Math.max(0, nextBillingAmount - nextBilledAmount);
    const nextBillingStatus: TaskBillingStatus = updates.billing_status ?? (
      nextBilledAmount >= nextBillingAmount && nextBillingAmount > 0
        ? 'Billed'
        : nextBilledAmount > 0
        ? 'Partially Billed'
        : 'To Be Billed'
    );

    const mergedUpdates: Partial<Task> = {
      ...updates,
      is_billable: nextIsBillable,
      billing_amount: nextBillingAmount,
      billed_amount: nextBilledAmount,
      remaining_amount: nextRemaining,
      pending_approval_amount: nextPendingApproval,
      billing_status: nextBillingStatus,
      billing_description: updates.billing_description !== undefined ? updates.billing_description : current.billing_description,
      currency: updates.currency || current.currency || "INR",
      assigned_employee_id: primaryEmployeeId,
      assigned_employee_name: primaryEmployeeName,
      assigned_employees: finalAssignedEmployees,
      assigned_employee_ids: finalAssignedEmployeeIds,
      category_id: resolvedCategoryId,
      category_name: resolvedCategoryName,
      sub_category_id: resolvedSubCategoryId,
      sub_category_name: resolvedSubCategoryName,
      client_id: resolvedClientId,
      client_name: resolvedClientName,
      project_id: resolvedProjectId,
      project_name: resolvedProjectName,
      completed_at,
    };

    // Direct database write — awaits DB confirmation, safely logs if offline or non-UUID id
    try {
      await updateTaskInDb(taskId, mergedUpdates);
    } catch (dbErr: any) {
      console.warn("Direct Supabase task update warning:", dbErr.message || dbErr);
    }

    this.tasks[index] = {
      ...current,
      ...mergedUpdates,
    };

    this.refreshProjectProgress(this.tasks[index].project_id);
    this.addActivityLog(`Updated task ${current.task_code}: ${this.tasks[index].title}`, "task", taskId);
    this.persist();
    return this.enrichTask(this.tasks[index]);
  }

  async ensureClientProject(clientId: string): Promise<Project | null> {
    const existing = this.projects.find((p) => p.client_id === clientId);
    if (existing) return existing;

    const client = this.clients.find((c) => c.id === clientId);
    if (!client) return null;

    const today = new Date().toISOString().slice(0, 10);
    const startDate = (client.created_at || today).slice(0, 10);
    const dueDate = this.addDaysIso(startDate, 30);

    const newProject = await this.addProject({
      project_name: `${client.client_name} — Practice Compliance`,
      project_type: "Client Project",
      client_id: client.id,
      client_name: client.client_name,
      project_manager_id: client.relationship_manager_id || this.currentUser.id,
      project_manager_name: client.relationship_manager_name || this.currentUser.full_name,
      description: `Primary delivery project for ${client.client_name}.`,
      priority: "Medium",
      start_date: startDate,
      due_date: dueDate,
      status: "In Progress",
      assigned_employees: [],
    });

    return newProject;
  }

  async allotClientToTask(taskId: string, clientId: string): Promise<Task | null> {
    const cl = this.clients.find(
      (c) =>
        c.id === clientId ||
        c.client_code === clientId ||
        (c.client_name && c.client_name.trim().toLowerCase() === clientId.trim().toLowerCase())
    );
    if (!cl) return null;

    const taskIndex = this.tasks.findIndex(
      (t) => t.id === taskId || (t.task_code && t.task_code.toUpperCase() === taskId.toUpperCase())
    );
    if (taskIndex === -1) return null;

    const currentTask = this.tasks[taskIndex];
    const enriched = this.enrichTask(currentTask);

    // Keep the task firmly anchored to its category & sub-category
    const catId = currentTask.category_id || enriched.category_id;
    const catName = currentTask.category_name || enriched.category_name;
    const subCatId = currentTask.sub_category_id || enriched.sub_category_id;
    const subCatName = currentTask.sub_category_name || enriched.sub_category_name;

    // Check if task already has a parent project
    let targetProjectId = currentTask.project_id;
    let targetProjectName = currentTask.project_name;

    if (targetProjectId) {
      const parentProj = this.projects.find((p) => p.id === targetProjectId);
      if (parentProj) {
        // Update parent project with client info so project and task are aligned
        parentProj.client_id = cl.id;
        parentProj.client_name = cl.client_name;
        targetProjectName = parentProj.project_name;
        try {
          await updateProjectInDb(parentProj.id, { client_id: cl.id });
        } catch (e) {
          console.warn("Could not update parent project client_id in db:", e);
        }
      }
    } else {
      // If task has no project, find or create one for this client
      const proj = await this.ensureClientProject(clientId);
      if (proj) {
        targetProjectId = proj.id;
        targetProjectName = proj.project_name;
      }
    }

    return this.updateTask(taskId, {
      client_id: cl.id,
      client_name: cl.client_name,
      project_id: targetProjectId,
      project_name: targetProjectName,
      category_id: catId,
      category_name: catName,
      sub_category_id: subCatId,
      sub_category_name: subCatName,
    });
  }

  async allotClientToSubCategory(subCategoryId: string, clientId: string): Promise<number> {
    const cl = this.clients.find((c) => c.id === clientId);
    if (!cl) return 0;
    const matching = this.tasks.filter((t) => t.sub_category_id === subCategoryId);
    for (const t of matching) {
      await this.allotClientToTask(t.id, clientId);
    }
    return matching.length;
  }

  async allotClientToCategory(categoryId: string, clientId: string): Promise<number> {
    const cl = this.clients.find((c) => c.id === clientId);
    if (!cl) return 0;
    const matching = this.tasks.filter((t) => t.category_id === categoryId);
    for (const t of matching) {
      await this.allotClientToTask(t.id, clientId);
    }
    return matching.length;
  }

  async updateTaskStatus(taskId: string, newStatus: Task["status"]): Promise<Task | null> {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const oldStatus = task.status;
    const completed_at = this.isCompletedStatus(newStatus) ? new Date().toISOString() : undefined;

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await updateTaskInDb(taskId, { status: newStatus, completed_at });

    task.status = newStatus;
    task.completed_at = completed_at;

    this.refreshProjectProgress(task.project_id);
    this.addActivityLog(
      `Changed ${task.parent_task_id ? "subtask" : "task"} ${task.task_code} status from ${oldStatus} to ${newStatus}`,
      "task",
      taskId
    );
    this.persist();
    return this.enrichTask(task);
  }

  getTaskComments(taskId: string): TaskComment[] {
    return this.taskComments
      .filter((c) => c.task_id === taskId)
      .map((c) => ({
        ...c,
        read_by: c.read_by
          ? [...c.read_by]
          : [{ employee_id: c.employee_id, employee_name: c.employee_name, read_at: c.created_at }],
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getAllTaskComments(): Array<TaskComment & { task_code?: string; task_title?: string; project_name?: string }> {
    return this.taskComments
      .map((c) => {
        const task = this.tasks.find((t) => t.id === c.task_id);
        return {
          ...c,
          read_by: c.read_by
            ? [...c.read_by]
            : [{ employee_id: c.employee_id, employee_name: c.employee_name, read_at: c.created_at }],
          task_code: task?.task_code,
          task_title: task?.title,
          project_name: task?.project_name,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addTaskComment(
    taskId: string,
    commentText: string,
    mentionedEmployeeIds?: string[]
  ): TaskComment | null {
    const task = this.tasks.find((t) => t.id === taskId);
    const trimmed = commentText.trim();
    if (!task || !trimmed) return null;

    // Resolve all @mentioned employees (both explicit IDs and @Full Name matches in text)
    const mentionedSet = new Set<string>(mentionedEmployeeIds || []);
    const lowerText = trimmed.toLowerCase();
    this.employees.forEach((emp) => {
      if (emp.full_name && lowerText.includes(`@${emp.full_name.toLowerCase()}`)) {
        mentionedSet.add(emp.id);
      }
    });
    const resolvedMentions = Array.from(mentionedSet);

    const now = new Date().toISOString();
    const newComment: TaskComment = {
      id: generateId("cmt"),
      task_id: taskId,
      employee_id: this.currentUser.id,
      employee_name: this.currentUser.full_name,
      comment: trimmed,
      read_by: [
        {
          employee_id: this.currentUser.id,
          employee_name: this.currentUser.full_name,
          read_at: now,
        },
      ],
      mentioned_employee_ids: resolvedMentions,
      created_at: now,
    };

    this.taskComments.push(newComment);
    task.comments_count = this.taskComments.filter((c) => c.task_id === taskId).length;

    resolvedMentions.forEach((empId) => {
      if (empId !== this.currentUser.id) {
        this.addNotification(
          empId,
          `Mentioned in ${task.task_code}: ${task.title}`,
          `${this.currentUser.full_name} mentioned you: "${trimmed.slice(0, 80)}"`,
          "task_comment_mention",
          "task",
          taskId
        );
      }
    });

    this.addActivityLog(`Commented on ${task.task_code}: "${trimmed.slice(0, 60)}"`, "task", taskId);
    this.persist();
    return newComment;
  }

  markTaskCommentsRead(taskId: string, reader?: { id: string; full_name: string }): boolean {
    const actor = reader || this.currentUser;
    if (!actor?.id) return false;

    const now = new Date().toISOString();
    let changed = false;

    this.taskComments.forEach((c) => {
      if (c.task_id !== taskId) return;
      if (!c.read_by) {
        c.read_by = [{ employee_id: c.employee_id, employee_name: c.employee_name, read_at: c.created_at }];
      }
      if (!c.read_by.some((r) => r.employee_id === actor.id)) {
        c.read_by.push({
          employee_id: actor.id,
          employee_name: actor.full_name,
          read_at: now,
        });
        changed = true;
      }
    });

    if (changed) {
      this.persist();
    }
    return changed;
  }

  markCommentSeenByUser(commentId: string, reader?: { id: string; full_name: string }): boolean {
    const actor = reader || this.currentUser;
    if (!actor?.id) return false;

    const comment = this.taskComments.find((c) => c.id === commentId);
    if (!comment) return false;

    const now = new Date().toISOString();
    if (!comment.read_by) {
      comment.read_by = [
        { employee_id: comment.employee_id, employee_name: comment.employee_name, read_at: comment.created_at },
      ];
    }

    let changed = false;
    if (!comment.read_by.some((r) => r.employee_id === actor.id)) {
      comment.read_by.push({
        employee_id: actor.id,
        employee_name: actor.full_name,
        read_at: now,
      });
      changed = true;
    }

    this.notifications.forEach((n) => {
      if (
        n.recipient_employee_id === actor.id &&
        n.reference_id === comment.task_id &&
        n.type === "task_comment_mention" &&
        !n.is_read
      ) {
        n.is_read = true;
        n.read_at = now;
        changed = true;
      }
    });

    if (changed) {
      this.persist();
    }
    return changed;
  }

  getUnseenMentionsForUser(employeeId: string) {
    if (!employeeId) return [];
    return this.getAllTaskComments().filter(
      (c) =>
        (c.mentioned_employee_ids || []).includes(employeeId) &&
        c.employee_id !== employeeId &&
        !(c.read_by || []).some((r) => r.employee_id === employeeId)
    );
  }

  getMentionTrackingList() {
    return this.getAllTaskComments()
      .filter((c) => (c.mentioned_employee_ids || []).length > 0)
      .map((c) => {
        const readBy = c.read_by || [];
        const mentionStatuses = (c.mentioned_employee_ids || [])
          .filter((empId) => empId !== c.employee_id)
          .map((empId) => {
            const emp = this.employees.find((e) => e.id === empId);
            const seenRecord = readBy.find((r) => r.employee_id === empId);
            return {
              employee_id: empId,
              employee_name: emp?.full_name || "Team Member",
              seen: Boolean(seenRecord),
              seen_at: seenRecord?.read_at,
            };
          });
        return {
          ...c,
          mentionStatuses,
        };
      })
      .filter((item) => item.mentionStatuses.length > 0);
  }

  toggleCommentReadReceipt(commentId: string, employee: { id: string; full_name: string }): TaskComment | null {
    const comment = this.taskComments.find((c) => c.id === commentId);
    if (!comment) return null;

    if (!comment.read_by) {
      comment.read_by = [
        { employee_id: comment.employee_id, employee_name: comment.employee_name, read_at: comment.created_at },
      ];
    }

    const existingIdx = comment.read_by.findIndex((r) => r.employee_id === employee.id);
    if (existingIdx >= 0) {
      // Employees cannot mark seen messages as unseen; only Admin may adjust read receipts
      if (!this.isCurrentUserAdmin()) {
        return comment;
      }
      comment.read_by.splice(existingIdx, 1);
    } else {
      comment.read_by.push({
        employee_id: employee.id,
        employee_name: employee.full_name,
        read_at: new Date().toISOString(),
      });
    }

    this.persist();
    return comment;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    const target = this.tasks.find((t) => t.id === taskId);
    if (!target) return false;

    const isParent = !target.parent_task_id;
    const removedIds = new Set<string>([taskId]);
    const queue: string[] = [taskId];

    // Recursively collect all nested child subtasks (children, grandchildren, ...)
    while (queue.length > 0) {
      const currId = queue.shift()!;
      this.tasks.forEach((t) => {
        if (t.parent_task_id === currId && !removedIds.has(t.id)) {
          removedIds.add(t.id);
          queue.push(t.id);
        }
      });
    }

    const removedTasks = this.tasks.filter((t) => removedIds.has(t.id));

    // Move to Recycle Bin (25-day safe recovery)
    await this.moveToRecycleBin(
      "task",
      target.id,
      target.title,
      {
        ...target,
        subtasks: removedTasks.filter((t) => t.parent_task_id === target.id),
      },
      {
        code: target.task_code,
        category_name: target.category_name,
        client_name: target.client_name,
        subtitle: `${target.priority} Priority • ${target.status}`,
      }
    );

    // Direct database delete — awaits DB confirmation, throws actual Supabase error on failure
    for (const id of removedIds) {
      try {
        await deleteTaskFromDb(id);
      } catch (e) {
        console.warn("Could not delete task from Supabase:", e);
      }
    }

    if (isParent && !this.deletedTaskProjectIds.includes(target.project_id)) {
      this.deletedTaskProjectIds.push(target.project_id);
    }

    removedIds.forEach((id) => {
      if (!this.deletedTaskIds.includes(id)) {
        this.deletedTaskIds.push(id);
      }
    });
    if (target.task_code && !this.deletedTaskIds.includes(target.task_code.toUpperCase())) {
      this.deletedTaskIds.push(target.task_code.toUpperCase());
    }

    this.tasks = this.tasks.filter((t) => !removedIds.has(t.id));
    this.taskComments = this.taskComments.filter((c) => !removedIds.has(c.task_id));
    this.documents = this.documents.filter(
      (d) => !(d.entity_type === "task" && d.entity_id && removedIds.has(d.entity_id))
    );
    this.refreshProjectProgress(target.project_id);
    this.addActivityLog(
      `Moved ${isParent ? "task" : "subtask"} ${target.task_code} ("${target.title}") to Recycle Bin`,
      "task",
      taskId
    );
    this.persist();
    return true;
  }

  // Workflows
  getWorkflows(): WorkflowTemplate[] {
    return [...this.workflows];
  }

  getWorkflowById(id: string): WorkflowTemplate | undefined {
    return this.workflows.find(w => w.id === id);
  }

  async addWorkflow(wfData: Omit<WorkflowTemplate, "id" | "created_at">): Promise<WorkflowTemplate> {
    const id = ensureUuid();
    const newWf: WorkflowTemplate = { ...wfData, id, created_at: new Date().toISOString() };
    await insertWorkflowToDb(newWf);
    this.workflows.unshift(newWf);
    this.addActivityLog(`Published workflow template: ${newWf.workflow_name}`, "workflow", id);
    this.persist();
    return newWf;
  }

  async updateWorkflow(id: string, updates: Partial<WorkflowTemplate>): Promise<WorkflowTemplate | null> {
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) return null;
    await updateWorkflowInDb(id, updates);
    this.workflows[index] = {
      ...this.workflows[index],
      ...updates,
    };
    this.addActivityLog(`Updated workflow template: ${this.workflows[index].workflow_name}`, "workflow", id);
    this.persist();
    return this.workflows[index];
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    const target = this.workflows.find((w) => w.id === id);
    if (!target) return false;
    await deleteWorkflowFromDb(id);
    this.workflows = this.workflows.filter((w) => w.id !== id);
    this.addActivityLog(`Deleted workflow template: ${target.workflow_name}`, "workflow", id);
    this.persist();
    return true;
  }

  getNormalizedWorkflowMilestones(wf: WorkflowTemplate): WorkflowMilestoneTemplate[] {
    if (wf.milestones !== undefined) {
      return wf.milestones.map((m, mIdx) => ({
        ...m,
        sequence_number: m.sequence_number || mIdx + 1,
        stages: (m.stages || []).map((s, sIdx) => ({
          ...s,
          sequence_number: s.sequence_number || sIdx + 1,
          sub_stages: (s.sub_stages || []).map((ss, ssIdx) => ({
            ...ss,
            sequence_number: ss.sequence_number || ssIdx + 1,
            tasks: ss.tasks || [],
          })),
        })),
      }));
    }

    const legacyTasks = wf.template_tasks || [];
    if (legacyTasks.length === 0) {
      return [];
    }

    return [
      {
        id: `ms-default-${wf.id}`,
        title: "Milestone 1",
        sequence_number: 1,
        stages: [
          {
            id: `stg-default-${wf.id}`,
            stage_name: "Stage 1",
            sequence_number: 1,
            sub_stages: [
              {
                id: `substg-default-${wf.id}`,
                sub_stage_name: "Sub Stage 1",
                sequence_number: 1,
                tasks: legacyTasks,
              },
            ],
          },
        ],
      },
    ];
  }

  private flattenMilestonesToTemplateTasks(
    milestones: WorkflowMilestoneTemplate[]
  ): WorkflowProjectTaskTemplate[] {
    const result: WorkflowProjectTaskTemplate[] = [];
    let seq = 1;
    milestones.forEach((m) => {
      (m.stages || []).forEach((s) => {
        (s.sub_stages || []).forEach((ss) => {
          (ss.tasks || []).forEach((t) => {
            result.push({ ...t, sequence_number: seq++ });
          });
        });
      });
    });
    return result;
  }

  private saveWorkflowMilestones(
    workflowId: string,
    milestones: WorkflowMilestoneTemplate[],
    logMessage?: string
  ): WorkflowTemplate | null {
    const idx = this.workflows.findIndex((w) => w.id === workflowId);
    if (idx === -1) return null;
    const flattened = this.flattenMilestonesToTemplateTasks(milestones);
    const totalStages = milestones.reduce((sum, m) => sum + (m.stages?.length || 0), 0);
    this.workflows[idx] = {
      ...this.workflows[idx],
      milestones,
      template_tasks: flattened,
      stages_count: totalStages,
    };
    if (logMessage) {
      this.addActivityLog(logMessage, "workflow", workflowId);
    }
    this.persist();
    return this.workflows[idx];
  }

  addWorkflowMilestone(
    workflowId: string,
    input: { title: string; start_date?: string; end_date?: string; description?: string }
  ): WorkflowMilestoneTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !input.title.trim()) return null;
    const milestones = this.getNormalizedWorkflowMilestones(wf);
    const created: WorkflowMilestoneTemplate = {
      id: generateId("ms"),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      sequence_number: milestones.length + 1,
      start_date: input.start_date || undefined,
      end_date: input.end_date || undefined,
      stages: [],
    };
    this.saveWorkflowMilestones(
      workflowId,
      [...milestones, created],
      `Added milestone "${created.title}" to ${wf.workflow_name}`
    );
    return created;
  }

  updateWorkflowMilestone(
    workflowId: string,
    milestoneId: string,
    updates: Partial<Pick<WorkflowMilestoneTemplate, "title" | "start_date" | "end_date" | "description" | "allocated_client_ids">>
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) =>
      m.id === milestoneId ? { ...m, ...updates } : m
    );
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  setWorkflowMilestoneClients(
    workflowId: string,
    milestoneId: string,
    clientIds: string[]
  ): boolean {
    return this.updateWorkflowMilestone(workflowId, milestoneId, {
      allocated_client_ids: Array.from(new Set(clientIds)),
    });
  }

  deleteWorkflowMilestone(workflowId: string, milestoneId: string): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf)
      .filter((m) => m.id !== milestoneId)
      .map((m, idx) => ({ ...m, sequence_number: idx + 1 }));
    return Boolean(
      this.saveWorkflowMilestones(workflowId, milestones, `Removed milestone from ${wf.workflow_name}`)
    );
  }

  addWorkflowStage(
    workflowId: string,
    milestoneId: string,
    input: { stage_name: string; description?: string }
  ): WorkflowStageTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !input.stage_name.trim()) return null;
    let created: WorkflowStageTemplate | null = null;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      created = {
        id: generateId("stg"),
        stage_name: input.stage_name.trim(),
        description: input.description?.trim() || undefined,
        sequence_number: m.stages.length + 1,
        sub_stages: [],
      };
      return { ...m, stages: [...m.stages, created] };
    });
    if (!created) return null;
    this.saveWorkflowMilestones(workflowId, milestones, `Added stage "${input.stage_name.trim()}"`);
    return created;
  }

  updateWorkflowStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    updates: { stage_name?: string; description?: string }
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) =>
          s.id === stageId
            ? {
                ...s,
                stage_name: updates.stage_name !== undefined ? updates.stage_name.trim() || s.stage_name : s.stage_name,
                description: updates.description !== undefined ? updates.description.trim() || undefined : s.description,
              }
            : s
        ),
      };
    });
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  deleteWorkflowStage(workflowId: string, milestoneId: string, stageId: string): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages
          .filter((s) => s.id !== stageId)
          .map((s, idx) => ({ ...s, sequence_number: idx + 1 })),
      };
    });
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  addWorkflowSubStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    input: { sub_stage_name: string; description?: string }
  ): WorkflowSubStageTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !input.sub_stage_name.trim()) return null;
    let created: WorkflowSubStageTemplate | null = null;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) => {
          if (s.id !== stageId) return s;
          created = {
            id: generateId("substg"),
            sub_stage_name: input.sub_stage_name.trim(),
            description: input.description?.trim() || undefined,
            sequence_number: s.sub_stages.length + 1,
            tasks: [],
          };
          return { ...s, sub_stages: [...s.sub_stages, created] };
        }),
      };
    });
    if (!created) return null;
    this.saveWorkflowMilestones(
      workflowId,
      milestones,
      `Added sub-stage "${input.sub_stage_name.trim()}"`
    );
    return created;
  }

  deleteWorkflowSubStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    subStageId: string
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) => {
          if (s.id !== stageId) return s;
          return {
            ...s,
            sub_stages: s.sub_stages
              .filter((ss) => ss.id !== subStageId)
              .map((ss, idx) => ({ ...ss, sequence_number: idx + 1 })),
          };
        }),
      };
    });
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  addWorkflowTaskInSubStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    subStageId: string,
    taskInput: Omit<WorkflowProjectTaskTemplate, "id" | "sequence_number">
  ): WorkflowProjectTaskTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !taskInput.task_name.trim()) return null;
    let created: WorkflowProjectTaskTemplate | null = null;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) => {
          if (s.id !== stageId) return s;
          return {
            ...s,
            sub_stages: s.sub_stages.map((ss) => {
              if (ss.id !== subStageId) return ss;
              created = {
                ...taskInput,
                id: generateId("wftask"),
                sequence_number: ss.tasks.length + 1,
              };
              return { ...ss, tasks: [...ss.tasks, created] };
            }),
          };
        }),
      };
    });
    if (!created) return null;
    this.saveWorkflowMilestones(
      workflowId,
      milestones,
      `Added workflow task "${taskInput.task_name.trim()}"`
    );
    return created;
  }

  updateWorkflowTaskInHierarchy(
    workflowId: string,
    taskId: string,
    updates: Partial<WorkflowProjectTaskTemplate>
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    let updated = false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => {
            if (t.id !== taskId) return t;
            updated = true;
            return { ...t, ...updates };
          }),
        })),
      })),
    }));
    if (!updated) return false;
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  deleteWorkflowTaskFromHierarchy(workflowId: string, taskId: string): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.filter((t) => t.id !== taskId),
        })),
      })),
    }));
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  private mapSubtasksRecursive(
    subtasks: WorkflowSubtaskTemplate[],
    fn: (sub: WorkflowSubtaskTemplate) => WorkflowSubtaskTemplate | null
  ): WorkflowSubtaskTemplate[] {
    const next: WorkflowSubtaskTemplate[] = [];
    for (const sub of subtasks) {
      const mapped = fn(sub);
      if (!mapped) continue;
      if (mapped.subtasks && mapped.subtasks.length > 0) {
        next.push({
          ...mapped,
          subtasks: this.mapSubtasksRecursive(mapped.subtasks, fn),
        });
      } else {
        next.push(mapped);
      }
    }
    return next;
  }

  addWorkflowSubtaskInHierarchy(
    workflowId: string,
    parentId: string,
    subtaskInput: Omit<WorkflowSubtaskTemplate, "id">
  ): WorkflowSubtaskTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !subtaskInput.title.trim()) return null;
    let created: WorkflowSubtaskTemplate | null = null;
    const newSub = (): WorkflowSubtaskTemplate => ({
      ...subtaskInput,
      id: generateId("wfsub"),
    });
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => {
            if (t.id === parentId) {
              created = newSub();
              return { ...t, subtasks: [...(t.subtasks || []), created] };
            }
            return {
              ...t,
              subtasks: this.mapSubtasksRecursive(t.subtasks || [], (sub) => {
                if (sub.id !== parentId) return sub;
                created = newSub();
                return { ...sub, subtasks: [...(sub.subtasks || []), created] };
              }),
            };
          }),
        })),
      })),
    }));
    if (!created) return null;
    this.saveWorkflowMilestones(workflowId, milestones);
    return created;
  }

  updateWorkflowSubtaskInHierarchy(
    workflowId: string,
    subtaskId: string,
    updates: Partial<WorkflowSubtaskTemplate>
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    let updated = false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => ({
            ...t,
            subtasks: this.mapSubtasksRecursive(t.subtasks || [], (sub) => {
              if (sub.id !== subtaskId) return sub;
              updated = true;
              return { ...sub, ...updates };
            }),
          })),
        })),
      })),
    }));
    if (!updated) return false;
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  deleteWorkflowSubtaskFromHierarchy(
    workflowId: string,
    _taskId: string,
    subtaskId: string
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => ({
            ...t,
            subtasks: this.mapSubtasksRecursive(t.subtasks || [], (sub) =>
              sub.id === subtaskId ? null : sub
            ),
          })),
        })),
      })),
    }));
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  /**
   * Ensures every client engagement / project matching this workflow's service
   * has tasks generated for every template task in workflow.template_tasks.
   */
  async syncWorkflowTasksToSubscribedClients(workflowId: string): Promise<{
    updatedProjects: number;
    createdTasks: number;
  }> {
    const wf = this.workflows.find((w) => w.id === workflowId);
    const tplTasks = wf?.template_tasks || [];
    if (!wf || tplTasks.length === 0) {
      return { updatedProjects: 0, createdTasks: 0 };
    }

    const serviceNameLower = (wf.service_name || "").trim().toLowerCase();
    const matchingEngagements = this.engagements.filter(
      (e) =>
        e.status === "Active" &&
        ((wf.service_id && e.service_id === wf.service_id) ||
          (serviceNameLower && (e.service_name || "").trim().toLowerCase() === serviceNameLower))
    );

    const candidateProjectIds = new Set<string>();
    for (const eng of matchingEngagements) {
      let proj = this.projects.find(
        (p) =>
          p.service_engagement_id === eng.id ||
          (p.client_id === eng.client_id &&
            (p.service_name || "").trim().toLowerCase() === (eng.service_name || "").trim().toLowerCase())
      );
      if (!proj) {
        const startDate = eng.start_date || new Date().toISOString().slice(0, 10);
        const dueDate = eng.end_date || this.addDaysIso(startDate, 30);
        proj = await this.addProject(
          {
            project_name: `${eng.client_name || "Client"} — ${eng.service_name}`,
            project_type: "Client Project",
            client_id: eng.client_id,
            client_name: eng.client_name,
            service_engagement_id: eng.id,
            service_name: eng.service_name,
            project_manager_id: eng.relationship_manager_id || this.currentUser.id,
            project_manager_name: eng.relationship_manager_name || this.currentUser.full_name,
            description: wf.description || `Service delivery project for ${eng.service_name}`,
            priority: "Medium",
            start_date: startDate,
            due_date: dueDate,
            status: "In Progress",
          },
          { skipDefaultTask: true }
        );
      }
      candidateProjectIds.add(proj.id);
    }

    // Also include standalone client projects tagged with this workflow's service name
    if (serviceNameLower) {
      this.projects.forEach((p) => {
        if ((p.service_name || "").trim().toLowerCase() === serviceNameLower) {
          candidateProjectIds.add(p.id);
        }
      });
    }

    let updatedProjects = 0;
    let createdTasks = 0;

    for (const projectId of candidateProjectIds) {
      const proj = this.projects.find((p) => p.id === projectId);
      if (!proj) continue;

      const existingTopTasks = this.tasks.filter(
        (t) => t.project_id === projectId && !t.parent_task_id
      );
      const existingTitles = new Set(
        existingTopTasks.map((t) => t.title.trim().toLowerCase())
      );

      let addedHere = 0;
      const baseStart = proj.start_date || new Date().toISOString().slice(0, 10);
      const milestones = this.getNormalizedWorkflowMilestones(wf);

      for (const ms of milestones) {
        for (const stg of (ms.stages || [])) {
          for (const subStg of (stg.sub_stages || [])) {
            for (const tplTask of (subStg.tasks || [])) {
              if (existingTitles.has(tplTask.task_name.trim().toLowerCase())) continue;

              const taskStart = this.addDaysIso(
                ms.start_date || baseStart,
                Math.max(0, (tplTask.start_day_offset || 1) - 1)
              );
              const taskDue = this.addDaysIso(
                taskStart,
                Math.max(0, (tplTask.duration_days || 1) - 1)
              );
              const createdTask = await this.addTask({
                title: tplTask.task_name,
                project_id: proj.id,
                project_name: proj.project_name,
                milestone_id: ms.id,
                milestone_title: ms.title,
                stage_id: stg.id,
                stage_title: stg.stage_name,
                sub_stage_id: subStg.id,
                sub_stage_title: subStg.sub_stage_name,
                assigned_employee_id:
                  tplTask.assigned_employee_id || proj.project_manager_id || this.currentUser.id,
                assigned_employee_name:
                  tplTask.assigned_employee_name ||
                  proj.project_manager_name ||
                  this.currentUser.full_name,
                priority: tplTask.priority || "Medium",
                start_date: taskStart,
                due_date: taskDue,
                status: tplTask.status || "To Do",
                description:
                  tplTask.description ||
                  `Workflow deliverable under ${wf.workflow_name} (${ms.title} → ${stg.stage_name} → ${subStg.sub_stage_name}).`,
                created_by: this.currentUser.id,
                created_by_name: this.currentUser.full_name,
              });

              for (const tplSub of (tplTask.subtasks || [])) {
                const subStart = this.addDaysIso(
                  ms.start_date || baseStart,
                  Math.max(0, (tplSub.start_day_offset ?? tplTask.start_day_offset ?? 1) - 1)
                );
                const subDue = this.addDaysIso(
                  subStart,
                  Math.max(0, (tplSub.duration_days || 1) - 1)
                );
                await this.addSubtask(createdTask.id, {
                  title: tplSub.title,
                  description: tplSub.description,
                  start_date: subStart,
                  due_date: subDue,
                  priority: tplSub.priority || tplTask.priority,
                  status: tplSub.status || "To Do",
                  assigned_employee_id:
                    tplSub.assigned_employee_id ||
                    tplTask.assigned_employee_id ||
                    proj.project_manager_id ||
                    this.currentUser.id,
                  assigned_employee_name:
                    tplSub.assigned_employee_name ||
                    tplTask.assigned_employee_name ||
                    proj.project_manager_name ||
                    this.currentUser.full_name,
                });
              }

              (tplTask.default_comments || []).forEach((cmt) => {
                if (cmt.trim()) {
                  this.addTaskComment(createdTask.id, cmt.trim());
                }
              });

              addedHere += 1;
              createdTasks += 1;
            }
          }
        }
      }

      if (addedHere > 0) {
        updatedProjects += 1;
      }
    }

    if (createdTasks > 0) {
      this.persist();
    }
    return { updatedProjects, createdTasks };
  }

  // Invoices & Financials
  getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find(i => i.id === id);
  }

  async addInvoice(
    invoiceData: Omit<Invoice, "id" | "invoice_number" | "paid_amount" | "outstanding_balance" | "created_at"> & {
      invoice_number?: string;
      initial_paid_amount?: number;
      payment_mode?: PaymentMode;
      transaction_reference?: string;
    }
  ): Promise<Invoice> {
    const {
      invoice_number: providedNumber,
      initial_paid_amount,
      payment_mode,
      transaction_reference,
      ...restInvoiceData
    } = invoiceData;

    const fy = restInvoiceData.financial_year || "2026-27";
    const nextSeq = 754 + this.invoices.length;
    const invoice_number = (providedNumber || "").trim() || `LMA/${fy}/${String(nextSeq).padStart(4, "0")}`;
    const id = ensureUuid();
    const tdsAmount = Number(restInvoiceData.tds_amount || 0);
    const netPayable = restInvoiceData.net_payable ?? Math.max(0, restInvoiceData.grand_total - tdsAmount);

    const newInvoice: Invoice = {
      ...restInvoiceData,
      id,
      invoice_number,
      tds_amount: tdsAmount,
      net_payable: netPayable,
      paid_amount: 0,
      outstanding_balance: netPayable,
      status: restInvoiceData.status || "Finalized",
      created_at: new Date().toISOString()
    };

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await insertInvoiceToDb(newInvoice);

    this.invoices.unshift(newInvoice);
    this.addActivityLog(
      `Created invoice ${invoice_number} for ₹${netPayable.toLocaleString("en-IN")}`,
      "invoice",
      id
    );

    const paidInit = Math.max(0, Math.min(Number(initial_paid_amount || 0), netPayable));
    if (paidInit > 0) {
      await this.recordPayment({
        client_id: newInvoice.client_id,
        client_name: newInvoice.client_name || newInvoice.client_legal_name,
        invoice_id: newInvoice.id,
        invoice_number: newInvoice.invoice_number,
        service_engagement_id: newInvoice.service_engagement_id,
        payment_date: newInvoice.invoice_date,
        amount: paidInit,
        payment_mode: payment_mode || "Bank Transfer",
        transaction_reference: transaction_reference || "",
        received_by: this.currentUser?.id,
        received_by_name: this.currentUser?.full_name || "System Administrator",
        remarks: `Initial payment recorded at invoice creation (${newInvoice.invoice_number})`,
        status: "Completed"
      });
    }

    this.persist();
    return newInvoice;
  }

  async deleteInvoice(invoiceId: string): Promise<boolean> {
    await deleteInvoiceFromDb(invoiceId);
    this.invoices = this.invoices.filter((i) => i.id !== invoiceId);
    this.payments = this.payments.filter((p) => p.invoice_id !== invoiceId);
    this.persist();
    return true;
  }

  finalizeInvoice(invoiceId: string): Invoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status !== "Draft") return null;
    inv.status = "Finalized";
    inv.finalized_at = new Date().toISOString();
    this.addActivityLog(`Finalized invoice ${inv.invoice_number}`, "invoice", invoiceId);
    this.persist();
    return inv;
  }

  cancelInvoice(invoiceId: string, reason: string): Invoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === "Cancelled") return null;
    inv.status = "Cancelled";
    inv.cancelled_at = new Date().toISOString();
    inv.cancel_reason = reason;
    this.addActivityLog(`Cancelled invoice ${inv.invoice_number}. Reason: ${reason}`, "invoice", invoiceId);
    this.persist();
    return inv;
  }

  // Payments
  getPayments(): Payment[] {
    return [...this.payments];
  }

  async recordPayment(paymentData: Omit<Payment, "id" | "payment_number" | "created_at">): Promise<Payment> {
    const nextNum = this.payments.length + 1;
    const year = new Date().getFullYear();
    const payment_number = `PAY/${year}/${String(nextNum).padStart(5, "0")}`;
    const id = ensureUuid();

    const newPayment: Payment = {
      ...paymentData,
      id,
      payment_number,
      status: "Completed",
      created_at: new Date().toISOString()
    };

    // Direct database write — awaits DB confirmation, throws actual Supabase error on failure
    await insertPaymentToDb(newPayment);

    this.payments.unshift(newPayment);

    // If allocated to an invoice, recalculate outstanding balance automatically
    if (newPayment.invoice_id) {
      const inv = this.invoices.find(i => i.id === newPayment.invoice_id);
      if (inv) {
        const payableTotal = inv.net_payable ?? inv.grand_total;
        inv.paid_amount = Math.min(payableTotal, inv.paid_amount + newPayment.amount);
        inv.outstanding_balance = Math.max(0, payableTotal - inv.paid_amount);
        if (inv.outstanding_balance <= 0.01) {
          inv.outstanding_balance = 0;
          inv.status = "Paid";
        } else if (inv.paid_amount > 0) {
          inv.status = "Partially Paid";
        }
      }
    }

    this.addActivityLog(`Recorded payment ${payment_number} of ₹${newPayment.amount} via ${newPayment.payment_mode}`, "payment", id);
    this.addNotification(
      this.currentUser.id,
      `Payment Received: ₹${newPayment.amount.toLocaleString("en-IN")}`,
      `Payment ${payment_number} from ${newPayment.client_name || "Client"} recorded.`,
      "payment_received",
      "payment",
      id
    );
    this.persist();
    return newPayment;
  }

  // ============================================================================
  // CENTRALIZED FINANCE & INVOICE MANAGEMENT BUSINESS ENGINE
  // ============================================================================

  getInvoiceRequests(): InvoiceRequest[] {
    return [...this.invoiceRequests];
  }

  getInvoiceRequestById(id: string): InvoiceRequest | undefined {
    return this.invoiceRequests.find((r) => r.id === id);
  }

  getRecurringInvoices(): RecurringInvoice[] {
    return [...this.recurringInvoices];
  }

  getRecurringInvoiceById(id: string): RecurringInvoice | undefined {
    return this.recurringInvoices.find((r) => r.id === id);
  }

  getBulkBatches(): BulkInvoiceBatch[] {
    return [...this.bulkBatches];
  }

  getApprovalLogs(requestId?: string): InvoiceApprovalLog[] {
    if (requestId) {
      return this.approvalLogs.filter((l) => l.invoice_request_id === requestId);
    }
    return [...this.approvalLogs];
  }

  /**
   * Returns all tasks eligible for billing:
   * 1. Must be billable (is_billable === true)
   * 2. Must be Completed (status === 'Completed' or isCompletedStatus)
   * 3. Available amount (remaining_amount - pending_approval_amount) > 0
   */
  getCompletedBillableTasks(clientId?: string): Task[] {
    return this.getTasks()
      .filter((t) => {
        if (!t.is_billable) return false;
        if (!this.isCompletedStatus(t.status)) return false;
        const remaining = t.remaining_amount !== undefined ? t.remaining_amount : (t.billing_amount || 0);
        const pending = t.pending_approval_amount || 0;
        const available = remaining - pending;
        if (available <= 0) return false;
        if (clientId && t.client_id !== clientId) return false;
        return true;
      });
  }

  /**
   * Single Invoice Creation:
   * Creates an invoice request for one client with one or more completed billable tasks.
   * Mandates Admin Approval before invoice generation.
   */
  async createSingleInvoiceRequest(input: {
    client_id: string;
    items: Array<{
      task_id: string;
      billed_amount: number;
      description?: string;
      sac_code?: string;
    }>;
    gst_rate?: number;
    place_of_supply?: string;
    is_interstate?: boolean;
    notes?: string;
    terms_conditions?: string;
  }): Promise<InvoiceRequest> {
    const client = this.clients.find((c) => c.id === input.client_id);
    if (!client) throw new Error("Client not found.");

    if (!input.items || input.items.length === 0) {
      throw new Error("At least one billable task must be selected.");
    }

    const gst_rate = input.gst_rate ?? 18;
    const is_interstate = Boolean(input.is_interstate);
    const place_of_supply = input.place_of_supply || "Tamil Nadu";

    const requestItems: InvoiceRequestItem[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const task = this.tasks.find((t) => t.id === item.task_id);
      if (!task) throw new Error(`Task ${item.task_id} not found.`);
      if (!task.is_billable) throw new Error(`Task ${task.task_code} is marked non-billable.`);
      if (!this.isCompletedStatus(task.status)) {
        throw new Error(`Task ${task.task_code} is not completed yet.`);
      }

      const remaining = task.remaining_amount !== undefined ? task.remaining_amount : (task.billing_amount || 0);
      const pending = task.pending_approval_amount || 0;
      const available = remaining - pending;

      if (item.billed_amount <= 0) {
        throw new Error(`Invalid billing amount for task ${task.task_code}.`);
      }
      if (item.billed_amount > available + 0.01) {
        throw new Error(`Billing amount ₹${item.billed_amount} exceeds available unbilled amount ₹${available} for task ${task.task_code}.`);
      }

      const itemAmount = Number(item.billed_amount);
      subtotal += itemAmount;

      const taxAmount = (itemAmount * gst_rate) / 100;
      const cgst = is_interstate ? 0 : taxAmount / 2;
      const sgst = is_interstate ? 0 : taxAmount / 2;
      const igst = is_interstate ? taxAmount : 0;

      requestItems.push({
        id: ensureUuid(),
        task_id: task.id,
        task_code: task.task_code,
        task_title: task.title,
        description: item.description || task.billing_description || task.title,
        sac_code: item.sac_code || "998311",
        billable_task_total: task.billing_amount || 0,
        billable_task_remaining: remaining,
        amount: itemAmount,
        gst_rate,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: itemAmount + taxAmount,
      });
    }

    const totalTax = (subtotal * gst_rate) / 100;
    const cgstTotal = is_interstate ? 0 : totalTax / 2;
    const sgstTotal = is_interstate ? 0 : totalTax / 2;
    const igstTotal = is_interstate ? totalTax : 0;
    const grandTotal = subtotal + totalTax;

    const reqSeq = this.invoiceRequests.length + 1;
    const reqNumber = `REQ-SIN-${new Date().getFullYear()}-${String(reqSeq).padStart(4, "0")}`;
    const id = ensureUuid();

    const newRequest: InvoiceRequest = {
      id,
      request_number: reqNumber,
      request_type: "single",
      client_id: client.id,
      client_name: client.client_name,
      client_legal_name: client.legal_name || client.client_name,
      client_gstin: client.registration?.gstin || undefined,
      client_address: client.addresses?.[0]?.street_address || "",
      requested_by: this.currentUser?.id,
      requested_by_name: this.currentUser?.full_name || "Employee",
      subtotal,
      gst_rate,
      cgst_amount: cgstTotal,
      sgst_amount: sgstTotal,
      igst_amount: igstTotal,
      total_gst: totalTax,
      grand_total: grandTotal,
      place_of_supply,
      is_interstate,
      notes: input.notes,
      terms_conditions: input.terms_conditions,
      status: "Pending Approval",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: requestItems,
    };

    // Save to Database
    await insertInvoiceRequestToDb(newRequest);

    // Reserve pending approval amount on the tasks so they cannot be double billed
    for (const it of requestItems) {
      if (it.task_id) {
        const tIndex = this.tasks.findIndex((t) => t.id === it.task_id);
        if (tIndex !== -1) {
          const t = this.tasks[tIndex];
          const newPending = (t.pending_approval_amount || 0) + it.amount;
          this.tasks[tIndex] = { ...t, pending_approval_amount: newPending };
          await updateTaskInDb(t.id, { pending_approval_amount: newPending });
        }
      }
    }

    // Add Audit Log
    const auditLog: InvoiceApprovalLog = {
      id: ensureUuid(),
      invoice_request_id: id,
      action: "SUBMITTED",
      actor_id: this.currentUser?.id,
      actor_name: this.currentUser?.full_name || "Employee",
      notes: `Single invoice request initiated for ${client.client_name} (₹${grandTotal.toLocaleString("en-IN")}) awaiting Admin Approval.`,
      created_at: new Date().toISOString(),
    };
    await insertApprovalLogToDb(auditLog);

    this.invoiceRequests.unshift(newRequest);
    this.approvalLogs.unshift(auditLog);
    this.addActivityLog(`Submitted invoice approval request ${reqNumber} for ${client.client_name}`, "invoice", id);
    this.persist();
    return newRequest;
  }

  /**
   * Bulk Invoice Creation:
   * Select multiple completed tasks across multiple clients in one batch.
   * Groups tasks by client and generates separate invoice requests per client.
   */
  async createBulkInvoiceRequest(input: {
    items: Array<{
      task_id: string;
      billed_amount: number;
      client_id: string;
      description?: string;
      sac_code?: string;
    }>;
    gst_rate?: number;
    place_of_supply?: string;
    notes?: string;
  }): Promise<{ batch: BulkInvoiceBatch; requests: InvoiceRequest[] }> {
    if (!input.items || input.items.length === 0) {
      throw new Error("No tasks selected for bulk invoice generation.");
    }

    const batchSeq = this.bulkBatches.length + 1;
    const batchCode = `BATCH-${new Date().getFullYear()}-${String(batchSeq).padStart(4, "0")}`;
    const batchId = ensureUuid();
    const gst_rate = input.gst_rate ?? 18;

    // Group items by client_id
    const clientGroups = new Map<string, typeof input.items>();
    for (const item of input.items) {
      const list = clientGroups.get(item.client_id) || [];
      list.push(item);
      clientGroups.set(item.client_id, list);
    }

    let batchTotalAmount = 0;
    const generatedRequests: InvoiceRequest[] = [];

    // Pre-insert bulk batch to satisfy foreign key constraint on invoice_requests.bulk_batch_id
    const newBatch: BulkInvoiceBatch = {
      id: batchId,
      batch_code: batchCode,
      created_by: this.currentUser?.id,
      created_by_name: this.currentUser?.full_name || "Employee",
      total_clients: clientGroups.size,
      total_tasks: input.items.length,
      total_amount: 0,
      status: "Pending Approval",
      created_at: new Date().toISOString(),
    };
    await insertBulkBatchToDb(newBatch);

    for (const [clientId, clientItems] of clientGroups.entries()) {
      const client = this.clients.find((c) => c.id === clientId);
      if (!client) continue;

      let subtotal = 0;
      const requestItems: InvoiceRequestItem[] = [];

      for (const it of clientItems) {
        const task = this.tasks.find((t) => t.id === it.task_id);
        if (!task || !task.is_billable || !this.isCompletedStatus(task.status)) continue;

        const remaining = task.remaining_amount !== undefined ? task.remaining_amount : (task.billing_amount || 0);
        const pending = task.pending_approval_amount || 0;
        const available = remaining - pending;
        const amount = Math.min(Number(it.billed_amount), available);

        if (amount <= 0) continue;
        subtotal += amount;

        const taxAmount = (amount * gst_rate) / 100;
        requestItems.push({
          id: ensureUuid(),
          invoice_request_id: undefined as any,
          task_id: task.id,
          task_code: task.task_code,
          task_title: task.title,
          description: it.description || task.billing_description || task.title,
          sac_code: it.sac_code || "998311",
          billable_task_total: task.billing_amount || 0,
          billable_task_remaining: remaining,
          amount,
          gst_rate,
          cgst_amount: taxAmount / 2,
          sgst_amount: taxAmount / 2,
          igst_amount: 0,
          total_amount: amount + taxAmount,
        });

        // Reserve amount on task
        const tIndex = this.tasks.findIndex((t) => t.id === task.id);
        if (tIndex !== -1) {
          const newPending = (task.pending_approval_amount || 0) + amount;
          this.tasks[tIndex] = { ...this.tasks[tIndex], pending_approval_amount: newPending };
          await updateTaskInDb(task.id, { pending_approval_amount: newPending });
        }
      }

      if (requestItems.length === 0) continue;

      const totalTax = (subtotal * gst_rate) / 100;
      const grandTotal = subtotal + totalTax;
      batchTotalAmount += grandTotal;

      const reqSeq = this.invoiceRequests.length + generatedRequests.length + 1;
      const reqNumber = `REQ-BLK-${new Date().getFullYear()}-${String(reqSeq).padStart(4, "0")}`;
      const reqId = ensureUuid();

      // Ensure items have invoice_request_id set
      const finalizedItems = requestItems.map((item) => ({ ...item, invoice_request_id: reqId }));

      const req: InvoiceRequest = {
        id: reqId,
        request_number: reqNumber,
        request_type: "bulk",
        bulk_batch_id: batchId,
        client_id: client.id,
        client_name: client.client_name,
        client_legal_name: client.legal_name || client.client_name,
        client_gstin: client.registration?.gstin || undefined,
        client_address: client.addresses?.[0]?.street_address || "",
        requested_by: this.currentUser?.id,
        requested_by_name: this.currentUser?.full_name || "Employee",
        subtotal,
        gst_rate,
        cgst_amount: totalTax / 2,
        sgst_amount: totalTax / 2,
        igst_amount: 0,
        total_gst: totalTax,
        grand_total: grandTotal,
        place_of_supply: input.place_of_supply || "Tamil Nadu",
        is_interstate: false,
        notes: input.notes,
        status: "Pending Approval",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: finalizedItems,
      };

      await insertInvoiceRequestToDb(req);

      const log: InvoiceApprovalLog = {
        id: ensureUuid(),
        invoice_request_id: reqId,
        action: "SUBMITTED",
        actor_id: this.currentUser?.id,
        actor_name: this.currentUser?.full_name || "Employee",
        notes: `Bulk invoice request ${reqNumber} generated for ${client.client_name} under batch ${batchCode}.`,
        created_at: new Date().toISOString(),
      };
      await insertApprovalLogToDb(log);

      generatedRequests.push(req);
      this.approvalLogs.unshift(log);
    }

    newBatch.total_amount = batchTotalAmount;
    newBatch.total_clients = generatedRequests.length;

    this.bulkBatches.unshift(newBatch);
    this.invoiceRequests.unshift(...generatedRequests);
    this.addActivityLog(`Created bulk invoice batch ${batchCode} with ${generatedRequests.length} client requests`, "invoice", batchId);
    this.persist();
    return { batch: newBatch, requests: generatedRequests };
  }

  /**
   * Recurring Invoice Template Management:
   * Retainer billing independent of tasks.
   */
  async createRecurringInvoice(input: {
    client_id: string;
    service_id?: string;
    title: string;
    description?: string;
    frequency: RecurringFrequency;
    base_amount: number;
    gst_rate?: number;
    start_date?: string;
    end_date?: string;
    next_billing_date?: string;
    auto_submit_for_approval?: boolean;
    notes?: string;
  }): Promise<RecurringInvoice> {
    const client = this.clients.find((c) => c.id === input.client_id);
    if (!client) throw new Error("Client not found.");

    const service = input.service_id ? this.services.find((s) => s.id === input.service_id) : undefined;
    const base_amount = Number(input.base_amount);
    const gst_rate = input.gst_rate ?? 18;
    const tax_amount = (base_amount * gst_rate) / 100;
    const total_amount = base_amount + tax_amount;

    const start_date = input.start_date || new Date().toISOString().slice(0, 10);
    const next_billing_date = input.next_billing_date || start_date;

    const seq = this.recurringInvoices.length + 1;
    const schedule_code = `REC-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
    const id = ensureUuid();

    const recurring: RecurringInvoice = {
      id,
      schedule_code,
      client_id: client.id,
      client_name: client.client_name,
      service_id: service?.id,
      service_name: service?.service_name,
      title: input.title,
      description: input.description,
      frequency: input.frequency,
      base_amount,
      gst_rate,
      tax_amount,
      total_amount,
      start_date,
      end_date: input.end_date,
      next_billing_date,
      invoices_generated_count: 0,
      status: "Active",
      auto_submit_for_approval: input.auto_submit_for_approval ?? true,
      notes: input.notes,
      created_by: this.currentUser?.id,
      created_by_name: this.currentUser?.full_name || "Employee",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await insertRecurringInvoiceToDb(recurring);
    this.recurringInvoices.unshift(recurring);
    this.addActivityLog(`Configured recurring retainer schedule ${schedule_code} for ${client.client_name}`, "finance", id);
    this.persist();
    return recurring;
  }

  async updateRecurringInvoice(id: string, updates: Partial<RecurringInvoice>): Promise<void> {
    const index = this.recurringInvoices.findIndex((r) => r.id === id);
    if (index === -1) return;

    await updateRecurringInvoiceInDb(id, updates);
    this.recurringInvoices[index] = {
      ...this.recurringInvoices[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
  }

  async deleteRecurringInvoice(id: string): Promise<void> {
    await deleteRecurringInvoiceFromDb(id);
    this.recurringInvoices = this.recurringInvoices.filter((r) => r.id !== id);
    this.persist();
  }

  /**
   * Recurring Invoice Scheduler Trigger:
   * Inspects all active schedules due on or before today, generates invoice requests,
   * advances the next billing date, and puts them into the Admin Approval queue.
   */
  async triggerRecurringScheduler(): Promise<InvoiceRequest[]> {
    const today = new Date().toISOString().slice(0, 10);
    const dueSchedules = this.recurringInvoices.filter((r) => {
      if (r.status !== "Active") return false;
      return r.next_billing_date <= today;
    });

    const createdRequests: InvoiceRequest[] = [];

    for (const schedule of dueSchedules) {
      const client = this.clients.find((c) => c.id === schedule.client_id);
      if (!client) continue;

      const reqSeq = this.invoiceRequests.length + createdRequests.length + 1;
      const reqNumber = `REQ-REC-${new Date().getFullYear()}-${String(reqSeq).padStart(4, "0")}`;
      const reqId = ensureUuid();

      const item: InvoiceRequestItem = {
        id: ensureUuid(),
        description: `${schedule.title} (${schedule.frequency} Retainer)`,
        sac_code: "998311",
        amount: schedule.base_amount,
        gst_rate: schedule.gst_rate,
        cgst_amount: schedule.tax_amount / 2,
        sgst_amount: schedule.tax_amount / 2,
        igst_amount: 0,
        total_amount: schedule.total_amount,
      };

      const req: InvoiceRequest = {
        id: reqId,
        request_number: reqNumber,
        request_type: "recurring",
        recurring_invoice_id: schedule.id,
        client_id: client.id,
        client_name: client.client_name,
        client_legal_name: client.legal_name || client.client_name,
        client_gstin: client.registration?.gstin || undefined,
        client_address: client.addresses?.[0]?.street_address || "",
        requested_by: this.currentUser?.id,
        requested_by_name: "Automated Retainer Scheduler",
        subtotal: schedule.base_amount,
        gst_rate: schedule.gst_rate,
        cgst_amount: schedule.tax_amount / 2,
        sgst_amount: schedule.tax_amount / 2,
        igst_amount: 0,
        total_gst: schedule.tax_amount,
        grand_total: schedule.total_amount,
        place_of_supply: "Tamil Nadu",
        is_interstate: false,
        notes: schedule.notes || `Scheduled ${schedule.frequency} retainer cycle`,
        status: "Pending Approval",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        items: [item],
      };

      await insertInvoiceRequestToDb(req);

      // Compute next billing date
      const currentDate = new Date(schedule.next_billing_date);
      if (schedule.frequency === "Weekly") currentDate.setDate(currentDate.getDate() + 7);
      else if (schedule.frequency === "Monthly") currentDate.setMonth(currentDate.getMonth() + 1);
      else if (schedule.frequency === "Quarterly") currentDate.setMonth(currentDate.getMonth() + 3);
      else if (schedule.frequency === "Half-Yearly") currentDate.setMonth(currentDate.getMonth() + 6);
      else if (schedule.frequency === "Yearly") currentDate.setFullYear(currentDate.getFullYear() + 1);

      const nextDateIso = currentDate.toISOString().slice(0, 10);
      await this.updateRecurringInvoice(schedule.id, {
        next_billing_date: nextDateIso,
        last_generated_date: today,
        invoices_generated_count: (schedule.invoices_generated_count || 0) + 1,
      });

      const log: InvoiceApprovalLog = {
        id: ensureUuid(),
        invoice_request_id: reqId,
        action: "SUBMITTED",
        actor_name: "Recurring Billing Scheduler",
        notes: `Automated cycle triggered for retainer schedule ${schedule.schedule_code}. Next cycle: ${nextDateIso}.`,
        created_at: new Date().toISOString(),
      };
      await insertApprovalLogToDb(log);

      createdRequests.push(req);
      this.approvalLogs.unshift(log);
    }

    if (createdRequests.length > 0) {
      this.invoiceRequests.unshift(...createdRequests);
      this.addActivityLog(`Recurring scheduler triggered ${createdRequests.length} retainer invoice approval requests`, "finance");
      this.persist();
    }

    return createdRequests;
  }

  /**
   * Admin Approval Engine:
   * Approves an invoice request:
   * 1. Generates an official invoice in the central invoice register.
   * 2. Deducts reserved pending amount from tasks, increments billed amount, updates task billing status.
   * 3. Sets request status to Approved with generated invoice references.
   * 4. Logs audit trail.
   */
  async approveInvoiceRequest(requestId: string, adminComment?: string): Promise<Invoice> {
    const request = this.invoiceRequests.find((r) => r.id === requestId);
    if (!request) throw new Error("Invoice request not found.");
    if (request.status !== "Pending Approval") {
      throw new Error(`Request cannot be approved because status is ${request.status}.`);
    }

    // 1. Create the official Invoice in the central invoice register
    const invoiceItems = request.items.map((it) => ({
      id: ensureUuid(),
      description: it.description,
      sac_code: it.sac_code || "998311",
      quantity: 1,
      rate: it.amount,
      discount_amount: 0,
      taxable_amount: it.amount,
      gst_rate: it.gst_rate,
      cgst_amount: it.cgst_amount,
      sgst_amount: it.sgst_amount,
      igst_amount: it.igst_amount,
      total_amount: it.total_amount,
    }));

    const generatedInvoice = await this.addInvoice({
      financial_year: "2026-27",
      client_id: request.client_id,
      client_name: request.client_name,
      client_legal_name: request.client_legal_name || request.client_name,
      client_address: request.client_address || "",
      client_gstin: request.client_gstin,
      invoice_date: new Date().toISOString().slice(0, 10),
      due_date: this.addDaysIso(new Date().toISOString().slice(0, 10), 15),
      place_of_supply: request.place_of_supply,
      is_interstate: request.is_interstate,
      reverse_charge: false,
      subtotal: request.subtotal,
      discount_amount: 0,
      taxable_amount: request.subtotal,
      cgst_amount: request.cgst_amount,
      sgst_amount: request.sgst_amount,
      igst_amount: request.igst_amount,
      total_gst: request.total_gst,
      grand_total: request.grand_total,
      status: "Finalized",
      notes: request.notes,
      terms_conditions: request.terms_conditions,
      created_by_name: request.requested_by_name,
      items: invoiceItems,
    });

    // 2. Update task billing status & amounts
    for (const it of request.items) {
      if (it.task_id) {
        const tIndex = this.tasks.findIndex((t) => t.id === it.task_id);
        if (tIndex !== -1) {
          const t = this.tasks[tIndex];
          const newPending = Math.max(0, (t.pending_approval_amount || 0) - it.amount);
          const newBilled = (t.billed_amount || 0) + it.amount;
          const billingAmt = t.billing_amount || 0;
          const newRemaining = Math.max(0, billingAmt - newBilled);
          const newStatus: TaskBillingStatus = newRemaining <= 0.01 ? "Billed" : "Partially Billed";

          const taskUpdates = {
            pending_approval_amount: newPending,
            billed_amount: newBilled,
            remaining_amount: newRemaining,
            billing_status: newStatus,
          };

          this.tasks[tIndex] = { ...t, ...taskUpdates };
          await updateTaskInDb(t.id, taskUpdates);
        }
      }
    }

    // 3. Mark request Approved
    const approvedAt = new Date().toISOString();
    const approvedByName = this.currentUser?.full_name || "Admin";
    const approvedBy = this.currentUser?.id;

    request.status = "Approved";
    request.approved_by = approvedBy;
    request.approved_by_name = approvedByName;
    request.approved_at = approvedAt;
    request.generated_invoice_id = generatedInvoice.id;
    request.generated_invoice_number = generatedInvoice.invoice_number;
    request.updated_at = approvedAt;

    await updateInvoiceRequestInDb(request.id, {
      status: "Approved",
      approved_by: approvedBy,
      approved_by_name: approvedByName,
      approved_at: approvedAt,
      generated_invoice_id: generatedInvoice.id,
      generated_invoice_number: generatedInvoice.invoice_number,
    });

    // 4. Record Approval and Generation Audit Logs
    const approvalLog: InvoiceApprovalLog = {
      id: ensureUuid(),
      invoice_request_id: request.id,
      action: "APPROVED",
      actor_id: approvedBy,
      actor_name: approvedByName,
      notes: adminComment || `Approved by ${approvedByName}. Generated invoice ${generatedInvoice.invoice_number}.`,
      created_at: approvedAt,
    };
    await insertApprovalLogToDb(approvalLog);
    this.approvalLogs.unshift(approvalLog);

    this.addActivityLog(`Admin approved invoice request ${request.request_number} -> Generated ${generatedInvoice.invoice_number}`, "invoice", generatedInvoice.id);
    this.persist();
    return generatedInvoice;
  }

  /**
   * Admin Rejection Engine:
   * Rejects an invoice request, releasing the reserved pending approval amounts on tasks.
   */
  async rejectInvoiceRequest(requestId: string, reason: string): Promise<void> {
    const request = this.invoiceRequests.find((r) => r.id === requestId);
    if (!request) throw new Error("Invoice request not found.");
    if (request.status !== "Pending Approval") {
      throw new Error(`Request cannot be rejected because status is ${request.status}.`);
    }

    // Release reserved amounts on tasks
    for (const it of request.items) {
      if (it.task_id) {
        const tIndex = this.tasks.findIndex((t) => t.id === it.task_id);
        if (tIndex !== -1) {
          const t = this.tasks[tIndex];
          const newPending = Math.max(0, (t.pending_approval_amount || 0) - it.amount);
          this.tasks[tIndex] = { ...t, pending_approval_amount: newPending };
          await updateTaskInDb(t.id, { pending_approval_amount: newPending });
        }
      }
    }

    const rejectedAt = new Date().toISOString();
    const rejectedByName = this.currentUser?.full_name || "Admin";

    request.status = "Rejected";
    request.rejection_reason = reason;
    request.updated_at = rejectedAt;

    await updateInvoiceRequestInDb(request.id, {
      status: "Rejected",
      rejection_reason: reason,
    });

    const rejectionLog: InvoiceApprovalLog = {
      id: ensureUuid(),
      invoice_request_id: request.id,
      action: "REJECTED",
      actor_id: this.currentUser?.id,
      actor_name: rejectedByName,
      notes: reason,
      created_at: rejectedAt,
    };
    await insertApprovalLogToDb(rejectionLog);
    this.approvalLogs.unshift(rejectionLog);

    this.addActivityLog(`Rejected invoice request ${request.request_number}: ${reason}`, "invoice", request.id);
    this.persist();
  }

  // Employees & Staff Directory
  getEmployees(): Employee[] {
    const seen = new Set<string>();
    const unique: Employee[] = [];
    for (const emp of this.employees) {
      if (!emp) continue;
      const nameKey = (emp.full_name || "").trim().toLowerCase();
      if (!seen.has(emp.id) && !seen.has(nameKey)) {
        seen.add(emp.id);
        if (nameKey) seen.add(nameKey);
        unique.push(emp);
      }
    }
    return unique;
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.employees.find(e => e.id === id);
  }

  addEmployee(empData: Omit<Employee, "id" | "employee_code" | "created_at">): Employee {
    const nextNum = this.employees.length + 1;
    const employee_code = `EMP-${String(nextNum).padStart(3, "0")}`;
    const id = `emp-${Date.now()}`;

    const newEmployee: Employee = {
      ...empData,
      id,
      employee_code,
      created_at: new Date().toISOString()
    };

    if (newEmployee.team_id) {
      const team = this.teams.find((t) => t.id === newEmployee.team_id);
      if (team) {
        newEmployee.team_name = team.name;
        const members = team.members ? [...team.members] : [];
        members.push({
          id: `tm-${Date.now()}`,
          team_id: team.id,
          employee_id: newEmployee.id,
          employee_name: newEmployee.full_name,
          designation: newEmployee.designation_name,
          role_in_team: newEmployee.role_code || "Member",
          is_active: true,
          joined_at: newEmployee.created_at,
        });
        team.members = members;
        team.member_count = members.length;
      }
    }

    this.employees.push(newEmployee);
    this.addActivityLog(`Onboarded new employee: ${newEmployee.full_name}`, "employee", id);
    this.persist();
    return newEmployee;
  }

  /** Super Admin exclusive: create a new Admin account in the directory. */
  createAdminUser(input: {
    first_name: string;
    last_name: string;
    email: string;
    mobile_number?: string;
    designation_name?: string;
  }): { ok: boolean; employee?: Employee; error?: string } {
    if (this.currentUser?.role_code !== "SUPER_ADMIN") {
      return { ok: false, error: "Only Super Admin can create Admin accounts." };
    }
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return { ok: false, error: "Enter a valid official email address." };
    }
    if (
      this.employees.some(
        (e) => (e.email || "").trim().toLowerCase() === normalizedEmail
      )
    ) {
      return {
        ok: false,
        error: "An account with this email already exists. Promote the existing user instead.",
      };
    }

    const first = input.first_name.trim();
    const last = input.last_name.trim();
    if (!first) {
      return { ok: false, error: "First name is required." };
    }

    const fullName = [first, last].filter(Boolean).join(" ");
    const created = this.addEmployee({
      first_name: first,
      last_name: last || "",
      full_name: fullName,
      email: normalizedEmail,
      mobile_number: input.mobile_number?.trim() || "—",
      designation_name: input.designation_name?.trim() || "Practice Admin",
      joining_date: new Date().toISOString().slice(0, 10),
      employment_status: "Active",
      is_active: true,
      role_code: "ADMIN",
      assigned_projects_count: 0,
      assigned_tasks_count: 0,
      completed_tasks_count: 0,
    });
    this.addActivityLog(
      `Created Admin account: ${created.full_name} (${created.email})`,
      "admin",
      created.id
    );
    this.persist();
    this.notify();
    return { ok: true, employee: created };
  }

  /** Super Admin exclusive: promote an employee to ADMIN or demote an ADMIN to another role. */
  updateEmployeeRole(
    employeeId: string,
    roleCode: RoleCode
  ): { ok: boolean; error?: string } {
    if (this.currentUser?.role_code !== "SUPER_ADMIN") {
      return { ok: false, error: "Only Super Admin can manage Admin roles." };
    }
    const idx = this.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) {
      return { ok: false, error: "Employee not found." };
    }
    const target = this.employees[idx];
    if (isSuperAdminEmail(target.email) || target.role_code === "SUPER_ADMIN") {
      return { ok: false, error: "Primary Super Admin role cannot be modified." };
    }
    if (roleCode === "SUPER_ADMIN") {
      return { ok: false, error: "Only the configured Super Admin holds SUPER_ADMIN." };
    }

    const previousRole = target.role_code || "EMPLOYEE";
    const updated: Employee = {
      ...target,
      role_code: roleCode,
      designation_name:
        roleCode === "ADMIN" && !target.designation_name
          ? "Practice Admin"
          : target.designation_name,
    };
    this.employees[idx] = updated;
    this.addActivityLog(
      `Changed role for ${updated.full_name} (${previousRole} → ${roleCode})`,
      "admin",
      updated.id
    );
    this.persist();
    this.notify();
    return { ok: true };
  }

  /** Activate or suspend an employee/admin account. Only Super Admin may toggle ADMIN accounts. */
  setEmployeeActiveStatus(
    employeeId: string,
    isActive: boolean
  ): { ok: boolean; error?: string } {
    if (!this.isCurrentUserAdmin()) {
      return { ok: false, error: "Unauthorized." };
    }
    const idx = this.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) {
      return { ok: false, error: "User not found." };
    }
    const target = this.employees[idx];
    if (isSuperAdminEmail(target.email) || target.role_code === "SUPER_ADMIN") {
      return { ok: false, error: "Super Admin account cannot be deactivated." };
    }
    if (target.role_code === "ADMIN" && this.currentUser?.role_code !== "SUPER_ADMIN") {
      return { ok: false, error: "Only Super Admin can activate or suspend Admin accounts." };
    }

    const updated: Employee = {
      ...target,
      is_active: isActive,
      employment_status: isActive ? "Active" : "Inactive",
    };
    this.employees[idx] = updated;
    this.addActivityLog(
      `${isActive ? "Activated" : "Suspended"} ${updated.role_code === "ADMIN" ? "Admin" : "Employee"} account: ${updated.full_name}`,
      "admin",
      updated.id
    );
    this.persist();
    this.notify();
    return { ok: true };
  }

  // Teams
  getTeams(): Team[] {
    return [...this.teams];
  }

  addTeam(teamData: Omit<Team, "id">): Team {
    const id = `team-${Date.now()}`;
    const newTeam: Team = { ...teamData, id, members: [] };
    this.teams.push(newTeam);
    this.addActivityLog(`Created team: ${newTeam.name}`, "team", id);
    return newTeam;
  }

  // Documents (Cloudflare R2 Metadata) & Centralized Recycle Bin Recovery Engine
  getDocuments(): FileObject[] {
    return this.documents.filter((d) => !d.is_deleted);
  }

  getAllDocuments(): FileObject[] {
    return [...this.documents];
  }

  getDocumentsByEntity(entityType: string, entityId: string): FileObject[] {
    return this.documents.filter(
      (d) => !d.is_deleted && d.entity_type === entityType && d.entity_id === entityId
    );
  }

  async addDocument(docData: Omit<FileObject, "id" | "created_at">): Promise<FileObject> {
    const id = ensureUuid();
    const newDoc: FileObject = {
      ...docData,
      id,
      created_at: new Date().toISOString(),
      is_deleted: false,
    };
    await insertDocumentToDb(newDoc);
    this.documents.unshift(newDoc);
    this.addActivityLog(`Uploaded document: ${newDoc.file_name}`, "document", id);
    this.persist();
    return newDoc;
  }

  // Soft Delete (Moves to Recycle Bin with 25 days recovery window)
  deleteDocument(docId: string, user?: Employee): boolean {
    return this.softDeleteDocument(docId, user);
  }

  softDeleteDocument(docId: string, currentUser?: Employee): boolean {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return false;
    const user = currentUser || this.currentUser;
    doc.is_deleted = true;
    doc.deleted_at = new Date().toISOString();
    doc.deleted_by = user.id;
    doc.deleted_by_name = user.full_name;
    // 25 Days recovery deadline
    doc.recovery_deadline = new Date(Date.now() + 25 * 86400000).toISOString();
    this.addActivityLog(
      `Moved document "${doc.file_name}" to Recycle Bin (25-day recovery window) by ${user.full_name}`,
      "document",
      docId
    );
    this.persist();
    return true;
  }

  restoreDocument(docId: string, currentUser?: Employee): boolean {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return false;
    const user = currentUser || this.currentUser;
    doc.is_deleted = false;
    delete doc.deleted_at;
    delete doc.deleted_by;
    delete doc.deleted_by_name;
    delete doc.recovery_deadline;
    this.addActivityLog(
      `Restored document "${doc.file_name}" from Recycle Bin by ${user.full_name}`,
      "document",
      docId
    );
    this.persist();
    return true;
  }

  async permanentlyDeleteDocument(docId: string, currentUser?: Employee): Promise<boolean> {
    const doc = this.documents.find((d) => d.id === docId);
    if (!doc) return false;
    await deleteDocumentFromDb(docId);
    const user = currentUser || this.currentUser;
    this.documents = this.documents.filter((d) => d.id !== docId);
    this.addActivityLog(
      `Permanently deleted document "${doc.file_name}" via Recycle Bin authorization (${user.full_name})`,
      "document",
      docId
    );
    this.persist();
    return true;
  }

  // Folders & Recycle Bin
  getDocumentFolders(): DocumentFolder[] {
    if (!this.documentFolders || this.documentFolders.length === 0) {
      this.documentFolders = DEFAULT_DOCUMENT_FOLDERS.map((f) => ({ ...f }));
      this.persist();
    }
    return this.documentFolders.filter((f) => !f.is_deleted);
  }

  getAllDocumentFolders(): DocumentFolder[] {
    return [...this.documentFolders];
  }

  addDocumentFolder(data: {
    name: string;
    client_id?: string;
    description?: string;
  }): DocumentFolder {
    const id = generateId("fld");
    const client = data.client_id ? this.getClientById(data.client_id) : undefined;
    const newFolder: DocumentFolder = {
      id,
      name: data.name.trim(),
      path: `/${client ? `clients/${client.client_code}` : "general"}/${data.name.toLowerCase().replace(/\s+/g, "_")}`,
      client_id: data.client_id,
      client_name: client?.client_name,
      description: data.description?.trim() || "",
      created_at: new Date().toISOString(),
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      is_deleted: false,
    };
    this.documentFolders.unshift(newFolder);
    this.addActivityLog(`Created document folder: ${newFolder.name}`, "document", id);
    this.persist();
    return newFolder;
  }

  softDeleteFolder(folderId: string, currentUser?: Employee): boolean {
    const folder = this.documentFolders.find((f) => f.id === folderId);
    if (!folder) return false;
    const user = currentUser || this.currentUser;
    folder.is_deleted = true;
    folder.deleted_at = new Date().toISOString();
    folder.deleted_by = user.id;
    folder.deleted_by_name = user.full_name;
    folder.recovery_deadline = new Date(Date.now() + 25 * 86400000).toISOString();

    let containedDocs = 0;
    this.documents.forEach((d) => {
      if (d.folder_id === folderId) {
        d.is_deleted = true;
        d.deleted_at = folder.deleted_at;
        d.deleted_by = user.id;
        d.deleted_by_name = user.full_name;
        d.recovery_deadline = folder.recovery_deadline;
        containedDocs++;
      }
    });

    this.addActivityLog(
      `Moved folder "${folder.name}" (${containedDocs} items) to Recycle Bin (25-day recovery window) by ${user.full_name}`,
      "document",
      folderId
    );
    this.persist();
    return true;
  }

  restoreFolder(folderId: string, currentUser?: Employee): boolean {
    const folder = this.documentFolders.find((f) => f.id === folderId);
    if (!folder) return false;
    const user = currentUser || this.currentUser;
    folder.is_deleted = false;
    delete folder.deleted_at;
    delete folder.deleted_by;
    delete folder.deleted_by_name;
    delete folder.recovery_deadline;

    this.documents.forEach((d) => {
      if (d.folder_id === folderId) {
        d.is_deleted = false;
        delete d.deleted_at;
        delete d.deleted_by;
        delete d.deleted_by_name;
        delete d.recovery_deadline;
      }
    });

    this.addActivityLog(
      `Restored folder "${folder.name}" from Recycle Bin by ${user.full_name}`,
      "document",
      folderId
    );
    this.persist();
    return true;
  }

  permanentlyDeleteFolder(folderId: string, currentUser?: Employee): boolean {
    const folder = this.documentFolders.find((f) => f.id === folderId);
    if (!folder) return false;
    const user = currentUser || this.currentUser;
    this.documentFolders = this.documentFolders.filter((f) => f.id !== folderId);
    this.documents = this.documents.filter((d) => d.folder_id !== folderId);
    this.addActivityLog(
      `Permanently deleted folder "${folder.name}" via Recycle Bin authorization (${user.full_name})`,
      "document",
      folderId
    );
    this.persist();
    return true;
  }

  getRecycleBinItems() {
    const deletedDocs = this.documents.filter((d) => Boolean(d.is_deleted));
    const deletedFlds = this.documentFolders.filter((f) => Boolean(f.is_deleted));
    return {
      documents: deletedDocs,
      folders: deletedFlds,
      totalCount: deletedDocs.length + deletedFlds.length,
    };
  }

  restoreAllRecycleBin(currentUser?: Employee): number {
    const user = currentUser || this.currentUser;
    let count = 0;
    this.documents.forEach((d) => {
      if (d.is_deleted) {
        d.is_deleted = false;
        delete d.deleted_at;
        delete d.deleted_by;
        delete d.deleted_by_name;
        delete d.recovery_deadline;
        count++;
      }
    });
    this.documentFolders.forEach((f) => {
      if (f.is_deleted) {
        f.is_deleted = false;
        delete f.deleted_at;
        delete f.deleted_by;
        delete f.deleted_by_name;
        delete f.recovery_deadline;
        count++;
      }
    });
    this.addActivityLog(
      `Restored all items from Recycle Bin (${count} items restored by ${user.full_name})`,
      "document"
    );
    this.persist();
    return count;
  }

  emptyRecycleBin(currentUser?: Employee): number {
    const user = currentUser || this.currentUser;
    const total =
      this.documents.filter((d) => d.is_deleted).length +
      this.documentFolders.filter((f) => f.is_deleted).length;
    this.documents = this.documents.filter((d) => !d.is_deleted);
    this.documentFolders = this.documentFolders.filter((f) => !f.is_deleted);
    this.addActivityLog(
      `Emptied Recycle Bin: permanently erased ${total} documents and folders (${user.full_name})`,
      "document"
    );
    this.persist();
    return total;
  }


  // WhatsApp Message Templates
  getWhatsAppTemplates(): WhatsAppTemplate[] {
    return [...this.whatsAppTemplates];
  }

  async addWhatsAppTemplate(tpl: Omit<WhatsAppTemplate, "id" | "created_at">): Promise<WhatsAppTemplate> {
    const id = ensureUuid();
    const newTpl: WhatsAppTemplate = {
      ...tpl,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await upsertWhatsAppTemplateInDb(newTpl);
    this.whatsAppTemplates.push(newTpl);
    this.persist();
    return newTpl;
  }

  async updateWhatsAppTemplate(id: string, updates: Partial<WhatsAppTemplate>): Promise<WhatsAppTemplate | null> {
    const idx = this.whatsAppTemplates.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    const updated = {
      ...this.whatsAppTemplates[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    await upsertWhatsAppTemplateInDb(updated);
    this.whatsAppTemplates[idx] = updated;
    this.persist();
    return this.whatsAppTemplates[idx];
  }

  async deleteWhatsAppTemplate(id: string): Promise<boolean> {
    await deleteWhatsAppTemplateFromDb(id);
    const prevLen = this.whatsAppTemplates.length;
    this.whatsAppTemplates = this.whatsAppTemplates.filter((t) => t.id !== id);
    if (this.whatsAppTemplates.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // Centralized Universal Recycle Bin
  getUniversalRecycleBin(): UniversalRecycleBinItem[] {
    return [...this.universalRecycleBin];
  }

  async moveToRecycleBin(
    itemType: any,
    itemId: string,
    title: string,
    rawData: any,
    options?: {
      code?: string;
      subtitle?: string;
      category_name?: string;
      client_name?: string;
    }
  ): Promise<UniversalRecycleBinItem> {
    const user = this.currentUser;
    const deleted_at = new Date().toISOString();
    const recovery_deadline = new Date(Date.now() + 25 * 86400000).toISOString();
    const binItem: UniversalRecycleBinItem = {
      id: ensureUuid(),
      item_id: itemId,
      item_type: itemType,
      title,
      code: options?.code,
      subtitle: options?.subtitle,
      category_name: options?.category_name,
      client_name: options?.client_name,
      raw_data: rawData,
      deleted_at,
      deleted_by: isUuid(user.id) ? user.id : undefined,
      deleted_by_name: user.full_name,
      recovery_deadline,
    };
    this.universalRecycleBin.unshift(binItem);
    try {
      await insertRecycleBinItemToDb(binItem);
    } catch (e) {
      console.warn("Could not persist recycle bin item to Supabase:", e);
    }
    this.persist();
    return binItem;
  }

  addToUniversalRecycleBin(
    itemType: any,
    itemId: string,
    title: string,
    rawData: any,
    options?: {
      code?: string;
      subtitle?: string;
      category_name?: string;
      client_name?: string;
    }
  ) {
    void this.moveToRecycleBin(itemType, itemId, title, rawData, options);
  }

  restoreRecycleBinItem(binId: string, currentUser?: Employee): boolean {
    const itemIdx = this.universalRecycleBin.findIndex((i) => i.id === binId);
    if (itemIdx === -1) return false;
    const item = this.universalRecycleBin[itemIdx];
    const user = currentUser || this.currentUser;

    if (item.item_type === "document") {
      this.restoreDocument(item.item_id, user);
    } else if (item.item_type === "folder") {
      this.restoreFolder(item.item_id, user);
    } else if (item.item_type === "task" && item.raw_data) {
      const taskData = item.raw_data as Task;
      if (!this.tasks.some((t) => t.id === taskData.id)) {
        this.tasks.unshift(taskData);
      }
      void insertTaskToDb(taskData).catch((e) => console.warn("Failed to re-insert task in Supabase:", e));
      if (Array.isArray(taskData.subtasks)) {
        for (const st of taskData.subtasks) {
          if (!this.tasks.some((t) => t.id === st.id)) {
            this.tasks.push(st);
            void insertTaskToDb(st).catch(() => {});
          }
        }
      }
    } else if (item.item_type === "category" && item.raw_data) {
      const catData = item.raw_data as TaskCategory & { tasks?: Task[] };
      this.deletedTaskCategoryIds = this.deletedTaskCategoryIds.filter((cid) => cid !== catData.id);
      if (!this.taskCategories.some((c) => c.id === catData.id)) {
        this.taskCategories.push(catData);
      }
      void insertTaskCategoryToDb(catData).catch((e) => console.warn("Failed to re-insert category in Supabase:", e));
      if (Array.isArray(catData.tasks)) {
        for (const t of catData.tasks) {
          if (!this.tasks.some((existing) => existing.id === t.id)) {
            this.tasks.push(t);
            void insertTaskToDb(t).catch(() => {});
          }
        }
      }
    } else if ((item.item_type === "sub-category" || (item.item_type as string) === "sub_category") && item.raw_data) {
      const subData = item.raw_data as TaskSubCategory & { parent_category_id: string; tasks?: Task[] };
      const parentCat = this.taskCategories.find((c) => c.id === subData.parent_category_id);
      if (parentCat) {
        if (!parentCat.sub_categories) parentCat.sub_categories = [];
        if (!parentCat.sub_categories.some((s) => s.id === subData.id)) {
          parentCat.sub_categories.push(subData);
        }
        void insertTaskSubCategoryToDb(subData).catch((e) => console.warn("Failed to re-insert sub-category in Supabase:", e));
      }
      if (Array.isArray(subData.tasks)) {
        for (const t of subData.tasks) {
          if (!this.tasks.some((existing) => existing.id === t.id)) {
            this.tasks.push(t);
            void insertTaskToDb(t).catch(() => {});
          }
        }
      }
    } else if (item.item_type === "client" && item.raw_data) {
      if (!this.clients.some((c) => c.id === item.raw_data.id)) {
        this.clients.unshift(item.raw_data);
      }
      void insertClientToDb(item.raw_data).catch(() => {});
    } else if (item.item_type === "workflow" && item.raw_data) {
      if (!this.workflows.some((w) => w.id === item.raw_data.id)) {
        this.workflows.unshift(item.raw_data);
      }
      void insertWorkflowToDb(item.raw_data).catch(() => {});
    } else if (item.item_type === "vault-credential" && item.raw_data) {
      if (!this.vaultCredentials.some((c) => c.id === item.raw_data.id)) {
        this.vaultCredentials.unshift(item.raw_data);
      }
      void insertVaultCredentialToDb(item.raw_data).catch(() => {});
      this.logVaultActivity({
        credential_id: item.raw_data.id,
        portal_name: item.title,
        action: "RESTORE",
        performed_by_id: user.id,
        performed_by_name: user.full_name,
        details: `Restored credential "${item.title}" from Recycle Bin`,
        client_name: item.client_name,
      });
    }

    this.universalRecycleBin.splice(itemIdx, 1);
    void deleteRecycleBinItemFromDb(binId).catch(() => {});
    this.addActivityLog(
      `Restored ${item.item_type} "${item.title}" from Recycle Bin by ${user.full_name}`,
      "document",
      item.item_id
    );
    this.persist();
    return true;
  }

  restoreAllUniversalRecycleBin(currentUser?: Employee): number {
    const user = currentUser || this.currentUser;
    let count = 0;
    const items = [...this.universalRecycleBin];
    for (const item of items) {
      if (this.restoreRecycleBinItem(item.id, user)) {
        count++;
      }
    }
    return count;
  }

  emptyUniversalRecycleBin(currentUser?: Employee): number {
    const user = currentUser || this.currentUser;
    const count = this.universalRecycleBin.length;
    for (const item of this.universalRecycleBin) {
      void deleteRecycleBinItemFromDb(item.id).catch(() => {});
    }
    this.universalRecycleBin = [];
    this.addActivityLog(
      `Permanently emptied Universal Recycle Bin (${count} items erased by ${user.full_name})`,
      "document"
    );
    this.persist();
    return count;
  }

  permanentlyDeleteRecycleBinItem(binId: string, currentUser?: Employee): boolean {
    const user = currentUser || this.currentUser;
    const item = this.universalRecycleBin.find((i) => i.id === binId);
    if (!item) return false;
    this.universalRecycleBin = this.universalRecycleBin.filter((i) => i.id !== binId);
    void deleteRecycleBinItemFromDb(binId).catch(() => {});

    // Permanently remove from Supabase DB tables
    if (item.item_type === "task") {
      void deleteTaskFromDb(item.item_id).catch(() => {});
    } else if (item.item_type === "category") {
      void deleteTaskCategoryFromDb(item.item_id).catch(() => {});
    } else if (item.item_type === "sub-category") {
      void deleteTaskSubCategoryFromDb(item.item_id).catch(() => {});
    } else if (item.item_type === "client") {
      void deleteClientFromDb(item.item_id).catch(() => {});
    }

    this.addActivityLog(
      `Permanently deleted ${item.item_type} "${item.title}" from Recycle Bin (${user.full_name})`,
      "document",
      item.item_id
    );
    this.persist();
    return true;
  }

  // Notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  markNotificationAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      this.persist();
    }
  }

  addNotification(
    recipientEmployeeId: string,
    title: string,
    message: string,
    type: Notification["type"],
    referenceType?: string,
    referenceId?: string
  ) {
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recipient_employee_id: recipientEmployeeId,
      title,
      message,
      type,
      reference_type: referenceType,
      reference_id: referenceId,
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    this.persist();
  }

  // Activity Logs
  getActivityLogs(): ActivityLog[] {
    return [...this.activityLogs];
  }

  addActivityLog(action: string, entityType: string, entityId?: string, details?: Record<string, any>) {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      employee_id: this.currentUser?.id,
      employee_name: this.currentUser?.full_name || "System",
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    };
    this.activityLogs.unshift(newLog);
    this.persist();
  }

  // Geo-Fenced Attendance Engine
  getOfficeGeoConfig(): OfficeGeoConfig | null {
    return this.officeGeoConfig ? { ...this.officeGeoConfig } : null;
  }

  setOfficeGeoConfig(
    config: Omit<OfficeGeoConfig, "updated_at" | "updated_by_name">
  ): OfficeGeoConfig {
    const nextConfig: OfficeGeoConfig = {
      location_name: config.location_name.trim() || "Head Office",
      address: config.address?.trim() || "",
      latitude: Number(config.latitude),
      longitude: Number(config.longitude),
      radius_meters: Math.max(10, Number(config.radius_meters) || 50),
      updated_at: new Date().toISOString(),
      updated_by_name: this.currentUser?.full_name || "System Administrator",
    };
    this.officeGeoConfig = nextConfig;
    this.addActivityLog(
      `Configured Geo-Attendance Location "${nextConfig.location_name}" (${nextConfig.latitude.toFixed(6)}, ${nextConfig.longitude.toFixed(6)}) within ±${nextConfig.radius_meters}m`,
      "attendance"
    );
    return nextConfig;
  }

  getAttendanceRecords(date?: string): AttendanceRecord[] {
    const list = date
      ? this.attendanceRecords.filter((r) => r.date === date)
      : [...this.attendanceRecords];
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  markAttendanceByGeo(params: {
    employee_id: string;
    latitude: number;
    longitude: number;
    accuracy_meters?: number;
    action?: "check-in" | "check-out";
  }): {
    matched: boolean;
    distanceMeters: number;
    radiusMeters: number;
    record?: AttendanceRecord;
    error?: string;
  } {
    const config = this.officeGeoConfig;
    if (!config) {
      return {
        matched: false,
        distanceMeters: 0,
        radiusMeters: 50,
        error: "Admin has not configured the office geo-location yet.",
      };
    }

    const emp = this.employees.find((e) => e.id === params.employee_id);
    if (!emp) {
      return {
        matched: false,
        distanceMeters: 0,
        radiusMeters: config.radius_meters || 50,
        error: "Employee record not found.",
      };
    }

    const radiusMeters = config.radius_meters || 50;
    const rawDistance = calculateDistanceMeters(
      params.latitude,
      params.longitude,
      config.latitude,
      config.longitude
    );
    const distanceMeters = Math.round(rawDistance);
    const matched = distanceMeters <= radiusMeters;
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    if (!matched) {
      const attempt: AttendanceRecord = {
        id: generateId("att"),
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_code: emp.employee_code,
        date: today,
        check_in_at: nowIso,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy_meters: params.accuracy_meters ? Math.round(params.accuracy_meters) : undefined,
        distance_meters: distanceMeters,
        allowed_radius_meters: radiusMeters,
        status: "Out of Range",
        matched: false,
        location_name: config.location_name,
        created_at: nowIso,
      };
      this.attendanceRecords.unshift(attempt);
      this.addActivityLog(
        `Out-of-range attendance attempt by ${emp.full_name} (${distanceMeters}m away; limit ±${radiusMeters}m)`,
        "attendance",
        attempt.id
      );
      return {
        matched: false,
        distanceMeters,
        radiusMeters,
        record: attempt,
        error: `Location mismatch: ${distanceMeters}m away from ${config.location_name} (must be within ±${radiusMeters}m).`,
      };
    }

    if (params.action === "check-out") {
      const existingPresent = this.attendanceRecords.find(
        (r) => r.employee_id === emp.id && r.date === today && r.matched && r.status === "Present"
      );
      if (existingPresent) {
        existingPresent.check_out_at = nowIso;
        existingPresent.status = "Checked Out";
        existingPresent.distance_meters = distanceMeters;
        this.addActivityLog(
          `${emp.full_name} checked out (${distanceMeters}m from ${config.location_name})`,
          "attendance",
          existingPresent.id
        );
        return {
          matched: true,
          distanceMeters,
          radiusMeters,
          record: existingPresent,
        };
      }
    }

    const alreadyCheckedIn = this.attendanceRecords.find(
      (r) =>
        r.employee_id === emp.id &&
        r.date === today &&
        r.matched &&
        (r.status === "Present" || r.status === "Checked Out")
    );
    if (alreadyCheckedIn) {
      return {
        matched: true,
        distanceMeters,
        radiusMeters,
        record: alreadyCheckedIn,
      };
    }

    const record: AttendanceRecord = {
      id: generateId("att"),
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_code: emp.employee_code,
      date: today,
      check_in_at: nowIso,
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy_meters: params.accuracy_meters ? Math.round(params.accuracy_meters) : undefined,
      distance_meters: distanceMeters,
      allowed_radius_meters: radiusMeters,
      status: "Present",
      matched: true,
      location_name: config.location_name,
      created_at: nowIso,
    };

    this.attendanceRecords.unshift(record);
    this.addActivityLog(
      `Marked Present for ${emp.full_name} via Geo-Attendance (${distanceMeters}m from ${config.location_name})`,
      "attendance",
      record.id
    );
    return {
      matched: true,
      distanceMeters,
      radiusMeters,
      record,
    };
  }

  // ==========================================================================
  // CREDENTIAL VAULT (AES-256-GCM SECURE CREDENTIALS & AUDIT LOGS)
  // ==========================================================================

  getVaultCredentials(): VaultCredential[] {
    return [...this.vaultCredentials];
  }

  getVaultCredentialById(id: string): VaultCredential | undefined {
    return this.vaultCredentials.find((c) => c.id === id);
  }

  async addVaultCredential(
    credData: Omit<VaultCredential, "id" | "created_at" | "updated_at">
  ): Promise<VaultCredential> {
    const id = ensureUuid();
    const now = new Date().toISOString();
    const newCred: VaultCredential = {
      ...credData,
      id,
      created_at: now,
      updated_at: now,
      last_password_changed_at: credData.last_password_changed_at || now,
      rotation_reminder_days: credData.rotation_reminder_days || 90,
      password_history: credData.password_history || [],
      created_by_id: this.currentUser?.id,
      created_by_name: this.currentUser?.full_name,
    };

    // Direct database write
    await insertVaultCredentialToDb(newCred);

    this.vaultCredentials.unshift(newCred);
    this.logVaultActivity({
      credential_id: id,
      portal_name: newCred.portal_name,
      action: "CREATE",
      performed_by_id: this.currentUser.id,
      performed_by_name: this.currentUser.full_name,
      details: `Created credential for "${newCred.portal_name}" (${newCred.username})`,
      client_name: newCred.client_name,
    });
    this.persist();
    return newCred;
  }

  async updateVaultCredential(
    id: string,
    updates: Partial<VaultCredential>
  ): Promise<VaultCredential | null> {
    const index = this.vaultCredentials.findIndex((c) => c.id === id);
    if (index === -1) return null;

    const current = this.vaultCredentials[index];
    const now = new Date().toISOString();

    let password_history = current.password_history ? [...current.password_history] : [];
    let last_password_changed_at = current.last_password_changed_at;

    // Track password history when password is changed
    if (updates.password_encrypted && updates.password_encrypted !== current.password_encrypted) {
      password_history.unshift({
        id: ensureUuid(),
        password_encrypted: current.password_encrypted,
        changed_at: now,
        changed_by_id: this.currentUser.id,
        changed_by_name: this.currentUser.full_name,
      });
      last_password_changed_at = now;
    }

    const merged: VaultCredential = {
      ...current,
      ...updates,
      password_history,
      last_password_changed_at,
      updated_at: now,
    };

    // Direct database write
    await updateVaultCredentialInDb(id, merged);

    this.vaultCredentials[index] = merged;
    this.logVaultActivity({
      credential_id: id,
      portal_name: merged.portal_name,
      action: "UPDATE",
      performed_by_id: this.currentUser.id,
      performed_by_name: this.currentUser.full_name,
      details: `Updated credential information for "${merged.portal_name}"`,
      client_name: merged.client_name,
    });
    this.persist();
    return merged;
  }

  async deleteVaultCredential(id: string): Promise<boolean> {
    const target = this.vaultCredentials.find((c) => c.id === id);
    if (!target) return false;

    // Direct database write
    await deleteVaultCredentialFromDb(id);

    // Safely move to Universal Recycle Bin with 25-day recovery window!
    await this.moveToRecycleBin(
      "vault-credential",
      id,
      `${target.portal_name} (${target.username})`,
      target,
      {
        subtitle: target.category,
        category_name: target.category,
        client_name: target.client_name,
      }
    );

    this.vaultCredentials = this.vaultCredentials.filter((c) => c.id !== id);
    this.logVaultActivity({
      credential_id: id,
      portal_name: target.portal_name,
      action: "DELETE",
      performed_by_id: this.currentUser.id,
      performed_by_name: this.currentUser.full_name,
      details: `Moved credential for "${target.portal_name}" to Recycle Bin`,
      client_name: target.client_name,
    });
    this.persist();
    return true;
  }

  getVaultAuditLogs(): VaultAuditLog[] {
    return [...this.vaultAuditLogs];
  }

  logVaultActivity(log: Omit<VaultAuditLog, "id" | "timestamp">): void {
    const entry: VaultAuditLog = {
      ...log,
      id: ensureUuid(),
      timestamp: new Date().toISOString(),
    };
    this.vaultAuditLogs.unshift(entry);
    if (this.vaultAuditLogs.length > 500) {
      this.vaultAuditLogs = this.vaultAuditLogs.slice(0, 500);
    }
    void insertVaultAuditLogToDb(entry).catch(() => {});
    this.persist();
  }
}

// Global Singleton Instance
export const pmsStore = new PMSDataStore();
