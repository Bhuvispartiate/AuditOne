/**
 * WhatsApp Automation Client for Linear Audit / PMS App
 * Integrates with the Go-based WhatsApp Automation Engine (port 8080).
 */

export interface WhatsAppInstanceStatus {
  success: boolean;
  connected: boolean;
  status: "CONNECTED" | "QR_READY" | "CONNECTING" | "DISCONNECTED" | "OFFLINE";
  phone_number?: string;
  instance_name?: string;
  error?: string;
}

export interface WhatsAppQRResponse {
  success: boolean;
  status: string;
  qrcode?: string; // Base64 Data URI (data:image/png;base64,...)
  code?: string;
  connected?: boolean;
  phone_number?: string;
  error?: string;
}

export interface WhatsAppMessagePayload {
  phone: string;
  message: string;
  idempotency_key?: string;
  reference_id?: string;
  document_base64?: string;
  document_name?: string;
}

export interface WhatsAppMessageResult {
  success: boolean;
  status: "SENT" | "DUPLICATE" | "FAILED" | "OFFLINE";
  message?: string;
  whatsapp_message_id?: string;
  error?: string;
  data?: any;
}

export interface WhatsAppAuditLog {
  id: string;
  phone: string;
  reference_id?: string;
  idempotency_key: string;
  message_content: string;
  status: string;
  whatsapp_message_id?: string;
  error_message?: string;
  created_at: string;
  sent_at?: string;
}

const STORAGE_KEY_URL = "pms_whatsapp_api_url";
const STORAGE_KEY_KEY = "pms_whatsapp_api_key";
const DEFAULT_API_URL = "http://localhost:8080";
const DEFAULT_API_KEY = "oxis_global_secret_key_change_me_in_production";

class WhatsAppClientService {
  public getBaseUrl(): string {
    return (localStorage.getItem(STORAGE_KEY_URL) || DEFAULT_API_URL).replace(/\/+$/, "");
  }

  public setBaseUrl(url: string): void {
    localStorage.setItem(STORAGE_KEY_URL, url.trim().replace(/\/+$/, ""));
  }

  public getApiKey(): string {
    return localStorage.getItem(STORAGE_KEY_KEY) || DEFAULT_API_KEY;
  }

