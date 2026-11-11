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
  MessageSquare,
  Sparkles,
  Layers
} from "lucide-react";
import { pmsStore } from "@/lib/data/store";
import { GeoLocationSetupCard } from "@/components/attendance/geo-location-setup-card";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";
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
  const [messageSearch, setMessageSearch] = useState("");
  const [selectedCommentTaskId, setSelectedCommentTaskId] = useState<string | null>(null);
  const [, setTick] = useState(0);
  useEffect(() => {
    return pmsStore.subscribe(() => setTick((t) => t + 1));
  }, []);
  const currentUser = pmsStore.getCurrentUser();
  const isAdmin = currentUser?.role_code === "SUPER_ADMIN";

  // Real Database Records (Zero Mock Data)
  const services = pmsStore.getServices();
  const clients = pmsStore.getClients();
  const engagements = pmsStore.getAllEngagements();
  const projects = pmsStore.getProjects();
  const tasks = pmsStore.getTasks();
  const employees = pmsStore.getEmployees();
  const allComments = pmsStore.getAllTaskComments();

  const firstName = currentUser?.full_name?.split(" ")[0] || "Admin";

  // 1. Catalog & Client Metrics
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.status === "Active").length;
  const totalClientsWithServices = new Set(engagements.map((e) => e.client_id)).size;
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

  const handleToggleTaskDone = (taskId: string, title: string) => {
    pmsStore.updateTaskStatus(taskId, "Completed");
    toast.success(`Marked "${title}" as Completed.`);
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Top Greeting Row Matching Reference Design */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#16172d] flex items-center gap-2">
            <span>Welcome back, {firstName}</span>
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#6b7280] mt-1 font-medium">
            Here&apos;s what&apos;s happening with your firm, clients, and projects today.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/services">
            <button className="flex items-center gap-1.5 h-10 px-4 rounded-2xl border-[1.5px] border-slate-300 bg-white text-[#16172d] hover:border-[#6c5ce7] text-xs font-bold transition-all shadow-2xs">
              <Briefcase className="h-3.5 w-3.5 text-[#6c5ce7]" />
              <span>Services ({totalServices})</span>
            </button>
          </Link>
          <Link to="/clients/new">
            <button className="flex items-center gap-1.5 h-10 px-4 rounded-2xl bg-gradient-to-r from-[#6c5ce7] to-[#5b4cdb] hover:opacity-95 text-white text-xs font-bold transition-all shadow-[0_6px_18px_rgba(108,92,231,0.32)]">
              <Plus className="h-4 w-4" />
              <span>Onboard Client</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Row 1: 4 Pastel Tinted Bento KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Lavender — Services & Projects */}
        <div className="rounded-[22px] bg-[#f6f3ff] border-[1.5px] border-[#dfd6ff] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e9e1ff] text-[#6d28d9]">
              <Box className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#5b5e7a] block truncate">
                Total Services
              </span>
              <span className="text-2xl font-black text-[#16172d] tracking-tight block mt-0.5">
                {totalServices}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#15803d] bg-white/80 border border-[#d6f5df] px-2.5 py-1 rounded-full shrink-0">
            {activeServices} Active
          </span>
        </div>

        {/* Card 2: Sky Blue — Completed Works */}
        <div className="rounded-[22px] bg-[#eef7ff] border-[1.5px] border-[#c8e3ff] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#dbeeff] text-[#2563eb]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#5b5e7a] block truncate">
                Completed Works
              </span>
              <span className="text-2xl font-black text-[#16172d] tracking-tight block mt-0.5">
                {totalCompletedWorks}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#15803d] bg-white/80 border border-[#d6f5df] px-2.5 py-1 rounded-full shrink-0">
            {completionPercentage}% Done
          </span>
        </div>

        {/* Card 3: Warm Amber Cream — Pending Works */}
        <div className="rounded-[22px] bg-[#fff7eb] border-[1.5px] border-[#f9dec0] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#ea580c]">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#5b5e7a] block truncate">
                Pending Works
              </span>
              <span className="text-2xl font-black text-[#16172d] tracking-tight block mt-0.5">
                {totalPendingWorks}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#c2410c] bg-white/80 border border-[#fed7aa] px-2.5 py-1 rounded-full shrink-0">
            {pendingTasks.length}T &bull; {pendingProjects.length}P
          </span>
        </div>

        {/* Card 4: Blush Rose — Clients with Services */}
        <div className="rounded-[22px] bg-[#fff1f6] border-[1.5px] border-[#ffd0e4] p-5 flex items-center justify-between gap-3 transition-all hover:shadow-md">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fce7f3] text-[#db2777]">
              <Users2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-semibold text-[#5b5e7a] block truncate">
                Clients with Services
              </span>
              <span className="text-2xl font-black text-[#16172d] tracking-tight block mt-0.5">
                {totalClientsWithServices}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-[#15803d] bg-white/80 border border-[#d6f5df] px-2.5 py-1 rounded-full shrink-0">
            {activeClientsCount} Active
          </span>
        </div>
      </div>

      {/* Row 2: Project Performance Area Spline + Task Overview Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Project Performance */}
        <div className="lg:col-span-8 rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h2 className="text-base font-extrabold text-[#16172d]">
                Project &amp; Task Performance
              </h2>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                Live 6-month trajectory across completed vs. active deliverables
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold text-[#5b5e7a]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6c5ce7]" />
                Completed ({totalCompletedWorks})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#c4b5fd]" />
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
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="perfGradSecondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.01" />
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
                      stroke="#e5e7eb"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x={padX - 8}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-[#9ca3af] text-[10px] font-medium"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Secondary In-Progress Curve */}
              <path d={inProgressArea} fill="url(#perfGradSecondary)" />
              <path
                d={inProgressLine}
                fill="none"
                stroke="#c4b5fd"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Primary Completed Curve */}
              <path d={completedArea} fill="url(#perfGradPrimary)" />
              <path
                d={completedLine}
                fill="none"
                stroke="#6c5ce7"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Endpoint Highlight Dots */}
              <circle
                cx={inProgressPoints[inProgressPoints.length - 1].x}
                cy={inProgressPoints[inProgressPoints.length - 1].y}
                r="4"
                fill="#c4b5fd"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle
                cx={completedPoints[completedPoints.length - 1].x}
                cy={completedPoints[completedPoints.length - 1].y}
                r="5.5"
                fill="#6c5ce7"
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
                  className="fill-[#6b7280] text-[11px] font-semibold"
                >
                  {m.label}
                </text>
              ))}
            </svg>
          </div>
        </div>

        {/* Right: Task Overview Donut */}
        <div className="lg:col-span-4 rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-extrabold text-[#16172d]">Task Overview</h2>
            <Link to="/tasks" className="text-xs font-bold text-[#6c5ce7] hover:underline">
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
                  stroke="#eef0fb"
                  strokeWidth="18"
                />
                {totalTasksCount > 0 && (
                  <>
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke="#6c5ce7"
                      strokeWidth="18"
                      strokeDasharray={`${completedArc} ${circumference}`}
                      strokeDashoffset={0}
                    />
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke="#a5b4fc"
                      strokeWidth="18"
                      strokeDasharray={`${inProgressArc} ${circumference}`}
                      strokeDashoffset={-completedArc}
                    />
                    <circle
                      cx="66"
                      cy="66"
                      r={radius}
                      fill="none"
                      stroke="#ddd6fe"
                      strokeWidth="18"
                      strokeDasharray={`${todoArc} ${circumference}`}
                      strokeDashoffset={-(completedArc + inProgressArc)}
                    />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-[#16172d] leading-none">
                  {totalTasksCount}
                </span>
                <span className="text-[10px] font-semibold text-[#6b7280] mt-1">
                  Total Tasks
                </span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-[#16172d]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#6c5ce7]" />
                  Completed
                </span>
                <span className="font-mono font-bold text-[#5b5e7a]">
                  {completedTasks.length} ({completedPct}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-[#16172d]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#a5b4fc]" />
                  In Progress
                </span>
                <span className="font-mono font-bold text-[#5b5e7a]">
                  {inProgressTasks.length} ({inProgressPct}%)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold text-[#16172d]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#ddd6fe]" />
                  Pending
                </span>
                <span className="font-mono font-bold text-[#5b5e7a]">
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
        <div className="lg:col-span-7 rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-[#16172d]">Recent Projects</h2>
            <Link
              to="/projects"
              className="text-xs font-bold text-[#6c5ce7] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <FolderGit2 className="h-8 w-8 mx-auto text-[#6c5ce7] mb-2 opacity-75" />
              <p className="text-xs font-bold text-[#16172d]">No active projects yet</p>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                Create a client engagement project to monitor progress here.
              </p>
              <Link to="/projects/new">
                <button className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#6c5ce7] text-white text-xs font-bold hover:bg-[#5b4cdb]">
                  + New Project
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {projects.slice(0, 4).map((p) => {
                const statusBadgeStyle =
                  p.status === "Completed"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : p.status === "In Progress"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : p.status === "Under Review"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-slate-100 text-slate-700 border-slate-300";

                return (
                  <div
                    key={p.id}
                    className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-3.5 hover:border-[#6c5ce7] transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3f0ff] text-[#6c5ce7] border border-[#e3dcff]">
                        <FolderGit2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-[#16172d] truncate">
                          {p.project_name}
                        </h4>
                        <p className="text-[11px] text-[#6b7280] truncate">
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
                      <span className="font-mono text-[11px] font-bold text-[#16172d] bg-[#f8f9fd] border border-slate-300 px-2 py-1 rounded-xl">
                        {p.progress_percentage}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Upcoming Tasks */}
        <div className="lg:col-span-5 rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-extrabold text-[#16172d]">Upcoming Tasks</h2>
            <Link
              to="/tasks"
              className="text-xs font-bold text-[#6c5ce7] hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {pendingTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-[#6c5ce7] mb-2" />
              <p className="text-xs font-bold text-[#16172d]">All tasks completed!</p>
              <p className="text-[11px] text-[#6b7280] mt-0.5">
                No upcoming deliverable tasks pending right now.
              </p>
              <Link to="/tasks?create=true">
                <button className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#6c5ce7] text-white text-xs font-bold hover:bg-[#5b4cdb]">
                  + Create Task
                </button>
              </Link>
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
                    className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-3.5 hover:border-[#6c5ce7] transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleTaskDone(task.id, task.title)}
                        title="Mark task completed"
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-[1.5px] border-slate-400 bg-white text-transparent hover:border-[#6c5ce7] hover:bg-[#f6f3ff] hover:text-[#6c5ce7] transition-colors"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-[#16172d] block truncate">
                          {task.title}
                        </span>
                        <span className="text-[11px] text-[#6b7280] block truncate">
                          {task.project_name || "General Practice"}
                        </span>
                      </div>
                    </div>

                    <span className="flex items-center gap-1 text-[11px] font-semibold text-[#5b5e7a] bg-[#f8f9fd] border border-slate-300 px-2.5 py-1 rounded-xl shrink-0">
                      <Calendar className="h-3 w-3 text-[#6c5ce7]" />
                      {dueStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 4: Count of Clients for Each Service (Box View Only) */}
      <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-[#6c5ce7]" />
              <h2 className="text-base font-extrabold text-[#16172d]">
                Count of Clients for Each Service
              </h2>
              <Badge variant="secondary" className="rounded-full text-[10px] font-bold bg-[#f3f0ff] text-[#6c5ce7]">
                {services.length} Services
              </Badge>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Live distribution showing how many clients are subscribed to each real catalog service.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Filter service..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs border-slate-300"
            />
          </div>
        </div>

        {filteredServiceStats.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
            <Sparkles className="h-7 w-7 mx-auto text-[#6c5ce7] mb-2 opacity-75" />
            <p className="text-xs font-bold text-[#16172d]">No services created yet</p>
            <p className="text-[11px] text-[#6b7280] mt-0.5">
              Add services in the Services catalog to track client subscriptions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServiceStats.map((item) => (
              <div
                key={item.service.id}
                className="p-4 rounded-2xl border-[1.5px] border-slate-300 bg-[#fbfbfe] hover:bg-white hover:border-[#6c5ce7] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold text-[#6c5ce7] bg-[#f3f0ff] px-2.5 py-0.5 rounded-lg border border-[#dfd6ff]">
                      {item.service.service_code}
                    </span>
                    <span className="text-[10px] font-semibold text-[#6b7280] uppercase tracking-wider">
                      {item.service.billing_type}
                    </span>
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-[#16172d] leading-snug line-clamp-1">
                    {item.service.service_name}
                  </h3>
                  <p className="text-[11px] text-[#6b7280] mt-1 line-clamp-2 leading-relaxed">
                    {item.service.description || "Professional firm service offering"}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-[#6b7280]">
                    Subscribed Clients:
                  </span>
                  <span
                    className={`font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      item.clientCount > 0
                        ? "bg-[#6c5ce7] text-white"
                        : "bg-slate-200 text-slate-600"
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

      {/* Row 5: Admin Geo-Attendance Control & Today's Attendance Hub */}
      <GeoLocationSetupCard showOpenAttendanceLink />

      {/* Row 6: Admin-Only Message Read Receipts (Who Has Seen Each Message) */}
      {isAdmin && (
        <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-sky-600" />
                <h2 className="text-base font-extrabold text-[#16172d]">
                  Message Seen Receipts
                </h2>
                <Badge variant="secondary" className="rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                  Admin Only &bull; {allComments.length} Messages
                </Badge>
              </div>
              <p className="text-xs text-[#6b7280] mt-0.5">
                Track every comment across tasks and subtasks and see exactly who has seen each message.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
              <Input
                type="search"
                placeholder="Filter by message, task, or person..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs border-slate-300"
              />
            </div>
          </div>

          {(() => {
            const q = messageSearch.trim().toLowerCase();
            const visibleComments = q
              ? allComments.filter(
                  (c) =>
                    c.comment.toLowerCase().includes(q) ||
                    c.employee_name.toLowerCase().includes(q) ||
                    (c.task_code && c.task_code.toLowerCase().includes(q)) ||
                    (c.task_title && c.task_title.toLowerCase().includes(q)) ||
                    (c.read_by || []).some((r) => r.employee_name.toLowerCase().includes(q))
                )
              : allComments;

            if (visibleComments.length === 0) {
              return (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
                  <CheckCheck className="h-7 w-7 mx-auto text-sky-600 mb-2 opacity-75" />
                  <p className="text-xs font-bold text-[#16172d]">No messages yet</p>
                  <p className="text-[11px] text-[#6b7280] mt-0.5">
                    Comments posted on tasks or subtasks will appear here with who has seen them.
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {visibleComments.map((c) => {
                  const readBy = c.read_by || [];
                  const notSeenEmployees = employees.filter(
                    (emp) => emp.is_active && !readBy.some((r) => r.employee_id === emp.id)
                  );

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border-[1.5px] border-slate-300 bg-[#fbfbfe] p-4 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedCommentTaskId(c.task_id)}
                            className="font-mono text-[11px] font-bold bg-neutral-900 text-white px-2.5 py-0.5 rounded-lg hover:bg-violet-700 transition-colors"
                          >
                            {c.task_code || "TASK"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedCommentTaskId(c.task_id)}
                            className="text-xs font-extrabold text-[#16172d] hover:text-violet-700 text-left"
                          >
                            {c.task_title || "Task Comment"}
                          </button>
                          {c.project_name && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              &bull; {c.project_name}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          Posted by <strong className="text-[#16172d]">{c.employee_name}</strong> &bull;{" "}
                          {formatDateTime(c.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-white rounded-xl border border-slate-200 px-3 py-2">
                        {c.comment}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 font-bold text-sky-700 mr-1">
                            <CheckCheck className="h-3.5 w-3.5 text-sky-600" />
                            Seen by ({readBy.length}):
                          </span>
                          {readBy.map((r) => (
                            <span
                              key={r.employee_id}
                              title={`Seen at ${formatDateTime(r.read_at)}`}
                              className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800"
                            >
                              {r.employee_name}
                              <span className="text-[9px] font-normal text-emerald-700">
                                ({formatDateTime(r.read_at)})
                              </span>
                            </span>
                          ))}
                        </div>

                        {notSeenEmployees.length > 0 && (
                          <div className="text-[10px] text-slate-500">
                            Not seen yet:{" "}
                            <span className="font-semibold text-amber-700">
                              {notSeenEmployees.map((e) => e.full_name).join(", ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      <TaskDetailDialog
        taskId={selectedCommentTaskId}
        open={Boolean(selectedCommentTaskId)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setSelectedCommentTaskId(null);
        }}
        onUpdated={() => setTick((t) => t + 1)}
      />
    </div>
  );
}
