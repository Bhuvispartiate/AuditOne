import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  ListChecks,
  Plus,
  Trash2,
  Pencil,
  MessageSquare,
  Building2,
  FolderTree,
  Folder,
} from "lucide-react";
import { whatsappClient } from "@/lib/whatsapp-client";
import { WhatsAppChatDialog } from "@/components/whatsapp/whatsapp-chat-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { ProjectPriority, Task, TaskStatus } from "@/types";
import { toast } from "sonner";
import { ProjectTimeline } from "./project-timeline";
import { SubtaskTree } from "./subtask-tree";
import { TaskCommentsBox } from "./task-comments-box";
import { TaskDocumentsBox } from "./task-documents-box";
import { EmployeeMultiSelect } from "./employee-multi-select";

import { isEmployeeRestricted } from "@/lib/access";

interface TaskDetailDialogProps {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
  readOnly?: boolean;
}

export function TaskDetailDialog({
  taskId,
  open,
  onOpenChange,
  onUpdated,
  readOnly,
}: TaskDetailDialogProps) {
  const [, setTick] = useState(0);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(taskId);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [showAddSubtaskForm, setShowAddSubtaskForm] = useState(false);
  const [subTitle, setSubTitle] = useState("");
  const [subStartDate, setSubStartDate] = useState("");
  const [subDueDate, setSubDueDate] = useState("");
  const [subAssigneeId, setSubAssigneeId] = useState("");
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    if (open) {
      setViewingTaskId(taskId);
      setIsConfirmingDelete(false);
    }
  }, [taskId, open]);

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [viewingTaskId]);

  const activeId = viewingTaskId || taskId;
  const task = activeId ? pmsStore.getTaskById(activeId) : undefined;
  const project = task ? pmsStore.getProjectById(task.project_id) : undefined;
  const clients = pmsStore.getClients();
  const employees = pmsStore.getEmployees();
  const statusNames = pmsStore.getTaskStatusNames();
  const categories = pmsStore.getTaskCategories();
  const currentUser = pmsStore.getCurrentUser();
  const isReadOnly = Boolean(readOnly ?? isEmployeeRestricted(currentUser));

  // Resolve active category for this task
  const activeCategory = useMemo(() => {
    if (!task) return undefined;
    return categories.find(
      (c) =>
        c.id === task.category_id ||
        (task.category_name && c.name.toLowerCase() === task.category_name.toLowerCase())
    );
  }, [categories, task?.category_id, task?.category_name]);

  const availableSubCategories = useMemo(() => {
    return activeCategory?.sub_categories || [];
  }, [activeCategory]);

  const activeSubCategory = useMemo(() => {
    if (!task) return undefined;
    return availableSubCategories.find(
      (s) =>
        s.id === task.sub_category_id ||
        (task.sub_category_name && s.name.toLowerCase() === task.sub_category_name.toLowerCase())
    );
  }, [availableSubCategories, task?.sub_category_id, task?.sub_category_name]);

  // Resolve allotted client for this task
  const allottedClient = useMemo(() => {
    if (!task) return undefined;
    if (task.client_id) {
      const match = clients.find((c) => c.id === task.client_id);
      if (match) return match;
    }
    if (task.client_name) {
      const cleanName = task.client_name.trim().toLowerCase();
      const match = clients.find(
        (c) =>
          c.client_name.trim().toLowerCase() === cleanName ||
          c.nick_name?.trim().toLowerCase() === cleanName ||
          c.legal_name?.trim().toLowerCase() === cleanName
      );
      if (match) return match;
    }
    if (project?.client_id) {
      const match = clients.find((c) => c.id === project.client_id);
      if (match) return match;
    }
    if (project?.client_name) {
      const cleanName = project.client_name.trim().toLowerCase();
      const match = clients.find(
        (c) =>
          c.client_name.trim().toLowerCase() === cleanName ||
          c.nick_name?.trim().toLowerCase() === cleanName ||
          c.legal_name?.trim().toLowerCase() === cleanName
      );
      if (match) return match;
    }
    // Also match project_name prefix (e.g. "ROHTI — Client Delivery Project" or "ROHTI - Client Delivery Project")
    const pName = task.project_name || project?.project_name;
    if (pName) {
      const prefix = pName.split(/[-—–]/)[0].trim().toLowerCase();
      if (prefix) {
        const match = clients.find(
          (c) =>
            c.client_name?.trim().toLowerCase() === prefix ||
            c.nick_name?.trim().toLowerCase() === prefix ||
            c.legal_name?.trim().toLowerCase() === prefix ||
            prefix.includes(c.client_name?.trim().toLowerCase()) ||
            c.client_name?.trim().toLowerCase().includes(prefix)
        );
        if (match) return match;
      }
    }
    return undefined;
  }, [task?.client_id, task?.client_name, task?.project_name, project?.client_id, project?.client_name, project?.project_name, clients]);

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
  const directParent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
  const levelLabel =
    ancestors.length === 0 ? "Task" : ancestors.length === 1 ? "Subtask" : `Sub-subtask (L${ancestors.length})`;

  const notifyChange = () => {
    setTick((t) => t + 1);
    onUpdated?.();
  };

  const handleTaskUpdate = async (updates: Partial<typeof task>, message?: string) => {
    try {
      await pmsStore.updateTask(task.id, updates);
      if (message) toast.success(message);
      notifyChange();
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to update task."}`);
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTitle.trim()) {
      toast.error("Please enter a subtask title.");
      return;
    }
    const emp = employees.find((item) => item.id === subAssigneeId);
    try {
      await pmsStore.addSubtask(task.id, {
        title: subTitle.trim(),
        start_date: subStartDate || task.start_date,
        due_date: subDueDate || task.due_date,
        assigned_employee_id: emp?.id || task.assigned_employee_id,
        assigned_employee_name: emp?.full_name || task.assigned_employee_name,
      });
      setSubTitle("");
      setShowAddSubtaskForm(false);
      toast.success("Subtask saved to Supabase.");
      notifyChange();
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to add subtask."}`);
    }
  };

  const handleSendWhatsApp = () => {
    setIsWhatsAppOpen(true);
  };

  const handleExecuteDelete = async () => {
    if (!task) return;
    const parentId = task.parent_task_id;
    try {
      await pmsStore.deleteTask(task.id);
      toast.success(`Deleted ${task.task_code}`);
      setIsConfirmingDelete(false);
      if (parentId) {
        setViewingTaskId(parentId);
      } else {
        onOpenChange(false);
      }
      notifyChange();
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to delete task."}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6">
        <DialogHeader className="space-y-2 pb-4 border-b border-slate-300">
          {directParent && (
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setViewingTaskId(directParent.id)}
                className="inline-flex items-center gap-1 rounded-full border border-neutral-900 bg-white px-2.5 py-0.5 text-[11px] font-bold text-[#111827] hover:bg-neutral-900 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Back to {directParent.task_code}</span>
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold rounded-full border border-neutral-900 bg-neutral-900 px-2.5 py-0.5 text-white">
                  {task.task_code}
                </span>
                <DialogTitle className="text-xl font-extrabold text-[#111827]">{task.title}</DialogTitle>
              </div>

              {/* Category & Sub-Category Breadcrumb Pill */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-violet-50 text-violet-900 border border-violet-200 text-xs font-bold">
                  <FolderTree className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="text-violet-600 font-semibold">Category:</span>
                  <span className="font-extrabold">{task.category_name || activeCategory?.name || "General"}</span>
                </span>
                <span className="text-slate-400 font-bold text-xs">→</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-900 border border-purple-200 text-xs font-bold">
                  <Folder className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="text-purple-600 font-semibold">Sub-group:</span>
                  <span className="font-extrabold">{task.sub_category_name || activeSubCategory?.name || "General"}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start shrink-0 mr-4">
              <Badge variant={task.status === "Completed" ? "success" : "secondary"} className="text-xs">
                {task.status}
              </Badge>
              {isReadOnly && (
                <Badge variant="outline" className="text-[11px] bg-slate-50 text-slate-600 border-slate-300">
                  View Only
                </Badge>
              )}
              {!isReadOnly && (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSendWhatsApp}
                    className="h-8 px-2.5 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1"
                    title="Send WhatsApp Task Alert"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </Button>

                  {isConfirmingDelete ? (
                    <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 p-0.5 rounded-xl animate-in fade-in">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleExecuteDelete}
                        className="h-7 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold"
                      >
                        Confirm Delete?
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="h-7 px-2 rounded-lg text-slate-600 hover:text-slate-900 text-[11px] font-bold"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="h-8 px-2.5 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 text-xs font-bold gap-1"
                      title={`Delete ${levelLabel}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete</span>
                    </Button>
                  )}
                </>
              )}
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {/* 1. Allotted Client */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-emerald-600" />
                  <span>Allotted Client</span>
                </label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold text-[#111827] truncate">
                    {task.client_name || project?.client_name || "Unassigned"}
                  </div>
                ) : (
                  <select
                    value={allottedClient?.id || task.client_id || project?.client_id || ""}
                    onChange={async (e) => {
                      const newCId = e.target.value;
                      if (!newCId) return;
                      try {
                        await pmsStore.allotClientToTask(task.id, newCId);
                        toast.success("Client allotted to task successfully");
                        notifyChange();
                      } catch (err: any) {
                        toast.error(err?.message || "Failed to allot client");
                      }
                    }}
                    className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827]"
                  >
                    <option value="">-- Select Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.client_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 2. Category Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <FolderTree className="h-3 w-3 text-violet-600" />
                  <span>Category</span>
                </label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold text-[#111827] truncate">
                    {task.category_name || activeCategory?.name || "General"}
                  </div>
                ) : (
                  <select
                    value={activeCategory?.id || task.category_id || ""}
                    onChange={async (e) => {
                      const newCatId = e.target.value;
                      if (!newCatId) return;
                      const targetCat = categories.find((c) => c.id === newCatId);
                      if (!targetCat) return;
                      const firstSub = targetCat.sub_categories?.[0];
                      await handleTaskUpdate(
                        {
                          category_id: targetCat.id,
                          category_name: targetCat.name,
                          sub_category_id: firstSub?.id || "",
                          sub_category_name: firstSub?.name || "General",
                        },
                        `Category updated to ${targetCat.name}`
                      );
                    }}
                    className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827]"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 3. Sub-Category / Sub-group Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <Folder className="h-3 w-3 text-purple-600" />
                  <span>Sub-group / Sub-Category</span>
                </label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold text-[#111827] truncate">
                    {task.sub_category_name || activeSubCategory?.name || "General"}
                  </div>
                ) : (
                  <select
                    value={activeSubCategory?.id || task.sub_category_id || ""}
                    onChange={async (e) => {
                      const newSubId = e.target.value;
                      if (!newSubId) return;
                      const targetSub = availableSubCategories.find((s) => s.id === newSubId);
                      if (!targetSub) return;
                      await handleTaskUpdate(
                        {
                          sub_category_id: targetSub.id,
                          sub_category_name: targetSub.name,
                        },
                        `Sub-group updated to ${targetSub.name}`
                      );
                    }}
                    disabled={availableSubCategories.length === 0}
                    className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827] disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">-- Select Sub-group --</option>
                    {availableSubCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4. Status */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Status</label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-bold text-[#111827]">
                    {task.status}
                  </div>
                ) : (
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
                    {statusNames.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 5. Start Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Start Date</label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold text-slate-700">
                    {task.start_date || task.created_at.slice(0, 10)}
                  </div>
                ) : (
                  <Input
                    type="date"
                    value={task.start_date || task.created_at.slice(0, 10)}
                    onChange={(e) =>
                      handleTaskUpdate({ start_date: e.target.value }, "Start date updated")
                    }
                    className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                  />
                )}
              </div>

              {/* 6. Due Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Due Date</label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold text-slate-700">
                    {task.due_date || "—"}
                  </div>
                ) : (
                  <Input
                    type="date"
                    value={task.due_date}
                    onChange={(e) =>
                      handleTaskUpdate({ due_date: e.target.value }, "Due date updated")
                    }
                    className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs font-semibold"
                  />
                )}
              </div>

              {/* 7. Priority */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600">Priority</label>
                {isReadOnly ? (
                  <div className="w-full h-9 rounded-xl border border-slate-200 bg-slate-50 px-2.5 flex items-center text-xs font-semibold text-[#111827]">
                    {task.priority}
                  </div>
                ) : (
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
                )}
              </div>

              {/* 8. Assigned Team Members (spans full width on bottom row) */}
              <div className="space-y-1 col-span-full">
                <EmployeeMultiSelect
                  employees={employees}
                  selectedEmployeeIds={
                    task.assigned_employee_ids && task.assigned_employee_ids.length > 0
                      ? task.assigned_employee_ids
                      : (task.assigned_employee_id ? [task.assigned_employee_id] : [])
                  }
                  readOnly={isReadOnly}
                  onChange={(ids, emps) => {
                    handleTaskUpdate(
                      {
                        assigned_employee_id: ids[0] || "",
                        assigned_employee_name: emps.map((e) => e.full_name).join(", ") || "Unassigned",
                        assigned_employee_ids: ids,
                        assigned_employees: emps.map((e) => ({
                          id: e.id,
                          full_name: e.full_name,
                          designation: e.designation_name || e.employee_code,
                          email: e.email,
                        })),
                      },
                      "Assignees updated"
                    );
                  }}
                  label="Assigned Team Members"
                  placeholder="Search and assign team members..."
                />
              </div>
            </div>
          </div>

          {/* BOX 2: Subtasks (Clean list; click any row / Overview to open its own full Overview) */}
          <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <ListChecks className="h-4 w-4 text-violet-600" />
                <span>Subtasks</span>
              </h4>
              {!isReadOnly && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowAddSubtaskForm((v) => !v)}
                  className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Subtask</span>
                </Button>
              )}
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
                readOnly={isReadOnly}
              />
            )}

            {!isReadOnly && showAddSubtaskForm && (
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

          {/* BOX 3: Click-to-Expand Timeline for this Task / Subtask / Sub-subtask */}
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

          {/* BOX 4: Read-Receipt Comments Box for this Task / Subtask / Sub-subtask */}
          <TaskCommentsBox
            taskId={task.id}
            assignedEmployeeId={task.assigned_employee_id}
            onUpdated={notifyChange}
            readOnly={isReadOnly}
          />

          {/* BOX 5: Documents Upload for this Task / Subtask / Sub-subtask */}
          <TaskDocumentsBox task={task} onChanged={notifyChange} readOnly={isReadOnly} />
        </div>

        {task && (
          <WhatsAppChatDialog
            open={isWhatsAppOpen}
            onOpenChange={setIsWhatsAppOpen}
            contextType={task.parent_task_id ? "subtask" : "task"}
            task={task}
            client={allottedClient}
            project={project}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
