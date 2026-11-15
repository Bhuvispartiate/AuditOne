import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Phone,
  FileCheck,
  ShieldCheck,
  Landmark,
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
}

export default function NewClientOnboardingPage() {
  const navigate = useNavigate();
  const employees = pmsStore.getEmployees();
  const availableServices = pmsStore.getServices().filter((s) => s.status === "Active");
  const previewClientCode = pmsStore.getNextClientCode();

  // Section A
  const [clientName, setClientName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [nickName, setNickName] = useState("");
  const [folderName, setFolderName] = useState("");
  const [folderManuallyEdited, setFolderManuallyEdited] = useState(false);
  const [referenceName, setReferenceName] = useState("");
  const [constitution, setConstitution] = useState<ClientConstitution>("Private Limited");
  const [category, setCategory] = useState("Information Technology & ITES");
  const [natureOfIncome, setNatureOfIncome] = useState("Professional Services & Consulting");

  // Section B
  const [contactPerson, setContactPerson] = useState("");
  const [contactDesignation, setContactDesignation] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [contactsList, setContactsList] = useState<
    Array<{
      id: string;
      contact_person: string;
      designation: string;
      mobile_number: string;
      email: string;
      is_primary: boolean;
    }>
  >([]);
  const [registeredAddress, setRegisteredAddress] = useState("");
  const [communicationAddress, setCommunicationAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [country, setCountry] = useState("India");

  // Section C
  const [pan, setPan] = useState("");
  const [dobOrDoi, setDobOrDoi] = useState("");
  const [extraRegistrations, setExtraRegistrations] = useState<
    Array<{
      type: string;
      value: string;
      date_of_registration?: string;
      status?: "Active" | "Inactive";
      remarks?: string;
    }>
  >([]);
  const [extraType, setExtraType] = useState("TAN");
  const [extraValue, setExtraValue] = useState("");
  const [extraRegDate, setExtraRegDate] = useState("");
  const [extraStatus, setExtraStatus] = useState<"Active" | "Inactive">("Active");
  const [extraRemarks, setExtraRemarks] = useState("");

  // Section D — Bank Account Details
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountType, setAccountType] = useState("Current");
  const [ifscCode, setIfscCode] = useState("");
  const [branchName, setBranchName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankAccountsList, setBankAccountsList] = useState<
    Array<{
      id: string;
      bank_name: string;
      account_number: string;
      account_holder_name?: string;
      account_type: string;
      ifsc_code: string;
      branch_name?: string;
      upi_id?: string;
      is_primary: boolean;
    }>
  >([]);

  // Section E — Relationship & Settings
  const [relationshipManagerId, setRelationshipManagerId] = useState(employees[0]?.id || "");
  const [clientStatus, setClientStatus] = useState<ClientStatus>("Active");
  const [remarks, setRemarks] = useState("");

  // Section E — Retainer Services & Subscription Plan
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [retainerFrequency, setRetainerFrequency] = useState<BillingFrequency>("Monthly");
  const [retainerFee, setRetainerFee] = useState<number>(0);
  const [retainerStartDate, setRetainerStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [retainerEndDate, setRetainerEndDate] = useState("");
  const [retainerPaymentTerms, setRetainerPaymentTerms] = useState("15 Days Net");
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
    };

    setSelectedRetainers((prev) => [...prev, newItem]);
    setSelectedServiceId("");
    setRetainerFee(0);
    toast.success(`Added "${srv.service_name}" to selected retainers.`);
  };

  const handleRemoveRetainer = (id: string) => {
    setSelectedRetainers((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddContact = () => {
    if (!contactPerson.trim() && !mobileNumber.trim() && !email.trim()) {
      toast.error("Please enter at least Contact Person, Mobile Number, or Email.");
      return;
    }
    const isPrimary = contactsList.length === 0;
    setContactsList((prev) => [
      ...prev,
      {
        id: `cnt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        contact_person: contactPerson.trim() || clientName.trim() || "Authorized Contact",
        designation: contactDesignation.trim(),
        mobile_number: mobileNumber.trim(),
        email: email.trim(),
        is_primary: isPrimary,
      },
    ]);
    setContactPerson("");
    setContactDesignation("");
    setMobileNumber("");
    setEmail("");
    toast.success("Contact added to list.");
  };

  const handleRemoveContact = (id: string) => {
    setContactsList((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length > 0 && !next.some((c) => c.is_primary)) {
        next[0] = { ...next[0], is_primary: true };
      }
      return next;
    });
  };

  const handleAddExtraRegistration = () => {
    if (!extraType.trim() || !extraValue.trim()) {
      toast.error("Please enter both Identifier Field (e.g. TAN) and Register Number.");
      return;
    }
    setExtraRegistrations((prev) => [
      ...prev,
      {
        type: extraType.trim(),
        value: extraValue.trim(),
        date_of_registration: extraRegDate || undefined,
        status: extraStatus,
        remarks: extraRemarks.trim() || undefined,
      },
    ]);
    setExtraType("");
    setExtraValue("");
    setExtraRegDate("");
    setExtraStatus("Active");
    setExtraRemarks("");
  };

  const handleRemoveExtra = (index: number) => {
    setExtraRegistrations(extraRegistrations.filter((_, i) => i !== index));
  };

  const handleAddBankAccount = () => {
    if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
      toast.error("Please fill Bank Name, Account Number, and IFSC Code to add bank account.");
      return;
    }
    if (confirmAccountNumber.trim() && accountNumber.trim() !== confirmAccountNumber.trim()) {
      toast.error("Account Number and Confirm Account Number do not match.");
      return;
    }
    const isFirst = bankAccountsList.length === 0;
    setBankAccountsList((prev) => [
      ...prev,
      {
        id: `bnk-${Date.now()}`,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder_name: accountHolderName.trim() || clientName.trim() || undefined,
        account_type: accountType,
        ifsc_code: ifscCode.trim().toUpperCase(),
        branch_name: branchName.trim() || undefined,
        upi_id: upiId.trim() || undefined,
        is_primary: isFirst,
      },
    ]);
    setBankName("");
    setAccountNumber("");
    setConfirmAccountNumber("");
    setAccountHolderName("");
    setAccountType("Current");
    setIfscCode("");
    setBranchName("");
    setUpiId("");
    toast.success("Bank account added to draft list.");
  };

  const handleRemoveBankAccount = (index: number) => {
    setBankAccountsList((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((a) => a.is_primary)) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryBank = (index: number) => {
    setBankAccountsList((prev) =>
      prev.map((acc, i) => ({
        ...acc,
        is_primary: i === index,
      }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientName.trim() || !legalName.trim()) {
      toast.error("Please fill all mandatory fields: Client Name and Legal Name.");
      return;
    }

    if (!pan.trim()) {
      toast.error("PAN Card is a mandatory required field.");
      return;
    }

    const rm = employees.find((e) => e.id === relationshipManagerId);

    const retainersToCreate = [...selectedRetainers];
    if (selectedServiceId) {
      const pendingSrv = availableServices.find((s) => s.id === selectedServiceId);
      if (pendingSrv) {
        retainersToCreate.push({
          id: `ret-pending-${Date.now()}`,
          service_id: pendingSrv.id,
          service_code: pendingSrv.service_code,
          service_name: pendingSrv.service_name,
          default_gst_rate: pendingSrv.default_gst_rate,
          billing_frequency: retainerFrequency,
          agreed_fee: Number(retainerFee || pendingSrv.default_fee || 0),
          start_date: retainerStartDate,
          end_date: retainerEndDate,
          payment_terms: retainerPaymentTerms,
        });
      }
    }

    const finalContacts = [...contactsList];
    if (contactPerson.trim() || mobileNumber.trim() || email.trim() || contactDesignation.trim()) {
      finalContacts.push({
        id: `cnt-${Date.now()}`,
        contact_person: contactPerson.trim() || clientName,
        designation: contactDesignation.trim(),
        mobile_number: mobileNumber.trim(),
        email: email.trim(),
        is_primary: finalContacts.length === 0,
      });
    }
    if (finalContacts.length === 0) {
      finalContacts.push({
        id: `cnt-${Date.now()}`,
        contact_person: clientName,
        designation: "",
        mobile_number: "",
        email: "",
        is_primary: true,
      });
    }

    const finalExtraRegistrations = [...extraRegistrations];
    if (extraType.trim() && extraValue.trim()) {
      finalExtraRegistrations.push({
        type: extraType.trim(),
        value: extraValue.trim(),
        date_of_registration: extraRegDate || undefined,
        status: extraStatus,
        remarks: extraRemarks.trim() || undefined,
      });
    }

    const finalBankAccounts = [...bankAccountsList];
    if (bankName.trim() || accountNumber.trim() || ifscCode.trim()) {
      if (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        toast.error("Please fill Bank Name, Account Number, and IFSC Code to save bank details.");
        return;
      }
      if (confirmAccountNumber.trim() && accountNumber.trim() !== confirmAccountNumber.trim()) {
        toast.error("Account Number and Confirm Account Number do not match.");
        return;
      }
      finalBankAccounts.push({
        id: `bnk-${Date.now()}`,
        bank_name: bankName.trim(),
        account_number: accountNumber.trim(),
        account_holder_name: accountHolderName.trim() || clientName.trim() || undefined,
        account_type: accountType,
        ifsc_code: ifscCode.trim().toUpperCase(),
        branch_name: branchName.trim() || undefined,
        upi_id: upiId.trim() || undefined,
        is_primary: finalBankAccounts.length === 0,
      });
    }

    try {
      const newClient = await pmsStore.addClient(
        {
          client_name: clientName,
          legal_name: legalName,
          nick_name: nickName.trim() || undefined,
          folder_name:
            folderName.trim() ||
            (nickName.trim() ? `${nickName.trim()} ${previewClientCode}` : undefined),
          reference_name: referenceName || undefined,
          constitution,
          category,
          nature_of_income: natureOfIncome,
          remarks,
          relationship_manager_id: relationshipManagerId,
          relationship_manager_name: rm?.full_name,
          status: clientStatus,
          contact: {
            ...finalContacts[0],
            client_id: "",
          },
          contacts: finalContacts.map((c) => ({ ...c, client_id: "" })),
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
            pan: pan.trim().toUpperCase(),
            dob_or_doi: dobOrDoi || undefined,
            additional_registrations: finalExtraRegistrations
          },
          bank_accounts: finalBankAccounts.map((b) => ({
            ...b,
            client_id: "",
          }))
        },
        { skipDefaultProject: retainersToCreate.length > 0 }
      );

      let createdProjectsCount = retainersToCreate.length === 0 ? 1 : 0;
      let createdTasksCount = retainersToCreate.length === 0 ? 1 : 0;

      for (const ret of retainersToCreate) {
        const result = await pmsStore.addServiceEngagementCascade({
          client_id: newClient.id,
          client_name: newClient.client_name,
          service_id: ret.service_id,
          service_name: ret.service_name,
          service_code: ret.service_code,
          agreed_fee: ret.agreed_fee,
          gst_rate: ret.default_gst_rate,
          billing_frequency: ret.billing_frequency,
          payment_terms: ret.payment_terms,
          relationship_manager_id: relationshipManagerId,
          relationship_manager_name: rm?.full_name,
          start_date: ret.start_date,
          end_date: ret.end_date || undefined,
          status: "Active",
          remarks: "Subscribed during client onboarding",
        });
        createdProjectsCount += 1;
        createdTasksCount += result.tasks.length;
      }

      toast.success(
        retainersToCreate.length > 0
          ? `Client ${newClient.client_name} (${newClient.client_code}) created with ${retainersToCreate.length} service(s), ${createdProjectsCount} project(s) & ${createdTasksCount} task(s).`
          : `Client ${newClient.client_name} (${newClient.client_code}) created with 1 Project & 1 Task.`
      );
      navigate(`/clients/${newClient.id}`);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to save client to Supabase."}`);
    }
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
              <Label className="text-xs font-semibold">Nick Name</Label>
              <Input
                placeholder="e.g. Acme"
                value={nickName}
                onChange={(e) => {
                  const nextNick = e.target.value;
                  setNickName(nextNick);
                  if (!folderManuallyEdited) {
                    setFolderName(nextNick.trim() ? `${nextNick.trim()} ${previewClientCode}` : "");
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Folder Name</Label>
              <Input
                placeholder={`e.g. Acme ${previewClientCode}`}
                value={folderName}
                onChange={(e) => {
                  setFolderName(e.target.value);
                  setFolderManuallyEdited(Boolean(e.target.value.trim()));
                }}
              />
              <p className="text-[11px] text-slate-500">
                Auto-formatted as &quot;&lt;Nick Name&gt; {previewClientCode}&quot;
              </p>
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

              <div className="flex items-end justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-semibold">Country</Label>
                  <Input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddContact}
                  className="h-9 px-3.5 gap-1.5 shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add More Contact</span>
                </Button>
              </div>
            </div>

            {contactsList.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  Added Contacts ({contactsList.length})
                </span>
                <div className="space-y-2">
                  {contactsList.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={idx === 0 ? "default" : "secondary"}
                          className="text-[10px]"
                        >
                          {idx === 0 ? "Primary" : `Contact ${idx + 1}`}
                        </Badge>
                        <span className="font-bold text-slate-900">{c.contact_person}</span>
                        {c.designation && (
                          <span className="text-slate-500">({c.designation})</span>
                        )}
                        {c.mobile_number && (
                          <span className="font-mono text-slate-700">• {c.mobile_number}</span>
                        )}
                        {c.email && <span className="text-slate-600">• {c.email}</span>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveContact(c.id)}
                        className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
              PAN and additional statutory registrations
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  PAN <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="e.g. ABCDE1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  maxLength={10}
                  required
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
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 block">
                  Additional Statutory Identifiers (TAN, IEC, MSME, EPFO, etc.) — Optional
                </Label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Enter the main identifier field (e.g. TAN, IEC, MSME, EPFO), register number, date of registration, status, and remarks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <div className="lg:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Main Field (e.g. TAN)
                  </Label>
                  <Input
                    list="statutory-identifier-presets"
                    placeholder="e.g. TAN, IEC, MSME"
                    value={extraType}
                    onChange={(e) => setExtraType(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                  <datalist id="statutory-identifier-presets">
                    <option value="TAN" />
                    <option value="IEC" />
                    <option value="MSME" />
                    <option value="EPFO" />
                    <option value="ESIC" />
                    <option value="FSSAI" />
                    <option value="PT" />
                    <option value="RERA" />
                  </datalist>
                </div>

                <div className="lg:col-span-3 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Register Number
                  </Label>
                  <Input
                    placeholder="e.g. DELA12345B"
                    value={extraValue}
                    onChange={(e) => setExtraValue(e.target.value)}
                    className="h-9 text-xs font-mono bg-white"
                  />
                </div>

                <div className="lg:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">
                    Date of Registration
                  </Label>
                  <Input
                    type="date"
                    value={extraRegDate}
                    onChange={(e) => setExtraRegDate(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="lg:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Status</Label>
                  <select
                    value={extraStatus}
                    onChange={(e) => setExtraStatus(e.target.value as "Active" | "Inactive")}
                    className="w-full h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="lg:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold text-slate-600">Remarks</Label>
                  <Input
                    placeholder="Optional remarks..."
                    value={extraRemarks}
                    onChange={(e) => setExtraRemarks(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                <div className="lg:col-span-1">
                  <Button
                    type="button"
                    onClick={handleAddExtraRegistration}
                    variant="outline"
                    size="sm"
                    className="w-full h-9 px-3 gap-1 bg-white"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </Button>
                </div>
              </div>

              {extraRegistrations.length > 0 && (
                <div className="space-y-2 mt-2">
                  {extraRegistrations.map((reg, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="font-bold text-slate-900">{reg.type}</span>
                        <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {reg.value}
                        </span>
                        {reg.date_of_registration && (
                          <span className="text-slate-600">
                            Reg Date: {reg.date_of_registration}
                          </span>
                        )}
                        <Badge
                          className={
                            reg.status === "Inactive"
                              ? "bg-slate-200 text-slate-700 text-[10px]"
                              : "bg-emerald-100 text-emerald-700 text-[10px]"
                          }
                        >
                          {reg.status || "Active"}
                        </Badge>
                        {reg.remarks && (
                          <span className="text-slate-500 italic">• {reg.remarks}</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveExtra(idx)}
                        className="h-7 w-7 text-rose-500 hover:text-red-600 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SECTION D — Client Bank Account Details */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section D — Client Bank Account Details
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary operating bank account, IFSC code, branch, account type and online payment identifiers
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bank Name</Label>
                <Input
                  list="bank-name-presets"
                  placeholder="e.g. HDFC Bank, SBI, ICICI"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <datalist id="bank-name-presets">
                  <option value="State Bank of India (SBI)" />
                  <option value="HDFC Bank" />
                  <option value="ICICI Bank" />
                  <option value="Axis Bank" />
                  <option value="Kotak Mahindra Bank" />
                  <option value="Punjab National Bank" />
                  <option value="Bank of Baroda" />
                  <option value="Canara Bank" />
                  <option value="Union Bank of India" />
                  <option value="IndusInd Bank" />
                  <option value="Yes Bank" />
                  <option value="Federal Bank" />
                  <option value="IDFC FIRST Bank" />
                  <option value="Standard Chartered Bank" />
                  <option value="Citibank" />
                  <option value="HSBC Bank" />
                </datalist>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Holder Name</Label>
                <Input
                  placeholder="e.g. As per bank records"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Type</Label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
                >
                  <option value="Current">Current Account</option>
                  <option value="Savings">Savings Account</option>
                  <option value="Cash Credit / Overdraft">Cash Credit (CC) / OD</option>
                  <option value="Escrow">Escrow Account</option>
                  <option value="NRE / NRO">NRE / NRO Account</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Number</Label>
                <Input
                  placeholder="e.g. 50200012345678"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Confirm Account Number</Label>
                <Input
                  placeholder="Re-enter account number"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IFSC Code</Label>
                <Input
                  placeholder="e.g. HDFC0000123"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  maxLength={11}
                  className="uppercase font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch Name / City (Optional)</Label>
                <Input
                  placeholder="e.g. Nariman Point Branch, Mumbai"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">UPI ID / VPA (Optional)</Label>
                <Input
                  placeholder="e.g. company@okhdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddBankAccount}
                  className="w-full h-9 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold text-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Another Bank Account</span>
                </Button>
              </div>
            </div>

            {bankAccountsList.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-2 mt-4">
                <span className="text-xs font-bold text-slate-700 block">
                  Added Bank Accounts ({bankAccountsList.length})
                </span>
                <div className="space-y-2">
                  {bankAccountsList.map((acc, idx) => (
                    <div
                      key={acc.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3.5 py-2.5 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{acc.bank_name}</span>
                        <span className="font-mono bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold">
                          A/C: {acc.account_number}
                        </span>
                        <span className="font-mono text-blue-700 font-semibold">
                          IFSC: {acc.ifsc_code}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {acc.account_type}
                        </Badge>
                        {acc.branch_name && (
                          <span className="text-slate-500">Branch: {acc.branch_name}</span>
                        )}
                        {acc.upi_id && (
                          <span className="text-emerald-600 font-mono">UPI: {acc.upi_id}</span>
                        )}
                        {acc.is_primary ? (
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">Primary</Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSetPrimaryBank(idx)}
                            className="h-6 text-[10px] text-slate-600 hover:text-blue-600 px-1.5"
                          >
                            Set as Primary
                          </Button>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveBankAccount(idx)}
                        className="h-7 w-7 text-rose-500 hover:text-red-600 hover:bg-rose-50 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION E — Additional Information */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section E — Relationship & Organization Settings
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

        {/* SECTION F — Service Selection & Retainer Plan */}
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-lime-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                Section F — Retainer Services &amp; Service Selection
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
                      <>
                        <option value="">— Select a Service to Subscribe —</option>
                        {availableServices.map((srv) => (
                          <option key={srv.id} value={srv.id}>
                            {srv.service_name}
                          </option>
                        ))}
                      </>
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
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

