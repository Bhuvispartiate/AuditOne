import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { TaskStatus } from "@/types";
import { toast } from "sonner";
import { ProjectTimeline } from "@/components/tasks/project-timeline";
import { TaskDetailDialog } from "@/components/tasks/task-detail-dialog";

export default function Client360ProfilePage() {
  const params = useParams();
  const navigate = useNavigate();
  const [, setRefreshKey] = useState(0);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const clientId = params.id as string;

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setRefreshKey((k) => k + 1));
    return unsub;
  }, []);

  const currentUser = pmsStore.getCurrentUser();
  const isEmployee = isEmployeeRestricted(currentUser);
  const empId = currentUser?.id || "";

  const client = pmsStore.getClientById(clientId);
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

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    const service = allServices.find((s) => s.id === selectedServiceId);
    if (!service) return;

    const { project, tasks: createdTasks } = pmsStore.addServiceEngagementCascade({
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
            <Link to={`/invoices/new?clientId=${client.id}`}>
              <Button size="sm" variant="outline" className="border-slate-300 gap-1.5 shadow-xs">
                <Receipt className="h-4 w-4 text-blue-600" />
                <span>Raise Invoice</span>
              </Button>
            </Link>
            <Link to={`/projects/new?clientId=${client.id}`}>
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            </Link>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (
                  !window.confirm(
                    `Delete client "${client.client_name}" along with all linked engagements, projects & tasks?`
                  )
                ) {
                  return;
                }
                pmsStore.deleteClient(client.id);
                toast.success(`Deleted client "${client.client_name}".`);
                navigate("/clients");
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
          <div className={`grid grid-cols-2 ${isEmployee ? "md:grid-cols-2" : "md:grid-cols-4"} gap-4`}>
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  {isEmployee ? "Assigned Services" : "Active Services"}
                </span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {isEmployee ? engagements.length : client.active_services_count || engagements.length}
                </div>
                <span className="text-[11px] text-slate-500">Contracted engagements</span>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">
                  {isEmployee ? "Assigned Projects" : "Projects"}
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
              <>
                <Card className="border-l-4 border-l-emerald-600">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Invoiced Revenue</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(client.total_invoiced_amount || 0)}</div>
                    <span className="text-[11px] text-emerald-600 font-medium">₹{client.total_payments_received?.toLocaleString("en-IN")} received</span>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500">
                  <CardContent className="p-4">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Outstanding Balance</span>
                    <div className="text-2xl font-bold text-amber-700 mt-1">{formatCurrency(client.outstanding_amount || 0)}</div>
                    <span className="text-[11px] text-amber-700 font-medium">Pending collection</span>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Profile Summary Card */}
            <Card className="lg:col-span-2 shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Client Profile Snapshot
                </CardTitle>
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
                  <span className="font-semibold text-slate-500 block">GSTIN</span>
                  <p className="font-mono text-slate-800 text-sm font-semibold mt-0.5">{client.registration?.gstin || "Not Applicable"}</p>
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
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Section A — Basic Master Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Client ID</span>
                <span className="font-mono font-bold text-blue-700">{client.client_code}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Trade / Client Name</span>
                <span className="font-semibold text-slate-900">{client.client_name}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Legal Registered Name</span>
                <span className="font-semibold text-slate-900">{client.legal_name}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Reference Name</span>
                <span>{client.reference_name || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Constitution</span>
                <Badge variant="secondary" className="mt-0.5">{client.constitution}</Badge>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Category / Sector</span>
                <span>{client.category || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Nature of Income</span>
                <span>{client.nature_of_income || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Relationship Manager</span>
                <span>{client.relationship_manager_name || "Unassigned"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase block">Onboarding Date</span>
                <span>{formatDate(client.created_at)}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. CONTACT INFORMATION TAB */}
        <TabsContent value="contact-info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Primary Contact Person
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block">Name & Designation</span>
                  <span className="font-semibold text-slate-900">
                    {client.contact?.contact_person || client.client_name} ({client.contact?.designation || "Authorized Signatory"})
                  </span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block">Mobile Number</span>
                  <span className="font-mono">{client.contact?.mobile_number || "—"}</span>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-500 uppercase block">Official Email</span>
                  <span>{client.contact?.email || "—"}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardHeader className="pb-3 border-b border-slate-100">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Registered & Communication Addresses
                </CardTitle>
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
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Section C — Statutory Registration Identifiers
              </CardTitle>
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
                  <h4 className="text-xs font-semibold text-slate-700 uppercase mb-3">Additional Registrations</h4>
                  <div className="flex flex-wrap gap-3">
                    {client.registration.additional_registrations.map((r, i) => (
                      <div key={i} className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                        <span className="font-semibold text-blue-900">{r.type}: </span>
                        <span className="font-mono text-blue-800">{r.value}</span>
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
                              onClick={() => {
                                if (
                                  !window.confirm(
                                    `Remove subscribed service "${eng.service_name}" and its linked project/tasks from ${client.client_name}?`
                                  )
                                ) {
                                  return;
                                }
                                pmsStore.deleteServiceEngagement(eng.id);
                                toast.success(`Removed service "${eng.service_name}".`);
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
                            <span className="text-[10px] uppercase text-slate-400 block">Agreed Fee</span>
                            <span className="font-bold text-slate-900">{formatCurrency(eng.agreed_fee)}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Start Date</span>
                          <span className="font-semibold text-slate-800">{formatDate(eng.start_date)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">
                            {isEmployee ? "Frequency" : "Payment Terms"}
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
                              onChange={(e) => {
                                pmsStore.updateTaskStatus(t.id, e.target.value as TaskStatus);
                                toast.success(`Status updated to ${e.target.value}`);
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
                                onClick={() => {
                                  pmsStore.deleteTask(t.id);
                                  toast.success(`Deleted task ${t.task_code}`);
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
              <CardHeader className="pb-3 border-b border-slate-200">
                <CardTitle className="text-base font-semibold text-slate-900">
                  Audit Trail & Historic Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 flex items-start gap-3 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-600 mt-1 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900">Client Onboarded & Master Record Created</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">By {client.relationship_manager_name || "Admin"}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(client.created_at)}</span>
                    </div>
                  </div>
                  {clientInvoices.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 flex items-start gap-3 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-600 mt-1 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-900">Invoice {inv.invoice_number} Raised for {formatCurrency(inv.grand_total)}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">Place of supply: {inv.place_of_supply}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(inv.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

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

