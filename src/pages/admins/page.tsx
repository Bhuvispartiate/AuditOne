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
  Mail,
  Phone,
  Pencil,
  Trash2,
  Sparkles,
  Building2,
  Calendar,
  Save,
  Users,
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
import { Employee, OwnerConfig } from "@/types";

export default function AdminsManagementPage() {
  const [, setTick] = useState(0);
  useEffect(() => pmsStore.subscribe(() => setTick((t) => t + 1)), []);

  const currentUser = pmsStore.getCurrentUser();
  const isSuper = isSuperAdmin(currentUser);
  const isFirmOwner = isOwner(currentUser);

  // ---------------------------------------------------------------------------
  // Super Admin state: Multi-Owner Model
  // ---------------------------------------------------------------------------
  const owners = pmsStore.getOwners();
  const [ownerSearch, setOwnerSearch] = useState("");
  const [isAddOwnerModalOpen, setIsAddOwnerModalOpen] = useState(false);
  const [addOwnerName, setAddOwnerName] = useState("");
  const [addOwnerEmail, setAddOwnerEmail] = useState("");
  const [addOwnerMobile, setAddOwnerMobile] = useState("");
  const [addOwnerFirm, setAddOwnerFirm] = useState("");

  const [editingOwner, setEditingOwner] = useState<OwnerConfig | null>(null);
  const [editOwnerName, setEditOwnerName] = useState("");
  const [editOwnerEmail, setEditOwnerEmail] = useState("");
  const [editOwnerMobile, setEditOwnerMobile] = useState("");
  const [editOwnerFirm, setEditOwnerFirm] = useState("");

  const [deletingOwnerId, setDeletingOwnerId] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Owner state: Admin CRUD
  // ---------------------------------------------------------------------------
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
  // VIEW A: SUPER ADMIN — MULTI-OWNER MODEL (NO DASHBOARD, NO AUDIT LOGS)
  // ---------------------------------------------------------------------------
  if (isSuper) {
    const filteredOwners = owners.filter((o) => {
      const q = ownerSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        o.owner_name.toLowerCase().includes(q) ||
        o.owner_email.toLowerCase().includes(q) ||
        o.firm_name.toLowerCase().includes(q) ||
        o.owner_mobile.includes(q)
      );
    });

    const handleCreateOwner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!addOwnerEmail.trim() || !addOwnerEmail.includes("@")) {
        toast.error("Please enter a valid Owner Mail ID.");
        return;
      }
      if (!addOwnerName.trim()) {
        toast.error("Please enter the Owner's full name.");
        return;
      }

      const res = await pmsStore.createOwner({
        name: addOwnerName,
        email: addOwnerEmail,
        mobile: addOwnerMobile,
        firm_name: addOwnerFirm,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to onboard Owner.");
        return;
      }

      toast.success(`Owner ${addOwnerName} onboarded successfully.`);
      setAddOwnerName("");
      setAddOwnerEmail("");
      setAddOwnerMobile("");
      setAddOwnerFirm("");
      setIsAddOwnerModalOpen(false);
    };

    const handleSaveEditOwner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingOwner) return;
      if (!editOwnerEmail.trim() || !editOwnerEmail.includes("@")) {
        toast.error("Please enter a valid Owner Mail ID.");
        return;
      }

      const res = await pmsStore.updateOwner(editingOwner.id, {
        email: editOwnerEmail,
        name: editOwnerName,
        mobile: editOwnerMobile,
        firm_name: editOwnerFirm,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to update Owner.");
        return;
      }

      toast.success("Owner profile and login email updated.");
      setEditingOwner(null);
    };

    const handleToggleOwnerStatus = async (ownerId: string, currentStatus: string) => {
      const res = await pmsStore.toggleOwnerStatus(ownerId);
      if (!res.ok) {
        toast.error(res.error || "Failed to update status.");
        return;
      }
      toast.success(
        currentStatus === "Active" ? "Owner account suspended." : "Owner account activated."
      );
    };

    const handleDeleteOwner = async (ownerId: string) => {
      const res = await pmsStore.deleteOwner(ownerId);
      if (!res.ok) {
        toast.error(res.error || "Failed to delete Owner account.");
        return;
      }
      toast.success("Owner account deleted.");
      setDeletingOwnerId(null);
    };

    return (
      <div className="space-y-6 pb-12 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E6E4F0] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-[#1E1E4F]">
                Owner Accounts Directory
              </h1>
              <Badge className="bg-[#272769] text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                Multi-Owner Model
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-[#55557A] font-medium">
              Manage registered firm owner accounts and their primary login emails across tenants.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => setIsAddOwnerModalOpen(true)}
            className="h-10 px-5 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-extrabold gap-2 shadow-xs cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Onboard New Owner</span>
          </Button>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="rounded-2xl border-[1.5px] border-[#E6E4F0] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55557A]">
                  Total Owners
                </span>
                <p className="text-2xl font-black text-[#1E1E4F] mt-1">{owners.length}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-[#E3E2F5] text-[#272769] flex items-center justify-center font-bold">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-[1.5px] border-[#E6E4F0] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55557A]">
                  Active Owners
                </span>
                <p className="text-2xl font-black text-emerald-600 mt-1">
                  {owners.filter((o) => o.status === "Active").length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-[1.5px] border-[#E6E4F0] bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#55557A]">
                  License Tier
                </span>
                <p className="text-sm font-black text-amber-700 mt-2">Free Trial Only</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>
          </Card>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55557A]" />
            <Input
              type="search"
              placeholder="Search owners by name, email, firm..."
              value={ownerSearch}
              onChange={(e) => setOwnerSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl border-[#E6E4F0] bg-white text-xs text-[#1E1E4F] placeholder:text-[#55557A]"
            />
          </div>
          <span className="text-xs font-semibold text-[#55557A]">
            Showing {filteredOwners.length} of {owners.length} registered owners
          </span>
        </div>

        {/* Multi-Owner Table */}
        <Card className="rounded-[24px] border-[1.5px] border-[#E6E4F0] bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F6F5FB] border-b border-[#E6E4F0] text-[11px] font-extrabold uppercase tracking-wider text-[#55557A]">
                  <th className="py-3 px-4 sm:px-6">Owner &amp; Firm</th>
                  <th className="py-3 px-4">Login Mail ID</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Onboarded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4F0] text-xs">
                {filteredOwners.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#55557A]">
                      No owner accounts match your search.
                    </td>
                  </tr>
                ) : (
                  filteredOwners.map((owner) => (
                    <tr key={owner.id} className="hover:bg-[#F6F5FB]/70 transition-colors">
                      {/* Owner & Firm */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-[#272769] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {owner.owner_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-[#1E1E4F] block truncate text-xs sm:text-[13px]">
                              {owner.owner_name}
                            </span>
                            <span className="text-[11px] text-[#55557A] flex items-center gap-1 mt-0.5 truncate">
                              <Building2 className="h-3 w-3 shrink-0 text-[#272769]" />
                              {owner.firm_name}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Login Mail ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1E1E4F]">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#272769] shrink-0" />
                          <span className="truncate">{owner.owner_email}</span>
                        </div>
                        <span className="text-[9.5px] text-emerald-600 font-semibold block mt-0.5">
                          ✓ Primary Login
                        </span>
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-[#55557A] font-mono text-xs">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-[#55557A] shrink-0" />
                          <span>{owner.owner_mobile || "—"}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge
                          className={
                            owner.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                              : "bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                          }
                        >
                          {owner.status}
                        </Badge>
                      </td>

                      {/* Onboarded */}
                      <td className="py-3.5 px-4 text-[#55557A] text-[11px] whitespace-nowrap">
                        {formatDateTime(owner.trial_started_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingOwner(owner);
                              setEditOwnerName(owner.owner_name);
                              setEditOwnerEmail(owner.owner_email);
                              setEditOwnerMobile(owner.owner_mobile);
                              setEditOwnerFirm(owner.firm_name);
                            }}
                            className="h-8 px-2.5 rounded-lg border-[#E6E4F0] text-[11px] font-bold text-[#272769] hover:bg-[#F6F5FB] gap-1"
                            title="Edit Owner Mail ID"
                          >
                            <Pencil className="h-3 w-3" />
                            <span className="hidden sm:inline">Edit Email</span>
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleOwnerStatus(owner.id, owner.status)}
                            className={`h-8 px-2 rounded-lg text-[11px] font-bold border-[#E6E4F0] ${
                              owner.status === "Active"
                                ? "text-amber-700 hover:bg-amber-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                            title={owner.status === "Active" ? "Suspend Account" : "Activate Account"}
                          >
                            {owner.status === "Active" ? (
                              <Ban className="h-3.5 w-3.5" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setDeletingOwnerId(owner.id)}
                            className="h-8 px-2 rounded-lg text-[11px] font-bold border-[#E6E4F0] text-rose-600 hover:bg-rose-50"
                            title="Delete Owner Account"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal: Onboard New Owner */}
        <Dialog open={isAddOwnerModalOpen} onOpenChange={setIsAddOwnerModalOpen}>
          <DialogContent className="rounded-3xl border border-[#E6E4F0] bg-white p-6 max-w-md shadow-2xl">
            <DialogHeader className="space-y-1.5 pb-2 border-b border-[#E6E4F0]">
              <DialogTitle className="text-lg font-extrabold text-[#1E1E4F]">
                Onboard New Firm Owner
              </DialogTitle>
              <DialogDescription className="text-xs text-[#55557A]">
                Create a new Owner account with authorized login Mail ID for the Free Trial Edition.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateOwner} className="space-y-4 pt-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Owner Full Name *</Label>
                <Input
                  required
                  value={addOwnerName}
                  onChange={(e) => setAddOwnerName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Owner Mail ID (Login Email) *</Label>
                <Input
                  type="email"
                  required
                  value={addOwnerEmail}
                  onChange={(e) => setAddOwnerEmail(e.target.value)}
                  placeholder="e.g. ramesh@firmca.in"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10 font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Firm / Practice Name</Label>
                <Input
                  value={addOwnerFirm}
                  onChange={(e) => setAddOwnerFirm(e.target.value)}
                  placeholder="e.g. R. Kumar & Associates Chartered Accountants"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Mobile Number</Label>
                <Input
                  value={addOwnerMobile}
                  onChange={(e) => setAddOwnerMobile(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddOwnerModalOpen(false)}
                  className="rounded-xl border-[#E6E4F0] text-xs font-bold h-10"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold h-10 gap-2"
                >
                  <UserPlus className="h-4 w-4" /> Onboard Owner
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Edit Owner Mail ID & Profile */}
        {editingOwner && (
          <Dialog open={Boolean(editingOwner)} onOpenChange={(open) => !open && setEditingOwner(null)}>
            <DialogContent className="rounded-3xl border border-[#E6E4F0] bg-white p-6 max-w-md shadow-2xl">
              <DialogHeader className="space-y-1.5 pb-2 border-b border-[#E6E4F0]">
                <DialogTitle className="text-lg font-extrabold text-[#1E1E4F]">
                  Update Owner Profile &amp; Mail ID
                </DialogTitle>
                <DialogDescription className="text-xs text-[#55557A]">
                  Update the primary email address and firm details used by this Owner to access AuditOne.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSaveEditOwner} className="space-y-4 pt-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Owner Full Name</Label>
                  <Input
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    placeholder="Owner Full Name"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">
                    Owner Mail ID (Login Email) *
                  </Label>
                  <Input
                    type="email"
                    required
                    value={editOwnerEmail}
                    onChange={(e) => setEditOwnerEmail(e.target.value)}
                    placeholder="owner@auditone.com"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Firm / Practice Name</Label>
                  <Input
                    value={editOwnerFirm}
                    onChange={(e) => setEditOwnerFirm(e.target.value)}
                    placeholder="Firm Name"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Mobile Number</Label>
                  <Input
                    value={editOwnerMobile}
                    onChange={(e) => setEditOwnerMobile(e.target.value)}
                    placeholder="+91 98111 22233"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>

                <DialogFooter className="pt-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingOwner(null)}
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
        )}

        {/* Modal: Delete Owner Confirmation */}
        {deletingOwnerId && (
          <Dialog
            open={Boolean(deletingOwnerId)}
            onOpenChange={(open) => !open && setDeletingOwnerId(null)}
          >
            <DialogContent className="rounded-3xl border border-rose-200 bg-white p-6 max-w-sm shadow-2xl">
              <DialogHeader className="space-y-1.5 pb-2">
                <DialogTitle className="text-base font-extrabold text-rose-950">
                  Delete Owner Account?
                </DialogTitle>
                <DialogDescription className="text-xs text-[#55557A]">
                  Are you sure you want to delete this Owner account? The tenant owner will no longer be
                  able to access AuditOne with this Mail ID.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="pt-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeletingOwnerId(null)}
                  className="rounded-xl border-[#E6E4F0] text-xs font-bold h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => handleDeleteOwner(deletingOwnerId)}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold h-9"
                >
                  Delete Owner
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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

  const handlePromoteStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteEmpId) return;
    const target = allEmployees.find((e) => e.id === promoteEmpId);
    const res = await pmsStore.updateEmployeeRole(promoteEmpId, "ADMIN");
    if (!res.ok) {
      toast.error(res.error || "Could not promote employee.");
      return;
    }
    toast.success(`${target?.full_name || "Employee"} promoted to Admin.`);
    setPromoteEmpId("");
  };

  const handleToggleAdminStatus = async (emp: Employee) => {
    const newStatus = !emp.is_active;
    await pmsStore.updateEmployee(emp.id, {
      is_active: newStatus,
      employment_status: newStatus ? "Active" : "Inactive",
    });
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
            Create, promote, and manage Administrators who oversee operational practice workflows.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowCreateForm((prev) => !prev)}
          className="h-10 px-5 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-extrabold gap-2 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>{showCreateForm ? "Close Form" : "Create New Admin"}</span>
        </Button>
      </div>

      {/* Form: Create Admin */}
      {showCreateForm && (
        <Card className="rounded-[24px] border-[1.5px] border-[#272769]/30 bg-white shadow-md animate-in fade-in duration-200">
          <CardHeader className="bg-[#F6F5FB] border-b border-[#E6E4F0] p-5">
            <CardTitle className="text-base font-extrabold text-[#1E1E4F] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#272769]" />
              <span>Create Practice Administrator</span>
            </CardTitle>
            <CardDescription className="text-xs text-[#55557A]">
              Provision a new administrative account with permissions to assign tasks, manage teams, and oversee clients.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">First Name *</Label>
                  <Input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. Anand"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Last Name *</Label>
                  <Input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Verma"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Official Email ID *</Label>
                  <Input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@firm.com"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Mobile Number</Label>
                  <Input
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#1E1E4F]">Designation Title</Label>
                  <Input
                    value={designationName}
                    onChange={(e) => setDesignationName(e.target.value)}
                    placeholder="Practice Administrator"
                    className="rounded-xl border-[#E6E4F0] text-xs h-10"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
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
                  <UserPlus className="h-4 w-4" /> Provision Admin Account
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Promote Existing Staff */}
      {eligibleStaff.length > 0 && (
        <Card className="rounded-[20px] border border-[#E6E4F0] bg-white p-4 shadow-2xs">
          <form onSubmit={handlePromoteStaff} className="flex flex-col sm:flex-row items-center gap-3">
            <span className="text-xs font-extrabold text-[#1E1E4F] whitespace-nowrap flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-[#272769]" />
              <span>Promote Existing Employee:</span>
            </span>
            <select
              value={promoteEmpId}
              onChange={(e) => setPromoteEmpId(e.target.value)}
              className="h-9 px-3 rounded-xl border border-[#E6E4F0] bg-[#F6F5FB] text-xs font-medium text-[#1E1E4F] flex-1 w-full sm:w-auto"
            >
              <option value="">Select an employee to elevate to Admin...</option>
              {eligibleStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name} ({staff.employee_code}) — {staff.designation_name || "Staff"}
                </option>
              ))}
            </select>
            <Button
              type="submit"
              disabled={!promoteEmpId}
              size="sm"
              className="h-9 px-4 rounded-xl bg-[#272769] hover:bg-[#1E1E4F] text-white text-xs font-bold whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              Elevate to Admin
            </Button>
          </form>
        </Card>
      )}

      {/* Search Bar & List Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#55557A]" />
          <Input
            type="search"
            placeholder="Search admins by name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-[#E6E4F0] bg-white text-xs text-[#1E1E4F] placeholder:text-[#55557A]"
          />
        </div>
        <span className="text-xs font-semibold text-[#55557A]">
          {filteredAdmins.length} {filteredAdmins.length === 1 ? "Administrator" : "Administrators"} listed
        </span>
      </div>

      {/* Admins Table */}
      <Card className="rounded-[24px] border-[1.5px] border-[#E6E4F0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F6F5FB] border-b border-[#E6E4F0] text-[11px] font-extrabold uppercase tracking-wider text-[#55557A]">
                <th className="py-3 px-4 sm:px-6">Administrator</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E4F0] text-xs">
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-[#55557A]">
                    No administrators found. Create one using the button above.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#F6F5FB]/70 transition-colors">
                    {/* Admin */}
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 rounded-xl border border-[#E6E4F0]">
                          <AvatarFallback className="bg-[#272769] text-white font-bold text-xs">
                            {emp.full_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <span className="font-extrabold text-[#1E1E4F] block text-xs sm:text-[13px]">
                            {emp.full_name}
                          </span>
                          <span className="text-[10px] text-[#55557A] font-mono">
                            {emp.employee_code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-mono text-[#55557A] text-xs">
                      {emp.email}
                    </td>

                    {/* Designation */}
                    <td className="py-3.5 px-4 text-[#1E1E4F] font-semibold text-xs">
                      {emp.designation_name || "Administrator"}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge
                        className={
                          emp.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                            : "bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        }
                      >
                        {emp.is_active ? "Active" : "Suspended"}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAdmin(emp);
                            setEditAdminName(emp.full_name);
                            setEditAdminEmail(emp.email);
                            setEditAdminMobile(emp.mobile_number || "");
                            setEditAdminDesignation(emp.designation_name || "Administrator");
                          }}
                          className="h-8 px-2.5 rounded-lg border-[#E6E4F0] text-[11px] font-bold text-[#272769] hover:bg-[#F6F5FB] gap-1"
                          title="Edit Details"
                        >
                          <Pencil className="h-3 w-3" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleAdminStatus(emp)}
                          className={`h-8 px-2 rounded-lg text-[11px] font-bold border-[#E6E4F0] ${
                            emp.is_active
                              ? "text-amber-700 hover:bg-amber-50"
                              : "text-emerald-700 hover:bg-emerald-50"
                          }`}
                          title={emp.is_active ? "Suspend Admin" : "Activate Admin"}
                        >
                          {emp.is_active ? (
                            <Ban className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingAdminId(emp.id)}
                          className="h-8 px-2 rounded-lg text-[11px] font-bold border-[#E6E4F0] text-rose-600 hover:bg-rose-50"
                          title="Delete Admin Account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Admin Dialog */}
      {editingAdmin && (
        <Dialog open={Boolean(editingAdmin)} onOpenChange={(open) => !open && setEditingAdmin(null)}>
          <DialogContent className="rounded-3xl border border-[#E6E4F0] bg-white p-6 max-w-md shadow-2xl">
            <DialogHeader className="space-y-1.5 pb-2 border-b border-[#E6E4F0]">
              <DialogTitle className="text-lg font-extrabold text-[#1E1E4F]">
                Edit Administrator Details
              </DialogTitle>
              <DialogDescription className="text-xs text-[#55557A]">
                Modify contact information and designation for {editingAdmin.full_name}.
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
                <Label className="text-xs font-bold text-[#1E1E4F]">Official Email ID</Label>
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
                  placeholder="+91 98765 43210"
                  className="rounded-xl border-[#E6E4F0] text-xs h-10"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#1E1E4F]">Designation Title</Label>
                <Input
                  value={editAdminDesignation}
                  onChange={(e) => setEditAdminDesignation(e.target.value)}
                  placeholder="Practice Administrator"
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

      {/* Delete Admin Confirmation Dialog */}
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
