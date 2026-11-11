import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  User,
  Calendar as CalendarIcon,
  ListChecks,
  MessageSquare,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import { TaskStatus, ProjectPriority } from "@/types";
import { toast } from "sonner";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

const ALL_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Pending",
  "Under Review",
  "Blocked",
  "Completed",
];

const STATUS_COLUMN_STYLES: Record<
  TaskStatus,
  { container: string; headerBorder: string; badgeVariant: "secondary" | "default" | "warning" | "destructive" | "success" }
> = {
  "To Do": {
    container: "border-slate-300 bg-slate-50/70",
    headerBorder: "border-slate-200",
    badgeVariant: "secondary",
  },
  "In Progress": {
    container: "border-violet-300 bg-violet-50/40",
    headerBorder: "border-violet-200",
    badgeVariant: "default",
  },
  "Pending": {
    container: "border-amber-300 bg-amber-50/40",
    headerBorder: "border-amber-200",
    badgeVariant: "warning",
  },
  "Under Review": {
    container: "border-sky-300 bg-sky-50/40",
    headerBorder: "border-sky-200",
    badgeVariant: "secondary",
  },
  "Blocked": {
    container: "border-rose-300 bg-rose-50/40",
    headerBorder: "border-rose-200",
    badgeVariant: "destructive",
  },
  "Completed": {
    container: "border-emerald-300 bg-emerald-50/40",
    headerBorder: "border-emerald-200",
    badgeVariant: "success",
  },
};

