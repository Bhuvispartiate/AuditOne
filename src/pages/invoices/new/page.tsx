import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  Calculator,
  CheckCircle2,
  Briefcase,
  FolderKanban,
  Receipt,
  CreditCard,
  Percent,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { InvoiceItem, PaymentMode } from "@/types";
import { formatInrExact, formatInrWords, LMA_SUPPLIER } from "@/lib/invoice-template";
import { toast } from "sonner";

const INDIAN_STATES = [
  "Tamil Nadu (33)",
  "Maharashtra (27)",
  "Karnataka (29)",
  "Delhi (07)",
  "Telangana (36)",
  "Gujarat (24)",
  "Kerala (32)",
  "Andhra Pradesh (37)",
  "West Bengal (19)",
  "Uttar Pradesh (09)",
  "Rajasthan (08)",
  "Haryana (06)",
];

const PAYMENT_TERMS_OPTIONS = [
  "Due on receipt",
  "Net 7 Days",
  "Net 15 Days",
  "Net 30 Days",
];

const PAYMENT_MODES: PaymentMode[] = [
  "UPI",
  "Bank Transfer",
  "NEFT",
  "RTGS",
  "Cheque",
  "Cash",
  "Credit Card",
];

interface DraftLineItem {
  id: string;
  requirementKey?: string;
  service_id?: string;
  description: string;
  sub_description: string;
  sac_code: string;
  quantity: number;
  rate: number;
  discount: number;
  gst_rate: number;
}

function getCurrentFinancialYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1; // 1-12
  const startYear = m >= 4 ? y : y - 1;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

