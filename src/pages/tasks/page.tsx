import React, { useEffect, useState } from "react";
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
  MoreVertical,
  Pencil,
  CheckCircle2,
  FolderPlus,
  Clock,
  Sparkles,
  GitBranch,
  Filter,
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isTaskAssignedToEmployee,
  isClientAssignedToEmployee,
} from "@/lib/access";
import { formatDate } from "@/lib/utils";
import {
  Task,
  TaskStatus,
  ProjectPriority,
  TaskCategory,
  TaskSubCategory,
} from "@/types";
import { toast } from "sonner";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

// Pastel colors for status badges matching user's reference screenshot
function getStatusBadgeStyle(status: string) {
  const s = (status || "").toLowerCase().trim();
  if (s.includes("approval") || s.includes("pending")) {
    return "bg-pink-100 text-pink-700 border-pink-200 hover:bg-pink-200";
  }
  if (s.includes("hold") || s.includes("action") || s.includes("blocked")) {
    return "bg-cyan-100 text-cyan-800 border-cyan-200 hover:bg-cyan-200";
  }
  if (s.includes("open") || s.includes("todo") || s.includes("to do")) {
    return "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200";
  }
  if (s.includes("progress")) {
    return "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
  }
  if (s.includes("complete") || s.includes("done")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200";
  }
  if (s.includes("review")) {
    return "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200";
  }
  return "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200";
}

// Top accent borders for sub-group columns
const COLUMN_ACCENTS = [
  "border-t-teal-400",
  "border-t-lime-500",
  "border-t-amber-500",
  "border-t-sky-500",
  "border-t-violet-500",
  "border-t-pink-500",
  "border-t-indigo-500",
  "border-t-emerald-500",
];

