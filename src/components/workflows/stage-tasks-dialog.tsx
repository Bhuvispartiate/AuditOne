import React, { useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  FileText,
  GripVertical,
  Layers,
  ListChecks,
  MessageSquare,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { getStyleForColor } from "@/lib/task-status-styles";
import { pmsStore } from "@/lib/data/store";
import {
  Employee,
  ProjectPriority,
  Task,
  TaskStatus,
  TaskStatusConfig,
  WorkflowDocumentAttachment,
  WorkflowMilestoneTemplate,
  WorkflowProjectTaskTemplate,
  WorkflowStageTemplate,
  WorkflowSubtaskTemplate,
} from "@/types";
import { toast } from "sonner";
import { ProjectTimeline } from "@/components/tasks/project-timeline";
import { whatsappClient } from "@/lib/whatsapp-client";

interface StageTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  milestone: WorkflowMilestoneTemplate;
  milestoneIndex: number;
  stage: WorkflowStageTemplate;
  stageIndex: number;
  tasks: WorkflowProjectTaskTemplate[];
  employees: Employee[];
  taskStatuses: TaskStatusConfig[];
  isEmployee: boolean;
}

type DrillItem =
  | { kind: "task"; item: WorkflowProjectTaskTemplate }
  | { kind: "subtask"; item: WorkflowSubtaskTemplate };

function findSubtaskInList(
  subtasks: WorkflowSubtaskTemplate[],
  targetId: string
): WorkflowSubtaskTemplate | null {
  for (const sub of subtasks) {
    if (sub.id === targetId) return sub;
    if (sub.subtasks && sub.subtasks.length > 0) {
      const nested = findSubtaskInList(sub.subtasks, targetId);
      if (nested) return nested;
    }
  }
  return null;
}

function findPathInStage(
  tasks: WorkflowProjectTaskTemplate[],
  targetId: string
): DrillItem[] {
  for (const t of tasks) {
    if (t.id === targetId) return [{ kind: "task", item: t }];
    const subPath = findSubtaskPath(t.subtasks || [], targetId);
    if (subPath.length > 0) return [{ kind: "task", item: t }, ...subPath];
  }
  return [];
}

function findSubtaskPath(
  subtasks: WorkflowSubtaskTemplate[],
  targetId: string
): DrillItem[] {
  for (const s of subtasks) {
    if (s.id === targetId) return [{ kind: "subtask", item: s }];
    if (s.subtasks && s.subtasks.length > 0) {
      const nested = findSubtaskPath(s.subtasks, targetId);
      if (nested.length > 0) return [{ kind: "subtask", item: s }, ...nested];
    }
  }
  return [];
}

