import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckSquare,
  ListChecks,
  MessageSquare,
  Plus,
  User,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { isEmployeeRestricted, isProjectAssignedToEmployee, isTaskAssignedToEmployee } from "@/lib/access";
import { ProjectPriority, ProjectStatus, TaskStatus } from "@/types";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { ProjectTimeline } from "@/components/tasks/project-timeline";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

const PROJECT_STATUSES: ProjectStatus[] = [
  "Not Started",
  "In Progress",
  "Under Review",
  "On Hold",
  "Completed",
  "Cancelled",
];

export default function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = id || "";
  const [, setTick] = useState(0);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Add Task inline state
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<ProjectPriority>("Medium");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const project = pmsStore.getProjectById(projectId);
  const allStoreTasks = pmsStore.getTasks();
  const allProjectTasks = project ? pmsStore.getTasksByProjectId(project.id) : [];
  const tasks = isEmployee && project
    ? project.project_manager_id === empId
      ? allProjectTasks
      : allProjectTasks.filter((t) => isTaskAssignedToEmployee(t, empId))
    : allProjectTasks;
  const employees = pmsStore.getEmployees();
  const taskStatusNames = pmsStore.getTaskStatusNames();

  useEffect(() => {
    if (project) {
      setNewTaskStartDate(project.start_date || new Date().toISOString().slice(0, 10));
      setNewTaskDueDate(project.due_date || new Date().toISOString().slice(0, 10));
      setNewTaskAssigneeId(project.project_manager_id || employees[0]?.id || "");
    }
  }, [project?.id]);

  if (!project) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Project Not Found</h2>
        <p className="text-xs text-slate-500">The requested project workspace does not exist.</p>
        <Link to="/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  if (isEmployee && !isProjectAssignedToEmployee(project, empId, allStoreTasks)) {
    return (
      <div className="py-24 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-xs text-slate-500">
          Employees can only view projects and tasks assigned to them.
        </p>
        <Link to="/projects">
          <Button variant="outline">Back to Assigned Projects</Button>
        </Link>
      </div>
    );
  }

  const totalSubtasks = tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
  const completedSubtasks = tasks.reduce(
    (sum, t) => sum + (t.subtasks || []).filter((s) => s.status === "Completed").length,
    0
  );
  const totalComments = tasks.reduce((sum, t) => sum + (t.comments_count || 0), 0);

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId);
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.error("Please enter a task title.");
      return;
    }
    const emp = employees.find((item) => item.id === newTaskAssigneeId);
    try {
      await pmsStore.addTask({
        title: newTaskTitle.trim(),
        project_id: project.id,
        project_name: project.project_name,
        assigned_employee_id: emp?.id || project.project_manager_id,
        assigned_employee_name: emp?.full_name || project.project_manager_name,
        priority: newTaskPriority,
        start_date: newTaskStartDate || project.start_date,
        due_date: newTaskDueDate || project.due_date,
        status: "To Do",
        description: `Deliverable task under ${project.project_name}.`,
        created_by: pmsStore.getCurrentUser().id,
        created_by_name: pmsStore.getCurrentUser().full_name,
      });
      setNewTaskTitle("");
      toast.success("Task created.");
      setTick((t) => t + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create task in database.");
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Box */}
      <div className="rounded-[24px] border-[1.5px] border-slate-300 bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Link to="/projects">
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-slate-300 shrink-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-xl">
                  {project.project_code}
                </span>
                {project.client_id && (
                  <Link
                    to={`/clients/${project.client_id}`}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-2.5 py-0.5 font-bold text-slate-700 hover:border-neutral-900"
                  >
                    <Building2 className="h-3 w-3 text-violet-600" />
                    <span>{project.client_name}</span>
                  </Link>
                )}
                <Badge variant={project.priority === "Urgent" ? "destructive" : "outline"} className="text-[10px]">
                  {project.priority} Priority
                </Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827] mt-1">
                {project.project_name}
              </h1>
              <p className="text-xs text-[#6b7280] mt-1">
                {project.description || "Client -> Project -> Tasks -> Subtasks delivery workspace."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isEmployee ? (
              <>
                <Badge variant="outline" className="h-9 px-3.5 rounded-2xl text-xs font-bold bg-amber-50 text-amber-800 border-amber-300">
                  View Only
                </Badge>
                <Badge variant={project.status === "Completed" ? "success" : "secondary"} className="h-9 px-3.5 rounded-2xl text-xs font-bold">
                  {project.status}
                </Badge>
              </>
            ) : (
              <select
                value={project.status}
                onChange={async (e) => {
                  const nextStatus = e.target.value as ProjectStatus;
                  try {
                    await pmsStore.updateProject(project.id, { status: nextStatus });
                    toast.success(`Project status changed to ${nextStatus}`);
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to update project status in database.");
                  }
                }}
                className="h-10 rounded-2xl border-[1.5px] border-slate-300 bg-white px-3.5 text-xs font-bold text-[#111827]"
              >
                {PROJECT_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-200">
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Start Date → Due Date
            </span>
            <span className="text-xs font-extrabold text-[#111827] mt-1 block">
              {formatDate(project.start_date)} → {formatDate(project.due_date)}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Project Lead
            </span>
            <span className="text-xs font-extrabold text-[#111827] mt-1 block truncate">
              {project.project_manager_name || "Unassigned"}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Tasks
            </span>
            <span className="text-sm font-extrabold text-[#111827] mt-1 block">
              {tasks.filter((t) => t.status === "Completed").length}/{tasks.length} Done
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Subtasks
            </span>
            <span className="text-sm font-extrabold text-[#111827] mt-1 block">
              {completedSubtasks}/{totalSubtasks} Done
            </span>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50/70 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Progress & Comments
            </span>
            <span className="text-sm font-extrabold text-[#111827] mt-1 block">
              {project.progress_percentage}% • {totalComments} Note(s)
            </span>
          </div>
        </div>
      </div>

      {/* Add Task Box (Admin Only) */}
      {!isEmployee && (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white">
        <CardContent className="p-5">
          <form onSubmit={handleCreateTask} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Add New Project Task
              </label>
              <Input
                placeholder="e.g. GSTR-3B Liability Verification & Chalan Prep"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Start Date
              </label>
              <Input
                type="date"
                value={newTaskStartDate}
                onChange={(e) => setNewTaskStartDate(e.target.value)}
                className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Due Date
              </label>
              <Input
                type="date"
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                className="h-9 rounded-xl border-[1.5px] border-slate-300 text-xs"
              />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Assignee
              </label>
              <select
                value={newTaskAssigneeId}
                onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                className="w-full h-9 rounded-xl border-[1.5px] border-slate-300 bg-white px-2.5 text-xs font-semibold"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name}
                  </option>
                ))}
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
          </form>
        </CardContent>
      </Card>
      )}

      {/* Timeline View */}
      <ProjectTimeline
        tasks={tasks}
        projectStartDate={project.start_date}
        projectDueDate={project.due_date}
        onSelectTask={handleOpenTask}
        title="Project Timeline (Tasks & Subtasks)"
      />

      {/* Project Tasks Box Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-[#111827] flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-violet-600" />
            <span>Project Tasks & Subtasks ({tasks.length})</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            {isEmployee
              ? "Click any task box to view subtasks, dates, status & comments (Read-Only)"
              : "Click any task box to manage subtasks, dates, status & comments"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tasks.map((task) => {
            const subtasks = task.subtasks || [];
            const doneSubs = subtasks.filter((s) => s.status === "Completed").length;
            return (
              <Card
                key={task.id}
                className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:border-neutral-900 transition-all"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-0.5 rounded-xl">
                        {task.task_code}
                      </span>
                      <Badge variant={task.priority === "Urgent" ? "destructive" : "outline"} className="text-[10px]">
                        {task.priority}
                      </Badge>
                    </div>
                    {isEmployee ? (
                      <Badge variant={task.status === "Completed" ? "success" : "secondary"} className="text-xs font-bold">
                        {task.status}
                      </Badge>
                    ) : (
                      <select
                        value={task.status}
                        onChange={async (e) => {
                          const nextStatus = e.target.value as TaskStatus;
                          try {
                            await pmsStore.updateTaskStatus(task.id, nextStatus);
                            toast.success(`Task status updated to ${nextStatus}`);
                            setTick((t) => t + 1);
                          } catch (err: any) {
                            toast.error(err?.message || "Failed to update task status in database.");
                          }
                        }}
                        className="h-8 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-[#111827]"
                      >
                        {taskStatusNames.map((st) => (
                          <option key={st} value={st}>
                            {st}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => handleOpenTask(task.id)}
                      className="text-left group"
                    >
                      <h3 className="text-base font-extrabold text-[#111827] group-hover:text-violet-700 transition-colors">
                        {task.title}
                      </h3>
                    </button>
                    {task.description && (
                      <p className="text-xs text-[#6b7280] mt-1 line-clamp-2">{task.description}</p>
                    )}
                  </div>

                  {/* Start Date -> Due Date & Assignee Box */}
                  <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-300 bg-slate-50/80 p-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Start Date</span>
                      <span className="font-bold text-[#111827]">
                        {formatDate(task.start_date || project.start_date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Due Date</span>
                      <span className="font-bold text-[#111827]">{formatDate(task.due_date)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Assignee</span>
                      <span className="font-bold text-[#111827] truncate flex items-center gap-1">
                        <User className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{task.assigned_employee_name || "Unassigned"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Subtasks Preview inside Box */}
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/40 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="h-3.5 w-3.5 text-violet-600" />
                        Subtasks ({doneSubs}/{subtasks.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenTask(task.id)}
                        className="text-violet-700 hover:underline font-bold"
                      >
                        {isEmployee ? "View Subtasks" : "+ Manage Subtasks"}
                      </button>
                    </div>
                    {subtasks.length === 0 ? (
                      <p className="text-[11px] text-slate-400">
                        {isEmployee ? "No subtasks assigned." : "No subtasks yet. Click + Manage Subtasks to add any number of subtasks."}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-44 overflow-y-auto pr-0.5">
                        {subtasks.map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                          >
                            <button
                              type="button"
                              onClick={async () => {
                                if (isEmployee) {
                                  handleOpenTask(sub.id);
                                  return;
                                }
                                const next = sub.status === "Completed" ? "To Do" : "Completed";
                                try {
                                  await pmsStore.updateTaskStatus(sub.id, next);
                                  setTick((t) => t + 1);
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to update subtask status in database.");
                                }
                              }}
                              className="flex items-center gap-2 text-left min-w-0 flex-1"
                            >
                              <span
                                className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${
                                  sub.status === "Completed"
                                    ? "bg-emerald-600 border-emerald-600 text-white"
                                    : "border-slate-400"
                                }`}
                              >
                                {sub.status === "Completed" ? "✓" : ""}
                              </span>
                              <span
                                className={`truncate font-semibold ${
                                  sub.status === "Completed"
                                    ? "line-through text-slate-400"
                                    : "text-slate-800"
                                }`}
                              >
                                {sub.title}
                              </span>
                            </button>
                            <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                              {sub.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 gap-2">
                    <span className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-sky-600" />
                      {task.comments_count || 0} Comment(s)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenTask(task.id)}
                        className="h-8 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Subtasks, Timeline & Comments</span>
                      </Button>
                      {!isEmployee && (
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await pmsStore.deleteTask(task.id);
                              toast.success(`Deleted task ${task.task_code}`);
                              setTick((t) => t + 1);
                            } catch (err: any) {
                              toast.error(err?.message || "Failed to delete task from database.");
                            }
                          }}
                          className="h-8 w-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700 shrink-0"
                          title="Delete Task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <TaskDetailDialog
        taskId={selectedTaskId}
        open={isTaskModalOpen}
        onOpenChange={setIsTaskModalOpen}
        onUpdated={() => setTick((t) => t + 1)}
        readOnly={isEmployee}
      />
    </div>
  );
}

