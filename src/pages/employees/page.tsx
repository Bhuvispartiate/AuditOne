import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserCheck,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  Shield,
  Building,
  Eye,
  CheckCircle2,
  Lock,
  MoreVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";

export default function EmployeesListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const employees = pmsStore.getEmployees();

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.designation_name && emp.designation_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || emp.employment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Employee Master Directory
          </h1>
        </div>

        <Link to="/employees/new">
          <Button size="sm" className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold">
            <Plus className="h-4 w-4" />
            <span>Onboard New Employee</span>
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search by name, code, email, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Probation">Probation</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Employees Box View */}
      {filteredEmployees.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <UserCheck className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No employees found</p>
            <p className="text-xs text-[#6b7280]">
              Adjust filters or onboard a new team member.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredEmployees.map((emp) => (
            <Card
              key={emp.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                {/* Top Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-[#111827] bg-slate-100 border border-slate-300 px-2.5 py-1 rounded-xl">
                      {emp.employee_code}
                    </span>
                    <Badge variant="outline" className="text-[10px] rounded-full bg-blue-50 text-blue-700 border-blue-200">
                      {emp.role_code || "EMPLOYEE"}
                    </Badge>
                    {emp.team_name && (
                      <Badge variant="outline" className="text-[10px] rounded-full bg-indigo-50 text-indigo-700 border-indigo-200">
                        {emp.team_name}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={emp.employment_status === "Active" ? "success" : "secondary"}
                    className="text-[10px] rounded-full shrink-0"
                  >
                    {emp.employment_status}
                  </Badge>
                </div>

                {/* Employee Avatar & Name */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-slate-300">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-bold">
                      {(emp.first_name?.[0] || "E") + (emp.last_name?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link
                      to={`/employees/${emp.id}`}
                      className="text-base font-extrabold text-[#111827] hover:text-blue-600 transition-colors block truncate"
                    >
                      {emp.full_name}
                    </Link>
                    <p className="text-xs font-semibold text-[#6b7280] truncate">
                      {emp.designation_name || emp.role_code || "Staff Member"}
                    </p>
                  </div>
                </div>

                {/* Contact & Reporting Box */}
                <div className="grid grid-cols-1 gap-2 rounded-2xl bg-slate-50/80 border border-slate-300 p-3 text-xs">
                  <div className="flex items-center gap-2 text-[#111827] truncate">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{emp.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[#6b7280]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {emp.mobile_number}
                    </span>
                    <span className="font-mono text-[10px]">
                      Joined {formatDate(emp.joining_date)}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                  <span className="text-[11px] text-[#6b7280] truncate">
                    Reports to: <strong className="text-[#111827]">{emp.supervisor_name || "Managing Partner"}</strong>
                  </span>
                  <Link to={`/employees/${emp.id}`}>
                    <Button
                      size="sm"
                      className="h-8 px-3 rounded-xl bg-[#f3f4f6] hover:bg-neutral-900 text-[#111827] hover:text-white text-xs font-bold gap-1.5 transition-colors shadow-none"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Profile</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

