# Comprehensive Project Report: OXIS WhatsApp Automation & Evolution Go

> **Document Type:** Full-Scope Architectural, Technical, and Functional Specification  
> **Repository:** `evolution-go-main` (OXIS WhatsApp Automation Service)  
> **Target Audience:** Developers, DevOps Engineers, Architects, and Product Integrators  
> **Date:** August 2026  
> **Status:** Production-Ready  

---

## Table of Contents
1. [Executive Summary & Project Evolution](#1-executive-summary--project-evolution)
2. [Dual Architecture & Server Modes](#2-dual-architecture--server-modes)
3. [Complete Codebase Directory & File Inventory](#3-complete-codebase-directory--file-inventory)
4. [WhatsApp Core Engine (`whatsmeow` Deep-Dive)](#4-whatsapp-core-engine-whatsmeow-deep-dive)
5. [Database Architecture & Storage Strategy](#5-database-architecture--storage-strategy)
6. [Security, Authentication & Middleware](#6-security-authentication--middleware)
7. [Comprehensive API Reference & Route Matrix](#7-comprehensive-api-reference--route-matrix)
8. [Real-time Events & Message Brokers](#8-real-time-events--message-brokers)
9. [OXEV Cashfree Payment Automation Engine](#9-oxev-cashfree-payment-automation-engine)
10. [Passkey Pairing & Browser Helper Extension](#10-passkey-pairing--browser-helper-extension)
11. [User Interfaces & Dashboards](#11-user-interfaces--dashboards)
12. [Configuration & Environment Variables](#12-configuration--environment-variables)
13. [Build, Deployment & Containerization](#13-build-deployment--containerization)
14. [Logging, Telemetry & Diagnostics](#14-logging-telemetry--diagnostics)
15. [Conclusion & Operational Best Practices](#15-conclusion--operational-best-practices)

---

## 1. Executive Summary & Project Evolution

### 1.1 What is this Project?
**OXIS WhatsApp Automation** (built upon the open-source **Evolution Go** framework) is an enterprise-grade, high-throughput WhatsApp automation and REST API service written in **Go (Golang 1.24 / 1.25)**.

The project connects directly to WhatsApp's multi-device servers using WebSocket connections via the pure-Go **`whatsmeow`** protocol library. It eliminates the need for heavyweight browser automation (such as Puppeteer or Selenium) or Node.js runtimes, achieving:
- **Sub-10ms** API execution latencies.
- **Ultra-low memory footprint** (~25MB to 60MB RAM vs 500MB+ for Node/Puppeteer).
- **Zero external dependencies** when running in standalone mode (embedded SQLite).
- **Massive horizontal scalability** when backed by PostgreSQL, RabbitMQ/NATS, and MinIO/S3.

### 1.2 Evolution into OXIS & OXEV Integration
The codebase has evolved to serve two primary roles:
1. **Full-Featured WhatsApp Enterprise Gateway (`cmd/evolution-go/main.go`)**: Provides complete coverage of WhatsApp features including text, media, buttons, carousels, lists, polls, newsletters (channels), communities, groups, call rejection, contact sync, and privacy controls.
2. **Dedicated OXIS Automation & Payment Engine (`oxis_backend/server.go`)**: A purpose-built, streamlined microservice designed specifically for the **OXEV event registration ecosystem**. It exposes dedicated endpoints to automatically deliver student payment confirmations upon successful **Cashfree** transactions, backed by idempotent message deduplication and templating.

---

## 2. Dual Architecture & Server Modes

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT REQUESTS                                    |
|  (OXEV Backend / Web Dashboard / Webhook Receivers / Mobile Apps / WhatsApp Web)      |
+-------------------------------------------+-------------------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                         GIN HTTP ROUTER & AUTH MIDDLEWARE                             |
|  - Bearer Token / API Key Auth (OXIS_GLOBAL_API_KEY, OXEV_SERVICE_API_KEY)            |
|  - CORS Handler (Vercel / Render / Localhost)                                         |
|  - Passkey Ceremony Gateway                                                           |
+-------------------------------------------+-------------------------------------------+
                                            |
         +----------------------------------+----------------------------------+
         |                                                                     |
         v                                                                     v
+----------------------------------+                 +----------------------------------+
|      FULL EVOLUTION-GO CORE      |                 |       OXIS BACKEND ENGINE        |
|      (cmd/evolution-go/main.go)  |                 |     (oxis_backend/server.go)     |
+----------------------------------+                 +----------------------------------+
| - Instance Service & Multi-Tenant|                 | - Default Instance ('oxev-main') |
| - Full Message & Send Suite      |                 | - Cashfree Payment Confirmation  |
| - Groups, Communities, Channels  |                 | - Idempotent Deduplication Engine|
| - Polls, Labels, Chat Archiving  |                 | - Direct Simple Send API         |
| - Webhook / WS / RabbitMQ / NATS |                 | - SQLite / PostgreSQL Auto-Store |
| - React Manager & Swagger UI     |                 | - Embedded HTML5 Glassmorphism UI|
+----------------------------------+                 +----------------------------------+
         |                                                                     |
         +----------------------------------+----------------------------------+
                                            |
                                            v
+---------------------------------------------------------------------------------------+
|                               WHATSMEOW PROTOCOL ENGINE                               |
|  - Noise Protocol Cryptographic Handshake                                             |
|  - Protobuf Message Marshalling / Unmarshalling (waE2E / waCompanionReg)              |
|  - Multi-Device Pairing (QR Code / Phone Pairing Code / Passkey WebAuthn)             |
+-------------------------------------------+-------------------------------------------+
                                            |
         +----------------------------------+----------------------------------+
         |                                  |                                  |
         v                                  v                                  v
+------------------+              +-------------------+              +------------------+
|  DATA PERSISTENCE|              |  EVENT STREAMING  |              |  OBJECT STORAGE  |
| PostgreSQL/SQLite|              | Webhook/WS/Rabbit |              |   MinIO / S3     |
| (Auth + Users DB)|              |    NATS Server    |              | (Media payloads) |
+------------------+              +-------------------+              +------------------+
```

### 2.1 Mode 1: Enterprise Evolution Go Server (`cmd/evolution-go`)
- **Entrypoint:** `cmd/evolution-go/main.go`
- **Use Case:** Full-scale multi-instance WhatsApp API management platform with Swagger documentation, React management UI, and multi-broker event queues.
- **Pre-compiled Binary:** `oxis-whatsapp.exe` / `evolution-go`

### 2.2 Mode 2: Lightweight OXIS Automation Server (`oxis_backend`)
- **Entrypoint:** `oxis_backend/server.go`
- **Use Case:** Zero-overhead, single-binary microservice optimized for cloud platforms like Render and Docker. Handles instant event registration confirmations and direct messaging.
- **Pre-compiled Binary:** `oxis-custom-server.exe`

---

## 3. Complete Codebase Directory & File Inventory

```text
c:\Users\ROHIT\Downloads\evolution-go-main\evolution-go-main\
│
├── cmd\
│   └── evolution-go\
│       └── main.go                     # Entrypoint for the full Evolution Go server
│
├── oxis_backend\
│   └── server.go                       # Standalone zero-dependency OXIS automation server
│
├── passkey-helper\                     # Browser extension for WebAuthn Passkey pairing
│   ├── manifest.json                   # Chrome/Edge Manifest V3 definition
│   ├── content.js                      # Injected script on web.whatsapp.com
│   └── README.md                       # Extension installation & usage guide
│
├── pkg\                                # Core Go Packages
│   ├── automation\                     # Event & payment automation workflows
│   │   ├── handler\automation_handler.go
│   │   └── service\payment_confirmation.go
│   │
│   ├── call\                           # WhatsApp Call management
│   │   ├── handler\call_handler.go
│   │   └── service\call_service.go
│   │
│   ├── chat\                           # Chat features (Pin, Mute, Archive)
│   │   ├── handler\chat_handler.go
│   │   └── service\chat_service.go
│   │
│   ├── community\                      # WhatsApp Communities
│   │   ├── handler\community_handler.go
│   │   └── service\community_service.go
│   │
│   ├── config\                         # Configuration loader & DB initialization
│   │   ├── config.go
│   │   └── env\env.go                  # Environment variable key constants
│   │
│   ├── core\                           # License runtime, integrity hashing & gates
│   │   └── c0.go
│   │
│   ├── events\                         # Event producers for downstream consumers
│   │   ├── interfaces\producer.go
│   │   ├── nats\nats_producer.go
│   │   ├── rabbitmq\rabbitmq_producer.go
│   │   ├── webhook\webhook_producer.go
│   │   └── websocket\websocket_producer.go
│   │
│   ├── group\                          # WhatsApp Group administration
│   │   ├── handler\group_handler.go
│   │   └── service\group_service.go
│   │
│   ├── instance\                       # Instance lifecycle & management
│   │   ├── handler\instance_handler.go
│   │   ├── handler\oxis_instance_handler.go
│   │   ├── model\instance_model.go
│   │   ├── repository\instance_repository.go
│   │   └── service\instance_service.go
│   │
│   ├── internal\
│   │   └── event_types\event_types.go  # System event type definitions
│   │
│   ├── label\                          # WhatsApp Business Labels
│   │   ├── handler\label_handler.go
│   │   ├── model\label_model.go
│   │   ├── repository\label_repository.go
│   │   └── service\label_service.go
│   │
│   ├── logger\                         # Lumberjack rotating file logger wrapper
│   │   └── logger.go
│   │
│   ├── message\                        # Message actions (React, Edit, Delete, Read)
│   │   ├── handler\message_handler.go
│   │   ├── handler\oxis_message_handler.go
│   │   ├── model\message_model.go
│   │   ├── repository\message_repository.go
│   │   └── service\message_service.go
│   │
│   ├── middleware\                     # Security & Validation Middleware
│   │   ├── auth_middleware.go
│   │   └── jid_validation_middleware.go
│   │
│   ├── newsletter\                     # WhatsApp Channels / Newsletters
│   │   ├── handler\newsletter_handler.go
│   │   └── service\newsletter_service.go
│   │
│   ├── passkey\                        # Backend Passkey ceremony handlers
│   │   ├── ceremony\store.go
│   │   └── handler\passkey_handler.go
│   │
│   ├── poll\                           # WhatsApp Polls and Vote Aggregation
│   │   ├── handler\poll_handler.go
│   │   ├── model\poll_vote.go
│   │   └── service\poll_service.go
│   │
│   ├── routes\                         # Central Gin HTTP route registration
│   │   └── routes.go
│   │
│   ├── sendMessage\                    # Comprehensive message dispatch engine
│   │   ├── handler\send_handler.go
│   │   └── service\send_service.go
│   │
│   ├── server\                         # Server status endpoint
│   │   └── handler\server_handler.go
│   │
│   ├── storage\                        # Media Object Storage
│   │   ├── interfaces\media_storage.go
│   │   └── minio\media_storage.go
│   │
│   ├── telemetry\                      # Anonymous route telemetry
│   │   └── telemetry.go
│   │
│   ├── templates\                      # Message templating engine
│   │   ├── model\template_model.go
│   │   ├── repository\template_repository.go
│   │   └── service\template_service.go
│   │
│   ├── user\                           # Profile, Avatars, Blocklist & Contacts
│   │   ├── handler\user_handler.go
│   │   └── service\user_service.go
│   │
│   ├── utils\                          # Utility helpers (strings, validation)
│   │   └── utils.go
│   │
│   └── whatsmeow\                      # Whatsmeow bridge & event dispatcher
│       └── service\
│           ├── referral.go             # Meta ad referral metadata parser
│           └── whatsmeow.go            # Primary socket listener & event loop
│
├── manager\                            # React Dashboard Frontend Build
│   └── dist\
│       ├── index.html
│       └── assets\ (JS/CSS bundles)
│
├── public\                             # Standalone Modern HTML5 Dashboard
│   ├── index.html                      # Glassmorphic live trial & monitoring UI
│   └── hover-evolution.png
│
├── docker\                             # Docker deployment configurations
│   ├── stack-evocrm.yml
│   └── examples\
│       ├── docker-compose.yml
│       ├── docker-compose.full.yml
│       ├── docker-compose.swarm.yml
│       ├── .env.example
│       └── init-db.sql
│
├── docs\                               # Documentation & OpenAPI Specs
│   ├── API_DOCUMENTATION.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── OXIS_INTEGRATION_GUIDE.md
│   ├── swagger.json
│   ├── swagger.yaml
│   └── wiki\                           # Full Portuguese architectural wiki
│
├── dbdata\                             # Local SQLite database files
│   ├── main.db
│   ├── oxis_auth.db
│   └── oxis_users.db
│
├── logs\                               # Per-instance log directories
│
├── .env / .env.example                 # Configuration files
├── Dockerfile                          # Multi-stage production container build
├── Makefile                            # Developer workflow commands
├── render.yaml                         # Render Cloud Deployment Blueprint
├── vercel.json                         # Vercel Serverless Reverse Proxy rules
├── start.bat / start.sh                # Windows & Linux instant start scripts
└── go.mod / go.sum                     # Go module definitions
```

---

## 4. WhatsApp Core Engine (`whatsmeow` Deep-Dive)

### 4.1 How Whatsmeow Works in this Project
The service uses [`go.mau.fi/whatsmeow`](https://github.com/tulir/whatsmeow), a protocol implementation of the WhatsApp Multi-Device Web API in Go.

1. **Cryptographic Handshake:** Implements the Noise Protocol framework (`Noise_XX_25519_AESGCM_SHA256`) to establish an encrypted TLS-like tunnel over raw WebSockets with WhatsApp endpoints (`wss://web.whatsapp.com/ws/chat`).
2. **Session Stores (`sqlstore`):**
   - Stores device identity keys, registration IDs, pre-keys, signed pre-keys, and session state.
   - Persisted in either PostgreSQL (`POSTGRES_AUTH_DB`) or local SQLite (`oxis_auth.db`).
3. **Event Loop (`pkg/whatsmeow/service/whatsmeow.go`):**
   - Registers an event listener callback on each client instance.
   - Listens for raw protocol events: `*events.Message`, `*events.Receipt`, `*events.Connected`, `*events.Disconnected`, `*events.LoggedOut`, `*events.AppStateSyncComplete`, `*events.HistorySync`, `*events.CallOffer`, `*events.PollVote`, etc.
   - Dispatches parsed event payloads concurrently across all active producers (Webhook, WebSocket, RabbitMQ, NATS).

### 4.2 Three Methods of Device Pairing
1. **QR Code Pairing (Standard):**
   - The engine opens a QR channel and receives rotating pairing strings.
   - Encodes string into Base64 PNG using `github.com/skip2/go-qrcode` and publishes via `/api/v1/instance/qr`.
2. **Phone Number Pairing Code:**
   - Initiated via `/instance/pair` with an 8-character pairing code displayed on the phone.
3. **WebAuthn Passkey Pairing (Modern WhatsApp Requirement):**
   - Handled via the `/passkey-ceremony` workflow and the `passkey-helper` browser extension when WhatsApp requires biometric verification.

---

## 5. Database Architecture & Storage Strategy

### 5.1 Dual-Database Model
To isolate cryptographic session data from application business logs, the project employs two distinct database layers:

```
+--------------------------------------------------------------------------+
|                             DATABASE LAYERS                              |
+------------------------------------+-------------------------------------+
|         1. AUTH DATABASE           |         2. USERS / DATA DB          |
|    (Whatsmeow Session State)       |    (Instances, Messages, Logs)      |
+------------------------------------+-------------------------------------+
| - PostgreSQL: POSTGRES_AUTH_DB     | - PostgreSQL: POSTGRES_USERS_DB     |
| - SQLite Fallback: oxis_auth.db    | - SQLite Fallback: oxis_users.db    |
| - Managed by Whatsmeow sqlstore    | - Managed by GORM Auto-Migrate      |
| - Tables: whatsmeow_device,        | - Tables: instances, messages,      |
|   whatsmeow_identity_keys, etc.    |   labels, message_templates, etc.   |
+------------------------------------+-------------------------------------+
```

### 5.2 GORM Entities & Schemas

#### 1. `Instance` (`pkg/instance/model/instance_model.go`)
```go
type Instance struct {
    Id                   string         `gorm:"primaryKey;type:varchar(255)" json:"id"`
    Name                 string         `gorm:"type:varchar(255);uniqueIndex" json:"name"`
    Token                string         `gorm:"type:varchar(255)" json:"token"`
    Connected            bool           `gorm:"type:boolean" json:"connected"`
    Jid                  string         `gorm:"type:varchar(255)" json:"jid"`
    Qrcode               string         `gorm:"type:text" json:"qrcode"`
    ClientName           string         `gorm:"type:varchar(255)" json:"clientName"`
    Webhook              string         `gorm:"type:varchar(255)" json:"webhook"`
    WebhookEvents        string         `gorm:"type:text" json:"webhookEvents"`
    CreatedAt            time.Time      `json:"createdAt"`
    UpdatedAt            time.Time      `json:"updatedAt"`
    DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}
```

#### 2. `Message` / `MessageLog` (`pkg/message/model/` & `oxis_backend/server.go`)
```go
type MessageLog struct {
    ID                string     `gorm:"primaryKey;size:64" json:"id"`
    Phone             string     `gorm:"size:32;index" json:"phone"`
    StudentName       string     `gorm:"size:255" json:"student_name,omitempty"`
    EventName         string     `gorm:"size:255" json:"event_name,omitempty"`
    ReferenceID       string     `gorm:"size:100;index" json:"reference_id,omitempty"`
    IdempotencyKey    string     `gorm:"size:255;uniqueIndex" json:"idempotency_key"`
    MessageContent    string     `gorm:"type:text" json:"message_content"`
    Status            string     `gorm:"size:32;index" json:"status"` // PENDING, SENT, DUPLICATE, FAILED
    WhatsAppMessageID string     `gorm:"size:100" json:"whatsapp_message_id,omitempty"`
    ErrorMessage      string     `gorm:"type:text" json:"error_message,omitempty"`
    CreatedAt         time.Time  `gorm:"autoCreateTime" json:"created_at"`
    SentAt            *time.Time `json:"sent_at,omitempty"`
}
```

#### 3. `MessageTemplate` (`pkg/templates/model/template_model.go`)
```go
type MessageTemplate struct {
    ID        string    `gorm:"primaryKey;size:64" json:"id"`
    Name      string    `gorm:"size:100;uniqueIndex" json:"name"`
    Content   string    `gorm:"type:text" json:"content"`
    IsActive  bool      `gorm:"default:true" json:"is_active"`
    CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
```

---

## 6. Security, Authentication & Middleware

### 6.1 Authentication Levels
The server enforces a multi-tier security scheme in [`pkg/middleware/auth_middleware.go`](file:///c:/Users/ROHIT/Downloads/evolution-go-main/evolution-go-main/pkg/middleware/auth_middleware.go):

| Auth Scope | Header Accepted | Key Compared Against | Allowed Operations |
|---|---|---|---|
| **Admin / Global** | `Authorization: Bearer <KEY>` or `apikey: <KEY>` | `GLOBAL_API_KEY` / `OXIS_GLOBAL_API_KEY` | Instance creation, deletion, proxy configuration, reconnects |
| **Service (OXEV)** | `Authorization: Bearer <KEY>` or `apikey: <KEY>` | `OXEV_SERVICE_API_KEY` or Global Key | Payment confirmation webhook dispatch, direct message sending |
| **Instance-Level** | `apikey: <INSTANCE_TOKEN>` | Individual instance `Token` field | Sending messages, querying chats/groups on that specific instance |
| **Passkey Public** | None (Ceremony Token in URL Path) | Ephemeral UUID in memory store | WebAuthn challenge resolution via browser extension |

### 6.2 Timing Attack Protection
All API key checks use constant-time byte comparisons via Go's standard library:
```go
subtle.ConstantTimeCompare([]byte(token), []byte(expectedKey)) == 1
```

---

## 7. Comprehensive API Reference & Route Matrix

### 7.1 OXIS API v1 (Primary Automation Suite)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Returns service uptime and WhatsApp connection status |
| `GET` | `/api/v1/instance/status` | Public | Returns current status of default WhatsApp instance |
| `GET` | `/api/v1/instance/qr` | Public | Returns Base64 QR code for pairing |
| `POST` | `/api/v1/instance/connect` | Admin | Initiates connection sequence |
| `POST` | `/api/v1/instance/disconnect` | Admin | Disconnects the active socket session |
| `DELETE`| `/api/v1/instance/logout` | Admin | Logs out and unlinks device credentials |
| `POST` | `/api/v1/automation/payment-confirmation` | Service/Admin | Idempotent Cashfree payment confirmation dispatch |
| `POST` | `/api/v1/messages/send` | Service/Admin | Direct text message sending with idempotency |
| `GET` | `/api/v1/messages/logs` | Public/Admin | Retrieves recent message dispatch audit logs |

---

### 7.2 Full Evolution-Go Enterprise Route Matrix

#### Instance Management (`/instance`)
- `POST /instance/create` - Create new named WhatsApp instance
- `GET /instance/all` - List all configured instances
- `GET /instance/info/:instanceId` - Detailed instance state & device info
- `DELETE /instance/delete/:instanceId` - Destroy instance and delete credentials
- `POST /instance/proxy/:instanceId` - Configure HTTP/SOCKS proxy
- `DELETE /instance/proxy/:instanceId` - Remove proxy configuration
- `POST /instance/forcereconnect/:instanceId` - Restart WhatsApp socket
- `GET /instance/logs/:instanceId` - Download instance debug logs
- `POST /instance/pair` - Request 8-digit phone pairing code
- `GET /instance/:instanceId/advanced-settings` - Retrieve instance tuning parameters
- `PUT /instance/:instanceId/advanced-settings` - Update instance tuning parameters

#### Message Dispatch (`/send`)
- `POST /send/text` - Send plain text with formatting, mentions, and quotes
- `POST /send/link` - Send URL with rich web preview thumbnail
- `POST /send/media` - Send image, video, audio, or document (URL or Base64)
- `POST /send/poll` - Send interactive poll with single/multi-choice options
- `POST /send/sticker` - Send WebP static or animated sticker
- `POST /send/location` - Send GPS coordinates with title and address
- `POST /send/contact` - Send vCard contact card
- `POST /send/button` - Send interactive quick-reply button message
- `POST /send/list` - Send interactive sectioned list picker
- `POST /send/carousel` - Send interactive multi-card carousel
- `POST /send/status/text` - Post text status/story to WhatsApp
- `POST /send/status/media` - Post image/video status/story to WhatsApp

#### Chat Actions (`/chat` & `/message`)
- `POST /chat/archive` / `/chat/unarchive` - Archive/unarchive conversations
- `POST /chat/pin` / `/chat/unpin` - Pin/unpin conversations to top
- `POST /chat/mute` / `/chat/unmute` - Mute chat notifications
- `POST /message/react` - Send emoji reaction to a message
- `POST /message/edit` - Edit a previously sent message
- `POST /message/delete` - Revoke/delete message for everyone
- `POST /message/markRead` - Send blue read receipts
- `POST /message/presence` - Set composing (typing...) or recording audio status

#### Groups, Communities & Channels (`/group`, `/community`, `/newsletter`)
- `POST /group/create` - Create group with participants
- `POST /group/update/participants` - Add, promote, demote, or remove members
- `POST /group/update/settings` - Lock/unlock group announcements
- `POST /group/inviteCode` & `POST /group/join` - Generate invite link and join via link
- `POST /community/create` - Create parent community
- `POST /community/link` / `POST /community/unlink` - Link/unlink groups to community
- `POST /newsletter/create` - Create public broadcast newsletter/channel
- `POST /newsletter/follow` - Subscribe to channel updates

---

## 8. Real-time Events & Message Brokers

The system features an asynchronous event distribution pipeline defined in `pkg/events/`:

```text
[ WhatsApp Socket Event ]
          │
          ▼
[ whatsmeow Event Handler ]
          │
          ├──► [ Webhook Producer ]   ──► HTTP POST to external URLs
          ├──► [ WebSocket Producer ] ──► Pushed to connected /ws clients
          ├──► [ RabbitMQ Producer ]  ──► Published to AMQP exchanges/queues
          └──► [ NATS Producer ]      ──► Streamed to NATS subjects
```

### Supported Event Types (`pkg/internal/event_types/`):
- `MESSAGE` — Incoming WhatsApp message received
- `SEND_MESSAGE` — Outgoing message dispatch event
- `READ_RECEIPT` — Delivery / read receipt acknowledgment
- `PRESENCE` — Contact online / offline state change
- `CHAT_PRESENCE` — Typing / recording state in chat
- `CALL` — Incoming voice or video call offer
- `CONNECTION` — WhatsApp socket connection state change
- `LABEL` — Label created, updated, or applied
- `CONTACT` — Contact info updated
- `GROUP` — Group settings or participant update
- `NEWSLETTER` — Channel update or post
- `QRCODE` — New QR code generated
- `BUTTON_CLICK` — User clicked an interactive button

---

## 9. OXEV Cashfree Payment Automation Engine

### 9.1 The Problem It Solves
When students pay for event registrations on OXEV via Cashfree, payment webhooks can fire multiple times (network retries), and students expect immediate, formatted WhatsApp confirmations containing their registration ID and payment details.

### 9.2 The Workflow
1. **OXEV Backend** verifies the Cashfree payment webhook.
2. **OXEV Backend** calls `POST /api/v1/automation/payment-confirmation`.
3. **OXIS Engine** checks `idempotency_key` (`payment-confirmation-{registration_id}`).
   - If already sent: Returns `status: "DUPLICATE"` immediately without re-sending.
   - If new: Resolves template `payment_confirmation`, renders variables, and dispatches message via `whatsmeow`.
4. **Audit Log** is recorded in the database with status `SENT`, `WhatsAppMessageID`, and timestamp.

### 9.3 Built-in Confirmation Template
```text
Hi {{student_name}}! 👋

🎉 Payment Successful!

Your payment of ₹{{amount}} for {{event_name}} has been successfully received.

✅ Your registration is confirmed.

🆔 Registration ID: {{registration_id}}

You will receive further event updates on this WhatsApp number.

Thank you!
OXEV Team 🚀
```

---

## 10. Passkey Pairing & Browser Helper Extension

### 10.1 Background
Recent WhatsApp multi-device security updates require biometric/passkey verification on certain accounts before linking a new device. Because WebAuthn credentials can only be verified in a browser running on the official `web.whatsapp.com` origin, QR codes alone fail on passkey-enabled accounts.

### 10.2 The Solution (`passkey-helper/`)
1. When passkey is required, the API enters `PASSKEY_REQUIRED` stage and produces a ceremony token.
2. The user clicks **"Open WhatsApp Web"** which opens:
   `https://web.whatsapp.com/#wapk=<BASE64_TOKEN_PAYLOAD>`
3. The installed Chrome/Edge Manifest V3 extension (`passkey-helper/content.js`):
   - Reads the token payload from the URL hash.
   - Fetches the WebAuthn challenge from `GET /passkey-ceremony/:token`.
   - Executes `navigator.credentials.get()` inside `web.whatsapp.com`.
   - Submits the signed assertion to `POST /passkey-ceremony/:token/response`.
   - Confirms pairing with `POST /passkey-ceremony/:token/confirm`.
4. Pairing succeeds without manual intervention.

---

## 11. User Interfaces & Dashboards

### 11.1 Modern Glassmorphism Trial Dashboard (`public/index.html`)
- Accessible at: `http://localhost:8080/` or `http://localhost:8080/dashboard`
- Features:
  - Real-time WhatsApp connection status badge (Connected, Connecting, Disconnected).
  - Live QR code generator with auto-refreshing polling.
  - Interactive Cashfree payment test dispatcher (simulate event confirmation).
  - Interactive direct message test tool.
  - Live audit log viewer with search and status filters.

### 11.2 React Enterprise Manager (`manager/dist/`)
- Accessible at: `http://localhost:8080/manager`
- Provides full multi-instance management, QR code scanning, and webhook configuration.

### 11.3 Swagger OpenAPI Explorer (`docs/`)
- Accessible at: `http://localhost:8080/swagger/index.html`
- Interactive API explorer to execute and test all endpoints.

---

## 12. Configuration & Environment Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `SERVER_PORT` / `PORT` | Integer | `8080` | Port for the HTTP server |
| `ENVIRONMENT` | String | `development` | `development` or `production` (sets Gin Release mode) |
| `GLOBAL_API_KEY` | String | *Required* | Master API Key for administration |
| `OXIS_GLOBAL_API_KEY` | String | Same as `GLOBAL_API_KEY` | Secondary master admin key for OXIS |
| `OXEV_SERVICE_API_KEY` | String | Same as `GLOBAL_API_KEY` | Secret key used by OXEV backend for automation |
| `WHATSAPP_INSTANCE_NAME` | String | `oxev-main` | Name of default auto-created instance |
| `CLIENT_NAME` | String | `OXIS WhatsApp Service` | Device name displayed in WhatsApp "Linked Devices" |
| `CONNECT_ON_STARTUP` | Boolean | `true` | Auto-reconnect saved WhatsApp session on boot |
| `POSTGRES_AUTH_DB` | DSN | `""` (Uses SQLite) | PostgreSQL connection string for session keys |
| `POSTGRES_USERS_DB` | DSN | `""` (Uses SQLite) | PostgreSQL connection string for application data |
| `DATABASE_SAVE_MESSAGES`| Boolean | `true` | Persist sent/received messages to database |
| `WA_DEBUG` | String | `INFO` | Whatsmeow log level (`DEBUG`, `INFO`, `WARN`, `ERROR`) |
| `LOGTYPE` | String | `console` | `console` or `file` |
| `AMQP_URL` | URL | `""` (Disabled) | RabbitMQ connection URL (`amqp://...`) |
| `NATS_URL` | URL | `""` (Disabled) | NATS connection URL (`nats://...`) |
| `MINIO_ENABLED` | Boolean | `false` | Enable MinIO / S3 media storage |
| `MINIO_ENDPOINT` | String | `localhost:9000` | MinIO host endpoint |
| `MINIO_ACCESS_KEY` | String | `minioadmin` | MinIO Access Key |
| `MINIO_SECRET_KEY` | String | `minioadmin` | MinIO Secret Key |
| `MINIO_BUCKET` | String | `evolution` | S3 bucket name |

---

## 13. Build, Deployment & Containerization

### 13.1 Running Locally
- **Windows:** Double-click `start.bat` or run `.\oxis-whatsapp.exe` / `.\oxis-custom-server.exe`
- **Linux / macOS:** Run `./start.sh` or `make dev`

### 13.2 Multi-Stage Dockerfile
```dockerfile
# Stage 1: Build binary
FROM golang:1.25-alpine AS build
RUN apk update && apk add --no-cache git build-base libjpeg-turbo-dev libwebp-dev
WORKDIR /build
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags "-s -w" -o server ./oxis_backend/server.go

# Stage 2: Minimal runtime
FROM alpine:3.19 AS final
RUN apk update && apk add --no-cache ca-certificates tzdata ffmpeg libjpeg-turbo libwebp poppler-utils
WORKDIR /app
COPY --from=build /build/server .
COPY --from=build /build/public ./public
COPY --from=build /build/manager/dist ./manager/dist
RUN mkdir -p /app/dbdata /app/logs
EXPOSE 8080
ENTRYPOINT ["/app/server"]
```

### 13.3 Cloud Deployments
- **Render (`render.yaml`):** Built-in persistent disk `/app/dbdata` (1GB) preserves SQLite session keys across restarts.
- **Vercel (`vercel.json`):** Configured as a high-performance reverse proxy routing `/api/*` and `/dashboard` to the Render backend.

---

## 14. Logging, Telemetry & Diagnostics

### 14.1 Log Rotation (`pkg/logger/`)
Uses Lumberjack for zero-leak rotating file logs:
- Configured by `LOG_MAX_SIZE` (default: 100MB), `LOG_MAX_BACKUPS` (5), `LOG_MAX_AGE` (30 days), with automatic gzip compression.

### 14.2 Troubleshooting Common Issues

| Issue | Root Cause | Solution |
|---|---|---|
| `503 Service Unavailable` (`WHATSAPP_DISCONNECTED`) | WhatsApp phone is unlinked or disconnected | Open dashboard at `http://localhost:8080/dashboard` and scan the fresh QR code |
| `401 Unauthorized` | Missing or invalid API key | Check `Authorization: Bearer <KEY>` or `apikey: <KEY>` header |
| QR Code Not Showing | Engine starting / socket initializing | Wait 3-5 seconds; dashboard automatically polls and refreshes QR |
| Duplicate Message Notice | Idempotency triggered | Normal behavior. Webhook retry was recognized and duplicate send was prevented |

---

## 15. Conclusion & Operational Best Practices

The **OXIS WhatsApp Automation Service** is a robust, lightweight, and versatile messaging platform. By combining the low-level efficiency of Go and Whatsmeow with high-level enterprise APIs and dedicated payment automation features, it delivers maximum reliability with minimal infrastructure costs.

### Key Recommendations for Production:
1. Set strong random strings for `GLOBAL_API_KEY`, `OXIS_GLOBAL_API_KEY`, and `OXEV_SERVICE_API_KEY`.
2. When deploying to Docker/Render, always mount a persistent volume at `/app/dbdata` so WhatsApp login sessions survive container restarts.
3. For high-volume multi-agent environments, configure PostgreSQL (`POSTGRES_AUTH_DB` and `POSTGRES_USERS_DB`) and RabbitMQ/NATS.
4. Keep the `passkey-helper` extension handy for any WhatsApp accounts that require WebAuthn biometric verification upon device linking.

---
*Report generated automatically for `evolution-go-main` (OXIS WhatsApp Automation Platform).*
