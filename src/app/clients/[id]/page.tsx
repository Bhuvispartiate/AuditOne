"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate, formatDateTime, formatBytes } from "@/lib/utils";
import { toast } from "sonner";

export default function Client360ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const client = pmsStore.getClientById(clientId);
  const allServices = pmsStore.getServices();
  const engagements = pmsStore.getEngagementsByClientId(clientId);
  const clientProjects = pmsStore.getProjects().filter((p) => p.client_id === clientId);
  const clientInvoices = pmsStore.getInvoices().filter((i) => i.client_id === clientId);
  const clientPayments = pmsStore.getPayments().filter((p) => p.client_id === clientId);
  const clientDocuments = pmsStore.getDocuments().filter((d) => d.entity_id === clientId);
  const clientTasks = pmsStore.getTasks().filter((t) =>
    clientProjects.some((p) => p.id === t.project_id)
  );

  // Quick Subscribe Service state
  const [selectedServiceId, setSelectedServiceId] = useState(allServices[0]?.id || "");
  const [agreedFee, setAgreedFee] = useState(5000);
  const [billingFreq, setBillingFreq] = useState<any>("Monthly");

  if (!client) {
    return (
      <div className="text-center py-24 space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Client Not Found</h2>
        <p className="text-sm text-slate-500">The requested client ID does not exist in master records.</p>
        <Link href="/clients">
          <Button variant="outline">Back to Clients</Button>
        </Link>
      </div>
    );
  }

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    const service = allServices.find((s) => s.id === selectedServiceId);
    if (!service) return;

    pmsStore.addServiceEngagement({
      client_id: client.id,
      client_name: client.client_name,
      service_id: service.id,
      service_name: service.service_name,
      service_code: service.service_code,
      agreed_fee: Number(agreedFee),
      gst_rate: service.default_gst_rate,
      billing_frequency: billingFreq,
      payment_terms: "15 Days Net",
      department_id: "33333333-3333-3333-3333-333333330001",
      department_name: "Tax & Regulatory Services",
      relationship_manager_id: client.relationship_manager_id,
      relationship_manager_name: client.relationship_manager_name,
      start_date: new Date().toISOString().slice(0, 10),
      status: "Active",
      remarks: "Subscribed via Client 360°",
    });

    toast.success(`Subscribed to ${service.service_name}`);
    router.refresh();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/90 pb-6">
        <div className="flex items-start gap-4">
          <Link href="/clients">
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

        <div className="flex items-center gap-2">
          <Link href={`/invoices/new?clientId=${client.id}`}>
            <Button size="sm" variant="outline" className="border-slate-300 gap-1.5 shadow-xs">
              <Receipt className="h-4 w-4 text-blue-600" />
              <span>Raise Invoice</span>
            </Button>
          </Link>
          <Link href={`/projects/new?clientId=${client.id}`}>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ALL 12 MANDATORY TABS */}
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
          <TabsTrigger value="finance">9. Finance & Payments</TabsTrigger>
          <TabsTrigger value="invoices">10. Invoices ({clientInvoices.length})</TabsTrigger>
          <TabsTrigger value="documents">11. Documents ({clientDocuments.length})</TabsTrigger>
          <TabsTrigger value="activity">12. Activity History</TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main KPI Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-blue-600">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Active Services</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">{client.active_services_count || engagements.length}</div>
                <span className="text-[11px] text-slate-500">Contracted engagements</span>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <CardContent className="p-4">
                <span className="text-xs font-semibold text-slate-500 uppercase">Projects</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {clientProjects.length}
                  <span className="text-xs font-normal text-slate-500 ml-2">
                    ({clientProjects.filter(p => p.status === "Completed").length} done)
                  </span>
                </div>
                <span className="text-[11px] text-emerald-600 font-medium">{clientTasks.filter(t => t.status !== "Completed").length} pending tasks</span>
              </CardContent>
            </Card>

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
          {/* Subscribe New Service Box */}
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

          {/* Table of Contracted Services */}
          <Card className="shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Code</TableHead>
                    <TableHead>Service Name</TableHead>
                    <TableHead>Agreed Fee</TableHead>
                    <TableHead>Billing Frequency</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Responsible Dept</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {engagements.map((eng) => (
                    <TableRow key={eng.id}>
                      <TableCell className="font-mono text-xs font-semibold text-blue-700">{eng.service_code}</TableCell>
                      <TableCell className="font-medium text-slate-900">{eng.service_name}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{formatCurrency(eng.agreed_fee)}</TableCell>
                      <TableCell><Badge variant="secondary">{eng.billing_frequency}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDate(eng.start_date)}</TableCell>
                      <TableCell className="text-xs">{eng.department_name}</TableCell>
                      <TableCell><Badge variant="success">{eng.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6. PROJECTS TAB */}
        <TabsContent value="projects">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Client Projects ({clientProjects.length})</CardTitle>
              <Link href={`/projects/new?clientId=${client.id}`}>
                <Button size="sm" className="bg-blue-600 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" /> New Project
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientProjects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-700">{p.project_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{p.project_name}</TableCell>
                      <TableCell><Badge variant={p.priority === "Urgent" ? "destructive" : "warning"}>{p.priority}</Badge></TableCell>
                      <TableCell className="text-xs">{formatDate(p.due_date)}</TableCell>
                      <TableCell>
                        <span className="text-xs font-bold">{p.progress_percentage}%</span>
                        <div className="w-16 bg-slate-200 h-1.5 rounded-full mt-1">
                          <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${p.progress_percentage}%` }} />
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Link href={`/projects`}>
                          <Button variant="ghost" size="sm" className="text-blue-600">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7. TASKS TAB */}
        <TabsContent value="tasks">
          <Card className="shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task Code</TableHead>
                    <TableHead>Task Title</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientTasks.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">No tasks created yet for this client.</TableCell></TableRow>
                  ) : (
                    clientTasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-blue-700 font-bold">{t.task_code}</TableCell>
                        <TableCell className="font-medium text-slate-900">{t.title}</TableCell>
                        <TableCell className="text-xs">{t.assigned_employee_name || "Unassigned"}</TableCell>
                        <TableCell className="text-xs">{formatDate(t.due_date)}</TableCell>
                        <TableCell><Badge variant={t.priority === "Urgent" ? "destructive" : "outline"}>{t.priority}</Badge></TableCell>
                        <TableCell><Badge variant={t.status === "Completed" ? "success" : "secondary"}>{t.status}</Badge></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
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
                Active workflow engines executing structured compliance pipelines
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-blue-600" />
                    <h4 className="font-bold text-slate-900 text-sm">Annual Corporate Tax & ROC Filing Workflow (v1)</h4>
                  </div>
                  <Badge variant="success">Active Execution</Badge>
                </div>
                <div className="grid grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded font-medium">1. Doc Collection ✓</div>
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded font-medium">2. Verification ✓</div>
                  <div className="p-2 bg-blue-100 text-blue-800 rounded font-semibold ring-1 ring-blue-400">3. Draft Prep (Now)</div>
                  <div className="p-2 bg-slate-100 text-slate-600 rounded">4. Review</div>
                  <div className="p-2 bg-slate-100 text-slate-600 rounded">5. Portal Filing</div>
                  <div className="p-2 bg-slate-100 text-slate-600 rounded">6. Archival</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9. FINANCE & PAYMENTS TAB */}
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
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Payment Receipts & Remittances ({clientPayments.length})</CardTitle>
              <Link href={`/finance?action=record&clientId=${client.id}`}>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" /> Record Payment
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Ref</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Txn Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Received By</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientPayments.map((pay) => (
                    <TableRow key={pay.id}>
                      <TableCell className="font-mono text-xs font-bold text-emerald-700">{pay.payment_number}</TableCell>
                      <TableCell className="text-xs">{formatDate(pay.payment_date)}</TableCell>
                      <TableCell><Badge variant="outline">{pay.payment_mode}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{pay.transaction_reference || "—"}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatCurrency(pay.amount)}</TableCell>
                      <TableCell className="text-xs">{pay.received_by_name}</TableCell>
                      <TableCell><Badge variant="success">{pay.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10. INVOICES TAB */}
        <TabsContent value="invoices">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Client Tax Invoices ({clientInvoices.length})</CardTitle>
              <Link href={`/invoices/new?clientId=${client.id}`}>
                <Button size="sm" className="bg-blue-600 text-white gap-1">
                  <Plus className="h-3.5 w-3.5" /> Generate Invoice
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-700">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.due_date)}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatCurrency(inv.grand_total)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(inv.paid_amount)}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">{formatCurrency(inv.outstanding_balance)}</TableCell>
                      <TableCell><Badge variant={inv.status === "Paid" ? "success" : "warning"}>{inv.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        <Link href={`/invoices/${inv.id}`}>
                          <Button variant="ghost" size="sm" className="text-blue-600">View / PDF</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11. DOCUMENTS TAB (Cloudflare R2) */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Client Cloudflare R2 Documents</CardTitle>
                <CardDescription className="text-xs">Secure private bucket storage with presigned link access</CardDescription>
              </div>
              <Link href={`/documents?clientId=${client.id}&upload=true`}>
                <Button size="sm" className="bg-blue-600 text-white gap-1.5">
                  <UploadCloud className="h-4 w-4" /> Upload Document
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead>Uploaded By</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientDocuments.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">No documents uploaded for this client yet.</TableCell></TableRow>
                  ) : (
                    clientDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-semibold text-slate-900 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-600" />
                          <span>{doc.file_name}</span>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{doc.category}</Badge></TableCell>
                        <TableCell className="text-xs">{formatBytes(doc.file_size)}</TableCell>
                        <TableCell className="text-xs font-mono">v{doc.version_number}</TableCell>
                        <TableCell className="text-xs">{doc.uploaded_by_name}</TableCell>
                        <TableCell className="text-xs">{formatDate(doc.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toast.success(`Simulating presigned Cloudflare R2 download for ${doc.file_name}`)}
                            className="gap-1 text-xs"
                          >
                            <Download className="h-3.5 w-3.5" /> Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 12. ACTIVITY HISTORY TAB */}
        <TabsContent value="activity">
          <Card className="shadow-xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-900">
                Audit Trail & Historic Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 text-xs border-b pb-3 border-slate-100">
                  <div className="h-2 w-2 rounded-full bg-blue-600 mt-1 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-900">Client Onboarded & Master Record Created</span>
                    <p className="text-slate-500 text-[11px] mt-0.5">By {client.relationship_manager_name || "Admin"}</p>
                    <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(client.created_at)}</span>
                  </div>
                </div>
                {clientInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-start gap-3 text-xs border-b pb-3 border-slate-100">
                    <div className="h-2 w-2 rounded-full bg-emerald-600 mt-1 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900">Invoice {inv.invoice_number} Raised for {formatCurrency(inv.grand_total)}</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">Place of supply: {inv.place_of_supply}</p>
                      <span className="text-[10px] text-slate-400 mt-1 block">{formatDateTime(inv.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

