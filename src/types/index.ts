// ============================================================================
// PROFESSIONAL SERVICE MANAGEMENT SYSTEM (PMS) — TYPES
// ============================================================================

export type RoleCode = 
  | 'SUPER_ADMIN' 
  | 'ADMIN'
  | 'DIRECTOR' 
  | 'HEAD' 
  | 'SUPERVISOR' 
  | 'EMPLOYEE' 
  | 'TRAINEE';

export interface Role {
  id: string;
  name: string;
  code: RoleCode;
  description: string;
  hierarchy_level: number;
  is_system: boolean;
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  code: string;
  description: string;
}

export interface Designation {
  id: string;
  title: string;
  code: string;
  level: number;
  description?: string;
}

export interface Employee {
  id: string;
  employee_code: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile_number: string;
  father_name?: string;
  date_of_birth?: string;
  designation_id?: string;
  designation_name?: string;
  supervisor_id?: string;
  supervisor_name?: string;
  team_id?: string;
  team_name?: string;
  joining_date: string;
  employment_status: 'Active' | 'Inactive' | 'Probation' | 'Notice Period' | 'Terminated';
  is_active: boolean;
  role_code?: RoleCode;
  assigned_projects_count?: number;
  assigned_tasks_count?: number;
  completed_tasks_count?: number;
  created_at: string;
}

export interface EmployeePrivateDetails {
  id: string;
  employee_id: string;
  bank_name: string;
  account_type: 'Savings' | 'Current' | 'Salary';
  account_number: string;
  ifsc_code: string;
  account_holder_name: string;
  aadhaar_number?: string;
  remarks?: string;
}

export interface Team {
  id: string;
  name: string;
  supervisor_id?: string;
  supervisor_name?: string;
  description?: string;
  status: 'Active' | 'Inactive';
  members?: TeamMember[];
  member_count?: number;
}

export interface TeamMember {
  id: string;
  team_id: string;
  employee_id: string;
  employee_name: string;
  designation?: string;
  role_in_team: string;
  is_active: boolean;
  joined_at: string;
}

export type ClientConstitution = 
  | 'Proprietorship' 
  | 'Partnership' 
  | 'LLP' 
  | 'Private Limited' 
  | 'Public Limited' 
  | 'Individual' 
  | 'Trust' 
  | 'Society' 
  | 'HUF' 
  | 'Other';

export type ClientStatus = 'Active' | 'Inactive' | 'On Hold' | 'Archived';

export interface Client {
  id: string;
  client_code: string;
  client_name: string;
  legal_name: string;
  nick_name?: string;
  folder_name?: string;
  reference_name?: string;
  constitution: ClientConstitution;
  category?: string;
  nature_of_income?: string;
  remarks?: string;
  relationship_manager_id?: string;
  relationship_manager_name?: string;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
  
  // Section B Contact
  contact?: ClientContact;
  // Section B Addresses
  addresses?: ClientAddress[];
  // Section C Registrations
  registration?: ClientRegistration;
  // Bank accounts
  bank_accounts?: ClientBankAccount[];

  // Aggregated Stats
  active_services_count?: number;
  total_projects_count?: number;
  completed_projects_count?: number;
  pending_tasks_count?: number;
  total_invoiced_amount?: number;
  total_payments_received?: number;
  outstanding_amount?: number;
}

export interface ClientContact {
  id: string;
  client_id: string;
  contact_person: string;
  designation?: string;
  mobile_number: string;
  email: string;
  is_primary: boolean;
}

export interface ClientAddress {
  id: string;
  client_id: string;
  address_type: 'Registered' | 'Communication' | 'Branch' | 'Factory';
  street_address: string;
  city: string;
  state: string;
  pin_code: string;
  country: string;
  is_primary: boolean;
}

export interface ClientRegistration {
  id: string;
  client_id: string;
  pan: string;
  gstin?: string;
  cin?: string;
  dob_or_doi?: string;
  additional_registrations?: Array<{ type: string; value: string }>;
}

export interface ClientBankAccount {
  id: string;
  client_id: string;
  bank_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  is_primary: boolean;
}

export interface Service {
  id: string;
  service_code: string;
  service_name: string;
  description: string;
  default_fee: number;
  default_gst_rate: number;
  billing_type: 'One-time' | 'Recurring';
  status: 'Active' | 'Inactive';
  created_at: string;
}

export type BillingFrequency = 'One-time' | 'Monthly' | 'Quarterly' | 'Half-yearly' | 'Annually' | 'Custom';
export type EngagementStatus = 'Active' | 'Completed' | 'Paused' | 'Terminated';

