// ============================================================================
// PMS CENTRAL DATA STORE & BUSINESS ENGINE (ZERO MOCK DATA)
// Pure database-driven and state repository for production operations
// ============================================================================

import {
  Client,
  Employee,
  Designation,
  Team,
  Service,
  ServiceEngagement,
  Project,
  ProjectPriority,
  Task,
  TaskStatus,
  TaskStatusColor,
  TaskStatusConfig,
  TaskCategory,
  TaskSubCategory,
  TaskComment,
  CommentReadReceipt,
  WorkflowTemplate,
  WorkflowMilestoneTemplate,
  WorkflowStageTemplate,
  WorkflowSubStageTemplate,
  WorkflowProjectTaskTemplate,
  WorkflowSubtaskTemplate,
  Invoice,
  Payment,
  PaymentMode,
  FileObject,
  Notification,
  ActivityLog,
  DashboardKPIs,
  RoleCode,
  OfficeGeoConfig,
  AttendanceRecord
} from "@/types";
import { createClient, SUPERADMIN_EMAIL, isSuperAdminEmail } from "@/lib/supabase/client";
import { calculateDistanceMeters } from "@/lib/geo";

// Standard System Designations (Reference Master)
export const SYSTEM_DESIGNATIONS: Designation[] = [
  { id: "desig-dir", title: "Managing Partner / Director", code: "DIR", level: 1 },
  { id: "desig-head", title: "Practice Head", code: "HEAD", level: 2 },
  { id: "desig-mgr", title: "Senior Manager / Supervisor", code: "MGR", level: 3 },
  { id: "desig-sr-cons", title: "Senior Consultant", code: "SR_CONS", level: 4 },
  { id: "desig-assoc", title: "Associate Consultant", code: "ASSOC", level: 5 },
  { id: "desig-trainee", title: "Articled Assistant / Trainee", code: "TRAINEE", level: 6 }
];

export const INITIAL_DESIGNATIONS = SYSTEM_DESIGNATIONS;

export const DEFAULT_TASK_STATUSES: TaskStatusConfig[] = [
  { id: "st-open", label: "Open", color: "amber" },
  { id: "st-todo", label: "To Do", color: "slate" },
  { id: "st-in-progress", label: "In Progress", color: "violet" },
  { id: "st-approval-pending", label: "Approval pending", color: "rose" },
  { id: "st-hold", label: "Hold", color: "sky" },
  { id: "st-under-review", label: "Under Review", color: "sky" },
  { id: "st-completed", label: "Completed", color: "emerald", isCompleted: true },
];

