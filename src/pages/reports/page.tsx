import React, { useState } from "react";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Calendar,
  Users2,
  Receipt,
  CheckCircle2,
  TrendingUp,
  Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("finance");
  const clients = pmsStore.getClients();
  const invoices = pmsStore.getInvoices();
  const payments = pmsStore.getPayments();
  const projects = pmsStore.getProjects();
  const employees = pmsStore.getEmployees();
  const kpis = pmsStore.getKPIs();

  // Export Finance GST Summary
  const exportFinanceExcel = async () => {
    const XLSX = await import("xlsx");
    const data = invoices.map((inv) => ({
      "Invoice Number": inv.invoice_number,
      "Invoice Date": inv.invoice_date,
      Client: inv.client_legal_name,
      GSTIN: inv.client_gstin || "Unregistered",
      "Place of Supply": inv.place_of_supply,
      "Taxable Value (₹)": inv.taxable_amount,
      "CGST (₹)": inv.cgst_amount,
      "SGST (₹)": inv.sgst_amount,
      "IGST (₹)": inv.igst_amount,
      "Total GST (₹)": inv.total_gst,
      "Grand Total (₹)": inv.grand_total,
      "Paid Amount (₹)": inv.paid_amount,
      "Outstanding Balance (₹)": inv.outstanding_balance,
      Status: inv.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GST Financial Register");
    XLSX.writeFile(wb, `PMS_Financial_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Finance report exported to Excel.");
  };

  // Export Client Master Report
  const exportClientExcel = async () => {
    const XLSX = await import("xlsx");
    const data = clients.map((c) => ({
      "Client ID": c.client_code,
      "Client Name": c.client_name,
      Constitution: c.constitution,
      PAN: c.registration?.pan,
      GSTIN: c.registration?.gstin || "—",
      "Total Invoiced (₹)": c.total_invoiced_amount,
      "Total Collected (₹)": c.total_payments_received,
      "Outstanding (₹)": c.outstanding_amount,
      Status: c.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clients Summary");
    XLSX.writeFile(wb, `PMS_Clients_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Clients report exported to Excel.");
  };

  // PDF Export for Executive Summary
  const exportExecutivePDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("EXECUTIVE OPERATIONS & COMPLIANCE REPORT", 14, 20);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleDateString("en-IN")}`, 14, 26);
    doc.text("PMS Professional Services LLP — Central Organization Master", 14, 31);

    autoTable(doc, {
      startY: 38,
      head: [["Metric Category", "Calculated Value", "Operational Status"]],
      body: [
        ["Total Clients", String(kpis.totalClients), `${kpis.activeClients} Active`],
        ["Total Revenue Invoiced", formatCurrency(kpis.totalRevenueInvoiced), "From finalized tax invoices"],
        ["Total Collections Realized", formatCurrency(kpis.totalPaymentsReceived), "Cleared bank transfers"],
        ["Outstanding Receivables", formatCurrency(kpis.outstandingReceivables), "Pending collection"],
        ["Active Projects", String(kpis.activeProjects), "In Progress & Review"],
        ["Completed Projects", String(projects.filter(p => p.status === "Completed").length), "Deliverables archived"],
      ],
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42] },
    });

    doc.save(`PMS_Executive_Summary_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("Executive PDF report generated.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Reports & Business Intelligence
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportExecutivePDF}
            variant="outline"
            size="sm"
            className="border-[#e5e7eb] rounded-2xl gap-1.5 shadow-xs font-bold"
          >
            <FileText className="h-4 w-4 text-[#111827]" />
            <span>Executive PDF</span>
          </Button>

          <Button
            onClick={exportFinanceExcel}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Register (.xlsx)</span>
          </Button>
        </div>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="finance" className="w-full">
        <TabsList className="bg-white border border-[#e5e7eb] p-1 rounded-2xl mb-4 shadow-xs">
          <TabsTrigger value="finance" className="rounded-xl font-bold text-xs">Finance & GST Reports</TabsTrigger>
          <TabsTrigger value="clients" className="rounded-xl font-bold text-xs">Client Master Reports</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-xl font-bold text-xs">Project Delivery Reports</TabsTrigger>
          <TabsTrigger value="employees" className="rounded-xl font-bold text-xs">Employee Workload Reports</TabsTrigger>
        </TabsList>

        {/* FINANCE REPORTS */}
        <TabsContent value="finance" className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="shadow-xs">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total Taxable Value</span>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(invoices.reduce((s, i) => s + i.taxable_amount, 0))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total CGST + SGST</span>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {formatCurrency(invoices.reduce((s, i) => s + i.cgst_amount + i.sgst_amount, 0))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Total IGST</span>
                <div className="text-xl font-bold text-indigo-700 mt-1">
                  {formatCurrency(invoices.reduce((s, i) => s + i.igst_amount, 0))}
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs">
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 font-semibold uppercase">Outstanding Balances</span>
                <div className="text-xl font-bold text-amber-700 mt-1">
                  {formatCurrency(kpis.outstandingReceivables)}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Statutory GST Sales Register</CardTitle>
              <Button size="sm" variant="outline" onClick={exportFinanceExcel} className="text-xs gap-1 rounded-xl border-slate-300">
                <Download className="h-3.5 w-3.5" /> Export Excel
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {invoices.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No invoices available.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {inv.invoice_number}
                        </span>
                        <Badge variant="outline" className="text-[10px] rounded-full">{inv.status}</Badge>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 truncate">{inv.client_legal_name}</p>
                        <p className="font-mono text-[11px] text-slate-500">{inv.client_gstin || "Unregistered"} &bull; {formatDate(inv.invoice_date)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Taxable</span>
                          <span className="font-bold text-slate-800">{formatCurrency(inv.taxable_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Grand Total</span>
                          <span className="font-bold text-slate-900">{formatCurrency(inv.grand_total)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">CGST / SGST</span>
                          <span className="font-semibold text-blue-700">{formatCurrency(inv.cgst_amount + inv.sgst_amount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">IGST</span>
                          <span className="font-semibold text-indigo-700">{formatCurrency(inv.igst_amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENT MASTER REPORTS */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Client Commercial & Compliance Summary</CardTitle>
              <Button size="sm" variant="outline" onClick={exportClientExcel} className="text-xs gap-1 rounded-xl border-slate-300">
                <Download className="h-3.5 w-3.5" /> Export Excel
              </Button>
            </CardHeader>
            <CardContent className="p-5">
              {clients.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No clients registered.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {clients.map((c) => (
                    <div key={c.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-lg">
                          {c.client_code}
                        </span>
                        <Badge variant="success" className="text-[10px] rounded-full">{c.status}</Badge>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 truncate">{c.client_name}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">{c.constitution}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Invoiced</span>
                          <span className="font-bold text-slate-900">{formatCurrency(c.total_invoiced_amount || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Received</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(c.total_payments_received || 0)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Balance</span>
                          <span className="font-bold text-amber-700">{formatCurrency(c.outstanding_amount || 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECT DELIVERY REPORTS */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200">
              <CardTitle className="text-base font-semibold">Active Project Delivery Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {projects.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No projects found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {projects.map((p) => (
                    <div key={p.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {p.project_code}
                        </span>
                        <Badge variant="outline" className="text-[10px] rounded-full">{p.status}</Badge>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 truncate">{p.project_name}</p>
                        <p className="text-xs text-slate-500 truncate">{p.client_name || "Internal"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Manager</span>
                          <span className="font-semibold text-slate-900 truncate block">{p.project_manager_name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Due Date</span>
                          <span className="font-semibold text-slate-900">{formatDate(p.due_date)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Progress</span>
                          <span className="font-bold text-blue-700">{p.progress_percentage}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMPLOYEE WORKLOAD REPORTS */}
        <TabsContent value="employees" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b border-slate-200">
              <CardTitle className="text-base font-semibold">Employee Workload & Capacity Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              {employees.length === 0 ? (
                <p className="text-center py-8 text-xs text-slate-500">No employees found.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {employees.map((emp) => (
                    <div key={emp.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-3 hover:border-neutral-900 transition-all">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                          {emp.employee_code}
                        </span>
                        <Badge variant="success" className="text-[10px] rounded-full">{emp.employment_status}</Badge>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 truncate">{emp.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{emp.designation_name || emp.role_code || "Team Member"}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs rounded-xl bg-slate-50 border border-slate-300 p-2.5 text-center">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Projects</span>
                          <span className="font-bold text-slate-900">{emp.assigned_projects_count || 3}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Pending</span>
                          <span className="font-bold text-amber-700">{emp.assigned_tasks_count || 4}</span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block">Done</span>
                          <span className="font-bold text-emerald-700">{emp.completed_tasks_count || 12}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

