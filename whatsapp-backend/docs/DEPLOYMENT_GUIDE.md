# OXIS WhatsApp Automation - Cloud Deployment Guide

This guide explains how to deploy the **OXIS WhatsApp Automation Service** to **Render** (Backend Engine) and **Vercel** (Frontend Dashboard).

---

## 🏗️ Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    VERCEL FRONTEND                      │
│             (Interactive Trial Dashboard)               │
│        https://oxis-whatsapp-dashboard.vercel.app       │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS REST API
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     RENDER BACKEND                      │
│            (Persistent Go + Whatsmeow Engine)           │
│        https://oxis-whatsapp-automation.onrender.com    │
│                                                         │
│   • REST Endpoints (/api/v1/automation/...)             │
│   • Idempotency Guard (Deduplication)                   │
│   • Persistent Disk (/app/dbdata/ - Session SQLite)     │
│   • Persistent WebSocket to WhatsApp Noise Network      │
└────────────────────────────┬────────────────────────────┘
                             │ Noise TCP / WebSockets
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  WHATSAPP CLOUD SERVERS                 │
│              (Student WhatsApp Delivery)                │
└─────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Why Render for Backend?**  
> WhatsApp protocol (`Whatsmeow`) requires a **continuous, long-running TCP/WebSocket connection** to stay linked and receive events in real-time. Render's Web Service provides persistent long-lived containers, whereas serverless lambdas disconnect after a few seconds.

---

## Part 1: Deploying Backend to Render

### Method A: One-Click Render Blueprint (Recommended)

1. **Push this repository** to your GitHub account:
   ```bash
   git add .
   git commit -m "feat: complete OXIS WhatsApp Automation service with Render & Vercel deployment"
   git push origin main
   ```
2. Log into [Render.com](https://dashboard.render.com/).
3. Click **"New +"** ➔ **"Blueprint"**.
4. Connect your GitHub repository.
5. Render will automatically read `render.yaml` and configure:
   - **Service Name**: `oxis-whatsapp-automation`
   - **Environment**: `Docker` (using `./Dockerfile`)
   - **Health Check**: `/health`
   - **Persistent Disk**: `oxis-whatsapp-data` mounted at `/app/dbdata` (1 GB)
6. Click **"Apply"**.

---

### Method B: Manual Web Service on Render

If you prefer configuring manually in the Render dashboard:

1. Click **"New +"** ➔ **"Web Service"**.
2. Select your repository.
3. Configure the following:
   - **Name**: `oxis-whatsapp-automation`
   - **Region**: Choose closest to your users (e.g. *Singapore* or *Oregon*)
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Starter` (or `Free` for testing)
4. Under **"Advanced"** ➔ **"Add Disk"**:
   - **Name**: `whatsapp-session-disk`
   - **Mount Path**: `/app/dbdata`
   - **Size**: `1 GB`
5. Under **"Environment Variables"**, add:
   | Key | Value | Description |
   |---|---|---|
   | `ENVIRONMENT` | `production` | Production environment mode |
   | `OXEV_SERVICE_API_KEY` | *Your strong secret key* | Used by OXEV backend for payment confirmation |
   | `OXIS_GLOBAL_API_KEY` | *Your admin master key* | Full admin access |
   | `WHATSAPP_INSTANCE_NAME` | `oxev-main` | Default primary instance |
   | `DATABASE_SAVE_MESSAGES` | `true` | Persist audit logs |
6. Under **"Health Check Path"**, set:
   ```text
   /health
   ```
7. Click **"Create Web Service"**.

Once deployed, your Render backend URL will look like:
`https://oxis-whatsapp-automation.onrender.com`

---

## Part 2: Deploying Dashboard to Vercel

1. Log into [Vercel.com](https://vercel.com).
2. Click **"Add New..."** ➔ **"Project"**.
3. Import your GitHub repository.
4. Set the project configuration:
   - **Framework Preset**: `Other`
   - **Root Directory**: `./` (or leave default)
5. Click **"Deploy"**.

Vercel will deploy the dashboard instantly (configured by `vercel.json`).

### Connecting Dashboard to Render Backend:
1. Open your new Vercel URL: `https://your-project.vercel.app`.
2. Under **"⚙️ API Gateway Settings"**:
   - **Target Service URL**: Enter your Render backend URL (e.g. `https://oxis-whatsapp-automation.onrender.com`).
   - **OXEV Service API Key**: Enter your `OXEV_SERVICE_API_KEY`.
3. The dashboard will automatically save your settings in `localStorage` and immediately display the **Live WhatsApp QR code** for scanning!

---

## Part 3: Connecting OXEV Backend in Production

In your **OXEV production backend**, configure the environment variables:

```env
OXIS_WHATSAPP_SERVICE_URL=https://oxis-whatsapp-automation.onrender.com
OXIS_WHATSAPP_SERVICE_KEY=your_oxev_service_secret_key
```

When a student completes payment through Cashfree:

```typescript
// OXEV Event Confirmation Controller
import axios from 'axios';

export async function sendRegistrationConfirmation(student: {
  phone: string;
  name: string;
  eventName: string;
  registrationId: string;
  amount: number;
  paymentId: string;
}) {
  const response = await axios.post(
    `${process.env.OXIS_WHATSAPP_SERVICE_URL}/api/v1/automation/payment-confirmation`,
    {
      phone: student.phone,
      student_name: student.name,
      event_name: student.eventName,
      registration_id: student.registrationId,
      amount: student.amount,
      payment_id: student.paymentId,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OXIS_WHATSAPP_SERVICE_KEY}`,
      },
    }
  );

  return response.data;
}
```
