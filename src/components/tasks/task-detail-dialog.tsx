import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  CheckSquare,
  ListChecks,
  MessageSquare,
  Plus,
  Send,
  User,
  Building2,
  FolderGit2,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { ProjectPriority, TaskStatus } from "@/types";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { ProjectTimeline } from "./project-timeline";

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
  const [subTitle, setSubTitle] = useState("");
  const [subStartDate, setSubStartDate] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  const [subAssigneeId, setSubAssigneeId] = useState("");
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const task = taskId ? pmsStore.getTaskById(taskId) : undefined;
  const project = task ? pmsStore.getProjectById(task.project_id) : undefined;
  const comments = task ? pmsStore.getTaskComments(task.id) : [];
  const employees = pmsStore.getEmployees();

  useEffect(() => {
    if (task) {
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
            <DialogTitle>Task Details</DialogTitle>
            <DialogDescription>Select a task to view subtasks, timeline & comments.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.status === "Completed").length;

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
    toast.success("Subtask added.");
    notifyChange();
  };

  const handleToggleSubtaskDone = (subId: string, currentStatus: TaskStatus) => {
    const next: TaskStatus = currentStatus === "Completed" ? "To Do" : "Completed";
    pmsStore.updateTaskStatus(subId, next);
    toast.success(`Subtask marked ${next}.`);
    notifyChange();
  };

  const handleSubtaskFieldChange = (subId: string, updates: Partial<typeof task>) => {
    pmsStore.updateTask(subId, updates);
    notifyChange();
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    pmsStore.addTaskComment(task.id, commentText.trim());
    setCommentText("");
    toast.success("Comment posted.");
    notifyChange();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6">
        <DialogHeader className="space-y-2 pb-4 border-b border-slate-300">
          {/* Hierarchy Flow Breadcrumb: Client -> Project -> Task */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
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
              <span>{project?.project_code || "Project"}: {task.project_name || project?.project_name}</span>
            </Link>
            <span className="text-slate-400">→</span>
            <span className="font-mono rounded-full border border-neutral-900 bg-neutral-900 px-2.5 py-0.5 text-white">
              {task.task_code}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-extrabold text-[#111827]">{task.title}</DialogTitle>
              <DialogDescription className="text-xs text-[#6b7280] mt-0.5">
                {task.description || "Manage task dates, status, nested subtasks, timeline & comments."}
              </DialogDescription>
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
                  pmsStore.deleteTask(task.id);
                  toast.success(`Deleted task ${task.task_code}`);
                  onOpenChange(false);
                  notifyChange();
                }}
                className="h-8 px-2.5 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1"
                title="Delete Task"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Task</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* BOX 1: Status, Start Date, Due Date, Priority & Assignee */}
          <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-violet-600" />
              <span>Task Schedule, Status & Ownership</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Task Status</label>
                <select
                  value={task.status}
                  onChange={(e) =>
                    handleTaskUpdate({ status: e.target.value as TaskStatus }, `Status updated to ${e.target.value}`)
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

          {/* BOX 2: Subtasks */}
          <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-violet-600" />
                <span>Subtasks ({completedSubtasks}/{subtasks.length} Completed)</span>
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Break down this deliverable into actionable subtasks with dates & status
              </span>
            </div>

            {subtasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No subtasks yet. Add one below.
              </div>
            ) : (
              <div className="space-y-2">
                {subtasks.map((sub) => {
                  const isDone = sub.status === "Completed";
                  return (
                    <div
                      key={sub.id}
                      className={`rounded-2xl border-[1.5px] p-3 transition-all ${
                        isDone ? "border-emerald-300 bg-emerald-50/40" : "border-slate-300 bg-slate-50/60"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSubtaskDone(sub.id, sub.status)}
                            className={`mt-0.5 h-5 w-5 rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${
                              isDone
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "bg-white border-slate-400 text-transparent hover:border-neutral-900"
                            }`}
                            title={isDone ? "Mark To Do" : "Mark Completed"}
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-300 px-1.5 py-0.5 rounded">
                                {sub.task_code}
                              </span>
                              <span
                                className={`text-xs font-bold ${
                                  isDone ? "line-through text-slate-500" : "text-[#111827]"
                                }`}
                              >
                                {sub.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
                              <span className="inline-flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {sub.assigned_employee_name || "Unassigned"}
                              </span>
                              <span>•</span>
                              <span>
                                {formatDate(sub.start_date || task.start_date || task.created_at)} →{" "}
                                {formatDate(sub.due_date)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <Input
                            type="date"
                            value={sub.start_date || task.start_date || ""}
                            onChange={(e) =>
                              handleSubtaskFieldChange(sub.id, { start_date: e.target.value })
                            }
                            className="h-8 w-32 rounded-xl border-slate-300 bg-white text-[11px]"
                            title="Subtask Start Date"
                          />
                          <Input
                            type="date"
                            value={sub.due_date}
                            onChange={(e) =>
                              handleSubtaskFieldChange(sub.id, { due_date: e.target.value })
                            }
                            className="h-8 w-32 rounded-xl border-slate-300 bg-white text-[11px]"
                            title="Subtask Due Date"
                          />
                          <select
                            value={sub.status}
                            onChange={(e) =>
                              handleSubtaskFieldChange(sub.id, {
                                status: e.target.value as TaskStatus,
                              })
                            }
                            className="h-8 rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-bold text-[#111827]"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              pmsStore.deleteTask(sub.id);
                              toast.success("Subtask deleted.");
                              notifyChange();
                            }}
                            className="h-8 w-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shrink-0"
                            title="Delete Subtask"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Subtask Form */}
            <form
              onSubmit={handleAddSubtask}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-3 border-t border-slate-200 items-end"
            >
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  New Subtask Title
                </label>
                <Input
                  placeholder="e.g. Reconcile GSTR-2B purchase register..."
                  value={subTitle}
                  onChange={(e) => setSubTitle(e.target.value)}
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
              <div className="sm:col-span-3 flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Subtask</span>
                </Button>
              </div>
            </form>
          </div>

          {/* BOX 3: Task & Subtasks Timeline */}
          <ProjectTimeline
            tasks={[task]}
            projectStartDate={task.start_date || project?.start_date}
            projectDueDate={task.due_date || project?.due_date}
            title="Task & Subtasks Timeline"
          />

          {/* BOX 4: Comments for this Task */}
          <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-sky-600" />
              <span>Task Comments ({comments.length})</span>
            </h4>

            {comments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                No comments on this task yet. Add notes, review feedback, or client clarifications below.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-slate-300 bg-slate-50/80 p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-bold text-[#111827]">{c.employee_name}</span>
                      <span className="text-[10px] text-slate-500">{formatDateTime(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {c.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddComment} className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-200">
              <Textarea
                placeholder="Write a comment, status update, or review note for this task..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={2}
                className="flex-1 rounded-2xl border-[1.5px] border-slate-300 text-xs"
              />
              <Button
                type="submit"
                size="sm"
                className="sm:self-end h-10 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1.5 shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Post Comment</span>
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

