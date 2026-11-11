import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { getInvoiceNetPayable } from "@/lib/invoice-template";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InvoicesListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [, setVersion] = useState(0);

  useEffect(() => {
    return pmsStore.subscribe(() => setVersion((v) => v + 1));
  }, []);

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
      "TDS (₹)": inv.tds_amount || 0,
      "Net Payable (₹)": getInvoiceNetPayable(inv),
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

          <Link to="/invoices/new">
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

      {/* Invoices Box View */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-[#111827]">
          Issued Invoices ({filteredInvoices.length})
        </span>
        <span className="text-xs text-[#9ca3af]">Official tax documents</span>
      </div>

      {filteredInvoices.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <Receipt className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No invoices found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredInvoices.map((inv) => (
            <Card
              key={inv.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="font-mono text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl hover:underline"
                    >
                      {inv.invoice_number}
                    </Link>
                    <span className="text-[11px] font-semibold text-[#6b7280]">
                      {formatDate(inv.invoice_date)}
                    </span>
                  </div>
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
                    className="text-[10px] rounded-full shrink-0"
                  >
                    {inv.status}
                  </Badge>
                </div>

                <div>
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="text-base font-extrabold text-[#111827] hover:text-blue-600 transition-colors block truncate"
                  >
                    {inv.client_legal_name}
                  </Link>
                  <p className="font-mono text-[11px] text-[#6b7280] mt-0.5 truncate">
                    GSTIN: {inv.client_gstin || "Unregistered"} &bull; {inv.place_of_supply}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Net Payable
                    </span>
                    <span className="text-sm font-extrabold text-[#111827] mt-0.5 block">
                      {formatCurrency(getInvoiceNetPayable(inv))}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Balance Due
                    </span>
                    <span className="text-sm font-extrabold text-[#f97316] mt-0.5 block">
                      {formatCurrency(inv.outstanding_balance)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6]">
                  <span className="text-[11px] text-[#6b7280] font-medium">
                    Taxable: {formatCurrency(inv.taxable_amount)} + GST {formatCurrency(inv.total_gst)}
                  </span>
                  <Link to={`/invoices/${inv.id}`}>
                    <Button
                      size="sm"
                      className="h-8 px-3 rounded-xl bg-[#f3f4f6] hover:bg-neutral-900 text-[#111827] hover:text-white text-xs font-bold gap-1.5 transition-colors shadow-none"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>View / PDF</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