  public setApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEY_KEY, key.trim());
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      apikey: this.getApiKey(),
      "X-API-Key": this.getApiKey(),
    };
  }

  /**
   * Fetch current engine connection status
   */
  public async getStatus(): Promise<WhatsAppInstanceStatus> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/instance/status`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        return {
          success: false,
          connected: false,
          status: "OFFLINE",
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }
      const data = await res.json();
      return {
        success: data.success ?? true,
        connected: data.data?.connected ?? false,
        status: data.data?.status ?? (data.data?.connected ? "CONNECTED" : "DISCONNECTED"),
        phone_number: data.data?.phone_number,
        instance_name: data.data?.instance_name,
      };
    } catch (err: any) {
      return {
        success: false,
        connected: false,
        status: "OFFLINE",
        error: err?.message || "WhatsApp backend server is not reachable on port 8080.",
      };
    }
  }

  /**
   * Fetch the pairing QR code
   */
  public async getQR(): Promise<WhatsAppQRResponse> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/instance/qr`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        return {
          success: false,
          status: "OFFLINE",
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }
      const json = await res.json();
      const d = json.data || {};
      return {
        success: json.success ?? true,
        status: d.status || "DISCONNECTED",
        qrcode: d.qrcode,
        code: d.code,
        connected: d.connected ?? (d.status === "CONNECTED"),
        phone_number: d.phone_number,
      };
    } catch (err: any) {
      return {
        success: false,
        status: "OFFLINE",
        error: err?.message || "Cannot connect to WhatsApp server.",
      };
    }
  }

  /**
   * Trigger connection sequence
   */
  public async connect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/instance/connect`, {
        method: "POST",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Disconnect WhatsApp session
   */
  public async disconnect(): Promise<boolean> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/instance/disconnect`, {
        method: "POST",
        headers: this.getHeaders(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Send a WhatsApp message to any phone number
   */
  public async sendMessage(payload: WhatsAppMessagePayload): Promise<WhatsAppMessageResult> {
    try {
      const cleanPhone = payload.phone.replace(/[^0-9]/g, "");
      const res = await fetch(`${this.getBaseUrl()}/api/v1/messages/send`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          phone: cleanPhone,
          message: payload.message,
          idempotency_key: payload.idempotency_key,
          reference_id: payload.reference_id,
          document_base64: payload.document_base64,
          document_name: payload.document_name,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          status: "FAILED",
          error: data.error || data.message || "Failed to dispatch WhatsApp message",
        };
      }
      return {
        success: true,
        status: data.status || "SENT",
        whatsapp_message_id: data.data?.whatsapp_message_id,
        message: data.message,
        data: data.data,
      };
    } catch (err: any) {
      return {
        success: false,
        status: "OFFLINE",
        error: err?.message || "WhatsApp backend offline or unreachable.",
      };
    }
  }

  /**
   * Retrieve sent message audit logs
   */
  public async getAuditLogs(): Promise<WhatsAppAuditLog[]> {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/v1/messages/logs`, {
        method: "GET",
        headers: this.getHeaders(),
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  }

  // -------------------------------------------------------------------------
  // BUSINESS AUTOMATION TEMPLATES
  // -------------------------------------------------------------------------

  /**
   * Task Assigned Alert
   */
  public async sendTaskAssignment(
    phone: string,
    assigneeName: string,
    taskTitle: string,
    stageOrWorkflow: string,
    dueDate?: string
  ): Promise<WhatsAppMessageResult> {
    const msg = [
      `📋 *PMS AUDIT — NEW TASK ALLOCATED*`,
      ``,
      `Hello *${assigneeName}*,`,
      `You have been allocated a task: *${taskTitle}* under *${stageOrWorkflow}*.`,
      dueDate ? `📅 Due Date: *${dueDate}*` : null,
      ``,
      `Please check your execution dashboard to view instructions, subtasks, and documents.`,
      `👉 View Task: https://portal.linearaudit.example/tasks`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    return this.sendMessage({
      phone,
      message: msg,
      idempotency_key: `task-assign-${taskTitle}-${Date.now()}`,
    });
  }

  /**
   * Milestone / Stage Completion Alert
   */
  public async sendMilestoneProgress(
    phone: string,
    clientName: string,
    milestoneTitle: string,
    stageName: string,
    workflowName: string
  ): Promise<WhatsAppMessageResult> {
    const msg = [
      `🚀 *LINEAR AUDIT — WORKFLOW UPDATE*`,
      ``,
      `Dear *${clientName}*,`,
      `Progress update on your service *${workflowName}*:`,
      `• *Milestone:* ${milestoneTitle}`,
      `• *Stage Completed:* ${stageName}`,
      ``,
      `Our team is progressing with the next stage deliverables. You can track real-time milestones anytime on your client portal.`,
      `👉 Client Portal: https://portal.linearaudit.example/client-360`,
      ``,
      `_Linear Management Advisory Pvt Ltd_`,
    ].join("\n");

    return this.sendMessage({
      phone,
      message: msg,
      idempotency_key: `wf-progress-${clientName}-${stageName}-${Date.now()}`,
    });
  }

  /**
   * Document Requisition
   */
  public async sendDocumentRequisition(
    phone: string,
    clientName: string,
    serviceName: string,
    documents: string[]
  ): Promise<WhatsAppMessageResult> {
    const docsList = documents.map((d) => `• ${d}`).join("\n");
    const msg = [
      `📂 *LINEAR AUDIT — PENDING DOCUMENTS REQUIRED*`,
      ``,
      `Dear *${clientName}*,`,
      `To proceed with your *${serviceName}*, our team requires the following source documents:`,
      ``,
      docsList,
      ``,
      `Please upload the files to your secure Drop Box on the portal:`,
      `👉 https://portal.linearaudit.example/documents`,
      ``,
      `Thank you for your prompt assistance!`,
      `_Linear Management Advisory Pvt Ltd_`,
    ].join("\n");

    return this.sendMessage({
      phone,
      message: msg,
      idempotency_key: `doc-req-${clientName}-${Date.now()}`,
    });
  }

  /**
   * Invoice Reminder
   */
  public async sendInvoiceReminder(
    phone: string,
    clientName: string,
    invoiceNumber: string,
    amount: string,
    dueDate: string
  ): Promise<WhatsAppMessageResult> {
    const msg = [
      `💼 *LINEAR AUDIT — INVOICE PAYMENT REMINDER*`,
      ``,
      `Dear *${clientName}*,`,
      `This is a gentle reminder regarding outstanding Invoice *#${invoiceNumber}* for *₹${amount}*, due on *${dueDate}*.`,
      ``,
      `You can view the detailed bill and settle payment via UPI or Net Banking on your portal:`,
      `👉 https://portal.linearaudit.example/invoices`,
      ``,
      `If payment has already been initiated, please disregard this notice.`,
      `_Linear Management Advisory Pvt Ltd_`,
    ].join("\n");

    return this.sendMessage({
      phone,
      message: msg,
      idempotency_key: `inv-rem-${invoiceNumber}`,
    });
  }

  /**
   * Statutory Compliance Deadline Warning
   */
  public async sendDeadlineWarning(
    phone: string,
    clientName: string,
    filingName: string,
    dueDate: string,
    daysLeft: number
  ): Promise<WhatsAppMessageResult> {
    const msg = [
      `🔔 *STATUTORY COMPLIANCE DEADLINE ALERT*`,
      ``,
      `Dear *${clientName}*,`,
      `Reminder: Your *${filingName}* is due in *${daysLeft} day${daysLeft === 1 ? "" : "s"}* (*${dueDate}*).`,
      ``,
      `To avoid interest and penalty fees under statutory regulations, please review and approve your return drafts today.`,
      `👉 View Filing: https://portal.linearaudit.example/workflows`,
      ``,
      `_Linear Management Advisory Pvt Ltd_`,
    ].join("\n");

    return this.sendMessage({
      phone,
      message: msg,
      idempotency_key: `deadline-${clientName}-${filingName}-${dueDate}`,
    });
  }
}

export const whatsappClient = new WhatsAppClientService();

