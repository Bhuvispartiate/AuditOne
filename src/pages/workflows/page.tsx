import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  GitBranch,
  Plus,
  Trash2,
  Briefcase,
  ArrowRight,
  Search,
  MessageSquare,
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
import { isEmployeeRestricted } from "@/lib/access";
import { WorkflowTemplate } from "@/types";
import { toast } from "sonner";
import { WhatsAppChatDialog } from "@/components/whatsapp/whatsapp-chat-dialog";

function getWorkflowStats(wf: WorkflowTemplate) {
  const tasks = wf.template_tasks || [];
  const totalTasks = tasks.length;
  const totalSubtasks = tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
  const totalDays = tasks.reduce(
    (maxD, t) => Math.max(maxD, (t.start_day_offset || 0) + Math.max(1, t.duration_days || 1)),
    0
  );
  const milestonesCount = wf.milestones?.length || 0;
  const stagesCount = (wf.milestones || []).reduce((sum, m) => sum + (m.stages?.length || 0), 0);
  return { totalTasks, totalSubtasks, totalDays, milestonesCount, stagesCount };
}

export default function WorkflowsPage() {
  const [, setTick] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [workflowSearch, setWorkflowSearch] = useState("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Auto-redirect if URL has ?workflow=ID
  useEffect(() => {
    const wfParam = searchParams.get("workflow");
    if (wfParam) {
      navigate(`/workflows/${wfParam}`, { replace: true });
    }
  }, [searchParams, navigate]);

  // Create workflow form
  const [wfName, setWfName] = useState("");
  const [wfCode, setWfCode] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [description, setDescription] = useState("");
  const [wfWhatsAppEnabled, setWfWhatsAppEnabled] = useState(true);

  // WhatsApp context
  const [whatsAppWfContext, setWhatsAppWfContext] = useState<WorkflowTemplate | null>(null);

  // Delete modal state
  const [deleteWorkflowTarget, setDeleteWorkflowTarget] = useState<WorkflowTemplate | null>(null);
  const [deleteWorkflowInput, setDeleteWorkflowInput] = useState("");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);

  const workflows = pmsStore.getWorkflows();
  const services = pmsStore.getServices();

  const filteredWorkflows = useMemo(() => {
    const q = workflowSearch.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.workflow_name.toLowerCase().includes(q) ||
        w.workflow_code.toLowerCase().includes(q) ||
        (w.service_name || "").toLowerCase().includes(q)
    );
  }, [workflows, workflowSearch]);

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

  const handleCreateWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      toast.error("Please select a Service Name.");
      return;
    }
    if (!wfName.trim() || !wfCode.trim()) {
      toast.error("Please enter both Workflow Name and Code.");
      return;
    }

    try {
      const srv = services.find((s) => s.id === serviceId);
      const created = await pmsStore.addWorkflow({
        workflow_code: wfCode.trim().toUpperCase(),
        workflow_name: wfName.trim(),
        service_id: serviceId,
        service_name: srv?.service_name,
        description: description.trim() || `Fixed project workflow template for ${srv?.service_name || "service"}.`,
        is_active: true,
        version: 1,
        stages_count: 0,
        template_tasks: [],
        whatsapp_enabled: wfWhatsAppEnabled,
      });

      setIsNewModalOpen(false);
      toast.success(`Workflow "${created.workflow_name}" created directly in Supabase.`);
      navigate(`/workflows/${created.id}`);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to create workflow."}`);
    }
  };

  const normalizeVerifyString = (str: string) => {
    return (str || "")
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-") // em-dash, en-dash, minus to hyphen
      .replace(/\s+/g, " ") // collapse all whitespace and linebreaks
      .trim();
  };

  const isWfDeleteMatch = useMemo(() => {
    if (!deleteWorkflowTarget || !deleteWorkflowInput.trim()) return false;
    const inputNorm = normalizeVerifyString(deleteWorkflowInput);
    const targetNorm = normalizeVerifyString(deleteWorkflowTarget.workflow_name);

    if (inputNorm === targetNorm) return true;
    if (deleteWorkflowInput.trim().toLowerCase() === deleteWorkflowTarget.workflow_name.trim().toLowerCase()) return true;
    if (inputNorm === "delete" || inputNorm === "confirm") return true;
    return false;
  }, [deleteWorkflowTarget, deleteWorkflowInput]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Workflow Project Templates
          </h1>
        </div>

        {isEmployee ? (
          <Badge
            variant="outline"
            className="h-9 px-3.5 rounded-2xl text-xs font-bold bg-amber-50 text-amber-800 border-amber-300 shrink-0"
          >
            View-Only Mode
          </Badge>
        ) : (
          <Button
            onClick={handleOpenNewModal}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Create Service Workflow</span>
          </Button>
        )}
      </div>

      {/* Quick Metrics Bar & Search */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Workflows
          </span>
          <span className="text-lg font-extrabold text-[#111827]">{workflows.length}</span>
        </div>
        <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Active Workflows
          </span>
          <span className="text-lg font-extrabold text-emerald-700">
            {workflows.filter((w) => w.is_active).length}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Template Tasks
          </span>
          <span className="text-lg font-extrabold text-[#201815]">
            {workflows.reduce((sum, w) => sum + (w.template_tasks?.length || 0), 0)}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            Total Subtasks
          </span>
          <span className="text-lg font-extrabold text-sky-700">
            {workflows.reduce(
              (sum, w) =>
                sum +
                (w.template_tasks || []).reduce((s, t) => s + (t.subtasks?.length || 0), 0),
              0
            )}
          </span>
        </div>
        <div className="col-span-2 lg:col-span-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            type="search"
            placeholder="Search workflows..."
            value={workflowSearch}
            onChange={(e) => setWorkflowSearch(e.target.value)}
            className="pl-8 h-10 rounded-2xl border-[1.5px] border-slate-300 text-xs bg-white"
          />
        </div>
      </div>

      {/* Workflow Cards Grid */}
      {filteredWorkflows.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white">
          <CardContent className="py-16 text-center space-y-3">
            <GitBranch className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-[#111827]">
              {workflowSearch.trim() ? "No matching workflows found" : "No workflows created yet"}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {workflowSearch.trim()
                ? `No workflow template matching "${workflowSearch}". Try a different keyword.`
                : "Create standardized project templates attached to your services. Subscribing a client auto-spawns this structure."}
            </p>
            {!isEmployee && !workflowSearch.trim() && (
              <Button
                onClick={handleOpenNewModal}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white rounded-xl font-bold gap-1.5"
              >
                <Plus className="h-4 w-4" /> Create Service Workflow
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredWorkflows.map((wf) => {
            const stats = getWorkflowStats(wf);
            return (
              <Card
                key={wf.id}
                onClick={() => navigate(`/workflows/${wf.id}`)}
                className="rounded-[24px] border-[1.5px] border-[#E2DACD] bg-[#FAF8F5] cursor-pointer transition-all hover:border-[#201815] hover:shadow-md group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  {/* Top Header Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 bg-[#EFE8DC] text-[#201815] border border-[#E2DACD]">
                        <GitBranch className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full border bg-slate-50 border-slate-300 text-slate-700">
                          {wf.workflow_code}
                        </span>
                        <h3 className="text-base font-extrabold text-[#111827] mt-0.5 group-hover:text-[#201815] transition-colors">
                          {wf.workflow_name}
                        </h3>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant={wf.is_active ? "success" : "secondary"}
                        className="text-[10px] mr-1"
                      >
                        {wf.is_active ? "Active" : "Paused"}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => setWhatsAppWfContext(wf)}
                        className="h-7 w-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 flex items-center justify-center border border-emerald-200"
                        title="Send WhatsApp Update for Workflow"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                      {!isEmployee && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteWorkflowTarget(wf);
                            setDeleteWorkflowInput("");
                          }}
                          className="h-7 w-7 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex items-center justify-center border border-rose-200"
                          title="Delete Workflow"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Service Tag */}
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2DACD] bg-[#EFE8DC] px-2.5 py-1 text-xs font-bold text-[#201815]">
                    <Briefcase className="h-3.5 w-3.5 text-[#201815]" />
                    <span>Service: {wf.service_name || "Unassigned"}</span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {wf.description || "Standard fixed project deliverable workflow template."}
                  </p>

                  {/* Metrics 3-Col Bar */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Tasks</span>
                      <span className="font-extrabold text-slate-800">{stats.totalTasks}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Subtasks</span>
                      <span className="font-extrabold text-slate-800">{stats.totalSubtasks}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Timeline</span>
                      <span className="font-extrabold text-slate-800">{stats.totalDays}d</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Footer Action */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500">
                    {stats.milestonesCount > 0
                      ? `${stats.milestonesCount} Milestones • ${stats.stagesCount} Stages`
                      : "1 Standard Stage"}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/workflows/${wf.id}`);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#201815] group-hover:text-[#342722] group-hover:translate-x-0.5 transition-all"
                  >
                    <span>Open Workflow</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Service Workflow Modal (Admin Only) */}
      {!isEmployee && (
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
                  className="w-full h-10 rounded-2xl border-[1.5px] border-slate-300 bg-white px-3 text-xs font-semibold"
                  required
                >
                  {services.map((srv) => (
                    <option key={srv.id} value={srv.id}>
                      {srv.service_name} ({srv.service_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Workflow Name *</label>
                  <Input
                    value={wfName}
                    onChange={(e) => setWfName(e.target.value)}
                    placeholder="e.g. GST Monthly Return Filing"
                    className="h-10 rounded-2xl border-[1.5px] border-slate-300 text-xs font-semibold"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Workflow Code *</label>
                  <Input
                    value={wfCode}
                    onChange={(e) => setWfCode(e.target.value)}
                    placeholder="e.g. WF-GST-M"
                    className="h-10 rounded-2xl border-[1.5px] border-slate-300 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Standard operating procedure and deliverables for this fixed service workflow..."
                  rows={3}
                  className="rounded-2xl border-[1.5px] border-slate-300 text-xs resize-none"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">WhatsApp Automation</span>
                  <span className="text-[11px] text-slate-500">Allow instant WhatsApp dispatch from stages & tasks</span>
                </div>
                <input
                  type="checkbox"
                  checked={wfWhatsAppEnabled}
                  onChange={(e) => setWfWhatsAppEnabled(e.target.checked)}
                  className="h-4 w-4 accent-neutral-900 rounded cursor-pointer"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsNewModalOpen(false)}
                  className="rounded-xl border-slate-300 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Create Workflow
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Double-Verification Delete Workflow Modal */}
      <Dialog
        open={Boolean(deleteWorkflowTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteWorkflowTarget(null);
            setDeleteWorkflowInput("");
          }
        }}
      >
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-extrabold text-slate-900">
                Delete Workflow Template
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete workflow template &ldquo;
              <strong className="text-slate-900">{deleteWorkflowTarget?.workflow_name}</strong>
              &rdquo;? It will be moved to the Recycle Bin (25-day recovery window).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
              <p className="text-[11px] font-semibold text-rose-800">
                To confirm deletion, please type the workflow title below:
              </p>
              <div className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs font-mono font-extrabold text-rose-800 select-all break-all shadow-xs">
                {deleteWorkflowTarget?.workflow_name}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500 font-medium">Quick match:</span>
                <button
                  type="button"
                  onClick={() => setDeleteWorkflowInput(deleteWorkflowTarget?.workflow_name || "")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors"
                >
                  Auto-fill Title
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteWorkflowInput("delete")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors"
                >
                  delete
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Type Title to Verify</label>
              <Input
                value={deleteWorkflowInput}
                onChange={(e) => setDeleteWorkflowInput(e.target.value)}
                placeholder={`Type "${deleteWorkflowTarget?.workflow_name}" to confirm`}
                className="text-xs h-10 rounded-xl border-slate-300 font-medium focus-visible:ring-rose-500"
                autoFocus
              />
              {deleteWorkflowInput && !isWfDeleteMatch && (
                <p className="text-[11px] font-semibold text-rose-600">
                  Title does not match. Please type it exactly as shown above.
                </p>
              )}
              {isWfDeleteMatch && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  ✓ Title verified. Ready to delete.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteWorkflowTarget(null);
                setDeleteWorkflowInput("");
              }}
              className="rounded-xl border-slate-300 text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isWfDeleteMatch}
              onClick={async () => {
                if (deleteWorkflowTarget && isWfDeleteMatch) {
                  try {
                    await pmsStore.deleteWorkflow(deleteWorkflowTarget.id);
                    toast.success(`Workflow "${deleteWorkflowTarget.workflow_name}" deleted.`);
                    setDeleteWorkflowTarget(null);
                    setDeleteWorkflowInput("");
                  } catch (err: any) {
                    toast.error(`Database error: ${err.message || "Failed to delete workflow."}`);
                  }
                }
              }}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Workflow</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal WhatsApp Chat Modal */}
      <WhatsAppChatDialog
        open={Boolean(whatsAppWfContext)}
        onOpenChange={(open) => !open && setWhatsAppWfContext(null)}
        workflow={whatsAppWfContext}
      />
    </div>
  );
}
