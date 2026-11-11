import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  FolderGit2,
  Calendar,
  Users,
  Shield,
  Save,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { pmsStore } from "@/lib/data/store";
import { ProjectType, ProjectPriority, ProjectStatus } from "@/types";
import { toast } from "sonner";

function NewProjectContent() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillClientId = searchParams.get("clientId") || "";

  const clients = pmsStore.getClients();
  const departments = pmsStore.getDepartments();
  const employees = pmsStore.getEmployees();
  const services = pmsStore.getServices();

  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState<ProjectType>(
    prefillClientId ? "Client Project" : "Client Project"
  );
  const [clientId, setClientId] = useState(prefillClientId || clients[0]?.id || "");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [projectManagerId, setProjectManagerId] = useState(employees[0]?.id || "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ProjectPriority>("Medium");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [status, setStatus] = useState<ProjectStatus>("Not Started");

  // Selected assigned employee IDs
  const [assignedEmpIds, setAssignedEmpIds] = useState<string[]>([employees[0]?.id || ""]);

  const handleToggleEmployee = (empId: string) => {
    if (assignedEmpIds.includes(empId)) {
      setAssignedEmpIds(assignedEmpIds.filter((id) => id !== empId));
    } else {
      setAssignedEmpIds([...assignedEmpIds, empId]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!projectName.trim()) {
      toast.error("Please enter a valid project name.");
      return;
    }

    const selectedClient = projectType === "Client Project" ? clients.find((c) => c.id === clientId) : undefined;
    const selectedDept = departments.find((d) => d.id === departmentId);
    const selectedPM = employees.find((e) => e.id === projectManagerId);

    const assigned = assignedEmpIds.map((id) => {
      const emp = employees.find((e) => e.id === id);
      return {
        id,
        full_name: emp?.full_name || "Employee",
        role_in_project: "Contributor",
      };
    });

    const newProject = pmsStore.addProject({
      project_name: projectName,
      project_type: projectType,
      client_id: selectedClient?.id,
      client_name: selectedClient?.client_name,
      department_id: selectedDept?.id,
      department_name: selectedDept?.name,
      project_manager_id: selectedPM?.id,
      project_manager_name: selectedPM?.full_name,
      description,
      priority,
      start_date: startDate,
      due_date: dueDate,
      status,
      assigned_employees: assigned,
    });

    toast.success(`Project ${newProject.project_code} created successfully.`);
    navigate("/projects");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb Header */}
      <div className="flex items-center gap-3">
        <Link to="/projects">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Create New Project
          </h1>
          <p className="text-xs text-slate-500">
            Establish new client engagement or internal project with clear milestones and team roles.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FolderGit2 className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Project Scope & Classification
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Project heading, type, client association and department ownership
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold">
                  Project Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Apex Infotech — FY 2023-24 Corporate Tax & Statutory Audit"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Type</Label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Client Project">Client Project</option>
                  <option value="Internal Project">Internal Project</option>
                  <option value="General Project">General Project</option>
                </select>
              </div>
            </div>

            {projectType === "Client Project" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Associated Client</Label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.client_code}) — {c.constitution}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Department</Label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Manager</Label>
                <select
                  value={projectManagerId}
                  onChange={(e) => setProjectManagerId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.designation_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Priority</Label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Initial Status</Label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Under Review">Under Review</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Detailed Description & Deliverable Checklist</Label>
              <Textarea
                placeholder="Detailed objectives, workpaper requirements, compliance clauses..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[90px]"
              />
            </div>

            {/* Assigned Team Members Multiselect */}
            <div className="pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700 block mb-2">
                Assigned Team Members & Staff
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {employees.map((emp) => {
                  const isChecked = assignedEmpIds.includes(emp.id);
                  return (
                    <label
                      key={emp.id}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? "bg-blue-50/80 border-blue-300 text-blue-900 font-medium"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEmployee(emp.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{emp.full_name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Link to="/projects">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6">
            <Save className="h-4 w-4" />
            <span>Create Project</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading project creator...</div>}>
      <NewProjectContent />
    </React.Suspense>
  );
}

