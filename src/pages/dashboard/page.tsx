import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Users2,
  CheckSquare,
  CheckCircle2,
  Clock,
  FolderGit2,
  Plus,
  Search,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  FileCheck2,
  Layers,
  ChevronRight,
  ListChecks,
  UserCheck
} from "lucide-react";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const [serviceSearch, setServiceSearch] = useState("");
  const [worksFilter, setWorksFilter] = useState<"ALL" | "TASKS" | "PROJECTS">("ALL");

  // Real Database Records (Zero Mock Data)
  const services = pmsStore.getServices();
  const clients = pmsStore.getClients();
  const engagements = pmsStore.getAllEngagements();
  const projects = pmsStore.getProjects();
  const tasks = pmsStore.getTasks();

  // 1. COUNT OF SERVICES
  const totalServices = services.length;
  const activeServices = services.filter((s) => s.status === "Active").length;
  const recurringServices = services.filter((s) => s.billing_type === "Recurring").length;
  const oneTimeServices = services.filter((s) => s.billing_type === "One-time").length;

  // 2. COUNT OF EACH SERVICE CLIENTS
  const serviceClientStats = services.map((srv) => {
    // Unique clients subscribed to this service in engagements
    const subscribedEngagements = engagements.filter((e) => e.service_id === srv.id);
    const uniqueClientIds = new Set(subscribedEngagements.map((e) => e.client_id));

    // Also check projects linked to this service
    const linkedProjects = projects.filter(
      (p) => p.service_name === srv.service_name || (p.service_engagement_id && subscribedEngagements.some((e) => e.id === p.service_engagement_id))
    );
    linkedProjects.forEach((p) => {
      if (p.client_id) uniqueClientIds.add(p.client_id);
    });

    return {
      service: srv,
      clientCount: uniqueClientIds.size,
      engagementsCount: subscribedEngagements.length,
      activeProjectsCount: linkedProjects.filter((p) => p.status !== "Completed" && p.status !== "Cancelled").length,
    };
  });

  const totalClientsWithServices = new Set(engagements.map((e) => e.client_id)).size;

  const filteredServiceStats = serviceClientStats.filter((item) =>
    item.service.service_name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
    item.service.service_code.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // 3. TOTAL PENDING WORKS
  const pendingTasks = tasks.filter(
    (t) => t.status === "To Do" || t.status === "In Progress" || t.status === "Under Review" || t.status === "Pending" || t.status === "Blocked"
  );
  const pendingProjects = projects.filter(
    (p) => p.status === "In Progress" || p.status === "Under Review" || p.status === "Not Started" || p.status === "On Hold"
  );
  const totalPendingWorks = pendingTasks.length + pendingProjects.length;

  // 4. TOTAL COMPLETED WORKS
  const completedTasks = tasks.filter((t) => t.status === "Completed");
  const completedProjects = projects.filter((p) => p.status === "Completed");
  const totalCompletedWorks = completedTasks.length + completedProjects.length;

  const totalAllWorks = totalPendingWorks + totalCompletedWorks;
  const completionPercentage = totalAllWorks > 0
    ? Math.round((totalCompletedWorks / totalAllWorks) * 100)
    : 100;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Operations & Deliverables Dashboard
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Live catalog count, client service subscriptions, and real-time pending vs. completed work items.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/services">
            <button className="flex items-center gap-1.5 h-10 px-4 rounded-2xl border border-[#e5e7eb] bg-white text-[#111827] hover:bg-[#f9fafb] text-xs font-bold transition-all shadow-xs">
              <Briefcase className="h-4 w-4" />
              <span>Service Catalog</span>
            </button>
          </Link>
          <Link to="/clients/new">
            <button className="flex items-center gap-1.5 h-10 px-4 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs">
              <Plus className="h-4 w-4" />
              <span>Onboard Client</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 4 PRIMARY METRIC CARDS (Exact User Requirements) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Count of the Services */}
        <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">
              1. Count of Services
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#f3f4f6] text-[#111827]">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#111827] tracking-tight">
              {totalServices}
            </div>
            <p className="text-xs font-semibold text-[#84cc16] mt-1 flex items-center gap-1">
              <span>{activeServices} Active Firm Offerings</span>
            </p>
          </div>
          <div className="pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px] text-[#9ca3af] font-medium">
            <span>{recurringServices} Recurring</span>
            <span>&bull;</span>
            <span>{oneTimeServices} One-time</span>
          </div>
        </div>

        {/* Metric 2: Subscribed Clients across Services */}
        <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">
              2. Clients with Services
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-lime-50 text-[#4d7c0f]">
              <Users2 className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#111827] tracking-tight">
              {totalClientsWithServices}
            </div>
            <p className="text-xs font-semibold text-[#6b7280] mt-1">
              Across {engagements.length} active service subscriptions
            </p>
          </div>
          <div className="pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px] text-[#9ca3af] font-medium">
            <span>Total Clients in Org: {clients.length}</span>
            <Link to="/clients" className="font-bold text-[#111827] hover:underline">
              View &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 3: Total Pending Works */}
        <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">
              3. Total Pending Works
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-orange-50 text-[#c2410c]">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#f97316] tracking-tight">
              {totalPendingWorks}
            </div>
            <p className="text-xs font-semibold text-[#6b7280] mt-1">
              {pendingTasks.length} pending tasks &bull; {pendingProjects.length} active projects
            </p>
          </div>
          <div className="pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px] text-[#9ca3af] font-medium">
            <span>Awaiting sign-off & review</span>
            <Link to="/tasks" className="font-bold text-[#111827] hover:underline">
              View Tasks &rarr;
            </Link>
          </div>
        </div>

        {/* Metric 4: Total Completed Works */}
        <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wider">
              4. Total Completed Works
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="my-3">
            <div className="text-3xl font-black text-[#84cc16] tracking-tight">
              {totalCompletedWorks}
            </div>
            <p className="text-xs font-semibold text-[#4d7c0f] mt-1">
              {completedTasks.length} tasks finalized &bull; {completedProjects.length} projects delivered
            </p>
          </div>
          <div className="pt-3 border-t border-[#f3f4f6] flex items-center justify-between text-[11px] text-[#9ca3af] font-medium">
            <span>Completion Rate: {completionPercentage}%</span>
            <Link to="/projects" className="font-bold text-[#111827] hover:underline">
              Archived &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* SECTION 2: COUNT OF EACH SERVICE CLIENTS (Exact Breakdown Grid) */}
      <div className="rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[#f3f4f6]">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#111827]">
                Count of Clients for Each Service
              </h2>
              <Badge variant="secondary" className="rounded-full text-[10px] font-bold">
                {services.length} Services
              </Badge>
            </div>
            <p className="text-xs text-[#6b7280] mt-0.5">
              Live distribution showing exactly how many clients are subscribed to each service offering.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Filter service..."
              value={serviceSearch}
              onChange={(e) => setServiceSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl text-xs border-[#e5e7eb]"
            />
          </div>
        </div>

        {/* Services Grid with Subscribed Clients Counter */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServiceStats.map((item) => (
            <div
              key={item.service.id}
              className="p-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb]/60 hover:bg-white hover:border-neutral-900 transition-all flex flex-col justify-between shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px] font-bold text-[#111827] bg-white px-2 py-0.5 rounded-lg border border-[#e5e7eb]">
                    {item.service.service_code}
                  </span>
                  <span className="text-[10px] font-semibold text-[#9ca3af] uppercase tracking-wider">
                    {item.service.billing_type}
                  </span>
                </div>
                <h3 className="font-bold text-xs text-[#111827] leading-snug line-clamp-1">
                  {item.service.service_name}
                </h3>
                <p className="text-[11px] text-[#6b7280] mt-1 line-clamp-2 leading-relaxed">
                  {item.service.description}
                </p>
              </div>

              {/* Exact Client Count Pill for this service */}
              <div className="mt-4 pt-3 border-t border-[#e5e7eb]/80 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#6b7280]">
                  Subscribed Clients:
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`font-mono text-xs font-extrabold px-2.5 py-0.5 rounded-full ${
                      item.clientCount > 0
                        ? "bg-[#84cc16] text-white"
                        : "bg-[#e5e7eb] text-[#6b7280]"
                    }`}
                  >
                    {item.clientCount} {item.clientCount === 1 ? "Client" : "Clients"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 3 & 4: DETAILED BREAKDOWN OF PENDING WORKS vs COMPLETED WORKS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Total Pending Works Deep Dive (lg:col-span-6) */}
        <div className="lg:col-span-6 rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#111827]">
                    Total Pending Works
                  </h3>
                  <Badge variant="destructive" className="rounded-full text-[10px] font-bold bg-orange-100 text-[#c2410c] border-transparent">
                    {totalPendingWorks} Pending
                  </Badge>
                </div>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Active tasks and ongoing project deliverables requiring completion.
                </p>
              </div>

              <Link to="/tasks">
                <button className="text-xs font-bold text-[#111827] hover:text-[#84cc16] transition-colors">
                  Open Engine &rarr;
                </button>
              </Link>
            </div>

            {/* Status Breakdown Pills */}
            <div className="grid grid-cols-4 gap-2 my-4 text-center">
              <div className="p-2.5 rounded-xl bg-[#f9fafb] border border-[#e5e7eb]">
                <span className="text-[10px] font-bold text-[#6b7280] uppercase block">To Do</span>
                <span className="font-mono text-base font-black text-[#111827]">
                  {tasks.filter((t) => t.status === "To Do").length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="text-[10px] font-bold text-blue-700 uppercase block">In Progress</span>
                <span className="font-mono text-base font-black text-blue-900">
                  {tasks.filter((t) => t.status === "In Progress").length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100">
                <span className="text-[10px] font-bold text-purple-700 uppercase block">Under Review</span>
                <span className="font-mono text-base font-black text-purple-900">
                  {tasks.filter((t) => t.status === "Under Review").length}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-100">
                <span className="text-[10px] font-bold text-orange-700 uppercase block">Active Projects</span>
                <span className="font-mono text-base font-black text-[#f97316]">
                  {pendingProjects.length}
                </span>
              </div>
            </div>

            {/* List of Real Pending Works */}
            <div className="space-y-2.5 mt-2">
              {pendingTasks.length === 0 && pendingProjects.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[#e5e7eb] text-[#9ca3af]">
                  <CheckCircle2 className="h-8 w-8 mx-auto text-[#84cc16] mb-2" />
                  <p className="text-xs font-bold text-[#111827]">All works are completed!</p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">
                    No pending deliverables or tasks currently awaiting review.
                  </p>
                  <Link to="/tasks?create=true">
                    <button className="mt-3 px-3 py-1.5 rounded-xl bg-neutral-900 text-white text-xs font-bold hover:bg-black">
                      + Create Task
                    </button>
                  </Link>
                </div>
              ) : (
                pendingTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb]/50 hover:bg-white flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-[#f97316] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-[#111827] block leading-snug">
                          {task.title}
                        </span>
                        <span className="text-[10px] text-[#6b7280] block">
                          Project: {task.project_name || "General"} &bull; Assigned to: {task.assigned_employee_name || "Staff"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-semibold text-[#9ca3af] block">
                        Due: {formatDate(task.due_date)}
                      </span>
                      <Badge
                        variant={task.priority === "Urgent" ? "destructive" : "secondary"}
                        className="text-[9px] font-bold rounded-full mt-0.5"
                      >
                        {task.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#f3f4f6] mt-4">
            <Link
              to="/tasks"
              className="w-full py-2 rounded-xl bg-[#f9fafb] hover:bg-[#f3f4f6] text-xs font-semibold text-[#111827] flex items-center justify-center gap-1 transition-colors"
            >
              <span>Manage All Pending Deliverables ({totalPendingWorks})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Right Column: Total Completed Works Deep Dive (lg:col-span-6) */}
        <div className="lg:col-span-6 rounded-[24px] bg-white border-[1.5px] border-slate-300 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#f3f4f6]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#111827]">
                    Total Completed Works
                  </h3>
                  <Badge variant="lime" className="rounded-full text-[10px] font-bold">
                    {totalCompletedWorks} Finalized
                  </Badge>
                </div>
                <p className="text-xs text-[#6b7280] mt-0.5">
                  Archived engagements, filed statutory returns and completed workpapers.
                </p>
              </div>

              <Link to="/projects">
                <button className="text-xs font-bold text-[#111827] hover:text-[#84cc16] transition-colors">
                  View Projects &rarr;
                </button>
              </Link>
            </div>

            {/* Completion Progress Bar */}
            <div className="my-4 p-4 rounded-2xl bg-[#f9fafb] border border-[#e5e7eb]">
              <div className="flex items-center justify-between text-xs font-bold text-[#111827] mb-2">
                <span>Deliverable Fulfillment Ratio</span>
                <span className="font-mono text-[#4d7c0f]">{completionPercentage}% Completed</span>
              </div>
              <div className="h-3 w-full bg-[#e5e7eb] rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-gradient-to-r from-[#84cc16] to-[#a3e635] rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, completionPercentage)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium text-[#6b7280] mt-2">
                <span>{totalCompletedWorks} Completed items</span>
                <span>{totalPendingWorks} Remaining items</span>
              </div>
            </div>

            {/* List of Real Completed Works */}
            <div className="space-y-2.5">
              {completedTasks.length === 0 && completedProjects.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-[#e5e7eb] text-[#9ca3af]">
                  <Clock className="h-8 w-8 mx-auto text-[#9ca3af] mb-2" />
                  <p className="text-xs font-bold text-[#111827]">No completed records yet</p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">
                    Completed tasks and delivered projects will be logged here with sign-off dates.
                  </p>
                </div>
              ) : (
                completedTasks.slice(0, 6).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-2xl border border-[#e5e7eb] bg-white flex items-center justify-between shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#84cc16] shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-[#111827] block leading-snug line-through text-neutral-500">
                          {task.title}
                        </span>
                        <span className="text-[10px] text-[#9ca3af] block">
                          Project: {task.project_name || "General Engagement"}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] font-bold text-[#4d7c0f] border-lime-200 bg-lime-50 rounded-full">
                      Completed
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-[#f3f4f6] mt-4">
            <Link
              to="/projects"
              className="w-full py-2 rounded-xl bg-[#f9fafb] hover:bg-[#f3f4f6] text-xs font-semibold text-[#111827] flex items-center justify-center gap-1 transition-colors"
            >
              <span>View All Completed Deliverables ({totalCompletedWorks})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
