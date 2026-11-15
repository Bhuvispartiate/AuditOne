import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  Check,
  CheckSquare,
  Columns3,
  ExternalLink,
  GitBranch,
  GripVertical,
  ListChecks,
  MessageSquare,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Trash2,
  Search,
  User,
  Users2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isWorkflowAssignedToEmployee,
  isProjectAssignedToEmployee,
  isTaskAssignedToEmployee,
} from "@/lib/access";
import { formatDate } from "@/lib/utils";
import {
  Client,
  Project,
  ProjectPriority,
  ServiceEngagement,
  Task,
  TaskStatus,
  WorkflowProjectTaskTemplate,
  WorkflowSubtaskTemplate,
} from "@/types";
import { SubtaskTree } from "@/components/tasks/subtask-tree";
import { TaskCommentsBox } from "@/components/tasks/task-comments-box";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { StageKanbanBoard } from "@/components/workflows/stage-kanban-board";
import { toast } from "sonner";

type BoardViewMode = "milestone_board" | "workflow_stages" | "status_columns" | "template_builder";

interface BoardClientEntry {
  entryKey: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  engagement?: ServiceEngagement;
  project?: Project;
  tasks: Task[];
  stageTaskMap: Map<string, Task>;
  missingTemplateTasksCount: number;
  currentColumnId: string; // tplTask.id | "COMPLETED"
  activeTask?: Task;
  completedTemplateTasks: number;
}

function getStatusBadgeVariant(status: TaskStatus) {
  switch (status) {
    case "Completed":
      return "success" as const;
    case "In Progress":
      return "warning" as const;
    case "Blocked":
      return "destructive" as const;
    case "Under Review":
      return "secondary" as const;
    default:
      return "outline" as const;
  }
}

