"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <Link href="/projects/new">
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

      {/* Projects Master Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Project ID</TableHead>
                <TableHead>Project Name & Scope</TableHead>
                <TableHead>Client & Service</TableHead>
                <TableHead>Manager & Team</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProjects.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-mono text-xs font-bold text-blue-700">
                    {p.project_code}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-900 block text-sm">
                      {p.project_name}
                    </span>
                    <span className="text-xs text-slate-500 block mt-0.5 line-clamp-1 max-w-sm">
                      {p.description}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-800 text-xs block">
                      {p.client_name || "Internal Organization"}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {p.service_name || p.project_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-medium text-slate-900 block">{p.project_manager_name}</span>
                    <span className="text-slate-500 text-[11px] block">{p.department_name}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        p.priority === "Urgent"
                          ? "destructive"
                          : p.priority === "High"
                          ? "warning"
                          : "outline"
                      }
                      className="text-[10px]"
                    >
                      {p.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>{formatDate(p.due_date)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-bold text-slate-800">{p.progress_percentage}%</span>
                    <div className="w-20 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full"
                        style={{ width: `${p.progress_percentage}%` }}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={p.status === "Completed" ? "success" : "secondary"}
                      className="text-[11px]"
                    >
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

