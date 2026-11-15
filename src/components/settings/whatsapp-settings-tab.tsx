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
  Terminal,
  Unplug,
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { pmsStore } from "@/lib/data/store";
import { WhatsAppTemplate } from "@/types";
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

  // Saved WhatsApp Templates state
  const [, setTick] = useState(0);
  const templates = pmsStore.getWhatsAppTemplates();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateCategory, setTemplateCategory] = useState<"Task" | "Subtask" | "Workflow" | "General">("Task");
  const [templateContent, setTemplateContent] = useState("");

  const handleOpenAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateTitle("");
    setTemplateCategory("Task");
    setTemplateContent("");
    setIsTemplateModalOpen(true);
  };

  const handleOpenEditTemplate = (tpl: WhatsAppTemplate) => {
    setEditingTemplate(tpl);
    setTemplateTitle(tpl.title);
    setTemplateCategory(tpl.category);
    setTemplateContent(tpl.content);
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim()) {
      toast.error("Please enter a template title.");
      return;
    }
    if (!templateContent.trim()) {
      toast.error("Please enter template message content.");
      return;
    }

    try {
      if (editingTemplate) {
        await pmsStore.updateWhatsAppTemplate(editingTemplate.id, {
          title: templateTitle.trim(),
          category: templateCategory,
          content: templateContent.trim(),
        });
        toast.success(`Template "${templateTitle}" updated in Supabase.`);
      } else {
        await pmsStore.addWhatsAppTemplate({
          title: templateTitle.trim(),
          category: templateCategory,
          content: templateContent.trim(),
        });
        toast.success(`Template "${templateTitle}" saved to Supabase.`);
      }

      setTick((t) => t + 1);
      setIsTemplateModalOpen(false);
    } catch (err: any) {
      toast.error(`Database error: ${err.message || "Failed to save template."}`);
    }
  };

  const handleDeleteTemplate = async (id: string, title: string) => {
    try {
      await pmsStore.deleteWhatsAppTemplate(id);
      setTick((t) => t + 1);
      toast.success(`Template "${title}" removed.`);
    } catch (err: any) {
      toast.error(`Failed to delete template: ${err.message || err}`);
    }
  };

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

      {/* 4. SAVED WHATSAPP MESSAGE TEMPLATES */}
      <Card className="rounded-[24px] border-[1.5px] border-slate-300 shadow-xs">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-extrabold text-[#111827] flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>Saved WhatsApp Message Templates</span>
              <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                {templates.length} Templates
              </Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Saved fixed message templates with titles for Tasks, Subtasks, Workflows, and General Client Updates.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleOpenAddTemplate}
            className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold gap-1 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Template</span>
          </Button>
        </CardHeader>
        <CardContent className="p-5">
          {templates.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-500">
              No saved templates. Click &ldquo;Add Template&rdquo; to create your first standard message format.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map((tpl: WhatsAppTemplate) => (
                <div
                  key={tpl.id}
                  className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex flex-col justify-between gap-2.5 hover:border-emerald-300 transition-all"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-slate-900 truncate">
                        {tpl.title}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold rounded-md px-1.5 py-0.2 border-slate-200 bg-slate-50 text-slate-700 shrink-0"
                      >
                        {tpl.category}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                      {tpl.content}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                    <span>
                      Variables: <code className="text-emerald-700 font-mono">{"{client_name}"}</code>, <code className="text-emerald-700 font-mono">{"{task_title}"}</code>
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditTemplate(tpl)}
                        className="h-6 w-6 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                        title="Edit Template"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTemplate(tpl.id, tpl.title)}
                        className="h-6 w-6 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                        title="Delete Template"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. SENT MESSAGES AUDIT LOG */}
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

      {/* MODAL: ADD / EDIT WHATSAPP TEMPLATE */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-lg rounded-[24px] border-[1.5px] border-slate-300 bg-white p-6 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-emerald-600" />
              <span>{editingTemplate ? "Edit WhatsApp Template" : "Add WhatsApp Template"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Save reusable communication formats with variable placeholders for tasks, subtasks, and workflows.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTemplate} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Template Title *</label>
              <Input
                placeholder="e.g. GST Filing Status Update, Tax Notice Alert..."
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                required
                className="h-10 rounded-xl border-slate-300 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Category Scope</label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value as any)}
                className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold"
              >
                <option value="Task">Task Deliverable</option>
                <option value="Subtask">Subtask Execution</option>
                <option value="Workflow">Engagement Workflow</option>
                <option value="General">General Client Notice</option>
              </select>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Template Message Content *</label>
                <span className="text-[10px] text-slate-400">Supports WhatsApp bold (*text*)</span>
              </div>
              <Textarea
                placeholder="Type template message body with placeholders like {client_name}, {task_title}, {due_date}..."
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                rows={5}
                required
                className="text-xs rounded-xl border-slate-300 font-sans leading-relaxed"
              />
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 mr-1">Click to insert:</span>
                {["{client_name}", "{task_title}", "{due_date}", "{status}", "{project_name}"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTemplateContent((prev) => `${prev} ${tag}`)}
                    className="px-2 py-0.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[10px] font-mono text-slate-700"
                  >
                    +{tag}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsTemplateModalOpen(false)}
                className="rounded-xl border-slate-300 text-xs font-bold h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9"
              >
                {editingTemplate ? "Save Changes" : "Create Template"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

