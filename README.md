# Professional Service Management System (PMS)

An enterprise-grade, production-ready **Professional Service Management System (PMS)** built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Supabase PostgreSQL & Auth**, and **Cloudflare R2 Private Document Storage**.

Designed for chartered accountancy, corporate legal, tax compliance, and multi-disciplinary professional service firms.

---

## 1. System Architecture & Tech Stack

### Frontend
- **Next.js 14 (App Router)** & React 18
- **TypeScript** with strict type safety across all database models and business logic
- **Tailwind CSS** with custom navy/blue enterprise palette
- **shadcn/ui** and Radix UI headless components
- **Lucide React** iconography
- **TanStack Query** for client-server state caching
- **Recharts** for real-time executive operations and revenue analytics
- **jsPDF & jspdf-autotable** for client-side and server-side PDF invoice and report generation
- **SheetJS (xlsx)** for Excel sales register and client master exports

### Backend & Database
- **Supabase PostgreSQL** with relational foreign keys, constraints, triggers, and performance indexes
- **Supabase Auth** with Google OAuth and active employee email whitelist verification
- **Supabase Row-Level Security (RLS)** protecting sensitive client and payroll data
- **Cloudflare R2** private object storage with presigned upload and download URLs

---

## 2. Implemented Modules

### 1. Executive Dashboard & Analytics (`/dashboard`)
- 11 KPI cards: Total Clients, Active Clients, Services, Active Projects, Pending Tasks, Completed Tasks, Total Staff, Pending Invoices, Revenue Invoiced, Collections Realized, Outstanding Receivables.
- Recharts visualizations: Invoiced vs. Collections trend, Project Status pipeline, Department distribution.
- Real-time immutable activity log.

### 2. Client 360° Master (`/clients`, `/clients/new`, `/clients/[id]`)
- **Multi-Section Onboarding Form**:
  - **Section A**: Basic Information (Client Code, Trade Name, Legal Name, Constitution, Category, Nature of Income)
  - **Section B**: Contact & Communication (Contact person, mobile, email, registered & communication addresses, PIN, country)
  - **Section C**: Statutory Identifiers (PAN, GSTIN, CIN/LLPIN, DOB/DOI, TAN, IEC, MSME)
  - **Section D**: Relationship Management (Assigned RM, client status, compliance remarks)
- **12 Dedicated 360° Profile Tabs**:
  1. Overview & Financial Snapshot
  2. Basic Client Master Details
  3. Contact & Address Records
  4. Statutory Registrations
  5. Subscribed Services (agreed fees, billing frequency, department)
  6. Projects
  7. Tasks
  8. Multi-Stage Workflows
  9. Finance & Payments
  10. Invoices (Tax Invoices raised)
  11. Documents (Cloudflare R2 files)
  12. Immutable Activity History

### 3. Service Management (`/services`)
- Catalog of **17 complete professional services** (GST, Income Tax, ROC/MCA, Audits, TDS, Transfer Pricing, Virtual CFO, Payroll, IEC, Trademark).
- Service Code, Default Fee, GST Rate, Billing Type (One-time vs Recurring), and status.
- Add service modal and fee revision tracking.

### 4. Project Management (`/projects`, `/projects/new`)
- Project types: Client Project, Internal Project, General Project.
- Milestone tracking, priority (Low, Medium, High, Urgent), progress percentage, project manager and assigned team members.
- KPI cards for Total, Active, Completed, and Overdue projects.

### 5. Task Management Engine (`/tasks`)
- 4 interactive views:
  - **Kanban Board** (drag/select move between To Do, In Progress, Under Review, Completed)
  - **List View** with sorting and filter controls
  - **Calendar View** for monthly delivery deadlines
  - **Timeline / Gantt View**
- Subtask support, priority tags, assignees, and status history.

### 6. Workflow Management Engine (`/workflows`)
- Versioned, immutable workflow templates (e.g. *Annual Corporate Tax & ROC Filing Workflow*).
- 6 sequential stages: Document Collection -> Scrutiny & Verification -> Draft Preparation -> Internal Review & Sign-off -> Statutory Filing -> Completion & Archival.
- Automated stage deliverables and conditional branching rules based on client constitution and GSTIN status.

### 7. Finance & Payment Ledger (`/finance`)
- Real-time payment reconciliation: `Total Invoiced - Paid = Outstanding Balance`.
- Multiple partial payments per invoice with transaction reference (NEFT, RTGS, UPI, Bank Transfer).
- Reminders for overdue collections and Excel register export.

### 8. GST-Ready Invoice Generator (`/invoices`, `/invoices/new`, `/invoices/[id]`)
- Automatic Tax Rules:
  - Intra-State Supply: Central GST (CGST 9%) + State GST (SGST 9%)
  - Inter-State Supply: Integrated GST (IGST 18%)
- Client auto-fetch (PAN, GSTIN, address, state of supply).
- Unlimited line items with SAC codes, discount amounts, and taxable values.
- Invoice actions: Save as Draft, Finalize, Print, Download PDF, Email Client, Record Partial Payment, Cancel with audit trail.

### 9. Employee Directory (`/employees`, `/employees/new`, `/employees/[id]`)
- Staff onboarding with father name, DOB, designation, department, supervisor.
- Protected bank details (bank name, account type, masked account number, IFSC) restricted to Super Admins.
- Employee profile displaying assigned deliverables, team memberships, and performance metrics.

### 10. Department & Team Management (`/departments`, `/teams`)
- Configurable 4-tier hierarchy: Practice Head -> Supervisors/Managers -> Senior/Staff Employees -> Articled Trainees.
- Department heads, team supervisor assignments, and member roster.

### 11. Cloud Document Storage (`/documents`)
- **Cloudflare R2 private bucket integration** with zero egress fees.
- Folder-like category navigation (Client, PAN, GST, CIN, Employee, Bank, Project, Task, Invoice, Payment Receipt).
- Presigned upload and download URLs generated securely on the server without exposing secrets to client code.

### 12. Notification Center (`/notifications`)
- Triggers for task assignments, project creation, payment receipts, approaching deadlines, and invoice generation.
- Read/unread tracking and notification history.

### 13. Reports & Business Intelligence (`/reports`)
- GST Sales Register export to Excel (.xlsx) and CSV.
- Client Master commercial profitability report.
- Project delivery report and employee capacity workload report.
- Executive Summary PDF generator.

### 14. Access Control & Settings (`/settings`, `/login`)
- RBAC permissions matrix covering Super Admin, Director, Head, Supervisor, Employee, Trainee.
- Zero-trust employee whitelist login gate.

---

## 3. Database Architecture & Migrations

The database migration script is located at:
`supabase/migrations/20261109000000_pms_master_schema.sql`

Seed data script with 17 services, 6 roles, departments, designations, and mock clients:
`supabase/seed.sql`

To apply the schema on a live Supabase instance:
```bash
# Using Supabase CLI:
supabase db reset
# Or execute supabase/migrations/20261109000000_pms_master_schema.sql in the Supabase SQL Editor.
```

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env.local`:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Cloudflare R2 Storage Configuration
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=pms-documents
R2_ENDPOINT=https://your-cloudflare-account-id.r2.cloudflarestorage.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 5. Running the Application Locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```
The application will be accessible at `http://localhost:3000`.

