import React, { useEffect, useState } from "react";
import {
  Lock,
  Save,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { isAdminUser } from "@/lib/access";
import { TaskStatusColor } from "@/types";
import { getStyleForColor, TASK_STATUS_COLOR_OPTIONS } from "@/lib/task-status-styles";
import { toast } from "sonner";

export default function SettingsPage() {
  const [, setTick] = useState(0);
  useEffect(() => pmsStore.subscribe(() => setTick((t) => t + 1)), []);

  const currentUser = pmsStore.getCurrentUser();
  const isAdmin = isAdminUser(currentUser);
  const taskStatuses = pmsStore.getTaskStatuses();

  // Status customization state
  const [newStatusLabel, setNewStatusLabel] = useState("");
  const [newStatusColor, setNewStatusColor] = useState<TaskStatusColor>("slate");
  const [newStatusCompleted, setNewStatusCompleted] = useState(false);

  const [editingStatusId, setEditingStatusId] = useState<string | null>(null);
  const [editLabelDraft, setEditLabelDraft] = useState("");
  const [editColorDraft, setEditColorDraft] = useState<TaskStatusColor>("slate");
  const [editCompletedDraft, setEditCompletedDraft] = useState(false);

  // Firm Profile Settings
  const [firmName, setFirmName] = useState("AuditOne Professional Services");
  const [firmGstin, setFirmGstin] = useState("06AABFP1234F1Z9");

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Organization profile saved successfully.");
  };

  const handleAddStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error("Only Admin can customize task statuses.");
      return;
    }
    try {
      const created = await pmsStore.addTaskStatusConfig({
        label: newStatusLabel,
        color: newStatusColor,
        isCompleted: newStatusCompleted,
      });
      if (!created) {
        toast.error("Enter a unique status name.");
        return;
      }
      setNewStatusLabel("");
      setNewStatusColor("slate");
      setNewStatusCompleted(false);
      toast.success(`Added status "${created.label}".`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to add status to database.");
    }
  };

  const startEditingStatus = (statusId: string, label: string, color: TaskStatusColor, isCompleted?: boolean) => {
    setEditingStatusId(statusId);
    setEditLabelDraft(label);
    setEditColorDraft(color);
    setEditCompletedDraft(Boolean(isCompleted));
  };

  const handleSaveEditStatus = async (statusId: string) => {
    if (!isAdmin) return;
    try {
      const updated = await pmsStore.updateTaskStatusConfig(statusId, {
        label: editLabelDraft,
        color: editColorDraft,
        isCompleted: editCompletedDraft,
      });
      if (!updated) {
        toast.error("Status name must be non-empty and unique.");
        return;
      }
      setEditingStatusId(null);
      toast.success(`Updated status "${updated.label}".`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status in database.");
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
          Organization Settings &amp; Access Control
        </h1>
      </div>

      <Tabs defaultValue="statuses" className="w-full">
        <TabsList className="bg-white border border-[#E6E4F0] p-1 rounded-2xl mb-4 shadow-xs flex-wrap h-auto">
          <TabsTrigger value="statuses" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#272769] data-[state=active]:text-white">Task Statuses</TabsTrigger>
          <TabsTrigger value="firm" className="rounded-xl font-bold text-xs data-[state=active]:bg-[#272769] data-[state=active]:text-white">Firm Master Configuration</TabsTrigger>
        </TabsList>

        {/* TASK STATUS CUSTOMIZATION (ADMIN ONLY EDIT) */}
        <TabsContent value="statuses" className="space-y-6">
          <Card className="shadow-xs rounded-[24px] border-[1.5px] border-slate-300">
            <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-base font-extrabold text-[#111827]">
                    Customizable Task &amp; Kanban Statuses
                  </CardTitle>
                  <Badge variant="secondary" className="rounded-full text-[10px]">
                    {taskStatuses.length} Statuses
                  </Badge>
                </div>
                <CardDescription className="text-xs mt-1">
                  Add, rename, reorder, recolor, or remove statuses. Changes apply immediately to Kanban board headings and all task/subtask status dropdowns.
                </CardDescription>
              </div>
              {isAdmin && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    pmsStore.resetTaskStatusesToDefault();
                    toast.success("Task statuses reset to defaults.");
                  }}
                  className="h-8 rounded-xl border-slate-300 text-xs font-bold gap-1.5 shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Defaults</span>
                </Button>
              )}
            </CardHeader>

            <CardContent className="p-5 space-y-5">
              {!isAdmin && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800 flex items-center gap-2">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span>Only Admin (Super Admin) can add, edit, reorder, or delete task statuses.</span>
                </div>
              )}

              {/* Existing Status List */}
              <div className="space-y-2.5">
                {taskStatuses.map((st, idx) => {
                  const style = getStyleForColor(st.color);
                  const isEditing = isAdmin && editingStatusId === st.id;

                  return (
                    <div
                      key={st.id}
                      className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2.5 flex-1">
                          <Input
                            value={editLabelDraft}
                            onChange={(e) => setEditLabelDraft(e.target.value)}
                            placeholder="Status label..."
                            className="h-9 w-48 rounded-xl border-slate-300 text-xs font-bold"
                            autoFocus
                          />
                          <select
                            value={editColorDraft}
                            onChange={(e) => setEditColorDraft(e.target.value as TaskStatusColor)}
                            className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                          >
                            {TASK_STATUS_COLOR_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editCompletedDraft}
                              onChange={(e) => setEditCompletedDraft(e.target.checked)}
                              className="h-4 w-4 accent-emerald-600"
                            />
                            <span>Marks Completed</span>
                          </label>
                          <div className="flex items-center gap-1.5 ml-auto">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSaveEditStatus(st.id)}
                              className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingStatusId(null)}
                              className="h-8 px-3 rounded-xl text-xs font-semibold"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-[11px] font-bold text-slate-400 w-5">
                              #{idx + 1}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${style.pillClass}`}
                            >
                              <span className={`h-2 w-2 rounded-full ${style.dotClass}`} />
                              {st.label}
                            </span>
                            {idx === 0 && (
                              <Badge variant="outline" className="text-[10px] rounded-full">
                                Default Initial Status
                              </Badge>
                            )}
                            {st.isCompleted && (
                              <Badge variant="success" className="text-[10px] rounded-full">
                                Completion Stage
                              </Badge>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={idx === 0}
                                onClick={() => pmsStore.moveTaskStatusConfig(st.id, "up")}
                                className="h-8 w-8 rounded-xl border-slate-300"
                                title="Move Up (earlier Kanban column)"
                              >
                                <ArrowUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={idx === taskStatuses.length - 1}
                                onClick={() => pmsStore.moveTaskStatusConfig(st.id, "down")}
                                className="h-8 w-8 rounded-xl border-slate-300"
                                title="Move Down (later Kanban column)"
                              >
                                <ArrowDown className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  startEditingStatus(st.id, st.label, st.color, st.isCompleted)
                                }
                                className="h-8 px-2.5 rounded-xl border-slate-300 text-xs font-bold gap-1"
                              >
                                <Pencil className="h-3 w-3" /> Edit
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                disabled={taskStatuses.length <= 1}
                                onClick={async () => {
                                  try {
                                    const ok = await pmsStore.deleteTaskStatusConfig(st.id);
                                    if (ok) toast.success(`Deleted status "${st.label}".`);
                                    else toast.error("At least one status must remain.");
                                  } catch (err: any) {
                                    toast.error(err?.message || "Failed to delete status from database.");
                                  }
                                }}
                                className="h-8 w-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50"
                                title="Delete Status"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Custom Status (Admin Only) */}
              {isAdmin && (
                <form
                  onSubmit={handleAddStatus}
                  className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
                >
                  <div className="sm:col-span-5 space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      New Status Name
                    </label>
                    <Input
                      placeholder="e.g. Client Approval, QC Review, On Hold..."
                      value={newStatusLabel}
                      onChange={(e) => setNewStatusLabel(e.target.value)}
                      className="h-9 rounded-xl border-slate-300 bg-white text-xs font-semibold"
                    />
                  </div>
                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Column Color
                    </label>
                    <select
                      value={newStatusColor}
                      onChange={(e) => setNewStatusColor(e.target.value as TaskStatusColor)}
                      className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                    >
                      {TASK_STATUS_COLOR_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex items-center h-9">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStatusCompleted}
                        onChange={(e) => setNewStatusCompleted(e.target.checked)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span>Completed</span>
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      type="submit"
                      size="sm"
                      className="w-full h-9 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Status
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FIRM PROFILE */}
        <TabsContent value="firm" className="space-y-6">
          <Card className="shadow-xs rounded-[24px] border-[1.5px] border-[#E6E4F0] bg-white">
            <CardHeader className="pb-3 border-b border-[#E6E4F0]">
              <CardTitle className="text-base font-extrabold text-[#1E1E4F]">Organization Profile &amp; Statutory Header</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#55557A]">Firm Official Name</label>
                  <Input value={firmName} onChange={(e) => setFirmName(e.target.value)} className="rounded-xl border-[#E6E4F0]" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#55557A]">Firm GSTIN</label>
                  <Input value={firmGstin} onChange={(e) => setFirmGstin(e.target.value)} className="rounded-xl border-[#E6E4F0]" />
                </div>
                <Button type="submit" className="bg-[#272769] hover:bg-[#1E1E4F] text-white gap-2 mt-2 rounded-xl">
                  <Save className="h-4 w-4" /> Update Firm Details
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

