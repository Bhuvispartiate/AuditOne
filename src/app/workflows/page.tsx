"use client";

import React, { useState } from "react";
import {
  GitBranch,
  Plus,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  Shield,
  Filter,
  Check,
  ChevronRight,
  Eye,
  Lock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import { WorkflowTemplate, WorkflowStage } from "@/types";
import { toast } from "sonner";

export default function WorkflowsPage() {
  const workflows = pmsStore.getWorkflows();
  const services = pmsStore.getServices();
  const departments = pmsStore.getDepartments();

  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(workflows[0] || null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // New Workflow template state
  const [wfName, setWfName] = useState("");
  const [wfCode, setWfCode] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [description, setDescription] = useState("");

  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName.trim() || !wfCode.trim()) {
      toast.error("Please enter both Workflow Name and Code.");
      return;
    }

    const srv = services.find((s) => s.id === serviceId);

    const newWf: WorkflowTemplate = {
      id: `wf-${Date.now()}`,
      workflow_code: wfCode.toUpperCase(),
      workflow_name: wfName,
      service_id: serviceId,
      service_name: srv?.service_name,
      description,
      is_active: true,
      version: 1,
      stages_count: 3,
      created_at: new Date().toISOString(),
      versions: [
        {
          id: `wf-v-${Date.now()}`,
          workflow_template_id: "",
          version_number: 1,
          is_published: true,
          published_at: new Date().toISOString(),
          stages: [
            {
              id: `stg-1-${Date.now()}`,
              template_version_id: "",
              stage_name: "Document Collection",
              description: "Collect trial balance and client ledgers",
              sequence_number: 1,
              default_days: 5,
              assigned_department_id: departments[0]?.id,
              assigned_department_name: departments[0]?.name,
              tasks: [
                { id: `t-1-${Date.now()}`, stage_id: "", task_name: "Transmit PBC Checklist", description: "Send standardized checklist", sequence_number: 1, default_days: 2, priority: "High", is_mandatory: true }
              ]
            },
            {
              id: `stg-2-${Date.now()}`,
              template_version_id: "",
              stage_name: "Verification & Audit",
              description: "Vouch transactions and verify statutory challans",
              sequence_number: 2,
              default_days: 7,
              assigned_department_id: departments[0]?.id,
              assigned_department_name: departments[0]?.name,
              tasks: [
                { id: `t-2-${Date.now()}`, stage_id: "", task_name: "Reconcile Tax Credits", description: "Reconcile 26AS with revenue", sequence_number: 1, default_days: 3, priority: "Urgent", is_mandatory: true }
              ]
            },
            {
              id: `stg-3-${Date.now()}`,
              template_version_id: "",
              stage_name: "Filing & Acknowledgement",
              description: "Upload statutory JSON and deliver receipt",
              sequence_number: 3,
              default_days: 2,
              assigned_department_id: departments[1]?.id,
              assigned_department_name: departments[1]?.name,
              tasks: [
                { id: `t-3-${Date.now()}`, stage_id: "", task_name: "Portal Filing", description: "DSC affixation and e-filing", sequence_number: 1, default_days: 1, priority: "Urgent", is_mandatory: true }
              ]
            }
          ]
        }
      ]
    };

    workflows.unshift(newWf);
    setSelectedWorkflow(newWf);
    setIsNewModalOpen(false);
    toast.success(`Workflow template "${newWf.workflow_name}" created & published.`);
  };

  const currentVersion = selectedWorkflow?.versions?.[0];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Workflow Management Engine
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Configurable multi-stage compliance pipelines, conditional branching and immutable version templates.
          </p>
        </div>

        <Button
          onClick={() => setIsNewModalOpen(true)}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>New Workflow Template</span>
        </Button>
      </div>

      {/* Main Grid: Left Template Selector, Right Visual Stage Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Template Catalog List */}
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
              Published Workflow Templates ({workflows.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Version-locked templates generating active project tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            {workflows.length === 0 ? (
              <div className="p-6 text-center text-slate-500">
                <GitBranch className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-700">No templates configured</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Click &ldquo;New Workflow Template&rdquo; to build your first compliance flow.
                </p>
              </div>
            ) : (
              workflows.map((wf) => {
                const isSelected = selectedWorkflow?.id === wf.id;
                return (
                  <div
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-400 shadow-xs"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                        {wf.workflow_code}
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold text-slate-700">
                        v{wf.version}.0 Locked
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-sm text-slate-900 leading-tight">
                      {wf.workflow_name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {wf.description}
                    </p>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{wf.stages_count || wf.versions?.[0]?.stages?.length || 0} Stages</span>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column: Visual Stage & Task Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedWorkflow ? (
            <Card className="shadow-xs p-12 text-center border-dashed border-slate-200">
              <GitBranch className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-slate-900">No Workflow Template Selected</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Configure multi-stage compliance pipelines, review gates, and automated deliverables by creating a new template.
              </p>
              <Button
                onClick={() => setIsNewModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                size="sm"
              >
                <Plus className="h-4 w-4" /> Create Workflow Template
              </Button>
            </Card>
          ) : (
            <>
              {/* Active Template Overview Banner */}
              <Card className="shadow-xs border-slate-200 bg-gradient-to-r from-slate-900 to-blue-950 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="border-blue-400 text-blue-200 text-xs font-mono">
                      {selectedWorkflow.workflow_code} &bull; Version {selectedWorkflow.version} (Immutable)
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-blue-200">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Published Template</span>
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mt-2 tracking-tight">
                    {selectedWorkflow.workflow_name}
                  </h2>
                  <p className="text-xs text-blue-200 mt-1 max-w-xl leading-relaxed">
                    {selectedWorkflow.description}
                  </p>
                </CardContent>
              </Card>

              {/* Conditional Filters Configured */}
              {currentVersion?.conditions && currentVersion.conditions.length > 0 && (
                <Card className="shadow-xs border-blue-200 bg-blue-50/30">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                      <Filter className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-blue-950">Automated Conditional Execution Rules</h4>
                      <p className="text-[11px] text-blue-800">
                        Applies when client constitution is Private/Public Limited and GSTIN registration is verified.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stages Progression Steps */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                  Execution Stages & Deliverable Tasks
                </h3>

                {currentVersion?.stages?.map((stage, idx) => (
                  <Card key={stage.id} className="shadow-xs border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-bold shadow-xs">
                          {stage.sequence_number}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900 leading-tight">
                            Stage {stage.sequence_number}: {stage.stage_name}
                          </h4>
                          <p className="text-xs text-slate-500 mt-0.5">{stage.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-[10px]">
                          {stage.assigned_department_name || "Tax & Regulatory"}
                        </Badge>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          Target: {stage.default_days} days
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Automated Stage Deliverables:
                      </div>
                      {stage.tasks?.map((tsk) => (
                        <div
                          key={tsk.id}
                          className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-900 block">{tsk.task_name}</span>
                              <span className="text-[11px] text-slate-500">{tsk.description}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={tsk.priority === "Urgent" ? "destructive" : "outline"}
                              className="text-[10px]"
                            >
                              {tsk.priority}
                            </Badge>
                            <span className="text-[11px] font-mono text-slate-500">{tsk.default_days}d</span>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Workflow Modal */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Create Workflow Template
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Construct a multi-stage procedural workflow to standardize service delivery across teams.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkflow} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Workflow Code</label>
                <Input
                  placeholder="e.g. WF-GST-ANNUAL"
                  value={wfCode}
                  onChange={(e) => setWfCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Associated Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.service_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Workflow Name</label>
              <Input
                placeholder="e.g. Annual GST GSTR-9 Audit & 9C Certification"
                value={wfName}
                onChange={(e) => setWfName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description & Governance Notes</label>
              <Textarea
                placeholder="Outlines regulatory compliance steps, supervisory approvals..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsNewModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Publish Version 1.0
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

