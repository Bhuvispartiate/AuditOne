import React, { useState } from "react";
import {
  ArrowRight,
  CheckSquare,
  GitBranch,
  MessageSquare,
  Paperclip,
  Trash2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted } from "@/lib/access";
import { Task, TaskStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

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

interface SubtaskTreeProps {
  subtasks: Task[];
  fallbackStartDate?: string;
  onSelectTask?: (taskId: string) => void;
  onChanged?: () => void;
  depth?: number;
  readOnly?: boolean;
}

export function SubtaskTree({
  subtasks,
  fallbackStartDate,
  onSelectTask,
  onChanged,
  depth = 0,
  readOnly,
}: SubtaskTreeProps) {
  const isReadOnly = readOnly ?? isEmployeeRestricted(pmsStore.getCurrentUser());
  if (!subtasks || subtasks.length === 0) return null;

  return (
    <div
      className={
        depth > 0
          ? "mt-2 ml-4 pl-3 border-l-2 border-slate-300 space-y-2"
          : "space-y-2"
      }
    >
      {subtasks.map((sub) => (
        <SubtaskRow
          key={sub.id}
          sub={sub}
          fallbackStartDate={fallbackStartDate}
          onSelectTask={onSelectTask}
          onChanged={onChanged}
          depth={depth}
          readOnly={isReadOnly}
        />
      ))}
    </div>
  );
}

interface SubtaskRowProps {
  sub: Task;
  fallbackStartDate?: string;
  onSelectTask?: (taskId: string) => void;
  onChanged?: () => void;
  depth: number;
  readOnly: boolean;
}

function SubtaskRow({
  sub,
  fallbackStartDate,
  onSelectTask,
  onChanged,
  depth,
  readOnly,
}: SubtaskRowProps) {
  const [editingDates, setEditingDates] = useState(false);

  const isDone = pmsStore.isCompletedStatus(sub.status);
  const children = sub.subtasks || [];
  const docsCount = pmsStore.getDocumentsByEntity("task", sub.id).length;
  const commentsCount = sub.comments_count ?? pmsStore.getTaskComments(sub.id).length;
  const statusNames = pmsStore.getTaskStatusNames();

  const triggerChanged = () => {
    onChanged?.();
  };

  const handleToggleDone = () => {
    const next: TaskStatus = isDone
      ? pmsStore.getDefaultStatusName()
      : pmsStore.getCompletedStatusName();
    pmsStore.updateTaskStatus(sub.id, next);
    toast.success(`Subtask ${sub.task_code} marked ${next}.`);
    triggerChanged();
  };

  return (
    <div
      className={`rounded-2xl border-[1.5px] p-3 transition-all ${isDone
          ? "border-emerald-300 bg-emerald-50/40"
          : depth > 0
            ? "border-slate-300 bg-white"
            : "border-slate-300 bg-slate-50/60"
        }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              if (!readOnly) handleToggleDone();
            }}
            className={`mt-0.5 h-5 w-5 rounded-md border-[1.5px] flex items-center justify-center shrink-0 transition-colors ${isDone
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-slate-400 text-transparent"
              } ${readOnly ? "cursor-default opacity-85" : "hover:border-neutral-900"}`}
            title={readOnly ? sub.status : isDone ? "Mark To Do" : "Mark Completed"}
          >
            <CheckSquare className="h-3.5 w-3.5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] font-bold text-slate-700 bg-white border border-slate-300 px-1.5 py-0.5 rounded">
                {sub.task_code}
              </span>
              <button
                type="button"
                onClick={() => onSelectTask?.(sub.id)}
                className={`text-left text-xs font-bold hover:text-violet-700 transition-colors ${isDone ? "line-through text-slate-500" : "text-[#111827]"
                  }`}
              >
                {sub.title}
              </button>

              {children.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-[#19196f] border border-indigo-200">
                  <GitBranch className="h-2.5 w-2.5" />
                  {children.length}
                </span>
              )}
              {commentsCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  <MessageSquare className="h-2.5 w-2.5" />
                  {commentsCount}
                </span>
              )}
              {docsCount > 0 && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  <Paperclip className="h-2.5 w-2.5" />
                  {docsCount}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <User className="h-3 w-3" />
                {sub.assigned_employee_name || "Unassigned"}
              </span>
              <span>•</span>
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  if (!readOnly) setEditingDates((v) => !v);
                }}
                className={readOnly ? "font-medium cursor-default" : "hover:text-[#111827] hover:underline font-medium"}
                title={readOnly ? "Schedule dates" : "Click to adjust dates"}
              >
                {formatDate(sub.start_date || fallbackStartDate || sub.created_at)} →{" "}
                {formatDate(sub.due_date)}
              </button>
            </div>

            {!readOnly && editingDates && (
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Input
                  type="date"
                  value={sub.start_date || fallbackStartDate || ""}
                  onChange={(e) => {
                    pmsStore.updateTask(sub.id, { start_date: e.target.value });
                    triggerChanged();
                  }}
                  className="h-7 w-32 rounded-lg border-slate-300 bg-white text-[11px]"
                />
                <span className="text-slate-400 text-[11px]">→</span>
                <Input
                  type="date"
                  value={sub.due_date}
                  onChange={(e) => {
                    pmsStore.updateTask(sub.id, { due_date: e.target.value });
                    triggerChanged();
                  }}
                  className="h-7 w-32 rounded-lg border-slate-300 bg-white text-[11px]"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingDates(false)}
                  className="h-7 px-2 text-[11px] font-bold text-slate-600"
                >
                  Done
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {readOnly ? (
            <span className="h-8 inline-flex items-center rounded-xl border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-[#111827]">
              {sub.status}
            </span>
          ) : (
            <select
              value={sub.status}
              onChange={(e) => {
                pmsStore.updateTask(sub.id, { status: e.target.value as TaskStatus });
                triggerChanged();
              }}
              className="h-8 rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-bold text-[#111827]"
            >
              {statusNames.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          )}

          {onSelectTask && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSelectTask(sub.id)}
              className="h-8 px-2.5 rounded-xl border-slate-300 bg-white text-[11px] font-bold gap-1 hover:border-neutral-900"
              title="Open Subtask Overview (Dates, Sub-tasks, Timeline, Docs & Comments)"
            >
              <span>Overview</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}

          {!readOnly && (
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
          )}
        </div>
      </div>

      {children.length > 0 && (
        <SubtaskTree
          subtasks={children}
          fallbackStartDate={sub.start_date || fallbackStartDate}
          onSelectTask={onSelectTask}
          onChanged={onChanged}
          depth={depth + 1}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
