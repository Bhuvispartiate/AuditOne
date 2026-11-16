import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Landmark,
  Phone,
  Mail,
  MapPin,
  FileText,
  Briefcase,
  FolderGit2,
  CheckSquare,
  GitBranch,
  CreditCard,
  Receipt,
  FileCheck,
  History,
  Plus,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Download,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Clock,
  ListChecks,
  MessageSquare,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { pmsStore } from "@/lib/data/store";
import {
  isEmployeeRestricted,
  isClientAssignedToEmployee,
  isProjectAssignedToEmployee,
  isTaskAssignedToEmployee,
  collectTaskIds,
  isDocumentVisibleToEmployee,
} from "@/lib/access";
import { formatCurrency, formatDate, formatDateTime, formatBytes } from "@/lib/utils";
import {
  TaskStatus,
  Client,
  ClientConstitution,
  ClientStatus,
  ClientContact,
  ClientAddress,
  ClientBankAccount,
} from "@/types";
import { toast } from "sonner";
import { ProjectTimeline } from "@/components/tasks/project-timeline";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

export default function Client360ProfilePage() {
  const params = useParams();
  const navigate = useNavigate();
  const [, setRefreshKey] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<{
    id: string;
    title: string;
    type: string;
    actor: string;
    timestamp: string;
    description?: string;
    details?: Record<string, any>;
  } | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const clientId = params.id as string;
  const client = pmsStore.getClientById(clientId);
  const employees = pmsStore.getEmployees();

  // Edit Client Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTab, setEditTab] = useState("basic");
  const [isSavingClient, setIsSavingClient] = useState(false);

  // Deleted ID trackers to sync with DB
  const [deletedContactIds, setDeletedContactIds] = useState<string[]>([]);
  const [deletedAddressIds, setDeletedAddressIds] = useState<string[]>([]);
  const [deletedBankAccountIds, setDeletedBankAccountIds] = useState<string[]>([]);

  // Edit fields (Section A & Snapshot)
  const [editClientName, setEditClientName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [editNickName, setEditNickName] = useState("");
  const [editFolderName, setEditFolderName] = useState("");
  const [editReferenceName, setEditReferenceName] = useState("");
  const [editConstitution, setEditConstitution] = useState<ClientConstitution>("Private Limited");
  const [editCategory, setEditCategory] = useState("");
  const [editNatureOfIncome, setEditNatureOfIncome] = useState("");
  const [editRelationshipManagerId, setEditRelationshipManagerId] = useState("");
  const [editStatus, setEditStatus] = useState<ClientStatus>("Active");
  const [editRemarks, setEditRemarks] = useState("");

  // Contacts (Section B)
  const [editContacts, setEditContacts] = useState<ClientContact[]>([]);
  const [newContactPerson, setNewContactPerson] = useState("");
  const [newContactDesignation, setNewContactDesignation] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newContactMobile, setNewContactMobile] = useState("");

  // Addresses (Section B Addresses)
  const [editAddresses, setEditAddresses] = useState<ClientAddress[]>([]);
  const [newAddressType, setNewAddressType] = useState<string>("Registered");
  const [newStreetAddress, setNewStreetAddress] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPinCode, setNewPinCode] = useState("");

  // Registrations (Section C)
  const [editPan, setEditPan] = useState("");
  const [editDobOrDoi, setEditDobOrDoi] = useState("");
  const [editGstin, setEditGstin] = useState("");
  const [editCin, setEditCin] = useState("");
  const [editExtraRegs, setEditExtraRegs] = useState<
    Array<{ type: string; value: string; date_of_registration?: string; status?: "Active" | "Inactive"; remarks?: string }>
  >([]);
  const [newExtraType, setNewExtraType] = useState("TAN");
  const [newExtraValue, setNewExtraValue] = useState("");
  const [newExtraDate, setNewExtraDate] = useState("");
  const [newExtraRemarks, setNewExtraRemarks] = useState("");

  // Bank Accounts (Section D)
  const [editBankAccounts, setEditBankAccounts] = useState<ClientBankAccount[]>([]);
  const [newBankName, setNewBankName] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");
  const [newAccountType, setNewAccountType] = useState("Current");
  const [newIfscCode, setNewIfscCode] = useState("");
  const [newBranchName, setNewBranchName] = useState("");
  const [newUpiId, setNewUpiId] = useState("");

  const handleOpenEditModal = (initialTab = "basic") => {
    if (!client) return;
    setEditTab(initialTab);
    setEditClientName(client.client_name || "");
    setEditLegalName(client.legal_name || "");
    setEditNickName(client.nick_name || "");
    setEditFolderName(client.folder_name || "");
    setEditReferenceName(client.reference_name || "");
    setEditConstitution(client.constitution || "Private Limited");
    setEditCategory(client.category || "");
    setEditNatureOfIncome(client.nature_of_income || "");
    setEditRelationshipManagerId(client.relationship_manager_id || "");
    setEditStatus(client.status || "Active");
    setEditRemarks(client.remarks || "");

    const contactsList =
      client.contacts && client.contacts.length > 0
        ? [...client.contacts]
        : client.contact
        ? [{ ...client.contact }]
        : [];
    setEditContacts(contactsList);
    setDeletedContactIds([]);

    setEditAddresses(client.addresses ? [...client.addresses] : []);
    setDeletedAddressIds([]);

    setEditPan(client.registration?.pan || "");
    setEditDobOrDoi(client.registration?.dob_or_doi || "");
    setEditGstin(client.registration?.gstin || "");
    setEditCin(client.registration?.cin || "");
    setEditExtraRegs(
      client.registration?.additional_registrations
        ? [...client.registration.additional_registrations]
        : []
    );

    setEditBankAccounts(client.bank_accounts ? [...client.bank_accounts] : []);
    setDeletedBankAccountIds([]);

    setNewContactPerson("");
    setNewContactDesignation("");
    setNewContactEmail("");
    setNewContactMobile("");
    setNewAddressType("Registered");
    setNewStreetAddress("");
    setNewCity("");
    setNewState("");
    setNewPinCode("");
    setNewExtraType("TAN");
    setNewExtraValue("");
    setNewExtraDate("");
    setNewExtraRemarks("");
    setNewBankName("");
    setNewAccountNumber("");
    setNewAccountType("Current");
    setNewIfscCode("");
    setNewBranchName("");
    setNewUpiId("");

    setIsEditModalOpen(true);
  };

  const handleAddContact = () => {
    if (!newContactPerson.trim() && !newContactMobile.trim() && !newContactEmail.trim()) {
      toast.error("Please enter at least a contact person name, mobile, or email.");
      return;
    }
    const newContact: ClientContact = {
      id: `cnt-${Date.now()}`,
      client_id: clientId,
      contact_person: newContactPerson.trim() || editClientName,
      designation: newContactDesignation.trim() || undefined,
      mobile_number: newContactMobile.trim(),
      email: newContactEmail.trim(),
      is_primary: editContacts.length === 0,
    };
    setEditContacts((prev) => [...prev, newContact]);
    setNewContactPerson("");
    setNewContactDesignation("");
    setNewContactEmail("");
    setNewContactMobile("");
  };

  const handleRemoveContact = (index: number) => {
    const item = editContacts[index];
    if (item?.id) {
      setDeletedContactIds((prev) => [...prev, item.id]);
    }
    setEditContacts((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (item?.is_primary && updated.length > 0) {
        updated[0] = { ...updated[0], is_primary: true };
      }
      return updated;
    });
  };

  const handleSetPrimaryContact = (index: number) => {
    setEditContacts((prev) =>
      prev.map((c, i) => ({
        ...c,
        is_primary: i === index,
      }))
    );
  };

  const handleAddAddress = () => {
    if (!newStreetAddress.trim() && !newCity.trim() && !newPinCode.trim()) {
      toast.error("Please provide street address, city, or PIN code.");
      return;
    }
    const newAddr: ClientAddress = {
      id: `addr-${Date.now()}`,
      client_id: clientId,
      address_type: (newAddressType === "Registration" ? "Registered" : newAddressType) as any,
      street_address: newStreetAddress.trim(),
      city: newCity.trim(),
      state: newState.trim(),
      pin_code: newPinCode.trim(),
      country: "India",
      is_primary: editAddresses.length === 0,
    };
    setEditAddresses((prev) => [...prev, newAddr]);
    setNewAddressType("Registered");
    setNewStreetAddress("");
    setNewCity("");
    setNewState("");
    setNewPinCode("");
  };

  const handleRemoveAddress = (index: number) => {
    const item = editAddresses[index];
    if (item?.id) {
      setDeletedAddressIds((prev) => [...prev, item.id]);
    }
    setEditAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddExtraReg = () => {
    if (!newExtraValue.trim()) {
      toast.error("Please enter registration / identifier number.");
      return;
    }
    setEditExtraRegs((prev) => [
      ...prev,
      {
        type: newExtraType.trim(),
        value: newExtraValue.trim(),
        date_of_registration: newExtraDate || undefined,
        status: "Active",
        remarks: newExtraRemarks.trim() || undefined,
      },
    ]);
    setNewExtraType("TAN");
    setNewExtraValue("");
    setNewExtraDate("");
    setNewExtraRemarks("");
  };

  const handleRemoveExtraReg = (index: number) => {
    setEditExtraRegs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddBankAccount = () => {
    if (!newBankName.trim() || !newAccountNumber.trim() || !newIfscCode.trim()) {
      toast.error("Bank name, account number, and IFSC code are required.");
      return;
    }
    const newBank: ClientBankAccount = {
      id: `bnk-${Date.now()}`,
      client_id: clientId,
      bank_name: newBankName.trim(),
      account_number: newAccountNumber.trim(),
      account_type: newAccountType,
      ifsc_code: newIfscCode.trim().toUpperCase(),
      branch_name: newBranchName.trim() || undefined,
      upi_id: newUpiId.trim() || undefined,
      is_primary: editBankAccounts.length === 0,
    };
    setEditBankAccounts((prev) => [...prev, newBank]);
    setNewBankName("");
    setNewAccountNumber("");
    setNewAccountType("Current");
    setNewIfscCode("");
    setNewBranchName("");
    setNewUpiId("");
  };

  const handleRemoveBankAccount = (index: number) => {
    const item = editBankAccounts[index];
    if (item?.id) {
      setDeletedBankAccountIds((prev) => [...prev, item.id]);
    }
    setEditBankAccounts((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (item?.is_primary && updated.length > 0) {
        updated[0] = { ...updated[0], is_primary: true };
      }
      return updated;
    });
  };

  const handleSetPrimaryBankAccount = (index: number) => {
    setEditBankAccounts((prev) =>
      prev.map((b, i) => ({
        ...b,
        is_primary: i === index,
      }))
    );
  };

  const handleSaveClientEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return;
    if (!editClientName.trim() || !editLegalName.trim()) {
      toast.error("Client Name and Legal Name are required.");
      return;
    }
    if (!editPan.trim()) {
      toast.error("PAN Card is a mandatory required field.");
      return;
    }

    setIsSavingClient(true);
    try {
      // 1. Delete removed items from Supabase
      for (const cid of deletedContactIds) {
        try { await pmsStore.deleteClientContact(client.id, cid); } catch {}
      }
      for (const aid of deletedAddressIds) {
        try { await pmsStore.deleteClientAddress(client.id, aid); } catch {}
      }
      for (const bid of deletedBankAccountIds) {
        try { await pmsStore.deleteClientBankAccount(client.id, bid); } catch {}
      }

      const rm = employees.find((e) => e.id === editRelationshipManagerId);

      const finalContacts = [...editContacts];
      if (newContactPerson.trim() || newContactMobile.trim() || newContactEmail.trim()) {
        finalContacts.push({
          id: `cnt-${Date.now()}`,
          client_id: client.id,
          contact_person: newContactPerson.trim() || editClientName,
          designation: newContactDesignation.trim() || undefined,
          mobile_number: newContactMobile.trim(),
          email: newContactEmail.trim(),
          is_primary: finalContacts.length === 0,
        });
      }

      const finalAddresses = [...editAddresses];
      if (newStreetAddress.trim() || newCity.trim() || newPinCode.trim()) {
        finalAddresses.push({
          id: `addr-${Date.now()}`,
          client_id: client.id,
          address_type: (newAddressType === "Registration" ? "Registered" : newAddressType) as any,
          street_address: newStreetAddress.trim(),
          city: newCity.trim(),
          state: newState.trim(),
          pin_code: newPinCode.trim(),
          country: "India",
          is_primary: finalAddresses.length === 0,
        });
      }

      const finalExtraRegs = [...editExtraRegs];
      if (newExtraType.trim() && newExtraValue.trim()) {
        finalExtraRegs.push({
          type: newExtraType.trim(),
          value: newExtraValue.trim(),
          date_of_registration: newExtraDate || undefined,
          status: "Active",
          remarks: newExtraRemarks.trim() || undefined,
        });
      }

      const finalBankAccounts = [...editBankAccounts];
      if (newBankName.trim() && newAccountNumber.trim() && newIfscCode.trim()) {
        finalBankAccounts.push({
          id: `bnk-${Date.now()}`,
          client_id: client.id,
          bank_name: newBankName.trim(),
          account_number: newAccountNumber.trim(),
          account_type: newAccountType,
          ifsc_code: newIfscCode.trim().toUpperCase(),
          branch_name: newBranchName.trim() || undefined,
          upi_id: newUpiId.trim() || undefined,
          is_primary: finalBankAccounts.length === 0,
        });
      }

      const updates: Partial<Client> = {
        client_name: editClientName.trim(),
        legal_name: editLegalName.trim(),
        nick_name: editNickName.trim() || undefined,
        folder_name:
          editFolderName.trim() ||
          (editNickName.trim()
            ? `${editNickName.trim()} ${client.client_code}`
            : `${editClientName.trim()} ${client.client_code}`),
        reference_name: editReferenceName.trim() || undefined,
        constitution: editConstitution,
        category: editCategory.trim() || undefined,
        nature_of_income: editNatureOfIncome.trim() || undefined,
        relationship_manager_id: editRelationshipManagerId || undefined,
        relationship_manager_name: rm?.full_name,
        status: editStatus,
        remarks: editRemarks.trim() || undefined,
        contact: finalContacts.find((c) => c.is_primary) || finalContacts[0],
        contacts: finalContacts,
        addresses: finalAddresses,
        registration: {
          id: client.registration?.id || `reg-${Date.now()}`,
          client_id: client.id,
          pan: editPan.trim().toUpperCase(),
          dob_or_doi: editDobOrDoi || undefined,
          gstin: editGstin.trim().toUpperCase() || undefined,
          cin: editCin.trim().toUpperCase() || undefined,
          additional_registrations: finalExtraRegs,
        },
        bank_accounts: finalBankAccounts,
      };

      await pmsStore.updateClient(client.id, updates);
      toast.success("Client profile updated successfully in Supabase.");
      setIsEditModalOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update client profile.");
    } finally {
      setIsSavingClient(false);
    }
  };

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setRefreshKey((k) => k + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const allServices = pmsStore.getServices();
  const allStoreProjects = pmsStore.getProjects();
  const allStoreTasks = pmsStore.getTasks();
  const allStoreEngagements = pmsStore.getAllEngagements();
  const clientEngagementsAll = pmsStore.getEngagementsByClientId(clientId);

  const rawClientProjects = allStoreProjects.filter((p) => p.client_id === clientId);
  const clientProjects = isEmployee
    ? rawClientProjects.filter((p) => isProjectAssignedToEmployee(p, empId, allStoreTasks))
    : rawClientProjects;
  const clientTasks = isEmployee
    ? allStoreTasks.filter(
        (t) =>
          clientProjects.some((p) => p.id === t.project_id) &&
          (clientProjects.some((p) => p.id === t.project_id && p.project_manager_id === empId) ||
            isTaskAssignedToEmployee(t, empId))
      )
    : allStoreTasks.filter((t) => clientProjects.some((p) => p.id === t.project_id));

  const assignedServiceNames = new Set(
    clientProjects.map((p) => p.service_name).filter((s): s is string => Boolean(s))
  );
  const assignedEngagementIds = new Set(
    clientProjects.map((p) => p.service_engagement_id).filter((id): id is string => Boolean(id))
  );
  const engagements = isEmployee
    ? clientEngagementsAll.filter(
        (e) =>
          assignedEngagementIds.has(e.id) ||
          (e.service_name ? assignedServiceNames.has(e.service_name) : false)
      )
    : clientEngagementsAll;

  const clientInvoices = isEmployee
    ? []
    : pmsStore.getInvoices().filter((i) => i.client_id === clientId);
  const clientPayments = isEmployee
    ? []
    : pmsStore.getPayments().filter((p) => p.client_id === clientId);

  const assignedClientIdSet = new Set([clientId]);
  const assignedProjectIdSet = new Set(clientProjects.map((p) => p.id));
  const assignedTaskIdSet = collectTaskIds(clientTasks);
  const clientDocuments = pmsStore.getDocuments().filter((d) => {
    if (!isEmployee) return d.entity_id === clientId;
    const entityId = d.entity_id || "";
    const linked =
      entityId === clientId ||
      assignedProjectIdSet.has(entityId) ||
      assignedTaskIdSet.has(entityId);
    return (
      linked &&
      isDocumentVisibleToEmployee(
        d,
        empId,
        assignedClientIdSet,
        assignedProjectIdSet,
        assignedTaskIdSet
      )
    );
  });

  // Quick Subscribe Service state
  const [selectedServiceId, setSelectedServiceId] = useState(allServices[0]?.id || "");
  const [agreedFee, setAgreedFee] = useState(allServices[0]?.default_fee || 0);
  const [billingFreq, setBillingFreq] = useState<any>("Monthly");

  if (!client) {
    return (
      <div className="text-center py-24 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>
        <p className="text-sm text-slate-500">The requested client ID does not exist in master records.</p>
        <Link to="/clients">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
    );
  }

  if (
    isEmployee &&
    !isClientAssignedToEmployee(
      client,
      empId,
      allStoreProjects,
      allStoreTasks,
      allStoreEngagements
    )
  ) {
    return (
      <div className="text-center py-24 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500">
          Employees can only view Client 360° accounts assigned to their projects or tasks.
        </p>
        <Link to="/clients">
          <Button variant="outline">Back to Assigned Clients</Button>
        </Link>
      </div>
    );
  }

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = allServices.find((s) => s.id === selectedServiceId);
    if (!service) return;

    const { project, tasks: createdTasks } = await pmsStore.addServiceEngagementCascade({
      client_id: client.id,
      client_name: client.client_name,
      service_id: service.id,
      service_name: service.service_name,
      service_code: service.service_code,
      agreed_fee: Number(agreedFee),
      gst_rate: service.default_gst_rate,
      billing_frequency: billingFreq,
      payment_terms: "15 Days Net",
      relationship_manager_id: client.relationship_manager_id,
      relationship_manager_name: client.relationship_manager_name,
      start_date: new Date().toISOString().slice(0, 10),
      status: "Active",
      remarks: "Subscribed via Client 360°",
    });

    toast.success(`Subscribed to ${service.service_name} — created ${project.project_code} & ${createdTasks.length} task(s).`);
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div className="flex items-start gap-4">
          <Link to="/clients">
            <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 mt-1">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {client.client_code}
              </span>
              <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                📁 {client.folder_name || (client.nick_name ? `${client.nick_name} ${client.client_code}` : client.client_code)}
              </span>
              <Badge variant="secondary" className="text-xs">
                {client.constitution}
              </Badge>
              <Badge
                variant={client.status === "Active" ? "success" : "secondary"}
                className="text-xs"
              >
                {client.status}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {client.client_name}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Legal: <span className="font-medium text-slate-700">{client.legal_name}</span> &bull; RM:{" "}
              <span className="font-medium text-slate-700">{client.relationship_manager_name || "Unassigned"}</span> &bull; Onboarded: {formatDate(client.created_at)}
            </p>
          </div>
        </div>

        {isEmployee ? (
          <Badge
            variant="outline"
            className="h-9 px-3.5 rounded-2xl text-xs font-bold bg-amber-50 text-amber-800 border-amber-300 self-start sm:self-auto"
          >
            View-Only Mode
          </Badge>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => handleOpenEditModal("basic")}
              className="bg-neutral-900 hover:bg-black text-white gap-1.5 shadow-xs font-semibold"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit Profile</span>
            </Button>
            <Link to={`/invoices/new?clientId=${client.id}`}>
              <Button size="sm" variant="outline" className="border-slate-300 gap-1.5 shadow-xs">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span>Raise Invoice</span>
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                if (
                  !window.confirm(
                    `Delete client "${client.client_name}" along with all linked engagements, projects & tasks?`
                  )
                ) {
                  return;
                }
                try {
                  await pmsStore.deleteClient(client.id);
                  toast.success(`Deleted client "${client.client_name}".`);
                  navigate("/clients");
                } catch (err: any) {
                  toast.error(err?.message || "Failed to delete client from database.");
                }
              }}
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 gap-1.5 shadow-xs"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Client</span>
            </Button>
          </div>
        )}
      </div>

      {/* ALL MANDATORY TABS (Financial / Admin-only tabs hidden in Employee View-Only Mode) */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">1. Overview</TabsTrigger>
          <TabsTrigger value="client-details">2. Client Details</TabsTrigger>
          <TabsTrigger value="contact-info">3. Contact Information</TabsTrigger>
          <TabsTrigger value="registrations">4. Registrations</TabsTrigger>
          <TabsTrigger value="services">5. Subscribed Services ({engagements.length})</TabsTrigger>
          <TabsTrigger value="projects">6. Projects ({clientProjects.length})</TabsTrigger>
          <TabsTrigger value="tasks">7. Tasks ({clientTasks.length})</TabsTrigger>
          <TabsTrigger value="workflow">8. Workflow</TabsTrigger>
          {!isEmployee && (
            <>
              <TabsTrigger value="finance">9. Finance & Payments</TabsTrigger>
              <TabsTrigger value="invoices">10. Invoices ({clientInvoices.length})</TabsTrigger>
            </>
          )}
          <TabsTrigger value="documents">
            {isEmployee ? `9. Documents (${clientDocuments.length})` : `11. Documents (${clientDocuments.length})`}
          </TabsTrigger>
          {!isEmployee && <TabsTrigger value="activity">12. Activity History</TabsTrigger>}
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main KPI Statistics */}
          <div className={`grid grid-cols-1 ${isEmployee ? "sm:grid-cols-2" : "sm:grid-cols-3"} gap-4`}>
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500">
                  {isEmployee ? "Assigned services" : "Active services"}
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {isEmployee ? engagements.length : client.active_services_count || engagements.length}
                </div>
                <span className="text-[11px] text-slate-500">Contracted engagements</span>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500">
                  Projects
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {clientProjects.length}
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({clientProjects.filter(p => p.status === "Completed").length} done)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">{clientTasks.filter(t => t.status !== "Completed").length} pending tasks</span>
              </CardContent>
            </Card>

            {!isEmployee && (
              <Card className="border-l-4 border-l-amber-500">
                <CardContent className="p-4">
                  <span className="text-xs font-semibold text-slate-500">Outstanding balance</span>
                  <div className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(client.outstanding_amount || 0)}</div>
                  <span className="text-[11px] text-amber-700 font-medium">Pending collection</span>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Profile Summary Card */}
            <Card className="lg:col-span-2 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Client Profile Snapshot
                </CardTitle>
                {!isEmployee && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal("basic")}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    <span>Edit</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Category / Sector</span>
                  <p className="text-slate-800 text-sm mt-0.5">{client.category || "General Services"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Nature of Income</span>
                  <p className="text-slate-800 text-sm mt-0.5">{client.nature_of_income || "Business Income"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Permanent Account Number (PAN)</span>
                  <p className="font-mono text-slate-800 text-sm font-semibold mt-0.5">{client.registration?.pan || "—"}</p>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">DOI</span>
                  <p className="text-slate-800 text-sm font-semibold mt-0.5">{client.registration?.dob_or_doi ? formatDate(client.registration.dob_or_doi) : "—"}</p>
                </div>
                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-500 block">Internal Instructions & Remarks</span>
                  <p className="text-slate-700 text-xs mt-1 leading-relaxed">{client.remarks || "No specific instructions recorded."}</p>
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Upcoming Compliance Due Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {clientProjects.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No active project deadlines.</p>
                ) : (
                  clientProjects.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-slate-800">{p.project_name}</span>
                        <Badge variant="outline" className="text-[10px]">{p.priority}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" />
                        <span>Due: {formatDate(p.due_date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 2. CLIENT DETAILS TAB */}
        <TabsContent value="client-details">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">
                Section A — Basic Master Information
              </CardTitle>
              {!isEmployee && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEditModal("basic")}
                  className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5 text-slate-500" />
                  <span>Edit Basic Info</span>
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Client ID</span>
                <span className="font-mono font-bold text-blue-700 text-sm mt-0.5 block">{client.client_code}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Trade / Client Name</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.client_name}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Legal Registered Name</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.legal_name}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Nick Name</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.nick_name || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Folder Name</span>
                <span className="font-mono font-semibold text-slate-900 text-sm mt-0.5 block">
                  {client.folder_name || (client.nick_name ? `${client.nick_name} ${client.client_code}` : "—")}
                </span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Reference Name</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.reference_name || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Constitution</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.constitution}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Category / Sector</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.category || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Nature of Income</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.nature_of_income || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Relationship Manager</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{client.relationship_manager_name || "Unassigned"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 block">Onboarding Date</span>
                <span className="text-slate-800 text-sm mt-0.5 block">{formatDate(client.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CONTACT INFORMATION TAB */}
        <TabsContent value="contact-info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Contact Persons
                </CardTitle>
                {!isEmployee && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal("contacts")}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    <span>Manage Contacts</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm">
                {(client.contacts && client.contacts.length > 0
                  ? client.contacts
                  : client.contact
                  ? [client.contact]
                  : [
                      {
                        id: "fallback",
                        client_id: client.id,
                        contact_person: client.client_name,
                        designation: "Authorized Signatory",
                        mobile_number: "—",
                        email: "—",
                        is_primary: true,
                      },
                    ]
                ).map((c, idx) => (
                  <div
                    key={c.id || idx}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900">
                        {c.contact_person || client.client_name}{" "}
                        {c.designation ? `(${c.designation})` : ""}
                      </span>
                      <Badge
                        variant={c.is_primary || idx === 0 ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {c.is_primary || idx === 0 ? "Primary" : `Contact ${idx + 1}`}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Mobile Number
                        </span>
                        <span className="font-mono">{c.mobile_number || "—"}</span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                          Official Email
                        </span>
                        <span>{c.email || "—"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Registered & Communication Addresses
                </CardTitle>
                {!isEmployee && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal("addresses")}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    <span>Manage Addresses</span>
                  </Button>
                )}
              </CardHeader>
              <CardContent className="p-6 space-y-4 text-sm">
                {client.addresses?.map((addr, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                    <Badge variant="outline" className="text-[10px] mb-1 font-semibold">{addr.address_type} Address</Badge>
                    <p className="text-xs text-slate-700 leading-relaxed">{addr.street_address}</p>
                    <p className="text-xs font-medium text-slate-900 mt-1">
                      {addr.city}, {addr.state} - {addr.pin_code}, {addr.country}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 4. REGISTRATIONS TAB */}
        <TabsContent value="registrations">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-900">
                Section C — Statutory Registration Identifiers & Banking
              </CardTitle>
              {!isEmployee && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal("registrations")}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" />
                    <span>Edit Registrations</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEditModal("banking")}
                    className="h-8 px-2.5 text-xs text-slate-600 hover:text-slate-900 gap-1.5"
                  >
                    <Landmark className="h-3.5 w-3.5 text-slate-500" />
                    <span>Edit Bank Accounts</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block uppercase">PAN</span>
                <span className="font-mono font-bold text-slate-900 text-base">{client.registration?.pan || "—"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block uppercase">GSTIN</span>
                <span className="font-mono font-bold text-slate-900 text-base">{client.registration?.gstin || "Not Registered"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block uppercase">CIN / LLPIN</span>
                <span className="font-mono font-bold text-slate-900 text-base">{client.registration?.cin || "—"}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-500 block uppercase">DOB / DOI</span>
                <span className="font-medium text-slate-900 text-base">{formatDate(client.registration?.dob_or_doi)}</span>
              </div>

              {client.registration?.additional_registrations && client.registration.additional_registrations.length > 0 && (
                <div className="col-span-full pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase mb-3">
                    Additional Statutory Identifiers
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {client.registration.additional_registrations.map((r, i) => (
                      <div
                        key={i}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{r.type}</span>
                            <span className="font-mono font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded">
                              {r.value}
                            </span>
                          </div>
                          <Badge
                            className={
                              r.status === "Inactive"
                                ? "bg-slate-200 text-slate-700 text-[10px]"
                                : "bg-emerald-100 text-emerald-700 text-[10px]"
                            }
                          >
                            {r.status || "Active"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600">
                          {r.date_of_registration && (
                            <span>Reg Date: {formatDate(r.date_of_registration)}</span>
                          )}
                          {r.remarks && <span>Remarks: {r.remarks}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {client.bank_accounts && client.bank_accounts.length > 0 && (
                <div className="col-span-full pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Landmark className="h-4 w-4 text-blue-600" />
                    <h4 className="text-xs font-semibold text-slate-700 uppercase">
                      Bank Account Details ({client.bank_accounts.length})
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {client.bank_accounts.map((acc, i) => (
                      <div
                        key={acc.id || i}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{acc.bank_name}</span>
                            {acc.is_primary && (
                              <Badge className="bg-blue-100 text-blue-800 text-[10px]">Primary</Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {acc.account_type || "Current"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-slate-600">
                          <div>
                            <span className="text-[11px] text-slate-400 block">Account Number</span>
                            <span className="font-mono font-semibold text-slate-900">{acc.account_number}</span>
                          </div>
                          <div>
                            <span className="text-[11px] text-slate-400 block">IFSC Code</span>
                            <span className="font-mono font-semibold text-blue-700">{acc.ifsc_code}</span>
                          </div>
                          {acc.account_holder_name && (
                            <div className="col-span-2">
                              <span className="text-[11px] text-slate-400 block">Account Holder</span>
                              <span className="font-medium text-slate-800">{acc.account_holder_name}</span>
                            </div>
                          )}
                          {acc.branch_name && (
                            <div>
                              <span className="text-[11px] text-slate-400 block">Branch</span>
                              <span className="text-slate-800">{acc.branch_name}</span>
                            </div>
                          )}
                          {acc.upi_id && (
                            <div>
                              <span className="text-[11px] text-slate-400 block">UPI / VPA</span>
                              <span className="font-mono text-emerald-700">{acc.upi_id}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5. SUBSCRIBED SERVICES TAB */}
        <TabsContent value="services" className="space-y-6">
          {/* Subscribe New Service Box (Admin Only) */}
          {!isEmployee && (
            <Card className="shadow-xs border-dashed border-2 border-blue-200 bg-blue-50/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-blue-950 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-blue-600" />
                  Subscribe Additional Service to Client
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Select Service from Catalog</label>
                    <select
                      value={selectedServiceId}
                      onChange={(e) => {
                        setSelectedServiceId(e.target.value);
                        const s = allServices.find((srv) => srv.id === e.target.value);
                        if (s) setAgreedFee(s.default_fee);
                      }}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-none"
                    >
                      {allServices.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.service_name} ({srv.service_code}) — Default: ₹{srv.default_fee}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Agreed Fee (₹)</label>
                    <input
                      type="number"
                      value={agreedFee}
                      onChange={(e) => setAgreedFee(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                      required
                    />
                  </div>
                  <div>
                    <Button type="submit" size="sm" className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white">
                      Assign Engagement
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Box Grid of Contracted Services */}
          <Card className="shadow-xs">
            <CardContent className="p-5">
              {engagements.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No services contracted for this client yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {engagements.map((eng) => (
                    <div key={eng.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {eng.service_code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-[10px]">{eng.billing_frequency}</Badge>
                          <Badge variant="success" className="text-[10px]">{eng.status}</Badge>
                          {!isEmployee && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    `Remove subscribed service "${eng.service_name}" and its linked project/tasks from ${client.client_name}?`
                                  )
                                ) {
                                  return;
                                }
                                try {
                                  await pmsStore.deleteServiceEngagement(eng.id);
                                  toast.success(`Removed service "${eng.service_name}".`);
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to delete engagement from database.");
                                }
                              }}
                              className="p-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                              title="Delete Service Subscription"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{eng.service_name}</h4>
                      <div className={`grid ${isEmployee ? "grid-cols-2" : "grid-cols-3"} gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5`}>
                        {!isEmployee && (
                          <div>
                            <span className="text-[10px] text-slate-500 font-medium block">Agreed fees</span>
                            <span className="font-bold text-slate-900">{formatCurrency(eng.agreed_fee)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block">Start date</span>
                          <span className="font-semibold text-slate-800">{formatDate(eng.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            {isEmployee ? "Frequency" : "Payment terms"}
                          </span>
                          <span className="font-semibold text-slate-800 truncate block">
                            {isEmployee ? eng.billing_frequency : eng.payment_terms || "15 Days Net"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. PROJECTS TAB */}
        <TabsContent value="projects">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Client Projects ({clientProjects.length})</CardTitle>
              {!isEmployee && (
                <Link to={`/projects/new?clientId=${client.id}`}>
                  <Button size="sm" className="bg-blue-600 text-white gap-1">
                    <Plus className="h-3.5 w-3.5" /> New Project
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {clientProjects.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No projects linked yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientProjects.map((p) => (
                    <div key={p.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {p.project_code}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={p.priority === "Urgent" ? "destructive" : "warning"} className="text-[10px]">{p.priority}</Badge>
                          <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900">{p.project_name}</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">
                            {formatDate(p.start_date)} → {formatDate(p.due_date)}
                          </span>
                          <span className="font-bold">{p.progress_percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${p.progress_percentage}%` }} />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {(p.tasks || []).length} Task(s)
                        </span>
                        <Link to={`/projects/${p.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-300 font-bold">
                            Open Workspace
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. TASKS TAB */}
        <TabsContent value="tasks" className="space-y-5">
          {clientTasks.length > 0 && (
            <ProjectTimeline
              tasks={clientTasks}
              onSelectTask={(tid) => {
                setActiveTaskId(tid);
                setIsTaskDetailOpen(true);
              }}
              title="Client Delivery Timeline (Tasks & Subtasks)"
            />
          )}

          <Card className="shadow-xs">
            <CardContent className="p-5">
              {clientTasks.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No tasks created yet for this client.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientTasks.map((t) => {
                    const subtasks = t.subtasks || [];
                    const doneSubs = subtasks.filter((s) => s.status === "Completed").length;
                    return (
                      <div key={t.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs text-blue-700 font-bold bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                            {t.task_code}
                          </span>
                          {isEmployee ? (
                            <Badge variant="outline" className="text-[11px] font-bold text-slate-800 border-slate-300 bg-slate-50">
                              {t.status}
                            </Badge>
                          ) : (
                            <select
                              value={t.status}
                              onChange={async (e) => {
                                const newStatus = e.target.value as TaskStatus;
                                try {
                                  await pmsStore.updateTaskStatus(t.id, newStatus);
                                  toast.success(`Status updated to ${newStatus}`);
                                } catch (err: any) {
                                  toast.error(err?.message || "Failed to update task status in database.");
                                }
                              }}
                              className="h-7 rounded-lg border border-slate-300 bg-white px-2 text-[11px] font-bold text-slate-800"
                            >
                              {pmsStore.getTaskStatusNames().map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTaskId(t.id);
                            setIsTaskDetailOpen(true);
                          }}
                          className="text-left block w-full group"
                        >
                          <h4 className="font-bold text-sm text-slate-900 group-hover:text-violet-700">{t.title}</h4>
                        </button>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                          <span className="inline-flex items-center gap-1">
                            <ListChecks className="h-3.5 w-3.5 text-violet-600" />
                            Subtasks: <strong>{doneSubs}/{subtasks.length}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5 text-sky-600" />
                            Comments: <strong>{t.comments_count || 0}</strong>
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 gap-2">
                          <span>
                            {formatDate(t.start_date || t.created_at)} → {formatDate(t.due_date)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveTaskId(t.id);
                                setIsTaskDetailOpen(true);
                              }}
                              className="h-7 text-[11px] font-bold border-slate-300"
                            >
                              Subtasks & Comments
                            </Button>
                            {!isEmployee && (
                              <Button
                                type="button"
                                size="icon"
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    await pmsStore.deleteTask(t.id);
                                    toast.success(`Deleted task ${t.task_code}`);
                                  } catch (err: any) {
                                    toast.error(err?.message || "Failed to delete task from database.");
                                  }
                                }}
                                className="h-7 w-7 rounded-lg border-rose-300 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                title="Delete Task"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8. WORKFLOW TAB */}
        <TabsContent value="workflow">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Attached Compliance Workflows
              </CardTitle>
              <CardDescription className="text-xs">
                Real workflow templates linked to this client&apos;s subscribed services
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {(() => {
                const subscribedServiceIds = new Set(engagements.map((e) => e.service_id));
                const clientWorkflows = pmsStore
                  .getWorkflows()
                  .filter((w) => w.is_active && (!w.service_id || subscribedServiceIds.has(w.service_id)));

                if (clientWorkflows.length === 0) {
                  return (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-xs text-slate-500">
                      No custom workflow templates configured yet for this client&apos;s contracted services.
                    </div>
                  );
                }

                return clientWorkflows.map((wf) => {
                  const templateTasks = wf.template_tasks || [];
                  const stages = wf.versions?.[0]?.stages || [];
                  return (
                    <div key={wf.id} className="p-4 bg-slate-50 rounded-2xl border-[1.5px] border-slate-300 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-4 w-4 text-violet-600" />
                          <h4 className="font-bold text-slate-900 text-sm">
                            {wf.workflow_name} (v{wf.version})
                          </h4>
                          {wf.service_name && (
                            <Badge variant="outline" className="text-[10px]">
                              {wf.service_name}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="success">Active</Badge>
                      </div>
                      {templateTasks.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                          {templateTasks.map((tt, idx) => (
                            <div
                              key={tt.id}
                              className="p-3 bg-white border-[1.5px] border-slate-300 rounded-xl space-y-1.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-slate-900 truncate">
                                  {idx + 1}. {tt.task_name}
                                </span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  Day {tt.start_day_offset + 1} · {tt.duration_days}d
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500">
                                <span>{tt.subtasks.length} Subtasks</span>
                                <span>{tt.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        stages.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {stages.map((st, idx) => (
                              <div key={st.id} className="p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-800">
                                {idx + 1}. {st.stage_name}
                              </div>
                            ))}
                          </div>
                        )
                      )}
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. FINANCE & PAYMENTS TAB (Admin Only) */}
        {!isEmployee && (
          <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Invoiced</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(client.total_invoiced_amount || 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-600">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Collected</span>
                <div className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(client.total_payments_received || 0)}</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Remaining Balance</span>
                <div className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(client.outstanding_amount || 0)}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Payment Receipts & Remittances ({clientPayments.length})</CardTitle>
              <Link to={`/finance?action=record&clientId=${client.id}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" /> Record Payment
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {clientPayments.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No payments recorded for this client yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientPayments.map((pay) => (
                    <div key={pay.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-2.5 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                          {pay.payment_number}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{pay.payment_mode}</Badge>
                          <Badge variant="success" className="text-[10px]">{pay.status}</Badge>
                        </div>
                      </div>
                      <div className="text-lg font-extrabold text-slate-900">{formatCurrency(pay.amount)}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Date</span>
                          <span className="font-semibold text-slate-800">{formatDate(pay.payment_date)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Txn Ref</span>
                          <span className="font-mono font-semibold text-slate-800 truncate block">{pay.transaction_reference || "—"}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500">Received by {pay.received_by_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}

        {/* 10. INVOICES TAB (Admin Only) */}
        {!isEmployee && (
          <TabsContent value="invoices">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Client Tax Invoices ({clientInvoices.length})</CardTitle>
              <Link to={`/invoices/new?clientId=${client.id}`}>
                <Button size="sm" className="bg-blue-600 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" /> Generate Invoice
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-5">
              {clientInvoices.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No invoices generated yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientInvoices.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {inv.invoice_number}
                        </span>
                        <Badge variant={inv.status === "Paid" ? "success" : "warning"} className="text-[10px]">{inv.status}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Total</span>
                          <span className="font-bold text-slate-900">{formatCurrency(inv.grand_total)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Paid</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(inv.paid_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Balance</span>
                          <span className="font-bold text-amber-700">{formatCurrency(inv.outstanding_balance)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200">
                        <span className="text-slate-500">Due {formatDate(inv.due_date)}</span>
                        <Link to={`/invoices/${inv.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs border-slate-300">View / PDF</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}

        {/* 11. DOCUMENTS TAB (Cloudflare R2) */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Client Cloudflare R2 Documents</CardTitle>
                <CardDescription className="text-xs">Secure private bucket storage with presigned link access</CardDescription>
              </div>
              {!isEmployee && (
                <Link to={`/documents?clientId=${client.id}&upload=true`}>
                  <Button size="sm" className="bg-blue-600 text-white gap-1.5">
                    <UploadCloud className="h-4 w-4" /> Upload Document
                  </Button>
                </Link>
              )}
            </CardHeader>
            <CardContent className="p-5">
              {clientDocuments.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No documents uploaded for this client yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {clientDocuments.map((doc) => (
                    <div key={doc.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="secondary" className="text-[10px]">{doc.category}</Badge>
                        <span className="font-mono text-[11px] font-bold bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">v{doc.version_number}</span>
                      </div>
                      <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="truncate">{doc.file_name}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                        <span>{formatBytes(doc.file_size)} &bull; {formatDate(doc.created_at)}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.success(`Simulating presigned Cloudflare R2 download for ${doc.file_name}`)}
                          className="h-7 gap-1 text-xs border-slate-300"
                        >
                          <Download className="h-3.5 w-3.5" /> Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. ACTIVITY HISTORY TAB (Admin Only) */}
        {!isEmployee && (
          <TabsContent value="activity">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-200 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    Audit Trail & Historic Activity
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Click any activity record to view its full audit details and captured metadata.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Master Onboarding Event */}
                  <div
                    onClick={() => {
                      setSelectedAuditLog({
                        id: `onboard-${client.id}`,
                        title: "Client Onboarded & Master Record Created",
                        type: "Master Onboarding",
                        actor: client.relationship_manager_name || "System Admin",
                        timestamp: client.created_at,
                        description: `Initial client entity master record established in Supabase PostgreSQL for ${client.client_name}.`,
                        details: {
                          "Client ID": client.client_code,
                          "Trade Name": client.client_name,
                          "Legal Registered Name": client.legal_name,
                          "Nick Name": client.nick_name || "—",
                          "Folder Name": client.folder_name || (client.nick_name ? `${client.nick_name} ${client.client_code}` : "—"),
                          "Constitution": client.constitution,
                          "Category": client.category || "—",
                          "PAN": client.registration?.pan || "—",
                          "DOI": client.registration?.dob_or_doi ? formatDate(client.registration.dob_or_doi) : "—",
                          "Relationship Manager": client.relationship_manager_name || "Unassigned",
                          "Status": client.status,
                        },
                      });
                      setIsAuditModalOpen(true);
                    }}
                    className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 flex items-start justify-between gap-3 text-xs cursor-pointer hover:border-blue-500 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                          Client Onboarded & Master Record Created
                        </span>
                        <p className="text-slate-500 text-[11px] mt-0.5">By {client.relationship_manager_name || "Admin"}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(client.created_at)}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0 group-hover:border-blue-300">Inspect</Badge>
                  </div>

                  {/* Invoices Audit Events */}
                  {clientInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      onClick={() => {
                        setSelectedAuditLog({
                          id: inv.id,
                          title: `Invoice ${inv.invoice_number} Raised`,
                          type: "Billing & Invoicing",
                          actor: inv.created_by_name || client.relationship_manager_name || "Finance Admin",
                          timestamp: inv.created_at,
                          description: `Tax invoice ${inv.invoice_number} issued with status "${inv.status}".`,
                          details: {
                            "Invoice Number": inv.invoice_number,
                            "Invoice Date": formatDate(inv.invoice_date),
                            "Due Date": formatDate(inv.due_date),
                            "Subtotal": formatCurrency(inv.subtotal),
                            "Total Tax / GST": formatCurrency(inv.total_gst || 0),
                            "Grand Total": formatCurrency(inv.grand_total),
                            "Status": inv.status,
                            "Place of Supply": inv.place_of_supply,
                            "Payment Terms": inv.terms_label || "15 Days Net",
                          },
                        });
                        setIsAuditModalOpen(true);
                      }}
                      className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 flex items-start justify-between gap-3 text-xs cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            Invoice {inv.invoice_number} Raised for {formatCurrency(inv.grand_total)}
                          </span>
                          <p className="text-slate-500 text-[11px] mt-0.5">Place of supply: {inv.place_of_supply}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(inv.created_at)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 group-hover:border-emerald-300">Inspect</Badge>
                    </div>
                  ))}

                  {/* Service Engagement Events */}
                  {engagements.map((eng) => (
                    <div
                      key={eng.id}
                      onClick={() => {
                        setSelectedAuditLog({
                          id: eng.id,
                          title: `Service Engagement: ${eng.service_name}`,
                          type: "Retainer Service",
                          actor: eng.relationship_manager_name || client.relationship_manager_name || "Admin",
                          timestamp: eng.created_at || client.created_at,
                          description: `Subscribed client to service catalog engagement: ${eng.service_name}.`,
                          details: {
                            "Service Name": eng.service_name,
                            "Service Code": eng.service_code,
                            "Agreed Fee": formatCurrency(eng.agreed_fee),
                            "Billing Frequency": eng.billing_frequency,
                            "Payment Terms": eng.payment_terms || "15 Days Net",
                            "Start Date": formatDate(eng.start_date),
                            "End Date": eng.end_date ? formatDate(eng.end_date) : "Ongoing",
                            "Status": eng.status,
                          },
                        });
                        setIsAuditModalOpen(true);
                      }}
                      className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 flex items-start justify-between gap-3 text-xs cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-indigo-600 mt-1 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                            Subscribed to {eng.service_name}
                          </span>
                          <p className="text-slate-500 text-[11px] mt-0.5">Agreed fee: {formatCurrency(eng.agreed_fee)} • {eng.billing_frequency}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(eng.created_at || client.created_at)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 group-hover:border-indigo-300">Inspect</Badge>
                    </div>
                  ))}

                  {/* Project Events */}
                  {clientProjects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => {
                        setSelectedAuditLog({
                          id: proj.id,
                          title: `Project Created: ${proj.project_name}`,
                          type: "Project Lifecycle",
                          actor: client.relationship_manager_name || "Admin",
                          timestamp: proj.created_at || client.created_at,
                          description: `Operational deliverable project initiated under code ${proj.project_code}.`,
                          details: {
                            "Project Code": proj.project_code,
                            "Project Name": proj.project_name,
                            "Status": proj.status,
                            "Priority": proj.priority,
                            "Start Date": formatDate(proj.start_date),
                            "Due Date": formatDate(proj.due_date),
                          },
                        });
                        setIsAuditModalOpen(true);
                      }}
                      className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 flex items-start justify-between gap-3 text-xs cursor-pointer hover:border-purple-500 hover:shadow-md transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-purple-600 mt-1 shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                            Project Initiated: {proj.project_name} ({proj.project_code})
                          </span>
                          <p className="text-slate-500 text-[11px] mt-0.5">Priority: {proj.priority} • Due: {formatDate(proj.due_date)}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(proj.created_at || client.created_at)}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 group-hover:border-purple-300">Inspect</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Client Profile Modal Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded border border-blue-200">
                {client.client_code}
              </span>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Edit Client Profile — {client.client_name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Modify master business information, contact persons, multi-location addresses, statutory registration identifiers, and banking details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveClientEdit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <Tabs value={editTab} onValueChange={setEditTab} className="flex-1 flex flex-col min-h-0">
              <div className="px-6 pt-3 border-b border-slate-100 shrink-0">
                <TabsList className="grid grid-cols-5 h-9 bg-slate-100/90 text-xs">
                  <TabsTrigger value="basic" className="text-xs font-medium">1. Master Info</TabsTrigger>
                  <TabsTrigger value="contacts" className="text-xs font-medium">
                    2. Contacts ({editContacts.length})
                  </TabsTrigger>
                  <TabsTrigger value="addresses" className="text-xs font-medium">
                    3. Addresses ({editAddresses.length})
                  </TabsTrigger>
                  <TabsTrigger value="registrations" className="text-xs font-medium">4. Registrations</TabsTrigger>
                  <TabsTrigger value="banking" className="text-xs font-medium">
                    5. Bank ({editBankAccounts.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* TAB 1: MASTER INFO */}
                <TabsContent value="basic" className="m-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Client / Trade Name *</Label>
                      <Input
                        value={editClientName}
                        onChange={(e) => setEditClientName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="text-sm h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Legal Registered Name *</Label>
                      <Input
                        value={editLegalName}
                        onChange={(e) => setEditLegalName(e.target.value)}
                        placeholder="e.g. Acme Technologies Private Limited"
                        className="text-sm h-9"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Nick Name</Label>
                      <Input
                        value={editNickName}
                        onChange={(e) => setEditNickName(e.target.value)}
                        placeholder="e.g. Acme"
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Folder Name</Label>
                      <Input
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        placeholder="Auto-generated if blank"
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Reference Name</Label>
                      <Input
                        value={editReferenceName}
                        onChange={(e) => setEditReferenceName(e.target.value)}
                        placeholder="e.g. Referred by Partner"
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Constitution / Entity Type *</Label>
                      <Select value={editConstitution} onValueChange={(val: ClientConstitution) => setEditConstitution(val)}>
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select constitution" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Proprietorship">Proprietorship</SelectItem>
                          <SelectItem value="Partnership">Partnership</SelectItem>
                          <SelectItem value="LLP">Limited Liability Partnership (LLP)</SelectItem>
                          <SelectItem value="Private Limited">Private Limited Company</SelectItem>
                          <SelectItem value="Public Limited">Public Limited Company</SelectItem>
                          <SelectItem value="Trust">Trust</SelectItem>
                          <SelectItem value="Society">Society</SelectItem>
                          <SelectItem value="HUF">Hindu Undivided Family (HUF)</SelectItem>
                          <SelectItem value="Individual">Individual</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Category / Sector</Label>
                      <Input
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        placeholder="e.g. Information Technology"
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Nature of Income</Label>
                      <Input
                        value={editNatureOfIncome}
                        onChange={(e) => setEditNatureOfIncome(e.target.value)}
                        placeholder="e.g. Profits and Gains from Business"
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Relationship Manager</Label>
                      <Select value={editRelationshipManagerId} onValueChange={setEditRelationshipManagerId}>
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select relationship manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {employees.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.full_name} ({emp.designation_name || "Staff"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Status</Label>
                      <Select value={editStatus} onValueChange={(val: ClientStatus) => setEditStatus(val)}>
                        <SelectTrigger className="text-sm h-9">
                          <SelectValue placeholder="Select client status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-xs font-semibold text-slate-700">Internal Instructions & Remarks</Label>
                    <Textarea
                      value={editRemarks}
                      onChange={(e) => setEditRemarks(e.target.value)}
                      placeholder="Special client preferences, billing notes, or workflow instructions..."
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </TabsContent>

                {/* TAB 2: CONTACTS */}
                <TabsContent value="contacts" className="m-0 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Existing Contacts ({editContacts.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">First contact or designated contact will be Primary</span>
                    </div>

                    {editContacts.length === 0 ? (
                      <div className="p-4 text-center border border-dashed rounded-lg text-slate-500 text-xs">
                        No contacts listed. Add a contact person below.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {editContacts.map((cnt, idx) => (
                          <div
                            key={cnt.id || idx}
                            className={`p-3 rounded-lg border text-xs space-y-2 relative transition-colors ${
                              cnt.is_primary ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 block">{cnt.contact_person}</span>
                                {cnt.designation && (
                                  <span className="text-[11px] text-slate-500">{cnt.designation}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                {cnt.is_primary ? (
                                  <Badge className="bg-blue-600 text-white text-[10px]">Primary</Badge>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetPrimaryContact(idx)}
                                    className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-blue-600"
                                  >
                                    Set Primary
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveContact(idx)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-0.5 text-slate-600 text-[11px]">
                              {cnt.email && <div>✉ {cnt.email}</div>}
                              {cnt.mobile_number && <div>📱 {cnt.mobile_number}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Contact Form */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-blue-600" />
                      Add Contact Person
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Contact Person Name</Label>
                        <Input
                          value={newContactPerson}
                          onChange={(e) => setNewContactPerson(e.target.value)}
                          placeholder="e.g. John Doe"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Designation</Label>
                        <Input
                          value={newContactDesignation}
                          onChange={(e) => setNewContactDesignation(e.target.value)}
                          placeholder="e.g. Director / CFO"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Official Email</Label>
                        <Input
                          type="email"
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          placeholder="john@example.com"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Mobile Number</Label>
                        <Input
                          value={newContactMobile}
                          onChange={(e) => setNewContactMobile(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddContact}
                      className="bg-slate-900 text-white text-xs h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Contacts List
                    </Button>
                  </div>
                </TabsContent>

                {/* TAB 3: ADDRESSES */}
                <TabsContent value="addresses" className="m-0 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Saved Addresses ({editAddresses.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">Registered, Communication, or Branch locations</span>
                    </div>

                    {editAddresses.length === 0 ? (
                      <div className="p-4 text-center border border-dashed rounded-lg text-slate-500 text-xs">
                        No addresses registered. Add an address below.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {editAddresses.map((addr, idx) => (
                          <div
                            key={addr.id || idx}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2 relative"
                          >
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {addr.address_type} Address
                              </Badge>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveAddress(idx)}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <p className="text-slate-800 text-xs leading-relaxed">{addr.street_address}</p>
                            <p className="text-[11px] font-medium text-slate-600">
                              {addr.city}, {addr.state} - {addr.pin_code}, {addr.country || "India"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Address Form */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Plus className="h-4 w-4 text-blue-600" />
                      Add New Address
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Address Type</Label>
                        <Select value={newAddressType} onValueChange={setNewAddressType}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Registered">Registered</SelectItem>
                            <SelectItem value="Communication">Communication</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="text-[11px] font-medium text-slate-600">Street / Office Address</Label>
                        <Input
                          value={newStreetAddress}
                          onChange={(e) => setNewStreetAddress(e.target.value)}
                          placeholder="e.g. Plot No. 12, Cyber Gateway, Hitech City"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">City</Label>
                        <Input
                          value={newCity}
                          onChange={(e) => setNewCity(e.target.value)}
                          placeholder="e.g. Hyderabad"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">State</Label>
                        <Input
                          value={newState}
                          onChange={(e) => setNewState(e.target.value)}
                          placeholder="e.g. Telangana"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">PIN Code</Label>
                        <Input
                          value={newPinCode}
                          onChange={(e) => setNewPinCode(e.target.value)}
                          placeholder="e.g. 500081"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddAddress}
                      className="bg-slate-900 text-white text-xs h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Addresses List
                    </Button>
                  </div>
                </TabsContent>

                {/* TAB 4: REGISTRATIONS */}
                <TabsContent value="registrations" className="m-0 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">PAN Card *</Label>
                      <Input
                        value={editPan}
                        onChange={(e) => setEditPan(e.target.value.toUpperCase())}
                        placeholder="ABCDE1234F"
                        className="text-sm h-9 font-mono uppercase"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Date of Incorp / Birth (DOI)</Label>
                      <Input
                        type="date"
                        value={editDobOrDoi}
                        onChange={(e) => setEditDobOrDoi(e.target.value)}
                        className="text-sm h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">GSTIN</Label>
                      <Input
                        value={editGstin}
                        onChange={(e) => setEditGstin(e.target.value.toUpperCase())}
                        placeholder="36ABCDE1234F1Z5"
                        className="text-sm h-9 font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">CIN / LLPIN</Label>
                      <Input
                        value={editCin}
                        onChange={(e) => setEditCin(e.target.value.toUpperCase())}
                        placeholder="U72200TG2020PTC..."
                        className="text-sm h-9 font-mono uppercase"
                      />
                    </div>
                  </div>

                  {/* Additional Statutory Identifiers */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Additional Statutory Identifiers ({editExtraRegs.length})
                    </h4>

                    {editExtraRegs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {editExtraRegs.map((reg, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 relative"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900">{reg.type}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveExtraReg(idx)}
                                className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="font-mono font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded inline-block">
                              {reg.value}
                            </div>
                            {reg.remarks && (
                              <p className="text-[11px] text-slate-500">{reg.remarks}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                      <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Plus className="h-4 w-4 text-blue-600" />
                        Add Identifier (TAN, MSME, PF, ESI, IEC, FSSAI)
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <Label className="text-[11px] font-medium text-slate-600">Identifier Type</Label>
                          <Select value={newExtraType} onValueChange={setNewExtraType}>
                            <SelectTrigger className="h-8 text-xs mt-1">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TAN">TAN (Tax Deduction Acct)</SelectItem>
                              <SelectItem value="MSME">MSME / Udyam</SelectItem>
                              <SelectItem value="EPFO">EPF / PF Registration</SelectItem>
                              <SelectItem value="ESIC">ESI Registration</SelectItem>
                              <SelectItem value="IEC">Import Export Code (IEC)</SelectItem>
                              <SelectItem value="FSSAI">FSSAI Food License</SelectItem>
                              <SelectItem value="PT">Professional Tax (PT)</SelectItem>
                              <SelectItem value="LEI">Legal Entity Identifier (LEI)</SelectItem>
                              <SelectItem value="OTHER">Other Statutory ID</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[11px] font-medium text-slate-600">Registration / ID Number</Label>
                          <Input
                            value={newExtraValue}
                            onChange={(e) => setNewExtraValue(e.target.value)}
                            placeholder="e.g. HYDD12345E"
                            className="h-8 text-xs mt-1 font-mono uppercase"
                          />
                        </div>
                        <div>
                          <Label className="text-[11px] font-medium text-slate-600">Registration Date</Label>
                          <Input
                            type="date"
                            value={newExtraDate}
                            onChange={(e) => setNewExtraDate(e.target.value)}
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Label className="text-[11px] font-medium text-slate-600">Remarks / Authority</Label>
                          <Input
                            value={newExtraRemarks}
                            onChange={(e) => setNewExtraRemarks(e.target.value)}
                            placeholder="Optional notes or issuing jurisdiction..."
                            className="h-8 text-xs mt-1"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleAddExtraReg}
                        className="bg-slate-900 text-white text-xs h-8 gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Identifier
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 5: BANK ACCOUNTS */}
                <TabsContent value="banking" className="m-0 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Configured Bank Accounts ({editBankAccounts.length})
                      </h4>
                      <span className="text-[11px] text-slate-500">First account or designated account will be Primary</span>
                    </div>

                    {editBankAccounts.length === 0 ? (
                      <div className="p-4 text-center border border-dashed rounded-lg text-slate-500 text-xs">
                        No bank accounts registered. Add a bank account below.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {editBankAccounts.map((acc, idx) => (
                          <div
                            key={acc.id || idx}
                            className={`p-3 rounded-lg border text-xs space-y-2 relative transition-colors ${
                              acc.is_primary ? "bg-blue-50/60 border-blue-200" : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-slate-900 text-sm block">{acc.bank_name}</span>
                                <Badge variant="outline" className="text-[10px] mt-0.5">
                                  {acc.account_type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                {acc.is_primary ? (
                                  <Badge className="bg-blue-600 text-white text-[10px]">Primary</Badge>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetPrimaryBankAccount(idx)}
                                    className="h-6 px-1.5 text-[10px] text-slate-600 hover:text-blue-600"
                                  >
                                    Set Primary
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveBankAccount(idx)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px]">
                              <div>
                                <span className="text-[10px] text-slate-400 block">Account Number</span>
                                <span className="font-mono font-semibold text-slate-900">{acc.account_number}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-400 block">IFSC Code</span>
                                <span className="font-mono font-semibold text-blue-700">{acc.ifsc_code}</span>
                              </div>
                              {acc.branch_name && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">Branch</span>
                                  <span>{acc.branch_name}</span>
                                </div>
                              )}
                              {acc.upi_id && (
                                <div>
                                  <span className="text-[10px] text-slate-400 block">UPI / VPA</span>
                                  <span className="font-mono text-emerald-700">{acc.upi_id}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add New Bank Account Form */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Landmark className="h-4 w-4 text-blue-600" />
                      Add Bank Account
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Bank Name *</Label>
                        <Input
                          value={newBankName}
                          onChange={(e) => setNewBankName(e.target.value)}
                          placeholder="e.g. HDFC Bank"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Account Number *</Label>
                        <Input
                          value={newAccountNumber}
                          onChange={(e) => setNewAccountNumber(e.target.value)}
                          placeholder="e.g. 50100234567890"
                          className="h-8 text-xs mt-1 font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Account Type</Label>
                        <Select value={newAccountType} onValueChange={setNewAccountType}>
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Current">Current Account</SelectItem>
                            <SelectItem value="Savings">Savings Account</SelectItem>
                            <SelectItem value="OD/CC">OD / CC Account</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">IFSC Code *</Label>
                        <Input
                          value={newIfscCode}
                          onChange={(e) => setNewIfscCode(e.target.value.toUpperCase())}
                          placeholder="e.g. HDFC0001234"
                          className="h-8 text-xs mt-1 font-mono uppercase"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">Branch Name</Label>
                        <Input
                          value={newBranchName}
                          onChange={(e) => setNewBranchName(e.target.value)}
                          placeholder="e.g. Cyber Towers Branch"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] font-medium text-slate-600">UPI / VPA ID</Label>
                        <Input
                          value={newUpiId}
                          onChange={(e) => setNewUpiId(e.target.value)}
                          placeholder="company@hdfcbank"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddBankAccount}
                      className="bg-slate-900 text-white text-xs h-8 gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add to Bank Accounts List
                    </Button>
                  </div>
                </TabsContent>
              </div>

              <DialogFooter className="p-4 px-6 border-t border-slate-100 bg-slate-50/80 shrink-0 flex items-center justify-between sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSavingClient}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isSavingClient}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4"
                  >
                    {isSavingClient ? "Saving Changes..." : "Save All Changes"}
                  </Button>
                </div>
              </DialogFooter>
            </Tabs>
          </form>
        </DialogContent>
      </Dialog>

      {/* Audit Detail Modal Dialog */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedAuditLog?.type || "Audit Log"}
              </Badge>
              <DialogTitle className="text-base font-bold text-slate-900">
                {selectedAuditLog?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Recorded on {selectedAuditLog?.timestamp ? formatDateTime(selectedAuditLog.timestamp) : "—"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-slate-50 rounded-lg p-3 text-xs space-y-1 border border-slate-200">
              <span className="font-semibold text-slate-600 block">Initiated / Logged By</span>
              <p className="text-slate-900 font-medium">{selectedAuditLog?.actor || "System"}</p>
              {selectedAuditLog?.description && (
                <p className="text-slate-600 mt-1 leading-relaxed">{selectedAuditLog.description}</p>
              )}
            </div>

            {selectedAuditLog?.details && (
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Audit Metadata & Snapshot
                </div>
                <div className="divide-y divide-slate-100 text-xs">
                  {Object.entries(selectedAuditLog.details).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2">
                      <span className="text-slate-500 font-medium">{key}</span>
                      <span className="text-slate-900 font-semibold text-right">{String(val ?? "—")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TaskDetailDialog
        taskId={activeTaskId}
        open={isTaskDetailOpen}
        onOpenChange={setIsTaskDetailOpen}
        onUpdated={() => setRefreshKey((k) => k + 1)}
        readOnly={isEmployee}
      />
    </div>
  );
}

