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
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  FolderTree,
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
import { getStyleForColor } from "@/lib/task-status-styles";
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

// Distinct pastel accent colors for Sub-group column headers (matching the requested design)
const SUB_GROUP_ACCENTS = [
  { bar: "bg-cyan-500", text: "text-cyan-700", border: "border-t-cyan-500" },
  { bar: "bg-lime-500", text: "text-lime-700", border: "border-t-lime-500" },
  { bar: "bg-orange-500", text: "text-orange-700", border: "border-t-orange-500" },
  { bar: "bg-violet-500", text: "text-violet-700", border: "border-t-violet-500" },
  { bar: "bg-sky-500", text: "text-sky-700", border: "border-t-sky-500" },
  { bar: "bg-rose-500", text: "text-rose-700", border: "border-t-rose-500" },
  { bar: "bg-emerald-500", text: "text-emerald-700", border: "border-t-emerald-500" },
  { bar: "bg-amber-500", text: "text-amber-700", border: "border-t-amber-500" },
];

// Soft pastel status pill styles (similar to the screenshot: Open, Approval pending, Kiruba Action, In Progress, etc.)
function getStatusBadgeStyle(status: string) {
  const s = status.toLowerCase();
  if (s.includes("open") || s.includes("todo") || s.includes("to do")) {
    return "bg-orange-100 text-orange-800 border-orange-200";
  }
  if (s.includes("approval") || s.includes("pending")) {
    return "bg-pink-100 text-pink-800 border-pink-200";
  }
  if (s.includes("action") || s.includes("review")) {
    return "bg-cyan-100 text-cyan-800 border-cyan-200";
  }
  if (s.includes("progress") || s.includes("active")) {
    return "bg-blue-100 text-blue-800 border-blue-200";
  }
  if (s.includes("hold") || s.includes("blocked")) {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (s.includes("completed") || s.includes("done")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  return "bg-slate-100 text-slate-800 border-slate-200";
}

function TasksContent() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategoryParam = searchParams.get("category");
  const autoCreate = searchParams.get("create") === "true";

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const [tick, setTick] = useState(0);
  void tick;

  const categories = pmsStore.getTaskCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    initialCategoryParam && categories.some((c) => c.id === initialCategoryParam)
      ? initialCategoryParam
      : categories[0]?.id || "cat-tax"
  );

  // Filters & Search
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");

  // Drag & drop state (moving tasks between Sub-group columns)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverSubGroupId, setDragOverSubGroupId] = useState<string | null>(null);

  // Quick inline task creation per sub-group column
  const [quickInputs, setQuickInputs] = useState<Record<string, string>>({});
  const [activeQuickInputSubId, setActiveQuickInputSubId] = useState<string | null>(null);

  // Detail Modal & Full Create Modal
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(autoCreate && !isEmployee);
  const [createTaskTargetSubId, setCreateTaskTargetSubId] = useState<string>("");

  // Sub-category Add / Edit Modal
  const [isSubCategoryModalOpen, setIsSubCategoryModalOpen] = useState(false);
  const [editingSubCategory, setEditingSubCategory] = useState<TaskSubCategory | null>(null);
  const [subName, setSubName] = useState("");
  const [subCode, setSubCode] = useState("");
  const [subDesc, setSubDesc] = useState("");

  // Category Add / Edit Modal
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

  // Sync category change to URL
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("category", catId);
    setSearchParams(nextParams, { replace: true });
  };

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

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) || categories[0];
  const subCategories: TaskSubCategory[] = selectedCategory?.sub_categories || [];

  // Filter tasks belonging to the active Category
  const categoryTasks = tasks.filter((t) => t.category_id === selectedCategory?.id);

  // Full Task Form State
  const [taskTitle, setTaskTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(employees[0]?.id || "");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");
  const [initialStatus, setInitialStatus] = useState<TaskStatus>(
    pmsStore.getDefaultStatusName()
  );
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

  // Open Task Overview Dialog
  const handleOpenDetail = (taskId: string) => {
    setActiveTaskId(taskId);
    setIsDetailOpen(true);
  };

  // Drag and Drop: Moving a task from one Sub-group column to another
  const handleDropOnSubGroup = (targetSub: TaskSubCategory) => {
    if (!draggingTaskId) return;
    const task = tasks.find((t) => t.id === draggingTaskId);
    setDraggingTaskId(null);
    setDragOverSubGroupId(null);

    if (task && task.sub_category_id !== targetSub.id) {
      pmsStore.updateTask(task.id, {
        sub_category_id: targetSub.id,
        sub_category_name: targetSub.name,
        category_id: selectedCategory.id,
        category_name: selectedCategory.name,
      });
      toast.success(`Moved "${task.title}" to ${targetSub.name}`);
    }
  };

  // Quick Inline Task Creator on column header
  const handleQuickAddTask = (subId: string, subName: string) => {
    const title = (quickInputs[subId] || "").trim();
    if (!title) return;

    const parentProj = projects[0];
    const defaultAssignee = employees[0];
    const today = new Date().toISOString().slice(0, 10);
    const inAWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    pmsStore.addTask({
      title,
      project_id: parentProj?.id || "default",
      project_name: parentProj?.project_name,
      category_id: selectedCategory.id,
      category_name: selectedCategory.name,
      sub_category_id: subId,
      sub_category_name: subName,
      assigned_employee_id: defaultAssignee?.id,
      assigned_employee_name: defaultAssignee?.full_name,
      priority: "Medium",
      start_date: today,
      due_date: inAWeek,
      status: pmsStore.getDefaultStatusName(),
      description: `Task in ${selectedCategory.name} → ${subName}`,
      created_by: currentUser.id,
      created_by_name: currentUser.full_name,
    });

    setQuickInputs({ ...quickInputs, [subId]: "" });
    toast.success(`Created task "${title}" in ${subName}`);
  };

  // Full Task Create Dialog Handler
  const handleCreateFullTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    if (!projectId) {
      toast.error("Please select a parent project.");
      return;
    }

    const targetSub = subCategories.find((s) => s.id === createTaskTargetSubId) || subCategories[0];
    const proj = projects.find((p) => p.id === projectId);
    const emp = employees.find((e) => e.id === assignedEmployeeId);

    const created = pmsStore.addTask({
      title: taskTitle.trim(),
      project_id: projectId,
      project_name: proj?.project_name,
      category_id: selectedCategory?.id,
      category_name: selectedCategory?.name,
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

    toast.success(`Task ${created.task_code} created in ${targetSub?.name}.`);
    setIsCreateTaskModalOpen(false);
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
  };

  // Change Task Status inline
  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    pmsStore.updateTaskStatus(taskId, newStatus);
    toast.success(`Status updated to "${newStatus}"`);
  };

  // Sub-category Modal Save
  const handleSaveSubCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    if (!subName.trim()) {
      toast.error("Please enter a sub-group name.");
      return;
    }

    if (editingSubCategory) {
      pmsStore.updateTaskSubCategory(selectedCategory.id, editingSubCategory.id, {
        name: subName.trim(),
        code: subCode.trim(),
        description: subDesc.trim(),
      });
      toast.success("Sub-group updated.");
    } else {
      const created = pmsStore.addTaskSubCategory(selectedCategory.id, {
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

  // Category Modal Save
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
      setSelectedCategoryId(created.id);
      toast.success(`Category "${created.name}" created.`);
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCatName("");
    setCatCode("");
    setCatDesc("");
  };

  // Filter tasks inside a sub-group column
  const getFilteredColumnTasks = (subId: string) => {
    return tasks.filter((t) => {
      if (t.sub_category_id !== subId) return false;

      // Status filter
      if (statusFilter !== "ALL" && t.status !== statusFilter) return false;

      // Client filter
      const proj = projects.find((p) => p.id === t.project_id);
      if (clientFilter !== "ALL" && proj?.client_id !== clientFilter) return false;

      // Assignee filter
      if (assigneeFilter !== "ALL" && t.assigned_employee_id !== assigneeFilter) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matches =
          t.title.toLowerCase().includes(q) ||
          t.task_code.toLowerCase().includes(q) ||
          (t.project_name && t.project_name.toLowerCase().includes(q)) ||
          (proj?.client_name && proj.client_name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================================= */}
      {/* 1. TOP HEADER & PRIMARY ACTIONS                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Task Management Engine
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Kanban board organized by <strong>Sub-groups</strong> under{" "}
            <span className="font-bold text-slate-800">{selectedCategory?.name}</span>. Drag deliverable cards between sub-groups.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isEmployee && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingSubCategory(null);
                  setSubName("");
                  setSubCode("");
                  setSubDesc("");
                  setIsSubCategoryModalOpen(true);
                }}
                className="h-9 rounded-xl border-slate-300 text-xs font-bold gap-1.5 bg-white text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                <span>Add Sub-group Column</span>
              </Button>

              <Button
                onClick={() => {
                  setCreateTaskTargetSubId(subCategories[0]?.id || "");
                  setIsCreateTaskModalOpen(true);
                }}
                size="sm"
                className="h-9 bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs font-bold text-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CATEGORY SWITCHER TABS BAR                                             */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 border-b border-slate-200">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            <span>Category:</span>
          </span>

          {categories.map((cat) => {
            const isSelected = cat.id === selectedCategoryId;
            const catTaskCount = tasks.filter((t) => t.category_id === cat.id).length;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                    : "bg-white text-slate-600 border-slate-300 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {catTaskCount}
                </span>
              </button>
            );
          })}
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
              setIsCategoryModalOpen(true);
            }}
            className="h-8 text-xs font-bold text-violet-700 hover:text-violet-900 hover:bg-violet-50 shrink-0 gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Category</span>
          </Button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER AND SEARCH BAR                                                  */}
      {/* ========================================================================= */}
      <Card className="shadow-xs rounded-[22px] border-[1.5px] border-slate-300">
        <CardContent className="p-3.5 flex flex-col md:flex-row gap-3 items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder={`Search ${selectedCategory?.name} tasks by title, code, client...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 rounded-xl border-slate-300 text-xs font-medium bg-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Statuses ({statusNames.length})</option>
              {statusNames.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            {/* Client Filter */}
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

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-9 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Assignees ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 4. SUB-GROUPS KANBAN BOARD (COLUMNS = SUB-GROUPS)                         */}
      {/* ========================================================================= */}
      <div className="flex gap-4 overflow-x-auto pb-6 items-start">
        {subCategories.length === 0 ? (
          <div className="w-full rounded-[24px] border-[1.5px] border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-extrabold text-[#111827]">
              No Sub-groups in &ldquo;{selectedCategory?.name}&rdquo;
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add sub-group columns (e.g. GST Registrations, Company Incorporations, General) to manage deliverables side-by-side.
            </p>
            {!isEmployee && (
              <Button
                onClick={() => {
                  setEditingSubCategory(null);
                  setSubName("");
                  setSubCode("");
                  setSubDesc("");
                  setIsSubCategoryModalOpen(true);
                }}
                className="bg-neutral-900 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add First Sub-group Column</span>
              </Button>
            )}
          </div>
        ) : (
          subCategories.map((sub, colIdx) => {
            const columnTasks = getFilteredColumnTasks(sub.id);
            const accent = SUB_GROUP_ACCENTS[colIdx % SUB_GROUP_ACCENTS.length];
            const isOver = dragOverSubGroupId === sub.id;

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
                  handleDropOnSubGroup(sub);
                }}
                className={`w-[330px] shrink-0 rounded-[22px] border-[1.5px] bg-[#f8fafc] flex flex-col max-h-[82vh] transition-all shadow-xs ${
                  isOver
                    ? "border-neutral-900 bg-slate-200/90 ring-2 ring-neutral-900/10"
                    : "border-slate-300"
                }`}
              >
                {/* Thin Colored Top Accent Line (matching requested reference image) */}
                <div className={`h-1.5 w-full rounded-t-[20px] ${accent.bar}`} />

                {/* Sub-group Column Header */}
                <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h2 className="text-sm font-extrabold text-[#111827] truncate">
                      {sub.name}
                    </h2>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                      {columnTasks.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {!isEmployee && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setCreateTaskTargetSubId(sub.id);
                          setIsCreateTaskModalOpen(true);
                        }}
                        className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        title="Add Task to this Sub-group"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    )}

                    {!isEmployee && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingSubCategory(sub);
                              setSubName(sub.name);
                              setSubCode(sub.code || "");
                              setSubDesc(sub.description || "");
                              setIsSubCategoryModalOpen(true);
                            }}
                            className="text-xs gap-2 font-medium"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Rename Sub-group</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (
                                confirm(
                                  `Delete sub-group "${sub.name}"? Tasks inside it will need to be reassigned.`
                                )
                              ) {
                                pmsStore.deleteTaskSubCategory(selectedCategory.id, sub.id);
                                toast.success("Sub-group deleted.");
                              }
                            }}
                            className="text-xs gap-2 font-medium text-rose-600 focus:text-rose-700"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete Sub-group</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>

                {/* Inline Quick Add Input (matching screenshot: + Task Title, @mention assignee 👤 ↗) */}
                {!isEmployee && (
                  <div className="p-2.5 pb-0">
                    <div className="relative flex items-center">
                      <Input
                        placeholder="+ Task Title, @mention assignee"
                        value={quickInputs[sub.id] || ""}
                        onChange={(e) =>
                          setQuickInputs({ ...quickInputs, [sub.id]: e.target.value })
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleQuickAddTask(sub.id, sub.name);
                          }
                        }}
                        className="h-9 rounded-xl bg-white border-slate-300 text-xs placeholder:text-slate-400 pr-16 shadow-2xs focus-visible:ring-1 focus-visible:ring-slate-400"
                      />
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                        {(quickInputs[sub.id] || "").trim() ? (
                          <button
                            type="button"
                            onClick={() => handleQuickAddTask(sub.id, sub.name)}
                            className="h-6 px-1.5 rounded-md bg-neutral-900 text-white flex items-center justify-center text-[10px] font-bold"
                            title="Save Task"
                          >
                            ↵
                          </button>
                        ) : (
                          <>
                            <User className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                            <button
                              type="button"
                              onClick={() => {
                                setCreateTaskTargetSubId(sub.id);
                                setIsCreateTaskModalOpen(true);
                              }}
                              className="h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700"
                              title="Full task details"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Cards Column Body */}
                <div className="p-2.5 space-y-2.5 overflow-y-auto flex-1">
                  {columnTasks.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 py-8 text-center text-[11px] text-slate-400">
                      {isEmployee
                        ? "No tasks in this sub-group"
                        : "Drop deliverable card here"}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const parentProj = projects.find((p) => p.id === task.project_id);
                      const subtasks = task.subtasks || [];
                      const commentsCount = task.comments_count || 0;
                      const statusStyle = getStatusBadgeStyle(task.status);
                      const assigneeInitial = (task.assigned_employee_name || "U")[0]?.toUpperCase();

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
                          onClick={() => handleOpenDetail(task.id)}
                          className={`rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-400 hover:shadow-xs transition-all space-y-2.5 cursor-pointer group ${
                            isEmployee ? "" : "active:cursor-grabbing"
                          }`}
                        >
                          {/* Task Title & Code */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-[13px] text-[#111827] leading-snug group-hover:text-violet-700 transition-colors">
                                {task.title}
                              </h4>
                              {parentProj?.client_name && (
                                <p className="text-[10px] font-semibold text-slate-400 mt-0.5 truncate">
                                  {parentProj.client_name}
                                </p>
                              )}
                            </div>
                            <span className="font-mono text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded shrink-0">
                              {task.task_code}
                            </span>
                          </div>

                          {/* Middle Row: Status Tag & Assignee Avatar (Matching Screenshot) */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            {/* Status Tag Pill */}
                            <div onClick={(e) => e.stopPropagation()}>
                              {isEmployee ? (
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusStyle}`}
                                >
                                  {task.status}
                                </span>
                              ) : (
                                <select
                                  value={task.status}
                                  onChange={(e) =>
                                    handleStatusChange(task.id, e.target.value as TaskStatus)
                                  }
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer focus:outline-none ${statusStyle}`}
                                >
                                  {statusNames.map((st) => (
                                    <option key={st} value={st}>
                                      {st}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>

                            {/* Assignee Avatar + Short Name */}
                            {task.assigned_employee_name ? (
                              <div
                                className="flex items-center gap-1.5 min-w-0"
                                title={`Assigned to ${task.assigned_employee_name}`}
                              >
                                <div className="h-5 w-5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 flex items-center justify-center text-[9px] font-extrabold shrink-0">
                                  {assigneeInitial}
                                </div>
                                <span className="text-[10px] font-medium text-slate-600 truncate max-w-[85px]">
                                  {task.assigned_employee_name.split(" ")[0]}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">
                                Unassigned
                              </span>
                            )}
                          </div>

                          {/* Bottom Stats: Subtasks & Comments (like Babjee Partnership ⑂ 2 · 💬 1) */}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500">
                            <div className="flex items-center gap-3">
                              {subtasks.length > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 font-semibold text-slate-600"
                                  title={`${subtasks.length} Subtasks`}
                                >
                                  <ListChecks className="h-3 w-3 text-slate-400" />
                                  <span>{subtasks.length}</span>
                                </span>
                              )}

                              {commentsCount > 0 && (
                                <span
                                  className="inline-flex items-center gap-1 font-semibold text-slate-600"
                                  title={`${commentsCount} Comments`}
                                >
                                  <MessageSquare className="h-3 w-3 text-sky-500" />
                                  <span>{commentsCount}</span>
                                </span>
                              )}
                            </div>

                            <span className="text-[9px] text-slate-400 font-mono">
                              {formatDate(task.due_date)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Far Right: "+ Add Sub-group Column" dashed card */}
        {!isEmployee && subCategories.length > 0 && (
          <div
            onClick={() => {
              setEditingSubCategory(null);
              setSubName("");
              setSubCode("");
              setSubDesc("");
              setIsSubCategoryModalOpen(true);
            }}
            className="w-[260px] shrink-0 min-h-[180px] rounded-[22px] border-[1.5px] border-dashed border-slate-300 hover:border-slate-900 bg-white/60 hover:bg-white p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group text-slate-500 hover:text-slate-900"
          >
            <div className="h-9 w-9 rounded-xl bg-slate-100 group-hover:bg-neutral-900 group-hover:text-white flex items-center justify-center transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            <span className="text-xs font-extrabold">Add Sub-group</span>
            <span className="text-[10px] text-slate-400 text-center">
              Create a new deliverable column
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT SUB-GROUP COLUMN                                        */}
      {/* ========================================================================= */}
      <Dialog open={isSubCategoryModalOpen} onOpenChange={setIsSubCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-[24px] border-[1.5px] border-slate-300">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingSubCategory
                ? "Rename Sub-group Column"
                : `Add Sub-group Column to "${selectedCategory?.name}"`}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveSubCategory} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Sub-group Column Name *</label>
              <Input
                placeholder="e.g. GST Registrations, Company Incorporations, General"
                value={subName}
                onChange={(e) => setSubName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Short Code</label>
              <Input
                placeholder="e.g. GST, ROC, GEN"
                value={subCode}
                onChange={(e) => setSubCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Scope of deliverables in this sub-group column..."
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Short Code</label>
              <Input
                placeholder="e.g. TAX, AUDIT"
                value={catCode}
                onChange={(e) => setCatCode(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Scope of services and compliance practice..."
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
      {/* MODAL: FULL CREATE TASK DIALOG                                            */}
      {/* ========================================================================= */}
      {!isEmployee && (
        <Dialog open={isCreateTaskModalOpen} onOpenChange={setIsCreateTaskModalOpen}>
          <DialogContent className="max-w-lg rounded-[24px] border-[1.5px] border-slate-300">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Create Deliverable Task
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreateFullTask} className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Category</label>
                  <div className="h-10 rounded-xl bg-slate-100 border border-slate-200 px-3 flex items-center text-xs font-bold text-slate-800">
                    {selectedCategory?.name}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Sub-group Column *</label>
                  <select
                    value={createTaskTargetSubId || subCategories[0]?.id}
                    onChange={(e) => setCreateTaskTargetSubId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
                    required
                  >
                    {subCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Task Title *</label>
                <Input
                  placeholder="e.g. Sunlight Residency, Siddiq, Marutham"
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
                    placeholder="e.g. Collect PAN & Aadhaar documents"
                    value={draftSubtaskInput}
                    onChange={(e) => setDraftSubtaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const trimmed = draftSubtaskInput.trim();
                        if (trimmed) {
                          setDraftSubtasks([...draftSubtasks, trimmed]);
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
                      const trimmed = draftSubtaskInput.trim();
                      if (trimmed) {
                        setDraftSubtasks([...draftSubtasks, trimmed]);
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
                          onClick={() => setDraftSubtasks(draftSubtasks.filter((_, i) => i !== idx))}
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
                  Instructions &amp; Checkpoints
                </label>
                <Textarea
                  placeholder="Specific client instructions, filing checkpoints..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateTaskModalOpen(false)}
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

      {/* Full Task Detail Modal */}
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