function TasksContent() {
  const [searchParams] = useSearchParams();
  const autoCreate = searchParams.get("create") === "true";

  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(autoCreate);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const tasks = pmsStore.getTasks();
  const projects = pmsStore.getProjects();
  const clients = pmsStore.getClients();
  const employees = pmsStore.getEmployees();

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(employees[0]?.id || "");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");
  const [initialStatus, setInitialStatus] = useState<TaskStatus>("To Do");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [draftSubtaskInput, setDraftSubtaskInput] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  const filteredTasks = tasks.filter((t) => {
    const proj = projects.find((p) => p.id === t.project_id);
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
      (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase()));

    const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter;
    return matchesSearch && matchesClient;
  });

  const handleOpenDetail = (taskId: string) => {
    setActiveTaskId(taskId);
    setIsDetailOpen(true);
  };

  const handleAddDraftSubtask = () => {
    const trimmed = draftSubtaskInput.trim();
    if (!trimmed) return;
    setDraftSubtasks((prev) => [...prev, trimmed]);
    setDraftSubtaskInput("");
  };

  const handleRemoveDraftSubtask = (idx: number) => {
    setDraftSubtasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!projectId) {
      toast.error("Please select a parent project.");
      return;
    }

    const proj = projects.find((p) => p.id === projectId);
    const emp = employees.find((e) => e.id === assignedEmployeeId);

    const created = pmsStore.addTask({
      title: taskTitle.trim(),
      project_id: projectId,
      project_name: proj?.project_name,
      assigned_employee_id: assignedEmployeeId,
      assigned_employee_name: emp?.full_name,
      priority,
      start_date: startDate,
      due_date: dueDate,
      status: initialStatus,
      description,
      created_by: pmsStore.getCurrentUser().id,
      created_by_name: pmsStore.getCurrentUser().full_name,
    });

    const subtasksToAdd = [...draftSubtasks];
    if (draftSubtaskInput.trim()) {
      subtasksToAdd.push(draftSubtaskInput.trim());
    }
    subtasksToAdd.forEach((subTitle) => {
      pmsStore.addSubtask(created.id, {
        title: subTitle,
        start_date: startDate,
        due_date: dueDate,
        assigned_employee_id: assignedEmployeeId,
        assigned_employee_name: emp?.full_name,
      });
    });

    toast.success(
      subtasksToAdd.length > 0
        ? `Task ${created.task_code} created with ${subtasksToAdd.length} subtask(s).`
        : `Task ${created.task_code} created.`
    );
    setIsModalOpen(false);
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    pmsStore.updateTaskStatus(taskId, newStatus);
    toast.success(`Task status updated to ${newStatus}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Task Management Engine
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Kanban board organized by task status. Drag cards between statuses or click a task to open its overview.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search tasks by title, code, client, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
            />
          </div>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="h-10 rounded-2xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
          >
            <option value="ALL">All Clients ({clients.length})</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name} ({c.client_code})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* KANBAN BOARD VIEW ONLY (Headings = Task Statuses) */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start">
        {ALL_STATUSES.map((status) => {
          const columnTasks = filteredTasks.filter((t) => t.status === status);
          const colStyle = STATUS_COLUMN_STYLES[status];
          const isOver = dragOverStatus === status;

          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(status);
              }}
              onDragLeave={() =>
                setDragOverStatus((prev) => (prev === status ? null : prev))
              }
              onDrop={(e) => {
                e.preventDefault();
                setDragOverStatus(null);
                if (draggingTaskId) {
                  const dragged = tasks.find((t) => t.id === draggingTaskId);
                  setDraggingTaskId(null);
                  if (dragged && dragged.status !== status) {
                    handleStatusChange(dragged.id, status);
                  }
                }
              }}
              className={`w-[320px] shrink-0 rounded-[24px] border-[1.5px] p-4 space-y-3 transition-colors ${
                isOver ? "border-neutral-900 bg-slate-100/80" : colStyle.container
              }`}
            >
              {/* Status Heading */}
              <div className={`flex items-center justify-between gap-2 pb-2.5 border-b ${colStyle.headerBorder}`}>
                <h2 className="text-sm font-extrabold text-[#111827] truncate">
                  {status}
                </h2>
                <Badge variant={colStyle.badgeVariant} className="rounded-full text-[11px] font-bold shrink-0">
                  {columnTasks.length}
                </Badge>
              </div>

              <div className="space-y-3 min-h-[160px]">
                {columnTasks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                    Drop task card here
                  </div>
                ) : (
                  columnTasks.map((task) => {
                    const parentProj = projects.find((p) => p.id === task.project_id);
                    const subtasks = task.subtasks || [];
                    const startStr = task.start_date || task.created_at.slice(0, 10);

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={() => setDraggingTaskId(task.id)}
                        onDragEnd={() => {
                          setDraggingTaskId(null);
                          setDragOverStatus(null);
                        }}
                        className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-neutral-900 transition-all space-y-3 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="font-mono text-[10px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                              {task.task_code}
                            </span>
                            <Badge
                              variant={
                                task.priority === "Urgent"
                                  ? "destructive"
                                  : task.priority === "High"
                                  ? "warning"
                                  : "outline"
                              }
                              className="text-[10px] rounded-full"
                            >
                              {task.priority}
                            </Badge>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              pmsStore.deleteTask(task.id);
                              toast.success(`Deleted task ${task.task_code}`);
                            }}
                            className="h-7 w-7 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 shrink-0"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(task.id)}
                            className="text-left group/title w-full"
                          >
                            <h4 className="font-extrabold text-sm text-[#111827] leading-snug group-hover/title:text-violet-700 transition-colors">
                              {task.title}
                            </h4>
                          </button>
                          {parentProj?.client_name && (
                            <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                              {parentProj.client_name} • {task.project_name || parentProj.project_name}
                            </p>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 space-y-1 text-[11px] text-slate-600">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 truncate font-medium">
                              <User className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="truncate">{task.assigned_employee_name || "Unassigned"}</span>
                            </span>
                            <span className="inline-flex items-center gap-1 shrink-0 font-semibold text-slate-700">
                              <MessageSquare className="h-3 w-3 text-sky-600" />
                              {task.comments_count || 0}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3 text-slate-400" />
                              {formatDate(startStr)} → {formatDate(task.due_date)}
                            </span>
                            {subtasks.length > 0 && (
                              <span className="inline-flex items-center gap-1 font-bold text-violet-700">
                                <ListChecks className="h-3 w-3" />
                                {subtasks.length} sub
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            className="h-8 rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-bold text-[#111827] focus:outline-none"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOpenDetail(task.id)}
                            className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-[11px] font-bold"
                          >
                            Overview
                          </Button>
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

      {/* Create Task Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create Deliverable Task</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Task Title</label>
              <Input
                placeholder="e.g. Scrutinize 26AS TDS credits against General Ledger"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Parent Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.project_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assigned Employee</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Task Status</label>
                <select
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value as TaskStatus)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-2 text-xs"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Start Date</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Due Date</label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                Subtasks (optional — add any number of subtasks)
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter a subtask title and click Add..."
                  value={draftSubtaskInput}
                  onChange={(e) => setDraftSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddDraftSubtask();
                    }
                  }}
                />
                <Button type="button" variant="outline" onClick={handleAddDraftSubtask}>
                  Add
                </Button>
              </div>
              {draftSubtasks.length > 0 && (
                <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                  {draftSubtasks.map((st, idx) => (
                    <div
                      key={`${st}-${idx}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs"
                    >
                      <span className="font-medium text-slate-800 truncate">
                        {idx + 1}. {st}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftSubtask(idx)}
                        className="text-rose-600 hover:underline text-[11px] font-bold shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Work Instructions & Checkpoints</label>
              <Textarea
                placeholder="Specific guidance, reference sections, source documents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-neutral-900 hover:bg-black text-white">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        taskId={activeTaskId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdated={() => setTick((t) => t + 1)}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading tasks board...</div>}>
      <TasksContent />
    </React.Suspense>
  );
}

