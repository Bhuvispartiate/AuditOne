import React, { useState } from "react";
import {
  Building2,
  Plus,
  Users,
  CheckCircle2,
  FolderGit2,
  UserCheck,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { Department } from "@/types";
import { toast } from "sonner";

export default function DepartmentsPage() {
  const departments = pmsStore.getDepartments();
  const employees = pmsStore.getEmployees();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [deptCode, setDeptCode] = useState("");
  const [deptName, setDeptName] = useState("");
  const [headEmpId, setHeadEmpId] = useState(employees[0]?.id || "");
  const [description, setDescription] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim() || !deptCode.trim()) {
      toast.error("Please provide both department code and name.");
      return;
    }

    const head = employees.find((e) => e.id === headEmpId);

    pmsStore.addDepartment({
      department_code: deptCode.toUpperCase(),
      name: deptName,
      head_employee_id: headEmpId,
      head_employee_name: head?.full_name,
      description,
      status: "Active",
      employee_count: 1,
    });

    toast.success(`Department "${deptName}" created.`);
    setIsModalOpen(false);
    setDeptCode("");
    setDeptName("");
    setDescription("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Departments & Practice Groups
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Departmental boundaries, designated practice leads and resource allocations.
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          size="sm"
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          <Plus className="h-4 w-4" />
          <span>Add Department</span>
        </Button>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept) => {
          const deptEmployees = employees.filter((e) => e.department_id === dept.id);
          return (
            <Card key={dept.id} className="shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <span className="font-mono text-xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                      {dept.department_code}
                    </span>
                  </div>
                  <Badge variant="success" className="text-[10px]">{dept.status}</Badge>
                </CardHeader>
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-bold text-base text-slate-900">{dept.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {dept.description}
                  </p>
                  <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                    <div>
                      Practice Head: <strong className="text-slate-900">{dept.head_employee_name || "Unassigned"}</strong>
                    </div>
                    <div>
                      Active Staff: <strong>{deptEmployees.length || dept.employee_count} Team Members</strong>
                    </div>
                  </div>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Add Department Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Add Department</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Department Code</label>
              <Input
                placeholder="e.g. FDD"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Department Name</label>
              <Input
                placeholder="e.g. Financial Due Diligence & M&A"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Designated Department Head</label>
              <select
                value={headEmpId}
                onChange={(e) => setHeadEmpId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.full_name} ({e.designation_name})</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Scope Description</label>
              <Textarea
                placeholder="Functional mandate..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Save Department</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

