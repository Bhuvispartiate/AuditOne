import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  QrCode,
  RefreshCw,
  Send,
  Smartphone,
  Unplug,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  whatsappClient,
  WhatsAppInstanceStatus,
  WhatsAppQRResponse,
  WhatsAppAuditLog,
} from "@/lib/whatsapp-client";

export function WhatsAppSettingsTab() {
  const [status, setStatus] = useState<WhatsAppInstanceStatus>({
    success: false,
    connected: false,
    status: "OFFLINE",
  });
  const [qrData, setQrData] = useState<WhatsAppQRResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [apiUrl] = useState(whatsappClient.getBaseUrl());
  const [logs, setLogs] = useState<WhatsAppAuditLog[]>([]);

  // Test sender state
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("custom");
  const [testMessage, setTestMessage] = useState(
    "👋 Hello! This is a test WhatsApp message from the Linear Audit & PMS Automation Engine."
  );
  const [sending, setSending] = useState(false);

  const fetchStatusAndQr = async () => {
    const st = await whatsappClient.getStatus();
    setStatus(st);
    if (st.connected) {
      setQrData(null);
    } else if (st.status !== "OFFLINE") {
      const qr = await whatsappClient.getQR();
      setQrData(qr);
    }
  };

  const fetchLogs = async () => {
    const auditLogs = await whatsappClient.getAuditLogs();
    setLogs(auditLogs);
  };

  useEffect(() => {
    fetchStatusAndQr();
    fetchLogs();
    const interval = setInterval(() => {
      fetchStatusAndQr();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    await whatsappClient.connect();
    toast.info("WhatsApp connection sequence triggered. Please wait a moment for the QR code...");
    setTimeout(() => {
      fetchStatusAndQr();
      setConnecting(false);
    }, 2000);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    const ok = await whatsappClient.disconnect();
    if (ok) {
      toast.success("WhatsApp session logged out.");
    } else {
      toast.error("Failed to disconnect WhatsApp session.");
    }
    await fetchStatusAndQr();
    setLoading(false);
  };

  const handleTemplateChange = (tmpl: string) => {
    setTestTemplate(tmpl);
    if (tmpl === "task") {
      setTestMessage(
        "📋 *PMS AUDIT — NEW TASK ALLOCATED*\n\nHello *Team Member*,\nYou have been allocated: *Verify GSTR-2B Reconciliation* under *October 2026 GST Filing*.\n📅 Due Date: *2026-11-20*\n\nPlease check your portal dashboard for workpapers and client data."
      );
    } else if (tmpl === "milestone") {
      setTestMessage(
        "🚀 *LINEAR AUDIT — MILESTONE PROGRESS UPDATE*\n\nDear *Acme Corp*,\nProgress update on your *GST Monthly Filing* service:\n• *Milestone:* Milestone 1 (GSTR-1)\n• *Stage:* Data Verification Completed\n\nOur team has initiated data filing. Track live progress anytime on your portal."
      );
    } else if (tmpl === "invoice") {
      setTestMessage(
        "💼 *LINEAR AUDIT — INVOICE REMINDER*\n\nDear *Acme Corp*,\nInvoice *#INV-2026-104* for *₹25,000* is pending settlement (Due: *2026-11-25*).\n\nYou can pay online via UPI or Net Banking:\n👉 https://portal.linearaudit.example/invoices"
      );
    } else if (tmpl === "documents") {
      setTestMessage(
        "📂 *LINEAR AUDIT — PENDING DOCUMENTS REQUIRED*\n\nDear *Acme Corp*,\nTo proceed with your *Statutory Audit FY 2025-26*, please upload:\n• Bank Statements (April - March)\n• Fixed Asset Invoices\n• GST Reconciliation Ledger\n\nDrop files to: https://portal.linearaudit.example/documents"
      );
    } else {
      setTestMessage(
        "👋 Hello! This is a test WhatsApp message from the Linear Audit & PMS Automation Engine."
      );
    }
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) {
      toast.error("Please enter a recipient phone number with country code (e.g. 919876543210).");
      return;
    }
    if (!testMessage.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    setSending(true);
    const result = await whatsappClient.sendMessage({
      phone: testPhone.trim(),
      message: testMessage.trim(),
    });
    setSending(false);

    if (result.success && result.status === "SENT") {
      toast.success(`Message dispatched via WhatsApp to +${testPhone.trim()}!`);
      fetchLogs();
    } else {
      toast.error(`WhatsApp send failed: ${result.error || result.status}`);
    }
  };

  const getStatusBadge = () => {
    if (status.status === "CONNECTED") {
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2.5 py-1">
          <Wifi className="h-3 w-3" />
          <span>Connected (+{status.phone_number || "Active"})</span>
        </Badge>
      );
    }
    if (status.status === "QR_READY") {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 px-2.5 py-1">
          <QrCode className="h-3 w-3" />
          <span>Scan QR Code</span>
        </Badge>
      );
    }
    if (status.status === "CONNECTING") {
      return (
        <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 px-2.5 py-1">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Connecting...</span>
        </Badge>
      );
    }
    if (status.status === "DISCONNECTED") {
      return (
        <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-slate-700">
          <Unplug className="h-3 w-3" />
          <span>Disconnected</span>
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1 px-2.5 py-1">
        <WifiOff className="h-3 w-3" />
        <span>Backend Offline (Port 8080)</span>
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. STATUS & PAIRING CARD */}
      <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-extrabold text-[#111827]">
                  WhatsApp Automation Engine
                </CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription className="text-xs mt-0.5">
                Go + Whatsmeow engine for automated statutory notifications, client alerts &amp; invoice reminders.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchStatusAndQr}
              className="h-8 rounded-xl border-slate-300 text-xs font-bold gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh</span>
            </Button>
            {status.status === "CONNECTED" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={loading}
                className="h-8 rounded-xl border-rose-300 text-rose-600 hover:bg-rose-50 text-xs font-bold gap-1"
              >
                <Unplug className="h-3 w-3" />
                <span>Disconnect</span>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleConnect}
                disabled={connecting}
                className="h-8 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1"
              >
                <Wifi className="h-3 w-3" />
                <span>{connecting ? "Starting..." : "Connect WhatsApp"}</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {status.status === "OFFLINE" && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 space-y-2 text-rose-800">
              <div className="flex items-center gap-2 font-bold text-xs">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>WhatsApp Engine is not running on {apiUrl}</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                To activate automated messaging, launch the backend engine by running the included start script:
              </p>
              <div className="rounded-xl bg-neutral-900 text-white font-mono text-[11px] p-2.5 flex items-center justify-between gap-2">
                <span>npm run whatsapp</span>
                <span className="text-emerald-400 font-sans text-[10px] font-bold">Port 8085</span>
              </div>
            </div>
          )}

          {/* QR Code display when pairing needed */}
          {qrData?.qrcode && status.status !== "CONNECTED" && (
            <div className="rounded-2xl border-[1.5px] border-amber-300 bg-amber-50/50 p-5 flex flex-col md:flex-row items-center gap-5">
              <div className="bg-white p-3 rounded-2xl border border-slate-300 shadow-sm shrink-0">
                <img
                  src={qrData.qrcode}
                  alt="WhatsApp Pair QR Code"
                  className="w-48 h-48 rounded-xl object-contain"
                />
              </div>
              <div className="space-y-2 text-xs">
                <span className="font-mono text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Step 1 of 1: Scan with WhatsApp
                </span>
                <h4 className="text-sm font-extrabold text-[#111827]">
                  Pair Your Firm&apos;s WhatsApp Number
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium leading-relaxed">
                  <li>Open <strong>WhatsApp</strong> on your phone</li>
                  <li>Tap <strong>Settings / Menu (⋮)</strong> &gt; <strong>Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point your camera at this QR code</li>
                </ol>
                <p className="text-[11px] text-slate-500 pt-1">
                  Once scanned, your firm&apos;s official WhatsApp will automatically link and display a green &quot;Connected&quot; status.
                </p>
              </div>
            </div>
          )}

          {status.status === "CONNECTED" && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex items-center gap-3 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-emerald-900">
                  WhatsApp Engine is Online &amp; Authenticated
                </p>
                <p className="text-emerald-700 mt-0.5">
                  Connected device: <strong>+{status.phone_number || "Active Session"}</strong>. Automated notifications across Workflows, Tasks, Invoices, and Documents are active.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. TEST DISPATCHER & PRESET TEMPLATES */}
      <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-sm font-extrabold text-[#111827] flex items-center gap-2">
            <Send className="h-4 w-4 text-emerald-600" />
            <span>Instant Test Message Sender</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Test automated messaging templates to any mobile number with country code.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSendTest} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                Recipient WhatsApp Number *
              </label>
              <Input
                placeholder="e.g. 919876543210 (without + or spaces)"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="h-9 rounded-xl border-slate-300 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                Message Preset
              </label>
              <select
                value={testTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold"
              >
                <option value="custom">Custom Message</option>
                <option value="task">Task Allocated Notification</option>
                <option value="milestone">Milestone / Stage Progress</option>
                <option value="invoice">Invoice Payment Reminder</option>
                <option value="documents">Document Requisition Alert</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase">
                Message Body
              </label>
              <Textarea
                rows={4}
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="rounded-xl border-slate-300 text-xs font-mono"
              />
            </div>

            <Button
              type="submit"
              disabled={sending || status.status === "OFFLINE"}
              className="w-full h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sending ? "Sending..." : "Dispatch Test WhatsApp"}</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 4. SENT MESSAGES AUDIT LOG */}
      <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-extrabold text-[#111827]">
              WhatsApp Dispatch Audit Logs
            </CardTitle>
            <CardDescription className="text-xs">
              Recent automated messages sent via the WhatsApp engine.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={fetchLogs}
            className="h-8 rounded-xl text-xs font-bold gap-1 text-slate-600"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reload Logs</span>
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          {logs.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No WhatsApp messages logged yet. Use the test sender above or trigger a workflow alert to test.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827]">+{log.phone}</span>
                      <Badge
                        variant={log.status === "SENT" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {log.status}
                      </Badge>
                    </div>
                    <p className="text-slate-600 text-[11px] truncate mt-0.5 max-w-lg">
                      {log.message_content}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

