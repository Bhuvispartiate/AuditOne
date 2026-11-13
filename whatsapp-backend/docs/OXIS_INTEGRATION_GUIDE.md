# OXIS WhatsApp Automation - OXEV Integration Guide

This guide explains how the **OXEV Backend** integrates with the standalone **OXIS WhatsApp Automation Service** to automatically send WhatsApp confirmation messages to students after a successful Cashfree payment.

---

## 1. Flow Architecture

```text
Student Registers for Event on OXEV
                │
                ▼
Student Completes Cashfree Payment
                │
                ▼
Cashfree Webhook / Return URL Received by OXEV Backend
                │
                ▼
OXEV Backend Verifies Payment Signature & Status with Cashfree API
                │
    ┌───────────┴───────────┐
    │ Is Payment Successful?│
    └───┬───────────────┬───┘
        │ YES           │ NO
        ▼               ▼
1. Mark Registration   Handle Failed Payment
   Status: CONFIRMED   (No WhatsApp Confirmation)
2. Call OXIS WhatsApp
   Automation API
        │ (POST /api/v1/automation/payment-confirmation)
        ▼
OXIS WhatsApp Automation Service
        │
   ┌────┴──────────────────────────────────────┐
   │ 1. Validate Bearer <OXEV_SERVICE_API_KEY> │
   │ 2. Check Idempotency Key (Deduplication)  │
   │ 3. Render 'payment_confirmation' Template │
   │ 4. Send Message via Whatsmeow Engine      │
   │ 5. Save Audit Log to Database             │
   └────┬──────────────────────────────────────┘
        │
        ▼
Student WhatsApp Device (Confirmation Received 🎉)
```

---

## 2. OXEV Backend Implementation Examples

### TypeScript / Node.js (Axios / Fetch)

```typescript
import axios from "axios";

interface SendPaymentConfirmationParams {
  phone: string;
  studentName: string;
  eventName: string;
  registrationId: string;
  amount: number;
  paymentId: string;
}

export async function sendWhatsAppPaymentConfirmation(params: SendPaymentConfirmationParams) {
  const oxisBaseUrl = process.env.OXIS_WHATSAPP_API_URL || "http://localhost:8080";
  const oxevApiKey = process.env.OXEV_SERVICE_API_KEY;

  try {
    const response = await axios.post(
      `${oxisBaseUrl}/api/v1/automation/payment-confirmation`,
      {
        phone: params.phone,
        student_name: params.studentName,
        event_name: params.eventName,
        registration_id: params.registrationId,
        amount: params.amount,
        payment_id: params.paymentId,
        idempotency_key: `payment-confirmation-${params.registrationId}`,
      },
      {
        headers: {
          Authorization: `Bearer ${oxevApiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("[OXIS WhatsApp] Confirmation sent successfully:", response.data);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("[OXIS WhatsApp] API error:", error.response.status, error.response.data);
    } else {
      console.error("[OXIS WhatsApp] Network error:", error.message);
    }
    // Do not fail the registration flow if WhatsApp service encounters a temporary issue
    return null;
  }
}
```

---

### Python (FastAPI / requests)

```python
import os
import requests

def send_whatsapp_payment_confirmation(
    phone: str,
    student_name: str,
    event_name: str,
    registration_id: str,
    amount: float,
    payment_id: str,
):
    oxis_base_url = os.getenv("OXIS_WHATSAPP_API_URL", "http://localhost:8080")
    oxev_api_key = os.getenv("OXEV_SERVICE_API_KEY")

    payload = {
        "phone": phone,
        "student_name": student_name,
        "event_name": event_name,
        "registration_id": registration_id,
        "amount": amount,
        "payment_id": payment_id,
        "idempotency_key": f"payment-confirmation-{registration_id}",
    }

    headers = {
        "Authorization": f"Bearer {oxev_api_key}",
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            f"{oxis_base_url}/api/v1/automation/payment-confirmation",
            json=payload,
            headers=headers,
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"[OXIS WhatsApp] Error sending confirmation: {e}")
        return None
```

---

## 3. QR Code Pairing Instructions

To connect your official WhatsApp account:

1. Start the OXIS WhatsApp Automation service.
2. Open a browser or make a GET request to:
   ```bash
   curl http://localhost:8080/api/v1/instance/qr
   ```
   Or navigate to the built-in visual QR manager:
   ```text
   http://localhost:8080/manager
   ```
3. Open **WhatsApp** on your phone -> **Linked Devices** -> **Link a Device**.
4. Scan the QR code displayed.
5. Check the status endpoint:
   ```bash
   curl http://localhost:8080/api/v1/instance/status
   ```
   The response will show `"connected": true` and `"status": "CONNECTED"`.

---

## 4. Idempotency & Deduplication

Webhooks from payment gateways can be delivered multiple times. The OXIS service guarantees:
- Every payment confirmation request with the same `registration_id` uses the idempotency key `payment-confirmation-{registration_id}`.
- If a webhook retry arrives after the message was already sent, the service immediately returns `status: "DUPLICATE"` with the original message details and will **not** send duplicate WhatsApp messages to the student.
