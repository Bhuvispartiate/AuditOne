"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Building,
  FileCheck,
  Calculator,
  Percent
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { pmsStore } from "@/lib/data/store";
import { formatCurrency } from "@/lib/utils";
import { InvoiceItem } from "@/types";
import { toast } from "sonner";

function NewInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillClientId = searchParams.get("clientId") || "";

  const clients = pmsStore.getClients();
  const services = pmsStore.getServices();

  // Firm's home state is Delhi (07) or Haryana (06)
  const FIRM_HOME_STATE = "Haryana (06)";

  // Section A: Client Selection
  const [selectedClientId, setSelectedClientId] = useState(prefillClientId || clients[0]?.id || "");
  const selectedClient = clients.find((c) => c.id === selectedClientId);

  // Section B: Invoice Details
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  const [financialYear, setFinancialYear] = useState("2024-25");
  const [placeOfSupply, setPlaceOfSupply] = useState("Haryana (06)");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [notes, setNotes] = useState("Thank you for your business. Please remit to our designated bank account.");
  const [terms, setTerms] = useState("Payment due within 15 days from the date of invoice. Subject to Gurugram/Delhi jurisdiction.");

  // Section C: Line items
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: "item-1",
      description: "Professional Fees for Statutory Audit & Tax Compliance",
      sac_code: "998231",
      quantity: 1,
      rate: 25000,
      discount_amount: 0,
      taxable_amount: 25000,
      gst_rate: 18,
      cgst_amount: 2250,
      sgst_amount: 2250,
      igst_amount: 0,
      total_amount: 29500,
    },
  ]);

  // When client changes, auto-set place of supply based on client state
  useEffect(() => {
    if (selectedClient?.addresses?.[0]) {
      const state = selectedClient.addresses[0].state;
      if (state.toLowerCase().includes("haryana")) {
        setPlaceOfSupply("Haryana (06)");
      } else if (state.toLowerCase().includes("delhi")) {
        setPlaceOfSupply("Delhi (07)");
      } else if (state.toLowerCase().includes("maharashtra")) {
        setPlaceOfSupply("Maharashtra (27)");
      } else if (state.toLowerCase().includes("tamil nadu")) {
        setPlaceOfSupply("Tamil Nadu (33)");
      } else if (state.toLowerCase().includes("karnataka")) {
        setPlaceOfSupply("Karnataka (29)");
      } else {
        setPlaceOfSupply(`${state} (Other)`);
      }
    }
  }, [selectedClientId, selectedClient]);

  const isInterstate = placeOfSupply !== FIRM_HOME_STATE;

  // Recalculate line items whenever rate, qty, discount, or interstate status changes
  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    const qty = Number(item.quantity) || 1;
    const rate = Number(item.rate) || 0;
    const discount = Number(item.discount_amount) || 0;
    const gstRate = Number(item.gst_rate) || 18;

    const taxable = Math.max(0, qty * rate - discount);
    item.taxable_amount = taxable;

    if (isInterstate) {
      item.cgst_amount = 0;
      item.sgst_amount = 0;
      item.igst_amount = (taxable * gstRate) / 100;
    } else {
      const halfRate = gstRate / 2;
      item.cgst_amount = (taxable * halfRate) / 100;
      item.sgst_amount = (taxable * halfRate) / 100;
      item.igst_amount = 0;
    }

    item.total_amount = taxable + item.cgst_amount + item.sgst_amount + item.igst_amount;
    updated[index] = item;
    setItems(updated);
  };

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      description: "Additional Professional Compliance Service",
      sac_code: "998231",
      quantity: 1,
      rate: 10000,
      discount_amount: 0,
      taxable_amount: 10000,
      gst_rate: 18,
      cgst_amount: isInterstate ? 0 : 900,
      sgst_amount: isInterstate ? 0 : 900,
      igst_amount: isInterstate ? 1800 : 0,
      total_amount: 11800,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) {
      toast.error("An invoice must contain at least one line item.");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Section D Calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const totalDiscount = items.reduce((sum, item) => sum + (Number(item.discount_amount) || 0), 0);
  const totalTaxable = items.reduce((sum, item) => sum + item.taxable_amount, 0);
  const totalCgst = items.reduce((sum, item) => sum + item.cgst_amount, 0);
  const totalSgst = items.reduce((sum, item) => sum + item.sgst_amount, 0);
  const totalIgst = items.reduce((sum, item) => sum + item.igst_amount, 0);
  const totalGst = totalCgst + totalSgst + totalIgst;
  const grandTotal = totalTaxable + totalGst;

  const handleSaveInvoice = (status: "Draft" | "Finalized") => {
    if (!selectedClient) {
      toast.error("Please select a client.");
      return;
    }

    const newInvoice = pmsStore.addInvoice({
      financial_year: financialYear,
      client_id: selectedClient.id,
      client_name: selectedClient.client_name,
      invoice_date: invoiceDate,
      due_date: dueDate,
      place_of_supply: placeOfSupply,
      is_interstate: isInterstate,
      reverse_charge: reverseCharge,
      client_legal_name: selectedClient.legal_name,
      client_address:
        selectedClient.addresses?.[0]?.street_address ||
        `${selectedClient.client_name}, Registered Address`,
      client_pan: selectedClient.registration?.pan,
      client_gstin: selectedClient.registration?.gstin,
      client_state: selectedClient.addresses?.[0]?.state || "Haryana",
      client_contact: selectedClient.contact?.mobile_number,
      subtotal,
      discount_amount: totalDiscount,
      taxable_amount: totalTaxable,
      cgst_amount: totalCgst,
      sgst_amount: totalSgst,
      igst_amount: totalIgst,
      total_gst: totalGst,
      grand_total: grandTotal,
      status,
      notes,
      terms_conditions: terms,
      created_by_name: pmsStore.getCurrentUser().full_name,
      finalized_at: status === "Finalized" ? new Date().toISOString() : undefined,
      items,
    });

    toast.success(
      `Invoice ${newInvoice.invoice_number} created as ${status} for ${formatCurrency(grandTotal)}`
    );
    router.push(`/invoices/${newInvoice.id}`);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/invoices">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Create GST Tax Invoice
            </h1>
            <p className="text-xs text-slate-500">
              Compliant with Section 31 of CGST Act &bull; Automatic Tax Rule Engine
            </p>
          </div>
        </div>
      </div>

      {/* SECTION A — Client Selection */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-base font-semibold text-slate-900">
              Section A — Client Selection & Auto-Retrieved Profile
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Client legal identity, registered address, PAN and GSTIN
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Select Client <span className="text-red-500">*</span>
              </Label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-300 bg-white px-3 text-sm focus:ring-1 focus:ring-blue-600 focus:outline-none"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.client_name} ({c.client_code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Legal Registered Name</Label>
              <Input
                value={selectedClient?.legal_name || ""}
                readOnly
                className="bg-slate-50 text-slate-700 font-medium"
              />
            </div>
          </div>

          {selectedClient && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
              <div>
                <span className="font-semibold text-slate-500 block">PAN</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedClient.registration?.pan || "—"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block">GSTIN</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedClient.registration?.gstin || "Unregistered"}
                </span>
              </div>
              <div>
                <span className="font-semibold text-slate-500 block">Registered State</span>
                <span className="font-medium text-slate-900">
                  {selectedClient.addresses?.[0]?.state || "Haryana"}
                </span>
              </div>
              <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                <span className="font-semibold text-slate-500 block">Billing Address</span>
                <span className="text-slate-700">
                  {selectedClient.addresses?.[0]?.street_address},{" "}
                  {selectedClient.addresses?.[0]?.city} - {selectedClient.addresses?.[0]?.pin_code}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SECTION B — Invoice Details */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-base font-semibold text-slate-900">
              Section B — Invoice Identifiers & Tax Rules
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Financial Year</Label>
            <Input
              value={financialYear}
              onChange={(e) => setFinancialYear(e.target.value)}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Invoice Date</Label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Due Date</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Place of Supply</Label>
            <Input
              value={placeOfSupply}
              onChange={(e) => setPlaceOfSupply(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="sm:col-span-4 flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-white text-blue-700 font-semibold border-blue-200">
                {isInterstate ? "INTER-STATE SUPPLY (IGST)" : "INTRA-STATE SUPPLY (CGST + SGST)"}
              </Badge>
              <span className="text-slate-600">
                Home State: <strong>{FIRM_HOME_STATE}</strong> &bull; Place of Supply:{" "}
                <strong>{placeOfSupply}</strong>
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
              <input
                type="checkbox"
                checked={reverseCharge}
                onChange={(e) => setReverseCharge(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span>Reverse Charge Applicable (RCM)</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* SECTION C — Line Items */}
      <Card className="shadow-xs border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900">
              Section C — Services & Billable Deliverables
            </CardTitle>
            <CardDescription className="text-xs">
              Unlimited line items with SAC classification and automated tax breakdown
            </CardDescription>
          </div>
          <Button
            type="button"
            onClick={addItem}
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Item</span>
          </Button>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="p-4 rounded-xl border border-slate-200 bg-white space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Line Item #{index + 1}</span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="text-slate-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Service Description
                  </label>
                  <Input
                    placeholder="Deliverable description..."
                    value={item.description}
                    onChange={(e) => updateItem(index, "description", e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">SAC Code</label>
                  <Input
                    placeholder="998231"
                    value={item.sac_code || ""}
                    onChange={(e) => updateItem(index, "sac_code", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Rate (₹)</label>
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateItem(index, "rate", e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Discount (₹)</label>
                  <Input
                    type="number"
                    value={item.discount_amount}
                    onChange={(e) => updateItem(index, "discount_amount", e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-4 text-slate-500">
                  <span>
                    Taxable: <strong>{formatCurrency(item.taxable_amount)}</strong>
                  </span>
                  <span>GST Rate: {item.gst_rate}%</span>
                  {isInterstate ? (
                    <span className="text-blue-700">IGST: {formatCurrency(item.igst_amount)}</span>
                  ) : (
                    <span className="text-blue-700">
                      CGST: {formatCurrency(item.cgst_amount)} | SGST:{" "}
                      {formatCurrency(item.sgst_amount)}
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-sm">
                  Item Total: {formatCurrency(item.total_amount)}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SECTION D — Invoice Summary Calculations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <Card className="shadow-xs border-slate-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Payment Terms & Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Client Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[70px] text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Legal Terms & Jurisdiction</label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="min-h-[70px] text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* Calculation Summary Card */}
        <Card className="shadow-xs border-slate-200 bg-slate-50/50">
          <CardHeader className="pb-2 border-b border-slate-200">
            <CardTitle className="text-base font-semibold text-slate-900">
              Section D — GST Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-2.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Gross Subtotal</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            {totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Total Discount</span>
                <span>- {formatCurrency(totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-slate-800 pt-1 border-t border-slate-200">
              <span>Total Taxable Amount</span>
              <span>{formatCurrency(totalTaxable)}</span>
            </div>

            {isInterstate ? (
              <div className="flex justify-between text-blue-700 font-medium">
                <span>Integrated GST (IGST @ 18%)</span>
                <span>{formatCurrency(totalIgst)}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>Central GST (CGST @ 9%)</span>
                  <span>{formatCurrency(totalCgst)}</span>
                </div>
                <div className="flex justify-between text-blue-700 font-medium">
                  <span>State GST (SGST @ 9%)</span>
                  <span>{formatCurrency(totalSgst)}</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-slate-600">
              <span>Total GST Applicable</span>
              <span className="font-semibold">{formatCurrency(totalGst)}</span>
            </div>

            <div className="flex justify-between items-center pt-3 border-t-2 border-slate-300 text-lg font-bold text-slate-900">
              <span>Grand Total</span>
              <span className="text-blue-700 text-xl">{formatCurrency(grandTotal)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href="/invoices">
          <Button type="button" variant="outline">
            Cancel
          </Button>
        </Link>
        <Button
          type="button"
          onClick={() => handleSaveInvoice("Draft")}
          variant="secondary"
          className="gap-1.5"
        >
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={() => handleSaveInvoice("Finalized")}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>Finalize & Issue Invoice</span>
        </Button>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-slate-500">Loading invoice generator...</div>}>
      <NewInvoiceContent />
    </React.Suspense>
  );
}

