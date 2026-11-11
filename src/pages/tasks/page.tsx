import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CheckSquare,
  Plus,
  Search,
  User,
  Calendar as CalendarIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import { Task, TaskStatus, ProjectPriority } from "@/types";
import { toast } from "sonner";

function TasksContent() {
  const [searchParams] = useSearchParams();
  const autoCreate = searchParams.get("create") === "true";

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

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Create Task</span>
        </Button>
      </div>

      {/* Status Summary Boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["ALL", ...kanbanColumns] as const).map((st) => {
          const count = st === "ALL" ? tasks.length : tasks.filter((t) => t.status === st).length;
          const active = statusFilter === st;
          return (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`text-left p-4 rounded-[20px] border-[1.5px] transition-all ${
                active
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                  : "bg-white text-[#111827] border-slate-300 hover:border-neutral-900"
              }`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${active ? "text-neutral-300" : "text-[#6b7280]"}`}>
                {st === "ALL" ? "All Tasks" : st}
              </span>
              <span className="text-xl font-extrabold mt-0.5 block">{count}</span>
            </button>
          );
        })}
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
              className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-2xl border border-slate-300 bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Under Review">Under Review</option>
            <option value="Completed">Completed</option>
          </select>
        </CardContent>
      </Card>

      {/* TASKS BOX VIEW ONLY */}
      {filteredTasks.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <CheckSquare className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No tasks found</p>
            <p className="text-xs text-[#6b7280]">
              Adjust search or filters, or create a new deliverable task.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTasks.map((task) => (
            <Card
              key={task.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-xl">
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
                  <Badge
                    variant={task.status === "Completed" ? "success" : "secondary"}
                    className="text-[10px] rounded-full shrink-0"
                  >
                    {task.status}
                  </Badge>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-[#111827] leading-snug">
                    {task.title}
                  </h4>
                  {task.description && (
                    <p className="text-xs text-[#6b7280] mt-1 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50/80 border border-slate-300 p-3 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Project
                    </span>
                    <span className="font-bold text-[#111827] mt-0.5 block truncate">
                      {task.project_name || "General"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Assignee
                    </span>
                    <span className="font-bold text-[#111827] mt-0.5 flex items-center gap-1 truncate">
                      <User className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{task.assigned_employee_name || "Unassigned"}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6] gap-2">
                  <span className="text-xs font-medium text-[#6b7280] flex items-center gap-1">
                    <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
                    Due {formatDate(task.due_date)}
                  </span>
                  <select
                    value={task.status}
                    onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                    className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-[#111827] focus:outline-none"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

