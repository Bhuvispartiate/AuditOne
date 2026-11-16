import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Users2,
  CheckCircle2,
  Clock,
  FolderGit2,
  Plus,
  Search,
  Calendar,
  ArrowRight,
  Box,
  Check,
  CheckCheck,
  AtSign,
  Sparkles,
  Layers,
  Eye
} from "lucide-react";
import { pmsStore } from "@/lib/data/store";
import {
  isAdminUser,
  isTaskAssignedToEmployee,
  isProjectAssignedToEmployee,
  isClientAssignedToEmployee,
} from "@/lib/access";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
import { renderCommentWithMentions } from "@/components/tasks/task-comments-box";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

function buildSmoothPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export default function DashboardPage() {
  const [serviceSearch, setServiceSearch] = useState("");
  const [showMentionReceiptsModal, setShowMentionReceiptsModal] = useState(false);
  const [selectedCommentTaskId, setSelectedCommentTaskId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    return pmsStore.subscribe(() => setTick((t) => t + 1));
  }, []);
  const currentUser = pmsStore.getCurrentUser();
  const isAdmin = isAdminUser(currentUser);
  const isEmployee = !isAdmin;
  const empId = currentUser?.id || "";

  // Real Database Records (Zero Mock Data)
  const services = pmsStore.getServices();
  const allClients = pmsStore.getClients();
  const engagements = pmsStore.getAllEngagements();
  const allProjects = pmsStore.getProjects();
  const allTasks = pmsStore.getTasks();
  const employees = pmsStore.getEmployees();

  // Employee View-Only Workspace scoping: strictly show assigned items only
  const tasks = isEmployee
    ? allTasks.filter((t) => isTaskAssignedToEmployee(t, empId))
    : allTasks;
  const projects = isEmployee
    ? allProjects.filter((p) => isProjectAssignedToEmployee(p, empId, allTasks))
    : allProjects;
  const clients = isEmployee
    ? allClients.filter((c) =>
        isClientAssignedToEmployee(c, empId, allProjects, allTasks, engagements)
      )
    : allClients;

  const unseenMentions = pmsStore.getUnseenMentionsForUser(currentUser?.id || "");
  const mentionTrackingList = isAdmin ? pmsStore.getMentionTrackingList() : [];
  const pendingMentionsCount = mentionTrackingList.reduce(
    (sum, m) => sum + m.mentionStatuses.filter((s) => !s.seen).length,
    0
  );

  const firstName = currentUser?.full_name?.split(" ")[0] || "Admin";

  // 1. Catalog & Client Metrics
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.status === "Active").length;
  const totalClientsWithServices = isEmployee
    ? clients.length
    : new Set(engagements.map((e) => e.client_id)).size;
  const activeClientsCount = clients.filter((c) => c.status === "Active").length;

  // 2. Work Metrics
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const inProgressTasks = tasks.filter((t) => t.status === "In Progress");
  const reviewOrTodoTasks = tasks.filter(
    (t) => t.status !== "Completed" && t.status !== "In Progress"
  );
  const pendingTasks = tasks.filter((t) => t.status !== "Completed");

  const completedProjects = projects.filter((p) => p.status === "Completed");
  const pendingProjects = projects.filter(
    (p) => p.status !== "Completed" && p.status !== "Cancelled"
  );

  const totalCompletedWorks = completedTasks.length + completedProjects.length;
  const totalPendingWorks = pendingTasks.length + pendingProjects.length;
  const totalAllWorks = totalCompletedWorks + totalPendingWorks;
  const completionPercentage =
    totalAllWorks > 0 ? Math.round((totalCompletedWorks / totalAllWorks) * 100) : 0;

  // 3. Per-service Client Stats
  const serviceClientStats = services.map((srv) => {
    const subscribedEngagements = engagements.filter((e) => e.service_id === srv.id);
    const uniqueClientIds = new Set(subscribedEngagements.map((e) => e.client_id));
    const linkedProjects = projects.filter(
      (p) =>
        p.service_name === srv.service_name ||
        (p.service_engagement_id &&
          subscribedEngagements.some((e) => e.id === p.service_engagement_id))
    );
    linkedProjects.forEach((p) => {
      if (p.client_id) uniqueClientIds.add(p.client_id);
    });

    return {
      service: srv,
      clientCount: uniqueClientIds.size,
      engagementsCount: subscribedEngagements.length,
    };
  });

  const filteredServiceStats = serviceClientStats.filter(
    (item) =>
      item.service.service_name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      item.service.service_code.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // 4. Trailing 6-Month Performance Series from Real Projects & Tasks
  const performanceSeries = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; completed: number; inProgress: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-US", { month: "short" });
      months.push({ key, label, completed: 0, inProgress: 0 });
    }

    const addItem = (dateStr: string | undefined, isDone: boolean) => {
      const parsed = dateStr ? new Date(dateStr) : now;
      const valid = Number.isNaN(parsed.getTime()) ? now : parsed;
      const itemKey = `${valid.getFullYear()}-${String(valid.getMonth() + 1).padStart(2, "0")}`;
      const bucket = months.find((m) => m.key === itemKey) || months[months.length - 1];
      if (isDone) bucket.completed += 1;
      else bucket.inProgress += 1;
    };

    projects.forEach((p) => addItem(p.updated_at || p.created_at, p.status === "Completed"));
    tasks.forEach((t) => addItem(t.completed_at || t.due_date || t.created_at, t.status === "Completed"));

    return months;
  }, [projects, tasks]);

  const chartWidth = 560;
  const chartHeight = 190;
  const padX = 28;
  const padTop = 18;
  const padBottom = 28;
  const plotW = chartWidth - padX * 2;
  const plotH = chartHeight - padTop - padBottom;

  const maxVal = Math.max(
    5,
    ...performanceSeries.map((m) => Math.max(m.completed, m.inProgress))
  );
  const yMax = Math.ceil(maxVal / 5) * 5;

  const completedPoints = performanceSeries.map((m, idx) => ({
    x: padX + (idx * plotW) / (performanceSeries.length - 1),
    y: padTop + plotH - (m.completed / yMax) * plotH,
  }));
  const inProgressPoints = performanceSeries.map((m, idx) => ({
    x: padX + (idx * plotW) / (performanceSeries.length - 1),
    y: padTop + plotH - (m.inProgress / yMax) * plotH,
  }));

  const completedLine = buildSmoothPath(completedPoints);
  const completedArea = `${completedLine} L ${completedPoints[completedPoints.length - 1].x} ${padTop + plotH} L ${completedPoints[0].x} ${padTop + plotH} Z`;
  const inProgressLine = buildSmoothPath(inProgressPoints);
  const inProgressArea = `${inProgressLine} L ${inProgressPoints[inProgressPoints.length - 1].x} ${padTop + plotH} L ${inProgressPoints[0].x} ${padTop + plotH} Z`;

  // 5. Task Overview Donut Geometry
  const totalTasksCount = tasks.length;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const completedPct = totalTasksCount > 0 ? Math.round((completedTasks.length / totalTasksCount) * 100) : 0;
  const inProgressPct = totalTasksCount > 0 ? Math.round((inProgressTasks.length / totalTasksCount) * 100) : 0;
  const pendingPct = totalTasksCount > 0 ? Math.max(0, 100 - completedPct - inProgressPct) : 0;

  const completedArc = totalTasksCount > 0 ? (completedTasks.length / totalTasksCount) * circumference : 0;
  const inProgressArc = totalTasksCount > 0 ? (inProgressTasks.length / totalTasksCount) * circumference : 0;
  const todoArc = totalTasksCount > 0 ? (reviewOrTodoTasks.length / totalTasksCount) * circumference : 0;

  const handleToggleTaskDone = async (taskId: string, title: string) => {
    try {
      await pmsStore.updateTaskStatus(taskId, "Completed");
      toast.success(`Marked "${title}" as Completed.`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update task in database.");
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Greeting Row Matching Reference Design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1E1E4F] flex items-center gap-2 flex-wrap">
            <span>Welcome back, {firstName}</span>
            <span aria-hidden="true">👋</span>
            {isEmployee && (
              <Badge
                variant="outline"
                className="text-[11px] font-bold bg-[#F6E4C5] text-[#6B4A12] border-amber-300 gap-1"
              >
                <Eye className="h-3 w-3" />
                <span>Employee View-Only Workspace</span>
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#55557A] mt-1 font-medium">
            {isEmployee
              ? "Viewing only your assigned projects, tasks, clients, and service workflows (Read-Only)."
              : "Here's what's happening with your firm, clients, and projects today."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={() => setShowMentionReceiptsModal(true)}
                className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-[#E6E4F0] bg-white text-[#1E1E4F] hover:border-[#272769] text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                <AtSign className="h-3.5 w-3.5 text-[#272769]" />
                <span>Mention Status</span>
                <span
                  className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                    pendingMentionsCount > 0
                      ? "bg-[#F6E4C5] text-[#6B4A12]"
                      : "bg-[#E3E2F5] text-[#272769]"
                  }`}
                >
                  {pendingMentionsCount > 0
                    ? `${pendingMentionsCount} Unseen`
                    : `${mentionTrackingList.length} Tracked`}
                </span>
              </button>
              <Link to="/services">
                <button className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-[#E6E4F0] bg-white text-[#1E1E4F] hover:border-[#272769] text-xs font-bold transition-all shadow-2xs cursor-pointer">
                  <Briefcase className="h-3.5 w-3.5 text-[#272769]" />
                  <span>Services ({totalServices})</span>
                </button>
              </Link>
              <Link to="/clients/new">
                <button className="flex items-center gap-1.5 h-10 px-5 rounded-full bg-[#272769] hover:bg-[#1E1E4F] text-[#E0A95C] text-xs font-bold transition-all shadow-xs cursor-pointer">
                  <Plus className="h-4 w-4 text-[#E0A95C]" />
                  <span>Onboard Client</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Row 1: 4 Pastel Tinted Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Services (Admin) / Assigned Projects (Employee) */}
        <div className="rounded-[24px] bg-white border border-[#E6E4F0] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E3E2F5] text-[#272769]">
              <Box className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#55557A] block truncate">
                {isEmployee ? "Assigned Projects" : "Total Services"}
              </span>
              <span className="text-2xl font-black text-[#1E1E4F] tracking-tight block mt-0.5">
                {isEmployee ? projects.length : totalServices}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#272769] bg-[#E3E2F5] border border-[#E6E4F0] px-2.5 py-1 rounded-full shrink-0">
            {isEmployee ? `${pendingProjects.length} Active` : `${activeServices} Active`}
          </span>
        </div>

        {/* Card 2: Completed Works */}
        <div className="rounded-[24px] bg-white border border-[#E6E4F0] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E3E2F5] text-[#272769]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#55557A] block truncate">
                {isEmployee ? "My Completed Works" : "Completed Works"}
              </span>
              <span className="text-2xl font-black text-[#1E1E4F] tracking-tight block mt-0.5">
                {totalCompletedWorks}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#272769] bg-[#E3E2F5] border border-[#E6E4F0] px-2.5 py-1 rounded-full shrink-0">
            {completionPercentage}% Done
          </span>
        </div>

        {/* Card 3: Pending Works */}
        <div className="rounded-[24px] bg-white border border-[#E6E4F0] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F6E4C5] text-[#6B4A12]">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#55557A] block truncate">
                {isEmployee ? "My Pending Works" : "Pending Works"}
              </span>
              <span className="text-2xl font-black text-[#1E1E4F] tracking-tight block mt-0.5">
                {totalPendingWorks}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#6B4A12] bg-[#F6E4C5] border border-amber-200 px-2.5 py-1 rounded-full shrink-0">
            {pendingTasks.length}T &bull; {pendingProjects.length}P
          </span>
        </div>

        {/* Card 4: Clients with Services (Admin) / Assigned Clients (Employee) */}
        <div className="rounded-[24px] bg-white border border-[#E6E4F0] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E3E2F5] text-[#272769]">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#55557A] block truncate">
                {isEmployee ? "Assigned Clients" : "Clients with Services"}
              </span>
              <span className="text-2xl font-black text-[#1E1E4F] tracking-tight block mt-0.5">
                {totalClientsWithServices}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#272769] bg-[#E3E2F5] border border-[#E6E4F0] px-2.5 py-1 rounded-full shrink-0">
            {activeClientsCount} Active
          </span>
        </div>
      </div>

      {/* Row 2: Project Performance Area Spline + Task Overview Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Project Performance */}
        <div className="lg:col-span-8 rounded-[24px] bg-white border border-[#E6E4F0] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#1E1E4F]">
                Project &amp; Task Performance
              </h2>
              <p className="text-[11px] text-[#55557A] mt-0.5">
                Live 6-month trajectory across completed vs. active deliverables
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-[#55557A]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#272769]" />
                Completed ({totalCompletedWorks})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#E0A95C]" />
                In Progress ({totalPendingWorks})
              </span>
            </div>
          </div>

          <div className="w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-48 overflow-visible"
              role="img"
              aria-label="Project Performance Chart"
            >
              <defs>
                <linearGradient id="perfGradPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#272769" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#272769" stopOpacity="0.01" />
                </linearGradient>
                <linearGradient id="perfGradSecondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E0A95C" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#E0A95C" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Dashed horizontal gridlines */}
              {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                const y = padTop + plotH - t * plotH;
                const val = Math.round(t * yMax);
                return (
                  <g key={i}>
                    <line
                      x1={padX}
                      x2={chartWidth - padX}
                      y1={y}
                      y2={y}
                      stroke="#E6E4F0"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-[#55557A] text-[10px] font-medium"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Secondary In-Progress Curve (Gold highlight) */}
              <path d={inProgressArea} fill="url(#perfGradSecondary)" />
              <path
                d={inProgressLine}
                fill="none"
                stroke="#E0A95C"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Primary Completed Curve (Navy) */}
              <path d={completedArea} fill="url(#perfGradPrimary)" />
              <path
                d={completedLine}
                fill="none"
                stroke="#272769"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Endpoint Highlight Dots */}
              <circle
                cx={inProgressPoints[inProgressPoints.length - 1].x}
                cy={inProgressPoints[inProgressPoints.length - 1].y}
                r="4.5"
                fill="#E0A95C"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle
                cx={completedPoints[completedPoints.length - 1].x}
                cy={completedPoints[completedPoints.length - 1].y}
                r="5.5"
                fill="#272769"
                stroke="#ffffff"
                strokeWidth="2.5"
              />

              {/* Month Labels */}
              {performanceSeries.map((m, idx) => (
                <text
                  key={m.key}
                  x={padX + (idx * plotW) / (performanceSeries.length - 1)}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className="fill-[#55557A] text-[11px] font-semibold"
                >
                  {m.label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Right: Task Overview Donut */}
        <div className="lg:col-span-4 rounded-[24px] bg-white border border-[#E6E4F0] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-[#1E1E4F]">Task Overview</h2>
            <Link to="/tasks" className="text-xs font-bold text-[#272769] hover:underline">
              Open &rarr;
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-between gap-4 my-auto">
            <div className="relative h-36 w-36 shrink-0">
              <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                <circle
                  cx="66"
                  cy="66"
                  r={radius}
                  fill="none"
                  stroke="#E3E2F5"
                  strokeWidth="18"
                />
                {totalTasksCount > 0 && (
                  <>
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke="#272769"
                      strokeWidth="18"
                      strokeDasharray={`${completedArc} ${circumference}`}
                      strokeDashoffset={0}
                    />
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke="#E0A95C"
                      strokeWidth="18"
                      strokeDasharray={`${inProgressArc} ${circumference}`}
                      strokeDashoffset={-completedArc}
                    />
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke="#F6E4C5"
                      strokeWidth="18"
                      strokeDasharray={`${todoArc} ${circumference}`}
                      strokeDashoffset={-(completedArc + inProgressArc)}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-[#1E1E4F] leading-none">
                  {totalTasksCount}
                </span>
                <span className="text-[10px] font-semibold text-[#55557A] mt-1">
                  Total Tasks
                </span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-[#1E1E4F]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#272769]" />
                  Completed
                </span>
                <span className="font-mono font-bold text-[#55557A]">
                  {completedTasks.length} ({completedPct}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-[#1E1E4F]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#E0A95C]" />
                  In Progress
                </span>
                <span className="font-mono font-bold text-[#55557A]">
                  {inProgressTasks.length} ({inProgressPct}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-[#1E1E4F]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#F6E4C5]" />
                  Pending
                </span>
                <span className="font-mono font-bold text-[#55557A]">
                  {reviewOrTodoTasks.length} ({pendingPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Projects & Upcoming Tasks (Box Cards Only) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Recent Projects */}
        <div className="lg:col-span-7 rounded-[24px] bg-white border border-[#E6E4F0] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-[#1E1E4F]">Recent Projects</h2>
            <Link
              to="/projects"
              className="text-xs font-bold text-[#272769] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6E4F0] p-8 text-center">
              <FolderGit2 className="h-8 w-8 mx-auto text-[#272769] mb-2 opacity-75" />
              <p className="text-xs font-bold text-[#1E1E4F]">
                {isEmployee ? "No assigned projects yet" : "No active projects yet"}
              </p>
              <p className="text-[11px] text-[#55557A] mt-0.5">
                {isEmployee
                  ? "Projects assigned to you will appear here automatically."
                  : "Create a client engagement project to monitor progress here."}
              </p>
              {!isEmployee && (
                <Link to="/projects/new">
                  <button className="mt-3 px-4 py-2 rounded-full bg-[#272769] text-[#E0A95C] text-xs font-bold hover:bg-[#1E1E4F] transition-colors cursor-pointer">
                    + New Project
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {projects.slice(0, 4).map((p) => {
                const statusBadgeStyle =
                  p.status === "Completed"
                    ? "bg-[#E3E2F5] text-[#272769] border-transparent"
                    : p.status === "In Progress"
                    ? "bg-[#E3E2F5] text-[#272769] border-transparent"
                    : p.status === "Under Review"
                    ? "bg-[#F6E4C5] text-[#6B4A12] border-transparent"
                    : "bg-[#F6E4C5] text-[#6B4A12] border-transparent";

                return (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="rounded-2xl border border-[#E6E4F0] bg-white p-3.5 hover:border-[#272769] transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E3E2F5] text-[#272769] border border-[#E6E4F0]">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#1E1E4F] truncate">
                          {p.project_name}
                        </h4>
                        <p className="text-[11px] text-[#55557A] truncate">
                          {p.client_name || "Internal Practice"} &bull; {p.project_code}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${statusBadgeStyle}`}
                      >
                        {p.status}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-[#1E1E4F] bg-[#E3E2F5] border border-[#E6E4F0] px-2 py-1 rounded-xl">
                        {p.progress_percentage}%
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Upcoming Tasks */}
        <div className="lg:col-span-5 rounded-[24px] bg-white border border-[#E6E4F0] p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-[#1E1E4F]">
              {isEmployee ? "My Upcoming Tasks" : "Upcoming Tasks"}
            </h2>
            <Link
              to="/tasks"
              className="text-xs font-bold text-[#272769] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E6E4F0] p-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-[#272769] mb-2" />
              <p className="text-xs font-bold text-[#1E1E4F]">All tasks completed!</p>
              <p className="text-[11px] text-[#55557A] mt-0.5">
                No upcoming deliverable tasks pending right now.
              </p>
              {!isEmployee && (
                <Link to="/tasks?create=true">
                  <button className="mt-3 px-4 py-2 rounded-full bg-[#272769] text-[#E0A95C] text-xs font-bold hover:bg-[#1E1E4F] transition-colors cursor-pointer">
                    + Create Task
                  </button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingTasks.slice(0, 4).map((task) => {
                const due = task.due_date ? new Date(task.due_date) : null;
                const dueStr =
                  due && !Number.isNaN(due.getTime())
                    ? due.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                    : "Soon";

                return (
                  <div
                    key={task.id}
                    onClick={isEmployee ? () => setSelectedCommentTaskId(task.id) : undefined}
                    className={`rounded-2xl border border-[#E6E4F0] bg-white p-3.5 hover:border-[#272769] transition-all flex items-center justify-between gap-3 ${
                      isEmployee ? "cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {!isEmployee ? (
                        <button
                          type="button"
                          onClick={() => handleToggleTaskDone(task.id, task.title)}
                          title="Mark task completed"
                          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#E6E4F0] bg-white text-transparent hover:border-[#272769] hover:bg-[#E3E2F5] hover:text-[#272769] transition-colors cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#E6E4F0] bg-[#E3E2F5] text-[#272769]">
                          <Eye className="h-3 w-3" />
                        </span>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#1E1E4F] block truncate">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-[#55557A] block truncate">
                          {task.project_name || "General Practice"}
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#55557A] bg-[#E3E2F5] border border-[#E6E4F0] px-2.5 py-1 rounded-full shrink-0">
                      <Calendar className="h-3 w-3 text-[#272769]" />
                      {dueStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Count of Clients for Each Service (Box View Only - Admin Only) */}
      {isAdmin && (
        <div className="rounded-[24px] bg-white border border-[#E6E4F0] p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#E6E4F0]">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#272769]" />
              <h2 className="text-base font-extrabold text-[#1E1E4F]">
                Count of Clients for Each Service
              </h2>
              <Badge variant="secondary" className="rounded-full text-[10px] font-bold bg-[#E3E2F5] text-[#272769]">
                {services.length} Services
              </Badge>
            </div>
            <p className="text-xs text-[#55557A] mt-0.5">
              Live distribution showing how many clients are subscribed to each real catalog service.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#55557A]" />
            <Input
              type="search"
              placeholder="Filter service..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="pl-9 h-9 rounded-full text-xs border-[#E6E4F0] bg-[#F6F5FB] text-[#1E1E4F]"
            />
          </div>
        </div>

        {filteredServiceStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E6E4F0] p-8 text-center">
            <Sparkles className="h-7 w-7 mx-auto text-[#272769] mb-2 opacity-75" />
            <p className="text-xs font-bold text-[#1E1E4F]">No services created yet</p>
            <p className="text-[11px] text-[#55557A] mt-0.5">
              Add services in the Services catalog to track client subscriptions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServiceStats.map((item) => (
              <div
                key={item.service.id}
                className="p-4 rounded-2xl border border-[#E6E4F0] bg-white hover:border-[#272769] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold text-[#272769] bg-[#E3E2F5] px-2.5 py-0.5 rounded-lg border border-[#E6E4F0]">
                      {item.service.service_code}
                    </span>
                    <span className="text-[10px] font-semibold text-[#55557A] uppercase tracking-wider">
                      {item.service.billing_type}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#1E1E4F] leading-snug line-clamp-1">
                    {item.service.service_name}
                  </h3>
                  <p className="text-[11px] text-[#55557A] mt-1 line-clamp-2 leading-relaxed">
                    {item.service.description || "Professional firm service offering"}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E6E4F0] flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#55557A]">
                    Subscribed Clients:
                  </span>
                  <span
                    className={`font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      item.clientCount > 0
                        ? "bg-[#272769] text-[#E0A95C]"
                        : "bg-[#E3E2F5] text-[#55557A]"
                    }`}
                  >
                    {item.clientCount} {item.clientCount === 1 ? "Client" : "Clients"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {/* Compulsory Mention Alert Popup when current user is @mentioned and has not clicked Seen Message */}
      <Dialog open={unseenMentions.length > 0} onOpenChange={() => {}}>
        <DialogContent
          hideCloseButton
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="max-w-lg rounded-[28px] border border-[#E6E4F0] bg-white p-6 shadow-2xl"
        >
          <DialogHeader className="space-y-1.5 pb-3 border-b border-[#E6E4F0]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-[#E3E2F5] text-[#272769] flex items-center justify-center shrink-0">
                  <AtSign className="h-4 w-4" />
                </span>
                <DialogTitle className="text-base font-extrabold text-[#1E1E4F]">
                  You Were Mentioned in a Comment
                </DialogTitle>
              </div>
              <Badge variant="default" className="rounded-full text-[10px]">
                {unseenMentions.length} Pending
              </Badge>
            </div>
            <DialogDescription className="text-xs text-[#55557A]">
              Please read the message below and click <strong>Seen Message</strong> to confirm receipt.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1 py-1">
            {unseenMentions.map((m) => (
              <div
                key={m.id}
                className="rounded-2xl border border-[#E6E4F0] bg-white p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[10px] font-bold bg-[#272769] text-[#E0A95C] px-2 py-0.5 rounded-md">
                      {m.task_code || "TASK"}
                    </span>
                    <span className="text-xs font-extrabold text-[#1E1E4F]">
                      {m.task_title || "Task Comment"}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#55557A]">
                    {formatDateTime(m.created_at)}
                  </span>
                </div>

                {m.project_name && (
                  <p className="text-[11px] font-semibold text-[#55557A]">
                    {m.project_name} &bull; Posted by <strong className="text-[#1E1E4F]">{m.employee_name}</strong>
                  </p>
                )}

                <div className="rounded-xl border border-[#E6E4F0] bg-[#F6F5FB] px-3 py-2.5 text-xs text-[#1E1E4F] leading-relaxed whitespace-pre-wrap">
                  {renderCommentWithMentions(m.comment, employees)}
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      pmsStore.markCommentSeenByUser(m.id);
                      toast.success("Message marked as Seen.");
                      setTick((t) => t + 1);
                    }}
                    className="h-9 px-4 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-[#E0A95C] text-xs font-bold gap-1.5 cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4 text-[#E0A95C]" />
                    <span>Seen Message</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin-Only Modal: Track Whether Mentioned Users Clicked Seen Message */}
      {isAdmin && (
        <Dialog open={showMentionReceiptsModal} onOpenChange={setShowMentionReceiptsModal}>
          <DialogContent className="max-w-2xl rounded-[24px] border border-[#E6E4F0] bg-white p-6 shadow-2xl">
            <DialogHeader className="space-y-1 pb-3 border-b border-[#E6E4F0]">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-[#272769]" />
                <DialogTitle className="text-base font-extrabold text-[#1E1E4F]">
                  Mention Seen Status (Admin View)
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-[#55557A]">
                Check whether employees mentioned with @ have clicked <strong>Seen Message</strong> on their dashboard.
              </DialogDescription>
            </DialogHeader>

            {mentionTrackingList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#E6E4F0] bg-white p-10 text-center space-y-1">
                <AtSign className="h-7 w-7 mx-auto text-[#55557A]" />
                <p className="text-xs font-bold text-[#1E1E4F]">No @mention messages yet</p>
                <p className="text-[11px] text-[#55557A]">
                  Mention someone with @ in any task or subtask comment to track if they have seen it.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {mentionTrackingList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#E6E4F0] bg-white p-4 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowMentionReceiptsModal(false);
                            setSelectedCommentTaskId(item.task_id);
                          }}
                          className="font-mono text-[10px] font-bold bg-[#272769] text-[#E0A95C] px-2 py-0.5 rounded-md hover:bg-[#1E1E4F] cursor-pointer"
                        >
                          {item.task_code || "TASK"}
                        </button>
                        <span className="text-xs font-extrabold text-[#1E1E4F]">
                          {item.task_title || "Task Comment"}
                        </span>
                      </div>
                      <span className="text-[10px] text-[#55557A]">
                        By <strong>{item.employee_name}</strong> &bull; {formatDateTime(item.created_at)}
                      </span>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-800 whitespace-pre-wrap">
                      {renderCommentWithMentions(item.comment, employees)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {item.mentionStatuses.map((ms) => (
                        <span
                          key={ms.employee_id}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                            ms.seen
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-amber-300 bg-amber-50 text-amber-800"
                          }`}
                        >
                          {ms.seen ? (
                            <>
                              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                              <span>{ms.employee_name}: Seen</span>
                              {ms.seen_at && (
                                <span className="text-[9px] font-normal text-emerald-700">
                                  ({formatDateTime(ms.seen_at)})
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 text-amber-600" />
                              <span>{ms.employee_name}: Not Seen Yet</span>
                            </>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <TaskDetailDialog
        taskId={selectedCommentTaskId}
        open={Boolean(selectedCommentTaskId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedCommentTaskId(null);
        }}
        onUpdated={() => setTick((t) => t + 1)}
        readOnly={isEmployee}
      />
    </div>
  );
}
