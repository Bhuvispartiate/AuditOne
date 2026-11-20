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
  Pencil,
  Trash2,
  Sparkles,
  Building2,
  Activity,
  Calendar,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { isSuperAdmin, isOwner } from "@/lib/access";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { Employee, OwnerActivity } from "@/types";

export default function AdminsManagementPage() {
  const [, setTick] = useState(0);
  useEffect(() => pmsStore.subscribe(() => setTick((t) => t + 1)), []);

  const currentUser = pmsStore.getCurrentUser();
  const isSuper = isSuperAdmin(currentUser);
  const isFirmOwner = isOwner(currentUser);

  // Super Admin state: Owner Mail ID management
  const ownerConfig = pmsStore.getOwnerConfig();
  const ownerActivities = pmsStore.getOwnerActivities();
  const [isEditOwnerModalOpen, setIsEditOwnerModalOpen] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState(ownerConfig.owner_email);
  const [newOwnerName, setNewOwnerName] = useState(ownerConfig.owner_name);
  const [newOwnerMobile, setNewOwnerMobile] = useState(ownerConfig.owner_mobile);

  // Owner state: Admin CRUD
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [designationName, setDesignationName] = useState("Practice Admin");
  const [promoteEmpId, setPromoteEmpId] = useState("");

  // Edit Admin state
  const [editingAdmin, setEditingAdmin] = useState<Employee | null>(null);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editAdminMobile, setEditAdminMobile] = useState("");
  const [editAdminDesignation, setEditAdminDesignation] = useState("");

  // Delete Admin state
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // VIEW A: SUPER ADMIN — ONLY MANAGES OWNER MAIL ID AND OWNER ACTIVITIES
  // ---------------------------------------------------------------------------
  if (isSuper) {
    const handleUpdateOwnerMail = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newOwnerEmail.trim() || !newOwnerEmail.includes("@")) {
        toast.error("Please enter a valid Owner Mail ID.");
        return;
      }
      pmsStore.updateOwnerEmail(newOwnerEmail, newOwnerName, newOwnerMobile);
      toast.success("Owner profile & Mail ID updated successfully.");
      setIsEditOwnerModalOpen(false);
    };

    return (
      <div className="space-y-6 pb-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E6E4F0] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1E1E4F]">
                Owner Account &amp; Activities
              </h1>
              <Badge className="bg-[#272769] text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                Super Admin Exclusive
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#55557A] font-medium">
              Manage the registered Owner Mail ID and monitor all firm owner administrative activities.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => {
              setNewOwnerEmail(ownerConfig.owner_email);
              setNewOwnerName(ownerConfig.owner_name);
              setNewOwnerMobile(ownerConfig.owner_mobile);
              setIsEditOwnerModalOpen(true);
            }}
            className="h-10 px-5 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-extrabold gap-2 shadow-xs cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Update Owner Mail ID</span>
          </Button>
        </div>

        {/* 1. Registered Owner Capsule Card */}
        <Card className="rounded-[24px] border-[1.5px] border-[#E6E4F0] bg-white shadow-xs overflow-hidden">
          <CardHeader className="bg-[#F6F5FB] border-b border-[#E6E4F0] p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-[#272769] text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                  {ownerConfig.owner_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-extrabold text-[#1E1E4F]">
                      {ownerConfig.owner_name}
                    </CardTitle>
                    <Badge className="bg-[#E0A95C] text-[#1E1E4F] text-[10px] font-extrabold rounded-full px-2">
                      Owner
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-[#55557A] font-medium mt-0.5">
                    Managing Director • {ownerConfig.firm_name}
                  </CardDescription>
                </div>
              </div>

              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                {ownerConfig.subscription_tier}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#55557A] flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-[#272769]" />
                <span>Owner Mail ID</span>
              </span>
              <span className="font-mono text-sm font-bold text-[#1E1E4F] block">
                {ownerConfig.owner_email}
              </span>
              <span className="text-[10px] text-emerald-600 font-semibold block">
                ✓ Primary Login ID
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#55557A] flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#272769]" />
                <span>Mobile Number</span>
              </span>
              <span className="font-mono text-sm font-bold text-[#1E1E4F] block">
                {ownerConfig.owner_mobile}
              </span>
              <span className="text-[10px] text-[#55557A] block">2FA Authenticated</span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#55557A] flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#272769]" />
                <span>Registration Date</span>
              </span>
              <span className="text-sm font-bold text-[#1E1E4F] block">
                {formatDateTime(ownerConfig.trial_started_at)}
              </span>
              <span className="text-[10px] text-[#55557A] block">Tenant Active</span>
            </div>
          </CardContent>
        </Card>

        {/* 2. Owner Activities Audit Log */}
        <Card className="rounded-[24px] border-[1.5px] border-[#E6E4F0] bg-white shadow-xs">
          <CardHeader className="pb-3 border-b border-[#E6E4F0] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#272769]" />
                <CardTitle className="text-base font-extrabold text-[#1E1E4F]">
                  Owner Activities Audit Log
                </CardTitle>
                <Badge variant="secondary" className="bg-[#E3E2F5] text-[#272769] text-[10px] font-bold rounded-full">
                  {ownerActivities.length} Events
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#55557A] mt-0.5">
                Chronological ledger of Owner actions, admin authorizations, and system operations.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {ownerActivities.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#55557A]">
                No owner activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-[#E6E4F0]">
                {ownerActivities.map((act) => (
                  <div key={act.id} className="p-4 sm:p-4.5 flex items-start justify-between gap-4 hover:bg-[#F6F5FB]/60 transition-colors">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-[#1E1E4F]">
                          {act.action}
                        </span>
                        {act.entity_type && (
                          <Badge variant="outline" className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border-[#E6E4F0] text-[#55557A]">
                            {act.entity_type}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#55557A] leading-relaxed">
                        {act.details}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#55557A] font-mono shrink-0 whitespace-nowrap">
                      {formatDateTime(act.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Owner Mail ID Modal */}
        <Dialog open={isEditOwnerModalOpen} onOpenChange={setIsEditOwnerModalOpen}>
          <DialogContent className="rounded-3xl border border-[#E6E4F0] bg-white p-6 max-w-md shadow-2xl">
            <DialogHeader className="space-y-1.5 pb-2 border-b border-[#E6E4F0]">
              <DialogTitle className="text-lg font-extrabold text-[#1E1E4F]">
                Update Owner Mail ID
              </DialogTitle>
              <DialogDescription className="text-xs text-[#55557A]">
                Update the primary email address used by the Owner to access AuditOne.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleUpdateOwnerMail} className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Owner Full Name</Label>
                <Input
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  placeholder="Firm Owner"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Owner Mail ID (Login Email) *</Label>
                <Input
                  type="email"
                  required
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="owner@auditone.com"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Mobile Number</Label>
                <Input
                  value={newOwnerMobile}
                  onChange={(e) => setNewOwnerMobile(e.target.value)}
                  placeholder="+91 98111 22233"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOwnerModalOpen(false)}
                  className="rounded-xl border-[#E6E4F0] text-xs font-bold h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold h-10 gap-2"
                >
                  <Save className="h-4 w-4" /> Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // VIEW B: OWNER — FULL CRUD OVER ADMINS
  // ---------------------------------------------------------------------------
  if (!isFirmOwner) {
    return (
      <div className="max-w-2xl mx-auto py-16">
        <Card className="rounded-[24px] border-[1.5px] border-amber-200 bg-amber-50/40">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-extrabold text-[#1E1E4F]">
              Firm Owner Access Required
            </h2>
            <p className="text-xs text-[#55557A] max-w-md mx-auto">
              Only the Firm Owner has permission to create, edit, suspend, and delete Admin accounts.
            </p>
            <Link to="/dashboard">
              <Button size="sm" className="mt-2 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white font-bold">
                Back to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Owner View: CRUD Admins
  const allEmployees = pmsStore.getEmployees();
  const adminUsers = allEmployees
    .filter((e) => e.role_code === "ADMIN")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const eligibleStaff = allEmployees.filter(
    (e) => e.role_code !== "OWNER" && e.role_code !== "SUPER_ADMIN" && e.role_code !== "ADMIN" && e.is_active
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

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await pmsStore.createAdminUser({
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
    toast.success(`Admin ${res.employee?.full_name} created successfully.`);
    setFirstName("");
    setLastName("");
    setEmail("");
    setMobileNumber("");
    setDesignationName("Practice Admin");
    setShowCreateForm(false);
  };

  const handlePromoteStaff = async () => {
    if (!promoteEmpId) {
      toast.error("Select an employee to promote.");
      return;
    }
    const target = allEmployees.find((e) => e.id === promoteEmpId);
    const res = await pmsStore.updateEmployeeRole(promoteEmpId, "ADMIN");
    if (!res.ok) {
      toast.error(res.error || "Could not promote employee.");
      return;
    }
    pmsStore.logOwnerActivity(
      "Staff Promoted to Admin",
      `Owner promoted ${target?.full_name || "Employee"} to Admin role.`
    );
    toast.success(`${target?.full_name || "Employee"} promoted to Admin.`);
    setPromoteEmpId("");
  };

  const handleToggleAdminStatus = async (emp: Employee) => {
    const newStatus = !emp.is_active;
    await pmsStore.updateEmployee(emp.id, {
      is_active: newStatus,
      employment_status: newStatus ? "Active" : "Inactive",
    });
    pmsStore.logOwnerActivity(
      newStatus ? "Admin Activated" : "Admin Suspended",
      `Owner set Admin ${emp.full_name} status to ${newStatus ? "Active" : "Suspended"}.`
    );
    toast.success(`Admin ${emp.full_name} is now ${newStatus ? "Active" : "Suspended"}.`);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const res = await pmsStore.deleteAdminUser(adminId);
    if (!res.ok) {
      toast.error(res.error || "Failed to delete Admin.");
      return;
    }
    toast.success("Admin account deleted.");
    setDeletingAdminId(null);
  };

  const handleSaveEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    await pmsStore.updateEmployee(editingAdmin.id, {
      full_name: editAdminName.trim(),
      email: editAdminEmail.trim().toLowerCase(),
      mobile_number: editAdminMobile.trim(),
      designation_name: editAdminDesignation.trim(),
    });
    pmsStore.logOwnerActivity(
      "Admin Updated",
      `Owner updated Admin details for ${editAdminName} (${editAdminEmail}).`
    );
    toast.success("Admin details updated successfully.");
    setEditingAdmin(null);
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E6E4F0] pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1E1E4F]">
              Admin Management
            </h1>
            <Badge className="bg-[#272769] text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
              Owner Control
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[#55557A] font-medium">
            Create, view, manage, and assign Administrative roles across your firm.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="h-10 px-5 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-extrabold gap-2 shadow-xs cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>{showCreateForm ? "Close Form" : "Create New Admin"}</span>
        </Button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-[#E6E4F0] shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#55557A]">
            Total Admins Created
          </span>
          <span className="text-2xl font-extrabold text-[#1E1E4F] block">{adminUsers.length}</span>
          <span className="text-[11px] text-[#55557A]">Created by Owner</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6E4F0] shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#55557A]">
            Active Admins
          </span>
          <span className="text-2xl font-extrabold text-emerald-600 block">
            {adminUsers.filter((a) => a.is_active).length}
          </span>
          <span className="text-[11px] text-[#55557A]">With operational permissions</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6E4F0] shadow-2xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#55557A]">
            Firm Owner
          </span>
          <span className="text-2xl font-extrabold text-[#272769] block">1 Active</span>
          <span className="text-[11px] text-[#55557A]">Root authority</span>
        </div>
      </div>

      {/* CREATE ADMIN FORM */}
      {showCreateForm && (
        <Card className="rounded-[24px] border-[1.5px] border-[#272769]/30 bg-white p-6 shadow-sm animate-in fade-in-50 duration-200">
          <CardHeader className="p-0 pb-4 border-b border-[#E6E4F0]">
            <CardTitle className="text-base font-extrabold text-[#1E1E4F]">
              Create Admin Account
            </CardTitle>
            <CardDescription className="text-xs text-[#55557A]">
              Owner creates an Admin account with full operational management capabilities.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleCreateAdmin} className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">First Name *</Label>
                <Input
                  required
                  placeholder="e.g. Rahul"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Last Name</Label>
                <Input
                  placeholder="e.g. Verma"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Official Email ID *</Label>
                <Input
                  type="email"
                  required
                  placeholder="e.g. rahul.admin@auditone.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Mobile Number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-bold text-[#1E1E4F]">Designation Title</Label>
                <Input
                  placeholder="e.g. Audit Senior Admin / Practice Head"
                  value={designationName}
                  onChange={(e) => setDesignationName(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E6E4F0]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                className="rounded-xl border-[#E6E4F0] text-xs font-bold h-10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold h-10 gap-2"
              >
                <UserPlus className="h-4 w-4" /> Create Admin
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Search and Promote Staff bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55557A]" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search admins by name, email, employee code..."
            className="pl-10 h-10 rounded-xl bg-white border-[#E6E4F0] text-xs"
          />
        </div>

        {eligibleStaff.length > 0 && (
          <div className="flex items-center gap-2">
            <select
              value={promoteEmpId}
              onChange={(e) => setPromoteEmpId(e.target.value)}
              className="h-10 rounded-xl border border-[#E6E4F0] bg-white px-3 text-xs font-medium text-[#1E1E4F]"
            >
              <option value="">-- Promote Staff to Admin --</option>
              {eligibleStaff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.full_name} ({st.email})
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handlePromoteStaff}
              disabled={!promoteEmpId}
              className="h-10 px-4 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold shrink-0"
            >
              Promote
            </Button>
          </div>
        )}
      </div>

      {/* ADMINS TABLE */}
      <Card className="rounded-[24px] border-[1.5px] border-[#E6E4F0] bg-white shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-[#E6E4F0] bg-[#F6F5FB]/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-extrabold text-[#1E1E4F]">
              Admins Created by Owner ({filteredAdmins.length})
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {filteredAdmins.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#55557A]">
              No Admins created yet. Click &quot;Create New Admin&quot; above to add your first administrator.
            </div>
          ) : (
            <div className="divide-y divide-[#E6E4F0]">
              {filteredAdmins.map((adm) => (
                <div
                  key={adm.id}
                  className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F6F5FB]/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar className="h-10 w-10 rounded-xl border border-[#E6E4F0]">
                      <AvatarFallback className="bg-[#272769] text-white text-xs font-bold rounded-xl">
                        {adm.full_name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-[#1E1E4F] truncate">
                          {adm.full_name}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full ${
                            adm.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {adm.is_active ? "Active" : "Suspended"}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-[#55557A] flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-mono">{adm.email}</span>
                        <span>•</span>
                        <span>{adm.mobile_number || "No Phone"}</span>
                        <span>•</span>
                        <span className="text-[#272769] font-medium">{adm.designation_name || "Admin"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleAdminStatus(adm)}
                      className="h-8 px-2.5 rounded-xl border-[#E6E4F0] text-xs font-semibold text-[#55557A] hover:text-[#1E1E4F]"
                    >
                      {adm.is_active ? (
                        <span className="text-amber-700 flex items-center gap-1">
                          <Ban className="h-3.5 w-3.5" /> Suspend
                        </span>
                      ) : (
                        <span className="text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                        </span>
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingAdmin(adm);
                        setEditAdminName(adm.full_name);
                        setEditAdminEmail(adm.email);
                        setEditAdminMobile(adm.mobile_number || "");
                        setEditAdminDesignation(adm.designation_name || "Practice Admin");
                      }}
                      className="h-8 px-2.5 rounded-xl border-[#E6E4F0] text-xs font-semibold text-[#272769] hover:bg-[#F6F5FB]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDeletingAdminId(adm.id)}
                      className="h-8 px-2.5 rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Admin Dialog */}
      {editingAdmin && (
        <Dialog open={Boolean(editingAdmin)} onOpenChange={(open) => !open && setEditingAdmin(null)}>
          <DialogContent className="rounded-3xl border border-[#E6E4F0] bg-white p-6 max-w-md shadow-2xl">
            <DialogHeader className="space-y-1.5 pb-2 border-b border-[#E6E4F0]">
              <DialogTitle className="text-lg font-extrabold text-[#1E1E4F]">
                Edit Admin Details
              </DialogTitle>
              <DialogDescription className="text-xs text-[#55557A]">
                Update details for {editingAdmin.full_name}.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEditAdmin} className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Full Name</Label>
                <Input
                  required
                  value={editAdminName}
                  onChange={(e) => setEditAdminName(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Email Address</Label>
                <Input
                  type="email"
                  required
                  value={editAdminEmail}
                  onChange={(e) => setEditAdminEmail(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Mobile Number</Label>
                <Input
                  value={editAdminMobile}
                  onChange={(e) => setEditAdminMobile(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Designation</Label>
                <Input
                  value={editAdminDesignation}
                  onChange={(e) => setEditAdminDesignation(e.target.value)}
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingAdmin(null)}
                  className="rounded-xl border-[#E6E4F0] text-xs font-bold h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold h-10 gap-2"
                >
                  <Save className="h-4 w-4" /> Save Details
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingAdminId && (
        <Dialog open={Boolean(deletingAdminId)} onOpenChange={(open) => !open && setDeletingAdminId(null)}>
          <DialogContent className="rounded-3xl border border-rose-200 bg-white p-6 max-w-sm shadow-2xl">
            <DialogHeader className="space-y-1.5 pb-2">
              <DialogTitle className="text-base font-extrabold text-rose-950">
                Delete Admin Account?
              </DialogTitle>
              <DialogDescription className="text-xs text-[#55557A]">
                Are you sure you want to permanently delete this Admin account? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingAdminId(null)}
                className="rounded-xl border-[#E6E4F0] text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => handleDeleteAdmin(deletingAdminId)}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9"
              >
                Delete Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
