-- ============================================================================
-- PROFESSIONAL SERVICE MANAGEMENT SYSTEM (PMS)
-- MASTER DATABASE SCHEMA & MIGRATION SCRIPT
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. IDENTITY, ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    hierarchy_level INT NOT NULL DEFAULT 10,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    google_id VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- 2. DEPARTMENTS, DESIGNATIONS, EMPLOYEES & TEAMS
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    head_employee_id UUID, -- Foreign key added below after employees table
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(100) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    level INT NOT NULL DEFAULT 1,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20) NOT NULL,
    father_name VARCHAR(150),
    date_of_birth DATE,
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    employment_status VARCHAR(30) NOT NULL DEFAULT 'Active' CHECK (employment_status IN ('Active', 'Inactive', 'Probation', 'Notice Period', 'Terminated')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add head_employee_id FK to departments
ALTER TABLE departments DROP CONSTRAINT IF EXISTS fk_dept_head;
ALTER TABLE departments 
ADD CONSTRAINT fk_dept_head FOREIGN KEY (head_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employee_private_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'Savings' CHECK (account_type IN ('Savings', 'Current', 'Salary')),
    account_number_encrypted TEXT NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_holder_name VARCHAR(150) NOT NULL,
    aadhaar_number_encrypted TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_in_team VARCHAR(50) NOT NULL DEFAULT 'Member',
    is_active BOOLEAN NOT NULL DEFAULT true,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    UNIQUE(team_id, employee_id)
);

-- ============================================================================
-- 3. CLOUDFLARE R2 FILE OBJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bucket_name VARCHAR(100) NOT NULL,
    r2_object_key TEXT NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'Client', 'PAN', 'GST', 'CIN', 'Employee', 'Bank', 
        'Project', 'Task', 'Invoice', 'Payment Receipt', 'Workflow', 'Other'
    )),
    entity_type VARCHAR(50),
    entity_id UUID,
    uploaded_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    version_number INT NOT NULL DEFAULT 1,
    expiry_date DATE,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CLIENT 360° MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code VARCHAR(30) NOT NULL UNIQUE,
    client_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(250) NOT NULL,
    reference_name VARCHAR(200),
    constitution VARCHAR(50) NOT NULL CHECK (constitution IN (
        'Proprietorship', 'Partnership', 'LLP', 'Private Limited', 
        'Public Limited', 'Individual', 'Trust', 'Society', 'HUF', 'Other'
    )),
    category VARCHAR(100),
    nature_of_income VARCHAR(150),
    remarks TEXT,
    relationship_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'On Hold', 'Archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    contact_person VARCHAR(150) NOT NULL,
    designation VARCHAR(100),
    mobile_number VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    address_type VARCHAR(30) NOT NULL DEFAULT 'Registered' CHECK (address_type IN ('Registered', 'Communication', 'Branch', 'Factory')),
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    pan VARCHAR(20) NOT NULL,
    gstin VARCHAR(25),
    cin VARCHAR(30),
    dob_or_doi DATE,
    additional_registrations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    account_number_encrypted TEXT NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'Current',
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    file_object_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    expiry_date DATE,
    verified_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SERVICE MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(30) NOT NULL UNIQUE,
    service_name VARCHAR(200) NOT NULL,
    description TEXT,
    default_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    default_gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    billing_type VARCHAR(30) NOT NULL DEFAULT 'Recurring' CHECK (billing_type IN ('One-time', 'Recurring')),
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    agreed_fee NUMERIC(12,2) NOT NULL,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    billing_frequency VARCHAR(30) NOT NULL DEFAULT 'Monthly' CHECK (billing_frequency IN ('One-time', 'Monthly', 'Quarterly', 'Half-yearly', 'Annually', 'Custom')),
    payment_terms VARCHAR(100) DEFAULT 'Immediate',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    relationship_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Paused', 'Terminated')),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_fee_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    engagement_id UUID NOT NULL REFERENCES service_engagements(id) ON DELETE CASCADE,
    old_fee NUMERIC(12,2) NOT NULL,
    new_fee NUMERIC(12,2) NOT NULL,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    revised_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. WORKFLOW ENGINE (TEMPLATES, STAGES & CONDITIONS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_code VARCHAR(30) NOT NULL UNIQUE,
    workflow_name VARCHAR(150) NOT NULL,
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_template_id, version_number)
);