export default function NewInvoicePage() {
  const navigate = useNavigate();
  const [, setVersion] = useState(0);

  useEffect(() => {
    return pmsStore.subscribe(() => setVersion((v) => v + 1));
  }, []);

  const clients = pmsStore.getClients();
  const services = pmsStore.getServices();
  const projects = pmsStore.getProjects();
  const existingInvoices = pmsStore.getInvoices();

  const defaultFY = useMemo(() => getCurrentFinancialYear(), []);
  const defaultInvoiceNumber = useMemo(
    () => `LMA/${defaultFY}/${String(754 + existingInvoices.length).padStart(4, "0")}`,
    [defaultFY, existingInvoices.length]
  );

  const todayStr = new Date().toISOString().split("T")[0];

  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || "");
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber);
  const [financialYear, setFinancialYear] = useState(defaultFY);
  const [invoiceDate, setInvoiceDate] = useState(todayStr);
  const [dueDate, setDueDate] = useState(todayStr);
  const [termsLabel, setTermsLabel] = useState("Due on receipt");
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(LMA_SUPPLIER.homeState);

  // TDS State (fully customizable)
  const [tdsSection, setTdsSection] = useState("194J");
  const [tdsRate, setTdsRate] = useState<number>(10);

  // Initial Payment Status
  const [paymentChoice, setPaymentChoice] = useState<"Pending" | "Partially Paid" | "Paid">("Pending");
  const [initialPaidAmount, setInitialPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<DraftLineItem[]>([
    {
      id: "line-1",
      description: "GST Return Filing Fee",
      sub_description: "Towards GST return filing fee for monthly compliance",
      sac_code: "998224",
      quantity: 1,
      rate: 1250,
      discount: 0,
      gst_rate: 18,
    },
  ]);

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const clientEngagements = useMemo(
    () => (selectedClientId ? pmsStore.getEngagementsByClientId(selectedClientId) : []),
    [selectedClientId, existingInvoices.length]
  );
  const clientProjects = useMemo(
    () => (selectedClientId ? projects.filter((p) => p.client_id === selectedClientId) : []),
    [projects, selectedClientId]
  );

  // Build unified selectable requirements list from client's subscribed services & projects
  const clientRequirements = useMemo(() => {
    const reqs: Array<{
      key: string;
      kind: "service" | "project";
      serviceId?: string;
      title: string;
      subtitle: string;
      fee: number;
      gstRate: number;
      sacCode: string;
      status: string;
    }> = [];

    clientEngagements.forEach((eng) => {
      const svc = services.find((s) => s.id === eng.service_id);
      const title = eng.service_name || svc?.service_name || "Professional Service";
      reqs.push({
        key: `eng:${eng.id}`,
        kind: "service",
        serviceId: eng.service_id,
        title,
        subtitle: `Towards ${title} (${eng.billing_frequency} Engagement)`,
        fee: eng.agreed_fee || svc?.default_fee || 0,
        gstRate: eng.gst_rate ?? svc?.default_gst_rate ?? 18,
        sacCode: "998224",
        status: eng.status,
      });
    });

    clientProjects.forEach((proj) => {
      const matchedSvc = services.find(
        (s) => s.service_name.toLowerCase() === (proj.service_name || "").toLowerCase()
      );
      reqs.push({
        key: `prj:${proj.id}`,
        kind: "project",
        serviceId: matchedSvc?.id,
        title: proj.project_name,
        subtitle: `Towards ${proj.service_name || proj.project_name} (${proj.project_code})`,
        fee: matchedSvc?.default_fee || 5000,
        gstRate: matchedSvc?.default_gst_rate ?? 18,
        sacCode: "998224",
        status: proj.status,
      });
    });

    return reqs;
  }, [clientEngagements, clientProjects, services]);

  const handleClientChange = (cid: string) => {
    setSelectedClientId(cid);
    const cli = clients.find((c) => c.id === cid);
    const cliState = cli?.addresses?.[0]?.state;
    if (cliState) {
      const matched = INDIAN_STATES.find((st) =>
        st.toLowerCase().includes(cliState.toLowerCase())
      );
      setPlaceOfSupply(matched || `${cliState}`);
    } else {
      setPlaceOfSupply(LMA_SUPPLIER.homeState);
    }

    // Auto-populate first active client service requirement if client has subscribed services
    const engs = pmsStore.getEngagementsByClientId(cid);
    if (engs.length > 0) {
      setItems(
        engs.map((eng, idx) => {
          const svc = services.find((s) => s.id === eng.service_id);
          const title = eng.service_name || svc?.service_name || "Professional Service";
          return {
            id: `req-${Date.now()}-${idx}`,
            requirementKey: `eng:${eng.id}`,
            service_id: eng.service_id,
            description: title,
            sub_description: `Towards ${title} (${eng.billing_frequency})`,
            sac_code: "998224",
            quantity: 1,
            rate: eng.agreed_fee || svc?.default_fee || 0,
            discount: 0,
            gst_rate: eng.gst_rate ?? svc?.default_gst_rate ?? 18,
          };
        })
      );
    }
  };

  const handleDueTermsPreset = (terms: string) => {
    setTermsLabel(terms);
    const base = new Date(invoiceDate || todayStr);
    if (Number.isNaN(base.getTime())) return;
    let addDays = 0;
    if (terms === "Net 7 Days") addDays = 7;
    if (terms === "Net 15 Days") addDays = 15;
    if (terms === "Net 30 Days") addDays = 30;
    base.setDate(base.getDate() + addDays);
    setDueDate(base.toISOString().split("T")[0]);
  };

  const toggleRequirementItem = (req: (typeof clientRequirements)[number]) => {
    const exists = items.some((it) => it.requirementKey === req.key);
    if (exists) {
      if (items.length === 1) {
        toast.info("Invoice must keep at least 1 line item.");
        return;
      }
      setItems((prev) => prev.filter((it) => it.requirementKey !== req.key));
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          requirementKey: req.key,
          service_id: req.serviceId,
          description: req.title,
          sub_description: req.subtitle,
          sac_code: req.sacCode,
          quantity: 1,
          rate: req.fee,
          discount: 0,
          gst_rate: req.gstRate,
        },
      ]);
    }
  };

  const isInterstate = !placeOfSupply.toLowerCase().includes("tamil nadu");

  const addLineItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        description: "",
        sub_description: "",
        sac_code: "998224",
        quantity: 1,
        rate: 0,
        discount: 0,
        gst_rate: 18,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof DraftLineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Tax & Totals Calculation Engine matching 0754-tax-invoice.html
  const calcs = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const processedItems: InvoiceItem[] = items.map((item) => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      const disc = Math.max(0, Number(item.discount) || 0);
      const gstRate = Math.max(0, Number(item.gst_rate) || 0);

      const lineBase = qty * rate;
      const taxable = Math.max(0, lineBase - disc);
      const gstAmt = (taxable * gstRate) / 100;

      const cgst = isInterstate ? 0 : gstAmt / 2;
      const sgst = isInterstate ? 0 : gstAmt / 2;
      const igst = isInterstate ? gstAmt : 0;

      subtotal += lineBase;
      totalDiscount += disc;
      totalTaxable += taxable;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;

      return {
        id: item.id,
        service_id: item.service_id,
        description: item.description || "Professional Advisory Services",
        sub_description: item.sub_description || "",
        sac_code: item.sac_code || "998224",
        quantity: qty,
        rate,
        discount_amount: disc,
        taxable_amount: taxable,
        gst_rate: gstRate,
        cgst_amount: cgst,
        sgst_amount: sgst,
        igst_amount: igst,
        total_amount: taxable + gstAmt,
      };
    });

    const totalGst = totalCgst + totalSgst + totalIgst;
    const grandTotal = totalTaxable + totalGst;
    const safeTdsRate = Math.max(0, Number(tdsRate) || 0);
    const tdsAmount = Math.round(((totalTaxable * safeTdsRate) / 100) * 100) / 100;
    const netPayable = Math.max(0, Math.round((grandTotal - tdsAmount) * 100) / 100);

    return {
      processedItems,
      subtotal,
      totalDiscount,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst,
      grandTotal,
      tdsAmount,
      netPayable,
    };
  }, [items, isInterstate, tdsRate]);

  const effectivePaidNow = useMemo(() => {
    if (paymentChoice === "Paid") return calcs.netPayable;
    if (paymentChoice === "Partially Paid") {
      return Math.max(0, Math.min(Number(initialPaidAmount) || 0, calcs.netPayable));
    }
    return 0;
  }, [paymentChoice, initialPaidAmount, calcs.netPayable]);

  const effectivePendingBalance = Math.max(0, calcs.netPayable - effectivePaidNow);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) {
      toast.error("Please select a client.");
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      toast.error("Please provide a title/description for every line item.");
      return;
    }
    if (calcs.netPayable <= 0 && calcs.grandTotal <= 0) {
      toast.error("Invoice total must be greater than ₹0.00.");
      return;
    }

    const addrObj = selectedClient.addresses?.[0];
    const addrText = addrObj
      ? [
          addrObj.street_address,
          addrObj.city,
          `${addrObj.state}${addrObj.pin_code ? ` - ${addrObj.pin_code}` : ""}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "Registered Office Address";

    const invStatus =
      paymentChoice === "Paid"
        ? "Paid"
        : paymentChoice === "Partially Paid" && effectivePaidNow > 0
          ? "Partially Paid"
          : "Finalized";

    try {
      const newInvoice = await pmsStore.addInvoice({
        invoice_number: invoiceNumber.trim() || undefined,
        financial_year: financialYear,
        client_id: selectedClient.id,
        client_name: selectedClient.reference_name || selectedClient.legal_name,
        client_legal_name: selectedClient.legal_name,
        client_address: addrText,
        client_pan: selectedClient.registration?.pan,
        client_gstin: selectedClient.registration?.gstin,
        client_state: addrObj?.state || placeOfSupply,
        client_contact: selectedClient.contact?.mobile_number || selectedClient.contact?.email,
        invoice_date: invoiceDate,
        due_date: dueDate,
        terms_label: termsLabel.trim() || "Due on receipt",
        place_of_supply: placeOfSupply,
        is_interstate: isInterstate,
        reverse_charge: false,
        subtotal: calcs.subtotal,
        discount_amount: calcs.totalDiscount,
        taxable_amount: calcs.totalTaxable,
        cgst_amount: calcs.totalCgst,
        sgst_amount: calcs.totalSgst,
        igst_amount: calcs.totalIgst,
        total_gst: calcs.totalGst,
        grand_total: calcs.grandTotal,
        tds_section: tdsRate > 0 ? tdsSection.trim() : "",
        tds_rate: tdsRate,
        tds_amount: calcs.tdsAmount,
        net_payable: calcs.netPayable,
        status: invStatus,
        notes,
        terms_conditions: `Terms: ${termsLabel}. Make payments via UPI (${LMA_SUPPLIER.upiId}) or NEFT/RTGS to ${LMA_SUPPLIER.bank.bankName}.`,
        items: calcs.processedItems,
        initial_paid_amount: effectivePaidNow,
        payment_mode: paymentMode,
        transaction_reference: transactionRef.trim(),
      });

      toast.success(`Tax Invoice ${newInvoice.invoice_number} saved directly to Supabase!`);
      navigate(`/invoices/${newInvoice.id}`);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to generate invoice."}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/invoices")}
            className="h-9 w-9 rounded-xl border border-slate-300 bg-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Generate Tax Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {LMA_SUPPLIER.legalName} &bull; GSTIN: {LMA_SUPPLIER.gstin} &bull; Template LMA Format
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs px-3 py-1 rounded-full bg-white border-slate-300 text-[#19196f]">
            {invoiceNumber || defaultInvoiceNumber}
          </Badge>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Builder Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Client & Invoice Metadata Card (Box View) */}
          <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none">
            <CardHeader className="pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-indigo-50 text-[#19196f] flex items-center justify-center">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Client, Dates &amp; Supply Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Select client to auto-pull subscribed services &amp; determine CGST/SGST vs IGST
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Select Client *
                  </label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#19196f]"
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Registered Client --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legal_name} ({c.client_code})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClient && (
                  <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{selectedClient.legal_name}</div>
                      <div className="text-slate-500 mt-0.5">
                        {selectedClient.addresses?.[0]
                          ? `${selectedClient.addresses[0].street_address}, ${selectedClient.addresses[0].city}, ${selectedClient.addresses[0].state} - ${selectedClient.addresses[0].pin_code}`
                          : "No street address on profile"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-white font-mono text-[11px]">
                        GSTIN: {selectedClient.registration?.gstin || "Unregistered"}
                      </Badge>
                      {selectedClient.registration?.pan && (
                        <Badge variant="outline" className="bg-white font-mono text-[11px]">
                          PAN: {selectedClient.registration.pan}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Invoice Number
                  </label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="LMA/2026-27/0754"
                    className="h-10 rounded-xl border-slate-300 font-mono text-sm font-semibold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Place of Supply
                  </label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#19196f]"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Invoice Date
                  </label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-300"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="h-10 rounded-xl border-slate-300"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Terms Label
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PAYMENT_TERMS_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => handleDueTermsPreset(t)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          termsLabel === t
                            ? "bg-[#19196f] text-white border-[#19196f]"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Financial Year
                  </label>
                  <Input
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="h-10 rounded-xl border-slate-300 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1 text-xs">
                <Badge
                  variant={isInterstate ? "warning" : "success"}
                  className="font-mono text-[10px] rounded-full"
                >
                  {isInterstate
                    ? "INTER-STATE SUPPLY (IGST 18%)"
                    : "INTRA-STATE SUPPLY • TAMIL NADU (CGST 9% + SGST 9%)"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Pulled Client Requirements / Services & Projects */}
          {selectedClient && clientRequirements.length > 0 && (
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none">
              <CardHeader className="pb-3 border-b border-slate-200">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <Briefcase className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">
                        Client Requirements &amp; Active Services ({clientRequirements.length})
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Click any service or project to include or remove it from this invoice
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {clientRequirements.map((req) => {
                    const selected = items.some((it) => it.requirementKey === req.key);
                    return (
                      <button
                        key={req.key}
                        type="button"
                        onClick={() => toggleRequirementItem(req)}
                        className={`text-left rounded-2xl border-[1.5px] p-3.5 transition-all flex items-start justify-between gap-3 ${
                          selected
                            ? "border-[#19196f] bg-indigo-50/50 shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5">
                            {req.kind === "service" ? (
                              <Briefcase className="h-3.5 w-3.5 text-[#19196f] shrink-0" />
                            ) : (
                              <FolderKanban className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            )}
                            <span className="font-bold text-xs text-slate-900 truncate">
                              {req.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{req.subtitle}</p>
                          <div className="flex items-center gap-2 text-[11px] font-semibold">
                            <span className="text-[#19196f]">{formatInrExact(req.fee)}</span>
                            <span className="text-slate-400">&bull;</span>
                            <span className="text-slate-500">GST {req.gstRate}%</span>
                          </div>
                        </div>
                        <div
                          className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            selected ? "bg-[#19196f] text-white" : "border border-slate-300 bg-slate-50"
                          }`}
                        >
                          {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items Builder (Box View) */}
          <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none">
            <CardHeader className="pb-3 border-b border-slate-200 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Receipt className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Invoice Line Items ({items.length})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Rendered in clean Description + Subtitle + SAC table format
                  </CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="h-8 rounded-xl border-slate-300 text-xs font-bold gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add Custom Line
              </Button>
            </CardHeader>

            <CardContent className="p-5 space-y-4">
              {items.map((item, idx) => {
                const lineTaxable = Math.max(
                  0,
                  (Number(item.quantity) || 0) * (Number(item.rate) || 0) -
                    (Number(item.discount) || 0)
                );

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900 text-white">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-[#19196f]">
                          Line Taxable: {formatInrExact(lineTaxable)}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(item.id)}
                          disabled={items.length === 1}
                          className="h-7 w-7 text-slate-400 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Service / Requirement Title *
                        </label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, "description", e.target.value)}
                          placeholder="e.g. GST Return Filing Fee"
                          className="h-9 bg-white border-slate-300 rounded-xl text-sm font-semibold"
                          required
                        />
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Subtitle / Period Detail
                        </label>
                        <Input
                          value={item.sub_description}
                          onChange={(e) => updateItem(item.id, "sub_description", e.target.value)}
                          placeholder="e.g. Towards GST return filing fee for July, 2026"
                          className="h-9 bg-white border-slate-300 rounded-xl text-xs"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">SAC Code</label>
                        <Input
                          value={item.sac_code}
                          onChange={(e) => updateItem(item.id, "sac_code", e.target.value)}
                          placeholder="998224"
                          className="h-9 bg-white border-slate-300 rounded-xl font-mono text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Qty</label>
                        <Input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                          className="h-9 bg-white border-slate-300 rounded-xl text-xs text-center"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Rate (₹)</label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, "rate", Number(e.target.value))}
                          className="h-9 bg-white border-slate-300 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Discount (₹)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, "discount", Number(e.target.value))}
                          className="h-9 bg-white border-slate-300 rounded-xl text-xs"
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">GST %</label>
                        <select
                          className="flex h-9 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs font-semibold"
                          value={item.gst_rate}
                          onChange={(e) => updateItem(item.id, "gst_rate", Number(e.target.value))}
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* TDS & Payment Status Recording Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customizable TDS Box */}
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none">
              <CardHeader className="pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                    <Percent className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    TDS Deduction (Customizable)
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "No TDS (0%)", sec: "", rate: 0 },
                    { label: "194J (10%)", sec: "194J", rate: 10 },
                    { label: "194J(a) Tech (2%)", sec: "194J", rate: 2 },
                    { label: "194C (2%)", sec: "194C", rate: 2 },
                  ].map((preset) => {
                    const active = tdsRate === preset.rate && (preset.rate === 0 || tdsSection === preset.sec);
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setTdsSection(preset.sec);
                          setTdsRate(preset.rate);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                          active
                            ? "bg-rose-700 text-white border-rose-700"
                            : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      TDS Section
                    </label>
                    <Input
                      value={tdsSection}
                      onChange={(e) => setTdsSection(e.target.value)}
                      placeholder="194J"
                      className="h-9 rounded-xl border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Custom TDS Rate (%)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      step="0.5"
                      value={tdsRate}
                      onChange={(e) => setTdsRate(Number(e.target.value))}
                      className="h-9 rounded-xl border-slate-300 text-xs font-bold"
                    />
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 pt-1">
                  Calculated TDS on Taxable Amount:{" "}
                  <strong className="text-rose-700">(-) {formatInrExact(calcs.tdsAmount)}</strong>
                </div>
              </CardContent>
            </Card>

            {/* Initial Payment Recording Box */}
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none">
              <CardHeader className="pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <CreditCard className="h-3.5 w-3.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Payment Status at Generation
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {(["Pending", "Partially Paid", "Paid"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        setPaymentChoice(status);
                        if (status === "Paid") setInitialPaidAmount(calcs.netPayable);
                        if (status === "Pending") setInitialPaidAmount(0);
                      }}
                      className={`py-2 px-2 rounded-xl text-[11px] font-bold border transition-colors ${
                        paymentChoice === status
                          ? status === "Paid"
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : status === "Partially Paid"
                              ? "bg-amber-600 text-white border-amber-600"
                              : "bg-slate-900 text-white border-slate-900"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {paymentChoice !== "Pending" && (
                  <div className="space-y-2.5 pt-1">
                    {paymentChoice === "Partially Paid" && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          Paid Amount (₹)
                        </label>
                        <Input
                          type="number"
                          min={0}
                          max={calcs.netPayable}
                          step="0.01"
                          value={initialPaidAmount}
                          onChange={(e) => setInitialPaidAmount(Number(e.target.value))}
                          className="h-9 rounded-xl border-slate-300 text-xs font-bold text-emerald-700"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Mode</label>
                        <select
                          className="flex h-9 w-full rounded-xl border border-slate-300 bg-white px-2 text-xs font-medium"
                          value={paymentMode}
                          onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                        >
                          {PAYMENT_MODES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">
                          UTR / Ref
                        </label>
                        <Input
                          value={transactionRef}
                          onChange={(e) => setTransactionRef(e.target.value)}
                          placeholder="Optional ref #"
                          className="h-9 rounded-xl border-slate-300 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Balance Pending:</span>
                  <span className="font-extrabold text-amber-700">
                    {formatInrExact(effectivePendingBalance)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky Live LMA Tax Summary Sidebar */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 space-y-4">
            <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none overflow-hidden">
              <div className="h-1.5 w-full bg-[#19196f]" />
              <CardHeader className="pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-[#19196f]" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Invoice Preview Summary
                  </CardTitle>
                </div>
                <CardDescription className="text-[11px]">
                  Exact calculations matching LMA Tax Invoice template
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-3 text-xs">
                <div className="space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Sub Total</span>
                    <span className="font-semibold text-slate-900">
                      {formatInrExact(calcs.subtotal)}
                    </span>
                  </div>

                  {calcs.totalDiscount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount</span>
                      <span className="font-semibold text-rose-700">
                        (-) {formatInrExact(calcs.totalDiscount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Taxable Amount</span>
                    <span className="font-semibold text-slate-900">
                      {formatInrExact(calcs.totalTaxable)}
                    </span>
                  </div>

                  {isInterstate ? (
                    <div className="flex justify-between text-slate-600">
                      <span>IGST</span>
                      <span className="font-semibold text-slate-900">
                        {formatInrExact(calcs.totalIgst)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between text-slate-600">
                        <span>CGST</span>
                        <span className="font-semibold text-slate-900">
                          {formatInrExact(calcs.totalCgst)}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>SGST</span>
                        <span className="font-semibold text-slate-900">
                          {formatInrExact(calcs.totalSgst)}
                        </span>
                      </div>
                    </>
                  )}

                  {calcs.tdsAmount > 0 && (
                    <div className="flex justify-between text-rose-700 font-medium">
                      <span>
                        TDS Withheld {tdsSection ? `(${tdsSection} • ${tdsRate}%)` : `(${tdsRate}%)`}
                      </span>
                      <span>(-) {formatInrExact(calcs.tdsAmount)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t-2 border-[#19196f] flex items-center justify-between">
                  <span className="text-sm font-extrabold text-slate-900">Total Payable</span>
                  <span className="text-xl font-extrabold text-[#19196f]">
                    {formatInrExact(calcs.netPayable)}
                  </span>
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600 leading-relaxed">
                  In Words: <strong className="text-slate-900">{formatInrWords(calcs.netPayable)}</strong>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      Paid Now
                    </span>
                    <span className="text-xs font-extrabold text-emerald-800">
                      {formatInrExact(effectivePaidNow)}
                    </span>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase text-amber-700 block">
                      Pending
                    </span>
                    <span className="text-xs font-extrabold text-amber-800">
                      {formatInrExact(effectivePendingBalance)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <label className="text-[11px] font-semibold text-slate-500">
                    Internal Remarks (Optional)
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes for internal ledger..."
                    className="h-9 rounded-xl border-slate-300 text-xs"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 rounded-xl bg-[#19196f] hover:bg-[#141458] text-white font-bold text-sm gap-2 mt-2"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Generate Tax Invoice
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
