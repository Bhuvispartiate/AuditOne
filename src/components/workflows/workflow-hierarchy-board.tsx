import React, { useState } from "react";
import {
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Columns3,
  FolderTree,
  GitBranch,
  Layers,
  ListChecks,
  MessageSquare,
  Plus,
  Trash2,
  User,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import {
  Employee,
  ProjectPriority,
  TaskStatus,
  TaskStatusConfig,
  WorkflowMilestoneTemplate,
  WorkflowProjectTaskTemplate,
  WorkflowTemplate,
} from "@/types";
import { toast } from "sonner";

interface WorkflowHierarchyBoardProps {
  workflow: WorkflowTemplate;
  milestones: WorkflowMilestoneTemplate[];
  employees: Employee[];
  taskStatuses: TaskStatusConfig[];
  isEmployee: boolean;
  onOpenTaskModal: (tplTask: WorkflowProjectTaskTemplate) => void;
}

type HierarchyViewMode = "board" | "tree";

export function WorkflowHierarchyBoard({
  workflow,
  milestones,
  employees,
  taskStatuses,
  isEmployee,
  onOpenTaskModal,
}: WorkflowHierarchyBoardProps) {
  const [viewMode, setViewMode] = useState<HierarchyViewMode>("board");

  // Add Milestone state
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneStart, setNewMilestoneStart] = useState("");
  const [newMilestoneEnd, setNewMilestoneEnd] = useState("");

  // Inline Add Stage state per Milestone
  const [addingStageForMs, setAddingStageForMs] = useState<string | null>(null);
  const [newStageName, setNewStageName] = useState("");

  // Inline Add Sub-Stage state per Stage
  const [addingSubStageForStage, setAddingSubStageForStage] = useState<{
    milestoneId: string;
    stageId: string;
  } | null>(null);
  const [newSubStageName, setNewSubStageName] = useState("");

  // Task Creation Dialog (inside Sub-Stage — matches full task creation)
  const [taskModalTarget, setTaskModalTarget] = useState<{
    milestoneId: string;
    milestoneTitle: string;
    stageId: string;
    stageName: string;
    subStageId: string;
    subStageName: string;
  } | null>(null);
  const [taskName, setTaskName] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<ProjectPriority>("Medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>(
    taskStatuses[0]?.label || "To Do"
  );
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskStartDay, setTaskStartDay] = useState(1);
  const [taskDurationDays, setTaskDurationDays] = useState(3);

  // Tree collapse tracking
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const toggleCollapse = (id: string) => {
    setCollapsedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) {
      toast.error("Enter a Milestone title (e.g. GSTR-1).");
      return;
    }
    pmsStore.addWorkflowMilestone(workflow.id, {
      title: newMilestoneTitle,
      start_date: newMilestoneStart || undefined,
      end_date: newMilestoneEnd || undefined,
    });
    setNewMilestoneTitle("");
    setNewMilestoneStart("");
    setNewMilestoneEnd("");
    setShowAddMilestone(false);
    toast.success("Milestone added.");
  };

  const handleCreateStage = (milestoneId: string) => {
    if (!newStageName.trim()) {
      toast.error("Enter a Stage name (e.g. Data Collection).");
      return;
    }
    pmsStore.addWorkflowStage(workflow.id, milestoneId, {
      stage_name: newStageName,
    });
    setNewStageName("");
    setAddingStageForMs(null);
    toast.success("Stage added.");
  };

  const handleCreateSubStage = (milestoneId: string, stageId: string) => {
    if (!newSubStageName.trim()) {
      toast.error("Enter a Sub Stage name.");
      return;
    }
    pmsStore.addWorkflowSubStage(workflow.id, milestoneId, stageId, {
      sub_stage_name: newSubStageName,
    });
    setNewSubStageName("");
    setAddingSubStageForStage(null);
    toast.success("Sub Stage added.");
  };

  const openCreateTaskDialog = (target: {
    milestoneId: string;
    milestoneTitle: string;
    stageId: string;
    stageName: string;
    subStageId: string;
    subStageName: string;
  }) => {
    setTaskModalTarget(target);
    setTaskName("");
    setTaskDesc("");
    setTaskPriority("Medium");
    setTaskStatus(taskStatuses[0]?.label || "To Do");
    setTaskAssigneeId("");
    setTaskStartDay(1);
    setTaskDurationDays(3);
  };

  const handleCreateTaskInSubStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskModalTarget || !taskName.trim()) {
      toast.error("Enter a Task Name.");
      return;
    }
    const assignee = employees.find((emp) => emp.id === taskAssigneeId);
    pmsStore.addWorkflowTaskInSubStage(
      workflow.id,
      taskModalTarget.milestoneId,
      taskModalTarget.stageId,
      taskModalTarget.subStageId,
      {
        task_name: taskName.trim(),
        description: taskDesc.trim() || `Deliverable under ${taskModalTarget.subStageName}`,
        start_day_offset: taskStartDay,
        duration_days: taskDurationDays,
        priority: taskPriority,
        status: taskStatus,
        assigned_employee_id: assignee?.id,
        assigned_employee_name: assignee?.full_name,
        subtasks: [],
        default_comments: [],
      }
    );
    toast.success(`Task "${taskName.trim()}" added.`);
    setTaskModalTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Goal Header + View Toggle */}
      <div className="rounded-[24px] border-[1.5px] border-slate-300 bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="rounded-full bg-[#111827] text-white text-[10px] font-bold">
              GOAL
            </Badge>
            <h3 className="text-base sm:text-lg font-extrabold text-[#111827]">
              {workflow.goal_title || workflow.workflow_name}
            </h3>
          </div>
          <p className="text-[11px] text-[#6b7280] mt-0.5">
            Structure: Goal → Milestone (Start &amp; End Dates) → Stage → Sub Stage → Task → Subtask
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-300 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "board"
                  ? "bg-white text-[#111827] shadow-2xs"
                  : "text-slate-500 hover:text-[#111827]"
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Board View</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("tree")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "tree"
                  ? "bg-white text-[#111827] shadow-2xs"
                  : "text-slate-500 hover:text-[#111827]"
              }`}
            >
              <FolderTree className="h-3.5 w-3.5" />
              <span>Tree View</span>
            </button>
          </div>

          {!isEmployee && (
            <Button
              type="button"
              size="sm"
              onClick={() => setShowAddMilestone((v) => !v)}
              className="h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Milestone</span>
            </Button>
          )}
        </div>
      </div>

      {/* Add Milestone Form */}
      {!isEmployee && showAddMilestone && (
        <Card className="rounded-[24px] border-[1.5px] border-violet-300 bg-violet-50/30">
          <CardContent className="p-4">
            <form
              onSubmit={handleCreateMilestone}
              className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
            >
              <div className="sm:col-span-5 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Milestone Name *
                </label>
                <Input
                  placeholder="e.g. GSTR-1, GSTR-2, GSTR-3"
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  className="h-9 rounded-xl bg-white border-slate-300 text-xs"
                  autoFocus
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={newMilestoneStart}
                  onChange={(e) => setNewMilestoneStart(e.target.value)}
                  className="h-9 rounded-xl bg-white border-slate-300 text-xs"
                />
              </div>
              <div className="sm:col-span-3 space-y-1">
                <label className="text-[11px] font-bold uppercase text-slate-600">
                  End Date
                </label>
                <Input
                  type="date"
                  value={newMilestoneEnd}
                  onChange={(e) => setNewMilestoneEnd(e.target.value)}
                  className="h-9 rounded-xl bg-white border-slate-300 text-xs"
                />
              </div>
              <div className="sm:col-span-1 flex gap-1.5">
                <Button
                  type="submit"
                  size="sm"
                  className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold"
                >
                  Add
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* BOARD VIEW (Side-by-Side Milestone Columns matching Handwritten Layout) */}
      {viewMode === "board" ? (
        <div className="overflow-x-auto pb-3">
          <div className="grid grid-flow-col auto-cols-[minmax(330px,1fr)] gap-4 items-start">
            {milestones.map((ms, mIdx) => (
              <div
                key={ms.id}
                className="rounded-[24px] border-[1.5px] border-slate-300 bg-white overflow-hidden shadow-2xs"
              >
                {/* Milestone Header */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/90 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-violet-700 block">
                        Milestone {mIdx + 1}
                      </span>
                      <h4 className="text-sm font-extrabold text-[#111827] truncate">
                        {ms.title}
                      </h4>
                    </div>
                    {!isEmployee && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => pmsStore.deleteWorkflowMilestone(workflow.id, ms.id)}
                        className="h-7 w-7 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                        title="Delete Milestone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Start Date & End Date row */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Start Date
                      </span>
                      {isEmployee ? (
                        <span className="text-xs font-semibold text-[#111827] block">
                          {ms.start_date || "—"}
                        </span>
                      ) : (
                        <Input
                          type="date"
                          value={ms.start_date || ""}
                          onChange={(e) =>
                            pmsStore.updateWorkflowMilestone(workflow.id, ms.id, {
                              start_date: e.target.value || undefined,
                            })
                          }
                          className="h-7 rounded-lg border-slate-300 bg-white px-2 text-[11px] font-semibold"
                        />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> End Date
                      </span>
                      {isEmployee ? (
                        <span className="text-xs font-semibold text-[#111827] block">
                          {ms.end_date || "—"}
                        </span>
                      ) : (
                        <Input
                          type="date"
                          value={ms.end_date || ""}
                          onChange={(e) =>
                            pmsStore.updateWorkflowMilestone(workflow.id, ms.id, {
                              end_date: e.target.value || undefined,
                            })
                          }
                          className="h-7 rounded-lg border-slate-300 bg-white px-2 text-[11px] font-semibold"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Stages inside Milestone */}
                <div className="p-3.5 space-y-3">
                  {ms.stages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
                      No stages in this milestone yet.
                    </div>
                  ) : (
                    ms.stages.map((stg, sIdx) => (
                      <div
                        key={stg.id}
                        className="rounded-2xl border border-slate-300 bg-slate-50/60 p-3 space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                            <span className="text-xs font-extrabold text-[#111827] truncate">
                              Stage {sIdx + 1}: {stg.stage_name}
                            </span>
                          </div>
                          {!isEmployee && (
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAddingSubStageForStage({
                                    milestoneId: ms.id,
                                    stageId: stg.id,
                                  });
                                  setNewSubStageName("");
                                }}
                                className="h-6 px-2 rounded-lg text-[10px] font-bold text-indigo-700 hover:bg-indigo-50 gap-1"
                              >
                                <Plus className="h-3 w-3" /> Sub Stage
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  pmsStore.deleteWorkflowStage(workflow.id, ms.id, stg.id)
                                }
                                className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>

                        {/* Inline Add Sub Stage */}
                        {!isEmployee &&
                          addingSubStageForStage?.milestoneId === ms.id &&
                          addingSubStageForStage?.stageId === stg.id && (
                            <div className="flex gap-1.5 pt-1">
                              <Input
                                placeholder="Sub Stage name..."
                                value={newSubStageName}
                                onChange={(e) => setNewSubStageName(e.target.value)}
                                className="h-8 rounded-lg bg-white border-slate-300 text-xs"
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleCreateSubStage(ms.id, stg.id)}
                                className="h-8 rounded-lg bg-neutral-900 text-white text-xs font-bold px-2.5"
                              >
                                Add
                              </Button>
                            </div>
                          )}

                        {/* Sub Stages inside Stage */}
                        <div className="space-y-2 pl-2 border-l-2 border-indigo-200">
                          {stg.sub_stages.length === 0 ? (
                            <p className="text-[11px] text-slate-400 italic pl-1">
                              No sub stages yet.
                            </p>
                          ) : (
                            stg.sub_stages.map((subStg, ssIdx) => (
                              <div
                                key={subStg.id}
                                className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-2"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-slate-800 truncate">
                                    Sub Stage {ssIdx + 1}: {subStg.sub_stage_name}
                                  </span>
                                  {!isEmployee && (
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                          openCreateTaskDialog({
                                            milestoneId: ms.id,
                                            milestoneTitle: ms.title,
                                            stageId: stg.id,
                                            stageName: stg.stage_name,
                                            subStageId: subStg.id,
                                            subStageName: subStg.sub_stage_name,
                                          })
                                        }
                                        className="h-6 px-2 rounded-lg border-slate-300 text-[10px] font-bold gap-1"
                                      >
                                        <Plus className="h-3 w-3" /> Task
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          pmsStore.deleteWorkflowSubStage(
                                            workflow.id,
                                            ms.id,
                                            stg.id,
                                            subStg.id
                                          )
                                        }
                                        className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-50"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>

                                {/* Tasks inside Sub Stage */}
                                {subStg.tasks.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 italic">
                                    No tasks yet.
                                  </p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {subStg.tasks.map((tplTask) => (
                                      <div
                                        key={tplTask.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-2 space-y-1.5"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <button
                                            type="button"
                                            onClick={() => onOpenTaskModal(tplTask)}
                                            className="text-left min-w-0 flex-1 group"
                                          >
                                            <div className="flex items-center gap-1.5">
                                              <CheckSquare className="h-3 w-3 text-violet-600 shrink-0" />
                                              <span className="text-xs font-bold text-[#111827] group-hover:text-violet-700 truncate">
                                                {tplTask.task_name}
                                              </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-500">
                                              <span className="inline-flex items-center gap-0.5">
                                                <User className="h-2.5 w-2.5" />
                                                {tplTask.assigned_employee_name || "Unassigned"}
                                              </span>
                                              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                                {tplTask.priority}
                                              </Badge>
                                              <span className="inline-flex items-center gap-0.5 text-indigo-700 font-semibold">
                                                <ListChecks className="h-2.5 w-2.5" />
                                                {tplTask.subtasks?.length || 0}
                                              </span>
                                              <span className="inline-flex items-center gap-0.5">
                                                <MessageSquare className="h-2.5 w-2.5" />
                                                {tplTask.default_comments?.length || 0}
                                              </span>
                                            </div>
                                          </button>

                                          {!isEmployee && (
                                            <div className="flex items-center gap-0.5 shrink-0">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => onOpenTaskModal(tplTask)}
                                                className="h-6 px-1.5 rounded-lg text-[10px] font-bold text-violet-700 hover:bg-violet-50"
                                                title="Add / Manage Subtasks"
                                              >
                                                + Subtask
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                  pmsStore.deleteWorkflowTaskFromHierarchy(
                                                    workflow.id,
                                                    tplTask.id
                                                  )
                                                }
                                                className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-50"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>

                                        {/* Subtasks nested preview */}
                                        {(tplTask.subtasks || []).length > 0 && (
                                          <div className="pl-3 border-l border-slate-300 space-y-1">
                                            {tplTask.subtasks.map((sub) => (
                                              <div
                                                key={sub.id}
                                                className="flex items-center justify-between gap-1 text-[10px] text-slate-700 bg-white rounded-md px-2 py-1 border border-slate-200/80"
                                              >
                                                <span className="truncate font-medium">
                                                  └ {sub.title}
                                                </span>
                                                <span className="text-slate-400 shrink-0">
                                                  {sub.assigned_employee_name || ""}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}

                  {/* Add Stage inside Milestone */}
                  {!isEmployee &&
                    (addingStageForMs === ms.id ? (
                      <div className="flex gap-1.5 pt-1">
                        <Input
                          placeholder="Stage name (e.g. Data Collection)..."
                          value={newStageName}
                          onChange={(e) => setNewStageName(e.target.value)}
                          className="h-8 rounded-xl bg-white border-slate-300 text-xs"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleCreateStage(ms.id)}
                          className="h-8 rounded-xl bg-neutral-900 text-white text-xs font-bold px-3"
                        >
                          Add
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAddingStageForMs(null)}
                          className="h-8 rounded-xl text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddingStageForMs(ms.id);
                          setNewStageName("");
                        }}
                        className="w-full h-8 rounded-xl border-dashed border-slate-300 text-xs font-bold text-slate-600 hover:text-[#111827] gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Stage</span>
                      </Button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* TREE VIEW (Exact Hierarchy Tree matching Image 1) */
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
          <CardContent className="p-5 font-sans text-xs space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-sm text-[#111827]">
              <GitBranch className="h-4 w-4 text-violet-600" />
              <span>Goal: {workflow.goal_title || workflow.workflow_name}</span>
            </div>

            <div className="pl-4 border-l-2 border-slate-300 space-y-3 ml-2">
              {milestones.map((ms, mIdx) => {
                const msCollapsed = Boolean(collapsedIds[ms.id]);
                return (
                  <div key={ms.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggleCollapse(ms.id)}
                        className="flex items-center gap-1.5 font-extrabold text-[#111827]"
                      >
                        {msCollapsed ? (
                          <ChevronRight className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                        <span>
                          Milestone {mIdx + 1}: {ms.title}
                        </span>
                        {(ms.start_date || ms.end_date) && (
                          <span className="text-[11px] font-medium text-slate-500 ml-2">
                            ({ms.start_date || "—"} → {ms.end_date || "—"})
                          </span>
                        )}
                      </button>
                      {!isEmployee && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setViewMode("board");
                            setAddingStageForMs(ms.id);
                          }}
                          className="h-6 px-2 text-[10px] font-bold text-violet-700"
                        >
                          + Stage
                        </Button>
                      )}
                    </div>

                    {!msCollapsed && (
                      <div className="pl-5 border-l-2 border-violet-200 space-y-2 ml-2">
                        {ms.stages.map((stg, sIdx) => (
                          <div key={stg.id} className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-indigo-50/50 border border-indigo-200/70 px-2.5 py-1.5">
                              <span className="font-bold text-indigo-950">
                                Stage {sIdx + 1}: {stg.stage_name}
                              </span>
                              {!isEmployee && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setViewMode("board");
                                    setAddingSubStageForStage({
                                      milestoneId: ms.id,
                                      stageId: stg.id,
                                    });
                                  }}
                                  className="h-6 px-2 text-[10px] font-bold text-indigo-700"
                                >
                                  + Sub Stage
                                </Button>
                              )}
                            </div>

                            <div className="pl-5 border-l-2 border-indigo-200 space-y-1.5 ml-2">
                              {stg.sub_stages.map((subStg, ssIdx) => (
                                <div key={subStg.id} className="space-y-1">
                                  <div className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-2.5 py-1.5">
                                    <span className="font-bold text-slate-800">
                                      Sub Stage {ssIdx + 1}: {subStg.sub_stage_name}
                                    </span>
                                    {!isEmployee && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          openCreateTaskDialog({
                                            milestoneId: ms.id,
                                            milestoneTitle: ms.title,
                                            stageId: stg.id,
                                            stageName: stg.stage_name,
                                            subStageId: subStg.id,
                                            subStageName: subStg.sub_stage_name,
                                          })
                                        }
                                        className="h-6 px-2 text-[10px] font-bold text-slate-700"
                                      >
                                        + Task
                                      </Button>
                                    )}
                                  </div>

                                  <div className="pl-5 border-l-2 border-slate-200 space-y-1 ml-2">
                                    {subStg.tasks.map((tplTask) => (
                                      <div key={tplTask.id} className="space-y-1">
                                        <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5">
                                          <button
                                            type="button"
                                            onClick={() => onOpenTaskModal(tplTask)}
                                            className="font-bold text-[#111827] hover:text-violet-700 text-left"
                                          >
                                            Task: {tplTask.task_name}
                                          </button>
                                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                            <span>
                                              {tplTask.assigned_employee_name || "Unassigned"}
                                            </span>
                                            <Badge variant="outline" className="text-[9px]">
                                              {tplTask.priority}
                                            </Badge>
                                          </div>
                                        </div>

                                        {(tplTask.subtasks || []).length > 0 && (
                                          <div className="pl-5 border-l border-slate-300 space-y-1 ml-2">
                                            {tplTask.subtasks.map((sub) => (
                                              <div
                                                key={sub.id}
                                                className="text-[11px] text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1"
                                              >
                                                Subtask: {sub.title}
                                                {sub.assigned_employee_name
                                                  ? ` (${sub.assigned_employee_name})`
                                                  : ""}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Creation Dialog inside Sub Stage */}
      <Dialog
        open={Boolean(taskModalTarget)}
        onOpenChange={(open) => !open && setTaskModalTarget(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-[#111827]">
              Create Workflow Task
            </DialogTitle>
            <DialogDescription className="text-xs">
              {taskModalTarget
                ? `${taskModalTarget.milestoneTitle} → ${taskModalTarget.stageName} → ${taskModalTarget.subStageName}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTaskInSubStage} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Task Name *</label>
              <Input
                placeholder="e.g. Comp. 1 — Sales Register Reconciliation"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="h-9 rounded-xl border-slate-300 text-xs"
                autoFocus
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description</label>
              <Textarea
                placeholder="Deliverable details and checklist..."
                value={taskDesc}
                onChange={(e) => setTaskDesc(e.target.value)}
                className="min-h-[70px] rounded-xl border-slate-300 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Assignee</label>
                <select
                  value={taskAssigneeId}
                  onChange={(e) => setTaskAssigneeId(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="">Unassigned</option>
                  {employees
                    .filter((emp) => emp.is_active)
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Priority</label>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as ProjectPriority)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Default Status</label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                >
                  {taskStatuses.map((st) => (
                    <option key={st.id} value={st.label}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Start Day</label>
                <Input
                  type="number"
                  min={1}
                  value={taskStartDay}
                  onChange={(e) => setTaskStartDay(Math.max(1, Number(e.target.value)))}
                  className="h-9 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Duration (Days)</label>
                <Input
                  type="number"
                  min={1}
                  value={taskDurationDays}
                  onChange={(e) => setTaskDurationDays(Math.max(1, Number(e.target.value)))}
                  className="h-9 rounded-xl border-slate-300 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTaskModalTarget(null)}
                className="rounded-xl text-xs font-bold"
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
    </div>
  );
}

