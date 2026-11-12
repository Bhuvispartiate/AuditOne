import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Calendar,
  Check,
  CheckSquare,
  Columns3,
  ExternalLink,
  Layers,
  ListChecks,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Users2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Client,
  Employee,
  Project,
  ProjectPriority,
  ServiceEngagement,
  Task,
  TaskStatus,
  TaskStatusConfig,
  WorkflowMilestoneTemplate,
  WorkflowProjectTaskTemplate,
  WorkflowStageTemplate,
  WorkflowSubtaskTemplate,
  WorkflowTemplate,
} from "@/types";
import { toast } from "sonner";

interface StageKanbanBoardProps {
  workflow: WorkflowTemplate;
  milestones: WorkflowMilestoneTemplate[];
  employees: Employee[];
  clients: Client[];
  engagements: ServiceEngagement[];
  projects: Project[];
  tasks: Task[];
  taskStatuses: TaskStatusConfig[];
  isEmployee: boolean;
}

export function StageKanbanBoard({
  workflow,
  milestones,
  employees,
  clients,
  engagements,
  projects,
  tasks,
  taskStatuses,
  isEmployee,
}: StageKanbanBoardProps) {
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string>("ALL");

  // Add Milestone modal/inline
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneStart, setNewMilestoneStart] = useState("");
  const [newMilestoneEnd, setNewMilestoneEnd] = useState("");

  // Edit Milestone inline
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editMsTitle, setEditMsTitle] = useState("");
  const [editMsStart, setEditMsStart] = useState("");
  const [editMsEnd, setEditMsEnd] = useState("");

  // Add Stage modal
  const [showAddStage, setShowAddStage] = useState(false);
  const [targetMilestoneId, setTargetMilestoneId] = useState(milestones[0]?.id || "");
  const [newStageName, setNewStageName] = useState("");

  // Edit Stage inline
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [editStageName, setEditStageName] = useState("");

  // Add Task modal (for a specific Stage)
  const [taskModalTarget, setTaskModalTarget] = useState<{
    milestone: WorkflowMilestoneTemplate;
    stage: WorkflowStageTemplate;
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

  // Clicked Task -> Subtasks Kanban View Modal
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubAssigneeId, setNewSubAssigneeId] = useState("");
  const [newSubPriority, setNewSubPriority] = useState<ProjectPriority>("Medium");
  const [newSubStatus, setNewSubStatus] = useState<TaskStatus>(
    taskStatuses[0]?.label || "To Do"
  );
  const [draggingSubtaskId, setDraggingSubtaskId] = useState<string | null>(null);

  // Stage Client Details Modal
  const [selectedStageClientsModal, setSelectedStageClientsModal] = useState<{
    milestone: WorkflowMilestoneTemplate;
    stage: WorkflowStageTemplate;
  } | null>(null);

  const serviceSubscribedClientIds = useMemo(() => {
    const ids = new Set<string>();
    const wfServiceLower = (workflow.service_name || "").trim().toLowerCase();
    engagements.forEach((e) => {
      if (e.status !== "Active") return;
      const matches =
        (workflow.service_id && e.service_id === workflow.service_id) ||
        (wfServiceLower && (e.service_name || "").trim().toLowerCase() === wfServiceLower);
      if (matches && e.client_id) ids.add(e.client_id);
    });
    projects.forEach((p) => {
      if (
        wfServiceLower &&
        (p.service_name || "").trim().toLowerCase() === wfServiceLower &&
        p.client_id
      ) {
        ids.add(p.client_id);
      }
    });
    return ids;
  }, [engagements, projects, workflow.service_id, workflow.service_name]);

  const getMilestoneClients = (ms: WorkflowMilestoneTemplate): Client[] => {
    const idSet =
      ms.allocated_client_ids !== undefined
        ? new Set(ms.allocated_client_ids)
        : serviceSubscribedClientIds;
    return clients.filter((c) => idSet.has(c.id));
  };

  // One Kanban column per Milestone (each Milestone holds its Stages & Tasks vertically)
  const visibleMilestones = useMemo(() => {
    return milestones
      .map((ms, mIdx) => ({ milestone: ms, milestoneIndex: mIdx }))
      .filter(({ milestone }) => selectedMilestoneId === "ALL" || milestone.id === selectedMilestoneId);
  }, [milestones, selectedMilestoneId]);

  // Resolve currently clicked Task for Subtasks Kanban modal
  const activeTaskContext = useMemo(() => {
    if (!activeTaskId) return null;
    for (const ms of milestones) {
      for (const stg of ms.stages || []) {
        for (const ss of stg.sub_stages || []) {
          const found = (ss.tasks || []).find((t) => t.id === activeTaskId);
          if (found) {
            return { milestone: ms, stage: stg, subStage: ss, task: found };
          }
        }
      }
    }
    return null;
  }, [activeTaskId, milestones]);

  const handleCreateMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) {
      toast.error("Enter a Milestone title.");
      return;
    }
    const created = pmsStore.addWorkflowMilestone(workflow.id, {
      title: newMilestoneTitle,
      start_date: newMilestoneStart || undefined,
      end_date: newMilestoneEnd || undefined,
    });
    if (created) {
      setTargetMilestoneId(created.id);
    }
    setNewMilestoneTitle("");
    setNewMilestoneStart("");
    setNewMilestoneEnd("");
    setShowAddMilestone(false);
    toast.success("Milestone added.");
  };

  const handleSaveMilestoneEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMilestoneId || !editMsTitle.trim()) {
      toast.error("Milestone title cannot be empty.");
      return;
    }
    pmsStore.updateWorkflowMilestone(workflow.id, editingMilestoneId, {
      title: editMsTitle.trim(),
      start_date: editMsStart || undefined,
      end_date: editMsEnd || undefined,
    });
    setEditingMilestoneId(null);
    toast.success("Milestone updated.");
  };

  const handleSaveStageEdit = (milestoneId: string, stageId: string) => {
    if (!editStageName.trim()) {
      toast.error("Stage name cannot be empty.");
      return;
    }
    pmsStore.updateWorkflowStage(workflow.id, milestoneId, stageId, {
      stage_name: editStageName.trim(),
    });
    setEditingStageId(null);
    toast.success("Stage renamed.");
  };

  const handleCreateStage = (e: React.FormEvent) => {
    e.preventDefault();
    const msId = targetMilestoneId || milestones[0]?.id;
    if (!msId || !newStageName.trim()) {
      toast.error("Select a Milestone and enter a Stage name.");
      return;
    }
    pmsStore.addWorkflowStage(workflow.id, msId, { stage_name: newStageName });
    setNewStageName("");
    setShowAddStage(false);
    toast.success("Stage added to Kanban.");
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskModalTarget || !taskName.trim()) {
      toast.error("Enter a Task Name.");
      return;
    }
    const { milestone, stage } = taskModalTarget;
    let subStageId: string | undefined = stage.sub_stages?.[0]?.id;
    if (!subStageId) {
      const createdSubStage = pmsStore.addWorkflowSubStage(
        workflow.id,
        milestone.id,
        stage.id,
        { sub_stage_name: "General" }
      );
      subStageId = createdSubStage?.id;
    }
    if (!subStageId) return;

    const assignee = employees.find((emp) => emp.id === taskAssigneeId);
    pmsStore.addWorkflowTaskInSubStage(
      workflow.id,
      milestone.id,
      stage.id,
      subStageId,
      {
        task_name: taskName.trim(),
        description: taskDesc.trim() || `Deliverable under ${stage.stage_name}`,
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
    toast.success(`Task "${taskName.trim()}" added to ${stage.stage_name}.`);
    setTaskModalTarget(null);
  };

  const handleAddSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTaskContext || !newSubTitle.trim()) {
      toast.error("Enter a Subtask title.");
      return;
    }
    const assignee = employees.find((emp) => emp.id === newSubAssigneeId);
    pmsStore.addWorkflowSubtaskInHierarchy(workflow.id, activeTaskContext.task.id, {
      title: newSubTitle.trim(),
      start_day_offset: activeTaskContext.task.start_day_offset || 1,
      duration_days: 2,
      priority: newSubPriority,
      status: newSubStatus,
      assigned_employee_id: assignee?.id,
      assigned_employee_name: assignee?.full_name,
    });
    setNewSubTitle("");
    toast.success("Subtask added.");
  };

  const updateSubtaskStatus = (taskId: string, subtaskId: string, nextStatus: TaskStatus) => {
    const nextMilestones = milestones.map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks || []).map((sub) =>
                    sub.id === subtaskId ? { ...sub, status: nextStatus } : sub
                  ),
                }
              : t
          ),
        })),
      })),
    }));
    pmsStore.updateWorkflow(workflow.id, { milestones: nextMilestones });
  };

  const getSubtaskStatus = (sub: WorkflowSubtaskTemplate): TaskStatus => {
    const validLabels = new Set(taskStatuses.map((s) => s.label));
    if (sub.status && validLabels.has(sub.status)) return sub.status;
    return taskStatuses[0]?.label || "To Do";
  };

  return (
    <div className="space-y-4">
      {/* Milestone Filter + Add Stage / Milestone Controls */}
      <div className="rounded-[24px] border-[1.5px] border-slate-300 bg-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedMilestoneId("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              selectedMilestoneId === "ALL"
                ? "bg-neutral-900 text-white border-neutral-900"
                : "bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100"
            }`}
          >
            All Milestones ({milestones.length})
          </button>
          {milestones.map((ms, idx) => (
            <div key={ms.id} className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedMilestoneId(ms.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  selectedMilestoneId === ms.id
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                }`}
              >
                M{idx + 1}: {ms.title}
              </button>
              {!isEmployee && selectedMilestoneId === ms.id && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMilestoneId(ms.id);
                      setEditMsTitle(ms.title);
                      setEditMsStart(ms.start_date || "");
                      setEditMsEnd(ms.end_date || "");
                    }}
                    className="h-7 w-7 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 inline-flex items-center justify-center text-slate-600"
                    title="Edit Milestone"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      pmsStore.deleteWorkflowMilestone(workflow.id, ms.id);
                      setSelectedMilestoneId("ALL");
                      toast.success("Milestone deleted.");
                    }}
                    className="h-7 w-7 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 inline-flex items-center justify-center text-rose-600"
                    title="Delete Milestone"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {!isEmployee && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddMilestone((v) => !v)}
              className="h-9 rounded-xl border-slate-300 text-xs font-bold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Milestone</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setTargetMilestoneId(
                  selectedMilestoneId !== "ALL"
                    ? selectedMilestoneId
                    : milestones[0]?.id || ""
                );
                setShowAddStage((v) => !v);
              }}
              className="h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Stage</span>
            </Button>
          </div>
        )}
      </div>

      {/* Inline Add Milestone Form */}
      {!isEmployee && showAddMilestone && (
        <div className="rounded-[24px] border-[1.5px] border-violet-300 bg-violet-50/40 p-4">
          <form
            onSubmit={handleCreateMilestone}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Milestone Title *
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
            <div className="sm:col-span-1">
              <Button
                type="submit"
                size="sm"
                className="w-full h-9 rounded-xl bg-neutral-900 text-white text-xs font-bold"
              >
                Add
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Add Stage Form */}
      {!isEmployee && showAddStage && (
        <div className="rounded-[24px] border-[1.5px] border-indigo-300 bg-indigo-50/40 p-4">
          <form
            onSubmit={handleCreateStage}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Milestone *
              </label>
              <select
                value={targetMilestoneId || milestones[0]?.id || ""}
                onChange={(e) => setTargetMilestoneId(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
              >
                {milestones.map((ms, idx) => (
                  <option key={ms.id} value={ms.id}>
                    Milestone {idx + 1}: {ms.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-6 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Stage Name *
              </label>
              <Input
                placeholder="e.g. Data Collection, Data Verification, Data Filing"
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                className="h-9 rounded-xl bg-white border-slate-300 text-xs"
                autoFocus
              />
            </div>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                size="sm"
                className="w-full h-9 rounded-xl bg-neutral-900 text-white text-xs font-bold"
              >
                Add Stage
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Inline Edit Milestone Form */}
      {!isEmployee && editingMilestoneId && (
        <div className="rounded-[24px] border-[1.5px] border-indigo-300 bg-indigo-50/40 p-4">
          <form
            onSubmit={handleSaveMilestoneEdit}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-5 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                Rename Milestone *
              </label>
              <Input
                value={editMsTitle}
                onChange={(e) => setEditMsTitle(e.target.value)}
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
                value={editMsStart}
                onChange={(e) => setEditMsStart(e.target.value)}
                className="h-9 rounded-xl bg-white border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-3 space-y-1">
              <label className="text-[11px] font-bold uppercase text-slate-600">
                End Date
              </label>
              <Input
                type="date"
                value={editMsEnd}
                onChange={(e) => setEditMsEnd(e.target.value)}
                className="h-9 rounded-xl bg-white border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-1 flex items-center gap-1">
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                title="Save Milestone"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => setEditingMilestoneId(null)}
                className="h-9 w-9 rounded-xl border-slate-300"
                title="Cancel"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* MAIN KANBAN BOARD: ONE COLUMN PER MILESTONE (EACH MILESTONE CONTAINS ITS STAGES & TASKS) */}
      {visibleMilestones.length === 0 ? (
        <div className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
          <Columns3 className="h-8 w-8 mx-auto text-slate-400" />
          <p className="text-sm font-extrabold text-[#111827]">No Milestones Created Yet</p>
          <p className="text-xs text-[#6b7280]">
            Click &quot;Add Milestone&quot; above to create your own custom Milestone column, then add Stages and Tasks inside it.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="grid grid-flow-col auto-cols-[minmax(330px,380px)] gap-4 items-start">
            {visibleMilestones.map(({ milestone: ms, milestoneIndex }) => {
              const msClients = getMilestoneClients(ms);
              const stages = ms.stages || [];
              const totalMsTasks = stages.reduce(
                (acc, stg) =>
                  acc +
                  (stg.sub_stages || []).reduce(
                    (sAcc, ss) => sAcc + (ss.tasks || []).length,
                    0
                  ),
                0
              );

              return (
                <div
                  key={ms.id}
                  className="rounded-[24px] border-[1.5px] border-slate-300 bg-slate-50/70 flex flex-col max-h-[78vh]"
                >
                  {/* Milestone Column Header (1 Column = 1 Milestone) */}
                  <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-[11px] font-extrabold text-violet-800 truncate">
                        M{milestoneIndex + 1}: {ms.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                          {stages.length} Stage{stages.length === 1 ? "" : "s"} · {totalMsTasks} Task{totalMsTasks === 1 ? "" : "s"}
                        </Badge>
                        {!isEmployee && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingMilestoneId(ms.id);
                                setEditMsTitle(ms.title);
                                setEditMsStart(ms.start_date || "");
                                setEditMsEnd(ms.end_date || "");
                              }}
                              className="h-6 w-6 rounded-lg text-slate-500 hover:bg-slate-100"
                              title="Edit Milestone"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                pmsStore.deleteWorkflowMilestone(workflow.id, ms.id);
                                if (selectedMilestoneId === ms.id) {
                                  setSelectedMilestoneId("ALL");
                                }
                                toast.success("Milestone deleted.");
                              }}
                              className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-50"
                              title="Delete Milestone"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      {(ms.start_date || ms.end_date) ? (
                        <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {ms.start_date || "—"} → {ms.end_date || "—"}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">No dates set</span>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedStageClientsModal({
                            milestone: ms,
                            stage: stages[0] || {
                              id: `ms-clients-${ms.id}`,
                              stage_name: ms.title,
                              sequence_number: 1,
                              sub_stages: [],
                            },
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-colors"
                      >
                        <Users2 className="h-3 w-3" />
                        <span>{msClients.length} Clients</span>
                      </button>
                    </div>
                  </div>

                  {/* Stages stacked inside THIS Milestone column */}
                  <div className="p-3 space-y-3 overflow-y-auto flex-1">
                    {stages.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5 text-center text-[11px] text-slate-400">
                        No stages in this milestone yet.
                      </div>
                    ) : (
                      stages.map((stage, sIdx) => {
                        const stageTasks: WorkflowProjectTaskTemplate[] = [];
                        (stage.sub_stages || []).forEach((ss) => {
                          (ss.tasks || []).forEach((t) => stageTasks.push(t));
                        });

                        return (
                          <div
                            key={stage.id}
                            className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-3 space-y-2.5"
                          >
                            {/* Stage Header inside Milestone Column */}
                            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                              {!isEmployee && editingStageId === stage.id ? (
                                <div className="flex items-center gap-1.5 w-full">
                                  <Input
                                    value={editStageName}
                                    onChange={(e) => setEditStageName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveStageEdit(ms.id, stage.id);
                                      } else if (e.key === "Escape") {
                                        setEditingStageId(null);
                                      }
                                    }}
                                    className="h-7 rounded-lg text-xs bg-white border-slate-300"
                                    autoFocus
                                  />
                                  <Button
                                    type="button"
                                    size="icon"
                                    onClick={() => handleSaveStageEdit(ms.id, stage.id)}
                                    className="h-7 w-7 rounded-lg bg-neutral-900 text-white shrink-0"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => setEditingStageId(null)}
                                    className="h-7 w-7 rounded-lg border-slate-300 shrink-0"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <h3 className="text-xs font-extrabold text-[#111827] truncate flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                    <span>
                                      Stage {sIdx + 1}: {stage.stage_name}
                                    </span>
                                  </h3>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Badge variant="outline" className="text-[10px] font-bold">
                                      {stageTasks.length} Task{stageTasks.length === 1 ? "" : "s"}
                                    </Badge>
                                    {!isEmployee && (
                                      <>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => {
                                            setEditingStageId(stage.id);
                                            setEditStageName(stage.stage_name);
                                          }}
                                          className="h-6 w-6 rounded-lg text-slate-500 hover:bg-slate-100"
                                          title="Rename Stage"
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            pmsStore.deleteWorkflowStage(
                                              workflow.id,
                                              ms.id,
                                              stage.id
                                            )
                                          }
                                          className="h-6 w-6 rounded-lg text-rose-500 hover:bg-rose-50"
                                          title="Delete Stage"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>

                            {/* Task Cards inside this Stage */}
                            {stageTasks.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-3 text-center text-[11px] text-slate-400">
                                No tasks in this stage yet.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {stageTasks.map((task) => {
                                  const subCount = task.subtasks?.length || 0;
                                  return (
                                    <div
                                      key={task.id}
                                      onClick={() => setActiveTaskId(task.id)}
                                      className="rounded-xl border border-slate-300 bg-slate-50/60 hover:bg-white p-3 space-y-2 cursor-pointer hover:border-violet-500 hover:shadow-xs transition-all group"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="flex items-center gap-1.5">
                                            <CheckSquare className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                                            <h4 className="text-xs font-extrabold text-[#111827] group-hover:text-violet-700 leading-snug">
                                              {task.task_name}
                                            </h4>
                                          </div>
                                          {task.description && (
                                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                              {task.description}
                                            </p>
                                          )}
                                        </div>
                                        {!isEmployee && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              pmsStore.deleteWorkflowTaskFromHierarchy(
                                                workflow.id,
                                                task.id
                                              );
                                            }}
                                            className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 shrink-0"
                                            title="Delete Task"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200/70 text-[10px]">
                                        <div className="flex items-center gap-1.5">
                                          <Badge variant="outline" className="text-[10px] font-bold bg-white">
                                            {task.priority}
                                          </Badge>
                                          <span className="inline-flex items-center gap-1 text-slate-600 font-medium">
                                            <User className="h-3 w-3 text-slate-400" />
                                            {task.assigned_employee_name || "Unassigned"}
                                          </span>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 font-bold text-violet-800">
                                          <ListChecks className="h-3 w-3" />
                                          {subCount} Subtask{subCount === 1 ? "" : "s"} →
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add Task inside Stage */}
                            {!isEmployee && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setTaskModalTarget({
                                    milestone: ms,
                                    stage,
                                  });
                                  setTaskName("");
                                  setTaskDesc("");
                                  setTaskPriority("Medium");
                                  setTaskStatus(taskStatuses[0]?.label || "To Do");
                                  setTaskAssigneeId("");
                                  setTaskStartDay(1);
                                  setTaskDurationDays(3);
                                }}
                                className="w-full h-8 rounded-xl border-dashed border-slate-300 bg-white text-[11px] font-bold text-slate-700 hover:text-[#111827] gap-1"
                              >
                                <Plus className="h-3 w-3" />
                                <span>Add Task</span>
                              </Button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Add Stage Footer inside THIS Milestone Column */}
                  {!isEmployee && (
                    <div className="p-3 pt-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setTargetMilestoneId(ms.id);
                          setNewStageName("");
                          setShowAddStage(true);
                        }}
                        className="w-full h-9 rounded-xl border-dashed border-slate-300 bg-white text-xs font-bold text-slate-700 hover:text-[#111827] gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Stage to M{milestoneIndex + 1}</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CLICKED TASK -> SUBTASKS KANBAN VIEW MODAL */}
      <Dialog
        open={Boolean(activeTaskContext)}
        onOpenChange={(open) => !open && setActiveTaskId(null)}
      >
        <DialogContent className="sm:max-w-5xl rounded-[24px] max-h-[88vh] overflow-y-auto">
          {activeTaskContext && (
            <>
              <DialogHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-6">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge className="rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold">
                        {activeTaskContext.milestone.title}
                      </Badge>
                      <Badge variant="outline" className="rounded-full text-[10px] font-bold">
                        {activeTaskContext.stage.stage_name}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                        Subtasks Kanban View
                      </Badge>
                    </div>
                    <DialogTitle className="text-lg font-extrabold text-[#111827]">
                      {activeTaskContext.task.task_name} — Subtasks
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-0.5">
                      {activeTaskContext.task.description ||
                        "Click or drag subtask cards across Kanban status columns."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Admin: Add Subtask Inline Form */}
              {!isEmployee && (
                <form
                  onSubmit={handleAddSubtask}
                  className="rounded-2xl border border-slate-300 bg-slate-50/80 p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
                >
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      New Subtask Name *
                    </label>
                    <Input
                      placeholder="e.g. Verify GSTR-1 B2B Invoices"
                      value={newSubTitle}
                      onChange={(e) => setNewSubTitle(e.target.value)}
                      className="h-9 rounded-xl bg-white border-slate-300 text-xs"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Assignee
                    </label>
                    <select
                      value={newSubAssigneeId}
                      onChange={(e) => setNewSubAssigneeId(e.target.value)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      <option value="">Unassigned</option>
                      {employees
                        .filter((e) => e.is_active)
                        .map((e) => (
                          <option key={e.id} value={e.id}>
                            {e.full_name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-slate-500">
                      Column Status
                    </label>
                    <select
                      value={newSubStatus}
                      onChange={(e) => setNewSubStatus(e.target.value as TaskStatus)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      {taskStatuses.map((st) => (
                        <option key={st.id} value={st.label}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Subtask
                    </Button>
                  </div>
                </form>
              )}

              {/* Subtasks Kanban Columns */}
              <div className="overflow-x-auto pb-2">
                <div className="grid grid-flow-col auto-cols-[minmax(220px,1fr)] gap-3 items-start">
                  {taskStatuses.map((statusCol) => {
                    const colSubs = (activeTaskContext.task.subtasks || []).filter(
                      (sub) => getSubtaskStatus(sub) === statusCol.label
                    );
                    return (
                      <div
                        key={statusCol.id}
                        onDragOver={(e) => {
                          if (!isEmployee) e.preventDefault();
                        }}
                        onDrop={() => {
                          if (isEmployee || !draggingSubtaskId) return;
                          updateSubtaskStatus(
                            activeTaskContext.task.id,
                            draggingSubtaskId,
                            statusCol.label
                          );
                          setDraggingSubtaskId(null);
                        }}
                        className="rounded-2xl border-[1.5px] border-slate-300 bg-slate-50/80 p-3 min-h-[220px] space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                          <span className="text-xs font-extrabold text-[#111827]">
                            {statusCol.label}
                          </span>
                          <Badge variant="secondary" className="rounded-full text-[10px]">
                            {colSubs.length}
                          </Badge>
                        </div>

                        {colSubs.length === 0 ? (
                          <p className="text-[11px] text-slate-400 text-center py-6">
                            No subtasks
                          </p>
                        ) : (
                          colSubs.map((sub) => (
                            <div
                              key={sub.id}
                              draggable={!isEmployee}
                              onDragStart={() => setDraggingSubtaskId(sub.id)}
                              className="rounded-xl border border-slate-300 bg-white p-3 space-y-2 shadow-2xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="text-xs font-bold text-[#111827] leading-snug">
                                  {sub.title}
                                </span>
                                {!isEmployee && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      pmsStore.deleteWorkflowSubtaskFromHierarchy(
                                        workflow.id,
                                        activeTaskContext.task.id,
                                        sub.id
                                      )
                                    }
                                    className="text-slate-400 hover:text-rose-600 shrink-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                <span className="truncate">
                                  {sub.assigned_employee_name || "Unassigned"}
                                </span>
                                {!isEmployee && (
                                  <select
                                    value={getSubtaskStatus(sub)}
                                    onChange={(e) =>
                                      updateSubtaskStatus(
                                        activeTaskContext.task.id,
                                        sub.id,
                                        e.target.value
                                      )
                                    }
                                    className="h-6 rounded-lg border border-slate-300 bg-slate-50 px-1.5 text-[10px] font-semibold text-[#111827]"
                                  >
                                    {taskStatuses.map((st) => (
                                      <option key={st.id} value={st.label}>
                                        {st.label}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Task Modal */}
      <Dialog
        open={Boolean(taskModalTarget)}
        onOpenChange={(open) => !open && setTaskModalTarget(null)}
      >
        <DialogContent className="sm:max-w-lg rounded-[24px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-[#111827]">
              Add Task to {taskModalTarget?.stage.stage_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Milestone: {taskModalTarget?.milestone.title}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
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
                placeholder="Deliverable details..."
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

      {/* Stage Clients Modal */}
      {selectedStageClientsModal && (
        <Dialog
          open={Boolean(selectedStageClientsModal)}
          onOpenChange={(open) => !open && setSelectedStageClientsModal(null)}
        >
          <DialogContent className="sm:max-w-3xl rounded-[24px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-extrabold text-[#111827]">
                {selectedStageClientsModal.stage.stage_name} — Allocated Clients
              </DialogTitle>
              <DialogDescription className="text-xs">
                Milestone: {selectedStageClientsModal.milestone.title}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getMilestoneClients(selectedStageClientsModal.milestone).length === 0 ? (
                <p className="text-xs text-slate-500 col-span-full py-6 text-center">
                  No clients allocated to this milestone yet.
                </p>
              ) : (
                getMilestoneClients(selectedStageClientsModal.milestone).map((client) => (
                  <div
                    key={client.id}
                    className="rounded-2xl border border-slate-300 bg-white p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-[#111827] truncate">
                        {client.client_name}
                      </span>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {client.client_code}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {client.nick_name ? `Nick: ${client.nick_name} • ` : ""}
                      {client.folder_name || client.constitution}
                    </p>
                    <div className="text-[11px] text-slate-600 space-y-0.5">
                      {client.contact?.mobile_number && (
                        <div className="flex items-center gap-1.5 font-mono">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{client.contact.mobile_number}</span>
                        </div>
                      )}
                      {client.contact?.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span className="truncate">{client.contact.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-1 flex justify-end">
                      <Link to={`/clients/${client.id}`}>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-xl text-[11px] font-bold gap-1"
                        >
                          <span>Client 360°</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