export interface ServiceEngagement {
  id: string;
  client_id: string;
  client_name?: string;
  service_id: string;
  service_name?: string;
  service_code?: string;
  agreed_fee: number;
  gst_rate: number;
  billing_frequency: BillingFrequency;
  payment_terms: string;
  relationship_manager_id?: string;
  relationship_manager_name?: string;
  start_date: string;
  end_date?: string;
  status: EngagementStatus;
  remarks?: string;
  created_at: string;
  fee_revisions?: ServiceFeeRecord[];
}

export interface ServiceFeeRecord {
  id: string;
  engagement_id: string;
  old_fee: number;
  new_fee: number;
  effective_from: string;
  reason: string;
  revised_by_name?: string;
  created_at: string;
}

export type ProjectType = 'Client Project' | 'Internal Project' | 'General Project';
export type ProjectPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type ProjectStatus = 'Not Started' | 'In Progress' | 'Under Review' | 'On Hold' | 'Completed' | 'Cancelled';

export interface Project {
  id: string;
  project_code: string;
  project_name: string;
  project_type: ProjectType;
  client_id?: string;
  client_name?: string;
  service_engagement_id?: string;
  service_name?: string;
  description: string;
  project_manager_id?: string;
  project_manager_name?: string;
  priority: ProjectPriority;
  start_date: string;
  due_date: string;
  status: ProjectStatus;
  progress_percentage: number;
  assigned_employees?: Array<{ id: string; full_name: string; role_in_project?: string }>;
  tasks?: Task[];
  created_at: string;
  updated_at: string;
}

export type TaskStatusColor = "slate" | "violet" | "amber" | "sky" | "rose" | "emerald";

export interface TaskStatusConfig {
  id: string;
  label: string;
  color: TaskStatusColor;
  isCompleted?: boolean;
}

export type TaskStatus = string;

export interface Task {
  id: string;
  task_code: string;
  project_id: string;
  project_name?: string;
  parent_task_id?: string;
  project_workflow_stage_id?: string;
  title: string;
  description: string;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  priority: ProjectPriority;
  start_date?: string;
  due_date: string;
  status: TaskStatus;
  created_by?: string;
  created_by_name?: string;
  completed_at?: string;
  created_at: string;
  subtasks?: Task[];
  comments_count?: number;
  attachments_count?: number;
}

export interface CommentReadReceipt {
  employee_id: string;
  employee_name: string;
  read_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  employee_id: string;
  employee_name: string;
  comment: string;
  read_by?: CommentReadReceipt[];
  mentioned_employee_ids?: string[];
  created_at: string;
}

export interface WorkflowSubtaskTemplate {
  id: string;
  title: string;
  description?: string;
  start_day_offset: number;
  duration_days: number;
  priority?: ProjectPriority;
  status?: TaskStatus;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
}

export interface WorkflowProjectTaskTemplate {
  id: string;
  task_name: string;
  description: string;
  sequence_number: number;
  start_day_offset: number;
  duration_days: number;
  priority: ProjectPriority;
  status: TaskStatus;
  assigned_employee_id?: string;
  assigned_employee_name?: string;
  subtasks: WorkflowSubtaskTemplate[];
  default_comments: string[];
}

export interface WorkflowTemplate {
  id: string;
  workflow_code: string;
  workflow_name: string;
  service_id?: string;
  service_name?: string;
  description: string;
  is_active: boolean;
  version: number;
  stages_count?: number;
  created_at: string;
  template_tasks?: WorkflowProjectTaskTemplate[];
  versions?: WorkflowTemplateVersion[];
}

export interface WorkflowTemplateVersion {
  id: string;
  workflow_template_id: string;
  version_number: number;
  is_published: boolean;
  published_at?: string;
  stages: WorkflowStage[];
  conditions?: WorkflowCondition[];
}

export interface WorkflowStage {
  id: string;
  template_version_id: string;
  stage_name: string;
  description: string;
  sequence_number: number;
  default_days: number;
  tasks: WorkflowTaskTemplate[];
}

export interface WorkflowTaskTemplate {
  id: string;
  stage_id: string;
  task_name: string;
  description: string;
  sequence_number: number;
  default_days: number;
  priority: ProjectPriority;
  is_mandatory: boolean;
}

export interface WorkflowCondition {
  id: string;
  template_version_id: string;
  stage_id?: string;
  field_name: string; // e.g., 'constitution', 'gstin_available'
  operator: string;
  field_value: string;
  is_active: boolean;
}

