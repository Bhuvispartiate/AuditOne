import { Invoice } from "@/types";

export const LMA_SUPPLIER = {
  legalName: "Linear Management Advisory Private Limited",
  shortName: "Linear Management Advisory Pvt. Ltd.",
  brandName: "Linear Audit",
  cin: "U74999TN2018PTC126079",
  gstin: "33AADCL7790C1ZK",
  pan: "AADCL7790C",
  addressLine1: "No.B-36, Karthikeyan Salai, Periyar Nagar",
  addressLine2: "Chennai, Tamil Nadu - 600 082, IN",
  homeState: "Tamil Nadu (33)",
  homeStateName: "Tamil Nadu",
  email: "reachlinear@gmail.com",
  phone: "+91 99406 93731",
  phoneRaw: "+919940693731",
  upiId: "9940693731@okbizaxis",
  signatoryName: "R M Vishnu Kumar",
  signatoryTitle: "Authorised Signatory",
  bank: {
    title: "Linear Management Advisory Private Limited",
    accountNumber: "802520110000351",
    nature: "Current Account",
    bankName: "Bank of India - Chennai Overseas Branch",
    ifsc: "BKID0008025",
  },
} as const;

export function getInvoiceNetPayable(
  inv: Pick<Invoice, "grand_total" | "tds_amount" | "net_payable">
): number {
  if (typeof inv.net_payable === "number" && !Number.isNaN(inv.net_payable)) {
    return inv.net_payable;
  }
  return Math.max(0, (inv.grand_total || 0) - (inv.tds_amount || 0));
}