export const DEFAULT_TASK_CATEGORIES: TaskCategory[] = [
  {
    id: "cat-general",
    name: "General Practice",
    code: "GEN",
    description: "General compliance, workflow execution, registrations, and corporate setups.",
    color: "sky",
    icon: "Layers",
    created_at: new Date().toISOString(),
    sub_categories: [
      {
        id: "subcat-general",
        category_id: "cat-general",
        name: "General",
        code: "GEN",
        description: "General workflows, IE code, trademark, and recurring tasks.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-gst-reg",
        category_id: "cat-general",
        name: "GST Registrations",
        code: "GST",
        description: "New GST registrations, amendments, address changes, and cancellations.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-company-incorp",
        category_id: "cat-general",
        name: "Company Incorporations",
        code: "INCORP",
        description: "Company incorporation, LLP formation, partnership deeds, and COI.",
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "cat-tax",
    name: "Taxation & Compliance",
    code: "TAX",
    description: "Direct tax, GST returns, TDS compliance, and international taxation workflows.",
    color: "violet",
    icon: "Receipt",
    created_at: new Date().toISOString(),
    sub_categories: [
      {
        id: "subcat-gst",
        category_id: "cat-tax",
        name: "Indirect Tax (GST)",
        code: "GST",
        description: "GSTR-1, GSTR-3B, GSTR-9, ITC reconciliations and e-invoicing.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-income-tax",
        category_id: "cat-tax",
        name: "Direct Tax / Income Tax",
        code: "IT",
        description: "ITR filings, advance tax computations, AIS/TIS review, and tax audits.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-tds",
        category_id: "cat-tax",
        name: "TDS & TCS Returns",
        code: "TDS",
        description: "Quarterly 24Q, 26Q, 27Q filings, Form 16/16A generation and challan matching.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-intl-tax",
        category_id: "cat-tax",
        name: "Transfer Pricing & Cross-Border",
        code: "TP",
        description: "Form 3CEB, master file, local file, and DTAA treaty advisory.",
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "cat-audit",
    name: "Audit & Assurance",
    code: "AUDIT",
    description: "Statutory audits, internal risk control assessments, and special review engagements.",
    color: "sky",
    icon: "ShieldCheck",
    created_at: new Date().toISOString(),
    sub_categories: [
      {
        id: "subcat-stat-audit",
        category_id: "cat-audit",
        name: "Statutory Financial Audit",
        code: "STAT",
        description: "Balance sheet, P&L audit, CARO 2020 verification, and independent auditor reports.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-internal-audit",
        category_id: "cat-audit",
        name: "Internal & Operations Audit",
        code: "INT",
        description: "Internal financial controls (IFC), SOP compliance, and risk registers.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-tax-audit",
        category_id: "cat-audit",
        name: "Tax Audit (Form 3CD)",
        code: "3CD",
        description: "Clause-by-clause scrutiny under Section 44AB of the Income Tax Act.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-stock-audit",
        category_id: "cat-audit",
        name: "Bank Concurrent & Stock Audit",
        code: "STOCK",
        description: "Physical inventory counting, drawing power audits, and NPA reviews.",
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "cat-roc",
    name: "Corporate & Secretarial",
    code: "ROC",
    description: "MCA / ROC annual filings, secretarial compliance, and entity incorporations.",
    color: "amber",
    icon: "Building2",
    created_at: new Date().toISOString(),
    sub_categories: [
      {
        id: "subcat-roc-annual",
        category_id: "cat-roc",
        name: "Annual ROC Filings",
        code: "ANNUAL",
        description: "AOC-4, MGT-7, DPT-3, MSME-1, and board meeting minutes compliance.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-incorporation",
        category_id: "cat-roc",
        name: "Entity Incorporation & Setup",
        code: "INCORP",
        description: "Private Limited, LLP, OPC, Section 8 company registrations and SPICe+ filing.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-director-changes",
        category_id: "cat-roc",
        name: "Director & Capital Changes",
        code: "DIR",
        description: "DIR-3 KYC, appointment/resignation (DIR-12), and share allotment (PAS-3).",
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "cat-acc",
    name: "Accounting & Bookkeeping",
    code: "ACC",
    description: "Day-to-day transaction processing, ledger balancing, payroll, and financial statements.",
    color: "emerald",
    icon: "BookOpen",
    created_at: new Date().toISOString(),
    sub_categories: [
      {
        id: "subcat-bookkeeping",
        category_id: "cat-acc",
        name: "Monthly Bookkeeping & Finalization",
        code: "BOOK",
        description: "Purchase/Sales ledger entry, bank statement reconciliation, and trial balance.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-payroll",
        category_id: "cat-acc",
        name: "Payroll, PF & ESI Processing",
        code: "PAY",
        description: "Monthly salary registers, payslip dispatch, EPF, and ESIC challan filing.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-mis",
        category_id: "cat-acc",
        name: "MIS & Financial Reporting",
        code: "MIS",
        description: "Monthly executive summaries, cash flow forecasting, and KPI dashboards.",
        created_at: new Date().toISOString(),
      },
    ],
  },
  {
    id: "cat-adv",
    name: "Business Advisory & Legal",
    code: "ADV",
    description: "Due diligence, valuation reports, trademark registrations, and notice replies.",
    color: "slate",
    icon: "Briefcase",
    created_at: new Date().toISOString(),
    sub_categories: [
      {
        id: "subcat-due-diligence",
        category_id: "cat-adv",
        name: "Due Diligence & Valuation",
        code: "DD",
        description: "Financial, tax & legal due diligence for M&A, investment, and valuations.",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-notices",
        category_id: "cat-adv",
        name: "Notice Representation & Appeals",
        code: "NOTICE",
        description: "Drafting responses to scrutiny notices (Sec 148, 143(1), GST ASMT-10).",
        created_at: new Date().toISOString(),
      },
      {
        id: "subcat-ip-cert",
        category_id: "cat-adv",
        name: "IP & Startup Registrations",
        code: "IP",
        description: "Trademark applications, DPIIT startup recognition, and ISO certifications.",
        created_at: new Date().toISOString(),
      },
    ],
  },
];

// Default System Administrator Profile for initial system access
const DEFAULT_SYSTEM_ADMIN: Employee = {
  id: "emp-admin-01",
  employee_code: "EMP-001",
  first_name: "Super",
  last_name: "Admin",
  full_name: "System Administrator",
  email: SUPERADMIN_EMAIL,
  mobile_number: "+91 98000 00000",
  designation_id: "desig-dir",
  designation_name: "Managing Partner / Director",
  joining_date: new Date().toISOString().slice(0, 10),
  employment_status: "Active",
  is_active: true,
  role_code: "SUPER_ADMIN",
  assigned_projects_count: 0,
  assigned_tasks_count: 0,
  completed_tasks_count: 0,
  created_at: new Date().toISOString(),
};

function generateId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_SERVICES: Service[] = [
  {
    id: "srv-monthly-3b",
    service_code: "SRV-GST-3B",
    service_name: "GST Monthly 3B Filing",
    description: "Monthly summary return filing for outward and inward supplies along with tax payment.",
    default_fee: 3500,
    default_gst_rate: 18,
    billing_type: "Recurring",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-gstr-1",
    service_code: "SRV-GST-GSTR1",
    service_name: "GSTR-1 Monthly Return",
    description: "Detailed statement of outward supplies and invoice-level upload on the GST portal.",
    default_fee: 4000,
    default_gst_rate: 18,
    billing_type: "Recurring",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-gst-reg",
    service_code: "SRV-GST-REG",
    service_name: "GST Registration & Amendment",
    description: "New GST number procurement, core and non-core amendments, and address updates.",
    default_fee: 5000,
    default_gst_rate: 18,
    billing_type: "One-time",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-company-incorp",
    service_code: "SRV-ROC-INCORP",
    service_name: "Company Incorporation (Pvt Ltd / LLP)",
    description: "SPICe+ Part A & B filing, name approval, DSC, DIN, MOA/AOA drafting, and certificate of incorporation.",
    default_fee: 15000,
    default_gst_rate: 18,
    billing_type: "One-time",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-stat-audit",
    service_code: "SRV-AUD-STAT",
    service_name: "Statutory Financial Audit",
    description: "Independent annual financial statement examination, CARO compliance, and audit report issuance.",
    default_fee: 45000,
    default_gst_rate: 18,
    billing_type: "Recurring",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-itr-corporate",
    service_code: "SRV-IT-CORP",
    service_name: "Corporate Income Tax Return (ITR-6)",
    description: "Tax audit finalization, balance sheet computation, MAT calculations, and ITR-6 e-filing.",
    default_fee: 25000,
    default_gst_rate: 18,
    billing_type: "Recurring",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-tds-returns",
    service_code: "SRV-TAX-TDS",
    service_name: "TDS Quarterly Filing (24Q / 26Q)",
    description: "Challan reconciliation, TDS return preparation, FVU validation, and Form 16 generation.",
    default_fee: 3000,
    default_gst_rate: 18,
    billing_type: "Recurring",
    status: "Active",
    created_at: new Date().toISOString(),
  },
  {
    id: "srv-trademark-reg",
    service_code: "SRV-IP-TM",
    service_name: "Trademark Application & Prosecution",
    description: "Brand name search, TM-A filing, classification search, examination report reply, and hearing attendance.",
    default_fee: 7500,
    default_gst_rate: 18,
    billing_type: "One-time",
    status: "Active",
    created_at: new Date().toISOString(),
  },
];

export const DEFAULT_WORKFLOWS: WorkflowTemplate[] = [
  {
    id: "wf-gst-reg",
    workflow_code: "WF-GST-REG",
    workflow_name: "GST Registration Execution Workflow",
    service_id: "srv-gst-reg",
    service_name: "GST Registration & Amendment",
    description: "End-to-end standard operating procedure for new GST registrations, verification, and ARN approval.",
    is_active: true,
    version: 1,
    created_at: new Date().toISOString(),
    milestones: [
      {
        id: "ms-gst-1",
        sequence_number: 1,
        title: "Client Document Collection & KYC Verification",
        description: "Gather PAN, Aadhaar, electricity bill, rent agreement, and NOC from applicant.",
        stages: [
          {
            id: "st-gst-1",
            stage_name: "Document Scrutiny",
            sequence_number: 1,
            description: "Verify document clarity, address correctness, and authorized signatory DSC.",
            sub_stages: [
              {
                id: "subst-gst-1",
                sub_stage_name: "PAN & Electricity Bill Validation",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-gst-1",
                    task_name: "Verify Owner KYC & Commercial Address Proof",
                    description: "Check consumer number on EB bill matches municipality tax receipt and NOC.",
                    sequence_number: 1,
                    start_day_offset: 0,
                    duration_days: 2,
                    priority: "High",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ms-gst-2",
        sequence_number: 2,
        title: "Portal Application & Aadhaar Authentication",
        description: "Generate TRN, fill Part B, execute Aadhaar OTP e-sign, and obtain ARN.",
        stages: [
          {
            id: "st-gst-2",
            stage_name: "TRN & Form Submission",
            sequence_number: 1,
            description: "Submit online application on GST portal.",
            sub_stages: [
              {
                id: "subst-gst-2",
                sub_stage_name: "Aadhaar e-KYC Verification",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-gst-2",
                    task_name: "Complete Aadhaar OTP Authentication with Client",
                    description: "Coordinate with client to click authentication link and input OTP.",
                    sequence_number: 1,
                    start_day_offset: 2,
                    duration_days: 2,
                    priority: "Urgent",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ms-gst-3",
        sequence_number: 3,
        title: "Officer Clarification / Approval & Certificate Dispatch",
        description: "Track ARN status, reply to any clarification notice (REG-03), and download GSTIN REG-06 certificate.",
        stages: [
          {
            id: "st-gst-3",
            stage_name: "ARN Tracking & Certificate Handover",
            sequence_number: 1,
            description: "Download certificate and dispatch login credentials to client.",
            sub_stages: [
              {
                id: "subst-gst-3",
                sub_stage_name: "Welcome Kit & Final Dispatch",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-gst-3",
                    task_name: "Generate Client Welcome Kit with GSTIN and Credentials",
                    description: "Send official intimation letter and GST registration certificate PDF to client email.",
                    sequence_number: 1,
                    start_day_offset: 4,
                    duration_days: 3,
                    priority: "Medium",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "wf-company-incorp",
    workflow_code: "WF-ROC-INCORP",
    workflow_name: "Company Incorporation & Compliance Workflow",
    service_id: "srv-company-incorp",
    service_name: "Company Incorporation (Pvt Ltd / LLP)",
    description: "SPICe+ Part A name reservation, Part B drafting, AGILE-PRO-S, and Certificate of Incorporation issuance.",
    is_active: true,
    version: 1,
    created_at: new Date().toISOString(),
    milestones: [
      {
        id: "ms-incorp-1",
        sequence_number: 1,
        title: "Name Reservation (SPICe+ Part A)",
        description: "Run name availability search on MCA portal and file RUN / SPICe+ Part A.",
        stages: [
          {
            id: "st-incorp-1",
            stage_name: "Name Scrutiny & Submission",
            sequence_number: 1,
            sub_stages: [
              {
                id: "subst-incorp-1",
                sub_stage_name: "MCA Name Check",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-inc-1",
                    task_name: "Draft 2 Proposed Names with Main Object Alignment",
                    description: "Verify trademark conflicts under Class 35/42 before submission.",
                    sequence_number: 1,
                    start_day_offset: 0,
                    duration_days: 2,
                    priority: "High",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ms-incorp-2",
        sequence_number: 2,
        title: "SPICe+ Part B, MOA, AOA & DSC Affixing",
        description: "Draft e-MOA (INC-33), e-AOA (INC-34), INC-9 declaration, and affix director DSCs.",
        stages: [
          {
            id: "st-incorp-2",
            stage_name: "Statutory Form Finalization",
            sequence_number: 1,
            sub_stages: [
              {
                id: "subst-incorp-2",
                sub_stage_name: "DSC Signing & MCA Upload",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-inc-2",
                    task_name: "Affix Class 3 DSC on SPICe+ Part B & Pay MCA Fee",
                    description: "Pre-scrutiny pass and generate SRN challan for incorporation.",
                    sequence_number: 1,
                    start_day_offset: 2,
                    duration_days: 3,
                    priority: "Urgent",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "ms-incorp-3",
        sequence_number: 3,
        title: "COI Issuance & Post-Incorporation Compliances",
        description: "Receive Certificate of Incorporation (CIN), PAN/TAN card, bank account opening, and INC-20A filing.",
        stages: [
          {
            id: "st-incorp-3",
            stage_name: "Post Incorporation Handover",
            sequence_number: 1,
            sub_stages: [
              {
                id: "subst-incorp-3",
                sub_stage_name: "Bank Account & INC-20A Commencement",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-inc-3",
                    task_name: "File INC-20A Commencement of Business within 180 Days",
                    description: "Obtain bank statement showing subscription money deposit from promoters.",
                    sequence_number: 1,
                    start_day_offset: 5,
                    duration_days: 10,
                    priority: "Medium",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "wf-stat-audit",
    workflow_code: "WF-AUD-STAT",
    workflow_name: "Statutory Financial Audit Execution Workflow",
    service_id: "srv-stat-audit",
    service_name: "Statutory Financial Audit",
    description: "Standard auditing practices compliant with ICAI standards (SA 200–SA 700) and CARO 2020.",
    is_active: true,
    version: 1,
    created_at: new Date().toISOString(),
    milestones: [
      {
        id: "ms-audit-1",
        sequence_number: 1,
        title: "Audit Planning & Materiality Assessment",
        description: "Engagement letter execution, independence declaration, and determining materiality thresholds.",
        stages: [
          {
            id: "st-audit-1",
            stage_name: "Preliminary Scrutiny",
            sequence_number: 1,
            sub_stages: [
              {
                id: "subst-audit-1",
                sub_stage_name: "Risk Assessment & Trial Balance Scrutiny",
                sequence_number: 1,
                tasks: [
                  {
                    id: "tt-aud-1",
                    task_name: "Review Opening Balances & Previous Year Audit Report",
                    description: "Verify opening balances match audited financials and note emphasis of matter.",
                    sequence_number: 1,
                    start_day_offset: 0,
                    duration_days: 5,
                    priority: "High",
                    status: "Open",
                    subtasks: [],
                    default_comments: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export const DEFAULT_PRACTICE_TASKS = [
  // General
  {
    id: "tsk-gen-workflow",
    title: "workflow",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-general",
    sub_category_name: "General",
    status: "Open",
    priority: "Medium" as ProjectPriority,
    comments_count: 0,
    subtasks: [] as { id: string; title: string; status: string }[],
  },
  {
    id: "tsk-gen-commercierge",
    title: "Commercierge IE Code",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-general",
    sub_category_name: "General",
    status: "Hold",
    priority: "Medium" as ProjectPriority,
    comments_count: 1,
    subtasks: [],
  },
  {
    id: "tsk-gen-kreateworks",
    title: "Kreateworks Trademark",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-general",
    sub_category_name: "General",
    status: "In Progress",
    priority: "High" as ProjectPriority,
    comments_count: 0,
    subtasks: [],
  },
  // GST Registrations
  {
    id: "tsk-gst-sunlight",
    title: "Sunlight Residency",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-gst-reg",
    sub_category_name: "GST Registrations",
    status: "Approval pending",
    priority: "High" as ProjectPriority,
    assigned_employee_name: "Kirubakar...",
    comments_count: 3,
    subtasks: [],
  },
  {
    id: "tsk-gst-siddiq",
    title: "Siddiq",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-gst-reg",
    sub_category_name: "GST Registrations",
    status: "Approval pending",
    priority: "Medium" as ProjectPriority,
    comments_count: 2,
    subtasks: [],
  },
  {
    id: "tsk-gst-sounder",
    title: "Sounder",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-gst-reg",
    sub_category_name: "GST Registrations",
    status: "Kiruba Action",
    priority: "Urgent" as ProjectPriority,
    comments_count: 2,
    subtasks: [],
  },
  {
    id: "tsk-gst-greenwave",
    title: "Green wave address change",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-gst-reg",
    sub_category_name: "GST Registrations",
    status: "Open",
    priority: "Medium" as ProjectPriority,
    comments_count: 0,
    subtasks: [],
  },
  // Company Incorporations
  {
    id: "tsk-inc-hydralilly",
    title: "Hydralilly",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-company-incorp",
    sub_category_name: "Company Incorporations",
    status: "Kiruba Action",
    priority: "High" as ProjectPriority,
    comments_count: 0,
    subtasks: [],
  },
  {
    id: "tsk-inc-marutham",
    title: "Marutham",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-company-incorp",
    sub_category_name: "Company Incorporations",
    status: "Kiruba Action",
    priority: "High" as ProjectPriority,
    comments_count: 0,
    subtasks: [],
  },
  {
    id: "tsk-inc-babjee",
    title: "Babjee Partnership",
    category_id: "cat-general",
    category_name: "General Practice",
    sub_category_id: "subcat-company-incorp",
    sub_category_name: "Company Incorporations",
    status: "Kiruba Action",
    priority: "Medium" as ProjectPriority,
    comments_count: 1,
    subtasks: [
      { id: "sub-1", title: "Partnership Deed Drafting", status: "Open" },
      { id: "sub-2", title: "PAN Card Application", status: "Open" },
    ],
  },
];

const STORAGE_KEY = "acru_pms_store_v1";

class PMSDataStore {
  // PURE PRODUCTION REPOSITORIES — ZERO MOCK DATA (PERSISTED TO LOCALSTORAGE + SUPABASE SYNC)
  private clients: Client[] = [];
  private services: Service[] = [];
  private engagements: ServiceEngagement[] = [];
  private projects: Project[] = [];
  private tasks: Task[] = [];
  private taskComments: TaskComment[] = [];
  private deletedTaskProjectIds: string[] = [];
  private workflows: WorkflowTemplate[] = [];
  private employees: Employee[] = [DEFAULT_SYSTEM_ADMIN];
  private teams: Team[] = [];
  private invoices: Invoice[] = [];
  private payments: Payment[] = [];
  private documents: FileObject[] = [];
  private notifications: Notification[] = [];
  private activityLogs: ActivityLog[] = [];
  private officeGeoConfig: OfficeGeoConfig | null = null;
  private attendanceRecords: AttendanceRecord[] = [];
  private taskStatuses: TaskStatusConfig[] = [...DEFAULT_TASK_STATUSES];
  private taskCategories: TaskCategory[] = [...DEFAULT_TASK_CATEGORIES];
  private currentUser: Employee = DEFAULT_SYSTEM_ADMIN;
  private authenticated: boolean = false;
  private listeners: Set<() => void> = new Set();
  private cloudSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private isHydratingFromCloud: boolean = false;
  private cloudHydratePromise: Promise<void> | null = null;
  private localUpdatedAt: number = 0;

  constructor() {
    this.hydrate();
    this.ensureDefaultData();
    this.backfillMissingProjectsAndTasks();
    void this.hydrateFromSupabase();
    void this.syncClientsFromSupabase();
  }

  private addDaysIso(baseIso: string, days: number): string {
    const parsed = new Date(baseIso);
    const ms = Number.isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
    return new Date(ms + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  }

  /**
   * Ensures every Client has >= 1 Project, every Project has >= 1 top-level Task
   * with a valid start_date & due_date, and every top-level Task has starter Subtasks.
   */
  private backfillMissingProjectsAndTasks() {
    let changed = false;
    const today = new Date().toISOString().slice(0, 10);

    // 1. Active engagements without a linked project
    this.engagements.forEach((eng) => {
      if (eng.status !== "Active") return;
      const client = this.clients.find((c) => c.id === eng.client_id);
      const clientName = eng.client_name || client?.client_name || "Client";

      const project = this.projects.find(
        (p) =>
          p.service_engagement_id === eng.id ||
          (p.client_id === eng.client_id && p.service_name === eng.service_name)
      );

      if (!project) {
        const nextNum = this.projects.length + 1;
        const year = new Date().getFullYear();
        const startDate = eng.start_date || today;
        const dueDate = eng.end_date || this.addDaysIso(startDate, 30);

        this.projects.unshift({
          id: generateId("proj"),
          project_code: `PRJ-${year}-${String(nextNum).padStart(3, "0")}`,
          project_name: `${clientName} — ${eng.service_name}`,
          project_type: "Client Project",
          client_id: eng.client_id,
          client_name: clientName,
          service_engagement_id: eng.id,
          service_name: eng.service_name,
          project_manager_id: eng.relationship_manager_id || this.currentUser.id,
          project_manager_name: eng.relationship_manager_name || this.currentUser.full_name,
          description: `Service delivery project for ${eng.service_name} (${eng.billing_frequency})`,
          priority: "Medium",
          start_date: startDate,
          due_date: dueDate,
          progress_percentage: 0,
          status: "In Progress",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        changed = true;
      }
    });

    // 2. Every Client without ANY Project gets a Client Delivery Project
    this.clients.forEach((client) => {
      const hasProject = this.projects.some((p) => p.client_id === client.id);
      if (!hasProject) {
        const nextNum = this.projects.length + 1;
        const year = new Date().getFullYear();
        const startDate = (client.created_at || today).slice(0, 10);
        const dueDate = this.addDaysIso(startDate, 30);

        this.projects.unshift({
          id: generateId("proj"),
          project_code: `PRJ-${year}-${String(nextNum).padStart(3, "0")}`,
          project_name: `${client.client_name} — Client Delivery Project`,
          project_type: "Client Project",
          client_id: client.id,
          client_name: client.client_name,
          project_manager_id: client.relationship_manager_id || this.currentUser.id,
          project_manager_name: client.relationship_manager_name || this.currentUser.full_name,
          description: `Primary compliance & execution project for ${client.client_name}.`,
          priority: "Medium",
          start_date: startDate,
          due_date: dueDate,
          progress_percentage: 0,
          status: "In Progress",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        changed = true;
      }
    });

    // 3. Every Project without ANY top-level Task gets a deliverable Task (unless tasks were explicitly deleted)
    this.projects.forEach((project) => {
      if (this.deletedTaskProjectIds.includes(project.id)) return;
      const hasTask = this.tasks.some((t) => t.project_id === project.id && !t.parent_task_id);
      if (!hasTask) {
        const nextTaskNum = this.tasks.length + 1;
        const startDate = project.start_date || today;
        const dueDate = project.due_date || this.addDaysIso(startDate, 14);
        this.tasks.unshift({
          id: generateId("tsk"),
          task_code: `TSK-${String(nextTaskNum).padStart(3, "0")}`,
          title: project.service_name
            ? `${project.service_name} — Execution`
            : `${project.project_name} — Initial Deliverable`,
          project_id: project.id,
          project_name: project.project_name,
          assigned_employee_id: project.project_manager_id || this.currentUser.id,
          assigned_employee_name: project.project_manager_name || this.currentUser.full_name,
          priority: project.priority || "Medium",
          start_date: startDate,
          due_date: dueDate,
          status: "To Do",
          description: project.description || `Core deliverable task for ${project.project_name}.`,
          created_by: this.currentUser.id,
          created_by_name: this.currentUser.full_name,
          comments_count: 0,
          attachments_count: 0,
          created_at: new Date().toISOString(),
        });
        changed = true;
      }
    });

    // 4. Every top-level Task gets start_date (zero mock subtasks) and purge any legacy auto-seeded mock subtasks
    const mockSubtaskTitles = new Set([
      "1. Client Inputs & Source Document Verification",
      "2. Working Paper Preparation, Review & Completion",
    ]);
    const beforeSubCount = this.tasks.length;
    this.tasks = this.tasks.filter(
      (t) =>
        !(
          t.parent_task_id &&
          mockSubtaskTitles.has(t.title) &&
          (t.description?.startsWith("Subtask step under ") || t.description?.startsWith("Subtask under "))
        )
    );
    if (this.tasks.length !== beforeSubCount) {
      changed = true;
    }

    const topLevelTasks = this.tasks.filter((t) => !t.parent_task_id);
    topLevelTasks.forEach((task) => {
      const proj = this.projects.find((p) => p.id === task.project_id);
      if (!task.start_date) {
        task.start_date = proj?.start_date || (task.created_at || today).slice(0, 10);
        changed = true;
      }
    });

    if (changed) {
      this.projects.forEach((p) => {
        p.progress_percentage = this.computeProjectProgress(p.id);
      });
      this.persist();
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {
        // Ignore subscriber errors
      }
    });
  }

  private mergeById<T extends { id: string }>(currentList: T[], incomingList: T[]): T[] {
    if (!Array.isArray(incomingList) || incomingList.length === 0) return currentList;
    if (!Array.isArray(currentList) || currentList.length === 0) return incomingList;

    const map = new Map<string, T>();
    currentList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    incomingList.forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  }

  private ensureDefaultData() {
    let changed = false;

    // 1. Ensure Services
    if (this.services.length === 0) {
      this.services = [...DEFAULT_SERVICES];
      changed = true;
    }

    // 2. Ensure Workflows
    if (this.workflows.length === 0) {
      this.workflows = [...DEFAULT_WORKFLOWS];
      changed = true;
    }

    // 3. Ensure Default Practice Tasks under Sub-groups (General, GST Registrations, Company Incorporations)
    const existingTaskTitles = new Set(this.tasks.map((t) => (t.title || "").toLowerCase().trim()));
    const refProject = this.projects[0] || {
      id: "proj-general-practice",
      project_name: "General Practice Deliverables",
    };

    const today = new Date().toISOString().slice(0, 10);
    const in7Days = this.addDaysIso(today, 7);

    DEFAULT_PRACTICE_TASKS.forEach((seed, idx) => {
      if (!existingTaskTitles.has(seed.title.toLowerCase().trim())) {
        const year = new Date().getFullYear();
        const nextNum = this.tasks.length + 1;
        const taskCode = `TSK-${year}-${String(nextNum + idx).padStart(3, "0")}`;

        const createdTask: Task = {
          id: seed.id,
          task_code: taskCode,
          project_id: refProject.id,
          project_name: refProject.project_name,
          title: seed.title,
          description: `Deliverable task for ${seed.title} under ${seed.sub_category_name}.`,
          priority: seed.priority as ProjectPriority,
          status: seed.status,
          category_id: seed.category_id,
          category_name: seed.category_name,
          sub_category_id: seed.sub_category_id,
          sub_category_name: seed.sub_category_name,
          assigned_employee_id: seed.assigned_employee_name ? "emp-admin-01" : undefined,
          assigned_employee_name: seed.assigned_employee_name,
          start_date: today,
          due_date: in7Days,
          comments_count: seed.comments_count,
          attachments_count: 0,
          created_at: new Date().toISOString(),
          subtasks: seed.subtasks.map((s, sIdx) => ({
            id: `${seed.id}-sub-${sIdx + 1}`,
            task_code: `${taskCode}.${sIdx + 1}`,
            parent_task_id: seed.id,
            project_id: refProject.id,
            project_name: refProject.project_name,
            title: s.title,
            description: `Subtask ${s.title}`,
            priority: "Medium" as ProjectPriority,
            status: s.status || "Open",
            category_id: seed.category_id,
            category_name: seed.category_name,
            sub_category_id: seed.sub_category_id,
            sub_category_name: seed.sub_category_name,
            start_date: today,
            due_date: in7Days,
            created_at: new Date().toISOString(),
          })),
        };
        this.tasks.push(createdTask);
        changed = true;
      }
    });

    if (changed) {
      this.writeLocalSnapshot();
    }
  }

  private applyWorkspaceDataSnapshot(parsed: any) {
    if (!parsed || typeof parsed !== "object") return;
    if (Array.isArray(parsed.clients) && parsed.clients.length > 0) {
      this.clients = this.mergeById(this.clients, parsed.clients);
    }
    if (Array.isArray(parsed.services) && parsed.services.length > 0) {
      this.services = this.mergeById(this.services, parsed.services);
    }
    if (Array.isArray(parsed.engagements) && parsed.engagements.length > 0) {
      this.engagements = this.mergeById(this.engagements, parsed.engagements);
    }
    if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
      this.projects = this.mergeById(this.projects, parsed.projects);
    }
    if (Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      this.tasks = this.mergeById(this.tasks, parsed.tasks);
    }
    if (Array.isArray(parsed.taskComments) && parsed.taskComments.length > 0) {
      this.taskComments = this.mergeById(this.taskComments, parsed.taskComments);
    }
    if (Array.isArray(parsed.deletedTaskProjectIds)) {
      this.deletedTaskProjectIds = Array.from(
        new Set([...this.deletedTaskProjectIds, ...parsed.deletedTaskProjectIds])
      );
    }
    if (Array.isArray(parsed.workflows) && parsed.workflows.length > 0) {
      this.workflows = this.mergeById(this.workflows, parsed.workflows);
    }
    if (Array.isArray(parsed.employees) && parsed.employees.length > 0) {
      this.employees = this.mergeById(this.employees, parsed.employees);
    }
    if (Array.isArray(parsed.teams) && parsed.teams.length > 0) {
      this.teams = this.mergeById(this.teams, parsed.teams);
    }
    if (Array.isArray(parsed.invoices) && parsed.invoices.length > 0) {
      this.invoices = this.mergeById(this.invoices, parsed.invoices);
    }
    if (Array.isArray(parsed.payments) && parsed.payments.length > 0) {
      this.payments = this.mergeById(this.payments, parsed.payments);
    }
    if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
      this.documents = this.mergeById(this.documents, parsed.documents);
    }
    if (Array.isArray(parsed.notifications) && parsed.notifications.length > 0) {
      this.notifications = this.mergeById(this.notifications, parsed.notifications);
    }
    if (Array.isArray(parsed.activityLogs) && parsed.activityLogs.length > 0) {
      this.activityLogs = this.mergeById(this.activityLogs, parsed.activityLogs);
    }
    if (parsed.officeGeoConfig && typeof parsed.officeGeoConfig.latitude === "number") {
      this.officeGeoConfig = parsed.officeGeoConfig;
    }
    if (Array.isArray(parsed.attendanceRecords) && parsed.attendanceRecords.length > 0) {
      this.attendanceRecords = this.mergeById(this.attendanceRecords, parsed.attendanceRecords);
    }
    if (Array.isArray(parsed.taskStatuses) && parsed.taskStatuses.length > 0) {
      this.taskStatuses = this.mergeById(this.taskStatuses, parsed.taskStatuses);
    }
    if (Array.isArray(parsed.taskCategories) && parsed.taskCategories.length > 0) {
      this.taskCategories = this.mergeById(this.taskCategories, parsed.taskCategories);
    } else if (this.taskCategories.length === 0) {
      this.taskCategories = [...DEFAULT_TASK_CATEGORIES];
    }
    if (typeof parsed.updatedAt === "number") {
      this.localUpdatedAt = Math.max(this.localUpdatedAt, parsed.updatedAt);
    }
    // Keep default System Admin email synced with VITE_SUPERADMIN_EMAIL
    this.employees = this.employees.map((e) =>
      e.id === "emp-admin-01" && e.email === "admin@pmsfirm.com"
        ? { ...e, email: SUPERADMIN_EMAIL }
        : e
    );
  }

  private buildWorkspaceDataSnapshot(updatedAt: number) {
    return {
      clients: this.clients,
      services: this.services,
      engagements: this.engagements,
      projects: this.projects,
      tasks: this.tasks,
      taskComments: this.taskComments,
      deletedTaskProjectIds: this.deletedTaskProjectIds,
      workflows: this.workflows,
      employees: this.employees,
      teams: this.teams,
      invoices: this.invoices,
      payments: this.payments,
      documents: this.documents,
      notifications: this.notifications,
      activityLogs: this.activityLogs,
      officeGeoConfig: this.officeGeoConfig,
      attendanceRecords: this.attendanceRecords,
      taskStatuses: this.taskStatuses,
      taskCategories: this.taskCategories,
      updatedAt,
    };
  }

  private hydrate() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      try {
        window.localStorage.setItem("acru_pms_store_backup", raw);
      } catch {
        // ignore backup quota error
      }
      const parsed = JSON.parse(raw);
      this.applyWorkspaceDataSnapshot(parsed);
      if (parsed.currentUser && parsed.currentUser.id) {
        this.currentUser = parsed.currentUser;
      }
      if (typeof parsed.authenticated === "boolean") {
        this.authenticated = parsed.authenticated;
      }
      if (this.currentUser.id === "emp-admin-01" && this.currentUser.email === "admin@pmsfirm.com") {
        this.currentUser = { ...this.currentUser, email: SUPERADMIN_EMAIL };
      }
    } catch (error) {
      console.error("Failed to hydrate PMS store from localStorage:", error);
    }
  }

  private writeLocalSnapshot() {
    if (typeof window === "undefined" || !window.localStorage) return;
    try {
      const snapshot = {
        ...this.buildWorkspaceDataSnapshot(this.localUpdatedAt || Date.now()),
        currentUser: this.currentUser,
        authenticated: this.authenticated,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error("Failed to persist PMS store to localStorage:", error);
    }
  }

  private persist() {
    if (!this.isHydratingFromCloud) {
      this.localUpdatedAt = Date.now();
    }
    this.writeLocalSnapshot();
    if (!this.isHydratingFromCloud) {
      this.scheduleCloudSync();
    }
    this.notify();
  }

  private scheduleCloudSync() {
    if (typeof window === "undefined") return;
    if (this.cloudSyncTimer) clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(() => {
      void this.pushSnapshotToSupabase();
    }, 350);
  }

  private async pushSnapshotToSupabase() {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const snapshot = this.buildWorkspaceDataSnapshot(this.localUpdatedAt || Date.now());
      const { error } = await supabase.from("system_settings").upsert(
        {
          setting_key: "pms_workspace_snapshot_v1",
          setting_value: snapshot,
          description: "Cross-device PMS workspace state",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "setting_key" }
      );
      if (error) {
        console.warn("Supabase workspace sync skipped:", error.message);
      }
    } catch {
      // Non-fatal if offline
    }
  }

  async hydrateFromSupabase(force = false): Promise<void> {
    if (typeof window === "undefined") return;
    if (this.cloudHydratePromise && !force) return this.cloudHydratePromise;

    const run = async () => {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return;

        const { data, error } = await supabase
          .from("system_settings")
          .select("setting_value")
          .eq("setting_key", "pms_workspace_snapshot_v1")
          .maybeSingle();

        if (error) {
          console.warn("Supabase workspace hydrate skipped:", error.message);
          return;
        }

        const remote = data?.setting_value as Record<string, any> | undefined;
        if (remote && typeof remote === "object") {
          this.isHydratingFromCloud = true;
          try {
            this.applyWorkspaceDataSnapshot(remote);
            this.ensureDefaultData();
            if (this.currentUser?.id) {
              const matched = this.employees.find(
                (e) =>
                  e.id === this.currentUser.id ||
                  (e.email || "").toLowerCase() === (this.currentUser.email || "").toLowerCase()
              );
              if (matched) this.currentUser = matched;
            }
            this.writeLocalSnapshot();
            void this.pushSnapshotToSupabase();
          } finally {
            this.isHydratingFromCloud = false;
          }
          this.notify();
        } else {
          // First-time cloud seed from current device
          await this.pushSnapshotToSupabase();
        }
      } catch {
        // Non-fatal if offline
      } finally {
        this.cloudHydratePromise = null;
      }
    };

    this.cloudHydratePromise = run();
    return this.cloudHydratePromise;
  }

  private async syncClientsFromSupabase() {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const { data, error } = await supabase
        .from("clients")
        .select("*, client_contacts(*), client_addresses(*), client_registrations(*)")
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data) || data.length === 0) return;

      const remoteClients: Client[] = data.map((row: any) => {
        const reg = Array.isArray(row.client_registrations)
          ? row.client_registrations[0]
          : row.client_registrations;
        const contacts = Array.isArray(row.client_contacts) ? row.client_contacts : [];
        const primaryContact = contacts.find((c: any) => c.is_primary) || contacts[0];
        const addresses = Array.isArray(row.client_addresses) ? row.client_addresses : [];

        return {
          id: row.id,
          client_code: row.client_code,
          client_name: row.client_name,
          legal_name: row.legal_name,
          reference_name: row.reference_name || undefined,
          constitution: row.constitution,
          category: row.category || undefined,
          nature_of_income: row.nature_of_income || undefined,
          remarks: row.remarks || undefined,
          relationship_manager_id: row.relationship_manager_id || undefined,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          contact: primaryContact,
          addresses,
          registration: reg,
        };
      });

      const localOnly = this.clients.filter(
        (lc) => !remoteClients.some((rc) => rc.id === lc.id || rc.client_code === lc.client_code)
      );
      this.clients = [...localOnly, ...remoteClients];
      this.backfillMissingProjectsAndTasks();
      this.persist();
    } catch {
      // Non-fatal if offline or Supabase RLS denies unauthenticated read
    }
  }

  private async pushClientToSupabase(client: Client) {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;

      const { error } = await supabase.from("clients").upsert({
        id: client.id,
        client_code: client.client_code,
        client_name: client.client_name,
        legal_name: client.legal_name,
        reference_name: client.reference_name || null,
        constitution: client.constitution,
        category: client.category || null,
        nature_of_income: client.nature_of_income || null,
        remarks: client.remarks || null,
        status: client.status,
      });

      if (error) return;

      if (client.contact) {
        await supabase.from("client_contacts").upsert({
          client_id: client.id,
          contact_person: client.contact.contact_person,
          designation: client.contact.designation || null,
          mobile_number: client.contact.mobile_number,
          email: client.contact.email,
          is_primary: true,
        });
      }

      if (client.addresses && client.addresses.length > 0) {
        await supabase.from("client_addresses").insert(
          client.addresses.map((addr) => ({
            client_id: client.id,
            address_type: addr.address_type,
            street_address: addr.street_address,
            city: addr.city,
            state: addr.state,
            pin_code: addr.pin_code,
            country: addr.country,
            is_primary: addr.is_primary,
          }))
        );
      }

      if (client.registration) {
        await supabase.from("client_registrations").upsert({
          client_id: client.id,
          pan: client.registration.pan,
          gstin: client.registration.gstin || null,
          cin: client.registration.cin || null,
          dob_or_doi: client.registration.dob_or_doi || null,
          additional_registrations: client.registration.additional_registrations || [],
        });
      }
    } catch {
      // Local persistence already succeeded
    }
  }

  private async deleteClientFromSupabase(clientId: string) {
    if (typeof window === "undefined") return;
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) return;
      await supabase.from("clients").delete().eq("id", clientId);
    } catch {
      // Local deletion already succeeded
    }
  }

  // Active Session User
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getCurrentUser(): Employee {
    return this.currentUser;
  }

  setCurrentUser(empId: string) {
    const found = this.employees.find(e => e.id === empId);
    if (found) {
      this.currentUser = found;
      this.authenticated = true;
      this.persist();
      this.notify();
    }
  }

  signOut() {
    this.authenticated = false;
    this.persist();
    this.notify();
  }

  signInWithEmail(
    email: string,
    fullName?: string
  ): { ok: boolean; user?: Employee; reason?: string } {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      return { ok: false, reason: "No email address returned by Google OAuth." };
    }

    if (isSuperAdminEmail(normalized)) {
      let admin = this.employees.find(
        (e) => (e.email || "").trim().toLowerCase() === normalized || e.id === "emp-admin-01"
      );
      if (admin) {
        admin = {
          ...admin,
          email: normalized,
          role_code: "SUPER_ADMIN",
          is_active: true,
          employment_status: "Active",
          full_name:
            fullName && admin.full_name === "System Administrator" ? fullName : admin.full_name,
        };
        this.employees = this.employees.map((e) => (e.id === admin!.id ? admin! : e));
      } else {
        admin = {
          ...DEFAULT_SYSTEM_ADMIN,
          email: normalized,
          full_name: fullName || DEFAULT_SYSTEM_ADMIN.full_name,
        };
        this.employees = [admin, ...this.employees];
      }
      this.currentUser = admin;
      this.authenticated = true;
      this.persist();
      this.notify();
      return { ok: true, user: admin };
    }

    const found = this.employees.find(
      (e) => (e.email || "").trim().toLowerCase() === normalized
    );
    if (!found) {
      return {
        ok: false,
        reason: `Account (${email}) is not registered in the Employee Directory. Ask your Super Admin (${SUPERADMIN_EMAIL}) to add you first.`,
      };
    }
    if (!found.is_active) {
      return {
        ok: false,
        reason: "Access Denied: Your employee account has been deactivated.",
      };
    }

    this.currentUser = found;
    this.authenticated = true;
    this.persist();
    this.notify();
    return { ok: true, user: found };
  }

  // Dashboard KPIs (100% Dynamically Calculated from Real Database State)
  getKPIs(): DashboardKPIs {
    const totalClients = this.clients.length;
    const activeClients = this.clients.filter(c => c.status === "Active").length;
    const totalServices = this.services.length;
    const activeProjects = this.projects.filter(p => p.status === "In Progress" || p.status === "Under Review").length;
    const pendingTasks = this.tasks.filter(t => !t.parent_task_id && t.status !== "Completed").length;
    const completedTasks = this.tasks.filter(t => !t.parent_task_id && t.status === "Completed").length;
    const totalEmployees = this.employees.length;
    const pendingPaymentsCount = this.invoices.filter(i => i.status === "Partially Paid" || i.status === "Overdue" || i.status === "Finalized").length;
    
    const totalRevenueInvoiced = this.invoices
      .filter(i => i.status !== "Cancelled" && i.status !== "Draft")
      .reduce((sum, inv) => sum + inv.grand_total, 0);

    const totalPaymentsReceived = this.payments
      .filter(p => p.status === "Completed")
      .reduce((sum, pay) => sum + pay.amount, 0);

    const outstandingReceivables = Math.max(0, totalRevenueInvoiced - totalPaymentsReceived);

    return {
      totalClients,
      activeClients,
      totalServices,
      activeProjects,
      pendingTasks,
      completedTasks,
      totalEmployees,
      pendingPaymentsCount,
      totalRevenueInvoiced,
      totalPaymentsReceived,
      outstandingReceivables
    };
  }

  private computeTaskProgressScore(task: Task, visited = new Set<string>()): number {
    if (this.isCompletedStatus(task.status)) return 100;
    if (visited.has(task.id)) return 0;
    const nextVisited = new Set(visited);
    nextVisited.add(task.id);

    const subtasks = this.tasks.filter((st) => st.parent_task_id === task.id);
    if (subtasks.length > 0) {
      const subSum = subtasks.reduce(
        (acc, st) => acc + this.computeTaskProgressScore(st, nextVisited),
        0
      );
      return subSum / subtasks.length;
    }
    if (task.status === "Under Review") return 75;
    if (task.status === "In Progress") return 40;
    return 0;
  }

  private computeProjectProgress(projectId: string): number {
    const projectTasks = this.tasks.filter((t) => t.project_id === projectId && !t.parent_task_id);
    if (projectTasks.length === 0) return 0;

    const totalScore = projectTasks.reduce(
      (acc, task) => acc + this.computeTaskProgressScore(task),
      0
    );

    return Math.round(totalScore / projectTasks.length);
  }

  private refreshProjectProgress(projectId: string) {
    const proj = this.projects.find((p) => p.id === projectId);
    if (!proj) return;
    proj.progress_percentage = this.computeProjectProgress(projectId);
    proj.updated_at = new Date().toISOString();
  }

  private enrichClient(client: Client): Client {
    const clientEngagements = this.engagements.filter((e) => e.client_id === client.id);
    const clientProjects = this.projects.filter((p) => p.client_id === client.id);
    const clientInvoices = this.invoices.filter((i) => i.client_id === client.id);
    const clientPayments = this.payments.filter((p) => p.client_id === client.id);
    const projectIds = new Set(clientProjects.map((p) => p.id));
    const pendingTasks = this.tasks.filter(
      (t) => !t.parent_task_id && projectIds.has(t.project_id) && t.status !== "Completed"
    ).length;

    const invoiced = clientInvoices
      .filter((i) => i.status !== "Cancelled" && i.status !== "Draft")
      .reduce((sum, i) => sum + i.grand_total, 0);
    const paid = clientPayments
      .filter((p) => p.status === "Completed")
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      ...client,
      active_services_count: clientEngagements.filter((e) => e.status === "Active").length,
      total_projects_count: clientProjects.length,
      completed_projects_count: clientProjects.filter((p) => p.status === "Completed").length,
      pending_tasks_count: pendingTasks,
      total_invoiced_amount: invoiced,
      total_payments_received: paid,
      outstanding_amount: Math.max(0, invoiced - paid),
    };
  }

  // Clients
  getClients(): Client[] {
    return this.clients.map((c) => this.enrichClient(c));
  }

  getClientById(id: string): Client | undefined {
    const client = this.clients.find((c) => c.id === id);
    if (!client) return undefined;
    return this.enrichClient(client);
  }

  getNextClientCode(): string {
    const nextNum = this.clients.length + 1;
    const year = new Date().getFullYear();
    return `CLI-${year}-${String(nextNum).padStart(3, "0")}`;
  }

  addClient(
    newClient: Omit<Client, "id" | "client_code" | "created_at" | "updated_at">,
    options?: { skipDefaultProject?: boolean }
  ): Client {
    const client_code = this.getNextClientCode();
    const id = generateId("cli");
    const today = new Date().toISOString().slice(0, 10);
    const trimmedNick = newClient.nick_name?.trim() || "";
    const resolvedFolderName =
      newClient.folder_name?.trim() ||
      (trimmedNick ? `${trimmedNick} ${client_code}` : undefined);

    const client: Client = {
      ...newClient,
      nick_name: trimmedNick || undefined,
      folder_name: resolvedFolderName,
      id,
      client_code,
      contact: newClient.contact ? { ...newClient.contact, client_id: id } : undefined,
      addresses: newClient.addresses?.map((addr) => ({ ...addr, client_id: id })),
      registration: newClient.registration ? { ...newClient.registration, client_id: id } : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      active_services_count: 0,
      total_projects_count: 0,
      completed_projects_count: 0,
      pending_tasks_count: 0,
      total_invoiced_amount: 0,
      total_payments_received: 0,
      outstanding_amount: 0,
    };

    this.clients.unshift(client);
    this.addActivityLog(`Onboarded new client: ${client.client_name}`, "client", id);

    // Enforce Client -> Project -> Task -> Subtask flow even without selected services
    if (!options?.skipDefaultProject) {
      this.addProject({
        project_name: `${client.client_name} — Client Delivery Project`,
        project_type: "Client Project",
        client_id: client.id,
        client_name: client.client_name,
        project_manager_id: client.relationship_manager_id || this.currentUser.id,
        project_manager_name: client.relationship_manager_name || this.currentUser.full_name,
        description: `Primary compliance & delivery project for ${client.client_name}.`,
        priority: "Medium",
        start_date: today,
        due_date: this.addDaysIso(today, 30),
        status: "In Progress",
      });
    }

    this.persist();
    void this.pushClientToSupabase(client);
    return this.enrichClient(client);
  }

  updateClient(id: string, updates: Partial<Client>): Client | null {
    const index = this.clients.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.clients[index] = {
      ...this.clients[index],
      ...updates,
      updated_at: new Date().toISOString()
    };
    this.addActivityLog(`Updated client profile: ${this.clients[index].client_name}`, "client", id);
    this.persist();
    void this.pushClientToSupabase(this.clients[index]);
    return this.enrichClient(this.clients[index]);
  }

  deleteClient(id: string): boolean {
    const target = this.clients.find((c) => c.id === id);
    if (!target) return false;

    const removedProjectIds = new Set(
      this.projects.filter((p) => p.client_id === id).map((p) => p.id)
    );
    const removedTaskIds = new Set(
      this.tasks.filter((t) => removedProjectIds.has(t.project_id)).map((t) => t.id)
    );

    this.clients = this.clients.filter((c) => c.id !== id);
    this.engagements = this.engagements.filter((e) => e.client_id !== id);
    this.projects = this.projects.filter((p) => p.client_id !== id);
    this.tasks = this.tasks.filter((t) => !removedProjectIds.has(t.project_id));
    this.taskComments = this.taskComments.filter((c) => !removedTaskIds.has(c.task_id));
    this.deletedTaskProjectIds = this.deletedTaskProjectIds.filter(
      (pid) => !removedProjectIds.has(pid)
    );
    this.invoices = this.invoices.filter((i) => i.client_id !== id);
    this.payments = this.payments.filter((p) => p.client_id !== id);
    this.documents = this.documents.filter((d) => d.entity_id !== id);

    this.addActivityLog(`Deleted client: ${target.client_name}`, "client", id);
    void this.deleteClientFromSupabase(id);
    return true;
  }

  // Services & Engagements
  getServices(): Service[] {
    return [...this.services];
  }

  addService(service: Omit<Service, "id" | "created_at">): Service {
    const id = generateId("srv");
    const newService: Service = { ...service, id, created_at: new Date().toISOString() };
    this.services.push(newService);
    this.addActivityLog(`Added service to catalog: ${newService.service_name}`, "service", id);
    return newService;
  }

  updateService(id: string, updates: Partial<Omit<Service, "id" | "created_at">>): Service | null {
    const index = this.services.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.services[index] = {
      ...this.services[index],
      ...updates,
    };
    this.addActivityLog(`Updated service catalog entry: ${this.services[index].service_name}`, "service", id);
    return this.services[index];
  }

  deleteService(id: string): boolean {
    const target = this.services.find((s) => s.id === id);
    if (!target) return false;
    this.services = this.services.filter((s) => s.id !== id);
    this.addActivityLog(`Deleted service from catalog: ${target.service_name}`, "service", id);
    return true;
  }

  deleteServiceEngagement(engagementId: string): boolean {
    const target = this.engagements.find((e) => e.id === engagementId);
    if (!target) return false;

    const linkedProjectIds = new Set(
      this.projects
        .filter((p) => p.service_engagement_id === engagementId)
        .map((p) => p.id)
    );
    const linkedTaskIds = new Set(
      this.tasks.filter((t) => linkedProjectIds.has(t.project_id)).map((t) => t.id)
    );

    this.engagements = this.engagements.filter((e) => e.id !== engagementId);
    this.projects = this.projects.filter((p) => p.service_engagement_id !== engagementId);
    this.tasks = this.tasks.filter((t) => !linkedProjectIds.has(t.project_id));
    this.taskComments = this.taskComments.filter((c) => !linkedTaskIds.has(c.task_id));

    this.addActivityLog(
      `Removed service subscription "${target.service_name}" from client ${target.client_name || target.client_id}`,
      "service_engagement",
      engagementId
    );
    return true;
  }

  getEngagementsByClientId(clientId: string): ServiceEngagement[] {
    return this.engagements.filter(e => e.client_id === clientId);
  }

  getAllEngagements(): ServiceEngagement[] {
    return [...this.engagements];
  }

  addServiceEngagement(engagement: Omit<ServiceEngagement, "id" | "created_at">): ServiceEngagement {
    const id = generateId("eng");
    const newEngagement: ServiceEngagement = { ...engagement, id, created_at: new Date().toISOString() };
    this.engagements.push(newEngagement);
    this.addActivityLog(`Contracted service engagement: ${engagement.service_name}`, "service_engagement", id);
    return newEngagement;
  }

  /**
   * Subscribes a client to a service and automatically creates the linked
   * Client -> Project -> Task -> Subtask hierarchy for that service delivery.
   */
  addServiceEngagementCascade(
    engagement: Omit<ServiceEngagement, "id" | "created_at">
  ): { engagement: ServiceEngagement; project: Project; tasks: Task[] } {
    const createdEngagement = this.addServiceEngagement(engagement);
    const matchedService = this.services.find((s) => s.id === engagement.service_id);
    const today = new Date().toISOString().slice(0, 10);
    const startDate = engagement.start_date || today;

    const matchingWorkflow = this.workflows.find(
      (w) =>
        w.is_active &&
        (w.service_id === engagement.service_id ||
          (engagement.service_name && w.service_name === engagement.service_name))
    );
    const tplTasks = matchingWorkflow?.template_tasks || [];
    const maxTemplateEndOffset = tplTasks.reduce((maxD, t) => {
      const tEnd = (t.start_day_offset || 0) + Math.max(1, t.duration_days || 1);
      const subMax = (t.subtasks || []).reduce(
        (m, st) => Math.max(m, (st.start_day_offset ?? t.start_day_offset ?? 0) + Math.max(1, st.duration_days || 1)),
        tEnd
      );
      return Math.max(maxD, subMax);
    }, 0);

    const offsetDays =
      engagement.billing_frequency === "Monthly"
        ? 30
        : engagement.billing_frequency === "Quarterly"
        ? 90
        : engagement.billing_frequency === "Half-yearly"
        ? 180
        : engagement.billing_frequency === "Annually"
        ? 365
        : 15;
    const computedDueDate =
      engagement.end_date ||
      this.addDaysIso(startDate, Math.max(offsetDays, maxTemplateEndOffset));

    const project = this.addProject(
      {
        project_name: `${engagement.client_name || "Client"} — ${engagement.service_name}`,
        project_type: "Client Project",
        client_id: engagement.client_id,
        client_name: engagement.client_name,
        service_engagement_id: createdEngagement.id,
        service_name: engagement.service_name,
        project_manager_id: engagement.relationship_manager_id || this.currentUser.id,
        project_manager_name: engagement.relationship_manager_name || this.currentUser.full_name,
        description:
          matchingWorkflow?.description ||
          matchedService?.description ||
          `Service delivery project for ${engagement.service_name} (${engagement.billing_frequency})`,
        priority: "Medium",
        start_date: startDate,
        due_date: computedDueDate,
        status: "In Progress",
      },
      { skipDefaultTask: true }
    );

    const createdTasks: Task[] = [];
    const stages = matchingWorkflow?.versions?.[0]?.stages || [];

    if (tplTasks.length > 0) {
      tplTasks.forEach((tplTask) => {
        const taskStart = this.addDaysIso(startDate, Math.max(0, tplTask.start_day_offset || 0));
        const taskDue = this.addDaysIso(taskStart, Math.max(0, (tplTask.duration_days || 1) - 1));
        const createdTask = this.addTask({
          title: tplTask.task_name,
          project_id: project.id,
          project_name: project.project_name,
          assigned_employee_id:
            tplTask.assigned_employee_id || engagement.relationship_manager_id || this.currentUser.id,
          assigned_employee_name:
            tplTask.assigned_employee_name ||
            engagement.relationship_manager_name ||
            this.currentUser.full_name,
          priority: tplTask.priority || "Medium",
          start_date: taskStart,
          due_date: taskDue,
          status: tplTask.status || "To Do",
          description: tplTask.description || `Workflow deliverable under ${matchingWorkflow?.workflow_name}.`,
          created_by: this.currentUser.id,
          created_by_name: this.currentUser.full_name,
        });

        (tplTask.subtasks || []).forEach((tplSub) => {
          const subStart = this.addDaysIso(
            startDate,
            Math.max(0, tplSub.start_day_offset ?? tplTask.start_day_offset ?? 0)
          );
          const subDue = this.addDaysIso(subStart, Math.max(0, (tplSub.duration_days || 1) - 1));
          this.addSubtask(createdTask.id, {
            title: tplSub.title,
            description: tplSub.description,
            start_date: subStart,
            due_date: subDue,
            priority: tplSub.priority || tplTask.priority,
            status: tplSub.status || "To Do",
            assigned_employee_id:
              tplSub.assigned_employee_id ||
              tplTask.assigned_employee_id ||
              engagement.relationship_manager_id ||
              this.currentUser.id,
            assigned_employee_name:
              tplSub.assigned_employee_name ||
              tplTask.assigned_employee_name ||
              engagement.relationship_manager_name ||
              this.currentUser.full_name,
          });
        });

        (tplTask.default_comments || []).forEach((cmt) => {
          if (cmt.trim()) {
            this.addTaskComment(createdTask.id, cmt.trim());
          }
        });

        createdTasks.push(this.getTaskById(createdTask.id) || createdTask);
      });
    } else if (stages.length > 0) {
      let runningStart = startDate;
      stages.forEach((stage) => {
        const stageEnd = this.addDaysIso(runningStart, Math.max(1, stage.default_days || 5));
        const stageDue = stageEnd > computedDueDate ? computedDueDate : stageEnd;
        const stageTasks = stage.tasks || [];
        if (stageTasks.length > 0) {
          stageTasks.forEach((stTask) => {
            createdTasks.push(
              this.addTask(
                {
                  title: `${stTask.task_name} (${engagement.client_name || engagement.service_code})`,
                  project_id: project.id,
                  project_name: project.project_name,
                  assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
                  assigned_employee_name:
                    engagement.relationship_manager_name || this.currentUser.full_name,
                  priority: stTask.priority || "Medium",
                  start_date: runningStart,
                  due_date: stageDue,
                  status: "To Do",
                  description: stTask.description || stage.description,
                  created_by: this.currentUser.id,
                  created_by_name: this.currentUser.full_name,
                })
            );
          });
        } else {
          createdTasks.push(
            this.addTask({
              title: `${stage.stage_name} — ${engagement.service_name}`,
              project_id: project.id,
              project_name: project.project_name,
              assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
              assigned_employee_name:
                engagement.relationship_manager_name || this.currentUser.full_name,
              priority: "Medium",
              start_date: runningStart,
              due_date: stageDue,
              status: "To Do",
              description: stage.description,
              created_by: this.currentUser.id,
              created_by_name: this.currentUser.full_name,
            })
          );
        }
        runningStart = stageDue;
      });
    } else {
      createdTasks.push(
        this.addTask({
          title: `${engagement.service_name} — ${engagement.billing_frequency} Execution`,
          project_id: project.id,
          project_name: project.project_name,
          assigned_employee_id: engagement.relationship_manager_id || this.currentUser.id,
          assigned_employee_name:
            engagement.relationship_manager_name || this.currentUser.full_name,
          priority: "Medium",
          start_date: startDate,
          due_date: computedDueDate,
          status: "To Do",
          description: `Auto-generated deliverable task for ${engagement.client_name || "client"} under ${engagement.service_code}.`,
          created_by: this.currentUser.id,
          created_by_name: this.currentUser.full_name,
        })
      );
    }

    return { engagement: createdEngagement, project, tasks: createdTasks };
  }

  // Projects
  getProjects(): Project[] {
    return this.projects.map((p) => ({
      ...p,
      progress_percentage: this.computeProjectProgress(p.id),
      tasks: this.getTasksByProjectId(p.id),
    }));
  }

  getProjectById(id: string): Project | undefined {
    const proj = this.projects.find((p) => p.id === id);
    if (!proj) return undefined;
    return {
      ...proj,
      progress_percentage: this.computeProjectProgress(proj.id),
      tasks: this.getTasksByProjectId(id),
    };
  }

  addProject(
    projectData: Omit<Project, "id" | "project_code" | "progress_percentage" | "created_at" | "updated_at"> & {
      progress_percentage?: number;
    },
    options?: { skipDefaultTask?: boolean }
  ): Project {
    const nextNum = this.projects.length + 1;
    const year = new Date().getFullYear();
    const project_code = `PRJ-${year}-${String(nextNum).padStart(3, "0")}`;
    const id = generateId("proj");
    const today = new Date().toISOString().slice(0, 10);

    const newProject: Project = {
      ...projectData,
      start_date: projectData.start_date || today,
      due_date: projectData.due_date || this.addDaysIso(projectData.start_date || today, 30),
      id,
      project_code,
      progress_percentage: projectData.progress_percentage || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.projects.unshift(newProject);
    this.addActivityLog(`Created project: ${newProject.project_name}`, "project", id);
    if (newProject.project_manager_id) {
      this.addNotification(
        newProject.project_manager_id,
        `New Project Assigned: ${newProject.project_name}`,
        `You have been assigned as Project Manager for ${newProject.project_name}.`,
        "project_created",
        "project",
        id
      );
    }

    if (!options?.skipDefaultTask) {
      this.addTask({
        title: `${newProject.project_name} — Execution Deliverable`,
        project_id: newProject.id,
        project_name: newProject.project_name,
        assigned_employee_id: newProject.project_manager_id || this.currentUser.id,
        assigned_employee_name: newProject.project_manager_name || this.currentUser.full_name,
        priority: newProject.priority || "Medium",
        start_date: newProject.start_date,
        due_date: newProject.due_date,
        status: "To Do",
        description: newProject.description || `Deliverable task for ${newProject.project_name}.`,
        created_by: this.currentUser.id,
        created_by_name: this.currentUser.full_name,
      });
    }

    this.persist();
    return newProject;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) return null;
    this.projects[index] = {
      ...this.projects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.persist();
    return this.projects[index];
  }

  // Customizable Task Statuses (Admin Settings)
  getTaskStatuses(): TaskStatusConfig[] {
    return this.taskStatuses.map((s) => ({ ...s }));
  }

  getTaskStatusNames(): TaskStatus[] {
    return this.taskStatuses.map((s) => s.label);
  }

  getDefaultStatusName(): TaskStatus {
    return this.taskStatuses[0]?.label || "To Do";
  }

  getCompletedStatusName(): TaskStatus {
    return (
      this.taskStatuses.find((s) => s.isCompleted)?.label ||
      this.taskStatuses.find((s) => s.label.toLowerCase() === "completed")?.label ||
      "Completed"
    );
  }

  isCompletedStatus(status?: string): boolean {
    if (!status) return false;
    const norm = status.trim().toLowerCase();
    const cfg = this.taskStatuses.find((s) => s.label.trim().toLowerCase() === norm);
    return Boolean(cfg?.isCompleted || norm === "completed");
  }

  private isCurrentUserAdmin(): boolean {
    return (
      this.currentUser?.role_code === "SUPER_ADMIN" ||
      this.currentUser?.role_code === "ADMIN"
    );
  }

  addTaskStatusConfig(input: {
    label: string;
    color?: TaskStatusColor;
    isCompleted?: boolean;
  }): TaskStatusConfig | null {
    if (!this.isCurrentUserAdmin()) return null;
    const trimmed = input.label.trim();
    if (!trimmed) return null;
    if (this.taskStatuses.some((s) => s.label.trim().toLowerCase() === trimmed.toLowerCase())) {
      return null;
    }
    const created: TaskStatusConfig = {
      id: generateId("st"),
      label: trimmed,
      color: input.color || "slate",
      isCompleted: Boolean(input.isCompleted),
    };
    this.taskStatuses.push(created);
    this.addActivityLog(`Added custom task status: "${created.label}"`, "settings");
    this.persist();
    return { ...created };
  }

  private migrateTaskStatusLabel(oldLabel: string, newLabel: string) {
    const affectedProjectIds = new Set<string>();
    this.tasks.forEach((t) => {
      if (t.status === oldLabel) {
        t.status = newLabel;
        affectedProjectIds.add(t.project_id);
      }
    });
    this.workflows.forEach((wf) => {
      wf.template_tasks?.forEach((pt) => {
        if (pt.status === oldLabel) pt.status = newLabel;
        pt.subtasks?.forEach((st) => {
          if (st.status === oldLabel) st.status = newLabel;
        });
      });
    });
    affectedProjectIds.forEach((pid) => this.refreshProjectProgress(pid));
  }

  updateTaskStatusConfig(
    statusId: string,
    updates: Partial<Pick<TaskStatusConfig, "label" | "color" | "isCompleted">>
  ): TaskStatusConfig | null {
    if (!this.isCurrentUserAdmin()) return null;
    const idx = this.taskStatuses.findIndex((s) => s.id === statusId);
    if (idx === -1) return null;

    const current = this.taskStatuses[idx];
    const nextLabel = updates.label !== undefined ? updates.label.trim() : current.label;
    if (!nextLabel) return null;

    // Reject duplicate label names across other statuses
    if (
      this.taskStatuses.some(
        (s) => s.id !== statusId && s.label.trim().toLowerCase() === nextLabel.toLowerCase()
      )
    ) {
      return null;
    }

    const oldLabel = current.label;
    const updated: TaskStatusConfig = {
      ...current,
      label: nextLabel,
      color: updates.color ?? current.color,
      isCompleted: updates.isCompleted !== undefined ? updates.isCompleted : current.isCompleted,
    };
    this.taskStatuses[idx] = updated;

    // Migrate existing tasks and workflow template tasks if renamed
    if (oldLabel !== nextLabel) {
      this.migrateTaskStatusLabel(oldLabel, nextLabel);
      this.addActivityLog(`Renamed task status "${oldLabel}" → "${nextLabel}"`, "settings");
    } else {
      this.addActivityLog(`Updated task status "${updated.label}"`, "settings");
    }

    this.persist();
    return { ...updated };
  }

  moveTaskStatusConfig(statusId: string, direction: "up" | "down"): boolean {
    if (!this.isCurrentUserAdmin()) return false;
    const idx = this.taskStatuses.findIndex((s) => s.id === statusId);
    if (idx === -1) return false;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= this.taskStatuses.length) return false;

    const copy = [...this.taskStatuses];
    const [moved] = copy.splice(idx, 1);
    copy.splice(swapIdx, 0, moved);
    this.taskStatuses = copy;
    this.persist();
    return true;
  }

  deleteTaskStatusConfig(statusId: string, fallbackStatus?: TaskStatus): boolean {
    if (!this.isCurrentUserAdmin()) return false;
    if (this.taskStatuses.length <= 1) return false;
    const target = this.taskStatuses.find((s) => s.id === statusId);
    if (!target) return false;

    const remaining = this.taskStatuses.filter((s) => s.id !== statusId);
    const replacement = fallbackStatus || remaining[0]?.label || "To Do";
    this.taskStatuses = remaining;

    this.migrateTaskStatusLabel(target.label, replacement);

    this.addActivityLog(
      `Deleted task status "${target.label}" (reassigned to "${replacement}")`,
      "settings"
    );
    this.persist();
    return true;
  }

  resetTaskStatusesToDefault(): void {
    if (!this.isCurrentUserAdmin()) return;
    this.taskStatuses = DEFAULT_TASK_STATUSES.map((s) => ({ ...s }));
    this.addActivityLog("Reset task statuses to defaults", "settings");
    this.persist();
  }

  // Task Categories & Sub-categories
  getTaskCategories(): TaskCategory[] {
    if (!this.taskCategories || this.taskCategories.length === 0) {
      this.taskCategories = DEFAULT_TASK_CATEGORIES.map((c) => ({
        ...c,
        sub_categories: c.sub_categories.map((s) => ({ ...s })),
      }));
    }
    return this.taskCategories;
  }

  getTaskCategoryById(categoryId: string): TaskCategory | undefined {
    return this.getTaskCategories().find((c) => c.id === categoryId);
  }

  addTaskCategory(data: {
    name: string;
    code?: string;
    description?: string;
    color?: string;
    icon?: string;
  }): TaskCategory {
    const id = generateId("cat");
    const code = (data.code || data.name.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newCategory: TaskCategory = {
      id,
      name: data.name.trim(),
      code: code || "CAT",
      description: data.description?.trim() || "",
      color: data.color || "violet",
      icon: data.icon || "Layers",
      created_at: new Date().toISOString(),
      sub_categories: [
        {
          id: generateId("subcat"),
          category_id: id,
          name: "General",
          code: "GEN",
          description: `General task group under ${data.name.trim()}`,
          created_at: new Date().toISOString(),
        },
      ],
    };
    this.taskCategories.push(newCategory);
    this.addActivityLog(`Created task category: ${newCategory.name}`, "task", id);
    this.persist();
    return newCategory;
  }

  updateTaskCategory(id: string, updates: Partial<TaskCategory>): boolean {
    const idx = this.taskCategories.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.taskCategories[idx] = {
      ...this.taskCategories[idx],
      ...updates,
    };
    if (updates.name) {
      this.tasks.forEach((t) => {
        if (t.category_id === id) t.category_name = updates.name;
      });
    }
    this.persist();
    return true;
  }

  deleteTaskCategory(id: string): boolean {
    const cat = this.taskCategories.find((c) => c.id === id);
    if (!cat) return false;
    this.taskCategories = this.taskCategories.filter((c) => c.id !== id);
    this.addActivityLog(`Deleted task category: ${cat.name}`, "task", id);
    this.persist();
    return true;
  }

  addTaskSubCategory(
    categoryId: string,
    data: { name: string; code?: string; description?: string }
  ): TaskSubCategory | undefined {
    const cat = this.taskCategories.find((c) => c.id === categoryId);
    if (!cat) return undefined;
    const subId = generateId("subcat");
    const code = (data.code || data.name.slice(0, 4)).toUpperCase().replace(/[^A-Z0-9]/g, "");
    const newSub: TaskSubCategory = {
      id: subId,
      category_id: categoryId,
      name: data.name.trim(),
      code: code || "SUB",
      description: data.description?.trim() || "",
      created_at: new Date().toISOString(),
    };
    if (!cat.sub_categories) cat.sub_categories = [];
    cat.sub_categories.push(newSub);
    this.addActivityLog(`Added sub-category "${newSub.name}" under ${cat.name}`, "task", subId);
    this.persist();
    return newSub;
  }

  updateTaskSubCategory(
    categoryId: string,
    subCategoryId: string,
    updates: Partial<TaskSubCategory>
  ): boolean {
    const cat = this.taskCategories.find((c) => c.id === categoryId);
    if (!cat || !cat.sub_categories) return false;
    const subIdx = cat.sub_categories.findIndex((s) => s.id === subCategoryId);
    if (subIdx === -1) return false;
    cat.sub_categories[subIdx] = {
      ...cat.sub_categories[subIdx],
      ...updates,
    };
    if (updates.name) {
      this.tasks.forEach((t) => {
        if (t.sub_category_id === subCategoryId) t.sub_category_name = updates.name;
      });
    }
    this.persist();
    return true;
  }

  deleteTaskSubCategory(categoryId: string, subCategoryId: string): boolean {
    const cat = this.taskCategories.find((c) => c.id === categoryId);
    if (!cat || !cat.sub_categories) return false;
    const sub = cat.sub_categories.find((s) => s.id === subCategoryId);
    cat.sub_categories = cat.sub_categories.filter((s) => s.id !== subCategoryId);
    this.addActivityLog(`Deleted sub-category "${sub?.name}" under ${cat.name}`, "task", subCategoryId);
    this.persist();
    return true;
  }

  public ensureTaskCategorized(task: Task): Task {
    if (task.category_id && task.sub_category_id) return task;
    const text = `${task.title} ${task.project_name || ""} ${task.description || ""}`.toLowerCase();
    let catId = "cat-general";
    let subCatId = "subcat-general";
    let catName = "General Practice";
    let subCatName = "General";

    if (text.includes("gst") || text.includes("registration")) {
      catId = "cat-general";
      subCatId = "subcat-gst-reg";
      catName = "General Practice";
      subCatName = "GST Registrations";
    } else if (text.includes("incorp") || text.includes("partnership") || text.includes("company")) {
      catId = "cat-general";
      subCatId = "subcat-company-incorp";
      catName = "General Practice";
      subCatName = "Company Incorporations";
    } else if (
      text.includes("audit") ||
      text.includes("caro") ||
      text.includes("ifc") ||
      text.includes("stock") ||
      text.includes("statutory")
    ) {
      catId = "cat-audit";
      catName = "Audit & Assurance";
      if (text.includes("tax audit") || text.includes("3cd")) {
        subCatId = "subcat-tax-audit";
        subCatName = "Tax Audit (Form 3CD)";
      } else if (text.includes("internal")) {
        subCatId = "subcat-internal-audit";
        subCatName = "Internal & Operations Audit";
      } else {
        subCatId = "subcat-stat-audit";
        subCatName = "Statutory Financial Audit";
      }
    } else if (
      text.includes("roc") ||
      text.includes("mca") ||
      text.includes("director") ||
      text.includes("aoc-4") ||
      text.includes("mgt-7")
    ) {
      catId = "cat-roc";
      catName = "Corporate & Secretarial";
      subCatId = "subcat-roc-annual";
      subCatName = "Annual ROC Filings";
    } else if (
      text.includes("bookkeep") ||
      text.includes("account") ||
      text.includes("ledger") ||
      text.includes("payroll") ||
      text.includes("mis")
    ) {
      catId = "cat-acc";
      catName = "Accounting & Bookkeeping";
      if (text.includes("payroll") || text.includes("salary") || text.includes("epf")) {
        subCatId = "subcat-payroll";
        subCatName = "Payroll, PF & ESI Processing";
      } else {
        subCatId = "subcat-bookkeeping";
        subCatName = "Monthly Bookkeeping & Finalization";
      }
    } else if (
      text.includes("tds") ||
      text.includes("26as") ||
      text.includes("26q") ||
      text.includes("form 16")
    ) {
      catId = "cat-tax";
      subCatId = "subcat-tds";
      catName = "Taxation & Compliance";
      subCatName = "TDS & TCS Returns";
    } else if (
      text.includes("itr") ||
      text.includes("income tax") ||
      text.includes("advance tax")
    ) {
      catId = "cat-tax";
      subCatId = "subcat-income-tax";
      catName = "Taxation & Compliance";
      subCatName = "Direct Tax / Income Tax";
    }

    return {
      ...task,
      category_id: task.category_id || catId,
      category_name: task.category_name || catName,
      sub_category_id: task.sub_category_id || subCatId,
      sub_category_name: task.sub_category_name || subCatName,
    };
  }

  // Tasks, Subtasks & Task Comments
  private enrichTask(task: Task, visited = new Set<string>()): Task {
    if (visited.has(task.id)) {
      return { ...task, subtasks: [] };
    }
    const nextVisited = new Set(visited);
    nextVisited.add(task.id);

    const subtasks = this.tasks
      .filter((st) => st.parent_task_id === task.id)
      .map((st) => this.enrichTask(st, nextVisited));
    const commentsCount = this.taskComments.filter((c) => c.task_id === task.id).length;
    const attachmentsCount = this.documents.filter(
      (d) => d.entity_type === "task" && d.entity_id === task.id
    ).length;

    const categorized = this.ensureTaskCategorized(task);

    return {
      ...categorized,
      subtasks,
      comments_count: commentsCount,
      attachments_count: attachmentsCount,
    };
  }

  getTasks(): Task[] {
    return this.tasks.filter((t) => !t.parent_task_id).map((t) => this.enrichTask(t));
  }

  getAllTasksIncludingSubtasks(): Task[] {
    return this.tasks.map((t) => this.enrichTask(t));
  }

  getTaskById(taskId: string): Task | undefined {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return undefined;
    return this.enrichTask(task);
  }

  getTasksByProjectId(projectId: string): Task[] {
    return this.tasks
      .filter((t) => t.project_id === projectId && !t.parent_task_id)
      .map((t) => this.enrichTask(t));
  }

  getTasksBySubCategory(subCategoryId: string): Task[] {
    return this.getTasks().filter((t) => t.sub_category_id === subCategoryId);
  }

  getTasksByCategory(categoryId: string): Task[] {
    return this.getTasks().filter((t) => t.category_id === categoryId);
  }

  getSubtasks(parentTaskId: string): Task[] {
    return this.tasks
      .filter((t) => t.parent_task_id === parentTaskId)
      .map((t) => this.enrichTask(t));
  }

  addTask(
    taskData: Omit<Task, "id" | "task_code" | "created_at" | "comments_count" | "attachments_count">
  ): Task {
    const topCount = this.tasks.filter((t) => !t.parent_task_id).length + 1;
    const task_code = `TSK-${String(topCount).padStart(3, "0")}`;
    const id = generateId("tsk");
    const today = new Date().toISOString().slice(0, 10);
    const parentProject = this.projects.find((p) => p.id === taskData.project_id);

    const newTask: Task = {
      ...taskData,
      start_date: taskData.start_date || parentProject?.start_date || today,
      due_date: taskData.due_date || parentProject?.due_date || this.addDaysIso(today, 14),
      id,
      task_code,
      created_at: new Date().toISOString(),
      comments_count: 0,
      attachments_count: 0,
    };

    this.tasks.unshift(newTask);

    this.refreshProjectProgress(newTask.project_id);
    this.addActivityLog(`Created task: ${newTask.title}`, "task", id);
    if (newTask.assigned_employee_id) {
      this.addNotification(
        newTask.assigned_employee_id,
        `New Task Assigned: ${newTask.title}`,
        `You have been assigned to task ${newTask.task_code}: "${newTask.title}".`,
        "task_assigned",
        "task",
        id
      );
    }
    this.persist();
    return this.enrichTask(newTask);
  }

  addSubtask(
    parentTaskId: string,
    subtaskData: {
      title: string;
      description?: string;
      assigned_employee_id?: string;
      assigned_employee_name?: string;
      priority?: ProjectPriority;
      start_date?: string;
      due_date?: string;
      status?: TaskStatus;
    }
  ): Task | null {
    const parent = this.tasks.find((t) => t.id === parentTaskId);
    if (!parent) return null;

    const existingCount = this.tasks.filter((t) => t.parent_task_id === parentTaskId).length;
    const today = new Date().toISOString().slice(0, 10);
    const sub: Task = {
      id: generateId("sub"),
      task_code: `${parent.task_code}.${existingCount + 1}`,
      project_id: parent.project_id,
      project_name: parent.project_name,
      parent_task_id: parent.id,
      title: subtaskData.title.trim(),
      description: subtaskData.description || `Subtask for ${parent.task_code}`,
      assigned_employee_id: subtaskData.assigned_employee_id || parent.assigned_employee_id,
      assigned_employee_name:
        subtaskData.assigned_employee_name || parent.assigned_employee_name,
      priority: subtaskData.priority || parent.priority,
      start_date: subtaskData.start_date || parent.start_date || today,
      due_date: subtaskData.due_date || parent.due_date,
      status: subtaskData.status || "To Do",
      created_by: this.currentUser.id,
      created_by_name: this.currentUser.full_name,
      comments_count: 0,
      attachments_count: 0,
      created_at: new Date().toISOString(),
    };

    this.tasks.push(sub);
    this.refreshProjectProgress(parent.project_id);
    this.addActivityLog(`Added subtask "${sub.title}" to ${parent.task_code}`, "task", parent.id);
    this.persist();
    return this.enrichTask(sub);
  }

  updateTask(taskId: string, updates: Partial<Task>): Task | null {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return null;

    const current = this.tasks[index];
    const nextStatus = updates.status ?? current.status;
    this.tasks[index] = {
      ...current,
      ...updates,
      completed_at:
        this.isCompletedStatus(nextStatus)
          ? current.completed_at || new Date().toISOString()
          : updates.status
          ? undefined
          : current.completed_at,
    };

    this.refreshProjectProgress(current.project_id);
    this.addActivityLog(`Updated task ${current.task_code}: ${this.tasks[index].title}`, "task", taskId);
    this.persist();
    return this.enrichTask(this.tasks[index]);
  }

  updateTaskStatus(taskId: string, newStatus: Task["status"]): Task | null {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const oldStatus = task.status;
    task.status = newStatus;
    if (this.isCompletedStatus(newStatus)) {
      task.completed_at = new Date().toISOString();
    } else {
      task.completed_at = undefined;
    }
    this.refreshProjectProgress(task.project_id);
    this.addActivityLog(
      `Changed ${task.parent_task_id ? "subtask" : "task"} ${task.task_code} status from ${oldStatus} to ${newStatus}`,
      "task",
      taskId
    );
    return this.enrichTask(task);
  }

  getTaskComments(taskId: string): TaskComment[] {
    return this.taskComments
      .filter((c) => c.task_id === taskId)
      .map((c) => ({
        ...c,
        read_by: c.read_by
          ? [...c.read_by]
          : [{ employee_id: c.employee_id, employee_name: c.employee_name, read_at: c.created_at }],
      }))
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  getAllTaskComments(): Array<TaskComment & { task_code?: string; task_title?: string; project_name?: string }> {
    return this.taskComments
      .map((c) => {
        const task = this.tasks.find((t) => t.id === c.task_id);
        return {
          ...c,
          read_by: c.read_by
            ? [...c.read_by]
            : [{ employee_id: c.employee_id, employee_name: c.employee_name, read_at: c.created_at }],
          task_code: task?.task_code,
          task_title: task?.title,
          project_name: task?.project_name,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addTaskComment(
    taskId: string,
    commentText: string,
    mentionedEmployeeIds?: string[]
  ): TaskComment | null {
    const task = this.tasks.find((t) => t.id === taskId);
    const trimmed = commentText.trim();
    if (!task || !trimmed) return null;

    // Resolve all @mentioned employees (both explicit IDs and @Full Name matches in text)
    const mentionedSet = new Set<string>(mentionedEmployeeIds || []);
    const lowerText = trimmed.toLowerCase();
    this.employees.forEach((emp) => {
      if (emp.full_name && lowerText.includes(`@${emp.full_name.toLowerCase()}`)) {
        mentionedSet.add(emp.id);
      }
    });
    const resolvedMentions = Array.from(mentionedSet);

    const now = new Date().toISOString();
    const newComment: TaskComment = {
      id: generateId("cmt"),
      task_id: taskId,
      employee_id: this.currentUser.id,
      employee_name: this.currentUser.full_name,
      comment: trimmed,
      read_by: [
        {
          employee_id: this.currentUser.id,
          employee_name: this.currentUser.full_name,
          read_at: now,
        },
      ],
      mentioned_employee_ids: resolvedMentions,
      created_at: now,
    };

    this.taskComments.push(newComment);
    task.comments_count = this.taskComments.filter((c) => c.task_id === taskId).length;

    resolvedMentions.forEach((empId) => {
      if (empId !== this.currentUser.id) {
        this.addNotification(
          empId,
          `Mentioned in ${task.task_code}: ${task.title}`,
          `${this.currentUser.full_name} mentioned you: "${trimmed.slice(0, 80)}"`,
          "task_comment_mention",
          "task",
          taskId
        );
      }
    });

    this.addActivityLog(`Commented on ${task.task_code}: "${trimmed.slice(0, 60)}"`, "task", taskId);
    this.persist();
    return newComment;
  }

  markTaskCommentsRead(taskId: string, reader?: { id: string; full_name: string }): boolean {
    const actor = reader || this.currentUser;
    if (!actor?.id) return false;

    const now = new Date().toISOString();
    let changed = false;

    this.taskComments.forEach((c) => {
      if (c.task_id !== taskId) return;
      if (!c.read_by) {
        c.read_by = [{ employee_id: c.employee_id, employee_name: c.employee_name, read_at: c.created_at }];
      }
      if (!c.read_by.some((r) => r.employee_id === actor.id)) {
        c.read_by.push({
          employee_id: actor.id,
          employee_name: actor.full_name,
          read_at: now,
        });
        changed = true;
      }
    });

    if (changed) {
      this.persist();
    }
    return changed;
  }

  markCommentSeenByUser(commentId: string, reader?: { id: string; full_name: string }): boolean {
    const actor = reader || this.currentUser;
    if (!actor?.id) return false;

    const comment = this.taskComments.find((c) => c.id === commentId);
    if (!comment) return false;

    const now = new Date().toISOString();
    if (!comment.read_by) {
      comment.read_by = [
        { employee_id: comment.employee_id, employee_name: comment.employee_name, read_at: comment.created_at },
      ];
    }

    let changed = false;
    if (!comment.read_by.some((r) => r.employee_id === actor.id)) {
      comment.read_by.push({
        employee_id: actor.id,
        employee_name: actor.full_name,
        read_at: now,
      });
      changed = true;
    }

    this.notifications.forEach((n) => {
      if (
        n.recipient_employee_id === actor.id &&
        n.reference_id === comment.task_id &&
        n.type === "task_comment_mention" &&
        !n.is_read
      ) {
        n.is_read = true;
        n.read_at = now;
        changed = true;
      }
    });

    if (changed) {
      this.persist();
    }
    return changed;
  }

  getUnseenMentionsForUser(employeeId: string) {
    if (!employeeId) return [];
    return this.getAllTaskComments().filter(
      (c) =>
        (c.mentioned_employee_ids || []).includes(employeeId) &&
        c.employee_id !== employeeId &&
        !(c.read_by || []).some((r) => r.employee_id === employeeId)
    );
  }

  getMentionTrackingList() {
    return this.getAllTaskComments()
      .filter((c) => (c.mentioned_employee_ids || []).length > 0)
      .map((c) => {
        const readBy = c.read_by || [];
        const mentionStatuses = (c.mentioned_employee_ids || [])
          .filter((empId) => empId !== c.employee_id)
          .map((empId) => {
            const emp = this.employees.find((e) => e.id === empId);
            const seenRecord = readBy.find((r) => r.employee_id === empId);
            return {
              employee_id: empId,
              employee_name: emp?.full_name || "Team Member",
              seen: Boolean(seenRecord),
              seen_at: seenRecord?.read_at,
            };
          });
        return {
          ...c,
          mentionStatuses,
        };
      })
      .filter((item) => item.mentionStatuses.length > 0);
  }

  toggleCommentReadReceipt(commentId: string, employee: { id: string; full_name: string }): TaskComment | null {
    const comment = this.taskComments.find((c) => c.id === commentId);
    if (!comment) return null;

    if (!comment.read_by) {
      comment.read_by = [
        { employee_id: comment.employee_id, employee_name: comment.employee_name, read_at: comment.created_at },
      ];
    }

    const existingIdx = comment.read_by.findIndex((r) => r.employee_id === employee.id);
    if (existingIdx >= 0) {
      // Employees cannot mark seen messages as unseen; only Admin may adjust read receipts
      if (!this.isCurrentUserAdmin()) {
        return comment;
      }
      comment.read_by.splice(existingIdx, 1);
    } else {
      comment.read_by.push({
        employee_id: employee.id,
        employee_name: employee.full_name,
        read_at: new Date().toISOString(),
      });
    }

    this.persist();
    return comment;
  }

  deleteTask(taskId: string): boolean {
    const target = this.tasks.find((t) => t.id === taskId);
    if (!target) return false;

    const isParent = !target.parent_task_id;
    const removedIds = new Set<string>([taskId]);
    const queue: string[] = [taskId];

    // Recursively collect all nested child subtasks (children, grandchildren, ...)
    while (queue.length > 0) {
      const currId = queue.shift()!;
      this.tasks.forEach((t) => {
        if (t.parent_task_id === currId && !removedIds.has(t.id)) {
          removedIds.add(t.id);
          queue.push(t.id);
        }
      });
    }

    if (isParent && !this.deletedTaskProjectIds.includes(target.project_id)) {
      this.deletedTaskProjectIds.push(target.project_id);
    }

    this.tasks = this.tasks.filter((t) => !removedIds.has(t.id));
    this.taskComments = this.taskComments.filter((c) => !removedIds.has(c.task_id));
    this.documents = this.documents.filter(
      (d) => !(d.entity_type === "task" && d.entity_id && removedIds.has(d.entity_id))
    );
    this.refreshProjectProgress(target.project_id);
    this.addActivityLog(
      `Deleted ${isParent ? "task" : "subtask"} ${target.task_code}: ${target.title}`,
      "task",
      taskId
    );
    return true;
  }

  // Workflows
  getWorkflows(): WorkflowTemplate[] {
    return [...this.workflows];
  }

  getWorkflowById(id: string): WorkflowTemplate | undefined {
    return this.workflows.find(w => w.id === id);
  }

  addWorkflow(wfData: Omit<WorkflowTemplate, "id" | "created_at">): WorkflowTemplate {
    const id = generateId("wf");
    const newWf: WorkflowTemplate = { ...wfData, id, created_at: new Date().toISOString() };
    this.workflows.unshift(newWf);
    this.addActivityLog(`Published workflow template: ${newWf.workflow_name}`, "workflow", id);
    this.persist();
    return newWf;
  }

  updateWorkflow(id: string, updates: Partial<WorkflowTemplate>): WorkflowTemplate | null {
    const index = this.workflows.findIndex((w) => w.id === id);
    if (index === -1) return null;
    this.workflows[index] = {
      ...this.workflows[index],
      ...updates,
    };
    this.addActivityLog(`Updated workflow template: ${this.workflows[index].workflow_name}`, "workflow", id);
    this.persist();
    return this.workflows[index];
  }

  deleteWorkflow(id: string): boolean {
    const target = this.workflows.find((w) => w.id === id);
    if (!target) return false;
    this.workflows = this.workflows.filter((w) => w.id !== id);
    this.addActivityLog(`Deleted workflow template: ${target.workflow_name}`, "workflow", id);
    this.persist();
    return true;
  }

  getNormalizedWorkflowMilestones(wf: WorkflowTemplate): WorkflowMilestoneTemplate[] {
    if (wf.milestones !== undefined) {
      return wf.milestones.map((m, mIdx) => ({
        ...m,
        sequence_number: m.sequence_number || mIdx + 1,
        stages: (m.stages || []).map((s, sIdx) => ({
          ...s,
          sequence_number: s.sequence_number || sIdx + 1,
          sub_stages: (s.sub_stages || []).map((ss, ssIdx) => ({
            ...ss,
            sequence_number: ss.sequence_number || ssIdx + 1,
            tasks: ss.tasks || [],
          })),
        })),
      }));
    }

    const legacyTasks = wf.template_tasks || [];
    if (legacyTasks.length === 0) {
      return [];
    }

    return [
      {
        id: `ms-default-${wf.id}`,
        title: "Milestone 1",
        sequence_number: 1,
        stages: [
          {
            id: `stg-default-${wf.id}`,
            stage_name: "Stage 1",
            sequence_number: 1,
            sub_stages: [
              {
                id: `substg-default-${wf.id}`,
                sub_stage_name: "Sub Stage 1",
                sequence_number: 1,
                tasks: legacyTasks,
              },
            ],
          },
        ],
      },
    ];
  }

  private flattenMilestonesToTemplateTasks(
    milestones: WorkflowMilestoneTemplate[]
  ): WorkflowProjectTaskTemplate[] {
    const result: WorkflowProjectTaskTemplate[] = [];
    let seq = 1;
    milestones.forEach((m) => {
      (m.stages || []).forEach((s) => {
        (s.sub_stages || []).forEach((ss) => {
          (ss.tasks || []).forEach((t) => {
            result.push({ ...t, sequence_number: seq++ });
          });
        });
      });
    });
    return result;
  }

  private saveWorkflowMilestones(
    workflowId: string,
    milestones: WorkflowMilestoneTemplate[],
    logMessage?: string
  ): WorkflowTemplate | null {
    const idx = this.workflows.findIndex((w) => w.id === workflowId);
    if (idx === -1) return null;
    const flattened = this.flattenMilestonesToTemplateTasks(milestones);
    const totalStages = milestones.reduce((sum, m) => sum + (m.stages?.length || 0), 0);
    this.workflows[idx] = {
      ...this.workflows[idx],
      milestones,
      template_tasks: flattened,
      stages_count: totalStages,
    };
    if (logMessage) {
      this.addActivityLog(logMessage, "workflow", workflowId);
    }
    this.persist();
    return this.workflows[idx];
  }

  addWorkflowMilestone(
    workflowId: string,
    input: { title: string; start_date?: string; end_date?: string; description?: string }
  ): WorkflowMilestoneTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !input.title.trim()) return null;
    const milestones = this.getNormalizedWorkflowMilestones(wf);
    const created: WorkflowMilestoneTemplate = {
      id: generateId("ms"),
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      sequence_number: milestones.length + 1,
      start_date: input.start_date || undefined,
      end_date: input.end_date || undefined,
      stages: [],
    };
    this.saveWorkflowMilestones(
      workflowId,
      [...milestones, created],
      `Added milestone "${created.title}" to ${wf.workflow_name}`
    );
    return created;
  }

  updateWorkflowMilestone(
    workflowId: string,
    milestoneId: string,
    updates: Partial<Pick<WorkflowMilestoneTemplate, "title" | "start_date" | "end_date" | "description" | "allocated_client_ids">>
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) =>
      m.id === milestoneId ? { ...m, ...updates } : m
    );
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  setWorkflowMilestoneClients(
    workflowId: string,
    milestoneId: string,
    clientIds: string[]
  ): boolean {
    return this.updateWorkflowMilestone(workflowId, milestoneId, {
      allocated_client_ids: Array.from(new Set(clientIds)),
    });
  }

  deleteWorkflowMilestone(workflowId: string, milestoneId: string): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf)
      .filter((m) => m.id !== milestoneId)
      .map((m, idx) => ({ ...m, sequence_number: idx + 1 }));
    return Boolean(
      this.saveWorkflowMilestones(workflowId, milestones, `Removed milestone from ${wf.workflow_name}`)
    );
  }

  addWorkflowStage(
    workflowId: string,
    milestoneId: string,
    input: { stage_name: string; description?: string }
  ): WorkflowStageTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !input.stage_name.trim()) return null;
    let created: WorkflowStageTemplate | null = null;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      created = {
        id: generateId("stg"),
        stage_name: input.stage_name.trim(),
        description: input.description?.trim() || undefined,
        sequence_number: m.stages.length + 1,
        sub_stages: [],
      };
      return { ...m, stages: [...m.stages, created] };
    });
    if (!created) return null;
    this.saveWorkflowMilestones(workflowId, milestones, `Added stage "${input.stage_name.trim()}"`);
    return created;
  }

  updateWorkflowStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    updates: { stage_name?: string; description?: string }
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) =>
          s.id === stageId
            ? {
                ...s,
                stage_name: updates.stage_name !== undefined ? updates.stage_name.trim() || s.stage_name : s.stage_name,
                description: updates.description !== undefined ? updates.description.trim() || undefined : s.description,
              }
            : s
        ),
      };
    });
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  deleteWorkflowStage(workflowId: string, milestoneId: string, stageId: string): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages
          .filter((s) => s.id !== stageId)
          .map((s, idx) => ({ ...s, sequence_number: idx + 1 })),
      };
    });
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  addWorkflowSubStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    input: { sub_stage_name: string; description?: string }
  ): WorkflowSubStageTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !input.sub_stage_name.trim()) return null;
    let created: WorkflowSubStageTemplate | null = null;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) => {
          if (s.id !== stageId) return s;
          created = {
            id: generateId("substg"),
            sub_stage_name: input.sub_stage_name.trim(),
            description: input.description?.trim() || undefined,
            sequence_number: s.sub_stages.length + 1,
            tasks: [],
          };
          return { ...s, sub_stages: [...s.sub_stages, created] };
        }),
      };
    });
    if (!created) return null;
    this.saveWorkflowMilestones(
      workflowId,
      milestones,
      `Added sub-stage "${input.sub_stage_name.trim()}"`
    );
    return created;
  }

  deleteWorkflowSubStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    subStageId: string
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) => {
          if (s.id !== stageId) return s;
          return {
            ...s,
            sub_stages: s.sub_stages
              .filter((ss) => ss.id !== subStageId)
              .map((ss, idx) => ({ ...ss, sequence_number: idx + 1 })),
          };
        }),
      };
    });
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  addWorkflowTaskInSubStage(
    workflowId: string,
    milestoneId: string,
    stageId: string,
    subStageId: string,
    taskInput: Omit<WorkflowProjectTaskTemplate, "id" | "sequence_number">
  ): WorkflowProjectTaskTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !taskInput.task_name.trim()) return null;
    let created: WorkflowProjectTaskTemplate | null = null;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => {
      if (m.id !== milestoneId) return m;
      return {
        ...m,
        stages: m.stages.map((s) => {
          if (s.id !== stageId) return s;
          return {
            ...s,
            sub_stages: s.sub_stages.map((ss) => {
              if (ss.id !== subStageId) return ss;
              created = {
                ...taskInput,
                id: generateId("wftask"),
                sequence_number: ss.tasks.length + 1,
              };
              return { ...ss, tasks: [...ss.tasks, created] };
            }),
          };
        }),
      };
    });
    if (!created) return null;
    this.saveWorkflowMilestones(
      workflowId,
      milestones,
      `Added workflow task "${taskInput.task_name.trim()}"`
    );
    return created;
  }

  updateWorkflowTaskInHierarchy(
    workflowId: string,
    taskId: string,
    updates: Partial<WorkflowProjectTaskTemplate>
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    let updated = false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => {
            if (t.id !== taskId) return t;
            updated = true;
            return { ...t, ...updates };
          }),
        })),
      })),
    }));
    if (!updated) return false;
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  deleteWorkflowTaskFromHierarchy(workflowId: string, taskId: string): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.filter((t) => t.id !== taskId),
        })),
      })),
    }));
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  private mapSubtasksRecursive(
    subtasks: WorkflowSubtaskTemplate[],
    fn: (sub: WorkflowSubtaskTemplate) => WorkflowSubtaskTemplate | null
  ): WorkflowSubtaskTemplate[] {
    const next: WorkflowSubtaskTemplate[] = [];
    for (const sub of subtasks) {
      const mapped = fn(sub);
      if (!mapped) continue;
      if (mapped.subtasks && mapped.subtasks.length > 0) {
        next.push({
          ...mapped,
          subtasks: this.mapSubtasksRecursive(mapped.subtasks, fn),
        });
      } else {
        next.push(mapped);
      }
    }
    return next;
  }

  addWorkflowSubtaskInHierarchy(
    workflowId: string,
    parentId: string,
    subtaskInput: Omit<WorkflowSubtaskTemplate, "id">
  ): WorkflowSubtaskTemplate | null {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf || !subtaskInput.title.trim()) return null;
    let created: WorkflowSubtaskTemplate | null = null;
    const newSub = (): WorkflowSubtaskTemplate => ({
      ...subtaskInput,
      id: generateId("wfsub"),
    });
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => {
            if (t.id === parentId) {
              created = newSub();
              return { ...t, subtasks: [...(t.subtasks || []), created] };
            }
            return {
              ...t,
              subtasks: this.mapSubtasksRecursive(t.subtasks || [], (sub) => {
                if (sub.id !== parentId) return sub;
                created = newSub();
                return { ...sub, subtasks: [...(sub.subtasks || []), created] };
              }),
            };
          }),
        })),
      })),
    }));
    if (!created) return null;
    this.saveWorkflowMilestones(workflowId, milestones);
    return created;
  }

  updateWorkflowSubtaskInHierarchy(
    workflowId: string,
    subtaskId: string,
    updates: Partial<WorkflowSubtaskTemplate>
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    let updated = false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => ({
            ...t,
            subtasks: this.mapSubtasksRecursive(t.subtasks || [], (sub) => {
              if (sub.id !== subtaskId) return sub;
              updated = true;
              return { ...sub, ...updates };
            }),
          })),
        })),
      })),
    }));
    if (!updated) return false;
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  deleteWorkflowSubtaskFromHierarchy(
    workflowId: string,
    _taskId: string,
    subtaskId: string
  ): boolean {
    const wf = this.workflows.find((w) => w.id === workflowId);
    if (!wf) return false;
    const milestones = this.getNormalizedWorkflowMilestones(wf).map((m) => ({
      ...m,
      stages: m.stages.map((s) => ({
        ...s,
        sub_stages: s.sub_stages.map((ss) => ({
          ...ss,
          tasks: ss.tasks.map((t) => ({
            ...t,
            subtasks: this.mapSubtasksRecursive(t.subtasks || [], (sub) =>
              sub.id === subtaskId ? null : sub
            ),
          })),
        })),
      })),
    }));
    return Boolean(this.saveWorkflowMilestones(workflowId, milestones));
  }

  /**
   * Ensures every client engagement / project matching this workflow's service
   * has tasks generated for every template task in workflow.template_tasks.
   */
  syncWorkflowTasksToSubscribedClients(workflowId: string): {
    updatedProjects: number;
    createdTasks: number;
  } {
    const wf = this.workflows.find((w) => w.id === workflowId);
    const tplTasks = wf?.template_tasks || [];
    if (!wf || tplTasks.length === 0) {
      return { updatedProjects: 0, createdTasks: 0 };
    }

    const serviceNameLower = (wf.service_name || "").trim().toLowerCase();
    const matchingEngagements = this.engagements.filter(
      (e) =>
        e.status === "Active" &&
        ((wf.service_id && e.service_id === wf.service_id) ||
          (serviceNameLower && (e.service_name || "").trim().toLowerCase() === serviceNameLower))
    );

    const candidateProjectIds = new Set<string>();
    matchingEngagements.forEach((eng) => {
      let proj = this.projects.find(
        (p) =>
          p.service_engagement_id === eng.id ||
          (p.client_id === eng.client_id &&
            (p.service_name || "").trim().toLowerCase() === (eng.service_name || "").trim().toLowerCase())
      );
      if (!proj) {
        const startDate = eng.start_date || new Date().toISOString().slice(0, 10);
        const dueDate = eng.end_date || this.addDaysIso(startDate, 30);
        proj = this.addProject(
          {
            project_name: `${eng.client_name || "Client"} — ${eng.service_name}`,
            project_type: "Client Project",
            client_id: eng.client_id,
            client_name: eng.client_name,
            service_engagement_id: eng.id,
            service_name: eng.service_name,
            project_manager_id: eng.relationship_manager_id || this.currentUser.id,
            project_manager_name: eng.relationship_manager_name || this.currentUser.full_name,
            description: wf.description || `Service delivery project for ${eng.service_name}`,
            priority: "Medium",
            start_date: startDate,
            due_date: dueDate,
            status: "In Progress",
          },
          { skipDefaultTask: true }
        );
      }
      candidateProjectIds.add(proj.id);
    });

    // Also include standalone client projects tagged with this workflow's service name
    if (serviceNameLower) {
      this.projects.forEach((p) => {
        if ((p.service_name || "").trim().toLowerCase() === serviceNameLower) {
          candidateProjectIds.add(p.id);
        }
      });
    }

    let updatedProjects = 0;
    let createdTasks = 0;

    candidateProjectIds.forEach((projectId) => {
      const proj = this.projects.find((p) => p.id === projectId);
      if (!proj) return;

      const existingTopTasks = this.tasks.filter(
        (t) => t.project_id === projectId && !t.parent_task_id
      );
      const existingTitles = new Set(
        existingTopTasks.map((t) => t.title.trim().toLowerCase())
      );

      let addedHere = 0;
      const baseStart = proj.start_date || new Date().toISOString().slice(0, 10);
      const milestones = this.getNormalizedWorkflowMilestones(wf);

      milestones.forEach((ms) => {
        (ms.stages || []).forEach((stg) => {
          (stg.sub_stages || []).forEach((subStg) => {
            (subStg.tasks || []).forEach((tplTask) => {
              if (existingTitles.has(tplTask.task_name.trim().toLowerCase())) return;

              const taskStart = this.addDaysIso(
                ms.start_date || baseStart,
                Math.max(0, (tplTask.start_day_offset || 1) - 1)
              );
              const taskDue = this.addDaysIso(
                taskStart,
                Math.max(0, (tplTask.duration_days || 1) - 1)
              );
              const createdTask = this.addTask({
                title: tplTask.task_name,
                project_id: proj.id,
                project_name: proj.project_name,
                milestone_id: ms.id,
                milestone_title: ms.title,
                stage_id: stg.id,
                stage_title: stg.stage_name,
                sub_stage_id: subStg.id,
                sub_stage_title: subStg.sub_stage_name,
                assigned_employee_id:
                  tplTask.assigned_employee_id || proj.project_manager_id || this.currentUser.id,
                assigned_employee_name:
                  tplTask.assigned_employee_name ||
                  proj.project_manager_name ||
                  this.currentUser.full_name,
                priority: tplTask.priority || "Medium",
                start_date: taskStart,
                due_date: taskDue,
                status: tplTask.status || "To Do",
                description:
                  tplTask.description ||
                  `Workflow deliverable under ${wf.workflow_name} (${ms.title} → ${stg.stage_name} → ${subStg.sub_stage_name}).`,
                created_by: this.currentUser.id,
                created_by_name: this.currentUser.full_name,
              });

              (tplTask.subtasks || []).forEach((tplSub) => {
                const subStart = this.addDaysIso(
                  ms.start_date || baseStart,
                  Math.max(0, (tplSub.start_day_offset ?? tplTask.start_day_offset ?? 1) - 1)
                );
                const subDue = this.addDaysIso(
                  subStart,
                  Math.max(0, (tplSub.duration_days || 1) - 1)
                );
                this.addSubtask(createdTask.id, {
                  title: tplSub.title,
                  description: tplSub.description,
                  start_date: subStart,
                  due_date: subDue,
                  priority: tplSub.priority || tplTask.priority,
                  status: tplSub.status || "To Do",
                  assigned_employee_id:
                    tplSub.assigned_employee_id ||
                    tplTask.assigned_employee_id ||
                    proj.project_manager_id ||
                    this.currentUser.id,
                  assigned_employee_name:
                    tplSub.assigned_employee_name ||
                    tplTask.assigned_employee_name ||
                    proj.project_manager_name ||
                    this.currentUser.full_name,
                });
              });

              (tplTask.default_comments || []).forEach((cmt) => {
                if (cmt.trim()) {
                  this.addTaskComment(createdTask.id, cmt.trim());
                }
              });

              addedHere += 1;
              createdTasks += 1;
            });
          });
        });
      });

      if (addedHere > 0) {
        updatedProjects += 1;
      }
    });

    if (createdTasks > 0) {
      this.persist();
    }
    return { updatedProjects, createdTasks };
  }

  // Invoices & Financials
  getInvoices(): Invoice[] {
    return [...this.invoices];
  }

  getInvoiceById(id: string): Invoice | undefined {
    return this.invoices.find(i => i.id === id);
  }

  addInvoice(
    invoiceData: Omit<Invoice, "id" | "invoice_number" | "paid_amount" | "outstanding_balance" | "created_at"> & {
      invoice_number?: string;
      initial_paid_amount?: number;
      payment_mode?: PaymentMode;
      transaction_reference?: string;
    }
  ): Invoice {
    const {
      invoice_number: providedNumber,
      initial_paid_amount,
      payment_mode,
      transaction_reference,
      ...restInvoiceData
    } = invoiceData;

    const fy = restInvoiceData.financial_year || "2026-27";
    const nextSeq = 754 + this.invoices.length;
    const invoice_number = (providedNumber || "").trim() || `LMA/${fy}/${String(nextSeq).padStart(4, "0")}`;
    const id = `inv-${Date.now()}`;
    const tdsAmount = Number(restInvoiceData.tds_amount || 0);
    const netPayable = restInvoiceData.net_payable ?? Math.max(0, restInvoiceData.grand_total - tdsAmount);

    const newInvoice: Invoice = {
      ...restInvoiceData,
      id,
      invoice_number,
      tds_amount: tdsAmount,
      net_payable: netPayable,
      paid_amount: 0,
      outstanding_balance: netPayable,
      status: restInvoiceData.status || "Finalized",
      created_at: new Date().toISOString()
    };

    this.invoices.unshift(newInvoice);
    this.addActivityLog(
      `Created invoice ${invoice_number} for ₹${netPayable.toLocaleString("en-IN")}`,
      "invoice",
      id
    );

    const paidInit = Math.max(0, Math.min(Number(initial_paid_amount || 0), netPayable));
    if (paidInit > 0) {
      this.recordPayment({
        client_id: newInvoice.client_id,
        client_name: newInvoice.client_name || newInvoice.client_legal_name,
        invoice_id: newInvoice.id,
        invoice_number: newInvoice.invoice_number,
        service_engagement_id: newInvoice.service_engagement_id,
        payment_date: newInvoice.invoice_date,
        amount: paidInit,
        payment_mode: payment_mode || "Bank Transfer",
        transaction_reference: transaction_reference || "",
        received_by: this.currentUser?.id,
        received_by_name: this.currentUser?.full_name || "System Administrator",
        remarks: `Initial payment recorded at invoice creation (${newInvoice.invoice_number})`,
        status: "Completed"
      });
    }

    return newInvoice;
  }

  finalizeInvoice(invoiceId: string): Invoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status !== "Draft") return null;
    inv.status = "Finalized";
    inv.finalized_at = new Date().toISOString();
    this.addActivityLog(`Finalized invoice ${inv.invoice_number}`, "invoice", invoiceId);
    return inv;
  }

  cancelInvoice(invoiceId: string, reason: string): Invoice | null {
    const inv = this.invoices.find(i => i.id === invoiceId);
    if (!inv || inv.status === "Cancelled") return null;
    inv.status = "Cancelled";
    inv.cancelled_at = new Date().toISOString();
    inv.cancel_reason = reason;
    this.addActivityLog(`Cancelled invoice ${inv.invoice_number}. Reason: ${reason}`, "invoice", invoiceId);
    return inv;
  }

  // Payments
  getPayments(): Payment[] {
    return [...this.payments];
  }

  recordPayment(paymentData: Omit<Payment, "id" | "payment_number" | "created_at">): Payment {
    const nextNum = this.payments.length + 1;
    const year = new Date().getFullYear();
    const payment_number = `PAY/${year}/${String(nextNum).padStart(5, "0")}`;
    const id = `pay-${Date.now()}`;

    const newPayment: Payment = {
      ...paymentData,
      id,
      payment_number,
      status: "Completed",
      created_at: new Date().toISOString()
    };

    this.payments.unshift(newPayment);

    // If allocated to an invoice, recalculate outstanding balance automatically
    if (newPayment.invoice_id) {
      const inv = this.invoices.find(i => i.id === newPayment.invoice_id);
      if (inv) {
        const payableTotal = inv.net_payable ?? inv.grand_total;
        inv.paid_amount = Math.min(payableTotal, inv.paid_amount + newPayment.amount);
        inv.outstanding_balance = Math.max(0, payableTotal - inv.paid_amount);
        if (inv.outstanding_balance <= 0.01) {
          inv.outstanding_balance = 0;
          inv.status = "Paid";
        } else if (inv.paid_amount > 0) {
          inv.status = "Partially Paid";
        }
      }
    }

    this.addActivityLog(`Recorded payment ${payment_number} of ₹${newPayment.amount} via ${newPayment.payment_mode}`, "payment", id);
    this.addNotification(
      this.currentUser.id,
      `Payment Received: ₹${newPayment.amount.toLocaleString("en-IN")}`,
      `Payment ${payment_number} from ${newPayment.client_name || "Client"} recorded.`,
      "payment_received",
      "payment",
      id
    );

    return newPayment;
  }

  // Employees & Staff Directory
  getEmployees(): Employee[] {
    return [...this.employees];
  }

  getEmployeeById(id: string): Employee | undefined {
    return this.employees.find(e => e.id === id);
  }

  addEmployee(empData: Omit<Employee, "id" | "employee_code" | "created_at">): Employee {
    const nextNum = this.employees.length + 1;
    const employee_code = `EMP-${String(nextNum).padStart(3, "0")}`;
    const id = `emp-${Date.now()}`;

    const newEmployee: Employee = {
      ...empData,
      id,
      employee_code,
      created_at: new Date().toISOString()
    };

    if (newEmployee.team_id) {
      const team = this.teams.find((t) => t.id === newEmployee.team_id);
      if (team) {
        newEmployee.team_name = team.name;
        const members = team.members ? [...team.members] : [];
        members.push({
          id: `tm-${Date.now()}`,
          team_id: team.id,
          employee_id: newEmployee.id,
          employee_name: newEmployee.full_name,
          designation: newEmployee.designation_name,
          role_in_team: newEmployee.role_code || "Member",
          is_active: true,
          joined_at: newEmployee.created_at,
        });
        team.members = members;
        team.member_count = members.length;
      }
    }

    this.employees.push(newEmployee);
    this.addActivityLog(`Onboarded new employee: ${newEmployee.full_name}`, "employee", id);
    this.persist();
    return newEmployee;
  }

  /** Super Admin exclusive: create a new Admin account in the directory. */
  createAdminUser(input: {
    first_name: string;
    last_name: string;
    email: string;
    mobile_number?: string;
    designation_name?: string;
  }): { ok: boolean; employee?: Employee; error?: string } {
    if (this.currentUser?.role_code !== "SUPER_ADMIN") {
      return { ok: false, error: "Only Super Admin can create Admin accounts." };
    }
    const normalizedEmail = input.email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return { ok: false, error: "Enter a valid official email address." };
    }
    if (
      this.employees.some(
        (e) => (e.email || "").trim().toLowerCase() === normalizedEmail
      )
    ) {
      return {
        ok: false,
        error: "An account with this email already exists. Promote the existing user instead.",
      };
    }

    const first = input.first_name.trim();
    const last = input.last_name.trim();
    if (!first) {
      return { ok: false, error: "First name is required." };
    }

    const fullName = [first, last].filter(Boolean).join(" ");
    const created = this.addEmployee({
      first_name: first,
      last_name: last || "",
      full_name: fullName,
      email: normalizedEmail,
      mobile_number: input.mobile_number?.trim() || "—",
      designation_name: input.designation_name?.trim() || "Practice Admin",
      joining_date: new Date().toISOString().slice(0, 10),
      employment_status: "Active",
      is_active: true,
      role_code: "ADMIN",
      assigned_projects_count: 0,
      assigned_tasks_count: 0,
      completed_tasks_count: 0,
    });
    this.addActivityLog(
      `Created Admin account: ${created.full_name} (${created.email})`,
      "admin",
      created.id
    );
    this.persist();
    this.notify();
    return { ok: true, employee: created };
  }

  /** Super Admin exclusive: promote an employee to ADMIN or demote an ADMIN to another role. */
  updateEmployeeRole(
    employeeId: string,
    roleCode: RoleCode
  ): { ok: boolean; error?: string } {
    if (this.currentUser?.role_code !== "SUPER_ADMIN") {
      return { ok: false, error: "Only Super Admin can manage Admin roles." };
    }
    const idx = this.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) {
      return { ok: false, error: "Employee not found." };
    }
    const target = this.employees[idx];
    if (isSuperAdminEmail(target.email) || target.role_code === "SUPER_ADMIN") {
      return { ok: false, error: "Primary Super Admin role cannot be modified." };
    }
    if (roleCode === "SUPER_ADMIN") {
      return { ok: false, error: "Only the configured Super Admin holds SUPER_ADMIN." };
    }

    const previousRole = target.role_code || "EMPLOYEE";
    const updated: Employee = {
      ...target,
      role_code: roleCode,
      designation_name:
        roleCode === "ADMIN" && !target.designation_name
          ? "Practice Admin"
          : target.designation_name,
    };
    this.employees[idx] = updated;
    this.addActivityLog(
      `Changed role for ${updated.full_name} (${previousRole} → ${roleCode})`,
      "admin",
      updated.id
    );
    this.persist();
    this.notify();
    return { ok: true };
  }

  /** Activate or suspend an employee/admin account. Only Super Admin may toggle ADMIN accounts. */
  setEmployeeActiveStatus(
    employeeId: string,
    isActive: boolean
  ): { ok: boolean; error?: string } {
    if (!this.isCurrentUserAdmin()) {
      return { ok: false, error: "Unauthorized." };
    }
    const idx = this.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) {
      return { ok: false, error: "User not found." };
    }
    const target = this.employees[idx];
    if (isSuperAdminEmail(target.email) || target.role_code === "SUPER_ADMIN") {
      return { ok: false, error: "Super Admin account cannot be deactivated." };
    }
    if (target.role_code === "ADMIN" && this.currentUser?.role_code !== "SUPER_ADMIN") {
      return { ok: false, error: "Only Super Admin can activate or suspend Admin accounts." };
    }

    const updated: Employee = {
      ...target,
      is_active: isActive,
      employment_status: isActive ? "Active" : "Inactive",
    };
    this.employees[idx] = updated;
    this.addActivityLog(
      `${isActive ? "Activated" : "Suspended"} ${updated.role_code === "ADMIN" ? "Admin" : "Employee"} account: ${updated.full_name}`,
      "admin",
      updated.id
    );
    this.persist();
    this.notify();
    return { ok: true };
  }

  // Teams
  getTeams(): Team[] {
    return [...this.teams];
  }

  addTeam(teamData: Omit<Team, "id">): Team {
    const id = `team-${Date.now()}`;
    const newTeam: Team = { ...teamData, id, members: [] };
    this.teams.push(newTeam);
    this.addActivityLog(`Created team: ${newTeam.name}`, "team", id);
    return newTeam;
  }

  // Documents (Cloudflare R2 Metadata)
  getDocuments(): FileObject[] {
    return [...this.documents];
  }

  getDocumentsByEntity(entityType: string, entityId: string): FileObject[] {
    return this.documents.filter((d) => d.entity_type === entityType && d.entity_id === entityId);
  }

  addDocument(docData: Omit<FileObject, "id" | "created_at">): FileObject {
    const id = generateId("doc");
    const newDoc: FileObject = { ...docData, id, created_at: new Date().toISOString() };
    this.documents.unshift(newDoc);
    this.addActivityLog(`Uploaded document: ${newDoc.file_name}`, "document", id);
    return newDoc;
  }

  deleteDocument(docId: string): boolean {
    const target = this.documents.find((d) => d.id === docId);
    if (!target) return false;
    this.documents = this.documents.filter((d) => d.id !== docId);
    this.addActivityLog(`Removed document: ${target.file_name}`, "document", docId);
    return true;
  }

  // Notifications
  getNotifications(): Notification[] {
    return [...this.notifications];
  }

  markNotificationAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      this.persist();
    }
  }

  addNotification(
    recipientEmployeeId: string,
    title: string,
    message: string,
    type: Notification["type"],
    referenceType?: string,
    referenceId?: string
  ) {
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recipient_employee_id: recipientEmployeeId,
      title,
      message,
      type,
      reference_type: referenceType,
      reference_id: referenceId,
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(newNotif);
    this.persist();
  }

  // Activity Logs
  getActivityLogs(): ActivityLog[] {
    return [...this.activityLogs];
  }

  addActivityLog(action: string, entityType: string, entityId?: string, details?: Record<string, any>) {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}`,
      employee_id: this.currentUser?.id,
      employee_name: this.currentUser?.full_name || "System",
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString()
    };
    this.activityLogs.unshift(newLog);
    this.persist();
  }

  // Geo-Fenced Attendance Engine
  getOfficeGeoConfig(): OfficeGeoConfig | null {
    return this.officeGeoConfig ? { ...this.officeGeoConfig } : null;
  }

  setOfficeGeoConfig(
    config: Omit<OfficeGeoConfig, "updated_at" | "updated_by_name">
  ): OfficeGeoConfig {
    const nextConfig: OfficeGeoConfig = {
      location_name: config.location_name.trim() || "Head Office",
      address: config.address?.trim() || "",
      latitude: Number(config.latitude),
      longitude: Number(config.longitude),
      radius_meters: Math.max(10, Number(config.radius_meters) || 50),
      updated_at: new Date().toISOString(),
      updated_by_name: this.currentUser?.full_name || "System Administrator",
    };
    this.officeGeoConfig = nextConfig;
    this.addActivityLog(
      `Configured Geo-Attendance Location "${nextConfig.location_name}" (${nextConfig.latitude.toFixed(6)}, ${nextConfig.longitude.toFixed(6)}) within ±${nextConfig.radius_meters}m`,
      "attendance"
    );
    return nextConfig;
  }

  getAttendanceRecords(date?: string): AttendanceRecord[] {
    const list = date
      ? this.attendanceRecords.filter((r) => r.date === date)
      : [...this.attendanceRecords];
    return list.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  markAttendanceByGeo(params: {
    employee_id: string;
    latitude: number;
    longitude: number;
    accuracy_meters?: number;
    action?: "check-in" | "check-out";
  }): {
    matched: boolean;
    distanceMeters: number;
    radiusMeters: number;
    record?: AttendanceRecord;
    error?: string;
  } {
    const config = this.officeGeoConfig;
    if (!config) {
      return {
        matched: false,
        distanceMeters: 0,
        radiusMeters: 50,
        error: "Admin has not configured the office geo-location yet.",
      };
    }

    const emp = this.employees.find((e) => e.id === params.employee_id);
    if (!emp) {
      return {
        matched: false,
        distanceMeters: 0,
        radiusMeters: config.radius_meters || 50,
        error: "Employee record not found.",
      };
    }

    const radiusMeters = config.radius_meters || 50;
    const rawDistance = calculateDistanceMeters(
      params.latitude,
      params.longitude,
      config.latitude,
      config.longitude
    );
    const distanceMeters = Math.round(rawDistance);
    const matched = distanceMeters <= radiusMeters;
    const today = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();

    if (!matched) {
      const attempt: AttendanceRecord = {
        id: generateId("att"),
        employee_id: emp.id,
        employee_name: emp.full_name,
        employee_code: emp.employee_code,
        date: today,
        check_in_at: nowIso,
        latitude: params.latitude,
        longitude: params.longitude,
        accuracy_meters: params.accuracy_meters ? Math.round(params.accuracy_meters) : undefined,
        distance_meters: distanceMeters,
        allowed_radius_meters: radiusMeters,
        status: "Out of Range",
        matched: false,
        location_name: config.location_name,
        created_at: nowIso,
      };
      this.attendanceRecords.unshift(attempt);
      this.addActivityLog(
        `Out-of-range attendance attempt by ${emp.full_name} (${distanceMeters}m away; limit ±${radiusMeters}m)`,
        "attendance",
        attempt.id
      );
      return {
        matched: false,
        distanceMeters,
        radiusMeters,
        record: attempt,
        error: `Location mismatch: ${distanceMeters}m away from ${config.location_name} (must be within ±${radiusMeters}m).`,
      };
    }

    if (params.action === "check-out") {
      const existingPresent = this.attendanceRecords.find(
        (r) => r.employee_id === emp.id && r.date === today && r.matched && r.status === "Present"
      );
      if (existingPresent) {
        existingPresent.check_out_at = nowIso;
        existingPresent.status = "Checked Out";
        existingPresent.distance_meters = distanceMeters;
        this.addActivityLog(
          `${emp.full_name} checked out (${distanceMeters}m from ${config.location_name})`,
          "attendance",
          existingPresent.id
        );
        return {
          matched: true,
          distanceMeters,
          radiusMeters,
          record: existingPresent,
        };
      }
    }

    const alreadyCheckedIn = this.attendanceRecords.find(
      (r) =>
        r.employee_id === emp.id &&
        r.date === today &&
        r.matched &&
        (r.status === "Present" || r.status === "Checked Out")
    );
    if (alreadyCheckedIn) {
      return {
        matched: true,
        distanceMeters,
        radiusMeters,
        record: alreadyCheckedIn,
      };
    }

    const record: AttendanceRecord = {
      id: generateId("att"),
      employee_id: emp.id,
      employee_name: emp.full_name,
      employee_code: emp.employee_code,
      date: today,
      check_in_at: nowIso,
      latitude: params.latitude,
      longitude: params.longitude,
      accuracy_meters: params.accuracy_meters ? Math.round(params.accuracy_meters) : undefined,
      distance_meters: distanceMeters,
      allowed_radius_meters: radiusMeters,
      status: "Present",
      matched: true,
      location_name: config.location_name,
      created_at: nowIso,
    };

    this.attendanceRecords.unshift(record);
    this.addActivityLog(
      `Marked Present for ${emp.full_name} via Geo-Attendance (${distanceMeters}m from ${config.location_name})`,
      "attendance",
      record.id
    );
    return {
      matched: true,
      distanceMeters,
      radiusMeters,
      record,
    };
  }
}

// Global Singleton Instance
export const pmsStore = new PMSDataStore();
