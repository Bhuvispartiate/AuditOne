"""
Linear Audit Management — WhatsApp Automation Client
Integrates with the local Go WhatsApp Engine (whatsmeow / evolution-go-backend) on port 8080.
Dispatches statutory compliance alerts, document requests, and invoice payment reminders via WhatsApp.
"""

import os
import requests
from typing import Optional, Dict, Any

WHATSAPP_API_URL = os.getenv("WHATSAPP_API_URL", "http://localhost:8080")
WHATSAPP_API_KEY = os.getenv("WHATSAPP_API_KEY", "oxis_global_secret_key_change_me_in_production")


class WhatsAppService:
    def __init__(self, base_url: str = None, api_key: str = None):
        self.base_url = (base_url or WHATSAPP_API_URL).rstrip("/")
        self.api_key = api_key or WHATSAPP_API_KEY
        self.headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }

    def get_status(self) -> Dict[str, Any]:
        """Checks if the Go WhatsApp engine is connected or waiting for QR scan."""
        try:
            res = requests.get(f"{self.base_url}/status", headers=self.headers, timeout=5)
            return res.json()
        except Exception as e:
            return {"status": "OFFLINE", "error": str(e)}

    def get_qr_code(self) -> Dict[str, Any]:
        """Fetches the Base64 QR code to pair the firm's WhatsApp account."""
        try:
            res = requests.get(f"{self.base_url}/qr", headers=self.headers, timeout=5)
            return res.json()
        except Exception as e:
            return {"error": str(e)}

    def send_message(self, phone: str, message: str, idempotency_key: str = None) -> Dict[str, Any]:
        """
        Sends an automated WhatsApp text message to a client or team member.
        phone: In international format without '+' (e.g., '919876543210')
        """
        payload = {
            "phone": phone.replace("+", "").replace(" ", "").replace("-", ""),
            "message": message
        }
        if idempotency_key:
            payload["idempotency_key"] = idempotency_key

        try:
            res = requests.post(f"{self.base_url}/message/sendText", json=payload, headers=self.headers, timeout=10)
            return res.json()
        except Exception as e:
            return {"status": "FAILED", "error": str(e)}

    # -------------------------------------------------------------------------
    # LINEAR AUDIT STATUTORY PRACTICE ALERTS
    # -------------------------------------------------------------------------

    def send_deadline_alert(self, phone: str, client_name: str, filing_name: str, due_date: str, days_left: int):
        """Sends a high-priority statutory deadline warning."""
        msg = (
            f"🔔 *LINEAR AUDIT — STATUTORY COMPLIANCE NOTICE*\n\n"
            f"Dear *{client_name}*,\n"
            f"This is a reminder that your *{filing_name}* is due in *{days_left} days* (Due Date: *{due_date}*).\n\n"
            f"To prevent late fees and penalty charges, please ensure all source records and queries are cleared on your portal.\n\n"
            f"👉 Track Live Progress: https://portal.linearaudit.example/progress\n\n"
            f"_Linear Management Advisory Pvt Ltd_"
        )
        return self.send_message(phone, msg, idempotency_key=f"dl-{client_name}-{due_date}")

    def send_document_requisition(self, phone: str, client_name: str, service_name: str, documents: list):
        """Sends a request for missing source documents."""
        docs_str = "\n".join([f"• {doc}" for doc in documents])
        msg = (
            f"📂 *LINEAR AUDIT — PENDING DOCUMENT REQUISITION*\n\n"
            f"Dear *{client_name}*,\n"
            f"To proceed with your *{service_name}*, our execution team requires the following pending documents:\n\n"
            f"{docs_str}\n\n"
            f"Please drop the files into your secure portal Drop Box:\n"
            f"👉 https://portal.linearaudit.example/drop-box\n\n"
            f"_Linear Management Advisory Pvt Ltd_"
        )
        return self.send_message(phone, msg)

    def send_invoice_reminder(self, phone: str, client_name: str, invoice_no: str, amount: str, due_date: str):
        """Sends an outstanding invoice settlement reminder."""
        msg = (
            f"💼 *LINEAR AUDIT — INVOICE PAYMENT REMINDER*\n\n"
            f"Dear *{client_name}*,\n"
            f"Invoice *{invoice_no}* for *{amount}* is pending payment (Due Date: *{due_date}*).\n\n"
            f"You can view the detailed GST bill or settle online via UPI / NetBanking:\n"
            f"👉 https://portal.linearaudit.example/invoices\n\n"
            f"Thank you for choosing Linear Audit."
        )
        return self.send_message(phone, msg, idempotency_key=f"inv-{invoice_no}")


if __name__ == "__main__":
    client = WhatsAppService()
    print("Linear Audit — WhatsApp Automation Integration Test")
    print("Checking local Go WhatsApp service status...")
    status = client.get_status()
    print("Service response:", status)