CREATE TABLE IF NOT EXISTS workflow_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_version_id UUID NOT NULL REFERENCES workflow_template_versions(id) ON DELETE CASCADE,
    stage_name VARCHAR(150) NOT NULL,
    description TEXT,
    sequence_number INT NOT NULL,
    default_days INT NOT NULL DEFAULT 5,
    assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    task_name VARCHAR(200) NOT NULL,
    description TEXT,
    sequence_number INT NOT NULL DEFAULT 1,
    default_days INT NOT NULL DEFAULT 2,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    is_mandatory BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_version_id UUID NOT NULL REFERENCES workflow_template_versions(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES workflow_stages(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    operator VARCHAR(20) NOT NULL DEFAULT 'equals',
    field_value VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. PROJECT & TASK MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code VARCHAR(30) NOT NULL UNIQUE,
    project_name VARCHAR(250) NOT NULL,
    project_type VARCHAR(50) NOT NULL CHECK (project_type IN ('Client Project', 'Internal Project', 'General Project')),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    project_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Under Review', 'On Hold', 'Completed', 'Cancelled')),
    progress_percentage INT NOT NULL DEFAULT 0 CHECK (progress_percentage BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_in_project VARCHAR(50) NOT NULL DEFAULT 'Contributor',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS project_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    template_version_id UUID NOT NULL REFERENCES workflow_template_versions(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Completed', 'Suspended')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_workflow_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_workflow_id UUID NOT NULL REFERENCES project_workflows(id) ON DELETE CASCADE,
    stage_name VARCHAR(150) NOT NULL,
    description TEXT,
    sequence_number INT NOT NULL,
    assigned_department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    assigned_supervisor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_date DATE,
    due_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Under Review', 'Approved', 'Rejected')),
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_code VARCHAR(30) NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_workflow_stage_id UUID REFERENCES project_workflow_stages(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
    start_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'To Do' CHECK (status IN ('To Do', 'In Progress', 'Pending', 'Under Review', 'Completed', 'Blocked')),
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(task_id, employee_id)
);

CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_object_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    old_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. FINANCE, INVOICES & PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_year VARCHAR(10) NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
    current_number INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(financial_year, prefix)
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    financial_year VARCHAR(10) NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    service_engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    place_of_supply VARCHAR(100) NOT NULL,
    is_interstate BOOLEAN NOT NULL DEFAULT false,
    reverse_charge BOOLEAN NOT NULL DEFAULT false,
    
    -- Client Snapshot for legal immutability
    client_legal_name VARCHAR(250) NOT NULL,
    client_address TEXT NOT NULL,
    client_pan VARCHAR(20),
    client_gstin VARCHAR(25),
    client_state VARCHAR(100),
    client_contact VARCHAR(100),

    -- Financial Breakdown
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_gst NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,

    status VARCHAR(30) NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Finalized', 'Partially Paid', 'Paid', 'Overdue', 'Cancelled')),
    pdf_file_object_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
    notes TEXT,
    terms_conditions TEXT,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    finalized_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sac_code VARCHAR(20),
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    rate NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    service_engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL CHECK (payment_mode IN (
        'Bank Transfer', 'NEFT', 'RTGS', 'UPI', 'Cheque', 'Credit Card', 'Debit Card', 'Cash', 'Other'
    )),
    transaction_reference VARCHAR(100),
    received_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    receipt_file_object_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
    remarks TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Completed' CHECK (status IN ('Pending', 'Completed', 'Bounced', 'Refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL DEFAULT 'Payment Due',
    scheduled_date DATE NOT NULL,
    sent_at TIMESTAMPTZ,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Sent', 'Failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. NOTIFICATIONS, ACTIVITY LOGS & SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN (
        'task_assigned', 'project_created', 'task_deadline', 'task_overdue', 
        'workflow_stage', 'workflow_approval', 'payment_received', 'payment_pending', 
        'invoice_generated', 'invoice_overdue', 'document_expiring', 'system'
    )),
    reference_type VARCHAR(50),
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    approver_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL CHECK (status IN ('Approved', 'Rejected')),
    comments TEXT,
    action_date TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9B. GEO-ATTENDANCE & CUSTOM TASK STATUSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS office_geo_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_name VARCHAR(200) NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INT NOT NULL DEFAULT 50 CHECK (radius_meters > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_at TIMESTAMPTZ,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    distance_meters DOUBLE PRECISION NOT NULL DEFAULT 0,
    matched_office_id UUID REFERENCES office_geo_configs(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Present' CHECK (status IN ('Present', 'Half Day', 'Outside Geofence', 'Rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS task_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label VARCHAR(80) NOT NULL UNIQUE,
    color VARCHAR(30) NOT NULL DEFAULT 'slate',
    is_completed BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. INDEXES FOR HIGH PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_supervisor ON employees(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_pan ON client_registrations(pan);
CREATE INDEX IF NOT EXISTS idx_clients_gstin ON client_registrations(gstin);
CREATE INDEX IF NOT EXISTS idx_engagements_client ON service_engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_engagements_service ON service_engagements(service_id);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_manager ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_employee_id, is_read);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_file_objects_category ON file_objects(category, entity_id);

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_geo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;

-- Base RLS Policy Helper Functions
CREATE OR REPLACE FUNCTION current_app_user_id() RETURNS UUID AS $$
    SELECT id FROM users WHERE email = auth.jwt() ->> 'email' LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_super_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN users u ON ur.user_id = u.id
        WHERE u.email = auth.jwt() ->> 'email' AND r.code = 'SUPER_ADMIN'
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_user_admin() RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN users u ON ur.user_id = u.id
        WHERE u.email = auth.jwt() ->> 'email' AND r.code IN ('SUPER_ADMIN', 'ADMIN')
    );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- RLS Policies: Authenticated active employees can read business data
DROP POLICY IF EXISTS "Employees can view active directory" ON employees;
CREATE POLICY "Employees can view active directory" ON employees
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Super Admins have full access to employees" ON employees;
DROP POLICY IF EXISTS "Admins have full access to employees" ON employees;
CREATE POLICY "Admins have full access to employees" ON employees
    FOR ALL USING (is_user_admin());

DROP POLICY IF EXISTS "Super Admins manage user roles" ON user_roles;
CREATE POLICY "Super Admins manage user roles" ON user_roles
    FOR ALL USING (is_user_super_admin());

DROP POLICY IF EXISTS "Super Admins view private details" ON employee_private_details;
DROP POLICY IF EXISTS "Admins view private details" ON employee_private_details;
CREATE POLICY "Admins view private details" ON employee_private_details
    FOR ALL USING (is_user_admin());

DROP POLICY IF EXISTS "Authenticated users view geo config" ON office_geo_configs;
CREATE POLICY "Authenticated users view geo config" ON office_geo_configs
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage geo config" ON office_geo_configs;
CREATE POLICY "Admins manage geo config" ON office_geo_configs
    FOR ALL USING (is_user_admin());

DROP POLICY IF EXISTS "Employees manage own attendance" ON attendance_records;
CREATE POLICY "Employees manage own attendance" ON attendance_records
    FOR ALL USING (
        employee_id IN (SELECT id FROM employees WHERE user_id = current_app_user_id())
        OR is_user_admin()
    );

DROP POLICY IF EXISTS "Authenticated users view task statuses" ON task_statuses;
CREATE POLICY "Authenticated users view task statuses" ON task_statuses
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage task statuses" ON task_statuses;
CREATE POLICY "Admins manage task statuses" ON task_statuses
    FOR ALL USING (is_user_admin());

DROP POLICY IF EXISTS "Authenticated users view clients" ON clients;
CREATE POLICY "Authenticated users view clients" ON clients
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users manage clients" ON clients;
CREATE POLICY "Authenticated users manage clients" ON clients
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users view services" ON services;
CREATE POLICY "Authenticated users view services" ON services
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users view projects" ON projects;
CREATE POLICY "Authenticated users view projects" ON projects
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users view tasks" ON tasks;
CREATE POLICY "Authenticated users view tasks" ON tasks
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users view invoices" ON invoices;
CREATE POLICY "Authenticated users view invoices" ON invoices
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users view payments" ON payments;
CREATE POLICY "Authenticated users view payments" ON payments
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users view their own notifications" ON notifications;
CREATE POLICY "Users view their own notifications" ON notifications
    FOR ALL USING (
        recipient_employee_id IN (
            SELECT id FROM employees WHERE user_id = current_app_user_id()
        ) OR is_user_admin()
    );

DROP POLICY IF EXISTS "Authenticated users read workspace state" ON system_settings;
CREATE POLICY "Authenticated users read workspace state" ON system_settings
    FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users sync workspace state" ON system_settings;
CREATE POLICY "Authenticated users sync workspace state" ON system_settings
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ============================================================================
-- 12. DATABASE FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to generate safe next invoice number
CREATE OR REPLACE FUNCTION generate_next_invoice_number(p_fy VARCHAR, p_prefix VARCHAR DEFAULT 'INV') 
RETURNS VARCHAR AS $$
DECLARE
    v_next_num INT;
    v_inv_no VARCHAR;
BEGIN
    INSERT INTO invoice_sequences (financial_year, prefix, current_number)
    VALUES (p_fy, p_prefix, 1)
    ON CONFLICT (financial_year, prefix)
    DO UPDATE SET current_number = invoice_sequences.current_number + 1, updated_at = NOW()
    RETURNING current_number INTO v_next_num;

    v_inv_no := p_prefix || '/' || p_fy || '/' || LPAD(v_next_num::TEXT, 5, '0');
    RETURN v_inv_no;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate invoice outstanding balance when payments change
CREATE OR REPLACE FUNCTION update_invoice_balances()
RETURNS TRIGGER AS $$
DECLARE
    v_inv_id UUID;
    v_paid NUMERIC(12,2);
    v_total NUMERIC(12,2);
BEGIN
    v_inv_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
    IF v_inv_id IS NOT NULL THEN
        SELECT COALESCE(SUM(allocated_amount), 0.00) INTO v_paid
        FROM payment_allocations
        WHERE invoice_id = v_inv_id;

        SELECT grand_total INTO v_total
        FROM invoices
        WHERE id = v_inv_id;

        UPDATE invoices
        SET paid_amount = v_paid,
            outstanding_balance = GREATEST(0.00, v_total - v_paid),
            status = CASE 
                WHEN v_total - v_paid <= 0 THEN 'Paid'
                WHEN v_paid > 0 THEN 'Partially Paid'
                WHEN due_date < CURRENT_DATE THEN 'Overdue'
                ELSE status
            END,
            updated_at = NOW()
        WHERE id = v_inv_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_allocations_balance ON payment_allocations;
CREATE TRIGGER trg_payment_allocations_balance
AFTER INSERT OR UPDATE OR DELETE ON payment_allocations
FOR EACH ROW EXECUTE FUNCTION update_invoice_balances();

-- ============================================================================
-- PROFESSIONAL SERVICE MANAGEMENT SYSTEM (PMS)
-- SEED DATA: ROLES, PERMISSIONS, SERVICES, DEPARTMENTS, WORKFLOWS & MOCK DATA
-- ============================================================================

-- 1. ROLES
INSERT INTO roles (id, name, code, description, hierarchy_level, is_system) VALUES
('11111111-1111-1111-1111-111111111101', 'Super Admin', 'SUPER_ADMIN', 'Full system access, master configuration, and Admin Management authority', 1, true),
('11111111-1111-1111-1111-111111111107', 'Admin', 'ADMIN', 'Full operational admin access to all modules except Admin Management', 1, true),
('11111111-1111-1111-1111-111111111102', 'Director', 'DIRECTOR', 'Executive leadership with access to finance, clients and approvals', 2, true),
('11111111-1111-1111-1111-111111111103', 'Head', 'HEAD', 'Department Head supervising teams, projects and allocations', 3, true),
('11111111-1111-1111-1111-111111111104', 'Supervisor', 'SUPERVISOR', 'Team supervisor overseeing task execution and reviewing work', 4, true),
('11111111-1111-1111-1111-111111111105', 'Employee', 'EMPLOYEE', 'Full-time professional staff managing assigned deliverables', 5, true),
('11111111-1111-1111-1111-111111111106', 'Trainee', 'TRAINEE', 'Articled assistant or intern with supervised task execution', 6, true)
ON CONFLICT (code) DO NOTHING;

-- 2. PERMISSIONS
INSERT INTO permissions (id, module, action, code, description) VALUES
('22222222-2222-2222-2222-222222220001', 'clients', 'read', 'clients.read', 'View client records'),
('22222222-2222-2222-2222-222222220002', 'clients', 'create', 'clients.create', 'Onboard new clients'),
('22222222-2222-2222-2222-222222220003', 'clients', 'update', 'clients.update', 'Update client details'),
('22222222-2222-2222-2222-222222220004', 'clients', 'delete', 'clients.delete', 'Archive or delete clients'),
('22222222-2222-2222-2222-222222220005', 'services', 'manage', 'services.manage', 'Add and edit service catalog'),
('22222222-2222-2222-2222-222222220006', 'projects', 'manage', 'projects.manage', 'Create and oversee projects'),
('22222222-2222-2222-2222-222222220007', 'tasks', 'execute', 'tasks.execute', 'Update assigned tasks'),
('22222222-2222-2222-2222-222222220008', 'finance', 'read', 'finance.read', 'View invoices and receipts'),
('22222222-2222-2222-2222-222222220009', 'finance', 'manage', 'finance.manage', 'Generate invoices and record payments'),
('22222222-2222-2222-2222-222222220010', 'employees', 'manage', 'employees.manage', 'Onboard and manage employees'),
('22222222-2222-2222-2222-222222220011', 'workflows', 'manage', 'workflows.manage', 'Design and publish workflow templates')
ON CONFLICT (code) DO NOTHING;

-- 3. DEPARTMENTS
INSERT INTO departments (id, department_code, name, description, status) VALUES
('33333333-3333-3333-3333-333333330001', 'TAX', 'Tax & Regulatory Services', 'Direct, Indirect taxation, GST and International Tax', 'Active'),
('33333333-3333-3333-3333-333333330002', 'CORP', 'Corporate Law & Secretarial', 'ROC compliances, incorporations and corporate filings', 'Active'),
('33333333-3333-3333-3333-333333330003', 'AUDIT', 'Assurance & Audit', 'Statutory, internal and specialized tax audits', 'Active'),
('33333333-3333-3333-3333-333333330004', 'ADVISORY', 'Advisory & Transactions', 'Valuation, Virtual CFO and business restructuring', 'Active'),
('33333333-3333-3333-3333-333333330005', 'ACCT', 'Accounting & Payroll', 'Bookkeeping, management reporting and payroll processing', 'Active')
ON CONFLICT (department_code) DO NOTHING;

-- 4. DESIGNATIONS
INSERT INTO designations (id, title, code, level, description) VALUES
('44444444-4444-4444-4444-444444440001', 'Managing Partner / Director', 'DIR', 1, 'Strategic lead and firm principal'),
('44444444-4444-4444-4444-444444440002', 'Practice Head', 'HEAD', 2, 'Head of practice group'),
('44444444-4444-4444-4444-444444440003', 'Senior Manager / Supervisor', 'MGR', 3, 'Operational team supervisor'),
('44444444-4444-4444-4444-444444440004', 'Senior Consultant', 'SR_CONS', 4, 'Senior professional consultant'),
('44444444-4444-4444-4444-444444440005', 'Associate Consultant', 'ASSOC', 5, 'Executive consultant'),
('44444444-4444-4444-4444-444444440006', 'Articled Assistant / Trainee', 'TRAINEE', 6, 'Trainee or apprentice')
ON CONFLICT (code) DO NOTHING;

-- 5. INITIAL 17 SERVICES CATALOG (Exceeds required 15 services)
INSERT INTO services (id, service_code, service_name, description, default_fee, default_gst_rate, billing_type, status) VALUES
('55555555-5555-5555-5555-555555550001', 'SRV-GST-01', 'GST Registration & Core Amendment', 'New GST registration, ARN tracking and core field modifications', 3500.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550002', 'SRV-GST-02', 'Monthly GST Return Compliance (GSTR-1 & 3B)', 'Monthly sales ledger upload, 2B ITC reconciliation and return filing', 5000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550003', 'SRV-GST-03', 'Annual GST Return & Reconciliation (GSTR-9/9C)', 'Annual consolidation, reverse charge check and table 9C audit memo', 15000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550004', 'SRV-ITR-01', 'Corporate Income Tax Return (ITR-6)', 'Company tax return preparation, MAT computation and e-verification', 25000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550005', 'SRV-ITR-02', 'Non-Corporate & Individual ITR (ITR-2/3/5)', 'Partnership, LLP and High Networth Individual income tax filing', 8500.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550006', 'SRV-AUD-01', 'Statutory Financial Audit', 'Independent financial statement examination under Companies Act 2013', 45000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550007', 'SRV-AUD-02', 'Tax Audit u/s 44AB', 'Form 3CA/3CB and Form 3CD electronic certification and reporting', 30000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550008', 'SRV-TDS-01', 'Quarterly TDS/TCS Return Compliance', 'Quarterly 24Q, 26Q, 27Q processing, challan tagging and Form 16 issuance', 4500.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550009', 'SRV-ROC-01', 'Private Limited Company Incorporation', 'RUN name reservation, SPICe+ filing, PAN/TAN, DIN and Certificate of Incorporation', 12000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550010', 'SRV-ROC-02', 'LLP Formation & Agreement Drafting', 'LLP name reservation, FiLLiP filing and supplementary LLP agreement stamping', 10000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550011', 'SRV-ROC-03', 'Annual MCA ROC Compliance (AOC-4 & MGT-7)', 'Board report drafting, financial XBRL conversion and annual returns', 18000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550012', 'SRV-IPR-01', 'Trademark Application & Clearance Search', 'Pre-filing classification, TM-A filing and tracking examiner reports', 7500.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550013', 'SRV-PAY-01', 'Monthly Payroll & Statutory ESI/PF Filing', 'Payslip preparation, ECR generation, Form 5/10 and monthly compliance', 8000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550014', 'SRV-ACC-01', 'End-to-End Accounting & Bookkeeping', 'Cloud ledger maintenance, bank reconciliation and monthly MIS preparation', 15000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550015', 'SRV-TP-01', 'Transfer Pricing Study & Form 3CEB', 'International benchmark analysis, TP study documentation and accountant report', 60000.00, 18.00, 'One-time', 'Active'),
('55555555-5555-5555-5555-555555550016', 'SRV-CFO-01', 'Virtual CFO & Financial Advisory', 'Budgeting, cash flow forecasting, board presentations and investor reporting', 50000.00, 18.00, 'Recurring', 'Active'),
('55555555-5555-5555-5555-555555550017', 'SRV-EXIM-01', 'DGFT Import Export Code (IEC) & Registration', 'DGFT application, ICEGATE linking and digital token validation', 4000.00, 18.00, 'One-time', 'Active')
ON CONFLICT (service_code) DO NOTHING;

-- 6. DEFAULT WORKFLOW TEMPLATE: Annual Corporate Tax & ROC Filing
INSERT INTO workflow_templates (id, workflow_code, workflow_name, service_id, description, is_active) VALUES
('66666666-6666-6666-6666-666666660001', 'WF-ANNUAL-FILING', 'Annual Corporate Tax & ROC Filing Workflow', '55555555-5555-5555-5555-555555550004', 'Standard 6-stage lifecycle for corporate statutory accounts, tax audit and MCA return filing', true)
ON CONFLICT (workflow_code) DO NOTHING;

INSERT INTO workflow_template_versions (id, workflow_template_id, version_number, is_published, published_at) VALUES
('66666666-6666-6666-6666-666666660002', '66666666-6666-6666-6666-666666660001', 1, true, NOW())
ON CONFLICT (workflow_template_id, version_number) DO NOTHING;

-- 6 Stages for the Workflow
INSERT INTO workflow_stages (id, template_version_id, stage_name, description, sequence_number, default_days, assigned_department_id) VALUES
('77777777-7777-7777-7777-777777770001', '66666666-6666-6666-6666-666666660002', 'Document Collection', 'Client checklist dispatch, trial balance and ledger collection', 1, 7, '33333333-3333-3333-3333-333333330005'),
('77777777-7777-7777-7777-777777770002', '66666666-6666-6666-6666-666666660002', 'Document Verification & Scrutiny', 'Vouching, bank statements cross-checking and 26AS/AIS verification', 2, 5, '33333333-3333-3333-3333-333333330003'),
('77777777-7777-7777-7777-777777770003', '66666666-6666-6666-6666-666666660002', 'Draft Preparation', 'Financial statement preparation, schedule building and draft tax computation', 3, 10, '33333333-3333-3333-3333-333333330001'),
('77777777-7777-7777-7777-777777770004', '66666666-6666-6666-6666-666666660002', 'Internal Review & Partner Sign-off', 'Supervisory check, partner quality control and client sign-off', 4, 3, '33333333-3333-3333-3333-333333330001'),
('77777777-7777-7777-7777-777777770005', '66666666-6666-6666-6666-666666660002', 'Statutory Portal Filing', 'Portal XML/JSON generation, DSC signing and filing on IT/MCA portals', 5, 2, '33333333-3333-3333-3333-333333330002'),
('77777777-7777-7777-7777-777777770006', '66666666-6666-6666-6666-666666660002', 'Completion & Documentation', 'Client acknowledgment delivery, archiving workpapers to R2 storage', 6, 2, '33333333-3333-3333-3333-333333330005')
ON CONFLICT DO NOTHING;

-- Tasks for each stage
INSERT INTO workflow_tasks (stage_id, task_name, description, sequence_number, default_days, priority, is_mandatory) VALUES
('77777777-7777-7777-7777-777777770001', 'Send Document Requirement Checklist', 'Transmit standardized PBC checklist to client finance team', 1, 2, 'High', true),
('77777777-7777-7777-7777-777777770001', 'Collect Final Trial Balance & Ledgers', 'Receive signed trial balance and supporting schedules', 2, 5, 'High', true),
('77777777-7777-7777-7777-777777770002', 'Reconcile 26AS, AIS and TIS with Books', 'Identify any TDS mismatches or unreported incomes', 1, 3, 'Urgent', true),
('77777777-7777-7777-7777-777777770002', 'Verify Statutory Dues & Loan Compliances', 'Check PF, ESI, GST payment receipts before due dates', 2, 2, 'Medium', true),
('77777777-7777-7777-7777-777777770003', 'Prepare Draft Balance Sheet and P&L', 'Prepare Schedule III compliant financial statements', 1, 5, 'High', true),
('77777777-7777-7777-7777-777777770003', 'Calculate Advance Tax & MAT under 115JB', 'Tax provision and deferred tax asset/liability calculation', 2, 3, 'High', true),
('77777777-7777-7777-7777-777777770004', 'Partner Review & Scrutiny', 'Comprehensive review by practice director before submission', 1, 2, 'Urgent', true),
('77777777-7777-7777-7777-777777770004', 'Client Approval & Signature on Declarations', 'Receive signed management representation letter (MRL)', 2, 2, 'High', true),
('77777777-7777-7777-7777-777777770005', 'Upload ITR & Generate Acknowledgement', 'DSC affixation, portal submission and ITR-V download', 1, 1, 'Urgent', true),
('77777777-7777-7777-7777-777777770006', 'Invoice Generation and Workpaper Archival', 'Ensure final billing is raised and papers archived in R2', 1, 2, 'Medium', true)
ON CONFLICT DO NOTHING;

-- 6. PRIMARY SUPER ADMIN ACCOUNT (rohitaju21@gmail.com)
INSERT INTO users (id, email, full_name, is_active) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', 'rohitaju21@gmail.com', 'ROHIT L', true)
ON CONFLICT (email) DO UPDATE SET is_active = true;

INSERT INTO user_roles (user_id, role_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1', '11111111-1111-1111-1111-111111111101')
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO employees (
    id, employee_code, user_id, first_name, last_name, full_name, email,
    mobile_number, joining_date, employment_status, is_active
) VALUES (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1',
    'EMP-001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1',
    'ROHIT',
    'L',
    'ROHIT L',
    'rohitaju21@gmail.com',
    '+91 98000 00000',
    CURRENT_DATE,
    'Active',
    true
)
ON CONFLICT (email) DO UPDATE SET is_active = true, employment_status = 'Active';

-- 7. DEFAULT KANBAN / TASK STATUSES
INSERT INTO task_statuses (label, color, is_completed, sort_order) VALUES
('To Do', 'slate', false, 1),
('In Progress', 'blue', false, 2),
('Review', 'amber', false, 3),
('Completed', 'emerald', true, 4)
ON CONFLICT (label) DO NOTHING;


