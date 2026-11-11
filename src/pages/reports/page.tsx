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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Automated statutory sales registers, collections breakdown, employee workloads and client profitability.
          </p>
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
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Statutory GST Sales Register</CardTitle>
              <Button size="sm" variant="outline" onClick={exportFinanceExcel} className="text-xs gap-1">
                <Download className="h-3.5 w-3.5" /> Export Excel
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client Legal Entity</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">CGST</TableHead>
                    <TableHead className="text-right">SGST</TableHead>
                    <TableHead className="text-right">IGST</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-700">{inv.invoice_number}</TableCell>
                      <TableCell className="text-xs">{formatDate(inv.invoice_date)}</TableCell>
                      <TableCell className="font-medium text-slate-900 text-xs">{inv.client_legal_name}</TableCell>
                      <TableCell className="font-mono text-xs">{inv.client_gstin || "Unregistered"}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(inv.taxable_amount)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(inv.cgst_amount)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(inv.sgst_amount)}</TableCell>
                      <TableCell className="text-right text-xs">{formatCurrency(inv.igst_amount)}</TableCell>
                      <TableCell className="text-right text-xs font-bold">{formatCurrency(inv.grand_total)}</TableCell>
                      <TableCell><Badge variant="outline">{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLIENT MASTER REPORTS */}
        <TabsContent value="clients" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Client Commercial & Compliance Summary</CardTitle>
              <Button size="sm" variant="outline" onClick={exportClientExcel} className="text-xs gap-1">
                <Download className="h-3.5 w-3.5" /> Export Excel
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Client Name</TableHead>
                    <TableHead>Constitution</TableHead>
                    <TableHead className="text-right">Total Invoiced</TableHead>
                    <TableHead className="text-right">Total Received</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-700">{c.client_code}</TableCell>
                      <TableCell className="font-medium text-slate-900">{c.client_name}</TableCell>
                      <TableCell><Badge variant="secondary">{c.constitution}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(c.total_invoiced_amount || 0)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{formatCurrency(c.total_payments_received || 0)}</TableCell>
                      <TableCell className="text-right font-semibold text-amber-700">{formatCurrency(c.outstanding_amount || 0)}</TableCell>
                      <TableCell><Badge variant="success">{c.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROJECT DELIVERY REPORTS */}
        <TabsContent value="projects" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">Active Project Delivery Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Project Title</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-700">{p.project_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{p.project_name}</TableCell>
                      <TableCell className="text-xs">{p.client_name || "Internal"}</TableCell>
                      <TableCell className="text-xs">{p.project_manager_name}</TableCell>
                      <TableCell className="text-xs">{formatDate(p.due_date)}</TableCell>
                      <TableCell className="font-bold text-xs">{p.progress_percentage}%</TableCell>
                      <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* EMPLOYEE WORKLOAD REPORTS */}
        <TabsContent value="employees" className="space-y-6">
          <Card className="shadow-xs">
            <CardHeader className="p-4 border-b">
              <CardTitle className="text-base font-semibold">Employee Workload & Capacity Analysis</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Assigned Projects</TableHead>
                    <TableHead>Pending Tasks</TableHead>
                    <TableHead>Completed Tasks</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-mono text-xs font-bold text-blue-700">{emp.employee_code}</TableCell>
                      <TableCell className="font-semibold text-slate-900">{emp.full_name}</TableCell>
                      <TableCell className="text-xs">{emp.department_name}</TableCell>
                      <TableCell className="text-xs font-bold">{emp.assigned_projects_count || 3}</TableCell>
                      <TableCell className="text-xs font-bold text-amber-700">{emp.assigned_tasks_count || 4}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-700">{emp.completed_tasks_count || 12}</TableCell>
                      <TableCell><Badge variant="success">{emp.employment_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

