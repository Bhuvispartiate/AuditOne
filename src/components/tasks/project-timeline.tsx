import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  ListChecks,
  Building2,
  FolderGit2,
} from "lucide-react";
import { Task } from "@/types";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { getStyleForColor, getTaskStatusVisual } from "@/lib/task-status-styles";
import { formatDate } from "@/lib/utils";

interface ProjectTimelineProps {
  tasks: Task[];
  projectStartDate?: string;
  projectDueDate?: string;
  onSelectTask?: (taskId: string) => void;
  title?: string;
  showClientFilter?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

function toMs(dateStr?: string): number {
  if (!dateStr) return Date.now();
  const parsed = new Date(dateStr).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

function flattenSubtasksTree(
  subtasks: Task[] = [],
  depth = 0
): Array<{ task: Task; depth: number }> {
  const result: Array<{ task: Task; depth: number }> = [];
  subtasks.forEach((st) => {
    result.push({ task: st, depth });
    if (st.subtasks && st.subtasks.length > 0) {
      result.push(...flattenSubtasksTree(st.subtasks, depth + 1));
    }
  });
  return result;
}

export function ProjectTimeline({
  tasks,
  projectStartDate,
  projectDueDate,
  onSelectTask,
  title = "Execution Timeline (Start Date -> Due Date)",
  showClientFilter = false,
  collapsible = false,
  defaultExpanded = true,
}: ProjectTimelineProps) {
  const [isSectionOpen, setIsSectionOpen] = useState(defaultExpanded);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [clientFilter, setClientFilter] = useState("ALL");

  const projects = pmsStore.getProjects();
  const clients = pmsStore.getClients();
  const configuredStatuses = pmsStore.getTaskStatuses();

  const visibleTasks = useMemo(() => {
    if (!showClientFilter || clientFilter === "ALL") return tasks;
    return tasks.filter((t) => {
      const proj = projects.find((p) => p.id === t.project_id);
      return proj?.client_id === clientFilter;
    });
  }, [tasks, projects, showClientFilter, clientFilter]);

  const toggleExpand = (taskId: string) => {
    setExpandedIds((prev) => ({ ...prev, [taskId]: prev[taskId] === false }));
  };

  const timelineRange = useMemo(() => {
    const timestamps: number[] = [];
    if (projectStartDate) timestamps.push(toMs(projectStartDate));
    if (projectDueDate) timestamps.push(toMs(projectDueDate));

    visibleTasks.forEach((t) => {
      timestamps.push(toMs(t.start_date || t.created_at?.slice(0, 10)));
      timestamps.push(toMs(t.due_date));
      flattenSubtasksTree(t.subtasks || []).forEach(({ task: st }) => {
        timestamps.push(toMs(st.start_date || t.start_date));
        timestamps.push(toMs(st.due_date || t.due_date));
      });
    });

    const minMs = timestamps.length > 0 ? Math.min(...timestamps) : Date.now();
    const maxRaw = timestamps.length > 0 ? Math.max(...timestamps) : minMs + 14 * 86400000;
    const maxMs = maxRaw <= minMs ? minMs + 7 * 86400000 : maxRaw;
    const spanMs = maxMs - minMs;

    const todayMs = Date.now();
    const todayPct =
      todayMs >= minMs && todayMs <= maxMs
        ? Math.max(0, Math.min(100, ((todayMs - minMs) / spanMs) * 100))
        : null;

    const midMs = minMs + spanMs / 2;

    return {
      minMs,
      maxMs,
      spanMs,
      todayPct,
      minLabel: new Date(minMs).toISOString().slice(0, 10),
      midLabel: new Date(midMs).toISOString().slice(0, 10),
      maxLabel: new Date(maxMs).toISOString().slice(0, 10),
    };
  }, [visibleTasks, projectStartDate, projectDueDate]);

  const computeBarStyle = (startStr?: string, dueStr?: string) => {
    const sMs = Math.max(timelineRange.minMs, toMs(startStr));
    const eMs = Math.max(sMs, Math.min(timelineRange.maxMs, toMs(dueStr)));
    const leftPct = ((sMs - timelineRange.minMs) / timelineRange.spanMs) * 100;
    const widthPct = Math.max(6, ((eMs - sMs) / timelineRange.spanMs) * 100);
    const days = Math.max(1, Math.round((toMs(dueStr) - toMs(startStr)) / 86400000) + 1);
    return {
      left: `${Math.min(94, leftPct)}%`,
      width: `${Math.min(100 - Math.min(94, leftPct), widthPct)}%`,
      days,
    };
  };

  if (collapsible && !isSectionOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsSectionOpen(true)}
        className="w-full rounded-[20px] border-[1.5px] border-slate-300 bg-white px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-neutral-900 transition-colors flex items-center justify-between gap-3 text-left"
      >
        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-violet-600" />
          <span>{title}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-[#111827]">
          <span>Show Timeline</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-[24px] border-[1.5px] border-slate-300 bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <h3 className="text-base font-extrabold text-[#111827] flex items-center gap-2">
            <Calendar className="h-4 w-4 text-violet-600" />
            <span>{title}</span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsSectionOpen(false)}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-[#111827]"
            >
              <span>Hide Timeline</span>
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          )}
          {showClientFilter && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name} ({c.client_code})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {visibleTasks.length === 0 ? (
        <div className="py-10 text-center text-xs text-slate-500">
          No tasks scheduled in this timeline yet.
        </div>
      ) : (
        <div className="space-y-3">
          {/* Date Axis Header */}
          <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div className="col-span-5">Client → Project → Task / Subtask</div>
            <div className="col-span-7 flex items-center justify-between">
              <span>{formatDate(timelineRange.minLabel)}</span>
              <span>{formatDate(timelineRange.midLabel)}</span>
              <span>{formatDate(timelineRange.maxLabel)}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {visibleTasks.map((task) => {
              const subtasks = task.subtasks || [];
              const isExpanded = expandedIds[task.id] !== false;
              const startStr = task.start_date || task.created_at.slice(0, 10);
              const bar = computeBarStyle(startStr, task.due_date);
              const parentProject = projects.find((p) => p.id === task.project_id);
              const parentClient = clients.find((c) => c.id === parentProject?.client_id);
              const clientDisplayName = parentClient?.client_name || parentProject?.client_name;

              return (
                <div
                  key={task.id}
                  className="rounded-2xl border-[1.5px] border-slate-300 bg-white overflow-hidden"
                >
                  {/* Parent Task Row */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center p-3 hover:bg-slate-50/70 transition-colors">
                    <div className="md:col-span-5 flex items-start gap-2 min-w-0">
                      {subtasks.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(task.id)}
                          className="mt-0.5 p-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-600 shrink-0"
                          title={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                      <div className="text-left min-w-0 flex-1">
                        {/* Client -> Project Hierarchy Strip */}
                        <div className="flex flex-wrap items-center gap-1 mb-1">
                          {clientDisplayName && parentProject?.client_id && (
                            <>
                              <Link
                                to={`/clients/${parentProject.client_id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-800 hover:border-violet-500"
                              >
                                <Building2 className="h-2.5 w-2.5" />
                                <span className="truncate max-w-[140px]">{clientDisplayName}</span>
                              </Link>
                              <span className="text-[10px] text-slate-400">→</span>
                            </>
                          )}
                          {parentProject && (
                            <Link
                              to={`/projects/${parentProject.id}`}
                              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 hover:border-neutral-900"
                            >
                              <FolderGit2 className="h-2.5 w-2.5 text-sky-600" />
                              <span className="truncate max-w-[140px]">{parentProject.project_code}</span>
                            </Link>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectTask?.(task.id)}
                          className="text-left w-full group"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded-md">
                              {task.task_code}
                            </span>
                            <Badge
                              variant={getTaskStatusVisual(task.status, configuredStatuses).badgeVariant}
                              className="text-[10px]"
                            >
                              {task.status}
                            </Badge>
                            {subtasks.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                                <ListChecks className="h-3 w-3 text-violet-600" />
                                {subtasks.filter((s) => s.status === "Completed").length}/{subtasks.length}
                              </span>
                            )}
                            {(task.comments_count || 0) > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-600">
                                <MessageSquare className="h-3 w-3 text-sky-600" />
                                {task.comments_count}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-extrabold text-[#111827] mt-1 truncate group-hover:text-violet-700">
                            {task.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>Start: {formatDate(startStr)}</span>
                            <span>•</span>
                            <span>Due: {formatDate(task.due_date)}</span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700">{task.assigned_employee_name || "Unassigned"}</span>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div
                      onClick={() => onSelectTask?.(task.id)}
                      className="md:col-span-7 relative h-8 rounded-xl bg-slate-100 border border-slate-300 overflow-hidden cursor-pointer"
                    >
                      {timelineRange.todayPct !== null && (
                        <div
                          className="absolute top-0 bottom-0 w-px bg-rose-500/70 z-10"
                          style={{ left: `${timelineRange.todayPct}%` }}
                          title="Today"
                        />
                      )}
                      <div
                        className={`absolute top-1.5 bottom-1.5 rounded-lg px-2 flex items-center justify-between text-[10px] font-bold shadow-xs ${
                          getTaskStatusVisual(task.status, configuredStatuses).barClass
                        }`}
                        style={{ left: bar.left, width: bar.width }}
                      >
                        <span className="truncate">{task.status}</span>
                        <span className="ml-1 shrink-0 opacity-90">{bar.days}d</span>
                      </div>
                    </div>
                  </div>

                  {/* Nested Subtasks Rows (supports multi-level nesting) */}
                  {isExpanded && subtasks.length > 0 && (
                    <div className="bg-slate-50/70 border-t border-slate-200 divide-y divide-slate-200">
                      {flattenSubtasksTree(subtasks).map(({ task: sub, depth }) => {
                        const subStart = sub.start_date || startStr;
                        const subDue = sub.due_date || task.due_date;
                        const subBar = computeBarStyle(subStart, subDue);

                        return (
                          <div
                            key={sub.id}
                            onClick={() => onSelectTask?.(sub.id)}
                            className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center pr-3 py-2 hover:bg-white cursor-pointer transition-colors"
                            style={{ paddingLeft: `${32 + depth * 18}px` }}
                          >
                            <div className="md:col-span-5 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-bold text-slate-600 bg-white border border-slate-300 px-1.5 py-0.5 rounded">
                                  {sub.task_code}
                                </span>
                                <Badge
                                  variant={getTaskStatusVisual(sub.status, configuredStatuses).badgeVariant}
                                  className="text-[9px]"
                                >
                                  {sub.status}
                                </Badge>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                                {sub.title}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                                <Clock className="h-2.5 w-2.5" />
                                <span>
                                  {formatDate(subStart)} → {formatDate(subDue)}
                                </span>
                              </div>
                            </div>

                            <div className="md:col-span-7 relative h-6 rounded-lg bg-white border border-slate-300 overflow-hidden">
                              {timelineRange.todayPct !== null && (
                                <div
                                  className="absolute top-0 bottom-0 w-px bg-rose-400/70 z-10"
                                  style={{ left: `${timelineRange.todayPct}%` }}
                                />
                              )}
                              <div
                                className={`absolute top-1 bottom-1 rounded-md px-2 flex items-center justify-between text-[9px] font-bold ${
                                  getTaskStatusVisual(sub.status, configuredStatuses).barClass
                                }`}
                                style={{ left: subBar.left, width: subBar.width }}
                              >
                                <span className="truncate">{sub.task_code}</span>
                                <span className="ml-1 shrink-0">{subBar.days}d</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

