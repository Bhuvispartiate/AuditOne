import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Phone,
  FileCheck,
  ShieldCheck,
  Plus,
  Save,
  Briefcase,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { BillingFrequency, ClientConstitution, ClientStatus } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface SelectedRetainerDraft {
  id: string;
  service_id: string;
  service_code: string;
  service_name: string;
  default_gst_rate: number;
  billing_frequency: BillingFrequency;
  agreed_fee: number;
  start_date: string;
  end_date: string;
  payment_terms: string;
  department_id: string;
  department_name: string;
}

export default function NewClientOnboardingPage() {
  const navigate = useNavigate();
  const employees = pmsStore.getEmployees();
  const departments = pmsStore.getDepartments();
  const availableServices = pmsStore.getServices().filter((s) => s.status === "Active");

  // Section A
  const [clientName, setClientName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [referenceName, setReferenceName] = useState("");
  const [constitution, setConstitution] = useState<ClientConstitution>("Private Limited");
  const [category, setCategory] = useState("Information Technology & ITES");
  const [natureOfIncome, setNatureOfIncome] = useState("Professional Services & Consulting");

  // Section B
  const [contactPerson, setContactPerson] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [communicationAddress, setCommunicationAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("India");

  // Section C
  const [pan, setPan] = useState("");
  const [gstin, setGstin] = useState("");
  const [cin, setCin] = useState("");
  const [dobOrDoi, setDobOrDoi] = useState("");
  const [extraRegistrations, setExtraRegistrations] = useState<Array<{ type: string; value: string }>>([]);
  const [extraType, setExtraType] = useState("TAN");
  const [extraValue, setExtraValue] = useState("");

  // Section D
  const [relationshipManagerId, setRelationshipManagerId] = useState(employees[0]?.id || "");
  const [clientStatus, setClientStatus] = useState<ClientStatus>("Active");
  const [remarks, setRemarks] = useState("");

  // Section E — Retainer Services & Subscription Plan
  const [selectedServiceId, setSelectedServiceId] = useState(
    availableServices[0]?.id || ""
  );
  const [retainerFrequency, setRetainerFrequency] = useState<BillingFrequency>(
    availableServices[0]?.billing_type === "One-time" ? "One-time" : "Monthly"
  );
  const [retainerFee, setRetainerFee] = useState<number>(
    availableServices[0]?.default_fee ?? 0
  );
  const [retainerStartDate, setRetainerStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [retainerEndDate, setRetainerEndDate] = useState("");
  const [retainerPaymentTerms, setRetainerPaymentTerms] = useState("15 Days Net");
  const [retainerDeptId, setRetainerDeptId] = useState(
    departments[0]?.id || ""
  );
  const [selectedRetainers, setSelectedRetainers] = useState<SelectedRetainerDraft[]>([]);

  const handleServiceSelectChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const match = availableServices.find((s) => s.id === serviceId);
    if (match) {
      setRetainerFee(match.default_fee);
      setRetainerFrequency(match.billing_type === "One-time" ? "One-time" : "Monthly");
    }
  };

  const handleAddRetainer = () => {
    const srv = availableServices.find((s) => s.id === selectedServiceId);
    if (!srv) {
      toast.error("Please select a service from your Services catalog.");
      return;
    }
    if (retainerFee < 0 || Number.isNaN(Number(retainerFee))) {
      toast.error("Please enter a valid agreed fee.");
      return;
    }

    const dept = departments.find((d) => d.id === retainerDeptId);
    const newItem: SelectedRetainerDraft = {
      id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      service_id: srv.id,
      service_code: srv.service_code,
      service_name: srv.service_name,
      default_gst_rate: srv.default_gst_rate,
      billing_frequency: retainerFrequency,
      agreed_fee: Number(retainerFee),
      start_date: retainerStartDate,
      end_date: retainerEndDate,
      payment_terms: retainerPaymentTerms,
      department_id: retainerDeptId,
      department_name: dept?.name || "General",
    };

    setSelectedRetainers((prev) => [...prev, newItem]);
    toast.success(`Added "${srv.service_name}" to selected retainers.`);
  };

  const handleRemoveRetainer = (id: string) => {
    setSelectedRetainers((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddExtraRegistration = () => {
    if (!extraValue.trim()) return;
    setExtraRegistrations([...extraRegistrations, { type: extraType, value: extraValue.trim() }]);
    setExtraValue("");
  };

  const handleRemoveExtra = (index: number) => {
    setExtraRegistrations(extraRegistrations.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !legalName.trim() || !pan.trim()) {
      toast.error("Please fill all mandatory fields: Client Name, Legal Name, and PAN.");
      return;
    }

    const rm = employees.find((e) => e.id === relationshipManagerId);

    const newClient = pmsStore.addClient({
      client_name: clientName,
      legal_name: legalName,
      reference_name: referenceName || undefined,
      constitution,
      category,
      nature_of_income: natureOfIncome,
      remarks,
      relationship_manager_id: relationshipManagerId,
      relationship_manager_name: rm?.full_name,
      status: clientStatus,
      contact: {
        id: `cnt-${Date.now()}`,
        client_id: "",
        contact_person: contactPerson || clientName,
        designation: contactDesignation,
        mobile_number: mobileNumber,
        email,
        is_primary: true
      },
      addresses: [
        {
          id: `addr-1-${Date.now()}`,
          client_id: "",
          address_type: "Registered",
          street_address: registeredAddress,
          city,
          state,
          pin_code: pinCode,
          country,
          is_primary: true
        },
        ...(communicationAddress ? [{
          id: `addr-2-${Date.now()}`,
          client_id: "",
          address_type: "Communication" as const,
          street_address: communicationAddress,
          city,
          state,
          pin_code: pinCode,
          country,
          is_primary: false
        }] : [])
      ],
      registration: {
        id: `reg-${Date.now()}`,
        client_id: "",
        pan: pan.toUpperCase(),
        gstin: gstin ? gstin.toUpperCase() : undefined,
        cin: cin ? cin.toUpperCase() : undefined,
        dob_or_doi: dobOrDoi || undefined,
        additional_registrations: extraRegistrations
      }
    });

    let createdProjectsCount = 0;
    let createdTasksCount = 0;

    selectedRetainers.forEach((ret) => {
      const result = pmsStore.addServiceEngagementCascade({
        client_id: newClient.id,
        client_name: newClient.client_name,
        service_id: ret.service_id,
        service_name: ret.service_name,
        service_code: ret.service_code,
        agreed_fee: ret.agreed_fee,
        gst_rate: ret.default_gst_rate,
        billing_frequency: ret.billing_frequency,
        payment_terms: ret.payment_terms,
        department_id: ret.department_id || undefined,
        department_name: ret.department_name,
        relationship_manager_id: relationshipManagerId,
        relationship_manager_name: rm?.full_name,
        start_date: ret.start_date,
        end_date: ret.end_date || undefined,
        status: "Active",
        remarks: "Subscribed during client onboarding",
      });
      createdProjectsCount += 1;
      createdTasksCount += result.tasks.length;
    });

    toast.success(
      selectedRetainers.length > 0
        ? `Client ${newClient.client_name} (${newClient.client_code}) created with ${selectedRetainers.length} service(s), ${createdProjectsCount} project(s) & ${createdTasksCount} task(s).`
        : `Client ${newClient.client_name} onboarded successfully with ID ${newClient.client_code}`
    );
    navigate(`/clients/${newClient.id}`);
  };

  return (
    <div className="space-y-6 pb-16 max-w-5xl mx-auto">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/clients">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              New Client Onboarding
            </h1>
            <p className="text-xs text-slate-500">
              Complete Sections A, B, C & D to establish the master client profile.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION A — Basic Client Information */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section A — Basic Client Information
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Entity details, legal constitution and commercial categorization
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Client Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Acme Tech Solutions"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Legal Registered Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. Acme Tech Solutions Private Limited"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reference / Trade Name</Label>
              <Input
                placeholder="e.g. Acme Group"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Constitution <span className="text-red-500">*</span>
              </Label>
              <select
                value={constitution}
                onChange={(e) => setConstitution(e.target.value as ClientConstitution)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                <option value="Proprietorship">Proprietorship</option>
                <option value="Partnership">Partnership</option>
                <option value="LLP">LLP</option>
                <option value="Private Limited">Private Limited</option>
                <option value="Public Limited">Public Limited</option>
                <option value="Individual">Individual</option>
                <option value="Trust">Trust</option>
                <option value="Society">Society</option>
                <option value="HUF">HUF</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Industry / Category</Label>
              <Input
                placeholder="e.g. FinTech, Real Estate, Manufacturing"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Nature of Income</Label>
              <Input
                placeholder="e.g. Business profits, Export services, Royalty"
                value={natureOfIncome}
                onChange={(e) => setNatureOfIncome(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION B — Contact Information */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section B — Contact & Communication Details
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary key person contact, registered and official mailing address
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold">Contact Person</Label>
                <Input
                  placeholder="e.g. John Doe"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Designation</Label>
                <Input
                  placeholder="e.g. CFO / Director"
                  value={contactDesignation}
                  onChange={(e) => setContactDesignation(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Mobile Number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Official Email ID</Label>
                <Input
                  type="email"
                  placeholder="finance@acmetech.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Country</Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Registered Office Address</Label>
                <Textarea
                  placeholder="Complete registered address as per MCA / Tax records..."
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  className="min-h-[70px]"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Communication Address (if different)</Label>
                <Textarea
                  placeholder="Mailing address for physical notices or correspondence..."
                  value={communicationAddress}
                  onChange={(e) => setCommunicationAddress(e.target.value)}
                  className="min-h-[70px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  placeholder="e.g. New Delhi"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State / Union Territory</Label>
                <Input
                  placeholder="e.g. Delhi"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">PIN Code</Label>
                <Input
                  placeholder="e.g. 110001"
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECTION C — Registration Details */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-violet-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section C — Statutory Registration Details
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              PAN, GSTIN, CIN and additional statutory registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  PAN <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="uppercase font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">GSTIN (Optional)</Label>
                <Input
                  placeholder="e.g. 07ABCDE1234F1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  maxLength={15}
                  className="uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CIN / LLPIN (Optional)</Label>
                <Input
                  placeholder="e.g. U72200DL2020PTC123456"
                  value={cin}
                  onChange={(e) => setCin(e.target.value.toUpperCase())}
                  className="uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">DOB / Date of Incorporation</Label>
                <Input
                  type="date"
                  value={dobOrDoi}
                  onChange={(e) => setDobOrDoi(e.target.value)}
                />
              </div>
            </div>

            {/* Multiple Additional Registrations Support */}
            <div className="pt-2 border-t border-slate-100">
              <Label className="text-xs font-semibold text-slate-700 block mb-2">
                Additional Statutory Identifiers (TAN, IEC, MSME, EPFO, etc.)
              </Label>
              <div className="flex items-center gap-2 max-w-md">
                <select
                  value={extraType}
                  onChange={(e) => setExtraType(e.target.value)}
                  className="h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="TAN">TAN</option>
                  <option value="IEC">Import Export Code (IEC)</option>
                  <option value="MSME">MSME Udyam</option>
                  <option value="EPFO">EPF Registration</option>
                  <option value="ESIC">ESI Code</option>
                  <option value="FSSAI">FSSAI License</option>
                </select>
                <Input
                  placeholder="Registration Number"
                  value={extraValue}
                  onChange={(e) => setExtraValue(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button
                  type="button"
                  onClick={handleAddExtraRegistration}
                  variant="outline"
                  size="sm"
                  className="h-9 px-3 gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </Button>
              </div>

              {extraRegistrations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {extraRegistrations.map((reg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-md text-xs font-medium"
                    >
                      <strong className="text-slate-600">{reg.type}:</strong> {reg.value}
                      <button
                        type="button"
                        onClick={() => handleRemoveExtra(idx)}
                        className="text-slate-400 hover:text-red-600 ml-1"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION D — Additional Information */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section D — Relationship & Organization Settings
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Assigned Relationship Manager, engagement status and internal remarks
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Assigned Relationship Manager</Label>
              <select
                value={relationshipManagerId}
                onChange={(e) => setRelationshipManagerId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.designation_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Client Status</Label>
              <select
                value={clientStatus}
                onChange={(e) => setClientStatus(e.target.value as ClientStatus)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="On Hold">On Hold</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs font-semibold">Internal Remarks & Compliance Scope</Label>
              <Textarea
                placeholder="Specific instructions, billing covenants or tax residency notes..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* SECTION E — Service Selection & Retainer Plan */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-lime-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section E — Retainer Services &amp; Service Selection
              </CardTitle>
            </div>
            <CardDescription className="text-xs font-medium text-slate-600">
              Stage 2: Retainer Services, Recurring Frequencies &amp; Agreed Pricing — each added service automatically creates its linked Project &amp; Task.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Add Subscribed Service Row */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold text-slate-800 block">
                Add Subscribed Service:
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5">
                  <select
                    value={selectedServiceId}
                    onChange={(e) => handleServiceSelectChange(e.target.value)}
                    disabled={availableServices.length === 0}
                    className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    {availableServices.length === 0 ? (
                      <option value="">No services added in catalog yet</option>
                    ) : (
                      availableServices.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.service_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="md:col-span-3">
                  <select
                    value={retainerFrequency}
                    onChange={(e) => setRetainerFrequency(e.target.value as BillingFrequency)}
                    className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="One-time">One-time</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Half-yearly">Half-yearly</option>
                    <option value="Annually">Annually</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    value={retainerFee}
                    onChange={(e) => setRetainerFee(Number(e.target.value))}
                    placeholder="15000"
                    className="h-10 text-sm font-semibold"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button
                    type="button"
                    onClick={handleAddRetainer}
                    disabled={availableServices.length === 0}
                    className="w-full h-10 bg-neutral-900 hover:bg-black text-white gap-1.5 font-semibold disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {availableServices.length === 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No services found in your catalog.{" "}
                  <Link to="/services" className="font-semibold underline">
                    Add services in the Services page
                  </Link>{" "}
                  to select them here.
                </p>
              )}

              {/* Optional Engagement Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Start Date</Label>
                  <Input
                    type="date"
                    value={retainerStartDate}
                    onChange={(e) => setRetainerStartDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={retainerEndDate}
                    onChange={(e) => setRetainerEndDate(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Payment Terms</Label>
                  <Input
                    value={retainerPaymentTerms}
                    onChange={(e) => setRetainerPaymentTerms(e.target.value)}
                    placeholder="15 Days Net"
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-slate-500">Responsible Department</Label>
                  <select
                    value={retainerDeptId}
                    onChange={(e) => setRetainerDeptId(e.target.value)}
                    className="w-full h-8 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:outline-none"
                  >
                    {departments.length === 0 ? (
                      <option value="">General</option>
                    ) : (
                      departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </div>

            {/* Selected Retainers List */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">
                  Selected Retainers ({selectedRetainers.length}):
                </Label>
                {selectedRetainers.length > 0 && (
                  <span className="text-xs font-semibold text-slate-600">
                    Total Agreed Value:{" "}
                    <strong className="text-slate-900">
                      {formatCurrency(selectedRetainers.reduce((sum, r) => sum + r.agreed_fee, 0))}
                    </strong>
                  </span>
                )}
              </div>

              {selectedRetainers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-xs text-slate-500">
                  No services added yet. Select a service above to add to retainer.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRetainers.map((ret) => (
                    <div
                      key={ret.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            {ret.service_code}
                          </span>
                          <span className="text-sm font-bold text-slate-900">
                            {ret.service_name}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {ret.billing_frequency}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                          <span>Start: {ret.start_date}</span>
                          {ret.end_date && <span>End: {ret.end_date}</span>}
                          <span>Terms: {ret.payment_terms}</span>
                          <span>Dept: {ret.department_name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="text-sm font-extrabold text-slate-900">
                          {formatCurrency(ret.agreed_fee)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveRetainer(ret.id)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link to="/clients">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm px-6">
            <Save className="h-4 w-4" />
            <span>Complete Onboarding & View 360°</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

