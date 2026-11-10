"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Ban
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InvoicesListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const invoices = pmsStore.getInvoices();

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_legal_name.toLowerCase().includes(search.toLowerCase()) ||
      inv.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      (inv.client_gstin && inv.client_gstin.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const exportInvoicesExcel = async () => {
    const XLSX = await import("xlsx");
    const data = filteredInvoices.map((inv) => ({
      "Invoice #": inv.invoice_number,
      Date: inv.invoice_date,
      "Due Date": inv.due_date,
      Client: inv.client_legal_name,
      GSTIN: inv.client_gstin || "Unregistered",
      "Place of Supply": inv.place_of_supply,
      "Taxable Value (₹)": inv.taxable_amount,
      "CGST (₹)": inv.cgst_amount,
      "SGST (₹)": inv.sgst_amount,
      "IGST (₹)": inv.igst_amount,
      "Total GST (₹)": inv.total_gst,
      "Grand Total (₹)": inv.grand_total,
      "Paid (₹)": inv.paid_amount,
      "Outstanding (₹)": inv.outstanding_balance,
      Status: inv.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GST Sales Register");
    XLSX.writeFile(wb, `PMS_GST_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("GST Invoices Register exported to Excel.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            GST Invoice Generator & Sales Register
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Compliant tax invoices, intra-state CGST/SGST & inter-state IGST computations, PDF generation and ledger tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportInvoicesExcel}
            variant="outline"
            size="sm"
            className="border-[#e5e7eb] rounded-2xl gap-1.5 shadow-xs font-bold"
          >
            <Download className="h-4 w-4 text-[#6b7280]" />
            <span>Export GST Register</span>
          </Button>

          <Link href="/invoices/new">
            <Button size="sm" className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold">
              <Plus className="h-4 w-4" />
              <span>Create GST Invoice</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search by invoice number, legal name, GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
          >
            <option value="ALL">All Invoice Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Finalized">Finalized</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Paid">Paid</option>
            <option value="Overdue">Overdue</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </CardContent>
      </Card>

      {/* Invoices Master Table */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px] overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-[#f3f4f6] flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#111827]">
            Issued Invoices ({filteredInvoices.length})
          </CardTitle>
          <span className="text-xs text-[#9ca3af]">Official tax documents</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-36">Invoice Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Client Legal Entity</TableHead>
                <TableHead>Place of Supply</TableHead>
                <TableHead className="text-right">Taxable (₹)</TableHead>
                <TableHead className="text-right">Total GST (₹)</TableHead>
                <TableHead className="text-right">Grand Total (₹)</TableHead>
                <TableHead className="text-right">Balance Due (₹)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-mono text-xs font-bold text-blue-700">
                    <Link href={`/invoices/${inv.id}`} className="hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {formatDate(inv.invoice_date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-900 text-xs block">
                      {inv.client_legal_name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 block">
                      {inv.client_gstin || "Unregistered"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    <div>{inv.place_of_supply}</div>
                    <span className="text-[10px] text-slate-400">
                      {inv.is_interstate ? "Inter-state (IGST)" : "Intra-state (CGST+SGST)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-slate-800">
                    {formatCurrency(inv.taxable_amount)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium text-slate-700">
                    {formatCurrency(inv.total_gst)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-900">
                    {formatCurrency(inv.grand_total)}
                  </TableCell>
                  <TableCell className="text-right text-xs font-bold text-amber-700">
                    {formatCurrency(inv.outstanding_balance)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        inv.status === "Paid"
                          ? "success"
                          : inv.status === "Cancelled"
                            ? "destructive"
                            : inv.status === "Draft"
                              ? "secondary"
                              : "warning"
                      }
                      className="text-[10px]"
                    >
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/invoices/${inv.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                        <Eye className="h-3.5 w-3.5" />
                        <span>View / PDF</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

