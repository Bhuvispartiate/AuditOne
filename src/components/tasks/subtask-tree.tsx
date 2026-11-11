import React, { useRef, useState } from "react";
import {
  CheckSquare,
  Download,
  FileText,
  GitBranchPlus,
  Paperclip,
  Plus,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pmsStore } from "@/lib/data/store";
import { Employee, FileObject, Task, TaskStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const ALL_STATUSES: TaskStatus[] = [
  "To Do",
  "In Progress",
  "Pending",
  "Under Review",
  "Blocked",
  "Completed",
];

export function countNestedSubtasks(subtasks: Task[] = []): { total: number; completed: number } {
  return subtasks.reduce(
    (acc, st) => {
      const childCounts = countNestedSubtasks(st.subtasks || []);
      return {
        total: acc.total + 1 + childCounts.total,
        completed: acc.completed + (st.status === "Completed" ? 1 : 0) + childCounts.completed,
      };
    },
    { total: 0, completed: 0 }
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SubtaskTreeProps {
  subtasks: Task[];
  employees: Employee[];
  fallbackStartDate?: string;
  onChanged?: () => void;
  depth?: number;
}

export function SubtaskTree({
  subtasks,
  employees,
  fallbackStartDate,
  onChanged,
  depth = 0,
}: SubtaskTreeProps) {
  if (!subtasks || subtasks.length === 0) return null;

  return (
    <div
      className={
        depth > 0
          ? "mt-2.5 ml-4 pl-3 border-l-2 border-slate-300 space-y-2"
          : "space-y-2.5"
      }
    >
      {subtasks.map((sub) => (
        <SubtaskNode
          key={sub.id}
          sub={sub}
          employees={employees}
          fallbackStartDate={fallbackStartDate}
          onChanged={onChanged}
          depth={depth}
        />
      ))}
    </div>
  );
}

interface SubtaskNodeProps {
  sub: Task;
  employees: Employee[];
  fallbackStartDate?: string;
  onChanged?: () => void;
  depth: number;
}

function SubtaskNode({
  sub,
  employees,
  fallbackStartDate,
  onChanged,
  depth,
}: SubtaskNodeProps) {
  const [showAddChild, setShowAddChild] = useState(false);
  const [childTitle, setChildTitle] = useState("");
  const [childStart, setChildStart] = useState(sub.start_date || fallbackStartDate || "");
  const [childDue, setChildDue] = useState(sub.due_date || "");
  const [showDocs, setShowDocs] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDone = sub.status === "Completed";
  const children = sub.subtasks || [];
  const docs = pmsStore.getDocumentsByEntity("task", sub.id);

  const triggerChanged = () => {
    onChanged?.();
  };

  const handleToggleDone = () => {
    const next: TaskStatus = isDone ? "To Do" : "Completed";
    pmsStore.updateTaskStatus(sub.id, next);
    toast.success(`Subtask ${sub.task_code} marked ${next}.`);
    triggerChanged();
  };

  const handleAddChildSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childTitle.trim()) {
      toast.error("Please enter a nested subtask title.");
      return;
    }
    pmsStore.addSubtask(sub.id, {
      title: childTitle.trim(),
      start_date: childStart || sub.start_date,
      due_date: childDue || sub.due_date,
      assigned_employee_id: sub.assigned_employee_id,
      assigned_employee_name: sub.assigned_employee_name,
    });
    setChildTitle("");
    setShowAddChild(false);
    toast.success(`Added nested subtask under ${sub.task_code}.`);
    triggerChanged();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const currentUser = pmsStore.getCurrentUser();

    for (const file of files) {
      let dataUrl: string | undefined;
      if (file.size <= 1.5 * 1024 * 1024) {
        dataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(typeof reader.result === "string" ? reader.result : undefined);
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }

      pmsStore.addDocument({
        bucket_name: "pms-documents",
        r2_object_key: `tasks/${sub.project_id}/${sub.task_code}/${file.name.replace(/\s+/g, "_")}`,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || "application/octet-stream",
        category: "Task",
        entity_type: "task",
        entity_id: sub.id,
        uploaded_by: currentUser?.id,
        uploaded_by_name: currentUser?.full_name || "System User",
        version_number: 1,
        download_url: dataUrl,
      });
    }

    setShowDocs(true);
    toast.success(`Uploaded ${files.length} document(s) to ${sub.task_code}.`);
    e.target.value = "";
    triggerChanged();
  };

  const handleDownloadDoc = (doc: FileObject) => {
    if (doc.download_url) {
      const a = document.createElement("a");
      a.href = doc.download_url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success(`Downloading ${doc.file_name}`);
    } else {
      toast.info(`${doc.file_name} metadata stored (${doc.r2_object_key}).`);
    }
  };

  return (
    <div
      className={`rounded-2xl border-[1.5px] p-3 transition-all ${
        isDone
          ? "border-emerald-300 bg-emerald-50/40"
          : depth > 0
            ? "border-slate-300 bg-white"
            : "border-slate-300 bg-slate-50/60"
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            onClick={handleToggleDone}
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
            <div className="flex flex-wrap items-center gap-1.5">
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
              {children.length > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-[#19196f] border border-indigo-200">
                  {children.length} nested
                </span>
              )}
              {docs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDocs((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
                >
                  <Paperclip className="h-2.5 w-2.5" />
                  {docs.length} doc{docs.length > 1 ? "s" : ""}
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {sub.assigned_employee_name || "Unassigned"}
              </span>
              <span>•</span>
              <span>
                {formatDate(sub.start_date || fallbackStartDate || sub.created_at)} →{" "}
                {formatDate(sub.due_date)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <Input
            type="date"
            value={sub.start_date || fallbackStartDate || ""}
            onChange={(e) => {
              pmsStore.updateTask(sub.id, { start_date: e.target.value });
              triggerChanged();
            }}
            className="h-8 w-32 rounded-xl border-slate-300 bg-white text-[11px]"
            title="Start Date"
          />
          <Input
            type="date"
            value={sub.due_date}
            onChange={(e) => {
              pmsStore.updateTask(sub.id, { due_date: e.target.value });
              triggerChanged();
            }}
            className="h-8 w-32 rounded-xl border-slate-300 bg-white text-[11px]"
            title="Due Date"
          />
          <select
            value={sub.status}
            onChange={(e) => {
              pmsStore.updateTask(sub.id, { status: e.target.value as TaskStatus });
              triggerChanged();
            }}
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
            size="sm"
            variant="outline"
            onClick={() => setShowAddChild((v) => !v)}
            className="h-8 px-2 rounded-xl border-slate-300 bg-white text-[11px] font-bold gap-1 hover:bg-slate-100"
            title="Add Sub-task inside this Subtask"
          >
            <GitBranchPlus className="h-3.5 w-3.5 text-violet-600" />
            <span>+ Sub-task</span>
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFilesSelected}
            className="hidden"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              if (docs.length > 0 && !showDocs) {
                setShowDocs(true);
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="h-8 px-2 rounded-xl border-slate-300 bg-white text-[11px] font-bold gap-1 hover:bg-slate-100"
            title="Upload / View Subtask Documents"
          >
            <Upload className="h-3.5 w-3.5 text-sky-600" />
            <span>Docs ({docs.length})</span>
          </Button>

          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => {
              pmsStore.deleteTask(sub.id);
              toast.success(`Deleted ${sub.task_code}`);
              triggerChanged();
            }}
            className="h-8 w-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shrink-0"
            title="Delete Subtask"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Subtask Documents Panel */}
      {(showDocs || docs.length > 0) && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Paperclip className="h-3 w-3 text-sky-600" />
              Documents for {sub.task_code} ({docs.length})
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              className="h-6 px-2 text-[11px] font-bold text-[#19196f] hover:bg-indigo-50 rounded-lg gap-1"
            >
              <Plus className="h-3 w-3" /> Upload File
            </Button>
          </div>

          {docs.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-3.5 w-3.5 text-[#19196f] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-800 truncate text-[11px]">
                        {doc.file_name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatFileSize(doc.file_size)} • {doc.uploaded_by_name || "User"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadDoc(doc)}
                      className="p-1 text-slate-500 hover:text-[#19196f] rounded"
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        pmsStore.deleteDocument(doc.id);
                        toast.success(`Removed ${doc.file_name}`);
                        triggerChanged();
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Remove Document"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Inline Add Nested Child Subtask Form */}
      {showAddChild && (
        <form
          onSubmit={handleAddChildSubtask}
          className="mt-2.5 pt-2.5 border-t border-dashed border-slate-300 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
        >
          <div className="sm:col-span-5">
            <Input
              placeholder={`Add nested subtask under ${sub.task_code}...`}
              value={childTitle}
              onChange={(e) => setChildTitle(e.target.value)}
              autoFocus
              className="h-8 rounded-xl border-slate-300 bg-white text-xs"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              type="date"
              value={childStart}
              onChange={(e) => setChildStart(e.target.value)}
              className="h-8 rounded-xl border-slate-300 bg-white text-[11px]"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              type="date"
              value={childDue}
              onChange={(e) => setChildDue(e.target.value)}
              className="h-8 rounded-xl border-slate-300 bg-white text-[11px]"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-1">
            <Button
              type="submit"
              size="sm"
              className="h-8 flex-1 rounded-xl bg-neutral-900 hover:bg-black text-white text-[11px] font-bold"
            >
              Add
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowAddChild(false)}
              className="h-8 w-8 rounded-xl"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </form>
      )}

      {/* Recursively render nested sub-subtasks */}
      {children.length > 0 && (
        <SubtaskTree
          subtasks={children}
          employees={employees}
          fallbackStartDate={sub.start_date || fallbackStartDate}
          onChanged={onChanged}
          depth={depth + 1}
        />
      )}
    </div>
  );
}

