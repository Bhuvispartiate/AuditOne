import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Building2,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  FolderGit2,
  CheckSquare,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";

export default function EmployeeProfilePage() {
  const params = useParams();
  const employeeId = params.id as string;
  const employee = pmsStore.getEmployeeById(employeeId);
  const allProjects = pmsStore.getProjects();
  const allTasks = pmsStore.getTasks();

  const assignedProjects = allProjects.filter((p) =>
    p.project_manager_id === employeeId ||
    p.assigned_employees?.some((e) => e.id === employeeId)
  );

  const assignedTasks = allTasks.filter((t) => t.assigned_employee_id === employeeId);
  const completedTasks = assignedTasks.filter((t) => t.status === "Completed");

  const [showBankDetails, setShowBankDetails] = useState(false);

  if (!employee) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Employee Not Found</h2>
        <Link to="/employees"><Button variant="outline" className="mt-4">Back to Directory</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <Link to="/employees">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-blue-600">
              <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-base">
                {(employee.first_name?.[0] || "E") + (employee.last_name?.[0] || "")}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{employee.full_name}</h1>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 font-mono text-xs">
                  {employee.employee_code}
                </Badge>
                <Badge variant="success" className="text-xs">{employee.employment_status}</Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {employee.designation_name || "Staff Member"} &bull; Role:{" "}
                <span className="font-semibold text-slate-700">{employee.role_code}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-xs border-l-4 border-l-blue-600">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase">Assigned Projects</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{assignedProjects.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-indigo-600">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Deliverable Tasks</span>
            <div className="text-2xl font-bold text-indigo-700 mt-1">{assignedTasks.length}</div>
          </CardContent>
        </Card>
        <Card className="shadow-xs border-l-4 border-l-emerald-600">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase">Completed Tasks</span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">{completedTasks.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Personal Info & Bank Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-xs">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-base font-semibold">Personal &amp; Role Profile</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Official Email</span>
              <span className="font-mono text-slate-900 text-sm">{employee.email}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Mobile Number</span>
              <span className="text-slate-900 text-sm font-medium">{employee.mobile_number}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Reporting Supervisor</span>
              <span className="text-slate-900 text-sm">{employee.supervisor_name || "Managing Partner"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Assigned Team</span>
              <span className="text-slate-900 text-sm">{employee.team_name || "Unassigned"}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Date of Joining</span>
              <span className="text-slate-900 text-sm">{formatDate(employee.joining_date)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details (Protected) */}
        <Card className="shadow-xs border-blue-200">
          <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                <Lock className="h-4 w-4 text-blue-600" />
                Protected Payroll Bank Details
              </CardTitle>
              <CardDescription className="text-xs">Restricted to Super Admin & Finance Directors</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBankDetails(!showBankDetails)}
              className="text-xs gap-1"
            >
              {showBankDetails ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {showBankDetails ? "Hide" : "Reveal"}
            </Button>
          </CardHeader>
          <CardContent className="p-6 space-y-3 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Bank Name</span>
              <span className="text-slate-900 text-sm font-medium">HDFC Bank Ltd</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Account Number</span>
              <span className="font-mono text-slate-900 text-sm font-bold">
                {showBankDetails ? "5010049281734" : "•••• •••• •••• 1734"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">IFSC Code</span>
              <span className="font-mono text-slate-900 text-sm font-semibold">
                {showBankDetails ? "HDFC0000043" : "HDFC•••••••"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Account Holder</span>
              <span className="text-slate-900 text-sm font-medium">{employee.full_name}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assigned Deliverable Tasks Box View */}
      <Card className="shadow-xs">
        <CardHeader className="p-4 border-b border-slate-200">
          <CardTitle className="text-base font-semibold">Assigned Tasks ({assignedTasks.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {assignedTasks.length === 0 ? (
            <p className="text-center py-6 text-xs text-slate-500">No tasks assigned yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedTasks.map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-2.5 hover:border-neutral-900 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                      {t.task_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                      <Badge variant={t.status === "Completed" ? "success" : "secondary"} className="text-[10px]">
                        {t.status}
                      </Badge>
                    </div>
                  </div>
                  <p className="font-bold text-sm text-slate-900">{t.title}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span>{t.project_name || "General"}</span>
                    <span>Due {formatDate(t.due_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