function TasksContent() {
  const [searchParams] = useSearchParams();
  const autoCreate = searchParams.get("create") === "true";

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const [tick, setTick] = useState(0);
  void tick;

  // Selected Category filter ("ALL" or specific category ID)
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");

  // Drag & drop state (dragging task between sub-group columns)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverSubId, setDragOverSubId] = useState<string | null>(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(autoCreate && !isEmployee);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Inline Quick Task Adder inputs per sub-group column { [subCategoryId]: string }
  const [inlineTaskInputs, setInlineTaskInputs] = useState<Record<string, string>>({});

  // Add / Edit Sub-category Modal
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<{
    sub: TaskSubCategory;
    categoryId: string;
  } | null>(null);
  const [targetCategoryIdForNewSub, setTargetCategoryIdForNewSub] = useState<string>("");
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subDesc, setSubDesc] = useState("");

  // Add / Edit Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [catName, setCatName] = useState("");
  const [catCode, setCatCode] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [catColor, setCatColor] = useState("violet");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const categories = pmsStore.getTaskCategories();
  const allTasks = pmsStore.getTasks();
  const projects = pmsStore.getProjects();
  const allClients = pmsStore.getClients();
  const allEngagements = pmsStore.getAllEngagements();
  const employees = pmsStore.getEmployees();
  const taskStatuses = pmsStore.getTaskStatuses();
  const statusNames = taskStatuses.map((s) => s.label);

  const tasks = isEmployee
    ? allTasks.filter((t) => isTaskAssignedToEmployee(t, empId))
    : allTasks;
  const clients = isEmployee
    ? allClients.filter((c) =>
        isClientAssignedToEmployee(c, empId, projects, allTasks, allEngagements)
      )
    : allClients;

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [targetSubIdForNewTask, setTargetSubIdForNewTask] = useState<string>("");
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

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Flatten all sub-categories across the selected category (or all categories)
  const visibleSubCategories = React.useMemo(() => {
    const list: Array<{ sub: TaskSubCategory; category: TaskCategory }> = [];
    categories.forEach((cat) => {
      if (selectedCategoryFilter !== "ALL" && cat.id !== selectedCategoryFilter) return;
      (cat.sub_categories || []).forEach((sub) => {
        list.push({ sub, category: cat });
      });
    });
    return list;
  }, [categories, selectedCategoryFilter]);

  // Filter tasks based on search, client, status, and assignee
  const matchesTaskFilters = (t: Task) => {
    const proj = projects.find((p) => p.id === t.project_id);
    const matchesSearch =
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
      (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.assigned_employee_name &&
        t.assigned_employee_name.toLowerCase().includes(search.toLowerCase()));

    const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter;
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    const matchesAssignee =
      assigneeFilter === "ALL" || t.assigned_employee_id === assigneeFilter;

    return matchesSearch && matchesClient && matchesStatus && matchesAssignee;
  };

  const handleOpenDetail = (taskId: string) => {
    setActiveTaskId(taskId);
    setIsDetailOpen(true);
  };

  // Inline Quick Task Add directly from column header input
  const handleInlineTaskCreate = (sub: TaskSubCategory, cat: TaskCategory) => {
    const title = (inlineTaskInputs[sub.id] || "").trim();
    if (!title) return;

    const parentProj = projects[0];
    if (!parentProj) {
      toast.error("Please create at least one project first.");
      return;
    }

    const created = pmsStore.addTask({
      title,
      project_id: parentProj.id,
      project_name: parentProj.project_name,
      category_id: cat.id,
      category_name: cat.name,
      sub_category_id: sub.id,
      sub_category_name: sub.name,
      assigned_employee_id: employees[0]?.id,
      assigned_employee_name: employees[0]?.full_name,
      priority: "Medium",
      status: "Open",
      due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      description: `Deliverable task under ${sub.name}`,
      created_by: currentUser.id,
      created_by_name: currentUser.full_name,
    });

    setInlineTaskInputs((prev) => ({ ...prev, [sub.id]: "" }));
    toast.success(`Task ${created.task_code} added to ${sub.name}`);
  };

  // Drag and Drop between Sub-group columns
  const handleDropOnSubCategory = (targetSub: TaskSubCategory, targetCat: TaskCategory) => {
    if (isEmployee || !draggingTaskId) return;
    const dragged = tasks.find((t) => t.id === draggingTaskId);
    setDraggingTaskId(null);
    setDragOverSubId(null);

    if (dragged && dragged.sub_category_id !== targetSub.id) {
      pmsStore.updateTask(dragged.id, {
        sub_category_id: targetSub.id,
        sub_category_name: targetSub.name,
        category_id: targetCat.id,
        category_name: targetCat.name,
      });
      toast.success(`Moved ${dragged.task_code} to "${targetSub.name}"`);
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    pmsStore.updateTaskStatus(taskId, newStatus);
    toast.success(`Task status updated to ${newStatus}`);
  };

  const handleCreateTaskModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!projectId) {
      toast.error("Please select a parent project.");
      return;
    }

    // Resolve target sub-category and category
    let targetSub: TaskSubCategory | undefined;
    let targetCat: TaskCategory | undefined;

    if (targetSubIdForNewTask) {
      for (const cat of categories) {
        const found = (cat.sub_categories || []).find((s) => s.id === targetSubIdForNewTask);
        if (found) {
          targetSub = found;
          targetCat = cat;
          break;
        }
      }
    }

    if (!targetSub && visibleSubCategories[0]) {
      targetSub = visibleSubCategories[0].sub;
      targetCat = visibleSubCategories[0].category;
    }

    const proj = projects.find((p) => p.id === projectId);
    const emp = employees.find((e) => e.id === assignedEmployeeId);

    const created = pmsStore.addTask({
      title: taskTitle.trim(),
      project_id: projectId,
      project_name: proj?.project_name,
      category_id: targetCat?.id,
      category_name: targetCat?.name,
      sub_category_id: targetSub?.id,
      sub_category_name: targetSub?.name,
      assigned_employee_id: assignedEmployeeId,
      assigned_employee_name: emp?.full_name,
      priority,
      start_date: startDate,
      due_date: dueDate,
      status: initialStatus,
      description,
      created_by: currentUser.id,
      created_by_name: currentUser.full_name,
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
      `Task ${created.task_code} created under ${targetSub?.name || "General"}`
    );
    setIsModalOpen(false);
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
  };

  // Add / Edit Sub-group
  const handleSaveSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim()) {
      toast.error("Please enter a sub-group name.");
      return;
    }

    const catId = editingSubCategory?.categoryId || targetCategoryIdForNewSub || categories[0]?.id;
    if (!catId) return;

    if (editingSubCategory) {
      pmsStore.updateTaskSubCategory(catId, editingSubCategory.sub.id, {
        name: subName.trim(),
        code: subCode.trim(),
        description: subDesc.trim(),
      });
      toast.success("Sub-group updated.");
    } else {
      const created = pmsStore.addTaskSubCategory(catId, {
        name: subName.trim(),
        code: subCode.trim(),
        description: subDesc.trim(),
      });
      toast.success(`Sub-group "${created?.name}" created.`);
    }

    setIsSubCategoryModalOpen(false);
    setEditingSubCategory(null);
    setSubName("");
    setSubCode("");
    setSubDesc("");
  };

  const handleDeleteSubCategory = (sub: TaskSubCategory, catId: string) => {
    if (confirm(`Are you sure you want to delete sub-group column "${sub.name}"?`)) {
      pmsStore.deleteTaskSubCategory(catId, sub.id);
      toast.success("Sub-group deleted.");
    }
  };

  // Add / Edit Category
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

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PRIMARY ACTIONS                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Task Management Kanban
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Kanban columns organized by <strong>Sub-groups</strong>. Drag deliverable cards between sub-groups to reallocate or click to view details.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {!isEmployee && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSubCategory(null);
                  setTargetCategoryIdForNewSub(
                    selectedCategoryFilter !== "ALL" ? selectedCategoryFilter : categories[0]?.id || ""
                  );
                  setSubName("");
                  setSubCode("");
                  setSubDesc("");
                  setIsSubCategoryModalOpen(true);
                }}
                className="h-9 rounded-2xl border-slate-300 bg-white text-xs font-bold gap-1.5 shadow-xs"
              >
                <FolderPlus className="h-3.5 w-3.5 text-violet-600" />
                <span>Add Sub-group</span>
              </Button>

              <Button
                type="button"
                onClick={() => {
                  setTargetSubIdForNewTask(visibleSubCategories[0]?.sub.id || "");
                  setIsModalOpen(true);
                }}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold h-9"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY SELECTOR TABS BAR                                             */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-slate-200">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedCategoryFilter("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
              selectedCategoryFilter === "ALL"
                ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            All Categories ({categories.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-1.5 ${
                selectedCategoryFilter === cat.id
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                  : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="font-mono text-[10px] opacity-75">{cat.code}</span>
              <span>{cat.name}</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full border border-slate-200 font-semibold">
                {cat.sub_categories?.length || 0}
              </span>
            </button>
          ))}
        </div>

        {!isEmployee && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCategory(null);
              setCatName("");
              setCatCode("");
              setCatDesc("");
              setCatColor("violet");
              setIsCategoryModalOpen(true);
            }}
            className="h-8 px-2.5 rounded-xl text-slate-500 hover:text-slate-900 text-xs font-bold gap-1 shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Category</span>
          </Button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & ADVANCED FILTER STRIP                                         */}
      {/* ========================================================================= */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[22px] border-[1.5px] border-slate-300">
        <CardContent className="p-3.5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search tasks by title, code, client, or assignee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-slate-300 text-xs font-medium bg-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {statusNames.map((s) => (
                <option key={s} value={s}>
                  Status: {s}
                </option>
              ))}
            </select>

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name} ({c.client_code})
                </option>
              ))}
            </select>

            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Assignees</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>

            {(search || clientFilter !== "ALL" || statusFilter !== "ALL" || assigneeFilter !== "ALL") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setClientFilter("ALL");
                  setStatusFilter("ALL");
                  setAssigneeFilter("ALL");
                }}
                className="h-9 text-xs text-rose-600 font-bold hover:bg-rose-50"
              >
                Reset Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. SUB-GROUP KANBAN BOARD VIEW (EACH COLUMN = A SUB-GROUP)                */}
      {/* ========================================================================= */}
      {visibleSubCategories.length === 0 ? (
        <div className="rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
          <FolderPlus className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-extrabold text-[#111827]">
            No Sub-groups Found
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Create a sub-group column (e.g. General, GST Registrations, Company Incorporations) to organize tasks in a Kanban board.
          </p>
          {!isEmployee && (
            <Button
              onClick={() => {
                setEditingSubCategory(null);
                setTargetCategoryIdForNewSub(categories[0]?.id || "");
                setIsSubCategoryModalOpen(true);
              }}
              className="bg-neutral-900 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add First Sub-group</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto pb-6">
          <div className="grid grid-flow-col auto-cols-[minmax(330px,360px)] gap-4 items-start">
            {visibleSubCategories.map(({ sub, category: cat }, colIdx) => {
              const accentBorder = COLUMN_ACCENTS[colIdx % COLUMN_ACCENTS.length];
              const columnTasks = tasks.filter(
                (t) => t.sub_category_id === sub.id && matchesTaskFilters(t)
              );
              const isOver = dragOverSubId === sub.id;

              return (
                <div
                  key={sub.id}
                  onDragOver={(e) => {
                    if (isEmployee) return;
                    e.preventDefault();
                    setDragOverSubId(sub.id);
                  }}
                  onDragLeave={() => setDragOverSubId((prev) => (prev === sub.id ? null : prev))}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleDropOnSubCategory(sub, cat);
                  }}
                  className={`rounded-[22px] border-[1.5px] bg-[#f8fafc] flex flex-col max-h-[82vh] transition-all border-t-[5px] ${accentBorder} ${
                    isOver
                      ? "border-neutral-900 bg-slate-100/90 shadow-md scale-[1.01]"
                      : "border-slate-300 shadow-xs"
                  }`}
                >
                  {/* Column Header: Sub-group Name + Count + Quick Add / Options */}
                  <div className="p-3.5 bg-white border-b border-slate-200 rounded-t-[16px] space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <h2 className="text-sm font-extrabold text-[#111827] truncate">
                          {sub.name}
                        </h2>
                        <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 shrink-0">
                          {columnTasks.length}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {!isEmployee && (
                          <>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTargetSubIdForNewTask(sub.id);
                                setIsModalOpen(true);
                              }}
                              className="h-7 w-7 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              title="Add Task to this Sub-group"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingSubCategory({ sub, categoryId: cat.id });
                                    setSubName(sub.name);
                                    setSubCode(sub.code || "");
                                    setSubDesc(sub.description || "");
                                    setIsSubCategoryModalOpen(true);
                                  }}
                                  className="text-xs font-semibold gap-1.5"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span>Rename Sub-group</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSubCategory(sub, cat.id)}
                                  className="text-xs font-semibold text-rose-600 gap-1.5 focus:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Delete Sub-group</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick Task Creator input under header */}
                    {!isEmployee && (
                      <div className="relative">
                        <Input
                          placeholder="+ Task Title, @mention assignee..."
                          value={inlineTaskInputs[sub.id] || ""}
                          onChange={(e) =>
                            setInlineTaskInputs((prev) => ({
                              ...prev,
                              [sub.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleInlineTaskCreate(sub, cat);
                            }
                          }}
                          className="h-8 rounded-xl border-slate-200 bg-slate-50/70 text-xs placeholder:text-slate-400 focus:bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Column Body: Vertical Cards List */}
                  <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                    {columnTasks.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-[11px] text-slate-400">
                        {isEmployee ? "No tasks assigned here" : "Drop tasks here or add above"}
                      </div>
                    ) : (
                      columnTasks.map((task) => {
                        const parentProj = projects.find((p) => p.id === task.project_id);
                        const subtasks = task.subtasks || [];
                        const statusStyle = getStatusBadgeStyle(task.status);
                        const assigneeName = task.assigned_employee_name || "Unassigned";
                        const assigneeInitials = assigneeName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <div
                            key={task.id}
                            draggable={!isEmployee}
                            onDragStart={() => {
                              if (!isEmployee) setDraggingTaskId(task.id);
                            }}
                            onDragEnd={() => {
                              setDraggingTaskId(null);
                              setDragOverSubId(null);
                            }}
                            onClick={() => handleOpenDetail(task.id)}
                            className={`rounded-2xl border-[1.5px] border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-400 hover:shadow-sm transition-all space-y-2.5 cursor-pointer group ${
                              isEmployee ? "" : "active:cursor-grabbing"
                            }`}
                          >
                            {/* Card Top: Title */}
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-extrabold text-sm text-[#111827] leading-snug group-hover:text-violet-800 transition-colors">
                                {task.title}
                              </h3>

                              {!isEmployee && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    pmsStore.deleteTask(task.id);
                                    toast.success(`Deleted ${task.task_code}`);
                                  }}
                                  className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                                  title="Delete Task"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Card Middle: Status Badge + Assignee Pill */}
                            <div
                              className="flex items-center justify-between gap-2 flex-wrap pt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Status Badge Dropdown */}
                              {isEmployee ? (
                                <span
                                  className={`font-bold text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors ${statusStyle}`}
                                >
                                  {task.status}
                                </span>
                              ) : (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      className={`font-bold text-[11px] px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1 ${statusStyle}`}
                                    >
                                      <span>{task.status}</span>
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="w-36 rounded-xl">
                                    {statusNames.map((st) => (
                                      <DropdownMenuItem
                                        key={st}
                                        onClick={() => handleStatusChange(task.id, st)}
                                        className="text-xs font-semibold"
                                      >
                                        {st}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}

                              {/* Assignee Avatar + Name */}
                              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 max-w-[140px] truncate">
                                <div className="h-5 w-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold shrink-0">
                                  {assigneeInitials}
                                </div>
                                <span className="truncate">{assigneeName}</span>
                              </div>
                            </div>

                            {/* Card Bottom: Metadata (Subtasks, Comments, Project) */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                              <span className="truncate max-w-[160px]">
                                {parentProj?.client_name
                                  ? `${parentProj.client_name} • ${task.project_name || parentProj.project_name}`
                                  : task.task_code}
                              </span>

                              <div className="flex items-center gap-2 shrink-0">
                                {subtasks.length > 0 && (
                                  <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                    <GitBranch className="h-3 w-3 text-slate-400" />
                                    <span>{subtasks.length}</span>
                                  </span>
                                )}

                                <span className="inline-flex items-center gap-1 text-slate-600 font-semibold">
                                  <MessageSquare className="h-3 w-3 text-slate-400" />
                                  <span>{task.comments_count || 0}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}

            {/* End of Kanban: "+ Add Sub-group Column" card */}
            {!isEmployee && (
              <div
                onClick={() => {
                  setEditingSubCategory(null);
                  setTargetCategoryIdForNewSub(
                    selectedCategoryFilter !== "ALL" ? selectedCategoryFilter : categories[0]?.id || ""
                  );
                  setSubName("");
                  setSubCode("");
                  setSubDesc("");
                  setIsSubCategoryModalOpen(true);
                }}
                className="w-[280px] rounded-[22px] border-[1.5px] border-dashed border-slate-300 hover:border-neutral-900 bg-white/70 hover:bg-white p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-slate-500 hover:text-slate-900 group min-h-[160px]"
              >
                <div className="h-9 w-9 rounded-full bg-slate-100 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition-colors">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-xs font-extrabold">Add Sub-group Column</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUB-CATEGORY                                            */}
      {/* ========================================================================= */}
      <Dialog open={isSubCategoryModalOpen} onOpenChange={setIsSubCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingSubCategory ? "Edit Sub-group" : "Add Sub-group Column"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSubCategory} className="space-y-4 py-2">
            {!editingSubCategory && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Practice Category *</label>
                <select
                  value={targetCategoryIdForNewSub || categories[0]?.id || ""}
                  onChange={(e) => setTargetCategoryIdForNewSub(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sub-group Column Name *</label>
              <Input
                placeholder="e.g. General, GST Registrations, Company Incorporations"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sub-group Code</label>
              <Input
                placeholder="e.g. GEN, GST, INCORP"
                value={subCode}
                onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Description of deliverables managed in this sub-group..."
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
                {editingSubCategory ? "Save Changes" : "Create Column"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT CATEGORY                                                */}
      {/* ========================================================================= */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingCategory ? "Edit Task Category" : "Add Practice Category"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveCategory} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Category Name *</label>
              <Input
                placeholder="e.g. General Practice, Taxation & Compliance"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Category Code</label>
                <Input
                  placeholder="e.g. GEN, TAX, AUDIT"
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
                placeholder="Scope of services and compliance deliverables..."
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

            <form onSubmit={handleCreateTaskModalSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Sub-group Column *</label>
                <select
                  value={targetSubIdForNewTask || visibleSubCategories[0]?.sub.id || ""}
                  onChange={(e) => setTargetSubIdForNewTask(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                  required
                >
                  {visibleSubCategories.map(({ sub, category: cat }) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({cat.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                <Input
                  placeholder="e.g. Sunlight Residency, Siddiq, Hydralilly"
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
                    Checklist Checklist / Subtasks ({draftSubtasks.length})
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium">Optional checklist</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Scrutinize 26AS, draft challan"
                    value={draftSubtaskInput}
                    onChange={(e) => setDraftSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (draftSubtaskInput.trim()) {
                          setDraftSubtasks((prev) => [...prev, draftSubtaskInput.trim()]);
                          setDraftSubtaskInput("");
                        }
                      }
                    }}
                    className="text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      if (draftSubtaskInput.trim()) {
                        setDraftSubtasks((prev) => [...prev, draftSubtaskInput.trim()]);
                        setDraftSubtaskInput("");
                      }
                    }}
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
                          onClick={() => setDraftSubtasks((prev) => prev.filter((_, i) => i !== idx))}
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
                  Work Instructions &amp; Guidance
                </label>
                <Textarea
                  placeholder="Task guidance, attachments requirement..."
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
