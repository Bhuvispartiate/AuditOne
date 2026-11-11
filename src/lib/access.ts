import {
  Client,
  Employee,
  FileObject,
  Project,
  ServiceEngagement,
  Task,
  WorkflowProjectTaskTemplate,
  WorkflowSubtaskTemplate,
  WorkflowTemplate,
} from "@/types";

const RESTRICTED_EMPLOYEE_DOC_CATEGORIES = new Set(["Invoice", "Payment Receipt", "Bank"]);

export function isAdminUser(user?: Employee | null): boolean {
  return user?.role_code === "SUPER_ADMIN";
}

export function isEmployeeRestricted(user?: Employee | null): boolean {
  return !isAdminUser(user);
}

export function isTaskAssignedToEmployee(task: Task, employeeId: string): boolean {
  if (!employeeId) return false;
  if (task.assigned_employee_id === employeeId) return true;
  if (task.subtasks && task.subtasks.length > 0) {
    return task.subtasks.some((sub) => isTaskAssignedToEmployee(sub, employeeId));
  }
  return false;
}

export function collectTaskIds(tasks: Task[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: Task[]) => {
    for (const t of list) {
      ids.add(t.id);
      if (t.subtasks && t.subtasks.length > 0) {
        walk(t.subtasks);
      }
    }
  };
  walk(tasks);
  return ids;
}

export function isProjectAssignedToEmployee(
  project: Project,
  employeeId: string,
  allTasks: Task[]
): boolean {
  if (!employeeId) return false;
  if (project.project_manager_id === employeeId) return true;
  if (allTasks.some((t) => t.project_id === project.id && isTaskAssignedToEmployee(t, employeeId))) {
    return true;
  }
  if ((project.tasks || []).some((t) => isTaskAssignedToEmployee(t, employeeId))) {
    return true;
  }
  return false;
}

export function isClientAssignedToEmployee(
  client: Client,
  employeeId: string,
  projects: Project[],
  allTasks: Task[],
  engagements: ServiceEngagement[]
): boolean {
  if (!employeeId) return false;
  if (client.relationship_manager_id === employeeId) return true;
  if (engagements.some((e) => e.client_id === client.id && e.relationship_manager_id === employeeId)) {
    return true;
  }
  return projects.some(
    (p) => p.client_id === client.id && isProjectAssignedToEmployee(p, employeeId, allTasks)
  );
}

function isWorkflowTemplateSubtaskAssigned(
  sub: WorkflowSubtaskTemplate,
  employeeId: string
): boolean {
  return sub.assigned_employee_id === employeeId;
}

function isWorkflowTemplateTaskAssigned(
  tplTask: WorkflowProjectTaskTemplate,
  employeeId: string
): boolean {
  if (tplTask.assigned_employee_id === employeeId) return true;
  return (tplTask.subtasks || []).some((sub) => isWorkflowTemplateSubtaskAssigned(sub, employeeId));
}

export function isWorkflowAssignedToEmployee(
  workflow: WorkflowTemplate,
  employeeId: string,
  projects: Project[],
  allTasks: Task[],
  engagements: ServiceEngagement[]
): boolean {
  if (!employeeId) return false;
  if ((workflow.template_tasks || []).some((tt) => isWorkflowTemplateTaskAssigned(tt, employeeId))) {
    return true;
  }

  const wfServiceLower = (workflow.service_name || "").trim().toLowerCase();
  const assignedProjects = projects.filter((p) =>
    isProjectAssignedToEmployee(p, employeeId, allTasks)
  );

  if (
    wfServiceLower &&
    assignedProjects.some((p) => (p.service_name || "").trim().toLowerCase() === wfServiceLower)
  ) {
    return true;
  }

  const assignedProjectEngIds = new Set(
    assignedProjects.map((p) => p.service_engagement_id).filter(Boolean)
  );

  return engagements.some((eng) => {
    const matchesUser =
      eng.relationship_manager_id === employeeId || assignedProjectEngIds.has(eng.id);
    if (!matchesUser) return false;
    if (workflow.service_id && eng.service_id === workflow.service_id) return true;
    return (
      Boolean(wfServiceLower) &&
      (eng.service_name || "").trim().toLowerCase() === wfServiceLower
    );
  });
}

export function isDocumentVisibleToEmployee(
  doc: FileObject,
  employeeId: string,
  assignedClientIds: Set<string>,
  assignedProjectIds: Set<string>,
  assignedTaskIds: Set<string>
): boolean {
  if (!employeeId) return false;
  if (RESTRICTED_EMPLOYEE_DOC_CATEGORIES.has(doc.category)) {
    return doc.uploaded_by === employeeId;
  }
  if (doc.uploaded_by === employeeId) return true;
  if (doc.entity_type === "task") {
    return Boolean(doc.entity_id && assignedTaskIds.has(doc.entity_id));
  }
  if (doc.entity_type === "project") {
    return Boolean(doc.entity_id && assignedProjectIds.has(doc.entity_id));
  }
  if (doc.entity_type === "client") {
    return Boolean(doc.entity_id && assignedClientIds.has(doc.entity_id));
  }
  if (doc.entity_type === "employee") return doc.entity_id === employeeId;
  return false;
}
