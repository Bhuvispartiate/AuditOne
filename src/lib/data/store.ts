// ============================================================================
// PMS CENTRAL DATA STORE & BUSINESS ENGINE (ZERO MOCK DATA)
// Pure database-driven and state repository for production operations
// ============================================================================

import {
  Client,
  Employee,
  Department,
  Designation,
  Team,
  Service,
  ServiceEngagement,
  Project,
  Task,
  TaskComment,
  WorkflowTemplate,
  Invoice,
  Payment,
  FileObject,
  Notification,
  ActivityLog,
  DashboardKPIs,
  RoleCode
} from "@/types";
import { createClient } from "@/lib/supabase/client";

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

// Default System Administrator Profile for initial system access
const DEFAULT_SYSTEM_ADMIN: Employee = {
  id: "emp-admin-01",
  employee_code: "EMP-001",
  first_name: "Super",
  last_name: "Admin",
  full_name: "System Administrator",
  email: "admin@pmsfirm.com",
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

const STORAGE_KEY = "acru_pms_store_v1";

class PMSDataStore {
  // PURE PRODUCTION REPOSITORIES — ZERO MOCK DATA (PERSISTED TO LOCALSTORAGE + SUPABASE SYNC)
  private clients: Client[] = [];
  private services: Service[] = [];
  private engagements: ServiceEngagement[] = [];
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private workflows: WorkflowTemplate[] = [];
  private employees: Employee[] = [DEFAULT_SYSTEM_ADMIN];
  private departments: Department[] = [];
  private teams: Team[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];
  private documents: FileObject[] = [];
  private notifications: Notification[] = [];
  private activityLogs: ActivityLog[] = [];
  private currentUser: Employee = DEFAULT_SYSTEM_ADMIN;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.hydrate();
    this.backfillMissingProjectsAndTasks();
    void this.syncClientsFromSupabase();
  }

  /**
   * Ensures every existing active ServiceEngagement has a linked Project & Task
   * (backfills engagements created prior to automatic cascade creation).
   */
  private backfillMissingProjectsAndTasks() {
    if (this.engagements.length === 0) return;
    let changed = false;

    this.engagements.forEach((eng) => {
      if (eng.status !== "Active") return;
      const client = this.clients.find((c) => c.id === eng.client_id);
      const clientName = eng.client_name || client?.client_name || "Client";

      let project = this.projects.find(
        (p) =>
          p.service_engagement_id === eng.id ||
          (p.client_id === eng.client_id && p.service_name === eng.service_name)
      );

      if (!project) {
        const nextNum = this.projects.length + 1;
        const year = new Date().getFullYear();
        const dueDate =
          eng.end_date ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        project = {
          id: generateId("proj"),
          project_code: `PRJ-${year}-${String(nextNum).padStart(3, "0")}`,
          project_name: `${clientName} — ${eng.service_name}`,
          project_type: "Client Project",
          client_id: eng.client_id,
          client_name: clientName,
          service_engagement_id: eng.id,
          service_name: eng.service_name,
          department_id: eng.department_id,
          department_name: eng.department_name || "Practice",
          project_manager_id: eng.relationship_manager_id || this.currentUser.id,
          project_manager_name: eng.relationship_manager_name || this.currentUser.full_name,
          description: `Service delivery project for ${eng.service_name} (${eng.billing_frequency})`,
          priority: "Medium",
          start_date: eng.start_date,
          due_date: dueDate,
          progress_percentage: 0,
          status: "In Progress",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        this.projects.unshift(project);
        changed = true;
      }

      const hasTask = this.tasks.some((t) => t.project_id === project!.id);
      if (!hasTask) {
        const nextTaskNum = this.tasks.length + 1;
        this.tasks.unshift({
          id: generateId("tsk"),
          task_code: `TSK-${String(nextTaskNum).padStart(3, "0")}`,
          title: `${eng.service_name} — ${eng.billing_frequency} Execution`,
          project_id: project.id,
          project_name: project.project_name,
          assigned_employee_id: eng.relationship_manager_id || this.currentUser.id,
          assigned_employee_name: eng.relationship_manager_name || this.currentUser.full_name,
          priority: "Medium",
          due_date: project.due_date,
          status: "To Do",
          description: `Deliverable task for ${clientName} under ${eng.service_code}.`,
          created_by: this.currentUser.id,
          created_by_name: this.currentUser.full_name,
          comments_count: 0,
          attachments_count: 0,
          created_at: new Date().toISOString(),
        });
        changed = true;
      }
    });

    if (changed) {
      this.persist();
    }
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

  private hydrate() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.clients)) this.clients = parsed.clients;
      if (Array.isArray(parsed.services)) this.services = parsed.services;
      if (Array.isArray(parsed.engagements)) this.engagements = parsed.engagements;
      if (Array.isArray(parsed.projects)) this.projects = parsed.projects;
      if (Array.isArray(parsed.tasks)) this.tasks = parsed.tasks;
      if (Array.isArray(parsed.workflows)) this.workflows = parsed.workflows;
      if (Array.isArray(parsed.employees) && parsed.employees.length > 0) {
        this.employees = parsed.employees;
      }
      if (Array.isArray(parsed.departments)) this.departments = parsed.departments;
      if (Array.isArray(parsed.teams)) this.teams = parsed.teams;
      if (Array.isArray(parsed.invoices)) this.invoices = parsed.invoices;
      if (Array.isArray(parsed.payments)) this.payments = parsed.payments;
      if (Array.isArray(parsed.documents)) this.documents = parsed.documents;
      if (Array.isArray(parsed.notifications)) this.notifications = parsed.notifications;
      if (Array.isArray(parsed.activityLogs)) this.activityLogs = parsed.activityLogs;
      if (parsed.currentUser && parsed.currentUser.id) {
        this.currentUser = parsed.currentUser;
      }
    } catch (error) {
      console.error("Failed to hydrate PMS store from localStorage:", error);
    }
  }

  private persist() {
    if (typeof window !== "undefined" && window.localStorage) {
      try {
        const snapshot = {
          clients: this.clients,
          services: this.services,
          engagements: this.engagements,
          projects: this.projects,
          tasks: this.tasks,
          workflows: this.workflows,
          employees: this.employees,
          departments: this.departments,
          teams: this.teams,
          invoices: this.invoices,
          payments: this.payments,
          documents: this.documents,
          notifications: this.notifications,
          activityLogs: this.activityLogs,
          currentUser: this.currentUser,
        };
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (error) {
        console.error("Failed to persist PMS store to localStorage:", error);
      }
    }
    this.notify();
  }

  private async syncClientsFromSupabase() {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const { data, error } = await supabase
        .from("clients")
        .select("*, client_contacts(*), client_addresses(*), client_registrations(*)")
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data) || data.length === 0) return;

      const remoteClients: Client[] = data.map((row: any) => {
        const reg = Array.isArray(row.client_registrations)
          ? row.client_registrations[0]
          : row.client_registrations;
        const contacts = Array.isArray(row.client_contacts) ? row.client_contacts : [];
        const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0];
        const addresses = Array.isArray(row.client_addresses) ? row.client_addresses : [];

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
    } catch {
      // Local persistence already succeeded
    }
  }

  // Active Session User
  getCurrentUser(): Employee {
    return this.currentUser;
  }

  setCurrentUser(empId: string) {
    const found = this.employees.find(e => e.id === empId);
    if (found) {
      this.currentUser = found;
      this.persist();
    }
  }

  // Dashboard KPIs (100% Dynamically Calculated from Real Database State)
  getKPIs(): DashboardKPIs {
    const totalClients = this.clients.length;
    const activeClients = this.clients.filter(c => c.status === "Active").length;
    const totalServices = this.services.length;
    const activeProjects = this.projects.filter(p => p.status === "In Progress" || p.status === "Under Review").length;
    const pendingTasks = this.tasks.filter(t => t.status !== "Completed").length;
    const completedTasks = this.tasks.filter(t => t.status === "Completed").length;
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

  // Clients
  getClients(): Client[] {
    return [...this.clients];
  }

  getClientById(id: string): Client | undefined {
    const client = this.clients.find(c => c.id === id);
    if (!client) return undefined;

    const clientEngagements = this.engagements.filter(e => e.client_id === id);
    const clientProjects = this.projects.filter(p => p.client_id === id);
    const clientInvoices = this.invoices.filter(i => i.client_id === id);
    const clientPayments = this.payments.filter(p => p.client_id === id);

    const invoiced = clientInvoices
      .filter(i => i.status !== "Cancelled" && i.status !== "Draft")
      .reduce((sum, i) => sum + i.grand_total, 0);
    const paid = clientPayments
      .filter(p => p.status === "Completed")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ...client,
      active_services_count: clientEngagements.filter(e => e.status === "Active").length,
      total_projects_count: clientProjects.length,
      completed_projects_count: clientProjects.filter(p => p.status === "Completed").length,
      total_invoiced_amount: invoiced,
      total_payments_received: paid,
      outstanding_amount: Math.max(0, invoiced - paid)
    };
  }

  addClient(newClient: Omit<Client, "id" | "client_code" | "created_at" | "updated_at">): Client {
    const nextNum = this.clients.length + 1;
    const year = new Date().getFullYear();
    const client_code = `CLI-${year}-${String(nextNum).padStart(3, "0")}`;
    const id = generateId("cli");
    
    const client: Client = {
      ...newClient,
      id,
      client_code,
      contact: newClient.contact ? { ...newClient.contact, client_id: id } : undefined,
      addresses: newClient.addresses?.map((addr) => ({ ...addr, client_id: id })),
      registration: newClient.registration ? { ...newClient.registration, client_id: id } : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_services_count: 0,
      total_projects_count: 0,
      completed_projects_count: 0,
      pending_tasks_count: 0,
      total_invoiced_amount: 0,
      total_payments_received: 0,
      outstanding_amount: 0
    };

    this.clients.unshift(client);
    this.addActivityLog(`Onboarded new client: ${client.client_name}`, "client", id);
    this.persist();
    void this.pushClientToSupabase(client);
    return client;
  }

  updateClient(id: string, updates: Partial<Client>): Client | null {
    const index = this.clients.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.clients[index] = {
      ...this.clients[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.addActivityLog(`Updated client profile: ${this.clients[index].client_name}`, "client", id);
    this.persist();
    void this.pushClientToSupabase(this.clients[index]);
    return this.clients[index];
  }

  // Services & Engagements
  getServices(): Service[] {
    return [...this.services];
  }

  addService(service: Omit<Service, "id" | "created_at">): Service {
    const id = generateId("srv");
    const newService: Service = { ...service, id, created_at: new Date().toISOString() };
    this.services.push(newService);
    this.addActivityLog(`Added service to catalog: ${newService.service_name}`, "service", id);
    return newService;
  }

  updateService(id: string, updates: Partial<Omit<Service, "id" | "created_at">>): Service | null {
    const index = this.services.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.services[index] = {
      ...this.services[index],
      ...updates,
    };
    this.addActivityLog(`Updated service catalog entry: ${this.services[index].service_name}`, "service", id);
    return this.services[index];
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
   * Project -> Task hierarchy for that service delivery.
   */
  addServiceEngagementCascade(
    engagement: Omit<ServiceEngagement, "id" | "created_at">
  ): { engagement: ServiceEngagement; project: Project; tasks: Task[] } {
    const createdEngagement = this.addServiceEngagement(engagement);
    const matchedService = this.services.find((s) => s.id === engagement.service_id);

    const startMs = engagement.start_date ? new Date(engagement.start_date).getTime() : Date.now();
    const validStartMs = Number.isNaN(startMs) ? Date.now() : startMs;
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
      new Date(validStartMs + offsetDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const project = this.addProject({
      project_name: `${engagement.client_name || "Client"} — ${engagement.service_name}`,
      project_type: "Client Project",
      client_id: engagement.client_id,
      client_name: engagement.client_name,
      service_engagement_id: createdEngagement.id,
      service_name: engagement.service_name,
      department_id: engagement.department_id,
      department_name: engagement.department_name || "Practice",
      project_manager_id: engagement.relationship_manager_id || this.currentUser.id,
      project_manager_name: engagement.relationship_manager_name || this.currentUser.full_name,
      description:
        matchedService?.description ||
        `Service delivery project for ${engagement.service_name} (${engagement.billing_frequency})`,
      priority: "Medium",
      start_date: engagement.start_date,
      due_date: computedDueDate,
      status: "In Progress",
    });

    const createdTasks: Task[] = [];
    const matchingWorkflow = this.workflows.find(
      (w) => w.is_active && w.service_id === engagement.service_id
    );
    const stages = matchingWorkflow?.versions?.[0]?.stages || [];

    if (stages.length > 0) {
      stages.forEach((stage) => {
        const stageTasks = stage.tasks || [];
        if (stageTasks.length > 0) {
          stageTasks.forEach((stTask) => {
            createdTasks.push(
              this.addTask({
                title: `${stTask.task_name} (${engagement.client_name || engagement.service_code})`,
                project_id: project.id,
                project_name: project.project_name,
                assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
                assigned_employee_name:
                  engagement.relationship_manager_name || this.currentUser.full_name,
                priority: stTask.priority || "Medium",
                due_date: computedDueDate,
                status: "To Do",
                description: stTask.description || stage.description,
                created_by: this.currentUser.id,
                created_by_name: this.currentUser.full_name,
              })
            );
          });
        } else {
          createdTasks.push(
            this.addTask({
              title: `${stage.stage_name} — ${engagement.service_name}`,
              project_id: project.id,
              project_name: project.project_name,
              assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
              assigned_employee_name:
                engagement.relationship_manager_name || this.currentUser.full_name,
              priority: "Medium",
              due_date: computedDueDate,
              status: "To Do",
              description: stage.description,
              created_by: this.currentUser.id,
              created_by_name: this.currentUser.full_name,
            })
          );
        }
      });
    } else {
      createdTasks.push(
        this.addTask({
          title: `${engagement.service_name} — ${engagement.billing_frequency} Execution`,
          project_id: project.id,
          project_name: project.project_name,
          assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
          assigned_employee_name:
            engagement.relationship_manager_name || this.currentUser.full_name,
          priority: "Medium",
          due_date: computedDueDate,
          status: "To Do",
          description: `Auto-generated deliverable task for ${engagement.client_name || "client"} under ${engagement.service_code}.`,
          created_by: this.currentUser.id,
          created_by_name: this.currentUser.full_name,
        })
      );
    }

    return { engagement: createdEngagement, project, tasks: createdTasks };
  }

  // Projects
  getProjects(): Project[] {
    return [...this.projects];
  }

  getProjectById(id: string): Project | undefined {
    const proj = this.projects.find(p => p.id === id);
    if (!proj) return undefined;
    const projectTasks = this.tasks.filter(t => t.project_id === id);
    return {
      ...proj,
      tasks: projectTasks
    };
  }

  addProject(projectData: Omit<Project, "id" | "project_code" | "progress_percentage" | "created_at" | "updated_at"> & { progress_percentage?: number }): Project {
    const nextNum = this.projects.length + 1;
    const year = new Date().getFullYear();
    const project_code = `PRJ-${year}-${String(nextNum).padStart(3, "0")}`;
    const id = generateId("proj");

    const newProject: Project = {
      ...projectData,
      id,
      project_code,
      progress_percentage: projectData.progress_percentage || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

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
    return newProject;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.projects[index] = { ...this.projects[index], ...updates, updated_at: new Date().toISOString() };
    this.persist();
    return this.projects[index];
  }

  // Tasks
  getTasks(): Task[] {
    return [...this.tasks];
  }

  getTasksByProjectId(projectId: string): Task[] {
    return this.tasks.filter(t => t.project_id === projectId);
  }

  addTask(taskData: Omit<Task, "id" | "task_code" | "created_at" | "comments_count" | "attachments_count">): Task {
    const nextNum = this.tasks.length + 1;
    const task_code = `TSK-${String(nextNum).padStart(3, "0")}`;
    const id = generateId("tsk");

    const newTask: Task = {
      ...taskData,
      id,
      task_code,
      created_at: new Date().toISOString(),
      comments_count: 0,
      attachments_count: 0
    };

    this.tasks.unshift(newTask);
    this.addActivityLog(`Created task: ${newTask.title}`, "task", id);
    if (newTask.assigned_employee_id) {
      this.addNotification(
        newTask.assigned_employee_id,
        `New Task Assigned: ${newTask.title}`,
        `You have been assigned to task ${newTask.task_code}: "${newTask.title}".`,
        "task_assigned",
        "task",
        id
      );
    }
    return newTask;
  }

  updateTaskStatus(taskId: string, newStatus: Task["status"]): Task | null {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return null;
    const oldStatus = task.status;
    task.status = newStatus;
    if (newStatus === "Completed") {
      task.completed_at = new Date().toISOString();
    }
    this.addActivityLog(`Changed task status from ${oldStatus} to ${newStatus}`, "task", taskId);
    return task;
  }

  // Workflows
  getWorkflows(): WorkflowTemplate[] {
    return [...this.workflows];
  }

  getWorkflowById(id: string): WorkflowTemplate | undefined {
    return this.workflows.find(w => w.id === id);
  }

  addWorkflow(wfData: Omit<WorkflowTemplate, "id" | "created_at">): WorkflowTemplate {
    const id = `wf-${Date.now()}`;
    const newWf: WorkflowTemplate = { ...wfData, id, created_at: new Date().toISOString() };
    this.workflows.unshift(newWf);
    this.addActivityLog(`Published workflow template: ${newWf.workflow_name}`, "workflow", id);
    return newWf;
  }

  // Invoices & Financials
  getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find(i => i.id === id);
  }

  addInvoice(invoiceData: Omit<Invoice, "id" | "invoice_number" | "paid_amount" | "outstanding_balance" | "created_at">): Invoice {
    const nextNum = this.invoices.length + 1;
    const fy = invoiceData.financial_year || "2024-25";
    const invoice_number = `INV/${fy}/${String(nextNum).padStart(5, "0")}`;
    const id = `inv-${Date.now()}`;

    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      invoice_number,
      paid_amount: 0,
      outstanding_balance: invoiceData.grand_total,
      status: invoiceData.status || "Draft",
      created_at: new Date().toISOString()
    };

    this.invoices.unshift(newInvoice);
    this.addActivityLog(`Created invoice ${invoice_number} for ₹${newInvoice.grand_total}`, "invoice", id);
    return newInvoice;
  }

  finalizeInvoice(invoiceId: string): Invoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status !== "Draft") return null;
    inv.status = "Finalized";
    inv.finalized_at = new Date().toISOString();
    this.addActivityLog(`Finalized invoice ${inv.invoice_number}`, "invoice", invoiceId);
    return inv;
  }

  cancelInvoice(invoiceId: string, reason: string): Invoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === "Cancelled") return null;
    inv.status = "Cancelled";
    inv.cancelled_at = new Date().toISOString();
    inv.cancel_reason = reason;
    this.addActivityLog(`Cancelled invoice ${inv.invoice_number}. Reason: ${reason}`, "invoice", invoiceId);
    return inv;
  }

  // Payments
  getPayments(): Payment[] {
    return [...this.payments];
  }

  recordPayment(paymentData: Omit<Payment, "id" | "payment_number" | "created_at">): Payment {
    const nextNum = this.payments.length + 1;
    const year = new Date().getFullYear();
    const payment_number = `PAY/${year}/${String(nextNum).padStart(5, "0")}`;
    const id = `pay-${Date.now()}`;

    const newPayment: Payment = {
      ...paymentData,
      id,
      payment_number,
      status: "Completed",
      created_at: new Date().toISOString()
    };

    this.payments.unshift(newPayment);

    // If allocated to an invoice, recalculate outstanding balance automatically
    if (newPayment.invoice_id) {
      const inv = this.invoices.find(i => i.id === newPayment.invoice_id);
      if (inv) {
        inv.paid_amount += newPayment.amount;
        inv.outstanding_balance = Math.max(0, inv.grand_total - inv.paid_amount);
        if (inv.outstanding_balance === 0) {
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

    return newPayment;
  }

  // Employees & Staff Directory
  getEmployees(): Employee[] {
    return [...this.employees];
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

    this.employees.push(newEmployee);
    this.addActivityLog(`Onboarded new employee: ${newEmployee.full_name}`, "employee", id);
    return newEmployee;
  }

  // Departments & Teams
  getDepartments(): Department[] {
    return [...this.departments];
  }

  getTeams(): Team[] {
    return [...this.teams];
  }

  addDepartment(deptData: Omit<Department, "id" | "created_at">): Department {
    const id = `dept-${Date.now()}`;
    const newDept: Department = { ...deptData, id, created_at: new Date().toISOString() };
    this.departments.push(newDept);
    this.addActivityLog(`Added department: ${newDept.name}`, "department", id);
    return newDept;
  }

  addTeam(teamData: Omit<Team, "id">): Team {
    const id = `team-${Date.now()}`;
    const newTeam: Team = { ...teamData, id, members: [] };
    this.teams.push(newTeam);
    this.addActivityLog(`Created team: ${newTeam.name}`, "team", id);
    return newTeam;
  }

  // Documents (Cloudflare R2 Metadata)
  getDocuments(): FileObject[] {
    return [...this.documents];
  }

  addDocument(docData: Omit<FileObject, "id" | "created_at">): FileObject {
    const id = `doc-${Date.now()}`;
    const newDoc: FileObject = { ...docData, id, created_at: new Date().toISOString() };
    this.documents.unshift(newDoc);
    this.addActivityLog(`Uploaded object: ${newDoc.file_name} to Cloudflare R2`, "document", id);
    return newDoc;
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
}

// Global Singleton Instance
export const pmsStore = new PMSDataStore();
