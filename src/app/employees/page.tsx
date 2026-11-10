"use client";

import React, { useState } from "react";
import Link from "next/link";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pmsStore } from "@/lib/data/store";
import { formatDate } from "@/lib/utils";

export default function EmployeesListPage() {
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const employees = pmsStore.getEmployees();
  const departments = pmsStore.getDepartments();

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_code.toLowerCase().includes(search.toLowerCase()) ||
      emp.email.toLowerCase().includes(search.toLowerCase()) ||
      (emp.designation_name && emp.designation_name.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = deptFilter === "ALL" || emp.department_id === deptFilter;
    const matchesStatus = statusFilter === "ALL" || emp.employment_status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Employee Master Directory
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Professional staff records, practice designations, reporting supervisors and team memberships.
          </p>
        </div>

        <Link href="/employees/new">
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
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

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

      {/* Employees Table */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-[#f3f4f6] flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#111827]">
            Registered Professional Staff ({filteredEmployees.length})
          </CardTitle>
          <span className="text-xs text-[#9ca3af]">Active organization directory</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Emp ID</TableHead>
                <TableHead>Employee Name</TableHead>
                <TableHead>Designation & Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Contact (Mobile / Email)</TableHead>
                <TableHead>Reporting Supervisor</TableHead>
                <TableHead>Employment Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-mono text-xs font-bold text-blue-700">
                    {emp.employee_code}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">
                          {(emp.first_name?.[0] || "E") + (emp.last_name?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 text-sm leading-tight block"
                        >
                          {emp.full_name}
                        </Link>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          Joined: {formatDate(emp.joining_date)}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-800 text-xs block">
                      {emp.designation_name}
                    </span>
                    <Badge variant="outline" className="text-[9px] mt-0.5 bg-blue-50 text-blue-700 border-blue-200">
                      {emp.role_code || "EMPLOYEE"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    {emp.department_name}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-medium text-slate-800">{emp.mobile_number}</div>
                    <div className="text-slate-400 text-[11px]">{emp.email}</div>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {emp.supervisor_name || "Managing Partner"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={emp.employment_status === "Active" ? "success" : "secondary"}
                      className="text-[10px]"
                    >
                      {emp.employment_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/employees/${emp.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Eye className="h-3.5 w-3.5" />
                        <span>Profile</span>
                      </Button>
                    </Link>
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

