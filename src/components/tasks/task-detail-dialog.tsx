import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  ListChecks,
  Plus,
  Building2,
  FolderGit2,
  Trash2,
  Pencil,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { ProjectPriority, Task, TaskStatus } from "@/types";
import { toast } from "sonner";
import { ProjectTimeline } from "./project-timeline";
import { SubtaskTree, countNestedSubtasks } from "./subtask-tree";
import { TaskCommentsBox } from "./task-comments-box";
import { TaskDocumentsBox } from "./task-documents-box";

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

const ALL_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Pending",
  "Under Review",
  "Blocked",
  "Completed",
];

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onUpdated,
}: TaskDetailDialogProps) {
  const [, setTick] = useState(0);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(taskId);
  const [showAddSubtaskForm, setShowAddSubtaskForm] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [subTitle, setSubTitle] = useState("");
  const [subStartDate, setSubStartDate] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  const [subAssigneeId, setSubAssigneeId] = useState("");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (open) {
      setViewingTaskId(taskId);
    }
  }, [taskId, open]);

  const activeId = viewingTaskId || taskId;
  const task = activeId ? pmsStore.getTaskById(activeId) : undefined;
  const project = task ? pmsStore.getProjectById(task.project_id) : undefined;
  const employees = pmsStore.getEmployees();

  // Build ancestor chain for hierarchical drill-down navigation (Task -> Subtask -> Sub-subtask)
  const ancestors = useMemo(() => {
    const chain: Task[] = [];
    const seen = new Set<string>();
    let currParentId = task?.parent_task_id;
    while (currParentId && !seen.has(currParentId)) {
      seen.add(currParentId);
      const parentObj = pmsStore.getTaskById(currParentId);
      if (!parentObj) break;
      chain.unshift(parentObj);
      currParentId = parentObj.parent_task_id;
    }
    return chain;
  }, [task?.id, task?.parent_task_id]);

  useEffect(() => {
    if (task) {
      setShowAddSubtaskForm(false);
      setEditingNotes(false);
      setNotesDraft(task.description || "");
      setSubTitle("");
      setSubStartDate(task.start_date || new Date().toISOString().slice(0, 10));
      setSubDueDate(task.due_date || new Date().toISOString().slice(0, 10));
      setSubAssigneeId(task.assigned_employee_id || employees[0]?.id || "");
    }
  }, [task?.id]);

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle>Task Overview</DialogTitle>
            <DialogDescription>Select a task or subtask to view its overview, dates, timeline & comments.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const subtasks = task.subtasks || [];
  const { total: totalNestedSubtasks, completed: completedNestedSubtasks } =
    countNestedSubtasks(subtasks);
  const directParent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  const levelLabel =
    ancestors.length === 0 ? "Task" : ancestors.length === 1 ? "Subtask" : `Sub-subtask (L${ancestors.length})`;

  const notifyChange = () => {
    setTick((t) => t + 1);
    onUpdated?.();
  };

  const handleTaskUpdate = (updates: Partial<typeof task>, message?: string) => {
    pmsStore.updateTask(task.id, updates);
    if (message) toast.success(message);
    notifyChange();
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) {
      toast.error("Please enter a subtask title.");
      return;
    }
    const emp = employees.find((item) => item.id === subAssigneeId);
    pmsStore.addSubtask(task.id, {
      title: subTitle.trim(),
      start_date: subStartDate || task.start_date,
      due_date: subDueDate || task.due_date,
      assigned_employee_id: emp?.id || task.assigned_employee_id,
      assigned_employee_name: emp?.full_name || task.assigned_employee_name,
    });
    setSubTitle("");
    setShowAddSubtaskForm(false);
    toast.success("Subtask added.");
    notifyChange();
  };

  const handleSaveNotes = () => {
    handleTaskUpdate({ description: notesDraft.trim() }, "Overview notes updated");
    setEditingNotes(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6">
        <DialogHeader className="space-y-2 pb-4 border-b border-slate-300">
          {/* Hierarchy Flow Breadcrumb: Client -> Project -> Task -> Subtask -> Sub-subtask */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
            {directParent && (
              <button
                type="button"
                onClick={() => setViewingTaskId(directParent.id)}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-900 bg-white px-2.5 py-0.5 text-[#111827] hover:bg-neutral-900 hover:text-white transition-colors mr-1"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to {directParent.task_code}</span>
              </button>
            )}

            {project?.client_id && (
              <>
                <Link
                  to={`/clients/${project.client_id}`}
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-slate-700 hover:border-neutral-900"
                >
                  <Building2 className="h-3 w-3 text-violet-600" />
                  <span>{project.client_name || "Client"}</span>
                </Link>
                <span className="text-slate-400">→</span>
              </>
            )}

            <Link
              to={`/projects/${task.project_id}`}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-slate-700 hover:border-neutral-900"
            >
              <FolderGit2 className="h-3 w-3 text-sky-600" />
              <span>
                {project?.project_code || "Project"}: {task.project_name || project?.project_name}
              </span>
            </Link>

            {ancestors.map((anc) => (
              <React.Fragment key={anc.id}>
                <span className="text-slate-400">→</span>
                <button
                  type="button"
                  onClick={() => setViewingTaskId(anc.id)}
                  className="font-mono rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-slate-700 hover:border-neutral-900"
                >
                  {anc.task_code}
                </button>
              </React.Fragment>
            ))}

            <span className="text-slate-400">→</span>
            <span className="font-mono rounded-full border border-neutral-900 bg-neutral-900 px-2.5 py-0.5 text-white">
              {task.task_code}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-extrabold text-[#111827]">{task.title}</DialogTitle>
                <Badge variant="outline" className="text-[10px] rounded-full border-slate-300 bg-white">
                  {levelLabel} Overview
                </Badge>
              </div>
              {task.description && !editingNotes && (
                <DialogDescription className="text-xs text-[#6b7280] mt-0.5">
                  {task.description}
                </DialogDescription>
              )}
            </div>

            <div className="flex items-center gap-2 self-start shrink-0">
              <Badge variant={task.status === "Completed" ? "success" : "secondary"} className="text-xs">
                {task.status}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const parentId = task.parent_task_id;
                  pmsStore.deleteTask(task.id);
                  toast.success(`Deleted ${task.task_code}`);
                  if (parentId) {
                    setViewingTaskId(parentId);
                  } else {
                    onOpenChange(false);
                  }
                  notifyChange();
                }}
                className="h-8 px-2.5 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1"
                title={`Delete ${levelLabel}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* BOX 1: Overview, Schedule, Due Dates, Status, Priority & Assignee */}
          <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-violet-600" />
                <span>{levelLabel} Overview &amp; Schedule</span>
              </h4>
              <button
                type="button"
                onClick={() => setEditingNotes((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-[#111827]"
              >
                <Pencil className="h-3 w-3" />
                <span>{editingNotes ? "Cancel Edit" : "Edit Notes"}</span>
              </button>
            </div>

            {editingNotes && (
              <div className="space-y-2 pb-2 border-b border-slate-100">
                <Textarea
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={2}
                  placeholder={`Overview instructions or checklist for ${task.task_code}...`}
                  className="rounded-xl border-slate-300 text-xs"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveNotes}
                    className="h-7 px-3 rounded-lg bg-neutral-900 text-white text-xs font-bold"
                  >
                    Save Overview
                  </Button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Status</label>
                <select
                  value={task.status}
                  onChange={(e) =>
                    handleTaskUpdate(
                      { status: e.target.value as TaskStatus },
                      `Status updated to ${e.target.value}`
                    )
                  }
                  className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-bold text-[#111827]"
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Start Date</label>
                <Input
                  type="date"
                  value={task.start_date || task.created_at.slice(0, 10)}
                  onChange={(e) =>
                    handleTaskUpdate({ start_date: e.target.value }, "Start date updated")
                  }
                  className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Due Date</label>
                <Input
                  type="date"
                  value={task.due_date}
                  onChange={(e) =>
                    handleTaskUpdate({ due_date: e.target.value }, "Due date updated")
                  }
                  className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Priority</label>
                <select
                  value={task.priority}
                  onChange={(e) =>
                    handleTaskUpdate({ priority: e.target.value as ProjectPriority }, "Priority updated")
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
                <label className="text-[11px] font-bold text-slate-600">Assignee</label>
                <select
                  value={task.assigned_employee_id || ""}
                  onChange={(e) => {
                    const emp = employees.find((item) => item.id === e.target.value);
                    handleTaskUpdate(
                      {
                        assigned_employee_id: e.target.value,
                        assigned_employee_name: emp?.full_name || "Unassigned",
                      },
                      "Assignee updated"
                    );
                  }}
                  className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827]"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* BOX 2: Subtasks (Clean list; click any row / Overview to open its own full Overview) */}
          <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-violet-600" />
                <span>
                  Subtasks ({completedNestedSubtasks}/{totalNestedSubtasks} Completed)
                </span>
              </h4>
              <Button
                type="button"
                size="sm"
                onClick={() => setShowAddSubtaskForm((v) => !v)}
                className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Subtask</span>
              </Button>
            </div>

            {subtasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No subtasks yet.
              </div>
            ) : (
              <SubtaskTree
                subtasks={subtasks}
                fallbackStartDate={task.start_date || task.created_at.slice(0, 10)}
                onSelectTask={(subId) => setViewingTaskId(subId)}
                onChanged={notifyChange}
              />
            )}

            {showAddSubtaskForm && (
              <form
                onSubmit={handleAddSubtask}
                className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3 border-t border-slate-200 items-end"
              >
                <div className="sm:col-span-5 space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    New Subtask Title
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={subDueDate}
                    onChange={(e) => setSubDueDate(e.target.value)}
                    className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                  />
                </div>
                <div className="sm:col-span-3 flex items-center gap-1.5">
                  <Button
                    type="submit"
                    size="sm"
                    className="flex-1 h-9 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddSubtaskForm(false)}
                    className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* BOX 3: Documents Upload for this Task / Subtask / Sub-subtask */}
          <TaskDocumentsBox task={task} onChanged={notifyChange} />

          {/* BOX 4: Click-to-Expand Timeline for this Task / Subtask / Sub-subtask */}
          <ProjectTimeline
            key={`tl-${task.id}`}
            tasks={[task]}
            projectStartDate={task.start_date || project?.start_date}
            projectDueDate={task.due_date || project?.due_date}
            title="Task & Subtasks Timeline"
            onSelectTask={(subId) => setViewingTaskId(subId)}
            collapsible
            defaultExpanded={false}
          />

          {/* BOX 5: Read-Receipt Comments Box for this Task / Subtask / Sub-subtask */}
          <TaskCommentsBox
            taskId={task.id}
            assignedEmployeeId={task.assigned_employee_id}
            onUpdated={notifyChange}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