export function formatInrExact(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

export function formatLongDate(dateValue?: string): string {
  if (!dateValue) return "—";
  const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = isoMatch
    ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return dateValue;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function twoDigitsToWords(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o ? `${TENS[t]} ${ONES[o]}` : TENS[t];
}

function integerToIndianWords(num: number): string {
  if (num === 0) return "Zero";
  const parts: string[] = [];

  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const hundred = Math.floor((num % 1000) / 100);
  const rem = num % 100;

  if (crore > 0) {
    parts.push(`${crore >= 100 ? integerToIndianWords(crore) : twoDigitsToWords(crore)} Crore`);
  }
  if (lakh > 0) parts.push(`${twoDigitsToWords(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${twoDigitsToWords(thousand)} Thousand`);
  if (hundred > 0) parts.push(`${ONES[hundred]} Hundred`);
  if (rem > 0) parts.push(twoDigitsToWords(rem));

  return parts.join(" ").trim();
}

export function formatInrWords(amount: number): string {
  const safe = Math.max(0, Number.isFinite(amount) ? amount : 0);
  const rupees = Math.floor(safe);
  const paise = Math.round((safe - rupees) * 100);

  if (paise > 0) {
    return `INR ${integerToIndianWords(rupees)} and ${twoDigitsToWords(paise)} Paise Only.`;
  }
  return `INR ${integerToIndianWords(rupees)} Only.`;
}

export function buildUpiUri(invoiceNumber: string, payableAmount: number): string {
  const safeAmt = Math.max(0, Number.isFinite(payableAmount) ? payableAmount : 0).toFixed(2);
  const params = new URLSearchParams({
    pa: LMA_SUPPLIER.upiId,
    pn: LMA_SUPPLIER.legalName,
    tn: invoiceNumber,
    am: safeAmt,
    cu: "INR",
  });
  return `upi://pay?${params.toString()}`;
}

export function formatClientStateDisplay(placeOfSupply?: string): string {
  if (!placeOfSupply) return LMA_SUPPLIER.homeStateName;
  return placeOfSupply.replace(/\s*\(\d+\)\s*$/, "").trim();
}

function escapeHtml(raw?: string): string {
  if (!raw) return "";
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function fetchAsDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch {
    return url;
  }
}

export async function prepareInvoiceAssetDataUrls() {
  const [logoSrc, signSrc, qrSvgSrc, qrPngSrc] = await Promise.all([
    fetchAsDataUrl("/linear-logo.png"),
    fetchAsDataUrl("/linear-sign.png"),
    fetchAsDataUrl("/linear-upi-qr.svg"),
    fetchAsDataUrl("/linear-upi-qr.png"),
  ]);
  return { logoSrc, signSrc, qrSvgSrc, qrPngSrc };
}

export function buildStandaloneTaxInvoiceHtml(
  invoice: Invoice,
  assets?: {
    logoSrc?: string;
    signSrc?: string;
    qrSvgSrc?: string;
    qrPngSrc?: string;
  }
): string {
  const logoSrc = assets?.logoSrc || "/linear-logo.png";
  const signSrc = assets?.signSrc || "/linear-sign.png";
  const qrSvgSrc = assets?.qrSvgSrc || "/linear-upi-qr.svg";
  const qrPngSrc = assets?.qrPngSrc || "/linear-upi-qr.png";

  const netPayable = getInvoiceNetPayable(invoice);
  const upiHref = buildUpiUri(invoice.invoice_number, netPayable);
  const words = formatInrWords(netPayable);
  const placeDisplay = formatClientStateDisplay(invoice.place_of_supply);
  const termsDisplay = invoice.terms_label || "Due on receipt";

  const effectiveGstRate =
    invoice.taxable_amount > 0
      ? Math.round((invoice.total_gst / invoice.taxable_amount) * 1000) / 10
      : 18;
  const halfRate = Math.round((effectiveGstRate / 2) * 10) / 10;

  const clientAddressHtml = escapeHtml(invoice.client_address || "Registered Office Address")
    .split(/\r?\n/)
    .join("<br>");

  const rowsHtml = invoice.items
    .map((item, idx) => {
      const seq = String(idx + 1).padStart(2, "0");
      const qtySuffix =
        item.quantity && item.quantity !== 1
          ? ` (${item.quantity} × ${formatInrExact(item.rate)})`
          : "";
      const subText = item.sub_description
        ? `${escapeHtml(item.sub_description)}${qtySuffix}`
        : qtySuffix
          ? `Qty: ${item.quantity} × ${formatInrExact(item.rate)}`
          : "";

      return `            <tr>
              <td class="num">${seq}</td>
              <td>
                <div class="item-title">${escapeHtml(item.description)}</div>
                ${subText ? `<div class="item-sub">${subText}</div>` : ""}
              </td>
              <td class="sac">${escapeHtml(item.sac_code || "998224")}</td>
              <td class="amt">${formatInrExact(item.taxable_amount)}</td>
            </tr>`;
    })
    .join("\n");

  const tdsSectionLabel = invoice.tds_section
    ? `TDS Withheld (${escapeHtml(invoice.tds_section)}${invoice.tds_rate ? ` • ${invoice.tds_rate}%` : ""})`
    : `TDS Withheld${invoice.tds_rate ? ` (${invoice.tds_rate}%)` : ""}`;

  const taxRowsHtml = invoice.is_interstate
    ? `            <div class="totals-row">
              <span>IGST (${effectiveGstRate}%)</span>
              <span>${formatInrExact(invoice.igst_amount)}</span>
            </div>`
    : `            <div class="totals-row">
              <span>CGST (${halfRate}%)</span>
              <span>${formatInrExact(invoice.cgst_amount)}</span>
            </div>
            <div class="totals-row">
              <span>SGST (${halfRate}%)</span>
              <span>${formatInrExact(invoice.sgst_amount)}</span>
            </div>`;

  const paymentStripHtml =
    invoice.paid_amount > 0
      ? `            <div class="totals-row paid">
              <span>Paid Amount</span>
              <span>${formatInrExact(invoice.paid_amount)}</span>
            </div>
            <div class="totals-row pending">
              <span>Balance Pending</span>
              <span>${formatInrExact(invoice.outstanding_balance)}</span>
            </div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tax Invoice - ${escapeHtml(invoice.invoice_number)} | ${LMA_SUPPLIER.brandName}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --accent: #19196f;
    --accent-subtle: #eef2ff;
    --navy: #0f172a;
    --ink: #111827;
    --muted: #64748b;
    --bg: #f1f3f7;
    --card: #ffffff;
    --line: #e2e8f0;
    --line-subtle: #f1f5f9;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    background: var(--bg);
    color: var(--ink);
    padding: 32px 16px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  a { color: var(--accent); font-weight: 600; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .invoice {
    max-width: 820px;
    min-height: 1080px;
    margin: 0 auto;
    background: var(--card);
    border-radius: 14px;
    padding: 44px 48px;
    box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .invoice-body { flex: 1; }
  .header { display: flex; justify-content: space-between; align-items: center; gap: 20px; padding-bottom: 6px; }
  .brand { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
  .brand-logo { height: 42px; width: auto; display: block; object-fit: contain; }
  .brand-text h1 { font-size: 14px; font-weight: 800; letter-spacing: 0.2px; color: var(--navy); }
  .brand-text p { font-size: 10.5px; color: var(--muted); margin-top: 2px; }
  .title { text-align: right; flex-shrink: 0; }
  .title h2 { color: var(--accent); font-size: 28px; font-weight: 800; letter-spacing: 0.8px; line-height: 1; }
  .title .inv-meta { font-size: 11px; color: var(--muted); margin-top: 8px; line-height: 1.55; }
  .title .inv-meta b { color: var(--navy); }
  .divider { height: 2.5px; margin: 22px 0 26px; background: linear-gradient(90deg, var(--accent) 0%, rgba(25, 25, 111, 0.4) 60%, rgba(25, 25, 111, 0) 100%); }
  .meta-grid { display: grid; grid-template-columns: 1.1fr 1.1fr; gap: 24px; margin-bottom: 28px; }
  .meta-card { background: #f8fafc; border: 1px solid var(--line); border-radius: 10px; padding: 16px 20px; }
  .meta-label { font-size: 10px; font-weight: 800; letter-spacing: 0.8px; color: var(--muted); text-transform: uppercase; margin-bottom: 8px; }
  .meta-name { font-size: 13.5px; font-weight: 700; color: var(--navy); margin-bottom: 5px; }
  .meta-text { font-size: 11.5px; color: var(--ink); line-height: 1.6; }
  .meta-text b { color: var(--navy); }
  .table-wrap { border-radius: 10px; overflow: hidden; border: 1px solid var(--line); box-shadow: 0 4px 14px rgba(15, 23, 42, 0.04); margin-bottom: 24px; }
  table { width: 100%; border-collapse: collapse; }
  thead th { background: linear-gradient(90deg, #0f172a 0%, #1e293b 100%); color: #ffffff; font-size: 11px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; text-align: left; padding: 14px 16px; }
  thead th:first-child { width: 48px; text-align: center; }
  thead th.col-sac { width: 100px; text-align: center; }
  thead th:last-child { text-align: right; width: 135px; }
  tbody td { padding: 16px 16px; border-bottom: 1px solid var(--line); vertical-align: middle; }
  tbody tr:last-child td { border-bottom: none; }
  tbody tr:nth-child(even) { background: #fafbfc; }
  td.num { font-size: 12px; font-weight: 600; color: var(--muted); text-align: center; }
  td.sac { font-size: 12px; font-weight: 600; color: var(--navy); text-align: center; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  .item-title { font-size: 13.5px; font-weight: 700; color: var(--navy); }
  .item-sub { font-size: 11.5px; color: var(--muted); margin-top: 3px; line-height: 1.4; }
  td.amt { font-size: 14px; font-weight: 700; color: var(--navy); text-align: right; white-space: nowrap; }
  .summary-row { display: flex; justify-content: space-between; align-items: stretch; gap: 16px; margin-top: 18px; margin-bottom: 18px; }
  .terms-box { flex: 1; min-width: 0; background: #f8fafc; border: 1px solid var(--line); border-radius: 10px; padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; }
  .terms-title { font-size: 10px; font-weight: 800; color: var(--navy); letter-spacing: 0.6px; text-transform: uppercase; margin-bottom: 8px; }
  .bank-list { list-style: none; font-size: 10.5px; color: var(--ink); line-height: 1.55; display: flex; flex-direction: column; gap: 3px; }
  .bank-list li { display: grid; grid-template-columns: 52px 1fr; gap: 6px; align-items: baseline; }
  .bank-key { color: var(--muted); font-weight: 600; }
  .bank-val { color: var(--navy); font-weight: 600; }
  .words-note { margin-top: 10px; font-size: 10.5px; color: var(--muted); border-top: 1px dashed var(--line); padding-top: 8px; line-height: 1.45; }
  .words-note b { color: var(--navy); }
  .upi-box { width: 196px; flex-shrink: 0; background: #ffffff; border: 1.5px solid var(--line); border-radius: 10px; padding: 12px 12px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.03); }
  .upi-header { display: flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.6px; color: var(--navy); text-transform: uppercase; margin-bottom: 6px; }
  .upi-dot { width: 6px; height: 6px; border-radius: 50%; background: #16a34a; display: inline-block; }
  .qr-frame { background: #ffffff; border: 1px solid var(--line); border-radius: 8px; padding: 5px; display: inline-block; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04); }
  .qr-frame img { width: 94px; height: 94px; display: block; object-fit: contain; }
  .upi-amt-tag { font-size: 14px; font-weight: 800; color: var(--accent); margin-top: 6px; line-height: 1.2; }
  .upi-amt-label { font-size: 8.5px; font-weight: 700; letter-spacing: 0.5px; color: var(--muted); text-transform: uppercase; }
  .upi-id-pill { margin-top: 5px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 5px; padding: 3px 6px; font-size: 9.5px; font-weight: 700; color: var(--navy); font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; text-decoration: none; display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .upi-id-pill:hover { background: var(--accent-subtle); border-color: var(--accent); color: var(--accent); text-decoration: none; }
  .upi-sub-note { font-size: 8.5px; color: var(--muted); margin-top: 4px; font-weight: 500; }
  .totals-box { width: 245px; flex-shrink: 0; background: #ffffff; border: 1.5px solid var(--line); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; justify-content: space-between; }
  .totals-row { display: flex; justify-content: space-between; padding: 7px 14px; font-size: 11px; color: var(--muted); border-bottom: 1px solid var(--line-subtle); }
  .totals-row span:last-child { font-weight: 600; color: var(--navy); }
  .totals-row.tds span:last-child { color: #b91c1c; }
  .totals-row.paid span:last-child { color: #059669; }
  .totals-row.pending span:last-child { color: #d97706; }
  .totals-row.final { background: #fafbfc; border-top: 2px solid var(--accent); border-bottom: none; padding: 10px 14px; font-size: 14px; font-weight: 800; color: var(--navy); }
  .totals-row.final .total-value { color: var(--accent); }
  .invoice-bottom { margin-top: 20px; border-top: 1px solid var(--line); padding-top: 20px; }
  .bottom-row { display: flex; justify-content: space-between; align-items: flex-end; }
  .thanks-block { text-align: left; }
  .thanks-title { font-size: 12px; font-weight: 700; color: var(--navy); }
  .thanks-sub { font-size: 10.5px; color: var(--muted); margin-top: 3px; line-height: 1.5; }
  .sign-box { text-align: right; }
  .sign-img { height: 36px; width: auto; display: block; margin-left: auto; margin-bottom: 4px; object-fit: contain; }
  .sign-line { width: 190px; border-bottom: 1.5px solid var(--navy); margin-bottom: 6px; margin-left: auto; }
  .sign-label { font-size: 11px; font-weight: 700; color: var(--navy); }
  .sign-sub { font-size: 9.5px; color: var(--muted); }
  @page { size: A4 portrait; margin: 12mm 14mm 12mm 14mm; }
  @media print {
    body { background: #ffffff; padding: 0; margin: 0; width: 100%; }
    .invoice { box-shadow: none; border-radius: 0; padding: 0; max-width: 100%; min-height: calc(297mm - 24mm); display: flex; flex-direction: column; justify-content: space-between; }
    .divider { background: var(--accent) !important; }
  }
</style>
</head>
<body>
  <div class="invoice">
    <div class="invoice-body">
      <div class="header">
        <div class="brand">
          <img src="${logoSrc}" alt="${LMA_SUPPLIER.brandName} Logo" class="brand-logo">
          <div class="brand-text">
            <h1>${LMA_SUPPLIER.legalName}</h1>
            <p>CIN: ${LMA_SUPPLIER.cin} &nbsp;•&nbsp; GSTIN: ${LMA_SUPPLIER.gstin} &nbsp;•&nbsp; PAN: ${LMA_SUPPLIER.pan}</p>
          </div>
        </div>
        <div class="title">
          <h2>TAX INVOICE</h2>
          <div class="inv-meta">
            Invoice No: <b>${escapeHtml(invoice.invoice_number)}</b><br>
            Date: <b>${escapeHtml(formatLongDate(invoice.invoice_date))}</b><br>
            Due Date: <b>${escapeHtml(formatLongDate(invoice.due_date))}</b>
          </div>
        </div>
      </div>

      <div class="divider"></div>

      <div class="meta-grid">
        <div class="meta-card">
          <div class="meta-label">BILL TO (CLIENT)</div>
          <div class="meta-name">${escapeHtml(invoice.client_legal_name)}</div>
          <div class="meta-text">
            ${clientAddressHtml}<br>
            GSTIN: <b>${escapeHtml(invoice.client_gstin || "Unregistered")}</b>${invoice.client_pan ? ` &nbsp;|&nbsp; PAN: <b>${escapeHtml(invoice.client_pan)}</b>` : ""}
          </div>
        </div>

        <div class="meta-card">
          <div class="meta-label">SUPPLIER &amp; SUPPLY DETAILS</div>
          <div class="meta-name">${LMA_SUPPLIER.shortName}</div>
          <div class="meta-text">
            ${LMA_SUPPLIER.addressLine1}<br>
            ${LMA_SUPPLIER.addressLine2}<br>
            Contact: <a href="mailto:${LMA_SUPPLIER.email}">${LMA_SUPPLIER.email}</a> &nbsp;|&nbsp; <a href="tel:${LMA_SUPPLIER.phoneRaw}">${LMA_SUPPLIER.phone}</a><br>
            Terms: <b>${escapeHtml(termsDisplay)}</b> &nbsp;|&nbsp; Place of Supply: <b>${escapeHtml(placeDisplay)}</b>
          </div>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th class="col-sac">SAC</th>
              <th>Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
${rowsHtml}
          </tbody>
        </table>
      </div>

      <div class="summary-row">
        <div class="terms-box">
          <div>
            <div class="terms-title">Bank Account Details</div>
            <ul class="bank-list">
              <li><span class="bank-key">Title:</span><span class="bank-val">${LMA_SUPPLIER.bank.title}</span></li>
              <li><span class="bank-key">Number:</span><span class="bank-val">${LMA_SUPPLIER.bank.accountNumber}</span></li>
              <li><span class="bank-key">Nature:</span><span class="bank-val">${LMA_SUPPLIER.bank.nature}</span></li>
              <li><span class="bank-key">Bank:</span><span class="bank-val">${LMA_SUPPLIER.bank.bankName}</span></li>
              <li><span class="bank-key">IFSC:</span><span class="bank-val">${LMA_SUPPLIER.bank.ifsc}</span></li>
            </ul>
          </div>
          <div class="words-note">
            In Words: <b>${escapeHtml(words)}</b>
          </div>
        </div>

        <div class="upi-box">
          <div class="upi-header">
            <span class="upi-dot"></span>
            <span>Scan to Pay (UPI)</span>
          </div>
          <div class="qr-frame">
            <img src="${qrSvgSrc}" alt="UPI QR Code - ${formatInrExact(netPayable)}" onerror="this.onerror=null; this.src='${qrPngSrc}';">
          </div>
          <div class="upi-amt-tag">${formatInrExact(netPayable)}</div>
          <div class="upi-amt-label">Total Payable</div>
          <a href="${escapeHtml(upiHref)}" class="upi-id-pill" title="Click to pay via UPI app">
            ${LMA_SUPPLIER.upiId}
          </a>
          <div class="upi-sub-note">GPay • PhonePe • Paytm • BHIM</div>
        </div>

        <div class="totals-box">
          <div>
            <div class="totals-row">
              <span>Sub Total</span>
              <span>${formatInrExact(invoice.subtotal)}</span>
            </div>
${invoice.discount_amount > 0 ? `            <div class="totals-row">
              <span>Discount</span>
              <span>(-) ${formatInrExact(invoice.discount_amount)}</span>
            </div>` : ""}
            <div class="totals-row">
              <span>Taxable Amount</span>
              <span>${formatInrExact(invoice.taxable_amount)}</span>
            </div>
${taxRowsHtml}
${(invoice.tds_amount || 0) > 0 ? `            <div class="totals-row tds">
              <span>${tdsSectionLabel}</span>
              <span>(-) ${formatInrExact(invoice.tds_amount || 0)}</span>
            </div>` : ""}
${paymentStripHtml}
          </div>
          <div class="totals-row final">
            <span>Total</span>
            <span class="total-value">${formatInrExact(netPayable)}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="invoice-bottom">
      <div class="bottom-row">
        <div class="thanks-block">
          <div class="thanks-title">Thank you for partnering with ${LMA_SUPPLIER.brandName}</div>
          <div class="thanks-sub">For any inquiries, contact us at <a href="mailto:${LMA_SUPPLIER.email}">${LMA_SUPPLIER.email}</a> or <a href="tel:${LMA_SUPPLIER.phoneRaw}">${LMA_SUPPLIER.phone}</a></div>
        </div>

        <div class="sign-box">
          <img src="${signSrc}" alt="${LMA_SUPPLIER.signatoryName} Signature" class="sign-img">
          <div class="sign-line"></div>
          <div class="sign-label">${LMA_SUPPLIER.signatoryName}</div>
          <div class="sign-sub">${LMA_SUPPLIER.signatoryTitle}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
