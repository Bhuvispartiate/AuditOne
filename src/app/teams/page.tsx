"use client";

import React, { useState } from "react";
import {
  Users,
  Plus,
  Shield,
  UserCheck,
  Building,
  ArrowRight,
  ChevronRight,
  GitPullRequest
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { Team } from "@/types";
import { toast } from "sonner";

export default function TeamsPage() {
  const teams = pmsStore.getTeams();
  const departments = pmsStore.getDepartments();
  const employees = pmsStore.getEmployees();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [supervisorId, setSupervisorId] = useState(employees[0]?.id || "");
  const [description, setDescription] = useState("");

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Please enter a team name.");
      return;
    }

    const dept = departments.find((d) => d.id === departmentId);
    const sup = employees.find((e) => e.id === supervisorId);

    pmsStore.addTeam({
      name: teamName,
      department_id: departmentId,
      department_name: dept?.name,
      supervisor_id: supervisorId,
      supervisor_name: sup?.full_name,
      description,
      status: "Active",
      member_count: 1,
    });

    toast.success(`Team "${teamName}" created under ${dept?.name}.`);
    setIsModalOpen(false);
    setTeamName("");
    setDescription("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Team Management & Operational Hierarchy
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Departmental squads, team leads, supervisor assignments and apprentice reporting.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Team</span>
        </Button>
      </div>

      {/* Visual Hierarchy Architecture Card */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] bg-[#111827] text-white border-neutral-800 rounded-[24px]">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <GitPullRequest className="h-4 w-4 text-blue-400" />
            <h3 className="font-bold text-sm text-white">Configurable Four-Tier Practice Hierarchy</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-blue-400 block">Tier 1: Leadership</span>
              <p className="font-bold text-white mt-1">Practice Head</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Authorizes client pricing & audits</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-indigo-400 block">Tier 2: Management</span>
              <p className="font-bold text-white mt-1">Supervisors / Managers</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Assigns deliverable tasks</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block">Tier 3: Execution</span>
              <p className="font-bold text-white mt-1">Senior / Staff Employees</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Prepares workpapers & filings</p>
            </div>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
              <span className="text-[10px] uppercase font-bold text-amber-400 block">Tier 4: Training</span>
              <p className="font-bold text-white mt-1">Articled Trainees</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Assists in reconciliations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="shadow-xs border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">{team.name}</CardTitle>
                <CardDescription className="text-xs">{team.department_name}</CardDescription>
              </div>
              <Badge variant="success" className="text-[10px]">{team.status}</Badge>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">{team.description}</p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <span className="text-slate-500 font-semibold block uppercase text-[10px]">Team Supervisor / Lead</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">{team.supervisor_name}</span>
              </div>

              {team.members && team.members.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Active Squad Members ({team.members.length}):
                  </span>
                  <div className="space-y-1">
                    {team.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 rounded bg-white border border-slate-100 text-xs">
                        <span className="font-medium text-slate-800">{m.employee_name}</span>
                        <Badge variant="secondary" className="text-[10px]">{m.role_in_team}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Team Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Create New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Team Name</label>
              <Input
                placeholder="e.g. Indirect Tax & GST Litigation Squad"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Team Supervisor / Manager</label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.designation_name})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <Textarea
                placeholder="Operational purpose and scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Team</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