export interface ProjectWorkflow {
  id: string;
  project_id: string;
  template_version_id: string;
  status: 'Active' | 'Completed' | 'Suspended';
  stages: ProjectWorkflowStage[];
}

export interface ProjectWorkflowStage {
  id: string;
  project_workflow_id: string;
  stage_name: string;
  description: string;
  sequence_number: number;
  assigned_supervisor_id?: string;
  assigned_supervisor_name?: string;
  start_date?: string;
  due_date?: string;
  status: 'Pending' | 'In Progress' | 'Under Review' | 'Approved' | 'Rejected';
  approved_by_name?: string;
  approved_at?: string;
  remarks?: string;
}

export type InvoiceStatus = 'Draft' | 'Finalized' | 'Partially Paid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Invoice {
  id: string;
  invoice_number: string;
  financial_year: string;
  client_id: string;
  client_name?: string;
  service_engagement_id?: string;
  service_name?: string;
  invoice_date: string;
  due_date: string;
  place_of_supply: string;
  is_interstate: boolean;
  reverse_charge: boolean;

  client_legal_name: string;
  client_address: string;
  client_pan?: string;
  client_gstin?: string;
  client_state?: string;
  client_contact?: string;

  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_gst: number;
  grand_total: number;
  tds_section?: string;
  tds_rate?: number;
  tds_amount?: number;
  net_payable?: number;
  paid_amount: number;
  outstanding_balance: number;

  status: InvoiceStatus;
  terms_label?: string;
  pdf_file_object_id?: string;
  notes?: string;
  terms_conditions?: string;
  created_by_name?: string;
  finalized_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
  items: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  service_id?: string;
  description: string;
  sub_description?: string;
  sac_code?: string;
  quantity: number;
  rate: number;
  discount_amount: number;
  taxable_amount: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
}

export type PaymentMode = 
  | 'Bank Transfer' 
  | 'NEFT' 
  | 'RTGS' 
  | 'UPI' 
  | 'Cheque' 
  | 'Credit Card' 
  | 'Debit Card' 
  | 'Cash' 
  | 'Other';

export interface Payment {
  id: string;
  payment_number: string;
  client_id: string;
  client_name?: string;
  invoice_id?: string;
  invoice_number?: string;
  service_engagement_id?: string;
  payment_date: string;
  amount: number;
  payment_mode: PaymentMode;
  transaction_reference?: string;
  received_by?: string;
  received_by_name?: string;
  receipt_file_object_id?: string;
  remarks?: string;
  status: 'Pending' | 'Completed' | 'Bounced' | 'Refunded';
  created_at: string;
}

export type DocumentCategory = 
  | 'Client' 
  | 'PAN' 
  | 'GST' 
  | 'CIN' 
  | 'Employee' 
  | 'Bank' 
  | 'Project' 
  | 'Task' 
  | 'Invoice' 
  | 'Payment Receipt' 
  | 'Workflow' 
  | 'Other';

export interface FileObject {
  id: string;
  bucket_name: string;
  r2_object_key: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  category: DocumentCategory;
  entity_type?: string;
  entity_id?: string;
  uploaded_by?: string;
  uploaded_by_name?: string;
  version_number: number;
  expiry_date?: string;
  download_url?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  recipient_employee_id: string;
  title: string;
  message: string;
  type: 
    | 'task_assigned' 
    | 'project_created' 
    | 'task_deadline' 
    | 'task_overdue' 
    | 'workflow_stage' 
    | 'workflow_approval' 
    | 'payment_received' 
    | 'payment_pending' 
    | 'invoice_generated' 
    | 'invoice_overdue' 
    | 'document_expiring' 
    | 'task_comment_mention'
    | 'system';
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  employee_id?: string;
  employee_name?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface DashboardKPIs {
  totalClients: number;
  activeClients: number;
  totalServices: number;
  activeProjects: number;
  pendingTasks: number;
  completedTasks: number;
  totalEmployees: number;
  pendingPaymentsCount: number;
  totalRevenueInvoiced: number;
  totalPaymentsReceived: number;
  outstandingReceivables: number;
}

export interface OfficeGeoConfig {
  location_name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  updated_at: string;
  updated_by_name?: string;
}

export type AttendanceStatus = 'Present' | 'Checked Out' | 'Out of Range';

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code?: string;
  date: string;
  check_in_at: string;
  check_out_at?: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  distance_meters: number;
  allowed_radius_meters: number;
  status: AttendanceStatus;
  matched: boolean;
  location_name?: string;
  created_at: string;
}


