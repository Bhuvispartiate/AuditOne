import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  GitBranch,
  Plus,
  Calendar,
  ListChecks,
  MessageSquare,
  Send,
  Trash2,
  User,
  Briefcase,
  CheckSquare,
  ArrowRight,
  Columns3,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import {
  ProjectPriority,
  Task,
  TaskStatus,
  WorkflowProjectTaskTemplate,
  WorkflowSubtaskTemplate,
  WorkflowTemplate,
} from "@/types";
import { toast } from "sonner";
import { ProjectTimeline } from "@/components/tasks/project-timeline";

function addDays(baseIso: string, days: number): string {
  const parsed = new Date(baseIso);
  const ms = Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
  return new Date(ms + days * 86400000).toISOString().slice(0, 10);
}

export default function WorkflowsPage() {
  const [, setTick] = useState(0);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Selected template task for Subtasks/Comments modal
  const [activeTplTaskId, setActiveTplTaskId] = useState<string | null>(null);
  const [isTplTaskModalOpen, setIsTplTaskModalOpen] = useState(false);

  // Create workflow form
  const [wfName, setWfName] = useState("");
  const [wfCode, setWfCode] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");

  // Add template task inline form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskStartDay, setTaskStartDay] = useState(1);
  const [taskDurationDays, setTaskDurationDays] = useState(5);
  const [taskPriority, setTaskPriority] = useState<ProjectPriority>("Medium");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("To Do");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");

  // Modal subtask & comment inputs
  const [subTitle, setSubTitle] = useState("");
  const [subStartDay, setSubStartDay] = useState(1);
  const [subDurationDays, setSubDurationDays] = useState(2);
  const [subAssigneeId, setSubAssigneeId] = useState("");
  const [commentInput, setCommentInput] = useState("");

  const [previewBaseDate, setPreviewBaseDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const workflows = pmsStore.getWorkflows();
  const services = pmsStore.getServices();
  const employees = pmsStore.getEmployees();
  const statusNames = pmsStore.getTaskStatusNames();

  useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      setSelectedWorkflowId(workflows[0].id);
    } else if (selectedWorkflowId && !workflows.some((w) => w.id === selectedWorkflowId)) {
      setSelectedWorkflowId(workflows[0]?.id || null);
    }
  }, [workflows, selectedWorkflowId]);

  useEffect(() => {
    if (!serviceId && services.length > 0) {
      const first = services[0];
      setServiceId(first.id);
      setWfName(first.service_name);
      setWfCode(`WF-${first.service_code}`);
    }
  }, [services, serviceId]);

  useEffect(() => {
    if (!taskAssigneeId && employees.length > 0) {
      setTaskAssigneeId(employees[0].id);
    }
    if (!subAssigneeId && employees.length > 0) {
      setSubAssigneeId(employees[0].id);
    }
  }, [employees, taskAssigneeId, subAssigneeId]);

  const selectedWorkflow =
    workflows.find((w) => w.id === selectedWorkflowId) || workflows[0] || null;
  const tplTasks = selectedWorkflow?.template_tasks || [];
  const activeTplTask = tplTasks.find((t) => t.id === activeTplTaskId) || null;

  useEffect(() => {
    if (activeTplTask) {
      setSubStartDay((activeTplTask.start_day_offset || 0) + 1);
      setSubDurationDays(Math.max(1, Math.min(3, activeTplTask.duration_days || 1)));
      setSubAssigneeId(activeTplTask.assigned_employee_id || employees[0]?.id || "");
    }
  }, [activeTplTask?.id]);

  // Convert Workflow template tasks into Task[] for ProjectTimeline preview
  const previewTimelineTasks: Task[] = useMemo(() => {
    return tplTasks.map((t, idx) => {
      const tStart = addDays(previewBaseDate, Math.max(0, t.start_day_offset || 0));
      const tDue = addDays(tStart, Math.max(0, (t.duration_days || 1) - 1));
      const mappedSubs: Task[] = (t.subtasks || []).map((st, sIdx) => {
        const sStart = addDays(previewBaseDate, Math.max(0, st.start_day_offset ?? t.start_day_offset ?? 0));
        const sDue = addDays(sStart, Math.max(0, (st.duration_days || 1) - 1));
        return {
          id: st.id,
          task_code: `T${idx + 1}.${sIdx + 1}`,
          project_id: selectedWorkflow?.id || "wf-preview",
          parent_task_id: t.id,
          title: st.title,
          description: st.description || "",
          assigned_employee_id: st.assigned_employee_id || t.assigned_employee_id,
          assigned_employee_name: st.assigned_employee_name || t.assigned_employee_name || "Unassigned",
          priority: st.priority || t.priority,
          start_date: sStart,
          due_date: sDue,
          status: st.status || "To Do",
          created_at: new Date().toISOString(),
        };
      });

      return {
        id: t.id,
        task_code: `T${idx + 1}`,
        project_id: selectedWorkflow?.id || "wf-preview",
        project_name: selectedWorkflow?.workflow_name,
        title: t.task_name,
        description: t.description,
        assigned_employee_id: t.assigned_employee_id,
        assigned_employee_name: t.assigned_employee_name || "Service Assignee",
        priority: t.priority,
        start_date: tStart,
        due_date: tDue,
        status: t.status || "To Do",
        comments_count: (t.default_comments || []).length,
        subtasks: mappedSubs,
        created_at: new Date().toISOString(),
      };
    });
  }, [tplTasks, previewBaseDate, selectedWorkflow?.id, selectedWorkflow?.workflow_name]);

  const totalSubtasksCount = tplTasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
  const totalCommentsCount = tplTasks.reduce((sum, t) => sum + (t.default_comments?.length || 0), 0);
  const totalSpanDays = tplTasks.reduce(
    (maxD, t) => Math.max(maxD, (t.start_day_offset || 0) + Math.max(1, t.duration_days || 1)),
    0
  );

  const handleOpenNewModal = () => {
    if (services.length === 0) {
      toast.error("Please add at least one Service in the Services catalog first.");
      return;
    }
    const first = services[0];
    setServiceId(first.id);
    setWfName(first.service_name);
    setWfCode(`WF-${first.service_code}`);
    setDescription("");
    setIsNewModalOpen(true);
  };

  const handleServiceSelectChange = (nextServiceId: string) => {
    setServiceId(nextServiceId);
    const srv = services.find((s) => s.id === nextServiceId);
    if (srv) {
      setWfName(srv.service_name);
      setWfCode(`WF-${srv.service_code}`);
    }
  };

  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      toast.error("Please select a Service Name.");
      return;
    }
    if (!wfName.trim() || !wfCode.trim()) {
      toast.error("Please enter both Workflow Name and Code.");
      return;
    }

    const srv = services.find((s) => s.id === serviceId);
    const created = pmsStore.addWorkflow({
      workflow_code: wfCode.trim().toUpperCase(),
      workflow_name: wfName.trim(),
      service_id: serviceId,
      service_name: srv?.service_name,
      description: description.trim() || `Fixed project workflow template for ${srv?.service_name || "service"}.`,
      is_active: true,
      version: 1,
      stages_count: 0,
      template_tasks: [],
    });

    setSelectedWorkflowId(created.id);
    setIsNewModalOpen(false);
    toast.success(`Workflow "${created.workflow_name}" created. Now add tasks, subtasks & timeline below.`);
  };

  const saveWorkflowTasks = (wf: WorkflowTemplate, nextTasks: WorkflowProjectTaskTemplate[]) => {
    pmsStore.updateWorkflow(wf.id, {
      template_tasks: nextTasks,
      stages_count: nextTasks.length,
    });
    setTick((t) => t + 1);
  };

  const handleAddTemplateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow) return;
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    const emp = employees.find((item) => item.id === taskAssigneeId);
    const nextTask: WorkflowProjectTaskTemplate = {
      id: `wt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      task_name: taskTitle.trim(),
      description: taskDesc.trim(),
      sequence_number: tplTasks.length + 1,
      start_day_offset: Math.max(0, Number(taskStartDay) - 1),
      duration_days: Math.max(1, Number(taskDurationDays) || 1),
      priority: taskPriority,
      status: taskStatus,
      assigned_employee_id: emp?.id,
      assigned_employee_name: emp?.full_name,
      subtasks: [],
      default_comments: [],
    };

    saveWorkflowTasks(selectedWorkflow, [...tplTasks, nextTask]);
    setTaskTitle("");
    setTaskDesc("");
    toast.success(`Added task "${nextTask.task_name}" to workflow template.`);
  };

  const updateTemplateTask = (
    taskId: string,
    updater: (prev: WorkflowProjectTaskTemplate) => WorkflowProjectTaskTemplate
  ) => {
    if (!selectedWorkflow) return;
    const nextTasks = tplTasks.map((t) => (t.id === taskId ? updater(t) : t));
    saveWorkflowTasks(selectedWorkflow, nextTasks);
  };

  const handleDeleteTemplateTask = (taskId: string) => {
    if (!selectedWorkflow) return;
    const nextTasks = tplTasks
      .filter((t) => t.id !== taskId)
      .map((t, idx) => ({ ...t, sequence_number: idx + 1 }));
    saveWorkflowTasks(selectedWorkflow, nextTasks);
    if (activeTplTaskId === taskId) {
      setIsTplTaskModalOpen(false);
      setActiveTplTaskId(null);
    }
    toast.success("Template task removed.");
  };

  const handleAddTemplateSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTplTask || !subTitle.trim()) {
      toast.error("Please enter a subtask title.");
      return;
    }
    const emp = employees.find((item) => item.id === subAssigneeId);
    const newSub: WorkflowSubtaskTemplate = {
      id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: subTitle.trim(),
      start_day_offset: Math.max(0, Number(subStartDay) - 1),
      duration_days: Math.max(1, Number(subDurationDays) || 1),
      status: "To Do",
      priority: activeTplTask.priority,
      assigned_employee_id: emp?.id || activeTplTask.assigned_employee_id,
      assigned_employee_name: emp?.full_name || activeTplTask.assigned_employee_name,
    };

    updateTemplateTask(activeTplTask.id, (prev) => ({
      ...prev,
      subtasks: [...(prev.subtasks || []), newSub],
    }));
    setSubTitle("");
    toast.success("Subtask added to workflow template.");
  };

  const handleAddTemplateComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTplTask || !commentInput.trim()) return;
    updateTemplateTask(activeTplTask.id, (prev) => ({
      ...prev,
      default_comments: [...(prev.default_comments || []), commentInput.trim()],
    }));
    setCommentInput("");
    toast.success("Template comment saved.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Workflow Project Templates
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Select a Service Name and configure its fixed Project → Tasks → Subtasks → Timeline → Comments structure. Subscribing a client auto-creates this complete project.
          </p>
        </div>

        <Button
          onClick={handleOpenNewModal}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Create Service Workflow</span>
        </Button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar Box: Service Workflows */}
        <Card className="lg:col-span-4 rounded-[24px] border-[1.5px] border-slate-300 bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                Service Workflows ({workflows.length})
              </span>
              <Link to="/services" className="text-[11px] font-bold text-violet-700 hover:underline">
                Manage Services
              </Link>
            </div>

            {workflows.length === 0 ? (
              <div className="py-10 text-center space-y-2 text-slate-500">
                <GitBranch className="h-8 w-8 mx-auto text-slate-300" />
                <p className="text-xs font-bold text-slate-800">No workflows created yet</p>
                <p className="text-[11px] text-slate-500">
                  Click &ldquo;Create Service Workflow&rdquo; to attach a fixed project template to a service.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {workflows.map((wf) => {
                  const isSelected = selectedWorkflow?.id === wf.id;
                  const tCount = wf.template_tasks?.length || 0;
                  const sCount = (wf.template_tasks || []).reduce(
                    (sum, t) => sum + (t.subtasks?.length || 0),
                    0
                  );

                  return (
                    <div
                      key={wf.id}
                      onClick={() => setSelectedWorkflowId(wf.id)}
                      className={`p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all space-y-2 ${
                        isSelected
                          ? "bg-violet-50/70 border-neutral-900 shadow-xs"
                          : "bg-white border-slate-300 hover:border-neutral-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] font-bold text-slate-800 bg-white border border-slate-300 px-2 py-0.5 rounded-lg">
                          {wf.workflow_code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={wf.is_active ? "success" : "secondary"} className="text-[10px]">
                            {wf.is_active ? "Active" : "Paused"}
                          </Badge>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pmsStore.deleteWorkflow(wf.id);
                              toast.success(`Deleted workflow "${wf.workflow_name}".`);
                            }}
                            className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Delete Workflow"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <h4 className="font-extrabold text-sm text-[#111827] leading-snug">
                        {wf.workflow_name}
                      </h4>

                      <div className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                        <Briefcase className="h-3 w-3" />
                        <span>{wf.service_name || "No Service Linked"}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-600">
                        <span>
                          {tCount} Task(s) • {sCount} Subtask(s)
                        </span>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/workflows/${wf.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-bold text-slate-800 hover:border-neutral-900"
                            title="Open Workflow Kanban Board"
                          >
                            <Columns3 className="h-3 w-3 text-violet-600" /> Kanban
                          </Link>
                          <span className="inline-flex items-center gap-1 text-slate-800">
                            Edit <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Workspace Box: Project-Style Template Editor */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedWorkflow ? (
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
              <CardContent className="py-16 text-center space-y-3">
                <GitBranch className="h-10 w-10 text-slate-300 mx-auto" />
                <h3 className="text-base font-extrabold text-[#111827]">
                  Select or Create a Service Workflow
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Each workflow defines the exact fixed Project (Tasks, Subtasks, Start/Due Timeline & Comments) that gets auto-created whenever a client subscribes to that Service.
                </p>
                <Button
                  onClick={handleOpenNewModal}
                  size="sm"
                  className="bg-neutral-900 hover:bg-black text-white rounded-xl font-bold gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Create Service Workflow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Selected Workflow Summary Box */}
              <div className="rounded-[24px] border-[1.5px] border-slate-300 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-xl">
                        {selectedWorkflow.workflow_code}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-800">
                        <Briefcase className="h-3 w-3" />
                        Service: {selectedWorkflow.service_name || "Unassigned"}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-[#111827] mt-1.5">
                      {selectedWorkflow.workflow_name}
                    </h2>
                    <p className="text-xs text-[#6b7280] mt-0.5">
                      {selectedWorkflow.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const res = pmsStore.syncWorkflowTasksToSubscribedClients(selectedWorkflow.id);
                        if (res.createdTasks > 0) {
                          toast.success(`Synced ${res.createdTasks} task(s) across ${res.updatedProjects} client project(s).`);
                        } else {
                          toast.info("All subscribed clients already have these workflow tasks.");
                        }
                      }}
                      className="rounded-xl border-[1.5px] border-slate-300 text-xs font-bold gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Sync to Clients
                    </Button>
                    <Link to={`/workflows/${selectedWorkflow.id}`}>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5"
                      >
                        <Columns3 className="h-3.5 w-3.5" /> Open Kanban Board
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Template Tasks
                    </span>
                    <span className="text-lg font-extrabold text-[#111827]">{tplTasks.length}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Subtasks
                    </span>
                    <span className="text-lg font-extrabold text-[#111827]">{totalSubtasksCount}</span>
                  </div>
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Timeline Span
                    </span>
                    <span className="text-lg font-extrabold text-[#111827]">
                      {totalSpanDays} Day{totalSpanDays === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Template Comments
                    </span>
                    <span className="text-lg font-extrabold text-[#111827]">{totalCommentsCount}</span>
                  </div>
                </div>
              </div>

              {/* Add Template Task Box (just like normal Project) */}
              <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
                <CardContent className="p-5 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Plus className="h-3.5 w-3.5 text-violet-600" />
                    <span>Add Fixed Task to Workflow Project</span>
                  </h3>
                  <form onSubmit={handleAddTemplateTask} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-4 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Task Name *</label>
                      <Input
                        placeholder="e.g. Collect Signed Financials & AOC-4 Data"
                        value={taskTitle}
                        onChange={(e) => setTaskTitle(e.target.value)}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Start Day</label>
                      <Input
                        type="number"
                        min={1}
                        value={taskStartDay}
                        onChange={(e) => setTaskStartDay(Math.max(1, Number(e.target.value)))}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Duration (Days)</label>
                      <Input
                        type="number"
                        min={1}
                        value={taskDurationDays}
                        onChange={(e) => setTaskDurationDays(Math.max(1, Number(e.target.value)))}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Priority</label>
                      <select
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as ProjectPriority)}
                        className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2 text-xs font-semibold"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Task</span>
                      </Button>
                    </div>

                    <div className="sm:col-span-6 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Task Description / Checklist Notes</label>
                      <Input
                        placeholder="Optional instructions copied to every client project task..."
                        value={taskDesc}
                        onChange={(e) => setTaskDesc(e.target.value)}
                        className="h-9 rounded-xl border border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Default Assignee</label>
                      <select
                        value={taskAssigneeId}
                        onChange={(e) => setTaskAssigneeId(e.target.value)}
                        className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                      >
                        {employees.map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Initial Status</label>
                      <select
                        value={taskStatus}
                        onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                        className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                      >
                        {statusNames.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Template Timeline Preview */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="text-xs font-bold text-slate-600">
                    Timeline Preview (simulating Start Date):
                  </span>
                  <Input
                    type="date"
                    value={previewBaseDate}
                    onChange={(e) => setPreviewBaseDate(e.target.value)}
                    className="h-8 w-40 rounded-xl border-[1.5px] border-slate-300 bg-white text-xs font-semibold"
                  />
                </div>
                <ProjectTimeline
                  tasks={previewTimelineTasks}
                  projectStartDate={previewBaseDate}
                  projectDueDate={addDays(previewBaseDate, Math.max(1, totalSpanDays - 1))}
                  onSelectTask={(tid) => {
                    setActiveTplTaskId(tid);
                    setIsTplTaskModalOpen(true);
                  }}
                  title="Workflow Project Timeline Preview (Tasks & Subtasks)"
                />
              </div>

              {/* Template Tasks Box Grid */}
              <div className="space-y-3">
                <h3 className="text-base font-extrabold text-[#111827] flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-violet-600" />
                  <span>Workflow Tasks, Subtasks & Comments ({tplTasks.length})</span>
                </h3>

                {tplTasks.length === 0 ? (
                  <Card className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white">
                    <CardContent className="py-10 text-center text-xs text-slate-500">
                      No tasks added to this workflow yet. Add your fixed tasks above, then open each task to add subtasks & comments.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tplTasks.map((t, idx) => {
                      const tStart = addDays(previewBaseDate, Math.max(0, t.start_day_offset || 0));
                      const tDue = addDays(tStart, Math.max(0, (t.duration_days || 1) - 1));
                      const subs = t.subtasks || [];
                      const cmts = t.default_comments || [];

                      return (
                        <Card
                          key={t.id}
                          className="rounded-[24px] border-[1.5px] border-slate-300 bg-white hover:border-neutral-900 transition-all"
                        >
                          <CardContent className="p-5 space-y-3.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-xl">
                                  T{idx + 1}
                                </span>
                                <Badge variant={t.priority === "Urgent" ? "destructive" : "outline"} className="text-[10px]">
                                  {t.priority}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {t.status}
                                </Badge>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplateTask(t.id)}
                                className="p-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                                title="Delete Task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTplTaskId(t.id);
                                  setIsTplTaskModalOpen(true);
                                }}
                                className="text-left group"
                              >
                                <h4 className="font-extrabold text-sm text-[#111827] group-hover:text-violet-700">
                                  {t.task_name}
                                </h4>
                              </button>
                              {t.description && (
                                <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">{t.description}</p>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-300 bg-slate-50/70 p-2.5 text-xs">
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                  Timeline Window
                                </span>
                                <span className="font-bold text-[#111827]">
                                  Day {(t.start_day_offset || 0) + 1} → Day{" "}
                                  {(t.start_day_offset || 0) + (t.duration_days || 1)} ({t.duration_days}d)
                                </span>
                                <span className="text-[10px] text-slate-500 block">
                                  e.g. {formatDate(tStart)} → {formatDate(tDue)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">
                                  Default Assignee
                                </span>
                                <span className="font-bold text-[#111827] truncate flex items-center gap-1 mt-0.5">
                                  <User className="h-3 w-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{t.assigned_employee_name || "Service RM"}</span>
                                </span>
                              </div>
                            </div>

                            {/* Subtasks Preview */}
                            <div className="rounded-2xl border border-slate-300 bg-slate-50/40 p-3 space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                  <ListChecks className="h-3.5 w-3.5 text-violet-600" />
                                  Subtasks ({subs.length})
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3 text-sky-600" />
                                  {cmts.length} Comment(s)
                                </span>
                              </div>
                              {subs.length === 0 ? (
                                <p className="text-[11px] text-slate-400">No subtasks yet.</p>
                              ) : (
                                <div className="space-y-1 max-h-28 overflow-y-auto">
                                  {subs.map((st, sIdx) => (
                                    <div
                                      key={st.id}
                                      className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-[11px] flex items-center justify-between gap-2"
                                    >
                                      <span className="font-semibold text-slate-800 truncate">
                                        T{idx + 1}.{sIdx + 1} {st.title}
                                      </span>
                                      <span className="text-[10px] text-slate-500 shrink-0">
                                        {st.duration_days}d
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setActiveTplTaskId(t.id);
                                setIsTplTaskModalOpen(true);
                              }}
                              className="w-full h-8 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Edit Subtasks, Timeline & Comments</span>
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Service Workflow Modal */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-lg rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-extrabold text-slate-900">
              Create Service Workflow Template
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Bind a fixed Project template to a Service Name. When a client subscribes to this service, the full Project, Tasks, Subtasks, Timeline & Comments will auto-create.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkflow} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Service Name *</label>
              <select
                value={serviceId}
                onChange={(e) => handleServiceSelectChange(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                required
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.service_name} ({s.service_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Workflow Code *</label>
                <Input
                  placeholder="e.g. WF-ANNUAL"
                  value={wfCode}
                  onChange={(e) => setWfCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Workflow Name *</label>
                <Input
                  placeholder="e.g. Annual Filing Workflow"
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Description & Governance Notes</label>
              <Textarea
                placeholder="Scope & standard operating structure for this service..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-neutral-900 hover:bg-black text-white font-bold">
                Create & Build Workflow Tasks
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template Task Detail Modal (Subtasks, Dates/Offsets, Status, Comments) */}
      <Dialog open={isTplTaskModalOpen} onOpenChange={setIsTplTaskModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6">
          {activeTplTask && (
            <>
              <DialogHeader className="pb-3 border-b border-slate-300">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <DialogTitle className="text-lg font-extrabold text-[#111827]">
                      {activeTplTask.task_name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Configure fixed task timing, status, subtasks, and default comments for {selectedWorkflow?.service_name}.
                    </DialogDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteTemplateTask(activeTplTask.id)}
                    className="h-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete Task
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Schedule, Status & Ownership */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Status</label>
                    <select
                      value={activeTplTask.status}
                      onChange={(e) =>
                        updateTemplateTask(activeTplTask.id, (prev) => ({
                          ...prev,
                          status: e.target.value as TaskStatus,
                        }))
                      }
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-bold"
                    >
                      {statusNames.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Start Day</label>
                    <Input
                      type="number"
                      min={1}
                      value={(activeTplTask.start_day_offset || 0) + 1}
                      onChange={(e) =>
                        updateTemplateTask(activeTplTask.id, (prev) => ({
                          ...prev,
                          start_day_offset: Math.max(0, Number(e.target.value) - 1),
                        }))
                      }
                      className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Duration (Days)</label>
                    <Input
                      type="number"
                      min={1}
                      value={activeTplTask.duration_days || 1}
                      onChange={(e) =>
                        updateTemplateTask(activeTplTask.id, (prev) => ({
                          ...prev,
                          duration_days: Math.max(1, Number(e.target.value) || 1),
                        }))
                      }
                      className="h-9 rounded-xl border-slate-300 text-xs font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Priority</label>
                    <select
                      value={activeTplTask.priority}
                      onChange={(e) =>
                        updateTemplateTask(activeTplTask.id, (prev) => ({
                          ...prev,
                          priority: e.target.value as ProjectPriority,
                        }))
                      }
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">Default Assignee</label>
                    <select
                      value={activeTplTask.assigned_employee_id || ""}
                      onChange={(e) => {
                        const emp = employees.find((item) => item.id === e.target.value);
                        updateTemplateTask(activeTplTask.id, (prev) => ({
                          ...prev,
                          assigned_employee_id: emp?.id,
                          assigned_employee_name: emp?.full_name,
                        }));
                      }}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Template Subtasks */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4 text-violet-600" />
                    <span>Template Subtasks ({(activeTplTask.subtasks || []).length})</span>
                  </h4>

                  {(activeTplTask.subtasks || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No subtasks added yet. Add any number of subtasks below.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeTplTask.subtasks || []).map((st) => (
                        <div
                          key={st.id}
                          className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-[#111827] truncate">{st.title}</p>
                            <p className="text-[10px] text-slate-500">
                              Start Day {(st.start_day_offset || 0) + 1} • Duration {st.duration_days}d •{" "}
                              {st.assigned_employee_name || "Task Assignee"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={st.status || "To Do"}
                              onChange={(e) =>
                                updateTemplateTask(activeTplTask.id, (prev) => ({
                                  ...prev,
                                  subtasks: (prev.subtasks || []).map((item) =>
                                    item.id === st.id ? { ...item, status: e.target.value as TaskStatus } : item
                                  ),
                                }))
                              }
                              className="h-8 rounded-xl border border-slate-300 bg-white px-2 text-[11px] font-bold"
                            >
                              {statusNames.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                updateTemplateTask(activeTplTask.id, (prev) => ({
                                  ...prev,
                                  subtasks: (prev.subtasks || []).filter((item) => item.id !== st.id),
                                }))
                              }
                              className="p-1.5 rounded-xl border border-rose-300 text-rose-600 hover:bg-rose-50"
                              title="Delete Subtask"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <form
                    onSubmit={handleAddTemplateSubtask}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-3 border-t border-slate-200 items-end"
                  >
                    <div className="sm:col-span-5 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Subtask Title</label>
                      <Input
                        placeholder="e.g. Verify director DSC validity"
                        value={subTitle}
                        onChange={(e) => setSubTitle(e.target.value)}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Start Day</label>
                      <Input
                        type="number"
                        min={1}
                        value={subStartDay}
                        onChange={(e) => setSubStartDay(Math.max(1, Number(e.target.value)))}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold uppercase text-slate-500">Days</label>
                      <Input
                        type="number"
                        min={1}
                        value={subDurationDays}
                        onChange={(e) => setSubDurationDays(Math.max(1, Number(e.target.value)))}
                        className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Button
                        type="submit"
                        size="sm"
                        className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Subtask
                      </Button>
                    </div>
                  </form>
                </div>

                {/* Default Template Comments */}
                <div className="rounded-[20px] border-[1.5px] border-slate-300 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-sky-600" />
                    <span>Default Task Comments ({(activeTplTask.default_comments || []).length})</span>
                  </h4>

                  {(activeTplTask.default_comments || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
                      No template comments yet. Any comment added here is copied onto each client task created from this workflow.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeTplTask.default_comments || []).map((cmt, idx) => (
                        <div
                          key={idx}
                          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs flex items-center justify-between gap-2"
                        >
                          <span className="text-slate-800">{cmt}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateTemplateTask(activeTplTask.id, (prev) => ({
                                ...prev,
                                default_comments: (prev.default_comments || []).filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1 rounded-lg text-rose-600 hover:bg-rose-50 shrink-0"
                            title="Delete Comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <form onSubmit={handleAddTemplateComment} className="flex gap-2 pt-2 border-t border-slate-200">
                    <Input
                      placeholder="Add standard SOP comment or checklist reminder..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs flex-1"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      className="h-9 px-4 rounded-xl bg-neutral-900 hover:bg-black text-white font-bold gap-1 shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" /> Add Comment
                    </Button>
                  </form>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
