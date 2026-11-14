import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Search,
  User,
  Calendar as CalendarIcon,
  ListChecks,
  MessageSquare,
  Trash2,
  GripVertical,
  ChevronRight,
  ArrowLeft,
  FolderTree,
  Layers,
  Receipt,
  ShieldCheck,
  Building2,
  BookOpen,
  Briefcase,
  Folder,
  Pencil,
  CheckCircle2,
  Columns3,
  X,
  Check,
  AlertTriangle,
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isTaskAssignedToEmployee,
  isClientAssignedToEmployee,
} from "@/lib/access";
import { getStyleForColor } from "@/lib/task-status-styles";
import { formatDate } from "@/lib/utils";
import {
  TaskStatus,
  ProjectPriority,
  TaskCategory,
  TaskSubCategory,
} from "@/types";
import { toast } from "sonner";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

function getCategoryIcon(iconName?: string) {
  switch (iconName) {
    case "Receipt":
      return Receipt;
    case "ShieldCheck":
      return ShieldCheck;
    case "Building2":
      return Building2;
    case "BookOpen":
      return BookOpen;
    case "Briefcase":
      return Briefcase;
    default:
      return Layers;
  }
}

function getCategoryColorTheme(color?: string) {
  switch (color) {
    case "violet":
      return {
        badge: "bg-violet-50 text-violet-700 border-violet-200",
        iconBg: "bg-violet-100 text-violet-700",
        border: "hover:border-violet-400",
        accent: "text-violet-700",
        bar: "bg-violet-600",
        columnBorder: "border-violet-200 bg-violet-50/20",
      };
    case "sky":
      return {
        badge: "bg-sky-50 text-sky-700 border-sky-200",
        iconBg: "bg-sky-100 text-sky-700",
        border: "hover:border-sky-400",
        accent: "text-sky-700",
        bar: "bg-sky-600",
        columnBorder: "border-sky-200 bg-sky-50/20",
      };
    case "amber":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-200",
        iconBg: "bg-amber-100 text-amber-700",
        border: "hover:border-amber-400",
        accent: "text-amber-700",
        bar: "bg-amber-600",
        columnBorder: "border-amber-200 bg-amber-50/20",
      };
    case "emerald":
      return {
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
        iconBg: "bg-emerald-100 text-emerald-700",
        border: "hover:border-emerald-400",
        accent: "text-emerald-700",
        bar: "bg-emerald-600",
        columnBorder: "border-emerald-200 bg-emerald-50/20",
      };
    case "rose":
      return {
        badge: "bg-rose-50 text-rose-700 border-rose-200",
        iconBg: "bg-rose-100 text-rose-700",
        border: "hover:border-rose-400",
        accent: "text-rose-700",
        bar: "bg-rose-600",
        columnBorder: "border-rose-200 bg-rose-50/20",
      };
    default:
      return {
        badge: "bg-slate-100 text-slate-700 border-slate-300",
        iconBg: "bg-slate-200 text-slate-700",
        border: "hover:border-slate-400",
        accent: "text-slate-800",
        bar: "bg-slate-600",
        columnBorder: "border-slate-200 bg-slate-50/40",
      };
  }
}

function TasksContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get("category");
  const autoCreate = searchParams.get("create") === "true";

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const [tick, setTick] = useState(0);
  void tick;

  // Selected Category (Level 1 vs Level 2 Kanban View)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(initialCategory);

  // Search & Filter state
  const [categorySearch, setCategorySearch] = useState("");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Drag and drop across Sub-group columns
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverSubGroupId, setDragOverSubGroupId] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(autoCreate && !isEmployee);
  const [targetSubGroupIdForNewTask, setTargetSubGroupIdForNewTask] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Category Add/Edit Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catColor, setCatColor] = useState("violet");

  // Sub-category Add/Edit Modal
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<TaskSubCategory | null>(null);
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subDesc, setSubDesc] = useState("");

  // Inline Sub-group editing inside column header
  const [inlineEditingSubId, setInlineEditingSubId] = useState<string | null>(null);
  const [inlineSubName, setInlineSubName] = useState("");

  // Double-verification Delete Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "category" | "sub-category" | "task";
    id: string;
    name: string;
    parentCategoryId?: string;
    description?: string;
  } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  const isDeleteMatch = Boolean(
    deleteTarget &&
      deleteConfirmInput.trim().toLowerCase() === deleteTarget.name.trim().toLowerCase()
  );

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const updateSelectedCategory = (catId: string | null) => {
    setSelectedCategoryId(catId);
    const nextParams = new URLSearchParams(searchParams);
    if (catId) nextParams.set("category", catId);
    else nextParams.delete("category");
    nextParams.delete("subCategory");
    setSearchParams(nextParams, { replace: true });
  };

  const categories = pmsStore.getTaskCategories();
  const allTasks = pmsStore.getTasks();
  const projects = pmsStore.getProjects();
  const allClients = pmsStore.getClients();
  const allEngagements = pmsStore.getAllEngagements();
  const employees = pmsStore.getEmployees();

  const tasks = isEmployee
    ? allTasks.filter((t) => isTaskAssignedToEmployee(t, empId))
    : allTasks;
  const clients = isEmployee
    ? allClients.filter((c) =>
        isClientAssignedToEmployee(c, empId, projects, allTasks, allEngagements)
      )
    : allClients;
  const taskStatuses = pmsStore.getTaskStatuses();
  const statusNames = taskStatuses.map((s) => s.label);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const subCategories = selectedCategory?.sub_categories || [];

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(employees[0]?.id || "");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");
  const [initialStatus, setInitialStatus] = useState<TaskStatus>(pmsStore.getDefaultStatusName());
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [draftSubtaskInput, setDraftSubtaskInput] = useState("");
  const [draftSubtasks, setDraftSubtasks] = useState<string[]>([]);
  const [modalSubCategoryId, setModalSubCategoryId] = useState("");

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Tasks in currently selected Category
  const categoryTasks = useMemo(() => {
    if (!selectedCategory) return [];
    return tasks.filter((t) => t.category_id === selectedCategory.id);
  }, [tasks, selectedCategory]);

  const handleOpenDetail = (taskId: string) => {
    setActiveTaskId(taskId);
    setIsDetailOpen(true);
  };

  const handleOpenCreateTaskForSubGroup = (subId?: string) => {
    const defaultSubId = subId || subCategories[0]?.id || "";
    setModalSubCategoryId(defaultSubId);
    setTargetSubGroupIdForNewTask(defaultSubId);
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
    setIsModalOpen(true);
  };

  const handleAddDraftSubtask = () => {
    const trimmed = draftSubtaskInput.trim();
    if (!trimmed) return;
    setDraftSubtasks((prev) => [...prev, trimmed]);
    setDraftSubtaskInput("");
  };

  const handleRemoveDraftSubtask = (idx: number) => {
    setDraftSubtasks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!projectId) {
      toast.error("Please select a parent project.");
      return;
    }

    const proj = projects.find((p) => p.id === projectId);
    const emp = employees.find((e) => e.id === assignedEmployeeId);
    const chosenSub = subCategories.find((s) => s.id === modalSubCategoryId) || subCategories[0];

    const created = pmsStore.addTask({
      title: taskTitle.trim(),
      project_id: projectId,
      project_name: proj?.project_name,
      category_id: selectedCategory?.id,
      category_name: selectedCategory?.name,
      sub_category_id: chosenSub?.id,
      sub_category_name: chosenSub?.name,
      assigned_employee_id: assignedEmployeeId,
      assigned_employee_name: emp?.full_name,
      priority,
      start_date: startDate,
      due_date: dueDate,
      status: initialStatus,
      description,
      created_by: pmsStore.getCurrentUser().id,
      created_by_name: pmsStore.getCurrentUser().full_name,
    });

    const subtasksToAdd = [...draftSubtasks];
    if (draftSubtaskInput.trim()) {
      subtasksToAdd.push(draftSubtaskInput.trim());
    }
    subtasksToAdd.forEach((subTitle) => {
      pmsStore.addSubtask(created.id, {
        title: subTitle,
        start_date: startDate,
        due_date: dueDate,
        assigned_employee_id: assignedEmployeeId,
        assigned_employee_name: emp?.full_name,
      });
    });

    toast.success(
      subtasksToAdd.length > 0
        ? `Task ${created.task_code} added under ${chosenSub?.name || "Sub-group"}.`
        : `Task ${created.task_code} created.`
    );
    setIsModalOpen(false);
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    pmsStore.updateTaskStatus(taskId, newStatus);
    toast.success(`Task status updated to ${newStatus}`);
  };

  // Category actions
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }
    if (editingCategory) {
      pmsStore.updateTaskCategory(editingCategory.id, {
        name: catName.trim(),
        code: catCode.trim(),
        description: catDesc.trim(),
        color: catColor,
      });
      toast.success("Category updated.");
    } else {
      const created = pmsStore.addTaskCategory({
        name: catName.trim(),
        code: catCode.trim(),
        description: catDesc.trim(),
        color: catColor,
      });
      toast.success(`Category "${created.name}" created.`);
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCatName("");
    setCatCode("");
    setCatDesc("");
  };

  const handleDeleteCategory = (cat: TaskCategory) => {
    setDeleteTarget({
      type: "category",
      id: cat.id,
      name: cat.name,
      description: `Are you sure you want to delete category "${cat.name}" and all its sub-groups? All deliverable tasks and workflows organized under this practice will be permanently deleted.`,
    });
    setDeleteConfirmInput("");
  };

  // Sub-category actions
  const handleSaveSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    if (!subName.trim()) {
      toast.error("Please enter a sub-group name.");
      return;
    }
    if (editingSubCategory) {
      pmsStore.updateTaskSubCategory(selectedCategoryId, editingSubCategory.id, {
        name: subName.trim(),
        code: subCode.trim(),
        description: subDesc.trim(),
      });
      toast.success("Sub-group updated.");
    } else {
      const created = pmsStore.addTaskSubCategory(selectedCategoryId, {
        name: subName.trim(),
        code: subCode.trim(),
        description: subDesc.trim(),
      });
      toast.success(`Sub-group "${created?.name}" added to Kanban.`);
    }
    setIsSubCategoryModalOpen(false);
    setEditingSubCategory(null);
    setSubName("");
    setSubCode("");
    setSubDesc("");
  };

  const handleInlineSaveSubName = (subId: string) => {
    if (!selectedCategoryId || !inlineSubName.trim()) {
      setInlineEditingSubId(null);
      return;
    }
    pmsStore.updateTaskSubCategory(selectedCategoryId, subId, {
      name: inlineSubName.trim(),
    });
    setInlineEditingSubId(null);
    toast.success("Sub-group renamed.");
  };

  const handleDeleteSubCategory = (sub: TaskSubCategory) => {
    if (!selectedCategoryId) return;
    setDeleteTarget({
      type: "sub-category",
      id: sub.id,
      name: sub.name,
      parentCategoryId: selectedCategoryId,
      description: `Are you sure you want to delete sub-group "${sub.name}"? Tasks currently under this column will be unlinked.`,
    });
    setDeleteConfirmInput("");
  };

  const handleExecuteDelete = () => {
    if (!deleteTarget || !isDeleteMatch) return;

    if (deleteTarget.type === "category") {
      pmsStore.deleteTaskCategory(deleteTarget.id);
      if (selectedCategoryId === deleteTarget.id) {
        updateSelectedCategory(null);
      }
      toast.success(`Category "${deleteTarget.name}" deleted.`);
    } else if (deleteTarget.type === "sub-category") {
      const parentId = deleteTarget.parentCategoryId || selectedCategoryId;
      if (parentId) {
        pmsStore.deleteTaskSubCategory(parentId, deleteTarget.id);
        toast.success(`Sub-group "${deleteTarget.name}" deleted.`);
      }
    } else if (deleteTarget.type === "task") {
      pmsStore.deleteTask(deleteTarget.id);
      toast.success(`Task "${deleteTarget.name}" deleted.`);
    }

    setDeleteTarget(null);
    setDeleteConfirmInput("");
  };

  // Metrics
  const totalSubGroups = categories.reduce(
    (acc, cat) => acc + (cat.sub_categories?.length || 0),
    0
  );
  const totalActiveTasks = tasks.filter((t) => t.status !== "Completed").length;
  const totalCompletedTasks = tasks.filter((t) => t.status === "Completed").length;

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* BREADCRUMB & CONTEXT NAVIGATION                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <button
            type="button"
            onClick={() => updateSelectedCategory(null)}
            className={`flex items-center gap-1.5 transition-colors ${
              !selectedCategoryId
                ? "text-[#111827] font-extrabold cursor-default"
                : "text-slate-600 hover:text-slate-900 hover:underline"
            }`}
          >
            <FolderTree className="h-4 w-4 text-violet-600" />
            <span>Tasks</span>
          </button>

          {selectedCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[#111827] font-extrabold bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-violet-700 font-extrabold">
                  {selectedCategory.code}
                </span>
                <span>{selectedCategory.name}</span>
              </span>
            </>
          )}
        </div>

        {/* Back navigation buttons */}
        <div className="flex items-center gap-2">
          {selectedCategoryId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => updateSelectedCategory(null)}
              className="h-8 rounded-xl border-slate-300 text-xs font-bold gap-1.5 text-slate-700 bg-white hover:bg-slate-50"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Categories</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 1: CATEGORY SELECTION VIEW                                          */}
      {/* ========================================================================= */}
      {!selectedCategoryId && (
        <div className="space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                Task Management Categories
              </h1>
              <p className="text-xs text-[#6b7280] mt-1 font-medium">
                Organized practice hierarchy: <strong>Category → Sub-groups Kanban Board → Deliverable Tasks &amp; Subtasks</strong>. Select a category below to view its sub-groups Kanban.
              </p>
            </div>

            {!isEmployee && (
              <Button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setCatName("");
                  setCatCode("");
                  setCatDesc("");
                  setCatColor("violet");
                  setIsCategoryModalOpen(true);
                }}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Add Category</span>
              </Button>
            )}
          </div>

          {/* Category Summary KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 pt-1 items-center">
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Categories
              </span>
              <span className="text-lg font-extrabold text-[#111827]">
                {categories.length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Sub-groups
              </span>
              <span className="text-lg font-extrabold text-[#111827]">
                {totalSubGroups}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Active Deliverables
              </span>
              <span className="text-lg font-extrabold text-amber-700">
                {totalActiveTasks}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Completed
              </span>
              <span className="text-lg font-extrabold text-emerald-700">
                {totalCompletedTasks}
              </span>
            </div>
            <div className="col-span-2 lg:col-span-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="search"
                placeholder="Search categories..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="pl-8 h-10 rounded-2xl border-[1.5px] border-slate-300 text-xs bg-white"
              />
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories
              .filter(
                (c) =>
                  !categorySearch.trim() ||
                  c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
                  c.code.toLowerCase().includes(categorySearch.toLowerCase()) ||
                  (c.description && c.description.toLowerCase().includes(categorySearch.toLowerCase()))
              )
              .map((cat) => {
                const IconComp = getCategoryIcon(cat.icon);
                const theme = getCategoryColorTheme(cat.color);
                const catTasks = tasks.filter((t) => t.category_id === cat.id);
                const activeCount = catTasks.filter((t) => t.status !== "Completed").length;
                const completedCount = catTasks.filter((t) => t.status === "Completed").length;
                const progressPct =
                  catTasks.length > 0
                    ? Math.round((completedCount / catTasks.length) * 100)
                    : 0;

                return (
                  <Card
                    key={cat.id}
                    onClick={() => updateSelectedCategory(cat.id)}
                    className={`rounded-[24px] border-[1.5px] border-slate-300 bg-white cursor-pointer transition-all hover:shadow-md ${theme.border} group relative overflow-hidden flex flex-col justify-between`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Header Row */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${theme.iconBg}`}
                          >
                            <IconComp className="h-5 w-5" />
                          </div>
                          <div>
                            <span
                              className={`font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${theme.badge}`}
                            >
                              {cat.code}
                            </span>
                            <h3 className="text-base font-extrabold text-[#111827] mt-0.5 group-hover:text-violet-800 transition-colors">
                              {cat.name}
                            </h3>
                          </div>
                        </div>

                        {!isEmployee && (
                          <div
                            className="flex items-center gap-1 opacity-80 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingCategory(cat);
                                setCatName(cat.name);
                                setCatCode(cat.code);
                                setCatDesc(cat.description || "");
                                setCatColor(cat.color || "violet");
                                setIsCategoryModalOpen(true);
                              }}
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                              title="Edit Category"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(cat)}
                              className="h-7 w-7 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {cat.description || "Practice category deliverable group."}
                      </p>

                      {/* Sub-groups preview pills */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Sub-groups Kanban ({cat.sub_categories?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                          {(cat.sub_categories || []).slice(0, 3).map((sub) => (
                            <span
                              key={sub.id}
                              className="inline-flex items-center text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg border border-slate-200"
                            >
                              {sub.name}
                            </span>
                          ))}
                          {(cat.sub_categories?.length || 0) > 3 && (
                            <span className="text-[10px] font-bold text-slate-400 self-center">
                              +{(cat.sub_categories?.length || 0) - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Progress & Action Row */}
                    <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-[22px] space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-600">
                          {catTasks.length} Task{catTasks.length === 1 ? "" : "s"} · {activeCount} active
                        </span>
                        <span className="text-slate-800">{progressPct}% complete</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${theme.bar} transition-all duration-500`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-end pt-1">
                        <span className="text-xs font-extrabold text-[#111827] group-hover:text-violet-700 group-hover:translate-x-1 transition-all inline-flex items-center gap-1">
                          <span>Open Sub-groups Kanban</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: KANBAN BOARD VIEW (EACH SUB-GROUP = ONE KANBAN COLUMN)            */}
      {/* ========================================================================= */}
      {selectedCategory && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                  {selectedCategory.code}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                  {selectedCategory.name}
                </h1>
              </div>
              <p className="text-xs text-[#6b7280] font-medium max-w-2xl">
                {selectedCategory.description || "Practice category"}. Each column below represents a distinct <strong>sub-group</strong> holding its dedicated tasks and deliverables.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {!isEmployee && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingSubCategory(null);
                      setSubName("");
                      setSubCode("");
                      setSubDesc("");
                      setIsSubCategoryModalOpen(true);
                    }}
                    size="sm"
                    className="h-9 rounded-xl border-slate-300 bg-white text-xs font-bold gap-1.5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Sub-group</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleOpenCreateTaskForSubGroup()}
                    size="sm"
                    className="h-9 bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs text-xs font-bold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Task</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Filter and Search Bar */}
          <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="relative sm:col-span-6">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                <Input
                  type="search"
                  placeholder={`Search ${selectedCategory.name} tasks by title, code, client, or project...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
                >
                  <option value="ALL">All Clients ({clients.length})</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.client_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
                >
                  <option value="ALL">All Statuses ({taskStatuses.length})</option>
                  {taskStatuses.map((s) => (
                    <option key={s.id} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* ===================================================================== */}
          {/* SUB-GROUPS KANBAN BOARD: ONE COLUMN PER SUB-GROUP                      */}
          {/* ===================================================================== */}
          {subCategories.length === 0 ? (
            <div className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
              <Folder className="h-10 w-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-extrabold text-[#111827]">
                No Sub-groups in &ldquo;{selectedCategory.name}&rdquo;
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Create sub-groups (e.g. Indirect Tax, Direct Tax, Statutory Audit) to display as columns in this Kanban view.
              </p>
              {!isEmployee && (
                <Button
                  onClick={() => setIsSubCategoryModalOpen(true)}
                  className="bg-neutral-900 text-white rounded-xl text-xs font-bold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Sub-group</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-flow-col auto-cols-[minmax(330px,380px)] gap-4 items-start">
                {subCategories.map((sub, sIdx) => {
                  const subTasks = categoryTasks.filter((t) => t.sub_category_id === sub.id);

                  // Apply search and filter
                  const visibleSubTasks = subTasks.filter((t) => {
                    const proj = projects.find((p) => p.id === t.project_id);
                    const matchesSearch =
                      !search.trim() ||
                      t.title.toLowerCase().includes(search.toLowerCase()) ||
                      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                      (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase()));

                    const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter;
                    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
                    return matchesSearch && matchesClient && matchesStatus;
                  });

                  const isDropOver = dragOverSubGroupId === sub.id;

                  return (
                    <div
                      key={sub.id}
                      onDragOver={(e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverSubGroupId(sub.id);
                      }}
                      onDragLeave={() =>
                        setDragOverSubGroupId((prev) => (prev === sub.id ? null : prev))
                      }
                      onDrop={(e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverSubGroupId(null);
                        if (draggingTaskId) {
                          pmsStore.updateTaskSubCategoryAssignment(draggingTaskId, sub.id);
                          setDraggingTaskId(null);
                          toast.success(`Task moved to ${sub.name}`);
                        }
                      }}
                      className={`rounded-[24px] border-[1.5px] transition-all flex flex-col max-h-[82vh] ${
                        isDropOver
                          ? "border-neutral-900 bg-slate-100/90 shadow-md ring-2 ring-violet-500/20"
                          : "border-slate-300 bg-slate-50/70"
                      }`}
                    >
                      {/* Column Header */}
                      <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          {inlineEditingSubId === sub.id ? (
                            <div className="flex items-center gap-1.5 w-full">
                              <Input
                                value={inlineSubName}
                                onChange={(e) => setInlineSubName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleInlineSaveSubName(sub.id);
                                  } else if (e.key === "Escape") {
                                    setInlineEditingSubId(null);
                                  }
                                }}
                                className="h-7 text-xs font-bold rounded-lg border-slate-300"
                                autoFocus
                              />
                              <Button
                                type="button"
                                size="icon"
                                onClick={() => handleInlineSaveSubName(sub.id)}
                                className="h-7 w-7 rounded-lg bg-neutral-900 text-white shrink-0"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={() => setInlineEditingSubId(null)}
                                className="h-7 w-7 rounded-lg border-slate-300 shrink-0"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                                  {sub.code || `S${sIdx + 1}`}
                                </span>
                                <h3 className="text-sm font-extrabold text-[#111827] truncate">
                                  {sub.name}
                                </h3>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                                  {subTasks.length} {subTasks.length === 1 ? "Task" : "Tasks"}
                                </Badge>
                                {!isEmployee && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setInlineEditingSubId(sub.id);
                                        setInlineSubName(sub.name);
                                      }}
                                      className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                                      title="Rename Sub-group"
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteSubCategory(sub)}
                                      className="h-6 w-6 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                                      title="Delete Sub-group"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>

                        {sub.description && (
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {sub.description}
                          </p>
                        )}
                      </div>

                      {/* Tasks List inside this Sub-group Column */}
                      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                        {visibleSubTasks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                            {isEmployee ? "No assigned tasks in this sub-group" : "No tasks in this sub-group yet"}
                          </div>
                        ) : (
                          visibleSubTasks.map((task) => {
                            const parentProj = projects.find((p) => p.id === task.project_id);
                            const subtasks = task.subtasks || [];
                            const startStr = task.start_date || task.created_at.slice(0, 10);
                            const statusCfg = taskStatuses.find((s) => s.label === task.status);
                            const statusColor = statusCfg?.color || "slate";
                            const colStyle = getStyleForColor(statusColor);

                            return (
                              <div
                                key={task.id}
                                draggable={!isEmployee}
                                onDragStart={() => {
                                  if (!isEmployee) setDraggingTaskId(task.id);
                                }}
                                onDragEnd={() => {
                                  setDraggingTaskId(null);
                                  setDragOverSubGroupId(null);
                                }}
                                className={`rounded-2xl border-[1.5px] border-slate-300 bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-neutral-900 transition-all space-y-2.5 ${
                                  isEmployee ? "" : "cursor-grab active:cursor-grabbing"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    {!isEmployee && (
                                      <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                    )}
                                    <span className="font-mono text-[10px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                                      {task.task_code}
                                    </span>
                                    <Badge
                                      variant={
                                        task.priority === "Urgent"
                                          ? "destructive"
                                          : task.priority === "High"
                                          ? "warning"
                                          : "outline"
                                      }
                                      className="text-[10px] rounded-full"
                                    >
                                      {task.priority}
                                    </Badge>
                                  </div>

                                  {!isEmployee && (
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setDeleteTarget({
                                          type: "task",
                                          id: task.id,
                                          name: task.title,
                                          description: `Are you sure you want to delete deliverable task ${task.task_code} ("${task.title}")? This action cannot be undone.`,
                                        });
                                        setDeleteConfirmInput("");
                                      }}
                                      className="h-6 w-6 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                                      title="Delete Task"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>

                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDetail(task.id)}
                                    className="text-left group/title w-full"
                                  >
                                    <h4 className="font-extrabold text-sm text-[#111827] leading-snug group-hover/title:text-violet-700 transition-colors">
                                      {task.title}
                                    </h4>
                                  </button>
                                  {parentProj?.client_name && (
                                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5 truncate">
                                      {parentProj.client_name} • {task.project_name || parentProj.project_name}
                                    </p>
                                  )}
                                </div>

                                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 space-y-1 text-[11px] text-slate-600">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="inline-flex items-center gap-1 truncate font-medium">
                                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span className="truncate">
                                        {task.assigned_employee_name || "Unassigned"}
                                      </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1 shrink-0 font-semibold text-slate-700">
                                      <MessageSquare className="h-3 w-3 text-sky-600" />
                                      {task.comments_count || 0}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                    <span className="inline-flex items-center gap-1">
                                      <CalendarIcon className="h-3 w-3 text-slate-400" />
                                      {formatDate(startStr)} → {formatDate(task.due_date)}
                                    </span>
                                    {subtasks.length > 0 && (
                                      <span className="inline-flex items-center gap-1 font-bold text-violet-700">
                                        <ListChecks className="h-3 w-3" />
                                        {subtasks.length} sub
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                                  {isEmployee ? (
                                    <Badge
                                      variant={colStyle.badgeVariant}
                                      className="text-[10px] font-bold"
                                    >
                                      {task.status}
                                    </Badge>
                                  ) : (
                                    <select
                                      value={task.status}
                                      onChange={(e) =>
                                        handleStatusChange(task.id, e.target.value as TaskStatus)
                                      }
                                      className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[10px] font-bold text-[#111827] focus:outline-none"
                                    >
                                      {statusNames.map((st) => (
                                        <option key={st} value={st}>
                                          {st}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleOpenDetail(task.id)}
                                    className="h-7 px-2.5 rounded-lg bg-neutral-900 hover:bg-black text-white text-[10px] font-bold"
                                  >
                                    Overview
                                  </Button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add Task Button inside THIS Sub-group Column */}
                      {!isEmployee && (
                        <div className="p-3 pt-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateTaskForSubGroup(sub.id)}
                            className="w-full h-8 rounded-xl border-dashed border-slate-300 bg-white hover:bg-slate-100 hover:border-slate-400 text-xs font-bold gap-1 text-slate-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Task</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Add Another Sub-group Column Card */}
                {!isEmployee && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSubCategory(null);
                      setSubName("");
                      setSubCode("");
                      setSubDesc("");
                      setIsSubCategoryModalOpen(true);
                    }}
                    className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 hover:border-violet-500 bg-white hover:bg-violet-50/30 p-8 min-h-[220px] flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-violet-700 transition-all text-xs font-bold group"
                  >
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 group-hover:bg-violet-100 flex items-center justify-center text-slate-600 group-hover:text-violet-700 transition-colors">
                      <Plus className="h-5 w-5" />
                    </div>
                    <span>Add Sub-group Column</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CATEGORY                                                */}
      {/* ========================================================================= */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingCategory ? "Edit Task Category" : "Add Task Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category Name *</label>
              <Input
                placeholder="e.g. Taxation & Compliance, Audit & Assurance"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category Code</label>
                <Input
                  placeholder="e.g. TAX, AUDIT"
                  value={catCode}
                  onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Theme Color</label>
                <select
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="violet">Violet</option>
                  <option value="sky">Sky Blue</option>
                  <option value="emerald">Emerald Green</option>
                  <option value="amber">Amber / Orange</option>
                  <option value="rose">Rose Red</option>
                  <option value="slate">Slate Gray</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Scope of services, compliance activities, and engagement types..."
                value={catDesc}
                onChange={(e) => setCatDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-neutral-900 hover:bg-black text-white">
                {editingCategory ? "Save Changes" : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUB-CATEGORY (COLUMN)                                   */}
      {/* ========================================================================= */}
      <Dialog open={isSubCategoryModalOpen} onOpenChange={setIsSubCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingSubCategory
                ? "Edit Sub-group Column"
                : `Add Sub-group Column to "${selectedCategory?.name}"`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSubCategory} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sub-group Column Name *</label>
              <Input
                placeholder="e.g. Statutory Financial Audit, Tax Audit (Form 3CD)"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sub-group Code</label>
              <Input
                placeholder="e.g. STAT, 3CD, GST, IT"
                value={subCode}
                onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Description of deliverables and workflows in this sub-group..."
                value={subDesc}
                onChange={(e) => setSubDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSubCategoryModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-neutral-900 hover:bg-black text-white">
                {editingSubCategory ? "Save Changes" : "Add Column"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: CREATE DELIVERABLE TASK                                            */}
      {/* ========================================================================= */}
      {!isEmployee && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg rounded-[24px] border-[1.5px] border-slate-300">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Create Deliverable Task
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateTask} className="space-y-4 py-2">
              {/* Category & Sub-group assignment selector */}
              {selectedCategory && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Category</label>
                    <div className="h-10 rounded-xl bg-slate-100 border border-slate-300 px-3 flex items-center text-xs font-bold text-slate-800">
                      {selectedCategory.name}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Sub-group Column *</label>
                    <select
                      value={modalSubCategoryId}
                      onChange={(e) => setModalSubCategoryId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                    >
                      {subCategories.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code || "SUB"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                <Input
                  placeholder="e.g. Scrutinize 26AS TDS credits against General Ledger"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Parent Project *</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                  required
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Assignee</label>
                  <select
                    value={assignedEmployeeId}
                    onChange={(e) => setAssignedEmployeeId(e.target.value)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Initial Status</label>
                  <select
                    value={initialStatus}
                    onChange={(e) => setInitialStatus(e.target.value as TaskStatus)}
                    className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
                  >
                    {statusNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Due Date</label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Subtasks Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">
                    Subtasks ({draftSubtasks.length})
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Optional checklist</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Request 26AS portal download from client"
                    value={draftSubtaskInput}
                    onChange={(e) => setDraftSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDraftSubtask();
                      }
                    }}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddDraftSubtask}
                    className="shrink-0 text-xs"
                  >
                    Add
                  </Button>
                </div>

                {draftSubtasks.length > 0 && (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pt-1">
                    {draftSubtasks.map((st, idx) => (
                      <div
                        key={`${st}-${idx}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs"
                      >
                        <span className="font-medium text-slate-800 truncate">
                          {idx + 1}. {st}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDraftSubtask(idx)}
                          className="text-rose-600 hover:underline text-[11px] font-bold shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">
                  Work Instructions &amp; Checkpoints
                </label>
                <Textarea
                  placeholder="Specific guidance, reference sections, source documents..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-neutral-900 hover:bg-black text-white">
                  Create Task
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Task Overview / Detail Dialog */}
      <TaskDetailDialog
        taskId={activeTaskId}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUpdated={() => setTick((t) => t + 1)}
        readOnly={isEmployee}
      />

      {/* ========================================================================= */}
      {/* DOUBLE-VERIFICATION DELETE CONFIRMATION DIALOG                            */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmInput("");
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300 p-6 sm:p-7">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-extrabold text-[#111827]">
                  {deleteTarget?.type === "category"
                    ? "Delete Practice Category"
                    : deleteTarget?.type === "sub-category"
                    ? "Delete Sub-group"
                    : "Delete Task"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium">
                  This action is permanent and cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteTarget?.description || `Are you sure you want to delete "${deleteTarget?.name}"?`}
            </p>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
              <p className="text-xs font-semibold text-rose-900">
                To confirm deletion, please type the title below:
              </p>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-xs font-mono font-extrabold text-rose-800 select-all break-all shadow-xs">
                {deleteTarget?.name}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Type Title to Verify</label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={`Type "${deleteTarget?.name}" to confirm`}
                className="text-xs h-10 rounded-xl border-slate-300 font-medium focus-visible:ring-rose-500"
                autoFocus
              />
              {deleteConfirmInput && !isDeleteMatch && (
                <p className="text-[11px] font-semibold text-rose-600">
                  Title does not match. Please type it exactly as shown above.
                </p>
              )}
              {isDeleteMatch && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Title verified. Ready to delete.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 sm:justify-end pt-4 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteTarget(null);
                setDeleteConfirmInput("");
              }}
              className="rounded-xl border-slate-300 text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!isDeleteMatch}
              onClick={handleExecuteDelete}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>
                Delete{" "}
                {deleteTarget?.type === "category"
                  ? "Category"
                  : deleteTarget?.type === "sub-category"
                  ? "Sub-group"
                  : "Task"}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TasksPage() {
  return (
    <React.Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">Loading tasks board...</div>
      }
    >
      <TasksContent />
    </React.Suspense>
  );
}
