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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px] border border-[#e5e7eb]">
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

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px] border border-[#e5e7eb]">
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

        <Card className="shadow-[0_2px_12px_rgba(0,0,0,0.02)] rounded-[24px] border border-[#e5e7eb]">
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

      {/* Payments Ledger Table */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">
            Payment Receipts & Remittances Register ({filteredPayments.length})
          </CardTitle>
          <span className="text-xs text-slate-500">Verified transaction receipts</span>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Payment #</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Associated Invoice</TableHead>
                <TableHead>Payment Mode</TableHead>
                <TableHead>Transaction Ref</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
                <TableHead>Received By</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((p) => (
                <TableRow key={p.id} className="hover:bg-slate-50/80">
                  <TableCell className="font-mono text-xs font-bold text-emerald-700">
                    {p.payment_number}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {formatDate(p.payment_date)}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-900 text-sm block">
                      {p.client_name}
                    </span>
                    {p.remarks && (
                      <span className="text-xs text-slate-500 block truncate max-w-xs">
                        {p.remarks}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.invoice_number ? (
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {p.invoice_number}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Advance Retainer</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-medium text-[10px]">
                      {p.payment_mode}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-600">
                    {p.transaction_reference || "—"}
                  </TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatCurrency(p.amount)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-700">
                    {p.received_by_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success" className="text-[10px]">
                      {p.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

