import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FolderGit2,
  Plus,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { pmsStore } from "@/lib/data/store";
import { getInitials } from "@/lib/utils";

export default function ProjectsPage() {
  const [, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [clientFilter, setClientFilter] = useState("ALL");

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  const projects = pmsStore.getProjects();
  const clients = pmsStore.getClients();

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.project_code.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === "ALL" || p.project_type === typeFilter;
    const matchesStatus = statusFilter === "ALL" || p.status === statusFilter;
    const matchesClient = clientFilter === "ALL" || p.client_id === clientFilter;

    return matchesSearch && matchesType && matchesStatus && matchesClient;
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
            Track client compliance milestones, internal initiatives and delivery teams.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/projects/new">
            <Button size="sm" className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold">
              <Plus className="h-4 w-4" />
              <span>Create New Project</span>
            </Button>
          </Link>
        </div>
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

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Clients ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.client_name} ({c.client_code})
                </option>
              ))}
            </select>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {filteredProjects.map((p) => {
            const statusClass =
              p.status === "Completed" || p.status === "In Progress"
                ? "bg-[#e9f7d9] text-[#2f6f1e]"
                : p.status === "Under Review"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-600";

            return (
              <Card
                key={p.id}
                className="group rounded-2xl border-[1.5px] border-slate-300 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-neutral-900 hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] transition-all duration-200"
              >
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {/* Top Row: Initials Avatar, Project Title/Code & Status Pill */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-full bg-[#eef2ff] text-[#4f46e5] flex items-center justify-center text-xs font-bold shrink-0">
                        {getInitials(p.project_name, "PR")}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/projects/${p.id}`}
                          className="text-[14px] font-bold text-[#111827] hover:text-[#4f46e5] transition-colors leading-snug block truncate"
                        >
                          {p.project_name}
                        </Link>
                        <p className="text-[11px] font-mono text-[#6b7280] mt-0.5 leading-snug break-words">
                          {p.project_code} ·{" "}
                          <span className="font-sans">{p.client_name || p.project_type}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusClass}`}
                    >
                      {p.status}
                    </span>
                  </div>

                  {/* Full-width Action Button */}
                  <Link to={`/projects/${p.id}`} className="block">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-9 rounded-xl border-slate-300 bg-white hover:bg-slate-50 text-[#111827] text-xs font-semibold shadow-none"
                    >
                      Open Project
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

