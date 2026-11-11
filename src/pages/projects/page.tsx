import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderGit2,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building,
  User,
  ArrowRight,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const projects = pmsStore.getProjects();
  const departments = pmsStore.getDepartments();

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "ALL" || p.project_type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const total = projects.length;
  const active = projects.filter((p) => p.status === "In Progress" || p.status === "Under Review").length;
  const completed = projects.filter((p) => p.status === "Completed").length;
  const overdue = projects.filter((p) => new Date(p.due_date) < new Date() && p.status !== "Completed").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Project Deliverables & Engagements
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Track client compliance milestones, internal initiatives and cross-departmental delivery teams.
          </p>
        </div>
        <Link to="/projects/new">
          <Button size="sm" className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold">
            <Plus className="h-4 w-4" />
            <span>Create New Project</span>
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Total Projects</span>
            <div className="text-2xl font-extrabold text-[#111827] mt-1">{total}</div>
            <span className="text-[11px] text-[#9ca3af]">Across all service groups</span>
          </CardContent>
        </Card>

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Active Executions</span>
            <div className="text-2xl font-extrabold text-[#84cc16] mt-1">{active}</div>
            <span className="text-[11px] text-[#4d7c0f] font-semibold">In Progress & Review</span>
          </CardContent>
        </Card>

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Completed</span>
            <div className="text-2xl font-extrabold text-[#111827] mt-1">{completed}</div>
            <span className="text-[11px] text-[#9ca3af] font-medium">Workpapers archived</span>
          </CardContent>
        </Card>

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
          <CardContent className="p-5">
            <span className="text-[10px] font-bold text-[#6b7280] uppercase tracking-wider">Overdue Critical</span>
            <div className="text-2xl font-extrabold text-[#f97316] mt-1">{overdue}</div>
            <span className="text-[11px] text-[#c2410c] font-semibold">Requiring escalation</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search by project name, ID, or client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Project Types</option>
              <option value="Client Project">Client Project</option>
              <option value="Internal Project">Internal Project</option>
              <option value="General Project">General Project</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Under Review">Under Review</option>
              <option value="On Hold">On Hold</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Box View */}
      {filteredProjects.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <FolderGit2 className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No projects found</p>
            <p className="text-xs text-[#6b7280]">
              Adjust filters or create a new project deliverable.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProjects.map((p) => (
            <Card
              key={p.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Top Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-xl">
                      {p.project_code}
                    </span>
                    <Badge
                      variant={
                        p.priority === "Urgent"
                          ? "destructive"
                          : p.priority === "High"
                          ? "warning"
                          : "outline"
                      }
                      className="text-[10px] rounded-full"
                    >
                      {p.priority}
                    </Badge>
                  </div>
                  <Badge
                    variant={p.status === "Completed" ? "success" : "secondary"}
                    className="text-[10px] rounded-full shrink-0"
                  >
                    {p.status}
                  </Badge>
                </div>

                {/* Title & Scope */}
                <div>
                  <h3 className="text-base font-extrabold text-[#111827] leading-snug">
                    {p.project_name}
                  </h3>
                  <p className="text-xs text-[#6b7280] mt-1 line-clamp-2 leading-relaxed">
                    {p.description || "Project execution scope"}
                  </p>
                </div>

                {/* Client & Lead Box */}
                <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-slate-50/80 border border-slate-300 p-3">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Client / Type
                    </span>
                    <span className="text-xs font-bold text-[#111827] mt-0.5 block truncate">
                      {p.client_name || "Internal Organization"}
                    </span>
                    <span className="text-[10px] text-[#6b7280] block truncate">
                      {p.service_name || p.project_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Lead & Dept
                    </span>
                    <span className="text-xs font-bold text-[#111827] mt-0.5 block truncate">
                      {p.project_manager_name || "Unassigned"}
                    </span>
                    <span className="text-[10px] text-[#6b7280] block truncate">
                      {p.department_name || "Practice"}
                    </span>
                  </div>
                </div>

                {/* Progress & Due Date Footer */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#6b7280]">Progress</span>
                    <span className="font-bold text-[#111827]">{p.progress_percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${p.progress_percentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#f3f4f6] text-xs text-[#6b7280]">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Due {formatDate(p.due_date)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

