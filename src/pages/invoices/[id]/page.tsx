import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Download,
  CreditCard,
  Ban,
  CheckCircle2,
  FileCode2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { pmsStore } from "@/lib/data/store";
import { PaymentMode } from "@/types";
import { formatDate } from "@/lib/utils";
import {
  LMA_SUPPLIER,
  buildStandaloneTaxInvoiceHtml,
  buildUpiUri,
  formatClientStateDisplay,
  formatInrExact,
  formatInrWords,
  formatLongDate,
  getInvoiceNetPayable,
  prepareInvoiceAssetDataUrls,
} from "@/lib/invoice-template";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const PAYMENT_MODES: PaymentMode[] = [
  "UPI",
  "Bank Transfer",
  "NEFT",
  "RTGS",
  "Cheque",
  "Cash",
  "Credit Card",
];

export default function InvoiceDetailsPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = params.id as string;

  const [, setVersion] = useState(0);
  useEffect(() => {
    return pmsStore.subscribe(() => setVersion((v) => v + 1));
  }, []);

  const invoice = pmsStore.getInvoiceById(id);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(invoice?.outstanding_balance || 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("UPI");
  const [paymentRef, setPaymentRef] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  if (!invoice) {
    return (
      <div className="p-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Invoice Not Found</h2>
        <Button onClick={() => navigate("/invoices")}>Back to Billing Register</Button>
      </div>
    );
  }

  const netPayable = getInvoiceNetPayable(invoice);
  const upiUri = buildUpiUri(invoice.invoice_number, netPayable);
  const inWords = formatInrWords(netPayable);
  const placeDisplay = formatClientStateDisplay(invoice.place_of_supply);
  const termsDisplay = invoice.terms_label || "Due on receipt";
  const clientPayments = pmsStore.getPayments().filter((p) => p.invoice_id === invoice.id);

  const effectiveGstRate =
    invoice.taxable_amount > 0
      ? Math.round((invoice.total_gst / invoice.taxable_amount) * 1000) / 10
      : 18;
  const halfGstRate = Math.round((effectiveGstRate / 2) * 10) / 10;

  const handleFinalize = () => {
    pmsStore.finalizeInvoice(invoice.id);
    toast.success(`Invoice ${invoice.invoice_number} finalized.`);
  };

  const handleCancelInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) return;
    pmsStore.cancelInvoice(invoice.id, cancelReason);
    toast.error(`Invoice ${invoice.invoice_number} cancelled.`);
    setIsCancelModalOpen(false);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0 || amt > invoice.outstanding_balance + 0.01) {
      toast.error("Please enter a valid payment amount within balance due.");
      return;
    }

    pmsStore.recordPayment({
      client_id: invoice.client_id,
      client_name: invoice.client_name || invoice.client_legal_name,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      payment_date: new Date().toISOString().split("T")[0],
      amount: amt,
      payment_mode: paymentMode,
      transaction_reference: paymentRef.trim(),
      received_by_name: pmsStore.getCurrentUser()?.full_name || "Partner",
      status: "Completed",
    });

    toast.success(`Payment of ${formatInrExact(amt)} allocated!`);
    setIsPaymentModalOpen(false);
  };

  const handleDownloadHTML = async () => {
    setIsExporting(true);
    try {
      const assets = await prepareInvoiceAssetDataUrls();
      const html = buildStandaloneTaxInvoiceHtml(invoice, assets);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice.invoice_number.replace(/\//g, "-")}-tax-invoice.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Standalone HTML Tax Invoice downloaded!");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const assets = await prepareInvoiceAssetDataUrls();

      // Logo (optional base64 png)
      if (assets.logoSrc.startsWith("data:image/png")) {
        try {
          doc.addImage(assets.logoSrc, "PNG", 14, 12, 34, 11);
        } catch {
          // Ignore image decoding edge cases
        }
      }

      // Header right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(25, 25, 111);
      doc.text("TAX INVOICE", 196, 18, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Invoice No: ${invoice.invoice_number}`, 196, 25, { align: "right" });
      doc.text(`Date: ${formatLongDate(invoice.invoice_date)}`, 196, 30, { align: "right" });
      doc.text(`Due Date: ${formatLongDate(invoice.due_date)}`, 196, 35, { align: "right" });

      // Brand details left
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(LMA_SUPPLIER.legalName, 14, 28);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `CIN: ${LMA_SUPPLIER.cin} • GSTIN: ${LMA_SUPPLIER.gstin} • PAN: ${LMA_SUPPLIER.pan}`,
        14,
        33
      );

      // Accent divider
      doc.setDrawColor(25, 25, 111);
      doc.setLineWidth(0.8);
      doc.line(14, 40, 196, 40);

      // Bill To & Supplier Boxes
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(14, 45, 88, 34, 2, 2, "FD");
      doc.roundedRect(108, 45, 88, 34, 2, 2, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("BILL TO (CLIENT)", 18, 51);
      doc.text("SUPPLIER & SUPPLY DETAILS", 112, 51);

      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(invoice.client_legal_name, 18, 56, { maxWidth: 80 });
      doc.text(LMA_SUPPLIER.shortName, 112, 56, { maxWidth: 80 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const clientLines = [
        ...invoice.client_address.split(/\r?\n/),
        `GSTIN: ${invoice.client_gstin || "Unregistered"}${invoice.client_pan ? ` | PAN: ${invoice.client_pan}` : ""}`,
      ];
      doc.text(clientLines, 18, 61, { maxWidth: 80 });

      doc.text(
        [
          LMA_SUPPLIER.addressLine1,
          LMA_SUPPLIER.addressLine2,
          `${LMA_SUPPLIER.email} | ${LMA_SUPPLIER.phone}`,
          `Terms: ${termsDisplay} | Supply: ${placeDisplay}`,
        ],
        112,
        61,
        { maxWidth: 80 }
      );

      // Items Table
      autoTable(doc, {
        startY: 85,
        head: [["#", "Description", "SAC", "Amount (INR)"]],
        body: invoice.items.map((item, idx) => [
          String(idx + 1).padStart(2, "0"),
          item.sub_description ? `${item.description}\n${item.sub_description}` : item.description,
          item.sac_code || "998224",
          `Rs. ${item.taxable_amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8.5, fontStyle: "bold" },
        styles: { fontSize: 8.5, cellPadding: 3.5, textColor: [15, 23, 42] },
        columnStyles: {
          0: { halign: "center", cellWidth: 12 },
          2: { halign: "center", cellWidth: 24 },
          3: { halign: "right", cellWidth: 34, fontStyle: "bold" },
        },
      });

      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

      // Bank & In Words (Left)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, finalY, 108, 44, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("BANK ACCOUNT DETAILS", 18, finalY + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        [
          `Title: ${LMA_SUPPLIER.bank.title}`,
          `A/c No: ${LMA_SUPPLIER.bank.accountNumber} (${LMA_SUPPLIER.bank.nature})`,
          `Bank: ${LMA_SUPPLIER.bank.bankName}`,
          `IFSC: ${LMA_SUPPLIER.bank.ifsc}  |  UPI: ${LMA_SUPPLIER.upiId}`,
        ],
        18,
        finalY + 12
      );
      doc.setFont("helvetica", "bold");
      doc.text(`In Words: ${inWords}`, 18, finalY + 38, { maxWidth: 100 });

      // Totals Box (Right)
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(128, finalY, 68, 44, 2, 2, "FD");
      const totalsLines: Array<[string, number, boolean?]> = [
        ["Sub Total", invoice.subtotal],
        ["Taxable Amount", invoice.taxable_amount],
      ];
      if (invoice.is_interstate) {
        totalsLines.push([`IGST (${effectiveGstRate}%)`, invoice.igst_amount]);
      } else {
        totalsLines.push([`CGST (${halfGstRate}%)`, invoice.cgst_amount]);
        totalsLines.push([`SGST (${halfGstRate}%)`, invoice.sgst_amount]);
      }
      if ((invoice.tds_amount || 0) > 0) {
        totalsLines.push([
          `TDS (${invoice.tds_section || "Withheld"})`,
          -(invoice.tds_amount || 0),
          true,
        ]);
      }

      let ty = finalY + 6;
      doc.setFontSize(8);
      totalsLines.forEach(([label, val, isRed]) => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(label, 132, ty);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(isRed ? 185 : 15, isRed ? 28 : 23, isRed ? 28 : 42);
        const formatted = `${val < 0 ? "(-) " : ""}Rs. ${Math.abs(val).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        doc.text(formatted, 192, ty, { align: "right" });
        ty += 5.5;
      });

      doc.setDrawColor(25, 25, 111);
      doc.line(128, finalY + 35, 196, finalY + 35);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(25, 25, 111);
      doc.text("Total", 132, finalY + 41);
      doc.text(
        `Rs. ${netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        192,
        finalY + 41,
        { align: "right" }
      );

      // Footer & Signature
      const footerY = 264;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, footerY - 6, 196, footerY - 6);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`Thank you for partnering with ${LMA_SUPPLIER.brandName}`, 14, footerY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Contact: ${LMA_SUPPLIER.email} | ${LMA_SUPPLIER.phone}`, 14, footerY + 5);

      if (assets.signSrc.startsWith("data:image/png")) {
        try {
          doc.addImage(assets.signSrc, "PNG", 158, footerY - 5, 34, 10);
        } catch {
          // Ignore image errors
        }
      }
      doc.setDrawColor(15, 23, 42);
      doc.line(146, footerY + 7, 196, footerY + 7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(LMA_SUPPLIER.signatoryName, 196, footerY + 12, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(LMA_SUPPLIER.signatoryTitle, 196, footerY + 16, { align: "right" });

      doc.save(`${invoice.invoice_number.replace(/\//g, "-")}.pdf`);
      toast.success("PDF Tax Invoice downloaded!");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Scoped Styles Matching 0754-tax-invoice.html */}
      <style>{`
        .lma-invoice-sheet {
          max-width: 820px;
          min-height: 1080px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 14px;
          padding: 44px 48px;
          box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
          border: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          color: #111827;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .lma-invoice-sheet .inv-divider {
          height: 2.5px;
          margin: 22px 0 26px;
          background: linear-gradient(90deg, #19196f 0%, rgba(25, 25, 111, 0.4) 60%, rgba(25, 25, 111, 0) 100%);
        }
        .lma-invoice-sheet thead th {
          background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%);
          color: #ffffff;
        }
        @page {
          size: A4 portrait;
          margin: 12mm 14mm 12mm 14mm;
        }
        @media print {
          .lma-invoice-sheet {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            max-width: 100% !important;
            min-height: calc(297mm - 24mm) !important;
          }
          .lma-invoice-sheet .inv-divider {
            background: #19196f !important;
          }
        }
      `}</style>

      {/* Top Interactive Toolbar (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
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
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 font-mono">
                {invoice.invoice_number}
              </h1>
              <Badge
                variant={
                  invoice.status === "Paid"
                    ? "success"
                    : invoice.status === "Cancelled"
                      ? "destructive"
                      : invoice.status === "Draft"
                        ? "secondary"
                        : "warning"
                }
              >
                {invoice.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {invoice.client_legal_name} &bull; Net Payable:{" "}
              <strong className="text-[#19196f]">{formatInrExact(netPayable)}</strong> &bull; Pending:{" "}
              <strong className="text-amber-700">{formatInrExact(invoice.outstanding_balance)}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "Draft" && (
            <Button
              size="sm"
              onClick={handleFinalize}
              className="gap-1.5 bg-[#19196f] hover:bg-[#141458] text-white rounded-xl"
            >
              <CheckCircle2 className="h-4 w-4" /> Finalize
            </Button>
          )}

          {invoice.status !== "Cancelled" && invoice.outstanding_balance > 0 && (
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
              onClick={() => {
                setPaymentAmount(invoice.outstanding_balance);
                setIsPaymentModalOpen(true);
              }}
            >
              <CreditCard className="h-4 w-4" /> Record Payment
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadHTML}
            disabled={isExporting}
            className="gap-1.5 rounded-xl border-slate-300 bg-white"
          >
            <FileCode2 className="h-4 w-4" /> HTML
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="gap-1.5 rounded-xl border-slate-300 bg-white"
          >
            <Download className="h-4 w-4" /> PDF
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-1.5 rounded-xl border-slate-300 bg-white"
          >
            <Printer className="h-4 w-4" /> Print A4
          </Button>

          {invoice.status !== "Cancelled" && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5 rounded-xl"
              onClick={() => setIsCancelModalOpen(true)}
            >
              <Ban className="h-4 w-4" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Exact 0754-tax-invoice.html A4 Invoice Sheet */}
      <div className="lma-invoice-sheet relative">
        {invoice.status === "Cancelled" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15 rotate-[-30deg] z-10">
            <span className="text-7xl font-black text-red-600 tracking-widest border-8 border-red-600 px-8 py-4 rounded-xl">
              CANCELLED
            </span>
          </div>
        )}

        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 pb-1.5">
            <div className="flex flex-col items-start gap-2">
              <img
                src="/linear-logo.png"
                alt="Linear Audit Logo"
                className="h-[42px] w-auto object-contain block"
              />
              <div>
                <h2 className="text-[14px] font-extrabold tracking-[0.2px] text-[#0f172a]">
                  {LMA_SUPPLIER.legalName}
                </h2>
                <p className="text-[10.5px] text-[#64748b] mt-0.5">
                  CIN: {LMA_SUPPLIER.cin} &nbsp;•&nbsp; GSTIN: {LMA_SUPPLIER.gstin} &nbsp;•&nbsp; PAN:{" "}
                  {LMA_SUPPLIER.pan}
                </p>
              </div>
            </div>

            <div className="sm:text-right shrink-0">
              <h3 className="text-[#19196f] text-[28px] font-extrabold tracking-[0.8px] leading-none">
                TAX INVOICE
              </h3>
              <div className="text-[11px] text-[#64748b] mt-2 leading-[1.55]">
                Invoice No: <b className="text-[#0f172a]">{invoice.invoice_number}</b>
                <br />
                Date: <b className="text-[#0f172a]">{formatLongDate(invoice.invoice_date)}</b>
                <br />
                Due Date: <b className="text-[#0f172a]">{formatLongDate(invoice.due_date)}</b>
              </div>
            </div>
          </div>

          <div className="inv-divider" />

          {/* Bill To & Supplier Details 2-Column Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7">
            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] px-5 py-4">
              <div className="text-[10px] font-extrabold tracking-[0.8px] text-[#64748b] uppercase mb-2">
                BILL TO (CLIENT)
              </div>
              <div className="text-[13.5px] font-bold text-[#0f172a] mb-1">
                {invoice.client_legal_name}
              </div>
              <div className="text-[11.5px] text-[#111827] leading-[1.6] whitespace-pre-line">
                {invoice.client_address}
                {"\n"}
                GSTIN: <b className="text-[#0f172a]">{invoice.client_gstin || "Unregistered"}</b>
                {invoice.client_pan && (
                  <>
                    {" "}
                    &nbsp;|&nbsp; PAN: <b className="text-[#0f172a]">{invoice.client_pan}</b>
                  </>
                )}
              </div>
            </div>

            <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] px-5 py-4">
              <div className="text-[10px] font-extrabold tracking-[0.8px] text-[#64748b] uppercase mb-2">
                SUPPLIER &amp; SUPPLY DETAILS
              </div>
              <div className="text-[13.5px] font-bold text-[#0f172a] mb-1">
                {LMA_SUPPLIER.shortName}
              </div>
              <div className="text-[11.5px] text-[#111827] leading-[1.6]">
                {LMA_SUPPLIER.addressLine1}
                <br />
                {LMA_SUPPLIER.addressLine2}
                <br />
                Contact:{" "}
                <a href={`mailto:${LMA_SUPPLIER.email}`} className="text-[#19196f] font-semibold hover:underline">
                  {LMA_SUPPLIER.email}
                </a>{" "}
                &nbsp;|&nbsp;{" "}
                <a href={`tel:${LMA_SUPPLIER.phoneRaw}`} className="text-[#19196f] font-semibold hover:underline">
                  {LMA_SUPPLIER.phone}
                </a>
                <br />
                Terms: <b className="text-[#0f172a]">{termsDisplay}</b> &nbsp;|&nbsp; Place of Supply:{" "}
                <b className="text-[#0f172a]">{placeDisplay}</b>
              </div>
            </div>
          </div>

          {/* Dark-Header Line Items Table */}
          <div className="rounded-[10px] overflow-hidden border border-[#e2e8f0] shadow-[0_4px_14px_rgba(15,23,42,0.04)] mb-6">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="w-[48px] text-center text-[11px] font-bold tracking-[0.6px] uppercase py-3.5 px-4">
                    #
                  </th>
                  <th className="text-left text-[11px] font-bold tracking-[0.6px] uppercase py-3.5 px-4">
                    Description
                  </th>
                  <th className="w-[100px] text-center text-[11px] font-bold tracking-[0.6px] uppercase py-3.5 px-4">
                    SAC
                  </th>
                  <th className="w-[135px] text-right text-[11px] font-bold tracking-[0.6px] uppercase py-3.5 px-4">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, idx) => {
                  const qtySuffix =
                    item.quantity && item.quantity !== 1
                      ? ` (${item.quantity} × ${formatInrExact(item.rate)})`
                      : "";
                  const subText = item.sub_description
                    ? `${item.sub_description}${qtySuffix}`
                    : qtySuffix
                      ? `Qty: ${item.quantity} × ${formatInrExact(item.rate)}`
                      : "";

                  return (
                    <tr
                      key={item.id}
                      className={idx % 2 === 1 ? "bg-[#fafbfc]" : "bg-white"}
                    >
                      <td className="py-4 px-4 border-b border-[#e2e8f0] text-center text-[12px] font-semibold text-[#64748b] align-middle">
                        {String(idx + 1).padStart(2, "0")}
                      </td>
                      <td className="py-4 px-4 border-b border-[#e2e8f0] align-middle">
                        <div className="text-[13.5px] font-bold text-[#0f172a]">
                          {item.description}
                        </div>
                        {subText && (
                          <div className="text-[11.5px] text-[#64748b] mt-0.5 leading-[1.4]">
                            {subText}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 border-b border-[#e2e8f0] text-center font-mono text-[12px] font-semibold text-[#0f172a] align-middle">
                        {item.sac_code || "998224"}
                      </td>
                      <td className="py-4 px-4 border-b border-[#e2e8f0] text-right text-[14px] font-bold text-[#0f172a] whitespace-nowrap align-middle">
                        {formatInrExact(item.taxable_amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 3-Column Bottom Summary Row: Bank Details + UPI QR + Totals Box */}
          <div className="flex flex-col md:flex-row justify-between items-stretch gap-4 my-[18px]">
            {/* Bank Details + Words */}
            <div className="flex-1 min-w-0 bg-[#f8fafc] border border-[#e2e8f0] rounded-[10px] px-4 py-3.5 flex flex-col justify-between">
              <div>
                <div className="text-[10px] font-extrabold text-[#0f172a] tracking-[0.6px] uppercase mb-2">
                  Bank Account Details
                </div>
                <ul className="text-[10.5px] text-[#111827] leading-[1.55] space-y-0.5">
                  <li className="grid grid-cols-[52px_1fr] gap-1.5 items-baseline">
                    <span className="text-[#64748b] font-semibold">Title:</span>
                    <span className="text-[#0f172a] font-semibold">{LMA_SUPPLIER.bank.title}</span>
                  </li>
                  <li className="grid grid-cols-[52px_1fr] gap-1.5 items-baseline">
                    <span className="text-[#64748b] font-semibold">Number:</span>
                    <span className="text-[#0f172a] font-semibold font-mono">
                      {LMA_SUPPLIER.bank.accountNumber}
                    </span>
                  </li>
                  <li className="grid grid-cols-[52px_1fr] gap-1.5 items-baseline">
                    <span className="text-[#64748b] font-semibold">Nature:</span>
                    <span className="text-[#0f172a] font-semibold">{LMA_SUPPLIER.bank.nature}</span>
                  </li>
                  <li className="grid grid-cols-[52px_1fr] gap-1.5 items-baseline">
                    <span className="text-[#64748b] font-semibold">Bank:</span>
                    <span className="text-[#0f172a] font-semibold">
                      {LMA_SUPPLIER.bank.bankName}
                    </span>
                  </li>
                  <li className="grid grid-cols-[52px_1fr] gap-1.5 items-baseline">
                    <span className="text-[#64748b] font-semibold">IFSC:</span>
                    <span className="text-[#0f172a] font-semibold font-mono">
                      {LMA_SUPPLIER.bank.ifsc}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="mt-2.5 pt-2 border-t border-dashed border-[#e2e8f0] text-[10.5px] text-[#64748b] leading-[1.45]">
                In Words: <b className="text-[#0f172a]">{inWords}</b>
              </div>
            </div>

            {/* UPI Instant Payment Card */}
            <div className="w-full md:w-[196px] shrink-0 bg-white border-[1.5px] border-[#e2e8f0] rounded-[10px] px-3 pt-3 pb-2.5 flex flex-col items-center justify-center text-center shadow-[0_4px_12px_rgba(15,23,42,0.03)]">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.6px] text-[#0f172a] uppercase mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] inline-block" />
                <span>Scan to Pay (UPI)</span>
              </div>
              <div className="bg-white border border-[#e2e8f0] rounded-lg p-1.5 inline-block shadow-[0_2px_6px_rgba(15,23,42,0.04)]">
                <img
                  src="/linear-upi-qr.svg"
                  alt={`UPI QR Code - ${formatInrExact(netPayable)}`}
                  className="w-[94px] h-[94px] block object-contain"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.dataset.fallback) {
                      img.dataset.fallback = "1";
                      img.src = "/linear-upi-qr.png";
                    }
                  }}
                />
              </div>
              <div className="text-[14px] font-extrabold text-[#19196f] mt-1.5 leading-tight">
                {formatInrExact(netPayable)}
              </div>
              <div className="text-[8.5px] font-bold tracking-[0.5px] text-[#64748b] uppercase">
                Total Payable
              </div>
              <a
                href={upiUri}
                className="mt-1.5 bg-[#f8fafc] border border-dashed border-[#cbd5e1] rounded-[5px] px-1.5 py-0.5 text-[9.5px] font-bold text-[#0f172a] font-mono hover:bg-[#eef2ff] hover:border-[#19196f] hover:text-[#19196f] truncate max-w-full"
                title="Click to pay via UPI app"
              >
                {LMA_SUPPLIER.upiId}
              </a>
              <div className="text-[8.5px] text-[#64748b] mt-1 font-medium">
                GPay • PhonePe • Paytm • BHIM
              </div>
            </div>

            {/* Totals Card */}
            <div className="w-full md:w-[245px] shrink-0 bg-white border-[1.5px] border-[#e2e8f0] rounded-[10px] overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                  <span>Sub Total</span>
                  <span className="font-semibold text-[#0f172a]">
                    {formatInrExact(invoice.subtotal)}
                  </span>
                </div>

                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                    <span>Discount</span>
                    <span className="font-semibold text-[#b91c1c]">
                      (-) {formatInrExact(invoice.discount_amount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                  <span>Taxable Amount</span>
                  <span className="font-semibold text-[#0f172a]">
                    {formatInrExact(invoice.taxable_amount)}
                  </span>
                </div>

                {invoice.is_interstate ? (
                  <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                    <span>IGST ({effectiveGstRate}%)</span>
                    <span className="font-semibold text-[#0f172a]">
                      {formatInrExact(invoice.igst_amount)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                      <span>CGST ({halfGstRate}%)</span>
                      <span className="font-semibold text-[#0f172a]">
                        {formatInrExact(invoice.cgst_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                      <span>SGST ({halfGstRate}%)</span>
                      <span className="font-semibold text-[#0f172a]">
                        {formatInrExact(invoice.sgst_amount)}
                      </span>
                    </div>
                  </>
                )}

                {(invoice.tds_amount || 0) > 0 && (
                  <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                    <span>
                      TDS Withheld{" "}
                      {invoice.tds_section
                        ? `(${invoice.tds_section}${invoice.tds_rate ? ` • ${invoice.tds_rate}%` : ""})`
                        : invoice.tds_rate
                          ? `(${invoice.tds_rate}%)`
                          : ""}
                    </span>
                    <span className="font-semibold text-[#b91c1c]">
                      (-) {formatInrExact(invoice.tds_amount || 0)}
                    </span>
                  </div>
                )}

                {invoice.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                      <span>Paid Amount</span>
                      <span className="font-semibold text-emerald-700">
                        {formatInrExact(invoice.paid_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between px-3.5 py-[7px] text-[11px] text-[#64748b] border-b border-[#f1f5f9]">
                      <span>Balance Pending</span>
                      <span className="font-semibold text-amber-700">
                        {formatInrExact(invoice.outstanding_balance)}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-[#fafbfc] border-t-2 border-[#19196f] px-3.5 py-2.5 flex justify-between items-center text-[14px] font-extrabold text-[#0f172a]">
                <span>Total</span>
                <span className="text-[#19196f]">{formatInrExact(netPayable)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Footer & Authorized Signatory */}
        <div className="mt-5 border-t border-[#e2e8f0] pt-5">
          <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
            <div className="text-left">
              <div className="text-[12px] font-bold text-[#0f172a]">
                Thank you for partnering with {LMA_SUPPLIER.brandName}
              </div>
              <div className="text-[10.5px] text-[#64748b] mt-1 leading-[1.5]">
                For any inquiries, contact us at{" "}
                <a href={`mailto:${LMA_SUPPLIER.email}`} className="text-[#19196f] font-semibold hover:underline">
                  {LMA_SUPPLIER.email}
                </a>{" "}
                or{" "}
                <a href={`tel:${LMA_SUPPLIER.phoneRaw}`} className="text-[#19196f] font-semibold hover:underline">
                  {LMA_SUPPLIER.phone}
                </a>
              </div>
            </div>

            <div className="text-right">
              <img
                src="/linear-sign.png"
                alt={`${LMA_SUPPLIER.signatoryName} Signature`}
                className="h-9 w-auto block ml-auto mb-1 object-contain"
              />
              <div className="w-[190px] border-b-[1.5px] border-[#0f172a] mb-1.5 ml-auto" />
              <div className="text-[11px] font-bold text-[#0f172a]">
                {LMA_SUPPLIER.signatoryName}
              </div>
              <div className="text-[9.5px] text-[#64748b]">{LMA_SUPPLIER.signatoryTitle}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Allocated Payments Ledger Box View (Hidden in Print) */}
      {clientPayments.length > 0 && (
        <Card className="rounded-[24px] border-[1.5px] border-slate-300 bg-white shadow-none print:hidden">
          <CardHeader className="pb-3 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold">
              Allocated Payments Ledger ({clientPayments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clientPayments.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      {p.payment_number}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {p.payment_mode}
                    </Badge>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    {formatInrExact(p.amount)}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span className="font-mono">{p.transaction_reference || "—"}</span>
                    <span>
                      {formatDate(p.payment_date)} &bull; {p.received_by_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Invoice Modal */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-red-600">Cancel Tax Invoice</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Tax invoices cannot be deleted. An immutable cancellation audit log will be created.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancelInvoice} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">
                Reason for Cancellation
              </label>
              <Textarea
                placeholder="e.g. Scope revised by mutual consent / Re-invoicing under revised entity..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCancelModalOpen(false)}
              >
                Back
              </Button>
              <Button type="submit" variant="destructive">
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-emerald-700">
              Record Payment for {invoice.invoice_number}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Balance remaining: {formatInrExact(invoice.outstanding_balance)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Payment Amount (₹)</label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                max={invoice.outstanding_balance}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Mode</label>
                <select
                  className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs font-medium"
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
                <label className="text-xs font-semibold text-slate-700">UTR / Ref</label>
                <Input
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="Optional reference"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsPaymentModalOpen(false)}
              >
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
