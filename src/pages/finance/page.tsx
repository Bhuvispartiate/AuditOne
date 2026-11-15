import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
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
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Building2,
  Calendar,
  X,
  Check,
  Ban,
  FileText,
  Printer,
  Eye,
  RefreshCw,
  MessageSquare,
  Play,
  Pause,
  Trash2,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import {
  Invoice,
  InvoiceRequest,
  InvoiceRequestType,
  Payment,
  PaymentMode,
  RecurringFrequency,
  RecurringInvoice,
  Task,
} from "@/types";
import { toast } from "sonner";
import { WhatsAppChatDialog } from "@/components/whatsapp/whatsapp-chat-dialog";

export default function FinanceCentralPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const prefillClientId = searchParams.get("clientId") || "";
  const prefillTaskId = searchParams.get("taskId") || "";
  const autoRecord = searchParams.get("action") === "record";

  const [activeTab, setActiveTab] = useState(initialTab);
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = pmsStore.subscribe(() => setTick((t) => t + 1));
    return unsub;
  }, []);

  useEffect(() => {
    const currentTabInUrl = searchParams.get("tab");
    if (currentTabInUrl && currentTabInUrl !== activeTab) {
      setActiveTab(currentTabInUrl);
    }
  }, [searchParams]);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("tab", tab);
      return p;
    });
  };

  // Central Store Data
  const clients = pmsStore.getClients();
  const tasks = pmsStore.getTasks();
  const invoices = pmsStore.getInvoices();
  const payments = pmsStore.getPayments();
  const invoiceRequests = pmsStore.getInvoiceRequests();
  const recurringInvoices = pmsStore.getRecurringInvoices();
  const bulkBatches = pmsStore.getBulkBatches();
  const approvalLogs = pmsStore.getApprovalLogs();
  const currentUser = pmsStore.getCurrentUser();

  const pendingRequests = invoiceRequests.filter((r) => r.status === "Pending Approval");
  const approvedInvoices = invoices.filter((i) => i.status !== "Cancelled");

  // Outstanding calculations
  const totalInvoiced = approvedInvoices.reduce((sum, i) => sum + (i.net_payable ?? i.grand_total), 0);
  const totalCollected = payments.filter((p) => p.status === "Completed").reduce((sum, p) => sum + p.amount, 0);
  const totalOutstanding = approvedInvoices.reduce((sum, i) => sum + (i.outstanding_balance || 0), 0);
  const totalPendingApprovalAmount = pendingRequests.reduce((sum, r) => sum + r.grand_total, 0);
  const activeRetainers = recurringInvoices.filter((r) => r.status === "Active");
  const activeRetainersMonthlyValue = activeRetainers.reduce((sum, r) => {
    const mult = r.frequency === "Weekly" ? 4 : r.frequency === "Quarterly" ? 1 / 3 : r.frequency === "Half-Yearly" ? 1 / 6 : r.frequency === "Yearly" ? 1 / 12 : 1;
    return sum + (r.total_amount * mult);
  }, 0);

  // =========================================================================
  // MODALS STATE
  // =========================================================================
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(autoRecord);
  const [paymentClientId, setPaymentClientId] = useState(prefillClientId || clients[0]?.id || "");
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number | "">(10000);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("NEFT");
  const [transactionRef, setTransactionRef] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentRemarks, setPaymentRemarks] = useState("");

  // Rejection modal
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // WhatsApp Dialog State
  const [whatsAppModal, setWhatsAppModal] = useState<{
    open: boolean;
    client?: any;
    customMessage?: string;
  }>({ open: false });

  // Recurring Schedule Creation Modal
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [recClientId, setRecClientId] = useState(clients[0]?.id || "");
  const [recTitle, setRecTitle] = useState("");
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>("Monthly");
  const [recBaseAmount, setRecBaseAmount] = useState<number | "">(15000);
  const [recGstRate, setRecGstRate] = useState(18);
  const [recStartDate, setRecStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [recEndDate, setRecEndDate] = useState("");
  const [recNotes, setRecNotes] = useState("");

  // Single Invoice Builder State
  const [singleClientId, setSingleClientId] = useState(prefillClientId || clients[0]?.id || "");
  const [selectedSingleTaskIds, setSelectedSingleTaskIds] = useState<string[]>(
    prefillTaskId ? [prefillTaskId] : []
  );
  const [singleTaskAmounts, setSingleTaskAmounts] = useState<Record<string, number>>({});
  const [singleGstRate, setSingleGstRate] = useState(18);
  const [singleIsInterstate, setSingleIsInterstate] = useState(false);
  const [singlePlaceOfSupply, setSinglePlaceOfSupply] = useState("Tamil Nadu");
  const [singleNotes, setSingleNotes] = useState("");
  const [singleTerms, setSingleTerms] = useState("Payment due within 15 days of invoice issue.");

  // Bulk Invoice Builder State
  const [bulkFilterClientId, setBulkFilterClientId] = useState("ALL");
  const [bulkSearch, setBulkSearch] = useState("");
  const [selectedBulkTaskIds, setSelectedBulkTaskIds] = useState<string[]>([]);
  const [bulkTaskAmounts, setBulkTaskAmounts] = useState<Record<string, number>>({});
  const [bulkGstRate, setBulkGstRate] = useState(18);
  const [bulkPlaceOfSupply, setBulkPlaceOfSupply] = useState("Tamil Nadu");
  const [bulkNotes, setBulkNotes] = useState("");

  // Invoice Register Search & Filter
  const [invSearch, setInvSearch] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState("ALL");

  // Approval Requests Filter
  const [approvalTypeFilter, setApprovalTypeFilter] = useState<"ALL" | InvoiceRequestType>("ALL");
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<"ALL" | "Pending" | "Approved" | "Rejected">("Pending");

  // Sync prefill values
  useEffect(() => {
    if (prefillClientId) {
      setSingleClientId(prefillClientId);
      setPaymentClientId(prefillClientId);
    }
    if (prefillTaskId) {
      setSelectedSingleTaskIds([prefillTaskId]);
    }
  }, [prefillClientId, prefillTaskId]);

  // Tasks eligible for single invoice
  const eligibleSingleTasks = useMemo(() => {
    if (!singleClientId) return [];
    return pmsStore.getCompletedBillableTasks(singleClientId);
  }, [singleClientId, tasks]);

  // Initialize task amounts when selected
  const handleToggleSingleTask = (taskId: string, maxAvailable: number) => {
    setSelectedSingleTaskIds((prev) => {
      const next = prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      if (!prev.includes(taskId) && singleTaskAmounts[taskId] === undefined) {
        setSingleTaskAmounts((amt) => ({ ...amt, [taskId]: maxAvailable }));
      }
      return next;
    });
  };

  // Submit Single Invoice for Admin Approval
  const handleSubmitSingleInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleClientId) {
      toast.error("Please select a client.");
      return;
    }
    if (selectedSingleTaskIds.length === 0) {
      toast.error("Please select at least one completed billable task.");
      return;
    }

    const items = selectedSingleTaskIds.map((taskId) => {
      const task = eligibleSingleTasks.find((t) => t.id === taskId);
      const remaining = task?.remaining_amount !== undefined ? task.remaining_amount : (task?.billing_amount || 0);
      const pending = task?.pending_approval_amount || 0;
      const available = Math.max(0, remaining - pending);
      const billed_amount = singleTaskAmounts[taskId] !== undefined ? singleTaskAmounts[taskId] : available;
      return {
        task_id: taskId,
        billed_amount,
        description: task?.billing_description || task?.title,
        sac_code: "998311",
      };
    });

    try {
      const req = await pmsStore.createSingleInvoiceRequest({
        client_id: singleClientId,
        items,
        gst_rate: singleGstRate,
        place_of_supply: singlePlaceOfSupply,
        is_interstate: singleIsInterstate,
        notes: singleNotes,
        terms_conditions: singleTerms,
      });

      toast.success(
        `Invoice request ${req.request_number} submitted! Awaiting Admin Approval before generation.`
      );
      setSelectedSingleTaskIds([]);
      setSingleTaskAmounts({});
      switchTab("approvals");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit invoice request.");
    }
  };

  // All completed billable tasks across all clients for bulk billing
  const allEligibleBulkTasks = useMemo(() => {
    return pmsStore.getCompletedBillableTasks();
  }, [tasks]);

  const filteredBulkTasks = useMemo(() => {
    return allEligibleBulkTasks.filter((t) => {
      const matchesClient = bulkFilterClientId === "ALL" || t.client_id === bulkFilterClientId;
      const matchesSearch =
        bulkSearch === "" ||
        t.title.toLowerCase().includes(bulkSearch.toLowerCase()) ||
        t.task_code.toLowerCase().includes(bulkSearch.toLowerCase()) ||
        (t.client_name && t.client_name.toLowerCase().includes(bulkSearch.toLowerCase()));
      return matchesClient && matchesSearch;
    });
  }, [allEligibleBulkTasks, bulkFilterClientId, bulkSearch]);

  const handleToggleBulkTask = (taskId: string, maxAvailable: number) => {
    setSelectedBulkTaskIds((prev) => {
      const next = prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId];
      if (!prev.includes(taskId) && bulkTaskAmounts[taskId] === undefined) {
        setBulkTaskAmounts((amt) => ({ ...amt, [taskId]: maxAvailable }));
      }
      return next;
    });
  };

  // Grouped clients preview for bulk
  const bulkClientGroupsPreview = useMemo(() => {
    const map = new Map<string, { client_name: string; tasks: Task[]; subtotal: number }>();
    for (const taskId of selectedBulkTaskIds) {
      const task = allEligibleBulkTasks.find((t) => t.id === taskId);
      if (!task || !task.client_id) continue;
      const amt = bulkTaskAmounts[taskId] !== undefined ? bulkTaskAmounts[taskId] : (task.remaining_amount || task.billing_amount || 0);
      const existing = map.get(task.client_id) || { client_name: task.client_name || "Client", tasks: [], subtotal: 0 };
      existing.tasks.push(task);
      existing.subtotal += amt;
      map.set(task.client_id, existing);
    }
    return Array.from(map.entries());
  }, [selectedBulkTaskIds, allEligibleBulkTasks, bulkTaskAmounts]);

  // Submit Bulk Batch for Approval
  const handleSubmitBulkBatch = async () => {
    if (selectedBulkTaskIds.length === 0) {
      toast.error("Please select at least one task for bulk invoice generation.");
      return;
    }

    const items = selectedBulkTaskIds.map((taskId) => {
      const task = allEligibleBulkTasks.find((t) => t.id === taskId)!;
      const remaining = task.remaining_amount !== undefined ? task.remaining_amount : (task.billing_amount || 0);
      const pending = task.pending_approval_amount || 0;
      const available = Math.max(0, remaining - pending);
      const billed_amount = bulkTaskAmounts[taskId] !== undefined ? bulkTaskAmounts[taskId] : available;
      return {
        task_id: taskId,
        billed_amount,
        client_id: task.client_id!,
        description: task.billing_description || task.title,
        sac_code: "998311",
      };
    });

    try {
      const result = await pmsStore.createBulkInvoiceRequest({
        items,
        gst_rate: bulkGstRate,
        place_of_supply: bulkPlaceOfSupply,
        notes: bulkNotes,
      });

      toast.success(
        `Batch ${result.batch.batch_code} generated ${result.requests.length} separate client approval requests.`
      );
      setSelectedBulkTaskIds([]);
      setBulkTaskAmounts({});
      switchTab("approvals");
    } catch (err: any) {
      toast.error(err.message || "Failed to create bulk invoice batch.");
    }
  };

  // Recurring Template Submission
  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recClientId || !recTitle || !recBaseAmount) {
      toast.error("Please complete all required fields.");
      return;
    }

    try {
      const schedule = await pmsStore.createRecurringInvoice({
        client_id: recClientId,
        title: recTitle,
        frequency: recFrequency,
        base_amount: Number(recBaseAmount),
        gst_rate: recGstRate,
        start_date: recStartDate,
        end_date: recEndDate || undefined,
        notes: recNotes,
      });

      toast.success(`Recurring schedule ${schedule.schedule_code} created.`);
      setIsRecurringModalOpen(false);
      setRecTitle("");
      setRecNotes("");
    } catch (err: any) {
      toast.error(err.message || "Failed to create recurring invoice schedule.");
    }
  };

  // Run Scheduler Check
  const handleRunScheduler = async () => {
    try {
      const generated = await pmsStore.triggerRecurringScheduler();
      if (generated.length === 0) {
        toast.info("No recurring retainer cycles are due for generation today.");
      } else {
        toast.success(`Generated ${generated.length} retainer invoice approval requests.`);
        switchTab("approvals");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to run retainer scheduler.");
    }
  };

  // Admin Approve Request
  const handleApproveRequest = async (requestId: string) => {
    try {
      const invoice = await pmsStore.approveInvoiceRequest(requestId);
      toast.success(
        `Invoice ${invoice.invoice_number} generated successfully and added to Central Register!`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to approve invoice request.");
    }
  };

  // Admin Reject Request
  const handleRejectRequest = async () => {
    if (!rejectingRequestId) return;
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    try {
      await pmsStore.rejectInvoiceRequest(rejectingRequestId, rejectionReason.trim());
      toast.success("Invoice request rejected. Reserved task amounts have been released.");
      setRejectingRequestId(null);
      setRejectionReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to reject request.");
    }
  };

  // Payment Recording
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }

    const client = clients.find((c) => c.id === paymentClientId);
    const invoice = invoices.find((i) => i.id === paymentInvoiceId);

    try {
      const p = await pmsStore.recordPayment({
        client_id: paymentClientId,
        client_name: client?.client_name,
        invoice_id: paymentInvoiceId || undefined,
        invoice_number: invoice?.invoice_number,
        payment_date: paymentDate,
        amount: Number(paymentAmount),
        payment_mode: paymentMode,
        transaction_reference: transactionRef || undefined,
        received_by: currentUser.id,
        received_by_name: currentUser.full_name,
        remarks: paymentRemarks,
        status: "Completed",
      });

      toast.success(`Payment ${p.payment_number} of ₹${p.amount.toLocaleString("en-IN")} recorded.`);
      setIsPaymentModalOpen(false);
      setTransactionRef("");
      setPaymentRemarks("");
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment.");
    }
  };

  // Export GST Register Excel
  const exportInvoicesExcel = async () => {
    const XLSX = await import("xlsx");
    const data = invoices.map((inv) => ({
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
    XLSX.writeFile(wb, `PMS_GST_Sales_Register_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("GST Sales Register exported to Excel.");
  };

  // Export Collections Ledger
  const exportPaymentsExcel = async () => {
    const XLSX = await import("xlsx");
    const data = payments.map((p) => ({
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
    XLSX.writeFile(wb, `PMS_Collections_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Collections ledger exported.");
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ========================================================================= */}
      {/* HEADER: Centralized Finance & Invoice Operations                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#111827]">
                Finance &amp; Invoice Management
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Integrated Task Billing • Bulk Batching • Scheduled Retainers • Admin Approval Engine
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {pendingRequests.length > 0 && (
            <Button
              onClick={() => switchTab("approvals")}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs gap-1.5 animate-pulse"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{pendingRequests.length} Approvals Pending</span>
            </Button>
          )}

          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            size="sm"
            className="bg-neutral-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span>Record Payment</span>
          </Button>

          <Button
            onClick={exportInvoicesExcel}
            variant="outline"
            size="sm"
            className="border-slate-300 font-extrabold text-xs rounded-xl shadow-xs gap-1.5"
          >
            <Download className="h-4 w-4 text-slate-600" />
            <span>Export Register</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 9 INNER TABS NAVIGATION                                                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 text-xs font-extrabold">
        {[
          { id: "overview", label: "Overview", icon: TrendingUp },
          { id: "all-invoices", label: "All Invoices", icon: Receipt, count: invoices.length },
          { id: "single-invoice", label: "Single Invoice", icon: Plus },
          { id: "bulk-invoice", label: "Bulk Invoice", icon: Layers },
          { id: "recurring-invoice", label: "Recurring Invoice", icon: Clock, count: activeRetainers.length },
          {
            id: "approvals",
            label: "Approval Requests",
            icon: ShieldCheck,
            count: pendingRequests.length,
            badgeVariant: pendingRequests.length > 0 ? "destructive" : "secondary",
          },
          { id: "payments", label: "Payments & Receipts", icon: CreditCard, count: payments.length },
          { id: "outstanding", label: "Outstanding", icon: AlertCircle },
          { id: "reports", label: "Reports", icon: FileSpreadsheet },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-neutral-900 text-white shadow-xs font-black"
                  : "bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-slate-200"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : tab.badgeVariant === "destructive"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FINANCIAL OVERVIEW & KPIS                                           */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
            <Card className="rounded-[20px] border border-slate-200/90 bg-white p-4 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-slate-500">Total Billed</span>
              <div className="text-xl sm:text-2xl font-black text-[#111827] mt-1">
                ₹{totalInvoiced.toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">{approvedInvoices.length} Generated Invoices</p>
            </Card>

            <Card className="rounded-[20px] border border-emerald-200/90 bg-emerald-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-emerald-800">Collections</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                ₹{totalCollected.toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-emerald-700 mt-0.5">{payments.length} Payments Cleared</p>
            </Card>

            <Card className="rounded-[20px] border border-rose-200/90 bg-rose-50/40 p-4 shadow-xs">
              <span className="text-[11px] font-extrabold uppercase text-rose-800">Outstanding Balance</span>
              <div className="text-xl sm:text-2xl font-black text-rose-950 mt-1">
                ₹{totalOutstanding.toLocaleString("en-IN")}
              </div>
              <p className="text-[10px] text-rose-700 mt-0.5">Pending client receipts</p>
            </Card>

            <Card
              onClick={() => switchTab("approvals")}
              className="rounded-[20px] border border-amber-300 bg-amber-50/50 p-4 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-amber-900">Pending Approvals</span>
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                {pendingRequests.length} Req
              </div>
              <p className="text-[10px] text-amber-800 mt-0.5">₹{totalPendingApprovalAmount.toLocaleString("en-IN")} in queue</p>
            </Card>

            <Card
              onClick={() => switchTab("recurring-invoice")}
              className="rounded-[20px] border border-blue-200/90 bg-blue-50/40 p-4 shadow-xs cursor-pointer hover:border-blue-400 transition-all"
            >
              <span className="text-[11px] font-extrabold uppercase text-blue-900">Active Retainers</span>
              <div className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                {activeRetainers.length} Active
              </div>
              <p className="text-[10px] text-blue-800 mt-0.5">₹{Math.round(activeRetainersMonthlyValue).toLocaleString("en-IN")}/mo run-rate</p>
            </Card>
          </div>

          {/* Quick Actions & Billing Channels Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-800 flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#111827]">Single Client Invoice</h3>
                  <p className="text-[11px] text-slate-500">Bill one client for completed tasks</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Pulls all completed deliverables for a specific client. Adjust line items and submit for Admin Approval.
              </p>
              <Button
                onClick={() => switchTab("single-invoice")}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
              >
                <span>Create Single Invoice</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#111827]">Bulk Invoice Batch</h3>
                  <p className="text-[11px] text-slate-500">Multi-client / multi-task generation</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Select completed deliverables across all clients. The engine groups tasks by client to generate separate invoices.
              </p>
              <Button
                onClick={() => switchTab("bulk-invoice")}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
              >
                <span>Create Bulk Batch</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#111827]">Recurring Retainer</h3>
                  <p className="text-[11px] text-slate-500">Independent scheduled billing</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Automated monthly, quarterly, or yearly retainer cycles. Independent of tasks and triggered automatically.
              </p>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsRecurringModalOpen(true)}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs"
                >
                  <span>New Schedule</span>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  onClick={handleRunScheduler}
                  variant="outline"
                  className="border-slate-300 rounded-xl text-xs font-bold px-2.5"
                  title="Run scheduler check"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                </Button>
              </div>
            </div>
          </div>

          {/* Recent Invoices & Approvals Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Approvals in Queue */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-rose-600" />
                  <span>Pending Admin Approvals ({pendingRequests.length})</span>
                </h3>
                <button
                  onClick={() => switchTab("approvals")}
                  className="text-xs font-bold text-violet-700 hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1 opacity-70" />
                  All invoice requests have been processed. Zero pending items.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.slice(0, 4).map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{req.request_number}</span>
                          <Badge variant="outline" className="text-[10px] font-bold uppercase">
                            {req.request_type}
                          </Badge>
                        </div>
                        <p className="font-semibold text-slate-700 mt-0.5">{req.client_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#111827] text-sm">
                          ₹{req.grand_total.toLocaleString("en-IN")}
                        </span>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            onClick={() => handleApproveRequest(req.id)}
                            className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold"
                          >
                            Approve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Generated Invoices */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#111827] flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-violet-600" />
                  <span>Recent Generated Invoices</span>
                </h3>
                <button
                  onClick={() => switchTab("all-invoices")}
                  className="text-xs font-bold text-violet-700 hover:underline"
                >
                  View Register &rarr;
                </button>
              </div>

              {approvedInvoices.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No generated invoices recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {approvedInvoices.slice(0, 4).map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/70 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{inv.invoice_number}</span>
                          <Badge
                            variant={inv.status === "Paid" ? "success" : "secondary"}
                            className="text-[10px] font-bold"
                          >
                            {inv.status}
                          </Badge>
                        </div>
                        <p className="font-semibold text-slate-700 mt-0.5">{inv.client_legal_name || inv.client_name}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#111827]">
                          ₹{(inv.net_payable ?? inv.grand_total).toLocaleString("en-IN")}
                        </span>
                        <p className="text-[10px] text-slate-400">{formatDate(inv.invoice_date)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ALL INVOICES (CENTRAL REGISTER)                                    */}
      {/* ========================================================================= */}
      {activeTab === "all-invoices" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={invSearch}
                  onChange={(e) => setInvSearch(e.target.value)}
                  placeholder="Search invoice #, client, GSTIN..."
                  className="pl-9 h-9 rounded-xl border-slate-300 text-xs font-medium"
                />
              </div>
              <select
                value={invStatusFilter}
                onChange={(e) => setInvStatusFilter(e.target.value)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Finalized">Finalized</option>
                <option value="Partially Paid">Partially Paid</option>
                <option value="Paid">Paid</option>
                <option value="Draft">Draft</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={exportInvoicesExcel}
                variant="outline"
                size="sm"
                className="border-slate-300 rounded-xl text-xs font-bold gap-1 shadow-xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Export GST Register</span>
              </Button>
            </div>
          </div>

          {/* Central Register Table */}
          <div className="rounded-[24px] border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4 text-right">Taxable (₹)</th>
                    <th className="py-3 px-4 text-right">GST (₹)</th>
                    <th className="py-3 px-4 text-right">Grand Total (₹)</th>
                    <th className="py-3 px-4 text-right">Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoices
                    .filter((inv) => {
                      const matchesStatus = invStatusFilter === "ALL" || inv.status === invStatusFilter;
                      const matchesSearch =
                        invSearch === "" ||
                        inv.invoice_number.toLowerCase().includes(invSearch.toLowerCase()) ||
                        inv.client_legal_name.toLowerCase().includes(invSearch.toLowerCase()) ||
                        (inv.client_gstin && inv.client_gstin.toLowerCase().includes(invSearch.toLowerCase()));
                      return matchesStatus && matchesSearch;
                    })
                    .map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoice_number}</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(inv.invoice_date)}</td>
                        <td className="py-3 px-4 font-bold text-slate-800 max-w-[200px] truncate">
                          {inv.client_legal_name || inv.client_name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          ₹{inv.taxable_amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-600">
                          ₹{inv.total_gst.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-[#111827]">
                          ₹{(inv.net_payable ?? inv.grand_total).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                          ₹{inv.paid_amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-rose-700 font-extrabold">
                          ₹{inv.outstanding_balance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              inv.status === "Paid"
                                ? "success"
                                : inv.status === "Partially Paid"
                                ? "warning"
                                : inv.status === "Cancelled"
                                ? "destructive"
                                : "outline"
                            }
                            className="text-[10px] font-bold"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/invoices/${inv.id}`}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-[10px] font-bold rounded-lg border-slate-300"
                              >
                                View
                              </Button>
                            </Link>
                            {inv.outstanding_balance > 0 && inv.status !== "Cancelled" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setPaymentClientId(inv.client_id);
                                  setPaymentInvoiceId(inv.id);
                                  setPaymentAmount(inv.outstanding_balance);
                                  setIsPaymentModalOpen(true);
                                }}
                                className="h-7 px-2 text-[10px] font-bold bg-neutral-900 text-white rounded-lg hover:bg-black"
                              >
                                Pay
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SINGLE INVOICE (TASK-BASED ONE CLIENT)                              */}
      {/* ========================================================================= */}
      {activeTab === "single-invoice" && (
        <form onSubmit={handleSubmitSingleInvoice} className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#111827]">
                  Single Client Invoice Generation
                </h2>
                <p className="text-xs text-slate-500">
                  Select completed billable deliverables for a client and submit for Admin Approval.
                </p>
              </div>

              {/* Client Selector */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-extrabold text-slate-700">Client:</label>
                <select
                  value={singleClientId}
                  onChange={(e) => {
                    setSingleClientId(e.target.value);
                    setSelectedSingleTaskIds([]);
                    setSingleTaskAmounts({});
                  }}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-900 focus:ring-violet-500"
                >
                  <option value="">Select a client...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name} ({c.client_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Client Summary Banner */}
            {singleClientId && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="font-extrabold text-slate-500 text-[10px] uppercase">Legal Name</span>
                  <p className="font-bold text-slate-900 mt-0.5">
                    {clients.find((c) => c.id === singleClientId)?.legal_name || "—"}
                  </p>
                </div>
                <div>
                  <span className="font-extrabold text-slate-500 text-[10px] uppercase">GSTIN / Registration</span>
                  <p className="font-mono font-bold text-slate-900 mt-0.5">
                    {clients.find((c) => c.id === singleClientId)?.registration?.gstin || "Unregistered"}
                  </p>
                </div>
                <div>
                  <span className="font-extrabold text-slate-500 text-[10px] uppercase">Eligible Tasks Ready</span>
                  <p className="font-bold text-emerald-700 mt-0.5">
                    {eligibleSingleTasks.length} Billable deliverables available
                  </p>
                </div>
              </div>
            )}

            {/* Completed & Invoiced Billable Tasks Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>Eligible Billable Deliverables</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {selectedSingleTaskIds.length} of {eligibleSingleTasks.length} selected
                </span>
              </h3>

              {eligibleSingleTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-8 text-center text-xs text-slate-500 space-y-2">
                  <Receipt className="h-8 w-8 text-slate-400 mx-auto opacity-70" />
                  <p className="font-extrabold text-slate-700">No unbilled deliverables available for this client.</p>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    To bill this client, mark deliverable tasks as &quot;Billable&quot; in Task Management and mark completed or initiate billing milestones.
                  </p>
                  <Link to="/tasks">
                    <Button size="sm" variant="outline" className="mt-2 text-xs font-bold rounded-xl">
                      Go to Task Management &rarr;
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Select</th>
                        <th className="py-2.5 px-3">Task Code</th>
                        <th className="py-2.5 px-3">Deliverable Title</th>
                        <th className="py-2.5 px-3 text-right">Total Billable (₹)</th>
                        <th className="py-2.5 px-3 text-right">Already Billed (₹)</th>
                        <th className="py-2.5 px-3 text-right">Available Unbilled (₹)</th>
                        <th className="py-2.5 px-3 text-right w-40">Amount to Bill (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {eligibleSingleTasks.map((t) => {
                        const isSelected = selectedSingleTaskIds.includes(t.id);
                        const remaining = t.remaining_amount !== undefined ? t.remaining_amount : (t.billing_amount || 0);
                        const pending = t.pending_approval_amount || 0;
                        const available = Math.max(0, remaining - pending);
                        const currentBillAmount = singleTaskAmounts[t.id] !== undefined ? singleTaskAmounts[t.id] : available;

                        return (
                          <tr
                            key={t.id}
                            className={`transition-colors ${isSelected ? "bg-amber-50/40" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSingleTask(t.id, available)}
                                className="h-4 w-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{t.task_code}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[260px] truncate">
                              {t.title}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                              ₹{(t.billing_amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                              ₹{(t.billed_amount || 0).toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700">
                              ₹{available.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Input
                                type="number"
                                min={1}
                                max={available}
                                disabled={!isSelected}
                                value={isSelected ? currentBillAmount : ""}
                                onChange={(e) =>
                                  setSingleTaskAmounts((amt) => ({
                                    ...amt,
                                    [t.id]: Math.min(available, Math.max(1, Number(e.target.value) || 0)),
                                  }))
                                }
                                className="h-7 w-32 ml-auto text-right font-bold text-xs rounded-lg border-slate-300"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* GST & Summary Options */}
            {selectedSingleTaskIds.length > 0 && (
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-700">GST Rate</label>
                      <select
                        value={singleGstRate}
                        onChange={(e) => setSingleGstRate(Number(e.target.value))}
                        className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold"
                      >
                        <option value={18}>18% (Standard GST)</option>
                        <option value={12}>12%</option>
                        <option value={5}>5%</option>
                        <option value={0}>0% (Exempt)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-extrabold text-slate-700">Place of Supply</label>
                      <Input
                        value={singlePlaceOfSupply}
                        onChange={(e) => setSinglePlaceOfSupply(e.target.value)}
                        className="h-9 rounded-xl border-slate-300 text-xs font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="interstate-single"
                      checked={singleIsInterstate}
                      onChange={(e) => setSingleIsInterstate(e.target.checked)}
                      className="h-4 w-4 rounded text-neutral-900 cursor-pointer"
                    />
                    <label htmlFor="interstate-single" className="text-xs font-bold text-slate-700 cursor-pointer">
                      Inter-state Supply (Apply IGST instead of CGST + SGST)
                    </label>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold text-slate-700">Notes / Scope Summary</label>
                    <Textarea
                      rows={2}
                      value={singleNotes}
                      onChange={(e) => setSingleNotes(e.target.value)}
                      placeholder="Service notes shown on invoice..."
                      className="rounded-xl border-slate-300 text-xs"
                    />
                  </div>
                </div>

                {/* Calculation Box */}
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                    Invoice Calculation Summary
                  </h4>
                  {(() => {
                    const subtotal = selectedSingleTaskIds.reduce((sum, tid) => {
                      const amt = singleTaskAmounts[tid];
                      if (amt !== undefined) return sum + amt;
                      const task = eligibleSingleTasks.find((t) => t.id === tid);
                      return sum + Math.max(0, (task?.remaining_amount || 0) - (task?.pending_approval_amount || 0));
                    }, 0);
                    const totalTax = (subtotal * singleGstRate) / 100;
                    const grandTotal = subtotal + totalTax;

                    return (
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal (Taxable):</span>
                          <span className="font-mono font-bold text-slate-900">₹{subtotal.toLocaleString("en-IN")}</span>
                        </div>
                        {singleIsInterstate ? (
                          <div className="flex justify-between text-slate-600">
                            <span>IGST ({singleGstRate}%):</span>
                            <span className="font-mono font-bold text-slate-900">₹{totalTax.toLocaleString("en-IN")}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between text-slate-600">
                              <span>CGST ({singleGstRate / 2}%):</span>
                              <span className="font-mono font-bold text-slate-900">
                                ₹{(totalTax / 2).toLocaleString("en-IN")}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>SGST ({singleGstRate / 2}%):</span>
                              <span className="font-mono font-bold text-slate-900">
                                ₹{(totalTax / 2).toLocaleString("en-IN")}
                              </span>
                            </div>
                          </>
                        )}
                        <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-extrabold text-[#111827]">
                          <span>Net Grand Total:</span>
                          <span className="font-mono text-base text-amber-900">
                            ₹{grandTotal.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 pt-1">
                          * Mandates Admin Approval before invoice numbering and generation.
                        </p>
                      </div>
                    );
                  })()}

                  <Button
                    type="submit"
                    className="w-full mt-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-extrabold shadow-xs gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Submit for Admin Approval</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BULK INVOICE (MULTI-CLIENT / MULTI-TASK)                           */}
      {/* ========================================================================= */}
      {activeTab === "bulk-invoice" && (
        <div className="space-y-6">
          <div className="rounded-[24px] border border-slate-200 bg-white p-6 space-y-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#111827]">
                  Bulk Invoice Batch Generation
                </h2>
                <p className="text-xs text-slate-500">
                  Select multiple completed deliverables across multiple clients. The engine groups tasks and generates separate invoice requests per client.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={bulkFilterClientId}
                  onChange={(e) => setBulkFilterClientId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="ALL">All Clients</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.client_name}
                    </option>
                  ))}
                </select>

                <Input
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                  placeholder="Filter tasks..."
                  className="h-9 w-44 rounded-xl border-slate-300 text-xs"
                />
              </div>
            </div>

            {/* Completed Tasks Across Clients Table */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-slate-700">
                <span>Eligible Deliverables ({filteredBulkTasks.length})</span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {selectedBulkTaskIds.length} tasks selected across {bulkClientGroupsPreview.length} clients
                </span>
              </div>

              {filteredBulkTasks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
                  No eligible billable deliverables found matching filters.
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Select</th>
                        <th className="py-2.5 px-3">Client</th>
                        <th className="py-2.5 px-3">Task Code</th>
                        <th className="py-2.5 px-3">Deliverable Title</th>
                        <th className="py-2.5 px-3 text-right">Available Unbilled (₹)</th>
                        <th className="py-2.5 px-3 text-right w-36">Amount to Bill (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBulkTasks.map((t) => {
                        const isSelected = selectedBulkTaskIds.includes(t.id);
                        const remaining = t.remaining_amount !== undefined ? t.remaining_amount : (t.billing_amount || 0);
                        const pending = t.pending_approval_amount || 0;
                        const available = Math.max(0, remaining - pending);
                        const amt = bulkTaskAmounts[t.id] !== undefined ? bulkTaskAmounts[t.id] : available;

                        return (
                          <tr
                            key={t.id}
                            className={`transition-colors ${isSelected ? "bg-sky-50/40" : "hover:bg-slate-50/50"}`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleBulkTask(t.id, available)}
                                className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 truncate max-w-[150px]">
                              {t.client_name || "—"}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{t.task_code}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[240px]">
                              {t.title}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-blue-700">
                              ₹{available.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <Input
                                type="number"
                                min={1}
                                max={available}
                                disabled={!isSelected}
                                value={isSelected ? amt : ""}
                                onChange={(e) =>
                                  setBulkTaskAmounts((prev) => ({
                                    ...prev,
                                    [t.id]: Math.min(available, Math.max(1, Number(e.target.value) || 0)),
                                  }))
                                }
                                className="h-7 w-32 ml-auto text-right font-bold text-xs rounded-lg border-slate-300"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Real-time Client Grouping Preview */}
            {selectedBulkTaskIds.length > 0 && (
              <div className="pt-4 border-t border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-[#111827]">
                      Separate Invoices to Generate ({bulkClientGroupsPreview.length} Clients)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Each client receives an independent invoice request linked under one batch.
                    </p>
                  </div>
                  <Button
                    onClick={handleSubmitBulkBatch}
                    className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-extrabold px-5 shadow-xs gap-1.5"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Generate Bulk Batch &amp; Submit for Approval</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {bulkClientGroupsPreview.map(([cId, grp]) => {
                    const tax = (grp.subtotal * bulkGstRate) / 100;
                    const total = grp.subtotal + tax;
                    return (
                      <div key={cId} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">{grp.client_name}</h4>
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {grp.tasks.length} deliverables
                          </Badge>
                        </div>
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Taxable Subtotal:</span>
                            <span className="font-mono font-bold">₹{grp.subtotal.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>GST ({bulkGstRate}%):</span>
                            <span className="font-mono">₹{tax.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="pt-1 border-t border-slate-200 flex justify-between font-extrabold text-[#111827]">
                            <span>Invoice Total:</span>
                            <span className="font-mono text-emerald-800">₹{total.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RECURRING INVOICES (RETAINERS - INDEPENDENT OF TASKS)               */}
      {/* ========================================================================= */}
      {activeTab === "recurring-invoice" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#111827]">Recurring Retainer Billing</h2>
              <p className="text-xs text-slate-500">
                Scheduled retainer cycles for ongoing clients. Operates independently from task-based billing.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={handleRunScheduler}
                variant="outline"
                size="sm"
                className="border-slate-300 font-extrabold text-xs rounded-xl shadow-xs gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                <span>Run Scheduler Check</span>
              </Button>

              <Button
                onClick={() => setIsRecurringModalOpen(true)}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>New Retainer Schedule</span>
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Schedule Code</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Retainer Title</th>
                    <th className="py-3 px-4 text-center">Frequency</th>
                    <th className="py-3 px-4 text-right">Base Amount (₹)</th>
                    <th className="py-3 px-4 text-right">Total with GST (₹)</th>
                    <th className="py-3 px-4">Next Billing Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recurringInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No recurring retainer schedules set up yet. Click &quot;New Retainer Schedule&quot; above.
                      </td>
                    </tr>
                  ) : (
                    recurringInvoices.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{rec.schedule_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{rec.client_name}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{rec.title}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {rec.frequency}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-700">
                          ₹{rec.base_amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-800">
                          ₹{rec.total_amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(rec.next_billing_date)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge
                            variant={rec.status === "Active" ? "success" : "secondary"}
                            className="text-[10px] font-bold"
                          >
                            {rec.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                pmsStore.updateRecurringInvoice(rec.id, {
                                  status: rec.status === "Active" ? "Paused" : "Active",
                                })
                              }
                              className="h-7 px-2 text-[10px] font-bold text-slate-700 hover:bg-slate-100 rounded-lg"
                              title={rec.status === "Active" ? "Pause Schedule" : "Resume Schedule"}
                            >
                              {rec.status === "Active" ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => pmsStore.deleteRecurringInvoice(rec.id)}
                              className="h-7 px-2 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg"
                              title="Delete Schedule"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: APPROVAL REQUESTS (ADMIN REVIEW & GENERATION INBOX)                 */}
      {/* ========================================================================= */}
      {activeTab === "approvals" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#111827]">Invoice Approval Requests</h2>
              <p className="text-xs text-slate-500">
                Review Single, Bulk, and Recurring requests awaiting Admin Authorization. Invoices are generated only upon approval.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={approvalStatusFilter}
                onChange={(e) => setApprovalStatusFilter(e.target.value as any)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="Pending">Pending Approval ({pendingRequests.length})</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={approvalTypeFilter}
                onChange={(e) => setApprovalTypeFilter(e.target.value as any)}
                className="h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Types</option>
                <option value="single">Single Task</option>
                <option value="bulk">Bulk Batch</option>
                <option value="recurring">Recurring Retainer</option>
              </select>
            </div>
          </div>

          {/* Requests Grid */}
          <div className="space-y-3">
            {invoiceRequests
              .filter((req) => {
                const matchesType = approvalTypeFilter === "ALL" || req.request_type === approvalTypeFilter;
                const matchesStatus =
                  approvalStatusFilter === "ALL"
                    ? true
                    : approvalStatusFilter === "Pending"
                    ? req.status === "Pending Approval"
                    : req.status === approvalStatusFilter;
                return matchesType && matchesStatus;
              })
              .map((req) => (
                <div
                  key={req.id}
                  className={`rounded-[24px] border p-5 transition-all shadow-xs space-y-4 ${
                    req.status === "Pending Approval"
                      ? "border-amber-300 bg-gradient-to-br from-amber-50/50 via-white to-amber-50/20"
                      : req.status === "Approved"
                      ? "border-emerald-200 bg-white"
                      : "border-rose-200 bg-rose-50/20"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3 border-b border-slate-200/80">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-900">{req.request_number}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${
                            req.request_type === "bulk"
                              ? "bg-sky-50 text-sky-800 border-sky-300"
                              : req.request_type === "recurring"
                              ? "bg-blue-50 text-blue-800 border-blue-300"
                              : "bg-violet-50 text-violet-800 border-violet-300"
                          }`}
                        >
                          {req.request_type} Billing
                        </Badge>
                        <Badge
                          variant={
                            req.status === "Approved"
                              ? "success"
                              : req.status === "Rejected"
                              ? "destructive"
                              : "warning"
                          }
                          className="text-[10px] font-bold"
                        >
                          {req.status}
                        </Badge>
                      </div>

                      <h3 className="text-base font-extrabold text-[#111827] mt-1">
                        {req.client_legal_name || req.client_name}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Requested by <span className="font-semibold text-slate-700">{req.requested_by_name || "Employee"}</span> on {formatDateTime(req.created_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-500">Net Invoice Amount</span>
                      <div className="text-xl font-black text-amber-950 font-mono">
                        ₹{req.grand_total.toLocaleString("en-IN")}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Taxable: ₹{req.subtotal.toLocaleString("en-IN")} + GST: ₹{req.total_gst.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-slate-500 font-extrabold text-[10px] uppercase">
                        <tr>
                          <th className="py-2 px-3">Item Description</th>
                          <th className="py-2 px-3">Linked Task</th>
                          <th className="py-2 px-3 text-right">Taxable (₹)</th>
                          <th className="py-2 px-3 text-right">GST Rate</th>
                          <th className="py-2 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {req.items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-2 px-3 font-medium text-slate-800">{it.description}</td>
                            <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                              {it.task_code ? `${it.task_code} (${it.task_title})` : "—"}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold">
                              ₹{it.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="py-2 px-3 text-right">{it.gst_rate}%</td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-900">
                              ₹{it.total_amount.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer & Approval Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                    <div className="text-[11px] text-slate-500">
                      {req.status === "Approved" && req.generated_invoice_number && (
                        <span className="flex items-center gap-1.5 text-emerald-800 font-bold">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Generated Invoice:{" "}
                          <Link
                            to={`/invoices/${req.generated_invoice_id}`}
                            className="font-mono underline hover:text-emerald-950"
                          >
                            {req.generated_invoice_number}
                          </Link>{" "}
                          (Approved by {req.approved_by_name} on {formatDate(req.approved_at || "")})
                        </span>
                      )}

                      {req.status === "Rejected" && (
                        <span className="flex items-center gap-1.5 text-rose-800 font-bold">
                          <Ban className="h-4 w-4 text-rose-600" />
                          Rejected Reason: {req.rejection_reason}
                        </span>
                      )}

                      {req.status === "Pending Approval" && (
                        <span className="text-amber-800 font-semibold flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Tasks reserved in-flight. Approval generates formal invoice and posts to register.
                        </span>
                      )}
                    </div>

                    {req.status === "Pending Approval" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingRequestId(req.id);
                            setRejectionReason("");
                          }}
                          className="h-8 px-3 rounded-xl border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold gap-1"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleApproveRequest(req.id)}
                          className="h-8 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs gap-1.5"
                        >
                          <Check className="h-4 w-4" />
                          <span>Approve &amp; Generate Invoice</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: PAYMENTS & RECEIPTS                                                */}
      {/* ========================================================================= */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#111827]">Payments &amp; Collections Ledger</h2>
              <p className="text-xs text-slate-500">Record and reconcile bank collections against invoices.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={exportPaymentsExcel}
                variant="outline"
                size="sm"
                className="border-slate-300 font-extrabold text-xs rounded-xl shadow-xs gap-1.5"
              >
                <Download className="h-3.5 w-3.5 text-slate-600" />
                <span>Export Collections</span>
              </Button>

              <Button
                onClick={() => setIsPaymentModalOpen(true)}
                size="sm"
                className="bg-neutral-900 hover:bg-black text-white font-extrabold text-xs rounded-xl shadow-xs gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>Record Payment</span>
              </Button>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Receipt #</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Allocated Invoice</th>
                    <th className="py-3 px-4 text-right">Amount (₹)</th>
                    <th className="py-3 px-4">Payment Mode</th>
                    <th className="py-3 px-4">Reference #</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        No payments recorded yet. Click &quot;Record Payment&quot; above.
                      </td>
                    </tr>
                  ) : (
                    payments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.payment_number}</td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{formatDate(p.payment_date)}</td>
                        <td className="py-3 px-4 font-bold text-slate-800">{p.client_name || "—"}</td>
                        <td className="py-3 px-4 font-mono text-slate-700">
                          {p.invoice_number ? (
                            <span className="font-bold text-slate-900">{p.invoice_number}</span>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-slate-400 italic">Direct Advance</span>
                              {invoices.filter((inv) => inv.client_id === p.client_id && inv.outstanding_balance > 0).length > 0 && (
                                <select
                                  defaultValue=""
                                  onChange={async (e) => {
                                    if (e.target.value) {
                                      try {
                                        await pmsStore.allocatePaymentToInvoice(p.id, e.target.value);
                                        toast.success("Payment allocated to invoice successfully!");
                                      } catch (err: any) {
                                        toast.error(err.message || "Failed to allocate payment.");
                                      }
                                    }
                                  }}
                                  className="h-6.5 rounded-lg border border-amber-300 bg-amber-50 text-[10px] font-bold text-amber-900 px-1.5 cursor-pointer shadow-2xs hover:bg-amber-100 transition-colors"
                                >
                                  <option value="">+ Link to Invoice...</option>
                                  {invoices
                                    .filter((inv) => inv.client_id === p.client_id && inv.outstanding_balance > 0)
                                    .map((inv) => (
                                      <option key={inv.id} value={inv.id}>
                                        {inv.invoice_number} (Bal: ₹{inv.outstanding_balance.toLocaleString("en-IN")})
                                      </option>
                                    ))}
                                </select>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-emerald-800 text-sm">
                          ₹{p.amount.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="text-[10px] font-bold">
                            {p.payment_mode}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{p.transaction_reference || "—"}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge variant="success" className="text-[10px] font-bold">
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Delete payment receipt ${p.payment_number}?`)) {
                                await pmsStore.deletePayment(p.id);
                                toast.success(`Payment receipt ${p.payment_number} removed.`);
                              }
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete this receipt"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: OUTSTANDING & AGING                                                */}
      {/* ========================================================================= */}
      {activeTab === "outstanding" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#111827]">Outstanding Balances &amp; Aging Analysis</h2>
            <p className="text-xs text-slate-500">Track client balances and send instant WhatsApp payment reminders.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <Card className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4">
              <span className="text-[10px] font-extrabold uppercase text-rose-800">Total Outstanding</span>
              <div className="text-xl font-black text-rose-950 font-mono mt-1">
                ₹{totalOutstanding.toLocaleString("en-IN")}
              </div>
            </Card>

            <Card className="rounded-2xl border border-slate-200 bg-white p-4">
              <span className="text-[10px] font-extrabold uppercase text-slate-500">0 – 30 Days (Current)</span>
              <div className="text-lg font-black text-slate-900 font-mono mt-1">
                ₹{Math.round(totalOutstanding * 0.65).toLocaleString("en-IN")}
              </div>
            </Card>

            <Card className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <span className="text-[10px] font-extrabold uppercase text-amber-800">31 – 60 Days</span>
              <div className="text-lg font-black text-amber-950 font-mono mt-1">
                ₹{Math.round(totalOutstanding * 0.25).toLocaleString("en-IN")}
              </div>
            </Card>

            <Card className="rounded-2xl border border-rose-300 bg-rose-100/50 p-4">
              <span className="text-[10px] font-extrabold uppercase text-rose-900">Over 60 Days (Critical)</span>
              <div className="text-lg font-black text-rose-950 font-mono mt-1">
                ₹{Math.round(totalOutstanding * 0.1).toLocaleString("en-IN")}
              </div>
            </Card>
          </div>

          {/* Client Balances Table */}
          <div className="rounded-[24px] border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold text-[10px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Primary Contact</th>
                    <th className="py-3 px-4 text-right">Invoiced (₹)</th>
                    <th className="py-3 px-4 text-right">Paid (₹)</th>
                    <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clients
                    .map((c) => {
                      const clientInvoices = approvedInvoices.filter((i) => i.client_id === c.id);
                      const invoiced = clientInvoices.reduce((s, i) => s + (i.net_payable ?? i.grand_total), 0);
                      const paid = clientInvoices.reduce((s, i) => s + i.paid_amount, 0);
                      const balance = clientInvoices.reduce((s, i) => s + i.outstanding_balance, 0);
                      return { client: c, invoiced, paid, balance };
                    })
                    .filter((x) => x.balance > 0)
                    .map(({ client, invoiced, paid, balance }) => (
                      <tr key={client.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{client.client_name}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {client.contact?.contact_person || client.contacts?.[0]?.contact_person || "—"}{" "}
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({client.contact?.mobile_number || client.contacts?.[0]?.mobile_number || "No Phone"})
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">₹{invoiced.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-right font-mono text-emerald-700">₹{paid.toLocaleString("en-IN")}</td>
                        <td className="py-3 px-4 text-right font-mono font-extrabold text-rose-700 text-sm">
                          ₹{balance.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => {
                                setWhatsAppModal({
                                  open: true,
                                  client,
                                  customMessage: `Dear ${client.client_name},\n\nThis is a gentle payment reminder regarding your pending balance of *₹${balance.toLocaleString("en-IN")}* with us.\n\nPlease process the dues at your earliest convenience.\n\nThank you,\nFinance Department`,
                                });
                              }}
                              className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold gap-1 shadow-2xs"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>WhatsApp Reminder</span>
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setPaymentClientId(client.id);
                                setPaymentInvoiceId("");
                                setPaymentAmount(balance);
                                setIsPaymentModalOpen(true);
                              }}
                              className="h-7 px-2.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-[10px] font-bold"
                            >
                              Record Payment
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 9: REPORTS & GST SALES SUMMARY                                        */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-[#111827]">Financial Reports &amp; GST Analysis</h2>
              <p className="text-xs text-slate-500">Summary reports ready for tax audit filing and GST return compilation.</p>
            </div>
            <Button
              onClick={exportInvoicesExcel}
              className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs"
            >
              <Download className="h-4 w-4" />
              <span>Export GST Sales Register (XLSX)</span>
            </Button>
          </div>

          {/* GST Summary Table */}
          <div className="rounded-[24px] border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
            <h3 className="text-sm font-extrabold text-[#111827]">GST Returns Summary (FY 2026-27)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Taxable Turnover</span>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  ₹{approvedInvoices.reduce((s, i) => s + i.taxable_amount, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">CGST (9%)</span>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  ₹{approvedInvoices.reduce((s, i) => s + i.cgst_amount, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">SGST (9%)</span>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  ₹{approvedInvoices.reduce((s, i) => s + i.sgst_amount, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-500 uppercase">IGST (18%)</span>
                <p className="text-base font-black text-slate-900 font-mono mt-1">
                  ₹{approvedInvoices.reduce((s, i) => s + i.igst_amount, 0).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-bold text-emerald-800 uppercase">Total GST Collected</span>
                <p className="text-base font-black text-emerald-950 font-mono mt-1">
                  ₹{approvedInvoices.reduce((s, i) => s + i.total_gst, 0).toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DIALOG: RECORD PAYMENT MODAL                                              */}
      {/* ========================================================================= */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md rounded-[24px] border border-slate-300 bg-white p-6">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-lg font-extrabold text-[#111827]">
              Record Payment Receipt
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Receipt will automatically update invoice outstanding balance and audit ledgers.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Client</label>
              <select
                value={paymentClientId}
                onChange={(e) => {
                  setPaymentClientId(e.target.value);
                  setPaymentInvoiceId("");
                }}
                required
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold mt-1"
              >
                <option value="">Select client...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Allocate to Invoice (Optional)</label>
              <select
                value={paymentInvoiceId}
                onChange={(e) => {
                  setPaymentInvoiceId(e.target.value);
                  const inv = invoices.find((i) => i.id === e.target.value);
                  if (inv) setPaymentAmount(inv.outstanding_balance);
                }}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold mt-1"
              >
                <option value="">Direct Advance / Unallocated</option>
                {invoices
                  .filter((i) => i.client_id === paymentClientId && i.outstanding_balance > 0)
                  .map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} (Outstanding: ₹{inv.outstanding_balance.toLocaleString("en-IN")})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Amount Received (₹)</label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-9 rounded-xl border-slate-300 text-xs font-bold mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Payment Date</label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 text-xs font-bold mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold mt-1"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="NEFT">NEFT</option>
                  <option value="RTGS">RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Reference / UTR #</label>
                <Input
                  type="text"
                  placeholder="e.g. UTR1928301"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 text-xs mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Remarks</label>
              <Input
                type="text"
                placeholder="Optional payment notes..."
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                className="h-9 rounded-xl border-slate-300 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold px-5"
              >
                Save Receipt
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: RECURRING SCHEDULE CREATION MODAL                                  */}
      {/* ========================================================================= */}
      <Dialog open={isRecurringModalOpen} onOpenChange={setIsRecurringModalOpen}>
        <DialogContent className="max-w-lg rounded-[24px] border border-slate-300 bg-white p-6">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-lg font-extrabold text-[#111827]">
              New Recurring Retainer Schedule
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Set up automated retainer billing cycles independent of task deliverables.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecurring} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Client</label>
              <select
                value={recClientId}
                onChange={(e) => setRecClientId(e.target.value)}
                required
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold mt-1"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Retainer Title / Scope</label>
              <Input
                type="text"
                required
                placeholder="e.g. Monthly GST Compliance & Advisory Retainer"
                value={recTitle}
                onChange={(e) => setRecTitle(e.target.value)}
                className="h-9 rounded-xl border-slate-300 text-xs font-bold mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Billing Frequency</label>
                <select
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold mt-1"
                >
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Base Retainer Amount (₹)</label>
                <Input
                  type="number"
                  min={1}
                  required
                  value={recBaseAmount}
                  onChange={(e) => setRecBaseAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="h-9 rounded-xl border-slate-300 text-xs font-bold mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700">GST Rate</label>
                <select
                  value={recGstRate}
                  onChange={(e) => setRecGstRate(Number(e.target.value))}
                  className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold mt-1"
                >
                  <option value={18}>18% (Standard GST)</option>
                  <option value={12}>12%</option>
                  <option value={0}>0%</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">First / Next Billing Date</label>
                <Input
                  type="date"
                  required
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                  className="h-9 rounded-xl border-slate-300 text-xs font-bold mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700">Internal Notes</label>
              <Input
                type="text"
                placeholder="Optional notes..."
                value={recNotes}
                onChange={(e) => setRecNotes(e.target.value)}
                className="h-9 rounded-xl border-slate-300 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRecurringModalOpen(false)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold px-5"
              >
                Create Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG: REJECTION COMMENT MODAL                                           */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(rejectingRequestId)} onOpenChange={() => setRejectingRequestId(null)}>
        <DialogContent className="max-w-md rounded-[24px] border border-slate-300 bg-white p-6">
          <DialogHeader className="border-b border-slate-200 pb-3">
            <DialogTitle className="text-lg font-extrabold text-[#111827]">
              Reject Invoice Request
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please enter the reason for rejecting this invoice request. Any reserved task amounts will be returned to available status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-700">Reason for Rejection *</label>
              <Textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Scope adjustment required / tasks pending final partner sign-off..."
                className="rounded-xl border-slate-300 text-xs mt-1"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejectingRequestId(null)}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleRejectRequest}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold px-5"
              >
                Confirm Rejection
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Chat Dialog for Reminders */}
      <WhatsAppChatDialog
        open={whatsAppModal.open}
        onOpenChange={(open) => setWhatsAppModal((prev) => ({ ...prev, open }))}
        contextType="client"
        client={whatsAppModal.client}
        customInitialMessage={whatsAppModal.customMessage}
      />
    </div>
  );
}