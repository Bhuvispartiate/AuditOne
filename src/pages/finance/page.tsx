import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  CreditCard,
  Plus,
  Search,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Download,
  Filter,
  FileSpreadsheet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { PaymentMode } from "@/types";
import { toast } from "sonner";

function FinanceContent() {
  const [searchParams] = useSearchParams();
  const autoRecord = searchParams.get("action") === "record";
  const prefillClientId = searchParams.get("clientId") || "";

  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");
  const [isModalOpen, setIsModalOpen] = useState(autoRecord);

  const kpis = pmsStore.getKPIs();
  const clients = pmsStore.getClients();
  const invoices = pmsStore.getInvoices().filter((i) => i.status !== "Cancelled" && i.status !== "Draft");
  const payments = pmsStore.getPayments();
  const employees = pmsStore.getEmployees();

  // Payment recording form state
  const [clientId, setClientId] = useState(prefillClientId || clients[0]?.id || "");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState(10000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("NEFT");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.payment_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.client_name && p.client_name.toLowerCase().includes(search.toLowerCase())) ||
      (p.transaction_reference && p.transaction_reference.toLowerCase().includes(search.toLowerCase()));

    const matchesMode = modeFilter === "ALL" || p.payment_mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    const invoice = invoices.find((i) => i.id === invoiceId);

    const newPayment = pmsStore.recordPayment({
      client_id: clientId,
      client_name: client?.client_name,
      invoice_id: invoiceId || undefined,
      invoice_number: invoice?.invoice_number,
      payment_date: paymentDate,
      amount: Number(amount),
      payment_mode: paymentMode,
      transaction_reference: transactionRef || undefined,
      received_by: pmsStore.getCurrentUser().id,
      received_by_name: pmsStore.getCurrentUser().full_name,
      remarks,
      status: "Completed",
    });

    toast.success(`Payment of ₹${newPayment.amount.toLocaleString("en-IN")} recorded under ${newPayment.payment_number}.`);
    setIsModalOpen(false);
    setTransactionRef("");
    setRemarks("");
  };

  const exportPaymentsExcel = async () => {
    const XLSX = await import("xlsx");
    const data = filteredPayments.map((p) => ({
      "Payment #": p.payment_number,
      Date: p.payment_date,
      Client: p.client_name || "—",
      "Invoice #": p.invoice_number || "Direct Advance",
      "Amount (₹)": p.amount,
      Mode: p.payment_mode,
      "Transaction Reference": p.transaction_reference || "—",
      "Received By": p.received_by_name || "—",
      Status: p.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Payment Collections");
    XLSX.writeFile(wb, `PMS_Payments_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Collections ledger exported.");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
            Finance & Payment Management
          </h1>
          <p className="text-xs text-[#6b7280] mt-1 font-medium">
            Real-time receivables reconciliation, partial remittances, invoice allocation and automated balance ledger.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={exportPaymentsExcel}
            variant="outline"
            size="sm"
            className="border-[#e5e7eb] rounded-2xl gap-1.5 shadow-xs font-bold"
          >
            <Download className="h-4 w-4 text-[#6b7280]" />
            <span>Export Register</span>
          </Button>

          <Button
            onClick={() => setIsModalOpen(true)}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white gap-1.5 rounded-2xl shadow-xs font-bold"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>
        </div>
      </div>

      {/* Main KPI Cards: Real calculations */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Total Invoiced Billing
            </span>
            <div className="text-2xl font-extrabold text-[#111827] mt-1 tracking-tight">
              {formatCurrency(kpis.totalRevenueInvoiced)}
            </div>
            <p className="text-[11px] text-[#9ca3af] mt-1">
              Active billable professional services
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Total Payments Received
            </span>
            <div className="text-2xl font-extrabold text-[#84cc16] mt-1 tracking-tight">
              {formatCurrency(kpis.totalPaymentsReceived)}
            </div>
            <p className="text-[11px] text-[#9ca3af] mt-1">
              Cleared collections across {payments.length} remittances
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="p-6">
            <span className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider">
              Outstanding Receivables
            </span>
            <div className="text-2xl font-extrabold text-[#f97316] mt-1 tracking-tight">
              {formatCurrency(kpis.outstandingReceivables)}
            </div>
            <p className="text-[11px] text-[#9ca3af] mt-1">
              Unsettled client balances
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px]">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9ca3af]" />
            <Input
              type="search"
              placeholder="Search by payment number, client, or transaction reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-2xl border-[#e5e7eb] text-xs font-medium"
            />
          </div>

          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-10 rounded-2xl border border-[#e5e7eb] bg-white px-3.5 text-xs font-semibold text-[#111827] focus:outline-none"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="UPI">UPI</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cheque">Cheque</option>
            <option value="Credit Card">Credit Card</option>
          </select>
        </CardContent>
      </Card>

      {/* Payments Box View */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-bold text-[#111827]">
          Payment Receipts & Remittances ({filteredPayments.length})
        </span>
        <span className="text-xs text-[#9ca3af]">Verified transaction receipts</span>
      </div>

      {filteredPayments.length === 0 ? (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300">
          <CardContent className="py-16 text-center space-y-2">
            <CreditCard className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm font-bold text-[#111827]">No payment receipts recorded</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredPayments.map((p) => (
            <Card
              key={p.id}
              className="group rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(17,24,39,0.07)] hover:border-neutral-900 transition-all duration-200 flex flex-col justify-between"
            >
              <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                      {p.payment_number}
                    </span>
                    <Badge variant="outline" className="text-[10px] rounded-full">
                      {p.payment_mode}
                    </Badge>
                  </div>
                  <Badge variant="success" className="text-[10px] rounded-full shrink-0">
                    {p.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-[#111827] truncate">
                    {p.client_name || "Client Remittance"}
                  </h3>
                  <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-1">
                    {p.remarks || "Cleared collection entry"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Amount Received
                    </span>
                    <span className="text-sm font-extrabold text-[#111827] mt-0.5 block">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-slate-300 bg-white px-3 py-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ca3af] block">
                      Invoice Ref
                    </span>
                    <span className="font-mono text-xs font-bold text-blue-700 mt-1 block truncate">
                      {p.invoice_number || "Advance Retainer"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#f3f4f6] text-[11px] text-[#6b7280]">
                  <span className="font-mono truncate max-w-[160px]">
                    UTR: {p.transaction_reference || "—"}
                  </span>
                  <span className="font-medium shrink-0">
                    {formatDate(p.payment_date)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Record Payment Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              Record Client Remittance
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record incoming bank transfer or check and automatically recalculate invoice balance.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name} ({c.client_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Allocate to Invoice (Optional)
              </label>
              <select
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
              >
                <option value="">None / General Retainer Advance</option>
                {invoices
                  .filter((inv) => !clientId || inv.client_id === clientId)
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — Total: ₹{inv.grand_total.toLocaleString("en-IN")} | Bal: ₹
                      {inv.outstanding_balance.toLocaleString("en-IN")}
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Payment Amount (₹)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-xs"
                >
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Transaction Reference / UTR</label>
                <Input
                  placeholder="e.g. UTR-AXIS-992211"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Payment Date</label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Remarks / Ledger Notes</label>
              <Textarea
                placeholder="Tranche breakdown, bank remarks or reconciliation details..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function FinancePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading finance ledger...</div>}>
      <FinanceContent />
    </React.Suspense>
  );
}