export function StageTasksDialog({
  open,
  onOpenChange,
  workflowId,
  milestone,
  milestoneIndex,
  stage,
  stageIndex,
  tasks,
  employees,
  taskStatuses,
  isEmployee,
}: StageTasksDialogProps) {
  const [search, setSearch] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);

  // Create Task modal (exact Tasks page fields)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState(employees[0]?.id || "");
  const [taskPriority, setTaskPriority] = useState<ProjectPriority>("Medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(
    taskStatuses[0]?.label || "To Do"
  );
  const [taskStartDate, setTaskStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [taskDueDate, setTaskDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [taskDescription, setTaskDescription] = useState("");
  const [draftSubInput, setDraftSubInput] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);

  // Detail modal drill-down (Task -> Subtask -> Nested Subtask)
  const [viewingItemId, setViewingItemId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [showAddSubForm, setShowAddSubForm] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [subStartDate, setSubStartDate] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  const [subPriority, setSubPriority] = useState<ProjectPriority>("Medium");
  const [subAssigneeId, setSubAssigneeId] = useState("");
  const [commentInput, setCommentInput] = useState("");

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tasks;
    return tasks.filter(
      (t) =>
        t.task_name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.assigned_employee_name || "").toLowerCase().includes(q)
    );
  }, [tasks, search]);

  const drillPath = useMemo(() => {
    if (!viewingItemId) return [];
    return findPathInStage(tasks, viewingItemId);
  }, [tasks, viewingItemId]);

  const activeEntry = drillPath.length > 0 ? drillPath[drillPath.length - 1] : null;
  const parentEntry = drillPath.length > 1 ? drillPath[drillPath.length - 2] : null;

  const openDetailFor = (id: string, initialDesc?: string) => {
    setViewingItemId(id);
    setEditingNotes(false);
    setNotesDraft(initialDesc || "");
    setShowAddSubForm(false);
    setSubTitle("");
    setCommentInput("");
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    let subStageId: string | undefined = stage.sub_stages?.[0]?.id;
    if (!subStageId) {
      const createdSubStage = pmsStore.addWorkflowSubStage(
        workflowId,
        milestone.id,
        stage.id,
        { sub_stage_name: "General" }
      );
      subStageId = createdSubStage?.id;
    }
    if (!subStageId) return;

    const assignee = employees.find((emp) => emp.id === taskAssigneeId);
    const createdTask = pmsStore.addWorkflowTaskInSubStage(
      workflowId,
      milestone.id,
      stage.id,
      subStageId,
      {
        task_name: taskTitle.trim(),
        description: taskDescription.trim(),
        start_day_offset: 1,
        duration_days: 7,
        start_date: taskStartDate,
        due_date: taskDueDate,
        priority: taskPriority,
        status: taskStatus,
        assigned_employee_id: assignee?.id,
        assigned_employee_name: assignee?.full_name,
        subtasks: [],
        default_comments: [],
        documents: [],
      }
    );

    if (createdTask) {
      const allDrafts = [...draftSubtasks];
      if (draftSubInput.trim()) allDrafts.push(draftSubInput.trim());
      allDrafts.forEach((st) => {
        pmsStore.addWorkflowSubtaskInHierarchy(workflowId, createdTask.id, {
          title: st,
          start_day_offset: 1,
          duration_days: 3,
          start_date: taskStartDate,
          due_date: taskDueDate,
          priority: "Medium",
          status: taskStatuses[0]?.label || "To Do",
          assigned_employee_id: assignee?.id,
          assigned_employee_name: assignee?.full_name,
          default_comments: [],
          documents: [],
          subtasks: [],
        });
      });
    }

    setTaskTitle("");
    setTaskDescription("");
    setDraftSubtasks([]);
    setDraftSubInput("");
    setIsCreateOpen(false);
    toast.success(`Task "${taskTitle.trim()}" created.`);
  };

  const handleTaskDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    if (isEmployee) return;
    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;
    setDraggingTaskId(null);
    if (!taskId) return;
    pmsStore.updateWorkflowTaskInHierarchy(workflowId, taskId, {
      status: targetStatus,
    });
    toast.success(`Moved task to "${targetStatus}"`);
  };

  const updateActiveItem = (
    updates: Partial<WorkflowProjectTaskTemplate & WorkflowSubtaskTemplate>,
    msg?: string
  ) => {
    if (!activeEntry) return;
    if (activeEntry.kind === "task") {
      pmsStore.updateWorkflowTaskInHierarchy(workflowId, activeEntry.item.id, updates);
    } else {
      pmsStore.updateWorkflowSubtaskInHierarchy(workflowId, activeEntry.item.id, updates);
    }
    if (msg) toast.success(msg);
  };

  const handleAddSubtaskInDetail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry || !subTitle.trim()) {
      toast.error("Please enter a subtask title.");
      return;
    }
    const emp = employees.find((item) => item.id === subAssigneeId);
    const parentStart = activeEntry.item.start_date || new Date().toISOString().slice(0, 10);
    const parentDue = activeEntry.item.due_date || parentStart;

    pmsStore.addWorkflowSubtaskInHierarchy(workflowId, activeEntry.item.id, {
      title: subTitle.trim(),
      start_day_offset: 1,
      duration_days: 3,
      start_date: subStartDate || parentStart,
      due_date: subDueDate || parentDue,
      priority: subPriority,
      status: taskStatuses[0]?.label || "To Do",
      assigned_employee_id: emp?.id || activeEntry.item.assigned_employee_id,
      assigned_employee_name: emp?.full_name || activeEntry.item.assigned_employee_name,
      default_comments: [],
      documents: [],
      subtasks: [],
    });

    setSubTitle("");
    setShowAddSubForm(false);
    toast.success("Subtask added.");
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry || !commentInput.trim()) return;
    const prev = activeEntry.item.default_comments || [];
    updateActiveItem(
      { default_comments: [...prev, commentInput.trim()] },
      "Comment added"
    );
    setCommentInput("");
  };

  const handleAddDocument = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeEntry) return;
    const prevDocs: WorkflowDocumentAttachment[] = activeEntry.item.documents || [];
    const nextDoc: WorkflowDocumentAttachment = {
      id: `doc-${Date.now()}`,
      name: file.name,
      size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      uploaded_at: new Date().toISOString().slice(0, 10),
      uploaded_by: pmsStore.getCurrentUser()?.full_name,
    };
    updateActiveItem({ documents: [...prevDocs, nextDoc] }, `Attached "${file.name}"`);
    e.target.value = "";
  };

  const handleRemoveDocument = (docId: string) => {
    if (!activeEntry) return;
    const prevDocs = activeEntry.item.documents || [];
    updateActiveItem(
      { documents: prevDocs.filter((d) => d.id !== docId) },
      "Document removed"
    );
  };

  const handleSendWhatsAppInWorkflow = async () => {
    if (!activeEntry) return;
    const item = activeEntry.item;
    const emp = employees.find((e) => e.id === item.assigned_employee_id);
    let targetPhone = emp?.mobile_number;
    let targetName = emp?.full_name || "Team Member";

    if (!targetPhone) {
      const manualPhone = window.prompt(
        "Enter recipient WhatsApp mobile number (with country code, e.g., 919876543210):"
      );
      if (!manualPhone) return;
      targetPhone = manualPhone;
    }

    const title =
      activeEntry.kind === "task"
        ? (item as WorkflowProjectTaskTemplate).task_name
        : (item as WorkflowSubtaskTemplate).title;

    toast.info("Sending WhatsApp notification...");
    const res = await whatsappClient.sendTaskAssignment(
      targetPhone,
      targetName,
      title,
      `Stage ${stageIndex + 1}: ${stage.stage_name} (${milestone.title})`,
      item.due_date
    );

    if (res.success && res.status === "SENT") {
      toast.success(`WhatsApp alert sent to ${targetName} (+${targetPhone})!`);
    } else {
      toast.error(
        `WhatsApp failed: ${res.error || res.status}. Ensure WhatsApp backend is running on port 8080.`
      );
    }
  };

  const timelineTask: Task = useMemo(() => {
    if (!activeEntry) {
      return {
        id: "none",
        task_code: "TASK",
        title: "Task",
        description: "",
        project_id: workflowId,
        start_date: new Date().toISOString().slice(0, 10),
        due_date: new Date().toISOString().slice(0, 10),
        status: "To Do",
        priority: "Medium",
        created_at: new Date().toISOString(),
        subtasks: [],
      };
    }
    const mapSubToTask = (s: WorkflowSubtaskTemplate): Task => ({
      id: s.id,
      task_code: s.title,
      title: s.title,
      description: s.description || "",
      project_id: workflowId,
      start_date:
        s.start_date ||
        activeEntry.item.start_date ||
        new Date().toISOString().slice(0, 10),
      due_date:
        s.due_date ||
        activeEntry.item.due_date ||
        new Date().toISOString().slice(0, 10),
      status: s.status || "To Do",
      priority: s.priority || "Medium",
      assigned_employee_id: s.assigned_employee_id,
      assigned_employee_name: s.assigned_employee_name,
      created_at: new Date().toISOString(),
      subtasks: (s.subtasks || []).map(mapSubToTask),
    });

    const isTask = activeEntry.kind === "task";
    const title = isTask
      ? (activeEntry.item as WorkflowProjectTaskTemplate).task_name
      : (activeEntry.item as WorkflowSubtaskTemplate).title;
    const start =
      activeEntry.item.start_date || new Date().toISOString().slice(0, 10);
    const due = activeEntry.item.due_date || start;

    return {
      id: activeEntry.item.id,
      task_code: title,
      title: title,
      description: activeEntry.item.description || "",
      project_id: workflowId,
      start_date: start,
      due_date: due,
      status: activeEntry.item.status || "To Do",
      priority: activeEntry.item.priority || "Medium",
      assigned_employee_id: activeEntry.item.assigned_employee_id,
      assigned_employee_name: activeEntry.item.assigned_employee_name,
      created_at: new Date().toISOString(),
      subtasks: (activeEntry.item.subtasks || []).map(mapSubToTask),
    };
  }, [activeEntry, workflowId]);

  // Suppress unused import warning if findSubtaskInList not needed externally
  void findSubtaskInList;

  return (
    <>
      {/* 1. STAGE TASKS KANBAN BOARD MODAL (EXACT TASKS PAGE WORKSPACE) */}
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-6xl rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="space-y-3 pb-4 border-b border-slate-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold bg-[#EFE8DC] text-[#201815] border-[#E2DACD]"
                  >
                    M{milestoneIndex + 1}: {milestone.title}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] font-bold">
                    {tasks.length} Task{tasks.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-extrabold text-[#111827] flex items-center gap-2">
                  <Layers className="h-5 w-5 text-indigo-600" />
                  <span>
                    Stage {stageIndex + 1}: {stage.stage_name}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6b7280] mt-0.5">
                  Drag and drop tasks across status columns, or click any task to open its full overview, schedule, subtasks, documents &amp; comments.
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-52">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-8 rounded-xl bg-white border-slate-300 text-xs"
                  />
                </div>
                {!isEmployee && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setIsCreateOpen(true)}
                    className="h-9 px-3.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Task</span>
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Status Kanban Columns (exact Tasks page pattern) */}
          <div className="overflow-x-auto pb-2 pt-2">
            <div className="grid grid-flow-col auto-cols-[minmax(250px,280px)] gap-3 items-start">
              {taskStatuses.map((st) => {
                const colTasks = filteredTasks.filter(
                  (t) => (t.status || taskStatuses[0]?.label || "To Do") === st.label
                );
                const style = getStyleForColor(st.color);
                const isOver = dragOverStatus === st.label;

                return (
                  <div
                    key={st.id}
                    onDragOver={(e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverStatus(st.label as TaskStatus);
                    }}
                    onDragLeave={() => setDragOverStatus(null)}
                    onDrop={(e) => handleTaskDrop(e, st.label as TaskStatus)}
                    className={`rounded-2xl border-[1.5px] p-3 flex flex-col gap-2.5 min-h-[260px] transition-colors ${
                      isOver
                        ? "border-[#201815] bg-[#EFE8DC]/50"
                        : "border-slate-300 bg-white/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${style.dotClass}`}
                        />
                        <span className="text-xs font-extrabold text-[#111827]">
                          {st.label}
                        </span>
                      </div>
                      <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                        {colTasks.length}
                      </Badge>
                    </div>

                    {colTasks.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-[11px] text-slate-400">
                        No tasks
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const subCount = task.subtasks?.length || 0;
                        const commentCount = task.default_comments?.length || 0;
                        return (
                          <div
                            key={task.id}
                            draggable={!isEmployee}
                            onDragStart={(e) => {
                              setDraggingTaskId(task.id);
                              e.dataTransfer.setData("text/plain", task.id);
                            }}
                            onClick={() => openDetailFor(task.id, task.description)}
                            className="rounded-xl border border-[#E2DACD] bg-white p-3 space-y-2 cursor-pointer hover:border-[#201815] hover:shadow-xs transition-all group"
                          >
                            <div className="flex items-start justify-between gap-1.5">
                              <div className="flex items-start gap-1.5 min-w-0">
                                {!isEmployee && (
                                  <GripVertical className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 mt-0.5 shrink-0" />
                                )}
                                <h4 className="text-xs font-extrabold text-[#111827] group-hover:text-[#201815] leading-snug">
                                  {task.task_name}
                                </h4>
                              </div>
                              {!isEmployee && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pmsStore.deleteWorkflowTaskFromHierarchy(
                                      workflowId,
                                      task.id
                                    );
                                    toast.success("Task deleted.");
                                  }}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 shrink-0"
                                  title="Delete Task"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {task.description}
                              </p>
                            )}

                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100 text-[10px]">
                              <Badge variant="outline" className="text-[10px] font-bold">
                                {task.priority}
                              </Badge>
                              <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                <User className="h-3 w-3 text-slate-400" />
                                {task.assigned_employee_name || "Unassigned"}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {task.due_date || "No due date"}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1 font-bold text-[#201815]">
                                  <ListChecks className="h-3 w-3" />
                                  {subCount}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {commentCount}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. CREATE NEW TASK MODAL (EXACT TASKS PAGE FORM) */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-lg rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-[#111827]">
              Create New Task in Stage {stageIndex + 1}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a task with schedule, priority, assignee, and initial subtasks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Task Title *
              </label>
              <Input
                placeholder="e.g. Verify GSTR-2B Reconciliation"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="h-9 rounded-xl border-slate-300 text-xs"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={taskStartDate}
                  onChange={(e) => setTaskStartDate(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Due Date
                </label>
                <Input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Status
                </label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                >
                  {taskStatuses.map((s) => (
                    <option key={s.id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Priority
                </label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as ProjectPriority)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Assignee
                </label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                >
                  <option value="">Unassigned</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Description / Notes
              </label>
              <Textarea
                rows={2}
                placeholder="Instructions or checklist notes..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                className="rounded-xl border-slate-300 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Subtasks (Optional)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Add subtask title..."
                  value={draftSubInput}
                  onChange={(e) => setDraftSubInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (draftSubInput.trim()) {
                        setDraftSubtasks((prev) => [...prev, draftSubInput.trim()]);
                        setDraftSubInput("");
                      }
                    }
                  }}
                  className="h-9 rounded-xl border-slate-300 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (draftSubInput.trim()) {
                      setDraftSubtasks((prev) => [...prev, draftSubInput.trim()]);
                      setDraftSubInput("");
                    }
                  }}
                  className="h-9 rounded-xl border-slate-300 text-xs font-bold"
                >
                  Add
                </Button>
              </div>
              {draftSubtasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {draftSubtasks.map((st, idx) => (
                    <Badge
                      key={idx}
                      variant="secondary"
                      className="rounded-lg text-[11px] gap-1.5 py-1"
                    >
                      <span>{st}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setDraftSubtasks((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="text-rose-500 hover:text-rose-700 font-bold"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-xl border-slate-300 text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold"
              >
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3. TASK / SUBTASK FULL OVERVIEW MODAL (EXACT TaskDetailDialog EXPERIENCE) */}
      <Dialog
        open={Boolean(activeEntry)}
        onOpenChange={(isOpen) => !isOpen && setViewingItemId(null)}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6">
          {activeEntry && (
            <>
              <DialogHeader className="space-y-2 pb-4 border-b border-slate-300">
                {parentEntry && (
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() =>
                        openDetailFor(
                          parentEntry.item.id,
                          parentEntry.item.description
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-full border border-neutral-900 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#111827] hover:bg-neutral-900 hover:text-white transition-colors"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      <span>
                        Back to{" "}
                        {parentEntry.kind === "task"
                          ? parentEntry.item.task_name
                          : parentEntry.item.title}
                      </span>
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold rounded-full border border-neutral-900 bg-neutral-900 px-2.5 py-0.5 text-white">
                        {activeEntry.kind === "task"
                          ? "TASK"
                          : drillPath.length === 2
                          ? "SUBTASK"
                          : `SUBTASK L${drillPath.length - 1}`}
                      </span>
                      <DialogTitle className="text-xl font-extrabold text-[#111827]">
                        {activeEntry.kind === "task"
                          ? activeEntry.item.task_name
                          : activeEntry.item.title}
                      </DialogTitle>
                    </div>
                    {activeEntry.item.description && !editingNotes && (
                      <DialogDescription className="text-xs text-[#6b7280] mt-1">
                        {activeEntry.item.description}
                      </DialogDescription>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-start shrink-0">
                    <Badge
                      variant={
                        activeEntry.item.status === "Completed"
                          ? "success"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {activeEntry.item.status || taskStatuses[0]?.label || "To Do"}
                    </Badge>
                    {!isEmployee && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleSendWhatsAppInWorkflow}
                          className="h-8 px-2.5 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1"
                          title="Send WhatsApp Alert"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (activeEntry.kind === "task") {
                              pmsStore.deleteWorkflowTaskFromHierarchy(
                                workflowId,
                                activeEntry.item.id
                              );
                              setViewingItemId(null);
                            } else {
                              pmsStore.deleteWorkflowSubtaskFromHierarchy(
                                workflowId,
                                "",
                                activeEntry.item.id
                              );
                              if (parentEntry) {
                                openDetailFor(
                                  parentEntry.item.id,
                                  parentEntry.item.description
                                );
                              } else {
                                setViewingItemId(null);
                              }
                            }
                            toast.success("Deleted.");
                          }}
                          className="h-8 px-2.5 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>Delete</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* BOX 1: Overview, Status, Start Date, Due Date, Priority, Assignee */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#201815]" />
                      <span>Overview &amp; Schedule</span>
                    </h4>
                    {!isEmployee && (
                      <button
                        type="button"
                        onClick={() => {
                          setNotesDraft(activeEntry.item.description || "");
                          setEditingNotes((v) => !v);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#111827]"
                      >
                        <Pencil className="h-3 w-3" />
                        <span>{editingNotes ? "Cancel Edit" : "Edit Notes"}</span>
                      </button>
                    )}
                  </div>

                  {!isEmployee && editingNotes && (
                    <div className="space-y-2 pb-2 border-b border-slate-100">
                      <Textarea
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        rows={2}
                        placeholder="Overview instructions or checklist..."
                        className="rounded-xl border-slate-300 text-xs"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            updateActiveItem(
                              { description: notesDraft.trim() },
                              "Overview notes updated"
                            );
                            setEditingNotes(false);
                          }}
                          className="h-7 px-3 rounded-lg bg-neutral-900 text-white text-xs font-bold"
                        >
                          Save Overview
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Status
                      </label>
                      {isEmployee ? (
                        <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-bold">
                          {activeEntry.item.status || "To Do"}
                        </div>
                      ) : (
                        <select
                          value={activeEntry.item.status || taskStatuses[0]?.label || "To Do"}
                          onChange={(e) =>
                            updateActiveItem(
                              { status: e.target.value as TaskStatus },
                              `Status updated to ${e.target.value}`
                            )
                          }
                          className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-bold text-[#111827]"
                        >
                          {taskStatuses.map((st) => (
                            <option key={st.id} value={st.label}>
                              {st.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Start Date
                      </label>
                      <Input
                        type="date"
                        disabled={isEmployee}
                        value={activeEntry.item.start_date || ""}
                        onChange={(e) =>
                          updateActiveItem(
                            { start_date: e.target.value },
                            "Start date updated"
                          )
                        }
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Due Date
                      </label>
                      <Input
                        type="date"
                        disabled={isEmployee}
                        value={activeEntry.item.due_date || ""}
                        onChange={(e) =>
                          updateActiveItem(
                            { due_date: e.target.value },
                            "Due date updated"
                          )
                        }
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Priority
                      </label>
                      <select
                        disabled={isEmployee}
                        value={activeEntry.item.priority || "Medium"}
                        onChange={(e) =>
                          updateActiveItem(
                            { priority: e.target.value as ProjectPriority },
                            "Priority updated"
                          )
                        }
                        className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827]"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Assignee
                      </label>
                      <select
                        disabled={isEmployee}
                        value={activeEntry.item.assigned_employee_id || ""}
                        onChange={(e) => {
                          const emp = employees.find(
                            (item) => item.id === e.target.value
                          );
                          updateActiveItem(
                            {
                              assigned_employee_id: emp?.id || undefined,
                              assigned_employee_name: emp?.full_name || "Unassigned",
                            },
                            "Assignee updated"
                          );
                        }}
                        className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827]"
                      >
                        <option value="">Unassigned</option>
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* BOX 2: Subtasks (Click any Subtask to open ITS own full Overview!) */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <ListChecks className="h-4 w-4 text-[#201815]" />
                      <span>
                        Subtasks ({(activeEntry.item.subtasks || []).length})
                      </span>
                    </h4>
                    {!isEmployee && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setShowAddSubForm((v) => !v)}
                        className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Subtask</span>
                      </Button>
                    )}
                  </div>

                  {(activeEntry.item.subtasks || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No subtasks yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeEntry.item.subtasks || []).map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => openDetailFor(sub.id, sub.description)}
                          className="rounded-xl border border-slate-300 bg-slate-50/60 hover:bg-white p-3 flex flex-wrap items-center justify-between gap-2 cursor-pointer hover:border-[#201815] transition-all group"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-extrabold text-[#111827] group-hover:text-[#201815]">
                              {sub.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500">
                              <span>{sub.assigned_employee_name || "Unassigned"}</span>
                              <span>•</span>
                              <span>{sub.priority || "Medium"}</span>
                              {sub.due_date && (
                                <>
                                  <span>•</span>
                                  <span>Due {sub.due_date}</span>
                                </>
                              )}
                              {(sub.subtasks?.length || 0) > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="font-bold text-[#201815]">
                                    {sub.subtasks?.length} nested
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-[10px] font-bold">
                              {sub.status || taskStatuses[0]?.label || "To Do"}
                            </Badge>
                            <span className="text-[11px] font-bold text-[#201815] group-hover:underline">
                              Overview →
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {!isEmployee && showAddSubForm && (
                    <form
                      onSubmit={handleAddSubtaskInDetail}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3 border-t border-slate-200 items-end"
                    >
                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          New Subtask Title *
                        </label>
                        <Input
                          placeholder="Enter subtask title..."
                          value={subTitle}
                          onChange={(e) => setSubTitle(e.target.value)}
                          autoFocus
                          className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Assignee
                        </label>
                        <select
                          value={subAssigneeId}
                          onChange={(e) => setSubAssigneeId(e.target.value)}
                          className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2 text-xs font-semibold"
                        >
                          <option value="">Same as parent</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>
                              {emp.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Start Date
                        </label>
                        <Input
                          type="date"
                          value={subStartDate}
                          onChange={(e) => setSubStartDate(e.target.value)}
                          className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Due Date
                        </label>
                        <Input
                          type="date"
                          value={subDueDate}
                          onChange={(e) => setSubDueDate(e.target.value)}
                          className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                        />
                      </div>
                      <div className="sm:col-span-1 space-y-1">
                        <label className="text-[10px] font-bold uppercase text-slate-500">
                          Priority
                        </label>
                        <select
                          value={subPriority}
                          onChange={(e) =>
                            setSubPriority(e.target.value as ProjectPriority)
                          }
                          className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2 text-xs font-semibold"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1.5">
                        <Button
                          type="submit"
                          size="sm"
                          className="flex-1 h-9 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Save</span>
                        </Button>
                      </div>
                    </form>
                  )}
                </div>

                {/* BOX 3: Click-to-Expand Timeline for this Task / Subtask / Sub-subtask */}
                <ProjectTimeline
                  key={`tl-${activeEntry.item.id}`}
                  tasks={[timelineTask]}
                  projectStartDate={timelineTask.start_date}
                  projectDueDate={timelineTask.due_date}
                  title="Task & Subtasks Timeline"
                  onSelectTask={(subId) => openDetailFor(subId)}
                  collapsible
                  defaultExpanded={false}
                />

                {/* BOX 4: Comments */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-[#201815]" />
                    <span>
                      Comments ({(activeEntry.item.default_comments || []).length})
                    </span>
                  </h4>

                  {(activeEntry.item.default_comments || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-400">
                      No comments yet.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {(activeEntry.item.default_comments || []).map((c, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-[#111827]"
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  )}

                  {!isEmployee && (
                    <form onSubmit={handleAddComment} className="flex gap-2">
                      <Input
                        placeholder="Write a comment or instruction..."
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                        className="h-9 rounded-xl border-slate-300 text-xs"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-9 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Post</span>
                      </Button>
                    </form>
                  )}
                </div>

                {/* BOX 5: Documents Upload */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Paperclip className="h-4 w-4 text-indigo-600" />
                      <span>
                        Documents ({(activeEntry.item.documents || []).length})
                      </span>
                    </h4>
                    {!isEmployee && (
                      <label className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-[#111827] cursor-pointer">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Attach File</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={handleAddDocument}
                        />
                      </label>
                    )}
                  </div>

                  {(activeEntry.item.documents || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-400">
                      No documents attached yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(activeEntry.item.documents || []).map((doc) => (
                        <div
                          key={doc.id}
                          className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#111827] truncate">
                                {doc.name}
                              </p>
                              <p className="text-[10px] text-slate-500">
                                {doc.size || "File"} • {doc.uploaded_at}
                              </p>
                            </div>
                          </div>
                          {!isEmployee && (
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(doc.id)}
                              className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                              title="Remove Document"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
