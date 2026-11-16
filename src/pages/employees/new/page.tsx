import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  UserCheck,
  Building2,
  Lock,
  CreditCard,
  Save,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { pmsStore, INITIAL_DESIGNATIONS } from "@/lib/data/store";
import { isSuperAdmin } from "@/lib/access";
import { RoleCode } from "@/types";
import { toast } from "sonner";

export default function NewEmployeePage() {
  const navigate = useNavigate();
  const currentUser = pmsStore.getCurrentUser();
  const canAssignAdminRole = isSuperAdmin(currentUser);
  const designations = INITIAL_DESIGNATIONS;
  const currentEmployees = pmsStore.getEmployees();
  const [teams, setTeams] = useState(() => pmsStore.getTeams());

  useEffect(() => {
    setTeams(pmsStore.getTeams());
    return pmsStore.subscribe(() => {
      setTeams(pmsStore.getTeams());
    });
  }, []);

  // Employee details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [designationId, setDesignationId] = useState(designations[3]?.id || "");
  const [supervisorId, setSupervisorId] = useState(currentEmployees[0]?.id || "");
  const [teamId, setTeamId] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [employmentStatus, setEmploymentStatus] = useState<any>("Active");
  const [roleCode, setRoleCode] = useState<RoleCode>("EMPLOYEE");

  // Bank details
  const [bankName, setBankName] = useState("HDFC Bank Ltd");
  const [accountType, setAccountType] = useState("Salary");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankRemarks, setBankRemarks] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !mobileNumber.trim()) {
      toast.error("Please fill in first name, last name, official email and mobile number.");
      return;
    }

    const desig = designations.find((d) => d.id === designationId);
    const sup = currentEmployees.find((e) => e.id === supervisorId);
    const selectedTeam = teams.find((t) => t.id === teamId);

    try {
      const newEmp = await pmsStore.addEmployee({
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        email,
        mobile_number: mobileNumber,
        father_name: fatherName,
        date_of_birth: dateOfBirth,
        designation_id: designationId,
        designation_name: desig?.title,
        supervisor_id: supervisorId,
        supervisor_name: sup?.full_name,
        team_id: selectedTeam?.id,
        team_name: selectedTeam?.name,
        joining_date: joiningDate,
        employment_status: employmentStatus,
        is_active: true,
        role_code: roleCode,
        assigned_projects_count: 0,
        assigned_tasks_count: 0,
        completed_tasks_count: 0,
      });

      toast.success(`Employee ${newEmp.full_name} onboarded with ID ${newEmp.employee_code}`);
      navigate(`/employees/${newEmp.id}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to onboard employee to database.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <Link to="/employees">
          <Button variant="outline" size="icon" className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Employee Onboarding & Registration
          </h1>
          <p className="text-xs text-slate-500">
            Create professional employee profile, hierarchy designation, bank escrow and authentication mapping.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Personal & Designation */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Professional Details & Role Mapping
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Rahul"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. Kapoor"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Official Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="rahul.kapoor@pmsfirm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Mobile Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="+91 98110 00112"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Father's Full Name</Label>
                <Input
                  placeholder="e.g. Ramesh Kapoor"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Date of Birth</Label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Practice Designation</Label>
                <select
                  value={designationId}
                  onChange={(e) => setDesignationId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {designations.map((d) => (
                    <option key={d.id} value={d.id}>{d.title} (Level {d.level})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Reporting Supervisor</Label>
                <select
                  value={supervisorId}
                  onChange={(e) => setSupervisorId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  {currentEmployees.map((e) => (
                    <option key={e.id} value={e.id}>{e.full_name} ({e.designation_name})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">System RBAC Role</Label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value as RoleCode)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="HEAD">Head</option>
                  <option value="DIRECTOR">Director</option>
                  {canAssignAdminRole && <option value="ADMIN">Admin</option>}
                  {canAssignAdminRole && <option value="SUPER_ADMIN">Super Admin</option>}
                  <option value="TRAINEE">Trainee</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Team</Label>
                <select
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold"
                >
                  <option value="">Unassigned / No Team</option>
                  {teams
                    .filter((t) => t.status === "Active")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
                {teams.length === 0 && (
                  <p className="text-[11px] text-slate-500">
                    No teams created yet.{" "}
                    <Link to="/teams" className="text-blue-600 hover:underline font-medium">
                      Create a team
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION 2: Bank & Payroll Escrow Details */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Salary Bank Account Details (Restricted & Encrypted)
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Direct payroll disbursement credentials. Protected by AES-256 and RBAC permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Bank Name</Label>
              <Input
                placeholder="e.g. HDFC Bank Ltd"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Type</Label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="Salary">Salary Account</option>
                <option value="Savings">Savings Account</option>
                <option value="Current">Current Account</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Account Number</Label>
              <Input
                placeholder="e.g. 5010029384756"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">IFSC Code</Label>
              <Input
                placeholder="e.g. HDFC0000043"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="font-mono uppercase text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold">Account Holder Name (as per Aadhaar)</Label>
              <Input
                placeholder="Full official name as per identity proof..."
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link to="/employees">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6">
            <Save className="h-4 w-4" />
            <span>Complete Onboarding</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

