# OXIS WhatsApp Automation API Documentation

## Base URL
```text
http://localhost:8080
```

## Authentication

All protected endpoints require authentication via either:
1. **Bearer Token Header**:
   ```http
   Authorization: Bearer <YOUR_API_KEY>
   ```
2. **API Key Header**:
   ```http
   apikey: <YOUR_API_KEY>
   ```

### Key Types
- **OXEV Service Key (`OXEV_SERVICE_API_KEY`)**: Used by OXEV backend for `/api/v1/automation/*` and `/api/v1/messages/*`.
- **OXIS Global Admin Key (`OXIS_GLOBAL_API_KEY`)**: Used for administrative control and instance management (`/api/v1/instance/*`).

---

## 1. System & Health

### Health Check
`GET /health`

**Description:** Returns service status and WhatsApp connection state. Does not require authentication.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "oxis-whatsapp-automation",
  "environment": "development",
  "uptime": "12m34s",
  "whatsapp": {
    "instance_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "instance_name": "oxev-main",
    "status": "CONNECTED",
    "connected": true
  }
}
```

---

## 2. WhatsApp Instance Management

### Get Instance Status
`GET /api/v1/instance/status`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "instance_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "instance_name": "oxev-main",
    "status": "CONNECTED",
    "connected": true,
    "phone_number": "919876543210@s.whatsapp.net"
  }
}
```

Possible statuses:
- `DISCONNECTED`
- `CONNECTING`
- `QR_READY`
- `CONNECTED`
- `RECONNECTING`
- `LOGGED_OUT`
- `ERROR`

---

### Get QR Code
`GET /api/v1/instance/qr`

**Description:** Returns Base64 QR code to scan with the WhatsApp mobile app.

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "instance_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "instance_name": "oxev-main",
    "status": "QR_READY",
    "qrcode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "code": "2@4A8c...=="
  }
}
```

---

### Connect Instance
`POST /api/v1/instance/connect`

**Headers:**
`Authorization: Bearer <OXIS_GLOBAL_API_KEY>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Connection initiated",
  "data": {
    "instance_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "instance_name": "oxev-main",
    "status": "QR_READY"
  }
}
```

---

### Disconnect Instance
`POST /api/v1/instance/disconnect`

**Headers:**
`Authorization: Bearer <OXIS_GLOBAL_API_KEY>`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "WhatsApp instance disconnected successfully"
}
```

---

## 3. Automation APIs

### Event Registration Payment Confirmation
`POST /api/v1/automation/payment-confirmation`

**Headers:**
`Authorization: Bearer <OXEV_SERVICE_API_KEY>`
`Content-Type: application/json`

**Request Body:**
```json
{
  "phone": "919876543210",
  "student_name": "Rohit Kumar",
  "event_name": "AION 2026",
  "registration_id": "AION-1045",
  "amount": 299,
  "payment_id": "cf_pay_9384729184",
  "idempotency_key": "payment-confirmation-AION-1045"
}
```

**Message Sent to Student:**
```text
Hi Rohit Kumar! 👋

🎉 Payment Successful!

Your payment of ₹299 for AION 2026 has been successfully received.

✅ Your registration is confirmed.

🆔 Registration ID: AION-1045

You will receive further event updates on this WhatsApp number.

Thank you!
OXEV Team 🚀
```

**Response (200 OK - Sent):**
```json
{
  "success": true,
  "status": "SENT",
  "data": {
    "id": "e5c7a109-1a74-4b57-a3ee-876b32817290",
    "phone": "919876543210",
    "reference_id": "AION-1045",
    "idempotency_key": "payment-confirmation-AION-1045",
    "status": "SENT",
    "whatsapp_message_id": "3EB0ABC1234567890DEF",
    "message_content": "Hi Rohit Kumar! 👋\n\n🎉 Payment Successful!...",
    "sent_at": "2026-08-27T08:50:00Z"
  }
}
```

**Response (200 OK - Deduplicated / Already Processed):**
```json
{
  "success": true,
  "status": "DUPLICATE",
  "data": {
    "id": "e5c7a109-1a74-4b57-a3ee-876b32817290",
    "phone": "919876543210",
    "reference_id": "AION-1045",
    "idempotency_key": "payment-confirmation-AION-1045",
    "status": "DUPLICATE",
    "whatsapp_message_id": "3EB0ABC1234567890DEF",
    "sent_at": "2026-08-27T08:50:00Z"
  }
}
```

---

## 4. Generic Message Sending API

### Send Text Message
`POST /api/v1/messages/send`

**Headers:**
`Authorization: Bearer <OXEV_SERVICE_API_KEY>`
`Content-Type: application/json`

**Request Body:**
```json
{
  "phone": "919876543210",
  "message": "Your registration has been confirmed.",
  "source": "oxev",
  "reference_id": "REG_12345",
  "idempotency_key": "payment-confirmation-REG_12345"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "status": "SENT",
  "data": {
    "id": "76d8ef01-1b9a-4e58-a8ee-997c43818301",
    "phone": "919876543210",
    "source": "oxev",
    "reference_id": "REG_12345",
    "idempotency_key": "payment-confirmation-REG_12345",
    "status": "SENT",
    "whatsapp_message_id": "3EB0XYZ9876543210ABC",
    "sent_at": "2026-08-27T08:50:00Z"
  }
}
```

---

## 5. Error Responses

All error responses return structured JSON with descriptive error codes:

```json
{
  "success": false,
  "error": {
    "code": "WHATSAPP_DISCONNECTED",
    "message": "The configured WhatsApp instance is not connected. Please connect via QR code."
  }
}
```

### Common Error Codes:
- `UNAUTHORIZED`: Invalid or missing Bearer token / API key.
- `INVALID_REQUEST`: Missing or malformed request payload.
- `MISSING_PHONE`: Required recipient phone number is missing.
- `WHATSAPP_DISCONNECTED`: WhatsApp client is not linked/connected.
- `SEND_FAILED`: WhatsApp network or protocol dispatch error.