export default function WorkflowKanbanPage() {
  const { id } = useParams<{ id: string }>();
  const [, setTick] = useState(0);
  const [viewMode, setViewMode] = useState<BoardViewMode>("milestone_board");
  const [searchQuery, setSearchQuery] = useState("");

  // Drag state
  const [draggingWorkflowCard, setDraggingWorkflowCard] = useState<{
    entryKey: string;
    tplTaskId: string;
    isCompleted: boolean;
  } | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Selected template task for Subtasks/Comments modal
  const [activeTplTaskId, setActiveTplTaskId] = useState<string | null>(null);
  const [isTplTaskModalOpen, setIsTplTaskModalOpen] = useState(false);

  // Add template task inline form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStartDay, setTaskStartDay] = useState(1);
  const [taskDurationDays, setTaskDurationDays] = useState(5);
  const [taskPriority, setTaskPriority] = useState<ProjectPriority>("Medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("To Do");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");

  // Subtask & Comment inline inputs in modal
  const [subTitle, setSubTitle] = useState("");
  const [subStartDay, setSubStartDay] = useState(1);
  const [subDurationDays, setSubDurationDays] = useState(2);
  const [commentInput, setCommentInput] = useState("");


  // Client Task Drawer/Modal
  const [selectedEntryKey, setSelectedEntryKey] = useState<string | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);
  const [subtaskTitleByTask, setSubtaskTitleByTask] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const workflows = pmsStore.getWorkflows();
  const workflow = workflows.find((w) => w.id === id);
  const statusNames = pmsStore.getTaskStatusNames();
  const clients = pmsStore.getClients();
  const engagements = pmsStore.getAllEngagements();
  const projects = pmsStore.getProjects();
  const allTasks = pmsStore.getTasks();

  const tplTasks: WorkflowProjectTaskTemplate[] = workflow?.template_tasks || [];

  const employees = pmsStore.getEmployees();

  const saveWorkflowTasks = (nextTasks: WorkflowProjectTaskTemplate[]) => {
    if (!workflow) return;
    pmsStore.updateWorkflow(workflow.id, {
      template_tasks: nextTasks,
      stages_count: nextTasks.length,
    });
    setTick((t) => t + 1);
  };

  const handleAddTemplateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workflow) return;
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    const emp = employees.find((item) => item.id === taskAssigneeId);
    const nextTask: WorkflowProjectTaskTemplate = {
      id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      task_name: taskTitle.trim(),
      description: taskDesc.trim(),
      sequence_number: tplTasks.length + 1,
      start_day_offset: Math.max(0, Number(taskStartDay) - 1),
      duration_days: Math.max(1, Number(taskDurationDays) || 1),
      priority: taskPriority,
      status: taskStatus,
      assigned_employee_id: emp?.id,
      assigned_employee_name: emp?.full_name,
      subtasks: [],
      default_comments: [],
    };

    saveWorkflowTasks([...tplTasks, nextTask]);
    setTaskTitle("");
    setTaskDesc("");
    toast.success(`Added task "${nextTask.task_name}" to workflow template.`);
  };

  const updateTemplateTask = (
    taskId: string,
    updater: (prev: WorkflowProjectTaskTemplate) => WorkflowProjectTaskTemplate
  ) => {
    if (!workflow) return;
    const nextTasks = tplTasks.map((t) => (t.id === taskId ? updater(t) : t));
    const nextMilestones = workflow.milestones?.map((m) => ({
      ...m,
      stages: (m.stages || []).map((s) => ({
        ...s,
        sub_stages: (s.sub_stages || []).map((ss) => ({
          ...ss,
          tasks: (ss.tasks || []).map((t) => (t.id === taskId ? updater(t) : t)),
        })),
      })),
    }));
    pmsStore.updateWorkflow(workflow.id, {
      template_tasks: nextTasks,
      ...(nextMilestones ? { milestones: nextMilestones } : {}),
    });
    setTick((t) => t + 1);
  };

  const handleDeleteTemplateTask = (taskId: string) => {
    if (!workflow) return;
    const nextTasks = tplTasks.filter((t) => t.id !== taskId);
    saveWorkflowTasks(nextTasks);
    toast.success("Task removed from workflow template.");
  };

  const handleAddTemplateSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTplTask || !subTitle.trim()) return;
    const newSub: WorkflowSubtaskTemplate = {
      id: `wst-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: subTitle.trim(),
      start_day_offset: Math.max(0, Number(subStartDay) - 1),
      duration_days: Math.max(1, Number(subDurationDays)),
      status: "To Do",
      priority: activeTplTask.priority,
    };
    updateTemplateTask(activeTplTask.id, (prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSub],
    }));
    setSubTitle("");
    toast.success("Subtask added to workflow template.");
  };

  const handleAddTemplateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTplTask || !commentInput.trim()) return;
    updateTemplateTask(activeTplTask.id, (prev) => ({
      ...prev,
      default_comments: [...(prev.default_comments || []), commentInput.trim()],
    }));
    setCommentInput("");
    toast.success("Template comment saved.");
  };

  const activeTplTask = tplTasks.find((t) => t.id === activeTplTaskId) || null;


  const boardEntries: BoardClientEntry[] = useMemo(() => {
    if (!workflow) return [];

    const serviceNameLower = (workflow.service_name || "").trim().toLowerCase();
    const clientById = new Map<string, Client>(clients.map((c) => [c.id, c]));

    const matchingEngagements = engagements.filter(
      (e) =>
        e.status === "Active" &&
        ((workflow.service_id && e.service_id === workflow.service_id) ||
          (serviceNameLower &&
            (e.service_name || "").trim().toLowerCase() === serviceNameLower))
    );

    const seenProjectIds = new Set<string>();
    const rawItems: Array<{
      clientId: string;
      clientName: string;
      clientCode: string;
      engagement?: ServiceEngagement;
      project?: Project;
    }> = [];

    matchingEngagements.forEach((eng) => {
      const client = clientById.get(eng.client_id);
      const proj = projects.find(
        (p) =>
          p.service_engagement_id === eng.id ||
          (p.client_id === eng.client_id &&
            (p.service_name || "").trim().toLowerCase() ===
              (eng.service_name || "").trim().toLowerCase())
      );
      if (proj) seenProjectIds.add(proj.id);

      rawItems.push({
        clientId: eng.client_id,
        clientName: client?.client_name || eng.client_name || "Client",
        clientCode: client?.client_code || "CL",
        engagement: eng,
        project: proj,
      });
    });

    if (serviceNameLower) {
      projects.forEach((proj) => {
        if (
          !seenProjectIds.has(proj.id) &&
          (proj.service_name || "").trim().toLowerCase() === serviceNameLower &&
          proj.client_id
        ) {
          const client = clientById.get(proj.client_id);
          rawItems.push({
            clientId: proj.client_id,
            clientName: client?.client_name || proj.client_name || "Client",
            clientCode: client?.client_code || "CL",
            project: proj,
          });
        }
      });
    }

    const scopedItems = isEmployee
      ? rawItems.filter(
          (item) =>
            item.project && isProjectAssignedToEmployee(item.project, empId, allTasks)
        )
      : rawItems;

    return scopedItems.map((item, idx) => {
      const rawProjectTasks = item.project
        ? allTasks.filter((t) => t.project_id === item.project!.id && !t.parent_task_id)
        : [];
      const projectTasks =
        isEmployee && item.project && item.project.project_manager_id !== empId
          ? rawProjectTasks.filter((t) => isTaskAssignedToEmployee(t, empId))
          : rawProjectTasks;

      const stageTaskMap = new Map<string, Task>();
      let missingCount = 0;

      tplTasks.forEach((tpl) => {
        const match = projectTasks.find(
          (pt) => pt.title.trim().toLowerCase() === tpl.task_name.trim().toLowerCase()
        );
        if (match) {
          stageTaskMap.set(tpl.id, match);
        } else {
          missingCount += 1;
        }
      });

      const completedTplCount = tplTasks.filter(
        (tpl) => stageTaskMap.get(tpl.id)?.status === "Completed"
      ).length;

      let currentColumnId = "COMPLETED";
      let activeTask: Task | undefined = projectTasks[0];

      if (tplTasks.length > 0) {
        const allTplMatched = missingCount === 0;
        const allTplDone = allTplMatched && completedTplCount === tplTasks.length;

        if (allTplDone) {
          currentColumnId = "COMPLETED";
          activeTask = stageTaskMap.get(tplTasks[tplTasks.length - 1].id);
        } else {
          const inFlightTpl = tplTasks.find((tpl) => {
            const st = stageTaskMap.get(tpl.id)?.status;
            return st === "In Progress" || st === "Under Review" || st === "Blocked";
          });
          const nextPendingTpl = tplTasks.find((tpl) => {
            const matched = stageTaskMap.get(tpl.id);
            return !matched || matched.status !== "Completed";
          });
          const chosenTpl = inFlightTpl || nextPendingTpl || tplTasks[0];
          currentColumnId = chosenTpl.id;
          activeTask = stageTaskMap.get(chosenTpl.id) || projectTasks[0];
        }
      }

      return {
        entryKey: item.project?.id || item.engagement?.id || `entry-${idx}`,
        clientId: item.clientId,
        clientName: item.clientName,
        clientCode: item.clientCode,
        engagement: item.engagement,
        project: item.project,
        tasks: projectTasks,
        stageTaskMap,
        missingTemplateTasksCount: missingCount,
        currentColumnId,
        activeTask,
        completedTemplateTasks: completedTplCount,
      };
    });
  }, [workflow, clients, engagements, projects, allTasks, tplTasks, isEmployee, empId]);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return boardEntries;
    return boardEntries.filter(
      (e) =>
        e.clientName.toLowerCase().includes(q) ||
        e.clientCode.toLowerCase().includes(q) ||
        e.project?.project_code.toLowerCase().includes(q) ||
        e.activeTask?.title.toLowerCase().includes(q) ||
        e.activeTask?.assigned_employee_name?.toLowerCase().includes(q)
    );
  }, [boardEntries, searchQuery]);

  const totalMissingTasks = boardEntries.reduce(
    (sum, entry) => sum + entry.missingTemplateTasksCount,
    0
  );

  const selectedEntry =
    boardEntries.find((e) => e.entryKey === selectedEntryKey) || null;

  const handleSyncTasks = async () => {
    if (!workflow) return;
    const res = await pmsStore.syncWorkflowTasksToSubscribedClients(workflow.id);
    if (res.createdTasks > 0) {
      toast.success(
        `Synced ${res.createdTasks} workflow task(s) across ${res.updatedProjects} client project(s).`
      );
    } else {
      toast.info("All subscribed clients already have all tasks from this workflow.");
    }
  };

  const setClientWorkflowTaskStatus = async (
    entry: BoardClientEntry,
    tplTask: WorkflowProjectTaskTemplate,
    nextStatus: TaskStatus
  ) => {
    if (!workflow) return;

    let targetTask = entry.stageTaskMap.get(tplTask.id);
    if (!entry.project || !targetTask) {
      await pmsStore.syncWorkflowTasksToSubscribedClients(workflow.id);
      const freshProjects = pmsStore.getProjects();
      const targetProject =
        entry.project ||
        freshProjects.find(
          (p) =>
            (entry.engagement && p.service_engagement_id === entry.engagement.id) ||
            (p.client_id === entry.clientId &&
              (p.service_name || "").trim().toLowerCase() ===
                (workflow.service_name || "").trim().toLowerCase())
        );

      if (targetProject) {
        targetTask = pmsStore
          .getTasks()
          .find(
            (t) =>
              t.project_id === targetProject.id &&
              !t.parent_task_id &&
              t.title.trim().toLowerCase() === tplTask.task_name.trim().toLowerCase()
          );
      }
    }

    if (!targetTask) {
      toast.error(`Unable to find "${tplTask.task_name}" for ${entry.clientName}.`);
      return;
    }

    pmsStore.updateTaskStatus(targetTask.id, nextStatus);
    toast.success(`${entry.clientName} — "${tplTask.task_name}" marked ${nextStatus}.`);
  };

  const handleStatusDrop = (taskId: string, nextStatus: TaskStatus) => {
    pmsStore.updateTaskStatus(taskId, nextStatus);
    toast.success(`Task moved to "${nextStatus}".`);
  };

  const handleAddSubtaskInModal = (parentTask: Task) => {
    const title = (subtaskTitleByTask[parentTask.id] || "").trim();
    if (!title) {
      toast.error("Please enter a subtask title.");
      return;
    }
    pmsStore.addSubtask(parentTask.id, {
      title,
      start_date: parentTask.start_date,
      due_date: parentTask.due_date,
      priority: parentTask.priority,
      status: "To Do",
      assigned_employee_id: parentTask.assigned_employee_id,
      assigned_employee_name: parentTask.assigned_employee_name,
    });
    setSubtaskTitleByTask((prev) => ({ ...prev, [parentTask.id]: "" }));
    toast.success(`Added subtask "${title}".`);
  };

  if (!workflow) {
    return (
      <div className="space-y-6 pb-12">
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
          <CardContent className="py-16 text-center space-y-4">
            <GitBranch className="h-10 w-10 text-slate-300 mx-auto" />
            <h2 className="text-xl font-extrabold text-[#111827]">
              Workflow Not Found
            </h2>
            <p className="text-xs text-[#6b7280] max-w-md mx-auto">
              This workflow may have been removed or is no longer active.
            </p>
            <Link to="/workflows">
              <Button className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Back to Workflows
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    isEmployee &&
    !isWorkflowAssignedToEmployee(workflow, empId, projects, allTasks, engagements)
  ) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          Employees can only view workflows linked to their assigned projects and tasks.
        </p>
        <Link to="/workflows">
          <Button variant="outline">Back to Assigned Workflows</Button>
        </Link>
      </div>
    );
  }

  const completedClientsCount = boardEntries.filter(
    (e) => e.currentColumnId === "COMPLETED" && tplTasks.length > 0
  ).length;
  const allWorkflowClientTasks = filteredEntries.flatMap((entry) =>
    entry.tasks.map((task) => ({ entry, task }))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header Box */}
      <div className="rounded-[24px] border-[1.5px] border-slate-300 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link to="/workflows">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 rounded-lg border-slate-300 text-[11px] font-bold gap-1 px-2.5"
                >
                  <ArrowLeft className="h-3 w-3" /> All Workflows
                </Button>
              </Link>
              <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg">
                {workflow.workflow_code}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-800">
                <Briefcase className="h-3 w-3" />
                Service: {workflow.service_name || "Unassigned"}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              {workflow.workflow_name}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEmployee && (
              <Badge
                variant="outline"
                className="h-9 px-3 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border-amber-300"
              >
                View-Only Mode
              </Badge>
            )}
            {!isEmployee && totalMissingTasks > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleSyncTasks}
                className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Sync Workflow Tasks ({totalMissingTasks})
              </Button>
            )}

            <div className="inline-flex rounded-xl border-[1.5px] border-slate-300 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode("milestone_board")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "milestone_board"
                    ? "bg-neutral-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Stage Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode("workflow_stages")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "workflow_stages"
                    ? "bg-neutral-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Workflow Tasks Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode("status_columns")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "status_columns"
                    ? "bg-neutral-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Status Kanban
              </button>
              <button
                type="button"
                onClick={() => setViewMode("template_builder")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === "status_columns"
                    ? "bg-neutral-900 text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Status Kanban
              </button>
            </div>
          </div>
        </div>

        {/* Summary KPI Strip + Filter */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-4 border-t border-slate-200 items-center">
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Clients With Service
            </span>
            <span className="text-lg font-extrabold text-[#111827]">
              {boardEntries.length}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Workflow Tasks
            </span>
            <span className="text-lg font-extrabold text-[#111827]">
              {tplTasks.length}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              In Progress
            </span>
            <span className="text-lg font-extrabold text-amber-700">
              {Math.max(0, boardEntries.length - completedClientsCount)}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Completed Clients
            </span>
            <span className="text-lg font-extrabold text-emerald-700">
              {completedClientsCount}
            </span>
          </div>
          <div className="col-span-2 lg:col-span-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              type="search"
              placeholder="Search client or task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-10 rounded-2xl border-[1.5px] border-slate-300 text-xs bg-white"
            />
          </div>
        </div>
      </div>

      {/* Stage Kanban Board (Default View) */}
      {viewMode === "milestone_board" ? (
        <StageKanbanBoard
          workflow={workflow}
          milestones={pmsStore.getNormalizedWorkflowMilestones(workflow)}
          employees={pmsStore.getEmployees()}
          clients={clients}
          engagements={engagements}
          projects={projects}
          tasks={allTasks}
          taskStatuses={pmsStore.getTaskStatuses()}
          isEmployee={isEmployee}
        />
      ) : viewMode === "template_builder" ? (
        /* KANBAN VIEW: TEMPLATE TASKS & SOP BUILDER */
        <div className="space-y-6">
          {/* Add Template Task Form (Admin only) */}
          {!isEmployee && (
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-violet-700" />
                    <h3 className="text-sm font-extrabold text-[#111827]">
                      Add Deliverable Task to &ldquo;{workflow.workflow_name}&rdquo;
                    </h3>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Tasks auto-spawn when clients subscribe to {workflow.service_name || "this service"}
                  </span>
                </div>

                <form onSubmit={handleAddTemplateTask} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Task Title *</label>
                      <Input
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        placeholder="e.g. Collect GSTR-2B JSON & Reconcile Input Tax Credit"
                        className="h-10 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                        required
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Start Day Offset</label>
                      <Input
                        type="number"
                        min={1}
                        value={taskStartDay}
                        onChange={(e) => setTaskStartDay(Math.max(1, Number(e.target.value)))}
                        className="h-10 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Duration (Days)</label>
                      <Input
                        type="number"
                        min={1}
                        value={taskDurationDays}
                        onChange={(e) => setTaskDurationDays(Math.max(1, Number(e.target.value)))}
                        className="h-10 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Priority</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as ProjectPriority)}
                        className="w-full h-10 rounded-xl border-[1.5px] border-slate-300 bg-white px-2 text-xs font-semibold"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Default Assignee</label>
                      <select
                        value={taskAssigneeId}
                        onChange={(e) => setTaskAssigneeId(e.target.value)}
                        className="w-full h-10 rounded-xl border-[1.5px] border-slate-300 bg-white px-3 text-xs font-semibold"
                      >
                        <option value="">Auto-Assign to Client Relationship Manager</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.designation_name || "Staff"})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-4 space-y-1">
                      <label className="text-[11px] font-bold text-slate-700">Description / Checklist</label>
                      <Input
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        placeholder="Brief summary of SOP deliverable..."
                        className="h-10 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button
                        type="submit"
                        className="w-full h-10 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                      >
                        <Plus className="h-4 w-4" /> Add Task
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Template Tasks Grid */}
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-[#111827] flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-violet-600" />
              <span>Workflow Tasks, Subtasks & Comments ({tplTasks.length})</span>
            </h3>

            {tplTasks.length === 0 ? (
              <Card className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white">
                <CardContent className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <Columns3 className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No template tasks added to this workflow yet.</p>
                  <p>Add deliverable tasks above to define this fixed project SOP.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tplTasks.map((t, idx) => {
                  const subs = t.subtasks || [];
                  const cmts = t.default_comments || [];

                  return (
                    <Card
                      key={t.id}
                      className="rounded-[24px] border-[1.5px] border-slate-300 bg-white hover:border-neutral-900 transition-all"
                    >
                      <CardContent className="p-5 space-y-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-xl">
                              T{idx + 1}
                            </span>
                            <Badge variant={t.priority === "Urgent" ? "destructive" : "outline"} className="text-[10px]">
                              {t.priority}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {t.status || "To Do"}
                            </Badge>
                          </div>
                          {!isEmployee && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplateTask(t.id)}
                              className="p-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                              title="Delete Task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTplTaskId(t.id);
                              setIsTplTaskModalOpen(true);
                            }}
                            className="text-left group"
                          >
                            <h4 className="font-extrabold text-sm text-[#111827] group-hover:text-violet-700">
                              {t.task_name}
                            </h4>
                          </button>
                          {t.description && (
                            <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">{t.description}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-300 bg-slate-50/70 p-2.5 text-xs">
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Timeline Window
                            </span>
                            <span className="font-bold text-[#111827]">
                              Day {(t.start_day_offset || 0) + 1} &rarr; Day{" "}
                              {(t.start_day_offset || 0) + (t.duration_days || 1)} ({t.duration_days}d)
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">
                              Default Assignee
                            </span>
                            <span className="font-bold text-[#111827] truncate flex items-center gap-1 mt-0.5">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{t.assigned_employee_name || "Service RM"}</span>
                            </span>
                          </div>
                        </div>

                        {/* Subtasks Preview */}
                        <div className="rounded-2xl border border-slate-300 bg-slate-50/40 p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <ListChecks className="h-3.5 w-3.5 text-violet-600" />
                              Subtasks ({subs.length})
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="h-3 w-3 text-sky-600" />
                              {cmts.length} Comment(s)
                            </span>
                          </div>
                          {subs.length === 0 ? (
                            <p className="text-[11px] text-slate-400">No subtasks yet.</p>
                          ) : (
                            <div className="space-y-1 max-h-28 overflow-y-auto">
                              {subs.map((st, sIdx) => (
                                <div
                                  key={st.id}
                                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] flex items-center justify-between gap-2"
                                >
                                  <span className="font-semibold text-slate-800 truncate">
                                    T{idx + 1}.{sIdx + 1} {st.title}
                                  </span>
                                  <span className="text-[10px] text-slate-500 shrink-0">
                                    {st.duration_days}d
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setActiveTplTaskId(t.id);
                            setIsTplTaskModalOpen(true);
                          }}
                          className="w-full h-8 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                        >
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {isEmployee
                              ? "View Subtasks, Timeline & Comments"
                              : "Edit Subtasks, Timeline & Comments"}
                          </span>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      ) : tplTasks.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
          <CardContent className="p-8 text-center space-y-3">
            <Columns3 className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-[#111827]">
              No Tasks Defined in &ldquo;{workflow.workflow_name}&rdquo; Yet
            </h3>
            <p className="text-xs text-[#6b7280] max-w-lg mx-auto">
              Add tasks in the Workflow Builder first so each task appears as a Kanban column on this page for subscribed clients.
            </p>
            <Link to="/workflows">
              <Button className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5">
                <Plus className="h-4 w-4" /> Add Tasks in Workflow Builder
              </Button>
            </Link>

            {boardEntries.length > 0 && (
              <div className="pt-6 border-t border-slate-200 text-left">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-3">
                  Subscribed Clients ({boardEntries.length})
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {boardEntries.map((entry) => (
                    <div
                      key={entry.entryKey}
                      className="rounded-2xl border-[1.5px] border-slate-300 bg-slate-50/70 p-4 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-slate-600">
                          {entry.clientCode}
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {entry.tasks.length} Task(s)
                        </Badge>
                      </div>
                      <Link
                        to={`/clients/${entry.clientId}`}
                        className="font-extrabold text-sm text-[#111827] hover:text-violet-700 block truncate"
                      >
                        {entry.clientName}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "workflow_stages" ? (
        /* KANBAN VIEW 1: WORKFLOW TEMPLATE TASKS AS COLUMNS */
        <div className="space-y-4">
          {boardEntries.length === 0 && (
            <div className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Users2 className="h-6 w-6 text-violet-600 shrink-0" />
                <div>
                  <h3 className="text-sm font-extrabold text-[#111827]">
                    No Clients Have &ldquo;{workflow.service_name || workflow.workflow_name}&rdquo; Yet
                  </h3>
                  <p className="text-xs text-[#6b7280]">
                    When a client subscribes to this service, their card will appear in Column 1 below automatically.
                  </p>
                </div>
              </div>
              {!isEmployee && (
                <Link to="/clients/new">
                  <Button size="sm" className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5 shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Onboard Client
                  </Button>
                </Link>
              )}
            </div>
          )}

          <div className="flex gap-4 overflow-x-auto pb-4 items-start">
            {tplTasks.map((tplTask, index) => {
              // Show EVERY subscribed client whose task for THIS column is NOT yet Completed (and assigned in Employee Mode)
              const openEntries = filteredEntries.filter((entry) => {
                const matched = entry.stageTaskMap.get(tplTask.id);
                if (isEmployee) {
                  return Boolean(matched && matched.status !== "Completed");
                }
                return !matched || matched.status !== "Completed";
              });
              const isOver = dragOverColumnId === tplTask.id;

              return (
                <div
                  key={tplTask.id}
                  onDragOver={(e) => {
                    if (isEmployee) return;
                    e.preventDefault();
                    setDragOverColumnId(tplTask.id);
                  }}
                  onDragLeave={() =>
                    setDragOverColumnId((prev) => (prev === tplTask.id ? null : prev))
                  }
                  onDrop={(e) => {
                    if (isEmployee) return;
                    e.preventDefault();
                    setDragOverColumnId(null);
                    if (
                      draggingWorkflowCard &&
                      draggingWorkflowCard.isCompleted &&
                      draggingWorkflowCard.tplTaskId === tplTask.id
                    ) {
                      const entry = boardEntries.find(
                        (x) => x.entryKey === draggingWorkflowCard.entryKey
                      );
                      setDraggingWorkflowCard(null);
                      if (entry) {
                        setClientWorkflowTaskStatus(entry, tplTask, "In Progress");
                      }
                    } else {
                      setDraggingWorkflowCard(null);
                    }
                  }}
                  className={`w-[330px] shrink-0 rounded-[24px] border-[1.5px] p-4 space-y-3 transition-colors ${
                    isOver
                      ? "border-violet-600 bg-violet-50/60"
                      : "border-slate-300 bg-slate-50/80"
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-[#111827] truncate">
                        {index + 1}. {tplTask.task_name}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                        Day {tplTask.start_day_offset + 1} • {tplTask.duration_days}d •{" "}
                        {(tplTask.subtasks || []).length} sub
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full text-[11px] font-bold shrink-0"
                    >
                      {openEntries.length}
                    </Badge>
                  </div>

                  {/* Client Cards in This Task Column */}
                  <div className="space-y-3 min-h-[140px]">
                    {openEntries.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-8 text-center text-[11px] text-slate-400">
                        {boardEntries.length === 0
                          ? "No assigned clients yet"
                          : "No pending tasks in this stage"}
                      </div>
                    ) : (
                      openEntries.map((entry) => {
                        const stageTask = entry.stageTaskMap.get(tplTask.id);
                        const subtasks = stageTask?.subtasks || [];
                        const doneSubtasks = subtasks.filter(
                          (s) => s.status === "Completed"
                        ).length;

                        return (
                          <div
                            key={`${entry.entryKey}-${tplTask.id}`}
                            draggable={!isEmployee}
                            onDragStart={() => {
                              if (isEmployee) return;
                              setDraggingWorkflowCard({
                                entryKey: entry.entryKey,
                                tplTaskId: tplTask.id,
                                isCompleted: false,
                              });
                            }}
                            onDragEnd={() => {
                              setDraggingWorkflowCard(null);
                              setDragOverColumnId(null);
                            }}
                            className={`rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 shadow-xs hover:border-neutral-900 transition-all space-y-3 ${
                              isEmployee ? "" : "cursor-grab active:cursor-grabbing"
                            }`}
                          >
                            {/* Card Top Bar */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0">
                                {!isEmployee && <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                  {entry.clientCode}
                                </span>
                                {entry.project && (
                                  <Link
                                    to={`/projects/${entry.project.id}`}
                                    className="font-mono text-[10px] font-bold text-blue-700 hover:underline truncate"
                                  >
                                    {entry.project.project_code}
                                  </Link>
                                )}
                              </div>

                              {stageTask ? (
                                isEmployee ? (
                                  <Badge variant="outline" className="text-[10px] font-bold bg-slate-50 border-slate-300 text-slate-800">
                                    {stageTask.status}
                                  </Badge>
                                ) : (
                                  <select
                                    value={stageTask.status}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) =>
                                      setClientWorkflowTaskStatus(
                                        entry,
                                        tplTask,
                                        e.target.value as TaskStatus
                                      )
                                    }
                                    className="h-6 rounded-lg border border-slate-300 bg-slate-50 px-1.5 text-[10px] font-bold text-slate-800"
                                  >
                                    {statusNames.map((st) => (
                                      <option key={st} value={st}>
                                        {st}
                                      </option>
                                    ))}
                                  </select>
                                )
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-amber-700 border-amber-300"
                                >
                                  Pending Sync
                                </Badge>
                              )}
                            </div>

                            {/* Client Name & Progress */}
                            <div>
                              <Link
                                to={`/clients/${entry.clientId}`}
                                className="text-sm font-extrabold text-[#111827] hover:text-violet-700 flex items-center gap-1 truncate"
                              >
                                <span className="truncate">{entry.clientName}</span>
                                <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                              </Link>
                              <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                                {entry.completedTemplateTasks}/{tplTasks.length} tasks completed
                              </p>
                            </div>

                            {/* Task Timeline & Assignee */}
                            {stageTask && (
                              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between text-slate-700 font-semibold">
                                  <span className="inline-flex items-center gap-1">
                                    <Calendar className="h-3 w-3 text-slate-400" />
                                    {formatDate(stageTask.start_date)} &rarr;{" "}
                                    {formatDate(stageTask.due_date)}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-500">
                                    {stageTask.task_code}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-slate-600">
                                  <span className="inline-flex items-center gap-1 truncate">
                                    <User className="h-3 w-3 text-slate-400 shrink-0" />
                                    <span className="truncate">
                                      {stageTask.assigned_employee_name || "Unassigned"}
                                    </span>
                                  </span>
                                  <span className="inline-flex items-center gap-1 shrink-0">
                                    <MessageSquare className="h-3 w-3 text-slate-400" />
                                    {stageTask.comments_count || 0}
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Subtasks Preview (Only if created) */}
                            {stageTask && subtasks.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                  <span className="inline-flex items-center gap-1">
                                    <ListChecks className="h-3.5 w-3.5 text-violet-600" />
                                    Subtasks
                                  </span>
                                  <span>
                                    {doneSubtasks} completed
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {subtasks.slice(0, 3).map((sub) => (
                                    <button
                                      key={sub.id}
                                      type="button"
                                      onClick={() => {
                                        if (isEmployee) {
                                          setDetailTaskId(sub.id);
                                          return;
                                        }
                                        pmsStore.updateTaskStatus(
                                          sub.id,
                                          sub.status === "Completed" ? "To Do" : "Completed"
                                        );
                                      }}
                                      className="w-full flex items-center gap-2 text-left rounded-lg border border-slate-200 bg-slate-50/70 px-2 py-1 text-[11px] hover:border-slate-400"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={sub.status === "Completed"}
                                        readOnly
                                        className="h-3.5 w-3.5 accent-neutral-900 pointer-events-none"
                                      />
                                      <span
                                        className={`truncate ${
                                          sub.status === "Completed"
                                            ? "line-through text-slate-400"
                                            : "text-slate-700 font-medium"
                                        }`}
                                      >
                                        {sub.title}
                                      </span>
                                    </button>
                                  ))}
                                  {subtasks.length > 3 && (
                                    <p className="text-[10px] font-semibold text-slate-400 pl-1">
                                      +{subtasks.length - 3} more subtasks
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Card Footer Actions */}
                            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedEntryKey(entry.entryKey);
                                  setIsDetailModalOpen(true);
                                }}
                                className="h-7 px-2.5 rounded-lg border-slate-300 text-[11px] font-bold"
                              >
                                Tasks & Subtasks
                              </Button>

                              {!isEmployee && (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() =>
                                    setClientWorkflowTaskStatus(entry, tplTask, "Completed")
                                  }
                                  className="h-7 px-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-[11px] font-bold gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  <span>Complete</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            {/* Final Completed Tasks Column (holds completed tasks from any stage, independently) */}
            {(() => {
              const completedTaskCards = filteredEntries.flatMap((entry) =>
                tplTasks
                  .map((tplTask, idx) => ({
                    entry,
                    tplTask,
                    idx,
                    task: entry.stageTaskMap.get(tplTask.id),
                  }))
                  .filter((item) => item.task && item.task.status === "Completed")
              );
              const isOver = dragOverColumnId === "COMPLETED";

              return (
                <div
                  key="COMPLETED"
                  onDragOver={(e) => {
                    if (isEmployee) return;
                    e.preventDefault();
                    setDragOverColumnId("COMPLETED");
                  }}
                  onDragLeave={() =>
                    setDragOverColumnId((prev) => (prev === "COMPLETED" ? null : prev))
                  }
                  onDrop={(e) => {
                    if (isEmployee) return;
                    e.preventDefault();
                    setDragOverColumnId(null);
                    if (draggingWorkflowCard && !draggingWorkflowCard.isCompleted) {
                      const entry = boardEntries.find(
                        (x) => x.entryKey === draggingWorkflowCard.entryKey
                      );
                      const tplTask = tplTasks.find(
                        (t) => t.id === draggingWorkflowCard.tplTaskId
                      );
                      setDraggingWorkflowCard(null);
                      if (entry && tplTask) {
                        setClientWorkflowTaskStatus(entry, tplTask, "Completed");
                      }
                    } else {
                      setDraggingWorkflowCard(null);
                    }
                  }}
                  className={`w-[330px] shrink-0 rounded-[24px] border-[1.5px] p-4 space-y-3 transition-colors ${
                    isOver
                      ? "border-emerald-600 bg-emerald-100/60"
                      : "border-emerald-300 bg-emerald-50/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-emerald-200">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-[#111827] truncate">
                        Completed Tasks
                      </h3>
                      <p className="text-[11px] font-medium text-emerald-700 mt-0.5">
                        {isEmployee ? "Tasks marked completed" : "Drag any task card here to complete"}
                      </p>
                    </div>
                    <Badge
                      variant="success"
                      className="rounded-full text-[11px] font-bold shrink-0"
                    >
                      {completedTaskCards.length}
                    </Badge>
                  </div>

                  <div className="space-y-3 min-h-[140px]">
                    {completedTaskCards.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-emerald-300 bg-white/70 px-3 py-8 text-center text-[11px] text-slate-400">
                        {isEmployee ? "No completed tasks yet" : "Drop any completed task here"}
                      </div>
                    ) : (
                      completedTaskCards.map(({ entry, tplTask, idx, task }) => (
                        <div
                          key={`done-${entry.entryKey}-${tplTask.id}`}
                          draggable={!isEmployee}
                          onDragStart={() => {
                            if (isEmployee) return;
                            setDraggingWorkflowCard({
                              entryKey: entry.entryKey,
                              tplTaskId: tplTask.id,
                              isCompleted: true,
                            });
                          }}
                          onDragEnd={() => {
                            setDraggingWorkflowCard(null);
                            setDragOverColumnId(null);
                          }}
                          className={`rounded-2xl border-[1.5px] border-emerald-300 bg-white p-4 shadow-xs hover:border-neutral-900 transition-all space-y-2.5 ${
                            isEmployee ? "" : "cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                              {entry.clientCode}
                            </span>
                            <Badge variant="success" className="text-[10px]">
                              Completed
                            </Badge>
                          </div>

                          <div>
                            <Link
                              to={`/clients/${entry.clientId}`}
                              className="text-sm font-extrabold text-[#111827] hover:text-violet-700 truncate block"
                            >
                              {entry.clientName}
                            </Link>
                            <p className="text-xs font-bold text-emerald-800 mt-0.5 truncate">
                              {idx + 1}. {tplTask.task_name}
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {entry.completedTemplateTasks}/{tplTasks.length} workflow tasks done
                              {task ? ` • ${task.task_code}` : ""}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEntryKey(entry.entryKey);
                                setIsDetailModalOpen(true);
                              }}
                              className="h-7 px-2.5 rounded-lg border-slate-300 text-[11px] font-bold"
                            >
                              Tasks & Subtasks
                            </Button>

                            {!isEmployee && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setClientWorkflowTaskStatus(entry, tplTask, "In Progress")
                                }
                                className="h-7 px-2.5 rounded-lg border-slate-300 text-[11px] font-bold gap-1"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Reopen</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        /* KANBAN VIEW 2: TASK STATUS COLUMNS ACROSS ALL CLIENT TASKS FOR THIS WORKFLOW */
        <div className="flex gap-4 overflow-x-auto pb-4 items-start">
          {statusNames.map((statusCol) => {
            const colItems = allWorkflowClientTasks.filter(
              (item) => item.task.status === statusCol
            );
            const isOver = dragOverColumnId === statusCol;

            return (
              <div
                key={statusCol}
                onDragOver={(e) => {
                  if (isEmployee) return;
                  e.preventDefault();
                  setDragOverColumnId(statusCol);
                }}
                onDragLeave={() =>
                  setDragOverColumnId((prev) => (prev === statusCol ? null : prev))
                }
                onDrop={(e) => {
                  if (isEmployee) return;
                  e.preventDefault();
                  setDragOverColumnId(null);
                  if (draggingTaskId) {
                    handleStatusDrop(draggingTaskId, statusCol);
                    setDraggingTaskId(null);
                  }
                }}
                className={`w-[305px] shrink-0 rounded-[24px] border-[1.5px] p-4 space-y-3 transition-colors ${
                  isOver
                    ? "border-violet-600 bg-violet-50/60"
                    : "border-slate-300 bg-slate-50/80"
                }`}
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-extrabold text-[#111827]">{statusCol}</h3>
                  <Badge variant={getStatusBadgeVariant(statusCol)} className="rounded-full text-[11px]">
                    {colItems.length}
                  </Badge>
                </div>

                <div className="space-y-2.5 min-h-[140px]">
                  {colItems.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-8 text-center text-[11px] text-slate-400">
                      No tasks in {statusCol}
                    </div>
                  ) : (
                    colItems.map(({ entry, task }) => {
                      const subs = task.subtasks || [];
                      const doneSubs = subs.filter((s) => s.status === "Completed").length;

                      return (
                        <div
                          key={task.id}
                          draggable={!isEmployee}
                          onDragStart={() => {
                            if (!isEmployee) setDraggingTaskId(task.id);
                          }}
                          onDragEnd={() => {
                            setDraggingTaskId(null);
                            setDragOverColumnId(null);
                          }}
                          onClick={() => {
                            setSelectedEntryKey(entry.entryKey);
                            setIsDetailModalOpen(true);
                          }}
                          className={`rounded-2xl border-[1.5px] border-slate-300 bg-white p-3.5 shadow-xs hover:border-neutral-900 space-y-2 ${
                            isEmployee ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-bold text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md truncate">
                              {entry.clientName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 shrink-0">
                              {task.task_code}
                            </span>
                          </div>
                          <h4 className="text-xs font-extrabold text-[#111827] leading-snug">
                            {task.title}
                          </h4>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span>Due: {formatDate(task.due_date)}</span>
                            <span>
                              {subs.length > 0 ? `${doneSubs}/${subs.length} Subtasks` : task.priority}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Client Workflow Tasks, Subtasks & Comments Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300">
          {selectedEntry && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
                  <div>
                    <DialogTitle className="text-xl font-extrabold text-[#111827]">
                      {selectedEntry.clientName} — {workflow.workflow_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {selectedEntry.project?.project_code || selectedEntry.clientCode} • Manage every workflow task, subtask, timeline date, and comment.
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/clients/${selectedEntry.clientId}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl">
                        Client 360°
                      </Button>
                    </Link>
                    {selectedEntry.project && (
                      <Link to={`/projects/${selectedEntry.project.id}`}>
                        <Button variant="outline" size="sm" className="h-8 text-xs rounded-xl">
                          Project Page
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </DialogHeader>

              {selectedEntry.tasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center space-y-3">
                  <p className="text-xs text-slate-600">
                    {isEmployee
                      ? "No assigned tasks available in this workflow."
                      : "Workflow tasks haven't been synced to this client's project yet."}
                  </p>
                  {!isEmployee && (
                    <Button
                      size="sm"
                      onClick={handleSyncTasks}
                      className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Sync Workflow Tasks Now
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  {selectedEntry.tasks.map((task, idx) => {
                    const subs = task.subtasks || [];

                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded-md">
                                #{idx + 1} · {task.task_code}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                {formatDate(task.start_date)} &rarr; {formatDate(task.due_date)}
                              </span>
                            </div>
                            <h4 className="text-sm font-extrabold text-[#111827] mt-1">
                              {task.title}
                            </h4>
                          </div>

                          {isEmployee ? (
                            <Badge variant="outline" className="text-xs font-bold bg-slate-50 border-slate-300 self-start sm:self-auto">
                              {task.status}
                            </Badge>
                          ) : (
                            <select
                              value={task.status}
                              onChange={(e) => {
                                pmsStore.updateTaskStatus(task.id, e.target.value as TaskStatus);
                                toast.success(`Updated "${task.title}" to ${e.target.value}`);
                              }}
                              className="h-8 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-bold"
                            >
                              {statusNames.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* Subtasks Section (Nested Sub-subtasks + Document Uploads) */}
                        <div className="space-y-2.5">
                          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <CheckSquare className="h-3.5 w-3.5 text-violet-600" />
                            <span>Subtasks</span>
                          </div>

                          <SubtaskTree
                            subtasks={subs}
                            fallbackStartDate={task.start_date}
                            onSelectTask={(subId) => setDetailTaskId(subId)}
                            onChanged={() => setTick((t) => t + 1)}
                            readOnly={isEmployee}
                          />

                          {!isEmployee && (
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add subtask..."
                                value={subtaskTitleByTask[task.id] || ""}
                                onChange={(e) =>
                                  setSubtaskTitleByTask((prev) => ({
                                    ...prev,
                                    [task.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddSubtaskInModal(task);
                                  }
                                }}
                                className="h-8 rounded-xl border-slate-300 text-xs"
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleAddSubtaskInModal(task)}
                                className="h-8 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs px-3 gap-1"
                              >
                                <Plus className="h-3.5 w-3.5" /> Add
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Read-Receipt Comments Section */}
                        <TaskCommentsBox
                          taskId={task.id}
                          assignedEmployeeId={task.assigned_employee_id}
                          onUpdated={() => setTick((t) => t + 1)}
                          readOnly={isEmployee}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Task Subtasks & SOP Comments Modal */}
      <Dialog open={isTplTaskModalOpen} onOpenChange={setIsTplTaskModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300">
          {activeTplTask && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono text-[11px] font-bold">
                    TPL TASK
                  </Badge>
                  <DialogTitle className="text-base font-extrabold text-slate-900">
                    {activeTplTask.task_name}
                  </DialogTitle>
                </div>
                <DialogDescription className="text-xs text-slate-500">
                  Configure default subtasks, start offset, duration, and SOP comments for this task.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                {/* Task Parameters Form */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Start Day Offset</label>
                    {isEmployee ? (
                      <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold">
                        Day {(activeTplTask.start_day_offset || 0) + 1}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        value={(activeTplTask.start_day_offset || 0) + 1}
                        onChange={(e) =>
                          updateTemplateTask(activeTplTask.id, (prev) => ({
                            ...prev,
                            start_day_offset: Math.max(0, Number(e.target.value) - 1),
                          }))
                        }
                        className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Duration (Days)</label>
                    {isEmployee ? (
                      <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold">
                        {activeTplTask.duration_days || 1} day(s)
                      </div>
                    ) : (
                      <Input
                        type="number"
                        min={1}
                        value={activeTplTask.duration_days || 1}
                        onChange={(e) =>
                          updateTemplateTask(activeTplTask.id, (prev) => ({
                            ...prev,
                            duration_days: Math.max(1, Number(e.target.value) || 1),
                          }))
                        }
                        className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Priority</label>
                    {isEmployee ? (
                      <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold">
                        {activeTplTask.priority}
                      </div>
                    ) : (
                      <select
                        value={activeTplTask.priority}
                        onChange={(e) =>
                          updateTemplateTask(activeTplTask.id, (prev) => ({
                            ...prev,
                            priority: e.target.value as ProjectPriority,
                          }))
                        }
                        className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Default Assignee</label>
                    {isEmployee ? (
                      <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold truncate">
                        {activeTplTask.assigned_employee_name || "Service RM"}
                      </div>
                    ) : (
                      <select
                        value={activeTplTask.assigned_employee_id || ""}
                        onChange={(e) => {
                          const emp = employees.find((item) => item.id === e.target.value);
                          updateTemplateTask(activeTplTask.id, (prev) => ({
                            ...prev,
                            assigned_employee_id: emp?.id,
                            assigned_employee_name: emp?.full_name,
                          }));
                        }}
                        className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                      >
                        <option value="">Auto Service RM</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Template Subtasks */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-violet-600" />
                    <span>Template Subtasks ({(activeTplTask.subtasks || []).length})</span>
                  </h4>

                  {(activeTplTask.subtasks || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No subtasks configured.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeTplTask.subtasks || []).map((st) => (
                        <div
                          key={st.id}
                          className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#111827] truncate">{st.title}</p>
                            <p className="text-[10px] text-slate-500">
                              Start Day {(st.start_day_offset || 0) + 1} • Duration {st.duration_days}d •{" "}
                              {st.assigned_employee_name || "Task Assignee"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEmployee ? (
                              <Badge variant="outline" className="text-[11px] font-bold bg-white border-slate-300">
                                {st.status || "To Do"}
                              </Badge>
                            ) : (
                              <>
                                <select
                                  value={st.status || "To Do"}
                                  onChange={(e) =>
                                    updateTemplateTask(activeTplTask.id, (prev) => ({
                                      ...prev,
                                      subtasks: (prev.subtasks || []).map((item) =>
                                        item.id === st.id ? { ...item, status: e.target.value as TaskStatus } : item
                                      ),
                                    }))
                                  }
                                  className="h-8 rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-bold"
                                >
                                  {statusNames.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateTemplateTask(activeTplTask.id, (prev) => ({
                                      ...prev,
                                      subtasks: (prev.subtasks || []).filter((item) => item.id !== st.id),
                                    }))
                                  }
                                  className="p-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                                  title="Delete Subtask"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isEmployee && (
                    <form
                      onSubmit={handleAddTemplateSubtask}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-3 border-t border-slate-200 items-end"
                    >
                      <div className="sm:col-span-5 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Subtask Title</label>
                        <Input
                          placeholder="e.g. Verify director DSC validity"
                          value={subTitle}
                          onChange={(e) => setSubTitle(e.target.value)}
                          className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Start Day</label>
                        <Input
                          type="number"
                          min={1}
                          value={subStartDay}
                          onChange={(e) => setSubStartDay(Math.max(1, Number(e.target.value)))}
                          className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">Days</label>
                        <Input
                          type="number"
                          min={1}
                          value={subDurationDays}
                          onChange={(e) => setSubDurationDays(Math.max(1, Number(e.target.value)))}
                          className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <Button
                          type="submit"
                          size="sm"
                          className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Subtask
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Default Template Comments */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-sky-600" />
                    <span>Default Task Comments ({(activeTplTask.default_comments || []).length})</span>
                  </h4>

                  {(activeTplTask.default_comments || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No template comments configured.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeTplTask.default_comments || []).map((cmt, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-800">{cmt}</span>
                          {!isEmployee && (
                            <button
                              type="button"
                              onClick={() =>
                                updateTemplateTask(activeTplTask.id, (prev) => ({
                                  ...prev,
                                  default_comments: (prev.default_comments || []).filter((_, i) => i !== idx),
                                }))
                              }
                              className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0"
                              title="Delete Comment"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isEmployee && (
                    <form onSubmit={handleAddTemplateComment} className="flex gap-2 pt-2 border-t border-slate-200">
                      <Input
                        placeholder="Add standard SOP comment or checklist reminder..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs flex-1"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1 shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" /> Add Comment
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        taskId={detailTaskId}
        open={Boolean(detailTaskId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDetailTaskId(null);
        }}
        onUpdated={() => setTick((t) => t + 1)}
        readOnly={isEmployee}
      />
    </div>
  );
}
