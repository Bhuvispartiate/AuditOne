"use client";

export const dynamic = "force-dynamic";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  User,
  FolderGit2,
  MessageSquare,
  Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import { Task, TaskStatus, ProjectPriority } from "@/types";
import { toast } from "sonner";

function TasksContent() {
  const searchParams = useSearchParams();
  const autoCreate = searchParams.get("create") === "true";

  const [view, setView] = useState<"list" | "kanban" | "calendar" | "timeline">("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(autoCreate);

  const tasks = pmsStore.getTasks();
  const projects = pmsStore.getProjects();
  const employees = pmsStore.getEmployees();

  // New task form state
  const [taskTitle, setTaskTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id || "");
  const [assignedEmployeeId, setAssignedEmployeeId] = useState(employees[0]?.id || "");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10));
  const [description, setDescription] = useState("");

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.task_code.toLowerCase().includes(search.toLowerCase()) ||
      (t.project_name && t.project_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }

    const proj = projects.find((p) => p.id === projectId);
    const emp = employees.find((e) => e.id === assignedEmployeeId);

    pmsStore.addTask({
      title: taskTitle,
      project_id: projectId,
      project_name: proj?.project_name,
      assigned_employee_id: assignedEmployeeId,
      assigned_employee_name: emp?.full_name,
      priority,
      due_date: dueDate,
      status: "To Do",
      description,
      created_by: pmsStore.getCurrentUser().id,
      created_by_name: pmsStore.getCurrentUser().full_name,
    });

    toast.success(`Task created successfully.`);
    setIsModalOpen(false);
    setTaskTitle("");
    setDescription("");
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    pmsStore.updateTaskStatus(taskId, newStatus);
    toast.success(`Task status updated to ${newStatus}`);
  };

  const kanbanColumns: TaskStatus[] = ["To Do", "In Progress", "Under Review", "Completed"];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Task Management Engine
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Deliverables, subtasks, workpaper reviews, due-date tracking and employee allocations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="bg-white p-1 rounded-2xl flex items-center gap-1 border border-[#e5e7eb] shadow-xs">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === "kanban" ? "bg-neutral-900 text-white" : "text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              <Kanban className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === "list" ? "bg-neutral-900 text-white" : "text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>List</span>
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === "calendar" ? "bg-neutral-900 text-white" : "text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendar</span>
            </button>
            <button
              onClick={() => setView("timeline")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                view === "timeline" ? "bg-neutral-900 text-white" : "text-[#6b7280] hover:text-[#111827]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search tasks by title, code, or project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium focus:ring-1 focus:ring-blue-600 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Under Review">Under Review</option>
            <option value="Completed">Completed</option>
          </select>
        </CardContent>
      </Card>

      {/* VIEW 1: KANBAN BOARD */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col);
            return (
              <div key={col} className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 min-h-[500px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                      {col}
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  {colTasks.map((task) => (
                    <Card
                      key={task.id}
                      className="shadow-xs hover:shadow-md transition-all border-slate-200 cursor-pointer bg-white"
                    >
                      <CardContent className="p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
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
                            className="text-[9px] px-1.5 py-0"
                          >
                            {task.priority}
                          </Badge>
                        </div>

                        <h4 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2">
                          {task.title}
                        </h4>

                        <p className="text-[11px] text-slate-500 font-medium truncate">
                          {task.project_name}
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <User className="h-3 w-3 text-slate-400" />
                            {task.assigned_employee_name?.split(" ")[0] || "Unassigned"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Due {formatDate(task.due_date)}
                          </span>
                        </div>

                        {/* Quick Move Action */}
                        <div className="pt-1 flex items-center gap-1 justify-end">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                            className="text-[10px] bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-600 focus:outline-none"
                          >
                            <option value="To Do">Move: To Do</option>
                            <option value="In Progress">Move: In Progress</option>
                            <option value="Under Review">Move: Review</option>
                            <option value="Completed">Move: Completed</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: LIST VIEW */}
      {view === "list" && (
        <Card className="shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Task ID</TableHead>
                  <TableHead>Task Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((t) => (
                  <TableRow key={t.id} className="hover:bg-slate-50/80">
                    <TableCell className="font-mono text-xs font-bold text-blue-700">
                      {t.task_code}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-slate-900 block text-xs">
                        {t.title}
                      </span>
                      {t.description && (
                        <span className="text-[11px] text-slate-500 line-clamp-1">
                          {t.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">
                      {t.project_name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700">
                      {t.assigned_employee_name || "Unassigned"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.priority === "Urgent"
                            ? "destructive"
                            : t.priority === "High"
                            ? "warning"
                            : "outline"
                        }
                        className="text-[10px]"
                      >
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(t.due_date)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={t.status === "Completed" ? "success" : "secondary"}
                        className="text-[10px]"
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                        className="text-xs bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                      >
                        <option value="To Do">To Do</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Under Review">Under Review</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* VIEW 3: CALENDAR VIEW */}
      {view === "calendar" && (
        <Card className="shadow-xs p-6">
          <CardHeader className="p-0 pb-4 border-b">
            <CardTitle className="text-base font-semibold">Monthly Calendar Deadlines</CardTitle>
            <CardDescription className="text-xs">Visual deadline map for task deliverables</CardDescription>
          </CardHeader>
          <div className="grid grid-cols-7 gap-2 pt-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center font-bold text-xs uppercase text-slate-400 py-1">
                {day}
              </div>
            ))}
            {Array.from({ length: 35 }).map((_, i) => {
              const dayNum = (i % 31) + 1;
              const hasTask = dayNum === 25 || dayNum === 10 || dayNum === 15;
              return (
                <div key={i} className="min-h-[85px] p-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-semibold text-slate-600">{dayNum}</span>
                  {hasTask && (
                    <div className="mt-1 p-1 bg-blue-50 text-blue-800 rounded border border-blue-200 text-[10px] font-medium truncate">
                      Due: Audit Filing
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* VIEW 4: TIMELINE VIEW */}
      {view === "timeline" && (
        <Card className="shadow-xs p-6">
          <CardHeader className="p-0 pb-4 border-b">
            <CardTitle className="text-base font-semibold">Gantt & Execution Timeline</CardTitle>
            <CardDescription className="text-xs">Sequential task delivery track</CardDescription>
          </CardHeader>
          <div className="space-y-4 pt-4">
            {filteredTasks.map((t, idx) => (
              <div key={t.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">{t.task_code}: {t.title}</span>
                  <span className="text-slate-500 font-mono text-[11px]">Due {formatDate(t.due_date)}</span>
                </div>
                <div className="w-full bg-slate-100 h-6 rounded-md overflow-hidden relative border border-slate-200">
                  <div
                    className={`h-full rounded-md flex items-center px-2 text-[10px] font-bold text-white ${
                      t.status === "Completed" ? "bg-emerald-600" : "bg-blue-600"
                    }`}
                    style={{ width: `${(idx + 1) * 22}%` }}
                  >
                    {t.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Task Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create Deliverable Task</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Assign task deliverables, priorities and expected completion targets.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTask} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Task Title</label>
              <Input
                placeholder="e.g. Scrutinize 26AS TDS credits against General Ledger"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Parent Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.project_name} ({p.project_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Assigned Employee</label>
                <select
                  value={assignedEmployeeId}
                  onChange={(e) => setAssignedEmployeeId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.designation_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Due Date</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Work Instructions & Checkpoints</label>
              <Textarea
                placeholder="Specific guidance, reference sections, source documents..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TasksPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading tasks board...</div>}>
      <TasksContent />
    </React.Suspense>
  );
}

