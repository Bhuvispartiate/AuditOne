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
  const employees = pmsStore.getEmployees();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [supervisorId, setSupervisorId] = useState(employees[0]?.id || "");
  const [description, setDescription] = useState("");

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast.error("Please enter a team name.");
      return;
    }

    const sup = employees.find((e) => e.id === supervisorId);

    try {
      await pmsStore.addTeam({
        name: teamName,
        supervisor_id: supervisorId,
        supervisor_name: sup?.full_name,
        description,
        status: "Active",
        member_count: 1,
      });

      toast.success(`Team "${teamName}" created.`);
      setIsModalOpen(false);
      setTeamName("");
      setDescription("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to create team in database.");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1E1E4F]">
            Team Management & Operational Hierarchy
          </h1>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-[#272769] hover:bg-[#1E1E4F] !text-white gap-1.5 rounded-full px-5 h-10 shadow-xs font-bold text-xs cursor-pointer"
          style={{ backgroundColor: "#272769", color: "#FFFFFF" }}
        >
          <Plus className="h-4 w-4 !text-white" style={{ color: "#FFFFFF", stroke: "#FFFFFF" }} />
          <span className="!text-white" style={{ color: "#FFFFFF" }}>Create New Team</span>
        </Button>
      </div>

      {/* Visual Hierarchy Architecture Card (Website Theme) */}
      <div className="rounded-[28px] border border-[#E6E4F0] bg-white shadow-xs p-5 sm:p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#272769] text-white shadow-2xs">
            <GitPullRequest className="h-4 w-4 text-white" />
          </div>
          <h3 className="font-extrabold text-sm text-[#1E1E4F] tracking-tight">
            Configurable Four-Tier Practice Hierarchy
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          {/* Tier 1 */}
          <div className="p-4 bg-[#F6F5FB] rounded-2xl border border-[#E6E4F0] shadow-2xs transition-all hover:border-[#272769]/30 hover:shadow-xs">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#E0A95C] block">
              Tier 1: Leadership
            </span>
            <p className="font-extrabold text-[#1E1E4F] text-sm mt-1">Practice Head</p>
            <p className="text-[11px] text-[#55557A] mt-0.5 leading-snug">
              Authorizes client pricing & audits
            </p>
          </div>

          {/* Tier 2 */}
          <div className="p-4 bg-[#F6F5FB] rounded-2xl border border-[#E6E4F0] shadow-2xs transition-all hover:border-[#272769]/30 hover:shadow-xs">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#272769] block">
              Tier 2: Management
            </span>
            <p className="font-extrabold text-[#1E1E4F] text-sm mt-1">Supervisors / Managers</p>
            <p className="text-[11px] text-[#55557A] mt-0.5 leading-snug">
              Assigns deliverable tasks
            </p>
          </div>

          {/* Tier 3 */}
          <div className="p-4 bg-[#F6F5FB] rounded-2xl border border-[#E6E4F0] shadow-2xs transition-all hover:border-[#272769]/30 hover:shadow-xs">
            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-700 block">
              Tier 3: Execution
            </span>
            <p className="font-extrabold text-[#1E1E4F] text-sm mt-1">Senior / Staff Employees</p>
            <p className="text-[11px] text-[#55557A] mt-0.5 leading-snug">
              Prepares workpapers & filings
            </p>
          </div>

          {/* Tier 4 */}
          <div className="p-4 bg-[#F6F5FB] rounded-2xl border border-[#E6E4F0] shadow-2xs transition-all hover:border-[#272769]/30 hover:shadow-xs">
            <span className="text-[10px] uppercase font-black tracking-wider text-[#6B4A12] block">
              Tier 4: Training
            </span>
            <p className="font-extrabold text-[#1E1E4F] text-sm mt-1">Articled Trainees</p>
            <p className="text-[11px] text-[#55557A] mt-0.5 leading-snug">
              Assists in reconciliations
            </p>
          </div>
        </div>
      </div>

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <div key={team.id} className="rounded-[24px] border border-[#E6E4F0] bg-white shadow-xs p-5 space-y-4">
            <div className="pb-3 border-b border-[#E6E4F0] flex flex-row items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-extrabold text-[#1E1E4F]">{team.name}</h4>
                <p className="text-xs text-[#55557A] font-medium mt-0.5">Operational Squad</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E3E2F5] text-[#272769] border border-[#E6E4F0]">
                {team.status}
              </span>
            </div>
            <div className="space-y-4">
              <p className="text-xs text-[#55557A] leading-relaxed">{team.description}</p>
              <div className="p-3.5 bg-[#F6F5FB] rounded-2xl border border-[#E6E4F0] text-xs">
                <span className="text-[#55557A] font-bold block uppercase text-[10px]">Team Supervisor / Lead</span>
                <span className="font-extrabold text-[#1E1E4F] text-sm mt-0.5 block">{team.supervisor_name}</span>
              </div>

              {team.members && team.members.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-extrabold text-[#1E1E4F] uppercase tracking-wider block">
                    Active Squad Members ({team.members.length}):
                  </span>
                  <div className="space-y-1.5">
                    {team.members.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#F6F5FB] border border-[#E6E4F0] text-xs">
                        <span className="font-bold text-[#1E1E4F]">{m.employee_name}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E3E2F5] text-[#272769]">
                          {m.role_in_team}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Team Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-[28px] border-[#E6E4F0] bg-white p-6 sm:p-7 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-[#1E1E4F]">Create New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1E1E4F]">Team Name</label>
              <Input
                placeholder="e.g. Indirect Tax & GST Litigation Squad"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="rounded-xl border-[#E6E4F0] bg-white text-xs font-medium focus:border-[#272769] focus:ring-[#272769]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1E1E4F]">Team Supervisor / Manager</label>
              <select
                value={supervisorId}
                onChange={(e) => setSupervisorId(e.target.value)}
                className="w-full h-10 rounded-xl border border-[#E6E4F0] bg-white px-3 text-xs font-medium text-[#1E1E4F] focus:outline-none focus:border-[#272769]"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.designation_name})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#1E1E4F]">Description</label>
              <Textarea
                placeholder="Operational purpose and scope..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl border-[#E6E4F0] bg-white text-xs font-medium focus:border-[#272769] focus:ring-[#272769]"
              />
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="rounded-2xl border-[#E6E4F0] bg-white hover:bg-[#E3E2F5] text-[#1E1E4F] font-semibold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-2xl bg-[#272769] hover:bg-[#1E1E4F] !text-white font-bold text-xs px-5 shadow-xs"
                style={{ backgroundColor: "#272769", color: "#FFFFFF" }}
              >
                Save Team
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

