import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Download,
  Mail,
  CreditCard,
  Ban,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency, formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const [, setRefreshKey] = useState(0);
  const invoiceId = params.id as string;

  const invoice = pmsStore.getInvoiceById(invoiceId);
  const clientPayments = pmsStore.getPayments().filter((p) => p.invoice_id === invoiceId);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(invoice?.outstanding_balance || 0);

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Invoice Not Found</h2>
        <Link to="/invoices">
          <Button variant="outline" className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  // Generate PDF using jsPDF
  const generatePDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    // Header Firm Branding
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("PMS PROFESSIONAL SERVICES LLP", 14, 20);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("Tax, Corporate Law & Management Advisory Practice", 14, 25);
    doc.text("Plot 42, Cyber City, Phase II, Gurugram, Haryana 122002 | GSTIN: 06AABFP1234F1Z9", 14, 30);

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.line(14, 34, 196, 34);

    // Invoice Title & Meta
    doc.setFontSize(14);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text("TAX INVOICE", 14, 43);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Invoice No: ${invoice.invoice_number}`, 14, 50);
    doc.text(`Invoice Date: ${formatDate(invoice.invoice_date)}`, 14, 55);
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, 14, 60);

    doc.text(`Place of Supply: ${invoice.place_of_supply}`, 120, 50);
    doc.text(`Reverse Charge: ${invoice.reverse_charge ? "Yes" : "No"}`, 120, 55);
    doc.text(`Supply Type: ${invoice.is_interstate ? "Inter-State (IGST)" : "Intra-State (CGST+SGST)"}`, 120, 60);

    // Bill To
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Billed To (Client Details):", 14, 70);
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(invoice.client_legal_name, 14, 76);
    doc.text(invoice.client_address || "", 14, 81);
    doc.text(`PAN: ${invoice.client_pan || "—"}  |  GSTIN: ${invoice.client_gstin || "Unregistered"}`, 14, 86);

    // Table
    const tableData = invoice.items.map((it, idx) => [
      String(idx + 1),
      it.description,
      it.sac_code || "998231",
      String(it.quantity),
      formatCurrency(it.rate),
      formatCurrency(it.taxable_amount),
      `${it.gst_rate}%`,
      formatCurrency(it.total_amount),
    ]);

    autoTable(doc, {
      startY: 92,
      head: [["#", "Description of Services", "SAC", "Qty", "Rate", "Taxable", "GST", "Total"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59] },
      styles: { fontSize: 8 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Box
    doc.text(`Taxable Subtotal: ${formatCurrency(invoice.taxable_amount)}`, 130, finalY);
    if (invoice.is_interstate) {
      doc.text(`Integrated GST (IGST): ${formatCurrency(invoice.igst_amount)}`, 130, finalY + 6);
    } else {
      doc.text(`Central GST (CGST): ${formatCurrency(invoice.cgst_amount)}`, 130, finalY + 6);
      doc.text(`State GST (SGST): ${formatCurrency(invoice.sgst_amount)}`, 130, finalY + 12);
    }
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`Grand Total: ${formatCurrency(invoice.grand_total)}`, 130, finalY + 18);
    doc.text(`Amount Paid: ${formatCurrency(invoice.paid_amount)}`, 130, finalY + 24);
    doc.setTextColor(180, 83, 9);
    doc.text(`Balance Due: ${formatCurrency(invoice.outstanding_balance)}`, 130, finalY + 30);

    // Bank Details
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Bank Remittance Details:", 14, finalY);
    doc.text("Account Name: PMS Professional Services LLP", 14, finalY + 5);
    doc.text("Bank Name: HDFC Bank Ltd | A/c No: 50200012345678", 14, finalY + 10);
    doc.text("IFSC: HDFC0000043 | Branch: Gurugram Cyber City", 14, finalY + 15);

    doc.save(`${invoice.invoice_number.replace(/\//g, "_")}.pdf`);
    toast.success("PDF generated and downloaded successfully.");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = () => {
    toast.success(`Invoice ${invoice.invoice_number} dispatched to client billing contact.`);
  };

  const handleCancelInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancelling this invoice.");
      return;
    }
    pmsStore.cancelInvoice(invoice.id, cancelReason);
    setIsCancelModalOpen(false);
    toast.success("Invoice cancelled. Immutable audit record maintained.");
    setRefreshKey((k) => k + 1);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    pmsStore.recordPayment({
      client_id: invoice.client_id,
      client_name: invoice.client_legal_name,
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      payment_date: new Date().toISOString().slice(0, 10),
      amount: Number(paymentAmount),
      payment_mode: "NEFT",
      transaction_reference: `REM-${Date.now().toString().slice(-6)}`,
      received_by: pmsStore.getCurrentUser().id,
      received_by_name: pmsStore.getCurrentUser().full_name,
      remarks: "Payment allocated against invoice",
      status: "Completed",
    });

    setIsPaymentModalOpen(false);
    toast.success("Payment recorded. Invoice balance updated.");
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6 pb-20 max-w-5xl mx-auto print:max-w-none print:p-0">
      {/* Top Action Bar (hidden on print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link to="/invoices">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {invoice.invoice_number}
              </span>
              <Badge
                variant={
                  invoice.status === "Paid"
                    ? "success"
                    : invoice.status === "Cancelled"
                    ? "destructive"
                    : "warning"
                }
              >
                {invoice.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={generatePDF} size="sm" variant="outline" className="gap-1.5 shadow-xs">
            <Download className="h-4 w-4 text-blue-600" />
            <span>Download PDF</span>
          </Button>

          <Button onClick={handlePrint} size="sm" variant="outline" className="gap-1.5 shadow-xs">
            <Printer className="h-4 w-4 text-slate-600" />
            <span>Print</span>
          </Button>

          <Button onClick={handleSendEmail} size="sm" variant="outline" className="gap-1.5 shadow-xs">
            <Mail className="h-4 w-4 text-slate-600" />
            <span>Email Client</span>
          </Button>

          {invoice.outstanding_balance > 0 && invoice.status !== "Cancelled" && (
            <Button
              onClick={() => setIsPaymentModalOpen(true)}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
            >
              <CreditCard className="h-4 w-4" />
              <span>Record Payment</span>
            </Button>
          )}

          {invoice.status !== "Cancelled" && (
            <Button
              onClick={() => setIsCancelModalOpen(true)}
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
            >
              <Ban className="h-4 w-4" />
              <span>Cancel</span>
            </Button>
          )}
        </div>
      </div>

      {/* PRINT-READY TAX INVOICE CARD */}
      <Card className="shadow-lg border-slate-200 bg-white p-8 sm:p-12 print:shadow-none print:border-none print:p-0">
        {/* Header Branding */}
        <div className="flex flex-col sm:flex-row justify-between items-start pb-8 border-b border-slate-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                P
              </div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                PMS PROFESSIONAL SERVICES LLP
              </h2>
            </div>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Chartered Accountants, Company Secretaries & Tax Advisory Practice
              <br />
              Plot 42, Cyber City, Phase II, Gurugram, Haryana 122002
              <br />
              GSTIN: <span className="font-mono font-semibold text-slate-700">06AABFP1234F1Z9</span> | PAN:{" "}
              <span className="font-mono font-semibold text-slate-700">AABFP1234F</span>
            </p>
          </div>

          <div className="text-left sm:text-right">
            <h1 className="text-2xl font-black text-blue-700 tracking-wider">
              TAX INVOICE
            </h1>
            <div className="text-xs text-slate-600 space-y-1 mt-2">
              <div>
                Invoice Number: <strong className="font-mono text-slate-900">{invoice.invoice_number}</strong>
              </div>
              <div>Invoice Date: <strong>{formatDate(invoice.invoice_date)}</strong></div>
              <div>Due Date: <strong>{formatDate(invoice.due_date)}</strong></div>
              <div>Financial Year: <strong className="font-mono">{invoice.financial_year}</strong></div>
            </div>
          </div>
        </div>

        {/* Billed To & Supply Information */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-6 border-b border-slate-200 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-blue-700">
              Billed To (Client Recipient)
            </h3>
            <p className="font-bold text-slate-900 text-sm leading-tight">
              {invoice.client_legal_name}
            </p>
            <p className="text-slate-600 mt-1 leading-relaxed max-w-sm">
              {invoice.client_address}
            </p>
            <div className="mt-2 space-y-0.5 font-mono text-slate-700">
              <div>PAN: <strong>{invoice.client_pan || "—"}</strong></div>
              <div>GSTIN: <strong>{invoice.client_gstin || "Unregistered"}</strong></div>
              <div>State: <strong>{invoice.client_state || "Haryana"}</strong></div>
            </div>
          </div>

          <div className="sm:text-right">
            <h3 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 text-blue-700">
              Tax Supply Rules
            </h3>
            <div className="space-y-1.5 text-slate-700">
              <div>Place of Supply: <strong>{invoice.place_of_supply}</strong></div>
              <div>
                Nature of Supply:{" "}
                <strong className="text-blue-700">
                  {invoice.is_interstate ? "Inter-State (IGST Applicable)" : "Intra-State (CGST + SGST)"}
                </strong>
              </div>
              <div>Reverse Charge Applicable: <strong>{invoice.reverse_charge ? "Yes" : "No"}</strong></div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-6">
          <Table>
            <TableHeader className="bg-slate-900 text-white [&_th]:text-white [&_th]:text-xs">
              <TableRow>
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Description of Professional Deliverables</TableHead>
                <TableHead className="text-center">SAC Code</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead>
                <TableHead className="text-right">Taxable (₹)</TableHead>
                <TableHead className="text-center">GST %</TableHead>
                <TableHead className="text-right">Total (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs">
              {invoice.items.map((item, idx) => (
                <TableRow key={item.id || idx}>
                  <TableCell className="text-center font-mono">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {item.description}
                  </TableCell>
                  <TableCell className="text-center font-mono">{item.sac_code || "998231"}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.taxable_amount)}</TableCell>
                  <TableCell className="text-center font-mono">{item.gst_rate}%</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    {formatCurrency(item.total_amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Calculation Totals & Bank Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-slate-200">
          {/* Bank Instructions */}
          <div className="text-xs space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
              Direct Bank Remittance Particulars
            </h4>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-1 font-mono text-[11px]">
              <div>Beneficiary: <strong>PMS PROFESSIONAL SERVICES LLP</strong></div>
              <div>Bank: <strong>HDFC Bank Ltd</strong> | Current A/c: <strong>50200012345678</strong></div>
              <div>IFSC Code: <strong>HDFC0000043</strong> (Cyber City Branch)</div>
              <div>UPI ID: <strong>pmsprofessional@hdfcbank</strong></div>
            </div>

            {invoice.notes && (
              <p className="text-[11px] text-slate-500 italic mt-2">
                Note: {invoice.notes}
              </p>
            )}
          </div>

          {/* Breakdown Box */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Gross Taxable Value:</span>
              <span className="font-semibold text-slate-900">{formatCurrency(invoice.taxable_amount)}</span>
            </div>

            {invoice.is_interstate ? (
              <div className="flex justify-between text-blue-700">
                <span>Integrated GST (IGST @ 18%):</span>
                <span className="font-semibold">{formatCurrency(invoice.igst_amount)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-blue-700">
                  <span>Central GST (CGST @ 9%):</span>
                  <span className="font-semibold">{formatCurrency(invoice.cgst_amount)}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>State GST (SGST @ 9%):</span>
                  <span className="font-semibold">{formatCurrency(invoice.sgst_amount)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t">
              <span>Total GST:</span>
              <span>{formatCurrency(invoice.total_gst)}</span>
            </div>

            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t-2 border-slate-900">
              <span>Invoice Grand Total:</span>
              <span className="text-blue-700 text-lg">{formatCurrency(invoice.grand_total)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 font-medium pt-1">
              <span>Amount Cleared / Paid:</span>
              <span>{formatCurrency(invoice.paid_amount)}</span>
            </div>

            <div className="flex justify-between text-amber-700 font-bold text-sm pt-1 border-t border-amber-200 bg-amber-50/50 p-2 rounded">
              <span>Outstanding Balance Due:</span>
              <span>{formatCurrency(invoice.outstanding_balance)}</span>
            </div>
          </div>
        </div>

        {/* Footer Disclosures */}
        <div className="pt-10 mt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end text-xs text-slate-500 gap-4">
          <div className="max-w-md">
            <p className="font-medium text-slate-700">Terms & Conditions:</p>
            <p className="text-[11px] mt-0.5 leading-relaxed">
              {invoice.terms_conditions || "Payment due within 15 days from invoice issuance date."}
            </p>
          </div>

          <div className="text-center sm:text-right">
            <div className="h-10 flex items-center justify-center font-serif italic text-blue-900 font-bold text-sm">
              CA Rajesh Sharma
            </div>
            <div className="border-t border-slate-300 pt-1 text-[11px] font-semibold text-slate-800">
              Authorized Signatory
            </div>
            <div className="text-[10px] text-slate-400">For PMS Professional Services LLP</div>
          </div>
        </div>
      </Card>

      {/* Payment Allocation History Box View */}
      {clientPayments.length > 0 && (
        <Card className="shadow-xs print:hidden">
          <CardHeader className="pb-3 border-b border-slate-200">
            <CardTitle className="text-sm font-semibold">Allocated Payments Ledger ({clientPayments.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {clientPayments.map((p) => (
                <div key={p.id} className="rounded-2xl border-[1.5px] border-slate-300 bg-white p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                      {p.payment_number}
                    </span>
                    <Badge variant="outline" className="text-[10px]">{p.payment_mode}</Badge>
                  </div>
                  <div className="text-base font-extrabold text-slate-900">{formatCurrency(p.amount)}</div>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                    <span className="font-mono">{p.transaction_reference || "—"}</span>
                    <span>{formatDate(p.payment_date)} &bull; {p.received_by_name}</span>
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
              <label className="text-xs font-semibold text-slate-700">Reason for Cancellation</label>
              <Textarea
                placeholder="e.g. Scope revised by mutual consent / Re-invoicing under revised entity..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCancelModalOpen(false)}>
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
            <DialogTitle className="text-lg font-bold text-emerald-700">Record Payment for {invoice.invoice_number}</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Balance remaining: {formatCurrency(invoice.outstanding_balance)}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRecordPayment} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Payment Amount (₹)</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                max={invoice.outstanding_balance}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
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

