import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Plus,
  Users,
  UserCheck,
  Sparkles,
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
  Copy,
  ClipboardPaste,
  ArrowRightLeft,
  CheckSquare,
  Square,
  FolderInput,
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
  Task,
} from "@/types";
import { toast } from "sonner";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { WhatsAppChatDialog } from "@/components/whatsapp/whatsapp-chat-dialog";
import { EmployeeMultiSelect } from "@/components/tasks/employee-multi-select";

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
        badge: "bg-[#FAF8F5] text-[#201815] border-[#E2DACD]",
        iconBg: "bg-[#EFE8DC] text-[#201815]",
        border: "hover:border-[#201815]",
        accent: "text-[#201815]",
        bar: "bg-[#201815] text-[#FAF8F5]",
        columnBorder: "border-[#E2DACD] bg-[#FAF8F5]",
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
  const initialView = (searchParams.get("view") as "category" | "employee" | "status") || "category";
  const [viewMode, setViewMode] = useState<"category" | "employee" | "status">(initialView);
  const [dragOverEmployeeId, setDragOverEmployeeId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const updateViewMode = (mode: "category" | "employee" | "status") => {
    setViewMode(mode);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("view", mode);
    if (mode !== "category") {
      nextParams.delete("category");
      setSelectedCategoryId(null);
    }
    setSearchParams(nextParams, { replace: true });
  };

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
    code?: string;
    taskCode?: string;
    parentCategoryId?: string;
    description?: string;
  } | null>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");

  const normalizeVerifyString = (str: string) => {
    return (str || "")
      .toLowerCase()
      .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-") // em-dash, en-dash, minus to hyphen
      .replace(/\s+/g, " ") // collapse all whitespace
      .trim();
  };

  const isDeleteMatch = useMemo(() => {
    if (!deleteTarget || !deleteConfirmInput.trim()) return false;
    const inputNorm = normalizeVerifyString(deleteConfirmInput);
    const targetNorm = normalizeVerifyString(deleteTarget.name);

    // 1. Matches normalized title
    if (inputNorm === targetNorm) return true;

    // 2. Matches exact title
    if (deleteConfirmInput.trim().toLowerCase() === deleteTarget.name.trim().toLowerCase()) return true;

    // 3. Matches task code (e.g. "TSK-043" or "043")
    if (deleteTarget.taskCode) {
      const codeNorm = normalizeVerifyString(deleteTarget.taskCode);
      if (inputNorm === codeNorm) return true;
      if (inputNorm === codeNorm.replace("tsk-", "")) return true;
    }

    // 4. Matches category/sub-category code (e.g. "GEN" or "CAT")
    if (deleteTarget.code) {
      const codeNorm = normalizeVerifyString(deleteTarget.code);
      if (inputNorm === codeNorm) return true;
    }

    // 5. Matches just the word "delete" or "confirm"
    if (inputNorm === "delete" || inputNorm === "confirm") return true;

    return false;
  }, [deleteTarget, deleteConfirmInput]);

  // Scoped views inside an opened Category
  const [categoryViewMode, setCategoryViewMode] = useState<"sub-category" | "employee" | "status">("sub-category");
  const [innerSubCategoryFilter, setInnerSubCategoryFilter] = useState<string>("ALL");

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
  const MOCK_TASK_PREFIXES = ["tsk-gen-", "tsk-gst-", "tsk-inc-"];
  const allTasks = pmsStore
    .getTasks()
    .filter((t) => {
      if (t.category_id === "cat-general") return false;
      if (MOCK_TASK_PREFIXES.some((p) => t.id && t.id.startsWith(p))) return false;
      return true;
    });
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
  const [assignedEmployeeIds, setAssignedEmployeeIds] = useState<string[]>(employees[0]?.id ? [employees[0].id] : []);
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
  const [modalClientId, setModalClientId] = useState("");
  const [taskWhatsAppEnabled, setTaskWhatsAppEnabled] = useState(true);
  const [catWhatsAppEnabled, setCatWhatsAppEnabled] = useState(true);
  const [subWhatsAppEnabled, setSubWhatsAppEnabled] = useState(true);
  // Task Billing Integration
  const [isBillable, setIsBillable] = useState(false);
  const [billingAmount, setBillingAmount] = useState<number | "">("");
  const [billingDescription, setBillingDescription] = useState("");
  // Multi-selection & Clipboard state (Copy / Move / Paste)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [taskClipboard, setTaskClipboard] = useState<{
    taskIds: string[];
    mode: "copy" | "move";
  } | null>(null);

  // Dialog for Destination Selector ("Move / Copy to...")
  const [isMoveCopyModalOpen, setIsMoveCopyModalOpen] = useState(false);
  const [moveCopyTargetSubId, setMoveCopyTargetSubId] = useState("");
  const [moveCopyAction, setMoveCopyAction] = useState<"copy" | "move">("copy");

  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAllInSub = (subId: string) => {
    const sub = subCategories.find((s) => s.id === subId);
    const subTaskIds = categoryTasks
      .filter(
        (t) =>
          t.sub_category_id === subId ||
          (sub && t.sub_category_name && t.sub_category_name.toLowerCase() === sub.name.toLowerCase())
      )
      .map((t) => t.id);
    const allSelected = subTaskIds.length > 0 && subTaskIds.every((id) => selectedTaskIds.includes(id));
    if (allSelected) {
      setSelectedTaskIds((prev) => prev.filter((id) => !subTaskIds.includes(id)));
    } else {
      setSelectedTaskIds((prev) => Array.from(new Set([...prev, ...subTaskIds])));
    }
  };

  const handleCopySingleTask = (task: Task) => {
    setTaskClipboard({ taskIds: [task.id], mode: "copy" });
    toast.success(`Copied "${task.title}". Click "Paste Here" in any sub-category.`);
  };

  const handleMoveSingleTask = (task: Task) => {
    setTaskClipboard({ taskIds: [task.id], mode: "move" });
    toast.info(`Task "${task.title}" selected to move. Click "Move Here" in target sub-category.`);
  };

  const handleCopySelected = () => {
    if (selectedTaskIds.length === 0) return;
    setTaskClipboard({ taskIds: [...selectedTaskIds], mode: "copy" });
    toast.success(`Copied ${selectedTaskIds.length} tasks. Click "Paste Here" in any sub-category.`);
  };

  const handleMoveSelected = () => {
    if (selectedTaskIds.length === 0) return;
    setTaskClipboard({ taskIds: [...selectedTaskIds], mode: "move" });
    toast.info(`${selectedTaskIds.length} tasks selected to move. Click "Move Here" in target sub-category.`);
  };

  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const handleExecuteBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      const idsToDelete = [...selectedTaskIds];
      let deletedCount = 0;
      for (const id of idsToDelete) {
        await pmsStore.deleteTask(id);
        deletedCount++;
      }
      setSelectedTaskIds([]);
      setIsBulkDeleteModalOpen(false);
      toast.success(`Successfully moved ${deletedCount} task(s) to Recycle Bin.`);
      setTick((t) => t + 1);
    } catch (err: any) {
      toast.error(`Failed to delete selected tasks: ${err.message || err}`);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handlePasteOrMoveToSubCategory = (targetSubId: string, subName: string) => {
    if (!taskClipboard || taskClipboard.taskIds.length === 0) return;
    if (taskClipboard.mode === "copy") {
      const count = pmsStore.copyTasksToSubCategory(taskClipboard.taskIds, targetSubId);
      toast.success(`Successfully copied ${count} task(s) into ${subName}!`);
    } else {
      const count = pmsStore.moveTasksToSubCategory(taskClipboard.taskIds, targetSubId);
      toast.success(`Successfully moved ${count} task(s) into ${subName}!`);
    }
    setTaskClipboard(null);
    setSelectedTaskIds([]);
    setTick((t) => t + 1);
  };

  const handleExecuteModalMoveCopy = () => {
    if (!moveCopyTargetSubId) {
      toast.error("Please select a target sub-category destination");
      return;
    }
    const idsToProcess = selectedTaskIds.length > 0
      ? selectedTaskIds
      : taskClipboard?.taskIds || [];

    if (idsToProcess.length === 0) {
      toast.error("No tasks selected");
      return;
    }

    let destName = "sub-category";
    for (const cat of categories) {
      const found = (cat.sub_categories || []).find((s) => s.id === moveCopyTargetSubId);
      if (found) {
        destName = `${cat.name} → ${found.name}`;
        break;
      }
    }

    if (moveCopyAction === "copy") {
      const count = pmsStore.copyTasksToSubCategory(idsToProcess, moveCopyTargetSubId);
      toast.success(`Copied ${count} task(s) to ${destName}!`);
    } else {
      const count = pmsStore.moveTasksToSubCategory(idsToProcess, moveCopyTargetSubId);
      toast.success(`Moved ${count} task(s) to ${destName}!`);
    }

    setIsMoveCopyModalOpen(false);
    setSelectedTaskIds([]);
    setTaskClipboard(null);
    setTick((t) => t + 1);
  };

  const [whatsAppContext, setWhatsAppContext] = useState<{
    open: boolean;
    contextType?: "task" | "subtask" | "category" | "sub-category";
    task?: Task | null;
    category?: TaskCategory | null;
    subCategory?: TaskSubCategory | null;
  } | null>(null);

  useEffect(() => {
    if (!projectId && projects[0]?.id) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  // Tasks in currently selected Category
  const categoryTasks = useMemo(() => {
    if (!selectedCategory) return [];
    const catNameClean = selectedCategory.name.trim().toLowerCase();
    const catId = selectedCategory.id;
    return tasks.filter(
      (t) =>
        t.category_id === catId ||
        (t.category_name && t.category_name.trim().toLowerCase() === catNameClean) ||
        (t.category_id && t.category_id.trim().toLowerCase() === catNameClean)
    );
  }, [tasks, selectedCategory]);

  const handleOpenDetail = (taskId: string) => {
    setActiveTaskId(taskId);
    setIsDetailOpen(true);
  };

  const handleOpenCreateTaskForEmployee = (empId?: string) => {
    let defaultSubId = "";
    if (selectedCategory) {
      if (innerSubCategoryFilter && innerSubCategoryFilter !== "ALL") {
        defaultSubId = innerSubCategoryFilter;
      } else {
        defaultSubId = subCategories[0]?.id || "";
      }
    } else {
      defaultSubId = categories[0]?.sub_categories?.[0]?.id || "";
    }
    setModalSubCategoryId(defaultSubId);
    setTargetSubGroupIdForNewTask(defaultSubId);
    setModalClientId(clients[0]?.id || "");
    setAssignedEmployeeId(empId || employees[0]?.id || "");
    setAssignedEmployeeIds(empId ? [empId] : (employees[0]?.id ? [employees[0].id] : []));
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
    setIsModalOpen(true);
  };

  const handleOpenCreateTaskForStatus = (statusName?: string) => {
    let defaultSubId = "";
    if (selectedCategory) {
      if (innerSubCategoryFilter && innerSubCategoryFilter !== "ALL") {
        defaultSubId = innerSubCategoryFilter;
      } else {
        defaultSubId = subCategories[0]?.id || "";
      }
    } else {
      defaultSubId = categories[0]?.sub_categories?.[0]?.id || "";
    }
    setModalSubCategoryId(defaultSubId);
    setTargetSubGroupIdForNewTask(defaultSubId);
    setModalClientId(clients[0]?.id || "");
    setAssignedEmployeeIds(employees[0]?.id ? [employees[0].id] : []);
    if (statusName) setInitialStatus(statusName as TaskStatus);
    setTaskTitle("");
    setDescription("");
    setDraftSubtaskInput("");
    setDraftSubtasks([]);
    setIsModalOpen(true);
  };

  const handleOpenCreateTaskForSubGroup = (subId?: string) => {
    const defaultSubId = subId || (innerSubCategoryFilter !== "ALL" ? innerSubCategoryFilter : subCategories[0]?.id) || "";
    setModalSubCategoryId(defaultSubId);
    setTargetSubGroupIdForNewTask(defaultSubId);
    setModalClientId(clients[0]?.id || "");
    setAssignedEmployeeIds(employees[0]?.id ? [employees[0].id] : []);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    const chosenClient = clients.find((c) => c.id === modalClientId);
    let chosenProjectId = projectId;

    if (chosenClient) {
      let clientProj = projects.find((p) => p.client_id === chosenClient.id);
      if (!clientProj) {
        clientProj = (await pmsStore.ensureClientProject(chosenClient.id)) || undefined;
      }
      if (clientProj) {
        chosenProjectId = clientProj.id;
      }
    }

    if (!chosenProjectId) {
      toast.error("Please select an allotted client or parent project.");
      return;
    }

    const proj = projects.find((p) => p.id === chosenProjectId);
    const selectedEmps = employees.filter((e) => assignedEmployeeIds.includes(e.id));
    const primaryEmp = selectedEmps[0] || employees.find((e) => e.id === assignedEmployeeId);
    const assignedNames = selectedEmps.length > 0
      ? selectedEmps.map((e) => e.full_name).join(", ")
      : primaryEmp?.full_name;
    const chosenSub = subCategories.find((s) => s.id === modalSubCategoryId) || subCategories[0];

    if (isBillable && (!billingAmount || Number(billingAmount) <= 0)) {
      toast.error("Please enter a valid billable amount in INR.");
      return;
    }

    try {
      const created = await pmsStore.addTask({
        title: taskTitle.trim(),
        project_id: chosenProjectId,
        project_name: proj?.project_name,
        client_id: chosenClient?.id,
        client_name: chosenClient?.client_name,
        category_id: selectedCategory?.id,
        category_name: selectedCategory?.name,
        sub_category_id: chosenSub?.id,
        sub_category_name: chosenSub?.name,
        assigned_employee_id: primaryEmp?.id,
        assigned_employee_name: assignedNames,
        assigned_employee_ids: assignedEmployeeIds.length > 0 ? assignedEmployeeIds : (primaryEmp ? [primaryEmp.id] : []),
        assigned_employees: selectedEmps.map((e) => ({
          id: e.id,
          full_name: e.full_name,
          designation: e.designation_name || e.employee_code,
          email: e.email,
        })),
        priority,
        start_date: startDate,
        due_date: dueDate,
        status: initialStatus,
        description,
        whatsapp_enabled: taskWhatsAppEnabled,
        created_by: pmsStore.getCurrentUser().id,
        created_by_name: pmsStore.getCurrentUser().full_name,
        is_billable: isBillable,
        billing_amount: isBillable ? Number(billingAmount) : 0,
        billing_description: billingDescription || undefined,
        currency: "INR",
      });

      const subtasksToAdd = [...draftSubtasks];
      if (draftSubtaskInput.trim()) {
        subtasksToAdd.push(draftSubtaskInput.trim());
      }
      for (const subTitle of subtasksToAdd) {
        await pmsStore.addSubtask(created.id, {
          title: subTitle,
          start_date: startDate,
          due_date: dueDate,
          assigned_employee_id: primaryEmp?.id,
          assigned_employee_name: assignedNames,
          whatsapp_enabled: taskWhatsAppEnabled,
        });
      }

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
      setIsBillable(false);
      setBillingAmount("");
      setBillingDescription("");
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to create task."}`);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await pmsStore.updateTaskStatus(taskId, newStatus);
      toast.success(`Task status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to update status."}`);
    }
  };

  // Category actions
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      toast.error("Please enter a category name.");
      return;
    }
    try {
      if (editingCategory) {
        await pmsStore.updateTaskCategory(editingCategory.id, {
          name: catName.trim(),
          code: catCode.trim(),
          description: catDesc.trim(),
          color: catColor,
          whatsapp_enabled: catWhatsAppEnabled,
        });
        toast.success("Category updated.");
      } else {
        const created = await pmsStore.addTaskCategory({
          name: catName.trim(),
          code: catCode.trim(),
          description: catDesc.trim(),
          color: catColor,
          whatsapp_enabled: catWhatsAppEnabled,
        });
        toast.success(`Category "${created.name}" created.`);
      }
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCatName("");
      setCatCode("");
      setCatDesc("");
      setCatWhatsAppEnabled(true);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to save category."}`);
    }
  };

  const handleDeleteCategory = (cat: TaskCategory) => {
    setDeleteTarget({
      type: "category",
      id: cat.id,
      name: cat.name,
      code: cat.code,
      description: `Are you sure you want to delete category "${cat.name}" and all its sub-groups? It will be safely moved to the Recycle Bin (25-day recovery window).`,
    });
    setDeleteConfirmInput("");
  };

  // Sub-category actions
  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;
    if (!subName.trim()) {
      toast.error("Please enter a sub-group name.");
      return;
    }
    try {
      if (editingSubCategory) {
        await pmsStore.updateTaskSubCategory(selectedCategoryId, editingSubCategory.id, {
          name: subName.trim(),
          code: subCode.trim(),
          description: subDesc.trim(),
          whatsapp_enabled: subWhatsAppEnabled,
        });
        toast.success("Sub-group updated.");
      } else {
        const created = await pmsStore.addTaskSubCategory(selectedCategoryId, {
          name: subName.trim(),
          code: subCode.trim(),
          description: subDesc.trim(),
          whatsapp_enabled: subWhatsAppEnabled,
        });
        toast.success(`Sub-group "${created?.name}" added to Kanban.`);
      }
      setIsSubCategoryModalOpen(false);
      setEditingSubCategory(null);
      setSubName("");
      setSubCode("");
      setSubDesc("");
      setSubWhatsAppEnabled(true);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to save sub-group."}`);
    }
  };

  const handleInlineSaveSubName = async (subId: string) => {
    if (!selectedCategoryId || !inlineSubName.trim()) {
      setInlineEditingSubId(null);
      return;
    }
    try {
      await pmsStore.updateTaskSubCategory(selectedCategoryId, subId, {
        name: inlineSubName.trim(),
      });
      setInlineEditingSubId(null);
      toast.success("Sub-group renamed.");
    } catch (err: any) {
      toast.error(`Failed to rename: ${err.message || err}`);
    }
  };

  const handleDeleteSubCategory = (sub: TaskSubCategory) => {
    if (!selectedCategoryId) return;
    setDeleteTarget({
      type: "sub-category",
      id: sub.id,
      name: sub.name,
      code: sub.code,
      parentCategoryId: selectedCategoryId,
      description: `Are you sure you want to delete sub-group "${sub.name}"? It and its deliverable tasks will be safely moved to the Recycle Bin (25-day recovery window).`,
    });
    setDeleteConfirmInput("");
  };

  const handleExecuteDelete = async () => {
    if (!deleteTarget || !isDeleteMatch) return;

    try {
      if (deleteTarget.type === "category") {
        await pmsStore.deleteTaskCategory(deleteTarget.id);
        if (selectedCategoryId === deleteTarget.id) {
          updateSelectedCategory(null);
        }
        toast.success(`Category "${deleteTarget.name}" moved to Recycle Bin.`);
      } else if (deleteTarget.type === "sub-category") {
        const parentId = deleteTarget.parentCategoryId || selectedCategoryId;
        if (parentId) {
          await pmsStore.deleteTaskSubCategory(parentId, deleteTarget.id);
          toast.success(`Sub-group "${deleteTarget.name}" moved to Recycle Bin.`);
        }
      } else if (deleteTarget.type === "task") {
        await pmsStore.deleteTask(deleteTarget.id);
        toast.success(`Task "${deleteTarget.name}" moved to Recycle Bin.`);
      }

      setDeleteTarget(null);
      setDeleteConfirmInput("");
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to delete item."}`);
    }
  };

  // Metrics
  const totalSubGroups = categories.reduce(
    (acc, cat) => acc + (cat.sub_categories?.length || 0),
    0
  );
  const totalActiveTasks = tasks.filter((t) => t.status !== "Completed").length;
  const totalCompletedTasks = tasks.filter((t) => t.status === "Completed").length;


  const renderCommonTaskCard = (
    task: Task,
    contextType: "sub-category" | "employee" | "status"
  ) => {
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
          setDragOverEmployeeId(null);
          setDragOverStatus(null);
        }}
        className={`rounded-2xl border-[1.5px] p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-neutral-900 transition-all space-y-2.5 ${
          selectedTaskIds.includes(task.id)
            ? "border-violet-600 ring-2 ring-violet-500/30 bg-violet-50/20"
            : "border-slate-300 bg-white"
        } ${
          isEmployee ? "" : "cursor-grab active:cursor-grabbing"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {!isEmployee && (
              <input
                type="checkbox"
                checked={selectedTaskIds.includes(task.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelectTask(task.id);
                }}
                className="h-3.5 w-3.5 rounded border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer shrink-0"
                title="Select Task"
              />
            )}
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

          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() =>
                setWhatsAppContext({
                  open: true,
                  contextType: "task",
                  task,
                })
              }
              className="h-6 w-6 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 shrink-0"
              title="Send WhatsApp Update for this Task"
            >
              <MessageSquare className="h-3 w-3 text-emerald-600" />
            </Button>

            {!isEmployee && (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCopySingleTask(task);
                  }}
                  className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
                  title="Copy Task (Paste into another sub-category)"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveSingleTask(task);
                  }}
                  className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 shrink-0"
                  title="Move Task (Move to another sub-category)"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setDeleteTarget({
                      type: "task",
                      id: task.id,
                      name: task.title,
                      taskCode: task.task_code,
                      description: `Are you sure you want to delete deliverable task ${task.task_code} ("${task.title}")? It will be safely moved to the Recycle Bin (25-day recovery window).`,
                    });
                    setDeleteConfirmInput("");
                  }}
                  className="h-6 w-6 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                  title="Delete Task"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
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
          {/* Client Allotment Display */}
          <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
            {task.client_name || parentProj?.client_name ? (
              <span className="font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1 truncate max-w-[85%]">
                <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
                <span className="truncate">{task.client_name || parentProj?.client_name}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenDetail(task.id);
                }}
                className="text-[10px] text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all"
                title="Click to allot client in task overview"
              >
                <Building2 className="h-2.5 w-2.5 text-amber-600" />
                <span>+ Allot Client</span>
              </button>
            )}
            <span className="text-[10px] text-slate-400 font-mono truncate">
              {task.project_name || parentProj?.project_name}
            </span>
          </div>

          {/* Billing Status Badge & Quick Bill Action */}
          {task.is_billable && (
            <div className="mt-1.5 flex items-center justify-between gap-1 text-[10px]">
              <span className={`px-2 py-0.5 rounded-md font-extrabold flex items-center gap-1 border ${
                task.billing_status === "Billed"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : task.billing_status === "Partially Billed"
                  ? "bg-sky-50 text-sky-800 border-sky-300"
                  : "bg-amber-50 text-amber-900 border-amber-300"
              }`}>
                <Receipt className="h-2.5 w-2.5" />
                <span>₹{(task.billing_amount || 0).toLocaleString("en-IN")} • {task.billing_status || "To Be Billed"}</span>
              </span>

              {pmsStore.isTaskEligibleForBilling(task) && (
                <Link
                  to={`/finance?tab=single-invoice&clientId=${task.client_id || ""}&taskId=${task.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] shadow-2xs"
                  title="Initiate Single Invoice for this billable deliverable"
                >
                  <span>Bill Task</span>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Category & Sub-category badge if not in sub-category view */}
        {contextType !== "sub-category" && (task.category_name || task.sub_category_name) && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className="font-semibold px-2 py-0.5 rounded-md bg-violet-50 text-violet-800 border border-violet-200 truncate">
              {task.category_name || "General"} {task.sub_category_name ? `→ ${task.sub_category_name}` : ""}
            </span>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 py-2 space-y-1 text-[11px] text-slate-600">
          <div className="flex items-center justify-between gap-2">
            {task.assigned_employees && task.assigned_employees.length > 1 ? (
              <span
                className="inline-flex items-center gap-1.5 truncate font-medium"
                title={task.assigned_employees.map((e) => e.full_name).join(", ")}
              >
                <div className="flex -space-x-1 overflow-hidden shrink-0">
                  {task.assigned_employees.slice(0, 3).map((emp, i) => (
                    <span
                      key={emp.id || i}
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-200 text-violet-800 text-[8px] font-bold ring-1 ring-white"
                    >
                      {emp.full_name?.slice(0, 1) || "E"}
                    </span>
                  ))}
                </div>
                <span className="truncate font-semibold text-slate-800">
                  {task.assigned_employees[0]?.full_name}
                  <span className="text-[10px] text-violet-700 ml-1">+{task.assigned_employees.length - 1}</span>
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 truncate font-medium">
                <User className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate">
                  {task.assigned_employee_name || "Unassigned"}
                </span>
              </span>
            )}
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
          {isEmployee || contextType === "status" ? (
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
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* 3 VISUAL DISPLAY MODES SELECTOR & BREADCRUMB                              */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 min-w-0">
          <button
            type="button"
            onClick={() => {
              updateViewMode("category");
            }}
            className={`flex items-center gap-1.5 transition-colors ${
              viewMode === "category" && !selectedCategoryId
                ? "text-[#111827] font-extrabold cursor-default"
                : "text-slate-600 hover:text-slate-900 hover:underline"
            }`}
          >
            <FolderTree className="h-4 w-4 text-violet-600 shrink-0" />
            <span>Tasks</span>
          </button>

          {viewMode === "category" && selectedCategory && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-[#111827] font-extrabold bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 truncate">
                <span className="truncate">{selectedCategory.name}</span>
              </span>
            </>
          )}

          {viewMode === "employee" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-sky-800 font-extrabold bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-sky-600" />
                <span>Employee-Wise Board</span>
              </span>
            </>
          )}

          {viewMode === "status" && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="text-emerald-800 font-extrabold bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <Columns3 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Status-Wise Pipeline</span>
              </span>
            </>
          )}
        </div>

        {/* 3 Visual Display Modes Segmented Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-300 shadow-xs">
            <button
              type="button"
              onClick={() => updateViewMode("category")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === "category"
                  ? "bg-white text-violet-950 shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FolderTree className={`h-3.5 w-3.5 ${viewMode === "category" ? "text-violet-600" : "text-slate-400"}`} />
              <span>1. Category Wise</span>
            </button>

            <button
              type="button"
              onClick={() => updateViewMode("employee")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === "employee"
                  ? "bg-white text-sky-950 shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className={`h-3.5 w-3.5 ${viewMode === "employee" ? "text-sky-600" : "text-slate-400"}`} />
              <span>2. Employee Wise</span>
            </button>

            <button
              type="button"
              onClick={() => updateViewMode("status")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                viewMode === "status"
                  ? "bg-white text-emerald-950 shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Columns3 className={`h-3.5 w-3.5 ${viewMode === "status" ? "text-emerald-600" : "text-slate-400"}`} />
              <span>3. Status Wise</span>
            </button>
          </div>

          {viewMode === "category" && selectedCategoryId && (
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
      {viewMode === "category" && !selectedCategoryId && (
        <div className="space-y-6">
          {/* Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                Task Management Categories
              </h1>
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
                        <div>
                          <h3 className="text-base font-extrabold text-[#111827] group-hover:text-violet-800 transition-colors">
                            {cat.name}
                          </h3>
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setWhatsAppContext({
                                  open: true,
                                  contextType: "category",
                                  category: cat,
                                });
                              }}
                              className="h-7 w-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              title="Send WhatsApp Update for this Category"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingCategory(cat);
                                setCatName(cat.name);
                                setCatCode(cat.code);
                                setCatDesc(cat.description || "");
                                setCatColor(cat.color || "violet");
                                setCatWhatsAppEnabled(cat.whatsapp_enabled ?? true);
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(cat);
                              }}
                              className="h-7 w-7 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                              title="Delete Category"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
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

            {categories.length === 0 && (
              <div className="col-span-full rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-12 text-center space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                  <FolderTree className="h-6 w-6 text-violet-600" />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-base font-extrabold text-slate-900">No Categories Created Yet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Get started by creating your practice categories (e.g. Taxation, Audit, Corporate). Each category can have dedicated sub-groups and Kanban task boards.
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
                    className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs font-bold"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create First Category</span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 2: KANBAN BOARD VIEW (EACH SUB-GROUP = ONE KANBAN COLUMN)            */}
      {/* ========================================================================= */}
      {viewMode === "category" && selectedCategory && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                {selectedCategory.name}
              </h1>
            </div>

            {/* In-Category View Switcher & Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-300 shadow-xs">
                <button
                  type="button"
                  onClick={() => setCategoryViewMode("sub-category")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    categoryViewMode === "sub-category"
                      ? "bg-white text-violet-950 shadow-xs ring-1 ring-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FolderTree className={`h-3.5 w-3.5 ${categoryViewMode === "sub-category" ? "text-violet-600" : "text-slate-400"}`} />
                  <span>1. Category Wise</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryViewMode("employee")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    categoryViewMode === "employee"
                      ? "bg-white text-sky-950 shadow-xs ring-1 ring-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Users className={`h-3.5 w-3.5 ${categoryViewMode === "employee" ? "text-sky-600" : "text-slate-400"}`} />
                  <span>2. Employee Wise</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategoryViewMode("status")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                    categoryViewMode === "status"
                      ? "bg-white text-emerald-950 shadow-xs ring-1 ring-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Columns3 className={`h-3.5 w-3.5 ${categoryViewMode === "status" ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>3. Status Wise</span>
                </button>
              </div>

              {!isEmployee && (
                <div className="flex items-center gap-2">
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
                </div>
              )}
            </div>
          </div>

          {/* Active Clipboard Notice */}
          {taskClipboard && taskClipboard.taskIds.length > 0 && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/90 px-4 py-3 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-violet-900 font-bold">
                {taskClipboard.mode === "copy" ? (
                  <Copy className="h-4 w-4 text-emerald-600 shrink-0" />
                ) : (
                  <ArrowRightLeft className="h-4 w-4 text-violet-600 shrink-0" />
                )}
                <span>
                  {taskClipboard.taskIds.length} task(s) ready to {taskClipboard.mode}. Click{" "}
                  <strong className="underline decoration-violet-400">
                    "{taskClipboard.mode === "copy" ? "Paste Here" : "Move Here"}"
                  </strong>{" "}
                  on any sub-category column below to complete.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setMoveCopyAction(taskClipboard.mode);
                    setIsMoveCopyModalOpen(true);
                  }}
                  className="h-7 text-xs font-bold rounded-lg border-violet-300 bg-white text-violet-800 hover:bg-violet-100"
                >
                  Choose Destination...
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setTaskClipboard(null)}
                  className="h-7 text-xs font-bold text-violet-700 hover:text-violet-900 hover:bg-violet-100"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Filter and Search Bar */}
          <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="relative sm:col-span-4">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                <Input
                  type="search"
                  placeholder={`Search ${selectedCategory.name} tasks by title, code, client...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
                />
              </div>

              {/* Sub-group Filter Scoped to this Category */}
              <div className="sm:col-span-3">
                <select
                  value={innerSubCategoryFilter}
                  onChange={(e) => setInnerSubCategoryFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
                >
                  <option value="ALL">All Sub-groups ({subCategories.length})</option>
                  {subCategories.map((sub) => {
                    const count = categoryTasks.filter((t) => {
                      if (t.sub_category_id === sub.id) return true;
                      if (t.sub_category_name && t.sub_category_name.trim().toLowerCase() === sub.name.trim().toLowerCase()) return true;
                      const matchesOther = subCategories.some(
                        (other) => other.id !== sub.id && (other.id === t.sub_category_id || (t.sub_category_name && other.name.trim().toLowerCase() === t.sub_category_name.trim().toLowerCase()))
                      );
                      return !matchesOther && subCategories[0]?.id === sub.id;
                    }).length;
                    return (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({count})
                      </option>
                    );
                  })}
                </select>
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

              <div className="sm:col-span-2">
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
          {/* VIEW 1: SUB-GROUPS KANBAN BOARD (CATEGORY WISE)                        */}
          {/* ===================================================================== */}
          {categoryViewMode === "sub-category" && (
            <>
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
                    {subCategories
                      .filter((sub) => innerSubCategoryFilter === "ALL" || sub.id === innerSubCategoryFilter)
                      .map((sub, sIdx) => {
                        const subNameClean = sub.name.trim().toLowerCase();
                        const subTasks = categoryTasks.filter((t) => {
                          if (t.sub_category_id === sub.id) return true;
                          if (t.sub_category_name && t.sub_category_name.trim().toLowerCase() === subNameClean) return true;
                          // Fallback: if task belongs to this category but has no matching sub_category_id/name among subCategories,
                          // anchor it to the first/default sub-group column (e.g. General) so it is never hidden or lost!
                          const matchesOtherSub = subCategories.some(
                            (otherSub) =>
                              otherSub.id !== sub.id &&
                              (otherSub.id === t.sub_category_id ||
                                (t.sub_category_name && otherSub.name.trim().toLowerCase() === t.sub_category_name.trim().toLowerCase()))
                          );
                          if (!matchesOtherSub && subCategories[0]?.id === sub.id) {
                            return true;
                          }
                          return false;
                        });

                        // Apply search and filter
                        const visibleSubTasks = subTasks.filter((t) => {
                          const proj = projects.find((p) => p.id === t.project_id);
                          const matchesSearch =
                            !search.trim() ||
                            t.title.toLowerCase().includes(search.toLowerCase()) ||
                            t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                            (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                            (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
                            (t.client_name && t.client_name.toLowerCase().includes(search.toLowerCase()));

                          const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
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
                                      <h3 className="text-sm font-extrabold text-[#111827] truncate">
                                        {sub.name}
                                      </h3>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                                        {subTasks.length} {subTasks.length === 1 ? "Task" : "Tasks"}
                                      </Badge>
                                      {!isEmployee && subTasks.length > 0 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleSelectAllInSub(sub.id)}
                                          className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                          title={
                                            subTasks.every((t) => selectedTaskIds.includes(t.id))
                                              ? "Deselect all in this sub-group"
                                              : "Select all in this sub-group"
                                          }
                                        >
                                          {subTasks.every((t) => selectedTaskIds.includes(t.id)) ? (
                                            <CheckSquare className="h-3.5 w-3.5 text-violet-600" />
                                          ) : (
                                            <Square className="h-3.5 w-3.5 text-slate-400" />
                                          )}
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setWhatsAppContext({
                                            open: true,
                                            contextType: "sub-category",
                                            subCategory: sub,
                                            category: selectedCategory,
                                          });
                                        }}
                                        className="h-6 w-6 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                                        title="Send WhatsApp Update for this Sub-group"
                                      >
                                        <MessageSquare className="h-3 w-3 text-emerald-600" />
                                      </Button>
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
                            </div>

                            {/* Paste / Move Target Action Button */}
                            {!isEmployee && taskClipboard && taskClipboard.taskIds.length > 0 && (
                              <div className="p-2 border-b border-slate-200 bg-slate-50/90">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handlePasteOrMoveToSubCategory(sub.id, sub.name)}
                                  className={`w-full h-8 text-xs font-bold rounded-xl gap-1.5 shadow-sm transition-all ${
                                    taskClipboard.mode === "copy"
                                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                                      : "bg-[#201815] hover:bg-[#342722] text-white"
                                  }`}
                                >
                                  {taskClipboard.mode === "copy" ? (
                                    <>
                                      <ClipboardPaste className="h-3.5 w-3.5" />
                                      <span>Paste {taskClipboard.taskIds.length} Task(s) Here</span>
                                    </>
                                  ) : (
                                    <>
                                      <ArrowRightLeft className="h-3.5 w-3.5" />
                                      <span>Move {taskClipboard.taskIds.length} Task(s) Here</span>
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            {/* Tasks List inside this Sub-group Column */}
                            <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                              {visibleSubTasks.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                                  {isEmployee ? "No assigned tasks in this sub-group" : "No tasks in this sub-group yet"}
                                </div>
                              ) : (
                                visibleSubTasks.map((task) => renderCommonTaskCard(task, "sub-category"))
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
                    {!isEmployee && innerSubCategoryFilter === "ALL" && (
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
            </>
          )}

          {/* ===================================================================== */}
          {/* VIEW 2: EMPLOYEE-WISE KANBAN BOARD (SCOPED TO THIS CATEGORY)          */}
          {/* ===================================================================== */}
          {categoryViewMode === "employee" && (
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-flow-col auto-cols-[minmax(330px,380px)] gap-4 items-start">
                {employees.map((emp) => {
                  const empTasks = categoryTasks.filter((t) => {
                    if (
                      t.assigned_employee_id !== emp.id &&
                      !t.assigned_employee_ids?.includes(emp.id) &&
                      !t.assigned_employees?.some((e) => e.id === emp.id)
                    )
                      return false;
                    if (innerSubCategoryFilter !== "ALL") {
                      const filterSub = subCategories.find((s) => s.id === innerSubCategoryFilter);
                      const matchId = t.sub_category_id === innerSubCategoryFilter;
                      const matchName = filterSub && t.sub_category_name && t.sub_category_name.toLowerCase() === filterSub.name.toLowerCase();
                      if (!matchId && !matchName) return false;
                    }
                    const proj = projects.find((p) => p.id === t.project_id);
                    const matchesSearch =
                      !search.trim() ||
                      t.title.toLowerCase().includes(search.toLowerCase()) ||
                      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                      (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
                      (t.client_name && t.client_name.toLowerCase().includes(search.toLowerCase()));

                    const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
                    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
                    return matchesSearch && matchesClient && matchesStatus;
                  });

                  const isDropOver = dragOverEmployeeId === emp.id;

                  return (
                    <div
                      key={emp.id}
                      onDragOver={(e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverEmployeeId(emp.id);
                      }}
                      onDragLeave={() =>
                        setDragOverEmployeeId((prev) => (prev === emp.id ? null : prev))
                      }
                      onDrop={async (e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverEmployeeId(null);
                        if (draggingTaskId) {
                          try {
                            await pmsStore.updateTask(draggingTaskId, {
                              assigned_employee_id: emp.id,
                              assigned_employee_name: emp.full_name,
                            });
                            setDraggingTaskId(null);
                            toast.success(`Task reassigned to ${emp.full_name}`);
                            setTick((t) => t + 1);
                          } catch (err: any) {
                            toast.error(err?.message || "Failed to reassign task in database.");
                          }
                        }
                      }}
                      className={`rounded-[24px] border-[1.5px] transition-all flex flex-col max-h-[82vh] ${
                        isDropOver
                          ? "border-sky-600 bg-sky-50/90 shadow-md ring-2 ring-sky-500/20"
                          : "border-slate-300 bg-slate-50/70"
                      }`}
                    >
                      {/* Employee Column Header */}
                      <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-sky-100 border border-sky-300 text-sky-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                              {emp.full_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-sm font-extrabold text-[#111827] truncate">
                                {emp.full_name}
                              </h3>
                              <p className="text-[10px] font-semibold text-slate-500 truncate">
                                {emp.designation_name || emp.employee_code || "Team Member"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                              {empTasks.length} {empTasks.length === 1 ? "Task" : "Tasks"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Tasks List inside this Employee Column */}
                      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                        {empTasks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                            No tasks assigned to {emp.full_name} in this {innerSubCategoryFilter !== "ALL" ? "sub-group" : "category"}
                          </div>
                        ) : (
                          empTasks.map((task) => renderCommonTaskCard(task, "employee"))
                        )}
                      </div>

                      {/* Bottom Add Task Button */}
                      {!isEmployee && (
                        <div className="p-3 pt-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateTaskForEmployee(emp.id)}
                            className="w-full h-8 rounded-xl border-dashed border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold gap-1 text-slate-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Assign Task</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned Tasks in this Category */}
                {(() => {
                  const unassignedTasks = categoryTasks.filter((t) => {
                    const isAssigned =
                      (t.assigned_employee_id && employees.some((e) => e.id === t.assigned_employee_id)) ||
                      (t.assigned_employee_ids && t.assigned_employee_ids.some((id) => employees.some((e) => e.id === id))) ||
                      (t.assigned_employees && t.assigned_employees.some((ae) => employees.some((e) => e.id === ae.id)));
                    if (isAssigned) return false;
                    if (innerSubCategoryFilter !== "ALL") {
                      const filterSub = subCategories.find((s) => s.id === innerSubCategoryFilter);
                      const matchId = t.sub_category_id === innerSubCategoryFilter;
                      const matchName = filterSub && t.sub_category_name && t.sub_category_name.toLowerCase() === filterSub.name.toLowerCase();
                      if (!matchId && !matchName) return false;
                    }
                    const proj = projects.find((p) => p.id === t.project_id);
                    const matchesSearch =
                      !search.trim() ||
                      t.title.toLowerCase().includes(search.toLowerCase()) ||
                      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                      (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
                      (t.client_name && t.client_name.toLowerCase().includes(search.toLowerCase()));

                    const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
                    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
                    return matchesSearch && matchesClient && matchesStatus;
                  });

                  const isDropOver = dragOverEmployeeId === "unassigned";

                  return (
                    <div
                      onDragOver={(e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverEmployeeId("unassigned");
                      }}
                      onDragLeave={() =>
                        setDragOverEmployeeId((prev) => (prev === "unassigned" ? null : prev))
                      }
                      onDrop={async (e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverEmployeeId(null);
                        if (draggingTaskId) {
                          try {
                            await pmsStore.updateTask(draggingTaskId, {
                              assigned_employee_id: "",
                              assigned_employee_name: "Unassigned",
                            });
                            setDraggingTaskId(null);
                            toast.success("Task unassigned");
                            setTick((t) => t + 1);
                          } catch (err: any) {
                            toast.error(err?.message || "Failed to unassign task in database.");
                          }
                        }
                      }}
                      className={`rounded-[24px] border-[1.5px] transition-all flex flex-col max-h-[82vh] ${
                        isDropOver
                          ? "border-rose-600 bg-rose-50/90 shadow-md ring-2 ring-rose-500/20"
                          : "border-dashed border-slate-300 bg-slate-50/70"
                      }`}
                    >
                      <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                            <h3 className="text-sm font-extrabold text-[#111827]">
                              Unassigned Deliverables
                            </h3>
                          </div>
                          <Badge variant="outline" className="rounded-full text-[10px] font-bold text-rose-700 bg-rose-50 border-rose-200">
                            {unassignedTasks.length} {unassignedTasks.length === 1 ? "Task" : "Tasks"}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                        {unassignedTasks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                            All tasks in this {innerSubCategoryFilter !== "ALL" ? "sub-group" : "category"} are assigned
                          </div>
                        ) : (
                          unassignedTasks.map((task) => renderCommonTaskCard(task, "employee"))
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* VIEW 3: STATUS-WISE KANBAN PIPELINE (SCOPED TO THIS CATEGORY)         */}
          {/* ===================================================================== */}
          {categoryViewMode === "status" && (
            <div className="overflow-x-auto pb-4">
              <div className="grid grid-flow-col auto-cols-[minmax(330px,380px)] gap-4 items-start">
                {taskStatuses.map((st) => {
                  const stTasks = categoryTasks.filter((t) => {
                    if (t.status !== st.label) return false;
                    if (innerSubCategoryFilter !== "ALL") {
                      const filterSub = subCategories.find((s) => s.id === innerSubCategoryFilter);
                      const matchId = t.sub_category_id === innerSubCategoryFilter;
                      const matchName = filterSub && t.sub_category_name && t.sub_category_name.toLowerCase() === filterSub.name.toLowerCase();
                      if (!matchId && !matchName) return false;
                    }
                    const proj = projects.find((p) => p.id === t.project_id);
                    const matchesSearch =
                      !search.trim() ||
                      t.title.toLowerCase().includes(search.toLowerCase()) ||
                      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                      (t.assigned_employee_name && t.assigned_employee_name.toLowerCase().includes(search.toLowerCase())) ||
                      (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
                      (t.client_name && t.client_name.toLowerCase().includes(search.toLowerCase()));

                    const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
                    return matchesSearch && matchesClient;
                  });

                  const isDropOver = dragOverStatus === st.label;
                  const colStyle = getStyleForColor(st.color || "slate");

                  return (
                    <div
                      key={st.id}
                      onDragOver={(e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverStatus(st.label);
                      }}
                      onDragLeave={() =>
                        setDragOverStatus((prev) => (prev === st.label ? null : prev))
                      }
                      onDrop={(e) => {
                        if (isEmployee) return;
                        e.preventDefault();
                        setDragOverStatus(null);
                        if (draggingTaskId) {
                          handleStatusChange(draggingTaskId, st.label as TaskStatus);
                          setDraggingTaskId(null);
                          toast.success(`Moved task to "${st.label}"`);
                          setTick((t) => t + 1);
                        }
                      }}
                      className={`rounded-[24px] border-[1.5px] transition-all flex flex-col max-h-[82vh] ${
                        isDropOver
                          ? "border-emerald-600 bg-emerald-50/90 shadow-md ring-2 ring-emerald-500/20"
                          : "border-slate-300 bg-slate-50/70"
                      }`}
                    >
                      {/* Status Column Header */}
                      <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${colStyle.dotClass}`} />
                            <h3 className="text-sm font-extrabold text-[#111827]">
                              {st.label}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1">
                            <Badge variant={colStyle.badgeVariant} className="text-[10px] font-bold">
                              {stTasks.length} {stTasks.length === 1 ? "Task" : "Tasks"}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Tasks List inside this Status Column */}
                      <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                        {stTasks.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                            No tasks in {st.label} for this {innerSubCategoryFilter !== "ALL" ? "sub-group" : "category"}
                          </div>
                        ) : (
                          stTasks.map((task) => renderCommonTaskCard(task, "status"))
                        )}
                      </div>

                      {/* Bottom Add Task Button */}
                      {!isEmployee && (
                        <div className="p-3 pt-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenCreateTaskForStatus(st.label)}
                            className="w-full h-8 rounded-xl border-dashed border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold gap-1 text-slate-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add Task in {st.label}</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      
      {/* ========================================================================= */}
      {/* VIEW MODE 2: EMPLOYEE-WISE KANBAN BOARD & WORKLOAD VISUALS                */}
      {/* ========================================================================= */}
      {viewMode === "employee" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                  TEAM ALLOCATION
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                  Employee-Wise Task Board
                </h1>
              </div>
            </div>

            {!isEmployee && (
              <Button
                type="button"
                onClick={() => handleOpenCreateTaskForEmployee()}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs font-bold text-xs h-9 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </Button>
            )}
          </div>

          {/* Employee View KPI Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 items-center">
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Total Team
              </span>
              <span className="text-lg font-extrabold text-[#111827]">
                {employees.length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Assigned Tasks
              </span>
              <span className="text-lg font-extrabold text-sky-700">
                {tasks.filter((t) => t.assigned_employee_id).length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Active Deliverables
              </span>
              <span className="text-lg font-extrabold text-amber-700">
                {tasks.filter((t) => t.status !== "Completed").length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Completed
              </span>
              <span className="text-lg font-extrabold text-emerald-700">
                {tasks.filter((t) => t.status === "Completed").length}
              </span>
            </div>
            <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                Unassigned Tasks
              </span>
              <span className="text-lg font-extrabold text-rose-700">
                {tasks.filter((t) => !t.assigned_employee_id || !employees.some((e) => e.id === t.assigned_employee_id)).length}
              </span>
            </div>
          </div>

          {/* Filters Bar */}
          <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="relative sm:col-span-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                <Input
                  type="search"
                  placeholder="Search tasks by title, code, client, or project..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  {statusNames.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Active Clipboard Notice */}
          {taskClipboard && taskClipboard.taskIds.length > 0 && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50/90 px-4 py-3 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-sky-950 font-bold">
                <Users className="h-4 w-4 text-sky-600 shrink-0" />
                <span>
                  {taskClipboard.taskIds.length} task(s) in clipboard ({taskClipboard.mode === "copy" ? "Copying" : "Moving"}). Click <strong>&quot;Assign / Paste Here&quot;</strong> on any employee column.
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setTaskClipboard(null)}
                className="h-7 text-xs font-bold text-sky-800 hover:bg-sky-100"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Employee Columns Kanban Grid */}
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-flow-col auto-cols-[minmax(330px,380px)] gap-4 items-start">
              {employees.map((emp) => {
                const empTasks = tasks.filter((t) => {
                  if (
                    t.assigned_employee_id !== emp.id &&
                    !t.assigned_employee_ids?.includes(emp.id) &&
                    !t.assigned_employees?.some((e) => e.id === emp.id)
                  )
                    return false;
                  const proj = projects.find((p) => p.id === t.project_id);
                  const matchesSearch =
                    !search.trim() ||
                    t.title.toLowerCase().includes(search.toLowerCase()) ||
                    t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                    (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                    (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
                    (t.client_name && t.client_name.toLowerCase().includes(search.toLowerCase()));
                  const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
                  const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
                  const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
                  return matchesSearch && matchesClient && matchesPriority && matchesStatus;
                });

                const isDropOver = dragOverEmployeeId === emp.id;

                return (
                  <div
                    key={emp.id}
                    onDragOver={(e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverEmployeeId(emp.id);
                    }}
                    onDragLeave={() =>
                      setDragOverEmployeeId((prev) => (prev === emp.id ? null : prev))
                    }
                    onDrop={async (e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverEmployeeId(null);
                      if (draggingTaskId) {
                        try {
                          await pmsStore.updateTask(draggingTaskId, {
                            assigned_employee_id: emp.id,
                            assigned_employee_name: emp.full_name,
                          });
                          setDraggingTaskId(null);
                          toast.success(`Task reassigned to ${emp.full_name}`);
                          setTick((t) => t + 1);
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to reassign task in database.");
                        }
                      }
                    }}
                    className={`rounded-[24px] border-[1.5px] transition-all flex flex-col max-h-[82vh] ${
                      isDropOver
                        ? "border-sky-600 bg-sky-50/90 shadow-md ring-2 ring-sky-500/20"
                        : "border-slate-300 bg-slate-50/70"
                    }`}
                  >
                    {/* Employee Column Header */}
                    <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-sky-100 border border-sky-300 text-sky-900 font-extrabold text-xs flex items-center justify-center shrink-0">
                            {emp.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-[#111827] truncate">
                              {emp.full_name}
                            </h3>
                            <p className="text-[10px] font-semibold text-slate-500 truncate">
                              {emp.designation_name || emp.employee_code || "Team Member"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                            {empTasks.length} {empTasks.length === 1 ? "Task" : "Tasks"}
                          </Badge>
                          {!isEmployee && empTasks.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const ids = empTasks.map((t) => t.id);
                                const allSelected = ids.every((id) => selectedTaskIds.includes(id));
                                setSelectedTaskIds((prev) =>
                                  allSelected
                                    ? prev.filter((id) => !ids.includes(id))
                                    : Array.from(new Set([...prev, ...ids]))
                                );
                              }}
                              className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Select all tasks for this employee"
                            >
                              {empTasks.every((t) => selectedTaskIds.includes(t.id)) ? (
                                <CheckSquare className="h-3.5 w-3.5 text-sky-600" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paste / Move Target Action Button */}
                    {!isEmployee && taskClipboard && taskClipboard.taskIds.length > 0 && (
                      <div className="p-2 border-b border-slate-200 bg-sky-50/90">
                        <Button
                          type="button"
                          size="sm"
                          onClick={async () => {
                            for (const tid of taskClipboard.taskIds) {
                              if (taskClipboard.mode === "copy") {
                                const original = tasks.find((t) => t.id === tid);
                                if (original?.sub_category_id) {
                                  const cloned = await pmsStore.copyTaskToSubCategory(tid, original.sub_category_id);
                                  if (cloned) {
                                    await pmsStore.updateTask(cloned.id, {
                                      assigned_employee_id: emp.id,
                                      assigned_employee_name: emp.full_name,
                                    });
                                  }
                                }
                              } else {
                                await pmsStore.updateTask(tid, {
                                  assigned_employee_id: emp.id,
                                  assigned_employee_name: emp.full_name,
                                });
                              }
                            }
                            toast.success(`Assigned ${taskClipboard.taskIds.length} task(s) to ${emp.full_name}`);
                            setTaskClipboard(null);
                            setSelectedTaskIds([]);
                            setTick((t) => t + 1);
                          }}
                          className="w-full h-8 text-xs font-bold rounded-xl gap-1.5 shadow-sm bg-sky-600 hover:bg-sky-700 text-white"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Assign {taskClipboard.taskIds.length} Task(s) Here</span>
                        </Button>
                      </div>
                    )}

                    {/* Tasks List */}
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                      {empTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                          No tasks assigned to {emp.full_name}
                        </div>
                      ) : (
                        empTasks.map((task) => renderCommonTaskCard(task, "employee"))
                      )}
                    </div>

                    {/* Bottom Add Task Button */}
                    {!isEmployee && (
                      <div className="p-3 pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreateTaskForEmployee(emp.id)}
                          className="w-full h-8 rounded-xl border-dashed border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold gap-1 text-slate-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Assign Task</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Unassigned Tasks Column */}
              {(() => {
                const unassignedTasks = tasks.filter((t) => {
                  const isAssigned =
                    (t.assigned_employee_id && employees.some((e) => e.id === t.assigned_employee_id)) ||
                    (t.assigned_employee_ids && t.assigned_employee_ids.some((id) => employees.some((e) => e.id === id))) ||
                    (t.assigned_employees && t.assigned_employees.some((ae) => employees.some((e) => e.id === ae.id)));
                  if (isAssigned) {
                    return false;
                  }
                  const proj = projects.find((p) => p.id === t.project_id);
                  const matchesSearch =
                    !search.trim() ||
                    t.title.toLowerCase().includes(search.toLowerCase()) ||
                    t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                    (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                    (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase())) ||
                    (t.client_name && t.client_name.toLowerCase().includes(search.toLowerCase()));
                  const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
                  const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
                  const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
                  return matchesSearch && matchesClient && matchesPriority && matchesStatus;
                });

                const isDropOver = dragOverEmployeeId === "unassigned";

                return (
                  <div
                    onDragOver={(e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverEmployeeId("unassigned");
                    }}
                    onDragLeave={() =>
                      setDragOverEmployeeId((prev) => (prev === "unassigned" ? null : prev))
                    }
                    onDrop={async (e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverEmployeeId(null);
                      if (draggingTaskId) {
                        try {
                          await pmsStore.updateTask(draggingTaskId, {
                            assigned_employee_id: "",
                            assigned_employee_name: "",
                          });
                          setDraggingTaskId(null);
                          toast.info("Task moved to Unassigned");
                          setTick((t) => t + 1);
                        } catch (err: any) {
                          toast.error(err?.message || "Failed to unassign task in database.");
                        }
                      }
                    }}
                    className={`rounded-[24px] border-[1.5px] border-dashed transition-all flex flex-col max-h-[82vh] ${
                      isDropOver
                        ? "border-amber-600 bg-amber-50/90 shadow-md ring-2 ring-amber-500/20"
                        : "border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-xs flex items-center justify-center">
                            ?
                          </div>
                          <div>
                            <h3 className="text-sm font-extrabold text-[#111827]">Unassigned</h3>
                            <p className="text-[10px] text-slate-500">Awaiting employee allocation</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {unassignedTasks.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                      {unassignedTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                          All deliverable tasks are assigned
                        </div>
                      ) : (
                        unassignedTasks.map((task) => renderCommonTaskCard(task, "employee"))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW MODE 3: STATUS-WISE KANBAN PIPELINE                                  */}
      {/* ========================================================================= */}
      {viewMode === "status" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  PIPELINE WORKFLOW
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                  Status-Wise Kanban Pipeline
                </h1>
              </div>
            </div>

            {!isEmployee && (
              <Button
                type="button"
                onClick={() => handleOpenCreateTaskForStatus()}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-xl shadow-xs font-bold text-xs h-9 self-start sm:self-auto"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </Button>
            )}
          </div>

          {/* Status KPI Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            {taskStatuses.slice(0, 4).map((st) => {
              const count = tasks.filter((t) => t.status === st.label).length;
              return (
                <div key={st.id} className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {st.label}
                  </span>
                  <span className="text-lg font-extrabold text-[#111827]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Filters Bar */}
          <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="relative sm:col-span-5">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
                <Input
                  type="search"
                  placeholder="Search tasks by title, code, client, or assignee..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
                />
              </div>

              <div className="sm:col-span-3">
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Urgent">Urgent</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Active Clipboard Notice */}
          {taskClipboard && taskClipboard.taskIds.length > 0 && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 flex items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                <Columns3 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  {taskClipboard.taskIds.length} task(s) in clipboard. Click <strong>&quot;Set Status Here&quot;</strong> on any column to update their stage.
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setTaskClipboard(null)}
                className="h-7 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Status Columns Kanban Grid */}
          <div className="overflow-x-auto pb-4">
            <div className="grid grid-flow-col auto-cols-[minmax(330px,380px)] gap-4 items-start">
              {taskStatuses.map((st) => {
                const stTasks = tasks.filter((t) => {
                  if (t.status !== st.label) return false;
                  const proj = projects.find((p) => p.id === t.project_id);
                  const matchesSearch =
                    !search.trim() ||
                    t.title.toLowerCase().includes(search.toLowerCase()) ||
                    t.task_code.toLowerCase().includes(search.toLowerCase()) ||
                    (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase())) ||
                    (t.assigned_employee_name && t.assigned_employee_name.toLowerCase().includes(search.toLowerCase())) ||
                    (proj?.client_name && proj.client_name.toLowerCase().includes(search.toLowerCase()));
                  const matchesClient = clientFilter === "ALL" || proj?.client_id === clientFilter || t.client_id === clientFilter;
                  const matchesPriority = priorityFilter === "ALL" || t.priority === priorityFilter;
                  const matchesCategory = categoryFilter === "ALL" || t.category_id === categoryFilter;
                  return matchesSearch && matchesClient && matchesPriority && matchesCategory;
                });

                const isDropOver = dragOverStatus === st.label;
                const colStyle = getStyleForColor(st.color || "slate");

                return (
                  <div
                    key={st.id}
                    onDragOver={(e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverStatus(st.label);
                    }}
                    onDragLeave={() =>
                      setDragOverStatus((prev) => (prev === st.label ? null : prev))
                    }
                    onDrop={(e) => {
                      if (isEmployee) return;
                      e.preventDefault();
                      setDragOverStatus(null);
                      if (draggingTaskId) {
                        handleStatusChange(draggingTaskId, st.label as TaskStatus);
                        setDraggingTaskId(null);
                        toast.success(`Moved task to "${st.label}"`);
                        setTick((t) => t + 1);
                      }
                    }}
                    className={`rounded-[24px] border-[1.5px] transition-all flex flex-col max-h-[82vh] ${
                      isDropOver
                        ? "border-emerald-600 bg-emerald-50/90 shadow-md ring-2 ring-emerald-500/20"
                        : "border-slate-300 bg-slate-50/70"
                    }`}
                  >
                    {/* Status Column Header */}
                    <div className="p-4 border-b border-slate-200 bg-white rounded-t-[22px] space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${colStyle.dotClass}`} />
                          <h3 className="text-sm font-extrabold text-[#111827]">
                            {st.label}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant={colStyle.badgeVariant} className="text-[10px] font-bold">
                            {stTasks.length} {stTasks.length === 1 ? "Task" : "Tasks"}
                          </Badge>
                          {!isEmployee && stTasks.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                const ids = stTasks.map((t) => t.id);
                                const allSelected = ids.every((id) => selectedTaskIds.includes(id));
                                setSelectedTaskIds((prev) =>
                                  allSelected
                                    ? prev.filter((id) => !ids.includes(id))
                                    : Array.from(new Set([...prev, ...ids]))
                                );
                              }}
                              className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                              title="Select all tasks in this status"
                            >
                              {stTasks.every((t) => selectedTaskIds.includes(t.id)) ? (
                                <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Paste / Move Target Action Button */}
                    {!isEmployee && taskClipboard && taskClipboard.taskIds.length > 0 && (
                      <div className="p-2 border-b border-slate-200 bg-emerald-50/90">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            for (const tid of taskClipboard.taskIds) {
                              handleStatusChange(tid, st.label as TaskStatus);
                            }
                            toast.success(`Updated ${taskClipboard.taskIds.length} task(s) to "${st.label}"`);
                            setTaskClipboard(null);
                            setSelectedTaskIds([]);
                            setTick((t) => t + 1);
                          }}
                          className="w-full h-8 text-xs font-bold rounded-xl gap-1.5 shadow-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Set Status to {st.label} ({taskClipboard.taskIds.length})</span>
                        </Button>
                      </div>
                    )}

                    {/* Tasks List */}
                    <div className="p-3 space-y-3 overflow-y-auto flex-1 min-h-[180px]">
                      {stTasks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-3 py-10 text-center text-[11px] text-slate-400">
                          No tasks currently in {st.label}
                        </div>
                      ) : (
                        stTasks.map((task) => renderCommonTaskCard(task, "status"))
                      )}
                    </div>

                    {/* Bottom Add Task Button */}
                    {!isEmployee && (
                      <div className="p-3 pt-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenCreateTaskForStatus(st.label)}
                          className="w-full h-8 rounded-xl border-dashed border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold gap-1 text-slate-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add Task in {st.label}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
                  <option value="violet">Brown / Espresso</option>
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

            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  Enable WhatsApp Client Updates
                </span>
                <p className="text-[11px] text-emerald-700">
                  Allow automated & one-click template dispatches for tasks in this category.
                </p>
              </div>
              <input
                type="checkbox"
                checked={catWhatsAppEnabled}
                onChange={(e) => setCatWhatsAppEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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

            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                  Enable WhatsApp Updates for Sub-group
                </span>
                <p className="text-[11px] text-emerald-700">
                  Enable client broadcast and task alerts for this sub-group.
                </p>
              </div>
              <input
                type="checkbox"
                checked={subWhatsAppEnabled}
                onChange={(e) => setSubWhatsAppEnabled(e.target.checked)}
                className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
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
      {/* MODAL: CREATE DELIVERABLE TASK (EXPANDED 2-COLUMN OVERVIEW VIEW)          */}
      {/* ========================================================================= */}
      {!isEmployee && (
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto rounded-[24px] border-[1.5px] border-slate-300 bg-[#f8f9fc] p-6 sm:p-7">
            <DialogHeader className="pb-4 border-b border-slate-300">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-extrabold text-[#111827]">
                    Create Deliverable Task
                  </DialogTitle>
                </div>
                {selectedCategory && (
                  <Badge variant="outline" className="bg-white border-slate-300 text-slate-800 text-xs px-3 py-1 font-bold">
                    {selectedCategory.name}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <form onSubmit={handleCreateTask} className="space-y-6 pt-4">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Scope, Title, Project, Subtasks, Checkpoints (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  {selectedCategory && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Sub-group Column *</label>
                      <select
                        value={modalSubCategoryId}
                        onChange={(e) => setModalSubCategoryId(e.target.value)}
                        className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:border-neutral-900 shadow-xs"
                      >
                        {subCategories.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code || "SUB"})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Task Title *</label>
                    <Input
                      placeholder="e.g. Scrutinize 26AS TDS credits against General Ledger"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="h-10 text-xs rounded-xl border-slate-300 font-semibold focus-visible:ring-neutral-900"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Allotted Client *</span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-bold">Client 360 Allotment</span>
                    </label>
                    <select
                      value={modalClientId}
                      onChange={(e) => {
                        const newCId = e.target.value;
                        setModalClientId(newCId);
                        const matchedProj = projects.find((p) => p.client_id === newCId);
                        if (matchedProj) {
                          setProjectId(matchedProj.id);
                        }
                      }}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:border-neutral-900 shadow-xs"
                      required
                    >
                      <option value="">-- Choose Client to Allot --</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.client_name} ({c.client_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Parent Project</label>
                    <select
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold focus:border-neutral-900 shadow-xs"
                    >
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.project_name} ({p.project_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subtasks Checklist Builder */}
                  <div className="space-y-2.5 rounded-2xl border border-slate-300 bg-white p-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ListChecks className="h-4 w-4 text-slate-700" />
                        <label className="text-xs font-bold text-slate-900">
                          Subtasks &amp; Step Checklist ({draftSubtasks.length})
                        </label>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">Break deliverable into trackable steps</span>
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
                        className="text-xs h-9 rounded-xl border-slate-300"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddDraftSubtask}
                        className="shrink-0 text-xs h-9 rounded-xl font-bold border-slate-300 hover:bg-slate-100"
                      >
                        Add Step
                      </Button>
                    </div>

                    {draftSubtasks.length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                        {draftSubtasks.map((st, idx) => (
                          <div
                            key={`${st}-${idx}`}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs"
                          >
                            <span className="font-semibold text-slate-800 truncate">
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
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">No checklist steps added yet.</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Execution Attributes, Dates, WhatsApp Toggle (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="rounded-2xl border border-slate-300 bg-white p-4 space-y-4 shadow-xs">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Execution &amp; Assignment
                    </h4>

                    <EmployeeMultiSelect
                      employees={employees}
                      selectedEmployeeIds={assignedEmployeeIds}
                      onChange={(ids) => {
                        setAssignedEmployeeIds(ids);
                        setAssignedEmployeeId(ids[0] || "");
                      }}
                      label="Assigned Team Members"
                      placeholder="Search employees by name, role, or code..."
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Priority</label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                          className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold focus:border-neutral-900"
                        >
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Initial Status</label>
                        <select
                          value={initialStatus}
                          onChange={(e) => setInitialStatus(e.target.value as TaskStatus)}
                          className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold focus:border-neutral-900"
                        >
                          {statusNames.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Start Date</label>
                        <Input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="h-9 text-xs rounded-xl border-slate-300 font-semibold"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Due Date</label>
                        <Input
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                          className="h-9 text-xs rounded-xl border-slate-300 font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Finance & Task Billing Section */}
                  <div className={`rounded-2xl border transition-all p-4 space-y-3.5 shadow-xs ${
                    isBillable
                      ? "border-amber-300 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/30"
                      : "border-slate-300 bg-white"
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                          isBillable ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-extrabold text-[#111827]">
                              Task Billing & Finance Integration
                            </h5>
                            <Badge
                              variant="outline"
                              className={isBillable ? "border-amber-300 bg-amber-100 text-amber-900 font-bold text-[10px]" : "border-slate-300 bg-slate-100 text-slate-600 font-bold text-[10px]"}
                            >
                              {isBillable ? "Billable Task" : "Non-Billable"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-[#4b5563] leading-snug">
                            {isBillable
                              ? "When completed, this deliverable automatically enters the Single/Bulk Invoice billing register."
                              : "Operational task excluded from client invoice generation and billing cycles."}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsBillable(false);
                            setBillingAmount("");
                          }}
                          className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all ${
                            !isBillable ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Non-Billable
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsBillable(true)}
                          className={`px-2.5 py-1 text-xs font-extrabold rounded-lg transition-all ${
                            isBillable ? "bg-amber-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          Billable
                        </button>
                      </div>
                    </div>

                    {isBillable && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-amber-200/80">
                        <div className="sm:col-span-1 space-y-1">
                          <label className="text-[11px] font-extrabold text-[#111827] flex items-center gap-1">
                            <span>Billable Amount (₹)</span>
                            <span className="text-rose-600 font-bold">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#6b7280]">
                              ₹
                            </span>
                            <Input
                              type="number"
                              min={1}
                              step="any"
                              value={billingAmount}
                              onChange={(e) => setBillingAmount(e.target.value === "" ? "" : Number(e.target.value))}
                              placeholder="e.g. 15000"
                              required={isBillable}
                              className="pl-7 h-9 rounded-xl border-amber-300 bg-white font-bold text-xs focus:ring-amber-500"
                            />
                          </div>
                          <span className="text-[10px] text-amber-800 font-semibold">
                            Currency: INR (₹)
                          </span>
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="text-[11px] font-extrabold text-[#111827]">
                            Billing Service Description (Optional)
                          </label>
                          <Input
                            type="text"
                            value={billingDescription}
                            onChange={(e) => setBillingDescription(e.target.value)}
                            placeholder="e.g. Filing charges & statutory audit fees"
                            className="h-9 rounded-xl border-amber-300 bg-white text-xs"
                          />
                          <span className="text-[10px] text-[#4b5563]">
                            Appears as line-item description in GST Invoice drafts.
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Integration Toggle Card */}
                  <div className="rounded-2xl border border-emerald-300 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <MessageSquare className="h-4 w-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-extrabold text-emerald-950">
                            WhatsApp Communication
                          </h5>
                          <p className="text-[11px] text-emerald-700 leading-snug">
                            Enable one-click client WhatsApp messaging and template notifications for this task.
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={taskWhatsAppEnabled}
                        onChange={(e) => setTaskWhatsAppEnabled(e.target.checked)}
                        className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0 mt-0.5"
                      />
                    </div>
                    {taskWhatsAppEnabled && (
                      <div className="rounded-xl bg-white/80 border border-emerald-200/80 p-2.5 text-[10px] text-emerald-900 font-medium">
                        ✓ Phone number will automatically fetch from Client 360 profile.
                        <br />
                        ✓ Pre-configured WhatsApp templates accessible with 1 click.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-300 flex items-center justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border-slate-300 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold px-6 shadow-xs"
                >
                  Create Deliverable Task
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
                  Moved to Recycle Bin (25-day safe recovery window enabled).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              {deleteTarget?.description || `Are you sure you want to delete "${deleteTarget?.name}"?`}
            </p>

            <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-rose-900">
                  To confirm deletion, please type the title or code below:
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmInput(deleteTarget?.name || "")}
                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline flex items-center gap-1 cursor-pointer"
                  title="Auto-fill the full title into input"
                >
                  <Copy className="h-3 w-3" />
                  <span>Auto-fill Title</span>
                </button>
              </div>
              <div
                onClick={() => setDeleteConfirmInput(deleteTarget?.name || "")}
                title="Click to copy / auto-fill"
                className="px-3 py-2 rounded-xl bg-white border border-rose-200 text-xs font-mono font-extrabold text-rose-800 select-all break-words shadow-xs cursor-pointer hover:bg-rose-50/40 transition-colors"
              >
                {deleteTarget?.name}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-slate-500 font-medium">Quick match:</span>
                {deleteTarget?.taskCode && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmInput(deleteTarget.taskCode!)}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors"
                  >
                    {deleteTarget.taskCode}
                  </button>
                )}
                {deleteTarget?.code && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmInput(deleteTarget.code!)}
                    className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors"
                  >
                    {deleteTarget.code}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDeleteConfirmInput("delete")}
                  className="px-2 py-0.5 rounded-md bg-white border border-slate-300 font-mono font-bold text-slate-700 hover:border-rose-400 hover:text-rose-700 transition-colors"
                >
                  delete
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Type Title or Code to Verify</label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder={`Type "${deleteTarget?.name}" or "${deleteTarget?.taskCode || 'delete'}"`}
                className="text-xs h-10 rounded-xl border-slate-300 font-medium focus-visible:ring-rose-500"
                autoFocus
              />
              {deleteConfirmInput && !isDeleteMatch && (
                <p className="text-[11px] font-semibold text-rose-600">
                  Verification does not match yet. Click &ldquo;Auto-fill Title&rdquo; above or type &ldquo;{deleteTarget?.taskCode || 'delete'}&rdquo;.
                </p>
              )}
              {isDeleteMatch && (
                <p className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Verification matched. Ready to delete.
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

      {/* Floating Multi-Task Selection Action Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-neutral-950 text-white px-5 py-3 rounded-2xl shadow-2xl border border-neutral-800 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 pr-3 border-r border-neutral-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold whitespace-nowrap">
              {selectedTaskIds.length} {selectedTaskIds.length === 1 ? "task" : "tasks"} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleCopySelected}
              className="h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold gap-1.5"
            >
              <Copy className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copy ({selectedTaskIds.length})</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleMoveSelected}
              className="h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold gap-1.5"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-violet-400" />
              <span>Move ({selectedTaskIds.length})</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => {
                setMoveCopyAction("copy");
                setIsMoveCopyModalOpen(true);
              }}
              className="h-8 rounded-full bg-[#201815] hover:bg-[#342722] text-[#FAF8F5] text-xs font-bold gap-1.5 shadow-sm"
            >
              <FolderInput className="h-3.5 w-3.5" />
              <span>Copy / Move to...</span>
            </Button>

            {!isEmployee && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="h-8 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold gap-1.5 shadow-sm"
                title="Delete Selected Tasks"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
                <span>Delete ({selectedTaskIds.length})</span>
              </Button>
            )}

            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setSelectedTaskIds([])}
              className="h-8 px-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 text-xs"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Delete Selected Tasks Confirmation Dialog */}
      <Dialog open={isBulkDeleteModalOpen} onOpenChange={setIsBulkDeleteModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Delete {selectedTaskIds.length} Selected {selectedTaskIds.length === 1 ? "Task" : "Tasks"}?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Are you sure you want to delete {selectedTaskIds.length} deliverable {selectedTaskIds.length === 1 ? "task" : "tasks"}? They will be safely moved to the Recycle Bin (25-day recovery window).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-48 overflow-y-auto space-y-1.5 my-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            {selectedTaskIds.map((id) => {
              const task = tasks.find((t) => t.id === id);
              if (!task) return null;
              return (
                <div key={id} className="flex items-center justify-between text-xs py-1.5 px-2.5 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 truncate mr-2">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                      {task.task_code}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{task.title}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">{task.status}</Badge>
                </div>
              );
            })}
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="rounded-xl text-xs font-bold h-9"
              disabled={isBulkDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteBulkDelete}
              disabled={isBulkDeleting}
              className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9 gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{isBulkDeleting ? "Deleting..." : `Confirm Delete (${selectedTaskIds.length})`}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move / Copy Destination Selector Dialog */}
      <Dialog open={isMoveCopyModalOpen} onOpenChange={setIsMoveCopyModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              {moveCopyAction === "copy" ? "Copy Tasks to Sub-Category" : "Move Tasks to Sub-Category"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Select destination category and sub-category for{" "}
              {selectedTaskIds.length > 0 ? selectedTaskIds.length : taskClipboard?.taskIds.length || 0} task(s).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Action Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={moveCopyAction === "copy" ? "default" : "outline"}
                  onClick={() => setMoveCopyAction("copy")}
                  className={`text-xs font-bold h-9 ${moveCopyAction === "copy" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Tasks
                </Button>
                <Button
                  type="button"
                  variant={moveCopyAction === "move" ? "default" : "outline"}
                  onClick={() => setMoveCopyAction("move")}
                  className={`text-xs font-bold h-9 ${moveCopyAction === "move" ? "bg-[#201815] hover:bg-[#342722] text-[#FAF8F5]" : ""}`}
                >
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />
                  Move Tasks
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Destination Sub-Category
              </label>
              <select
                value={moveCopyTargetSubId}
                onChange={(e) => setMoveCopyTargetSubId(e.target.value)}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">-- Choose Sub-Category --</option>
                {categories.map((cat) => (
                  <optgroup key={cat.id} label={cat.name}>
                    {(cat.sub_categories || []).map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {cat.name} → {sub.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-slate-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMoveCopyModalOpen(false)}
              className="rounded-xl text-xs font-bold h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteModalMoveCopy}
              className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold h-9"
            >
              Confirm {moveCopyAction === "copy" ? "Copy" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Universal WhatsApp Chat Modal */}
      <WhatsAppChatDialog
        open={Boolean(whatsAppContext?.open)}
        onOpenChange={(open) => !open && setWhatsAppContext(null)}
        contextType={whatsAppContext?.contextType}
        task={whatsAppContext?.task}
        client={
          whatsAppContext?.task
            ? (() => {
                const t = whatsAppContext.task!;
                const cId = t.client_id;
                const cName = t.client_name?.trim().toLowerCase();
                let match = allClients.find(
                  (c) =>
                    (cId && c.id === cId) ||
                    (cName &&
                      (c.client_name.trim().toLowerCase() === cName ||
                        c.nick_name?.trim().toLowerCase() === cName ||
                        c.legal_name?.trim().toLowerCase() === cName))
                );
                if (!match && t.project_id) {
                  const proj = projects.find((p) => p.id === t.project_id);
                  if (proj?.client_id) {
                    match = allClients.find((c) => c.id === proj.client_id);
                  }
                  if (!match && proj?.client_name) {
                    const pCName = proj.client_name.trim().toLowerCase();
                    match = allClients.find(
                      (c) =>
                        c.client_name.trim().toLowerCase() === pCName ||
                        c.nick_name?.trim().toLowerCase() === pCName
                    );
                  }
                }
                if (!match) {
                  const pName = t.project_name || projects.find((p) => p.id === t.project_id)?.project_name;
                  if (pName) {
                    const prefix = pName.split(/[-—–]/)[0].trim().toLowerCase();
                    match = allClients.find(
                      (c) =>
                        c.client_name.trim().toLowerCase() === prefix ||
                        c.nick_name?.trim().toLowerCase() === prefix ||
                        prefix.includes(c.client_name.trim().toLowerCase())
                    );
                  }
                }
                return match || null;
              })()
            : null
        }
        project={
          whatsAppContext?.task?.project_id
            ? projects.find((p) => p.id === whatsAppContext.task!.project_id)
            : null
        }
        category={whatsAppContext?.category}
        subCategory={whatsAppContext?.subCategory}
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
