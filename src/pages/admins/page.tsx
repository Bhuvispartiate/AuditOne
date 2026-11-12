import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  Lock,
  CheckCircle2,
  Ban,
  ArrowDownCircle,
  ArrowUpCircle,
  Mail,
  Phone,
  Eye,
  History,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { pmsStore } from "@/lib/data/store";
import { isSuperAdmin } from "@/lib/access";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

export default function AdminsManagementPage() {
  const [, setTick] = useState(0);
  useEffect(() => pmsStore.subscribe(() => setTick((t) => t + 1)), []);

  const currentUser = pmsStore.getCurrentUser();
  const canManageAdmins = isSuperAdmin(currentUser);

  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [designationName, setDesignationName] = useState("Practice Admin");
  const [promoteEmpId, setPromoteEmpId] = useState("");

  if (!canManageAdmins) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <Card className="rounded-[24px] border-[1.5px] border-rose-200 bg-rose-50/40">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-extrabold text-[#111827]">
              Super Admin Access Required
            </h2>
            <p className="text-xs text-[#6b7280] max-w-md mx-auto">
              Admin Management is restricted exclusively to the Super Admin. Admins have full access to all operational modules, while only the Super Admin can create, promote, suspend, or demote Admins.
            </p>
            <Link to="/dashboard">
              <Button size="sm" className="mt-2 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allEmployees = pmsStore.getEmployees();
  const adminUsers = allEmployees
    .filter((e) => e.role_code === "SUPER_ADMIN" || e.role_code === "ADMIN")
    .sort((a, b) => {
      if (a.role_code === "SUPER_ADMIN" && b.role_code !== "SUPER_ADMIN") return -1;
      if (b.role_code === "SUPER_ADMIN" && a.role_code !== "SUPER_ADMIN") return 1;
      return a.full_name.localeCompare(b.full_name);
    });

  const eligibleStaff = allEmployees.filter(
    (e) => e.role_code !== "SUPER_ADMIN" && e.role_code !== "ADMIN" && e.is_active
  );

  const filteredAdmins = adminUsers.filter((emp) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      emp.full_name.toLowerCase().includes(q) ||
      emp.email.toLowerCase().includes(q) ||
      emp.employee_code.toLowerCase().includes(q) ||
      (emp.designation_name || "").toLowerCase().includes(q)
    );
  });

  const activeAdminsCount = adminUsers.filter((a) => a.is_active).length;
  const suspendedAdminsCount = adminUsers.filter((a) => !a.is_active).length;
  const adminLogs = pmsStore
    .getActivityLogs()
    .filter((l) => l.entity_type === "admin")
    .slice(0, 8);

  const handleCreateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const res = pmsStore.createAdminUser({
      first_name: firstName,
      last_name: lastName,
      email,
      mobile_number: mobileNumber,
      designation_name: designationName,
    });
    if (!res.ok) {
      toast.error(res.error || "Failed to create Admin account.");
      return;
    }
    toast.success(`Admin ${res.employee?.full_name} created. They can now sign in with Google.`);
    setFirstName("");
    setLastName("");
    setEmail("");
    setMobileNumber("");
    setDesignationName("Practice Admin");
    setShowCreateForm(false);
  };

  const handlePromoteStaff = () => {
    if (!promoteEmpId) {
      toast.error("Select an employee to promote.");
      return;
    }
    const target = allEmployees.find((e) => e.id === promoteEmpId);
    const res = pmsStore.updateEmployeeRole(promoteEmpId, "ADMIN");
    if (!res.ok) {
      toast.error(res.error || "Could not promote employee.");
      return;
    }
    toast.success(`${target?.full_name || "Employee"} promoted to Admin.`);
    setPromoteEmpId("");
  };

  const handleDemoteAdmin = (empId: string, fullName: string) => {
    const res = pmsStore.updateEmployeeRole(empId, "EMPLOYEE");
    if (!res.ok) {
      toast.error(res.error || "Could not demote Admin.");
      return;
    }
    toast.success(`${fullName} moved back to Employee role.`);
  };

  const handleToggleActive = (empId: string, fullName: string, nextActive: boolean) => {
    const res = pmsStore.setEmployeeActiveStatus(empId, nextActive);
    if (!res.ok) {
      toast.error(res.error || "Could not update Admin status.");
      return;
    }
    toast.success(`${fullName} ${nextActive ? "activated" : "suspended"}.`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
              Admin Management
            </h1>
            <Badge className="rounded-full bg-[#111827] text-white text-[10px] font-bold px-2.5 py-0.5">
              Super Admin Exclusive
            </Badge>
          </div>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Create, promote, suspend, or revoke Admin accounts. Admins get full access to all operational pages except Admin Management.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => setShowCreateForm((v) => !v)}
          className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
        >
          {showCreateForm ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          <span>{showCreateForm ? "Close Form" : "Add New Admin"}</span>
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Admins
            </span>
            <div className="text-2xl font-extrabold text-[#111827] mt-1">
              {adminUsers.length}
            </div>
            <p className="text-[11px] text-[#6b7280] mt-0.5">Includes Super Admin</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
              Active Admins
            </span>
            <div className="text-2xl font-extrabold text-emerald-700 mt-1">
              {activeAdminsCount}
            </div>
            <p className="text-[11px] text-[#6b7280] mt-0.5">Allowed Google OAuth login</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Suspended Admins
            </span>
            <div className="text-2xl font-extrabold text-rose-700 mt-1">
              {suspendedAdminsCount}
            </div>
            <p className="text-[11px] text-[#6b7280] mt-0.5">Blocked from sign-in</p>
          </CardContent>
        </Card>

        <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
          <CardContent className="p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
              Eligible Staff
            </span>
            <div className="text-2xl font-extrabold text-indigo-700 mt-1">
              {eligibleStaff.length}
            </div>
            <p className="text-[11px] text-[#6b7280] mt-0.5">Active staff promotable to Admin</p>
          </CardContent>
        </Card>
      </div>

      {/* Create New Admin Form */}
      {showCreateForm && (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-violet-600" />
              <CardTitle className="text-base font-extrabold text-[#111827]">
                Create New Admin Account
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Enter the official Google email address the Admin will use to sign in via Google OAuth.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleCreateAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">First Name *</Label>
                <Input
                  required
                  placeholder="e.g. Priya"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Last Name</Label>
                <Input
                  placeholder="e.g. Nair"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Official Google Email *</Label>
                <Input
                  required
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designation Title</Label>
                <Input
                  placeholder="Practice Admin"
                  value={designationName}
                  onChange={(e) => setDesignationName(e.target.value)}
                  className="h-10 rounded-xl border-slate-300 text-xs"
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="submit"
                  className="h-10 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold flex-1"
                >
                  Create Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                  className="h-10 rounded-xl border-slate-300 text-xs font-bold"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promote Existing Staff + Search Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-5 rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
          <CardContent className="p-4 space-y-2">
            <label className="text-xs font-bold text-[#111827] block">
              Promote Existing Employee to Admin
            </label>
            <div className="flex gap-2">
              <select
                value={promoteEmpId}
                onChange={(e) => setPromoteEmpId(e.target.value)}
                className="flex-1 h-10 rounded-2xl border border-slate-300 bg-white px-3 text-xs font-semibold text-[#111827] focus:outline-none"
              >
                <option value="">Select active employee...</option>
                {eligibleStaff.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.email}) — {emp.role_code || "EMPLOYEE"}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                onClick={handlePromoteStaff}
                disabled={!promoteEmpId}
                className="h-10 rounded-2xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1.5 shrink-0"
              >
                <ArrowUpCircle className="h-3.5 w-3.5" />
                <span>Grant Admin</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-7 rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
          <CardContent className="p-4 flex items-center h-full">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
              <Input
                type="search"
                placeholder="Search admins by name, email, code, or designation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10 rounded-2xl border-slate-300 text-xs font-medium"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admins Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAdmins.map((admin) => {
          const isPrimarySuperAdmin = admin.role_code === "SUPER_ADMIN";
          const initials = admin.full_name
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase();

          return (
            <Card
              key={admin.id}
              className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-2xs"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-11 w-11 border border-slate-300 shrink-0">
                      <AvatarFallback
                        className={
                          isPrimarySuperAdmin
                            ? "bg-neutral-900 text-white font-bold text-xs"
                            : "bg-violet-100 text-violet-800 font-bold text-xs"
                        }
                      >
                        {initials || "AD"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-extrabold text-[#111827] truncate">
                          {admin.full_name}
                        </h3>
                        <Badge
                          variant={isPrimarySuperAdmin ? "default" : "secondary"}
                          className={
                            isPrimarySuperAdmin
                              ? "rounded-full bg-[#111827] text-white text-[10px] font-bold"
                              : "rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold"
                          }
                        >
                          {isPrimarySuperAdmin ? "SUPER ADMIN" : "ADMIN"}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-[#6b7280] font-medium truncate">
                        {admin.employee_code} • {admin.designation_name || "Administrator"}
                      </p>
                    </div>
                  </div>

                  <Badge
                    className={
                      admin.is_active
                        ? "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shrink-0"
                        : "rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold shrink-0"
                    }
                  >
                    {admin.is_active ? "Active" : "Suspended"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs rounded-2xl bg-slate-50 border border-slate-200 p-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-[#111827]">{admin.email}</span>
                  </div>
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium text-[#111827]">
                      {admin.mobile_number || "—"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <Link to={`/employees/${admin.id}`}>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-xl border-slate-300 text-xs font-bold gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Profile</span>
                    </Button>
                  </Link>

                  {isPrimarySuperAdmin ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-500 px-2.5 py-1 rounded-xl bg-slate-100">
                      <Lock className="h-3 w-3" />
                      <span>Protected Root Account</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleToggleActive(admin.id, admin.full_name, !admin.is_active)
                        }
                        className={
                          admin.is_active
                            ? "h-8 rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-bold gap-1"
                            : "h-8 rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs font-bold gap-1"
                        }
                      >
                        {admin.is_active ? (
                          <>
                            <Ban className="h-3.5 w-3.5" />
                            <span>Suspend</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Activate</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDemoteAdmin(admin.id, admin.full_name)}
                        className="h-8 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1"
                      >
                        <ArrowDownCircle className="h-3.5 w-3.5" />
                        <span>Demote</span>
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Admin Management Audit Log */}
      <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-slate-600" />
            <CardTitle className="text-sm font-extrabold text-[#111827]">
              Admin Governance Audit Log
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {adminLogs.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-[#6b7280] py-3">
              <ShieldAlert className="h-4 w-4 text-slate-400" />
              <span>No admin role changes logged yet.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {adminLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs"
                >
                  <span className="font-semibold text-[#111827]">{log.action}</span>
                  <span className="text-[11px] text-[#6b7280]">
                    {log.employee_name || "Super Admin"} • {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
