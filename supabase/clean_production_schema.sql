-- ============================================================================
-- PMS & CA FIRM MANAGEMENT SUITE — CLEAN PRODUCTION SCHEMA
-- Complete, Pure Schema without any Mock Data, Dummy Clients, or Autofill
-- Ready to run directly in the Supabase SQL Editor
-- ============================================================================

-- 0. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. AUTHENTICATION, ROLES & PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
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
    encrypted_password VARCHAR(255),
    full_name VARCHAR(150) NOT NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- 2. ORGANIZATIONAL STRUCTURE & EMPLOYEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_code VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    head_employee_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    designation_name VARCHAR(100) NOT NULL UNIQUE,
    designation_code VARCHAR(20) NOT NULL UNIQUE,
    level INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    employee_code VARCHAR(30) NOT NULL UNIQUE,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    full_name VARCHAR(150) GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED,
    email VARCHAR(255) NOT NULL UNIQUE,
    mobile_number VARCHAR(20),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation_id UUID REFERENCES designations(id) ON DELETE SET NULL,
    designation_name VARCHAR(100),
    team_id UUID,
    team_name VARCHAR(100),
    reports_to_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    role_code VARCHAR(50) DEFAULT 'Staff',
    employment_type VARCHAR(50) NOT NULL DEFAULT 'Full-Time',
    employment_status VARCHAR(30) NOT NULL DEFAULT 'Active',
    joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
    exit_date DATE,
    profile_photo_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departments
    DROP CONSTRAINT IF EXISTS fk_departments_head;
ALTER TABLE departments
    ADD CONSTRAINT fk_departments_head FOREIGN KEY (head_employee_id) REFERENCES employees(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS employee_private_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
    pan VARCHAR(20),
    aadhaar_masked VARCHAR(20),
    bank_account_encrypted TEXT,
    bank_name VARCHAR(100),
    bank_ifsc VARCHAR(20),
    pf_uan VARCHAR(30),
    esi_number VARCHAR(30),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_name VARCHAR(100) NOT NULL UNIQUE,
    team_code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    team_lead_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role_in_team VARCHAR(50) NOT NULL DEFAULT 'Member',
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(team_id, employee_id)
);

ALTER TABLE employees
    DROP CONSTRAINT IF EXISTS fk_employees_team;
ALTER TABLE employees
    ADD CONSTRAINT fk_employees_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. STORAGE & REPOSITORY FILE OBJECTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS file_objects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_bucket VARCHAR(100) NOT NULL DEFAULT 'firm-documents',
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100),
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    file_category VARCHAR(50) DEFAULT 'General',
    version INT NOT NULL DEFAULT 1,
    checksum_sha256 VARCHAR(64),
    uploaded_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    uploaded_by_name VARCHAR(150),
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CLIENTS 360, CONTACTS, ADDRESSES & REGISTRATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_code VARCHAR(30) NOT NULL UNIQUE,
    client_name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    nick_name VARCHAR(100),
    folder_name VARCHAR(150),
    reference_name VARCHAR(150),
    constitution VARCHAR(50) NOT NULL DEFAULT 'Proprietorship',
    category VARCHAR(50),
    nature_of_income TEXT,
    relationship_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    remarks TEXT,
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
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    address_type VARCHAR(50) NOT NULL DEFAULT 'Registered',
    street_address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pin_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    is_primary BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    pan VARCHAR(20),
    gstin VARCHAR(30),
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
    file_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(100),
    valid_until DATE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SERVICES & ENGAGEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_code VARCHAR(30) NOT NULL UNIQUE,
    service_name VARCHAR(150) NOT NULL,
    description TEXT,
    default_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
    default_gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    billing_type VARCHAR(50) NOT NULL DEFAULT 'Recurring',
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
    agreed_fee NUMERIC(12, 2) NOT NULL,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    billing_frequency VARCHAR(50) NOT NULL DEFAULT 'Monthly',
    payment_terms VARCHAR(100) DEFAULT 'Immediate',
    relationship_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_fee_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_engagement_id UUID NOT NULL REFERENCES service_engagements(id) ON DELETE CASCADE,
    effective_from DATE NOT NULL,
    fee_amount NUMERIC(12, 2) NOT NULL,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    reason_for_change TEXT,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. WORKFLOW TEMPLATES & CASCADE STAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_id UUID REFERENCES services(id) ON DELETE SET NULL,
    workflow_name VARCHAR(150) NOT NULL UNIQUE,
    workflow_code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    whatsapp_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    version_number INT NOT NULL DEFAULT 1,
    is_published BOOLEAN NOT NULL DEFAULT false,
    definition JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_template_id, version_number)
);

CREATE TABLE IF NOT EXISTS workflow_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    stage_name VARCHAR(150) NOT NULL,
    stage_order INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_template_id UUID NOT NULL REFERENCES workflow_templates(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    milestone_order INT NOT NULL DEFAULT 1,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_sub_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    sub_stage_name VARCHAR(150) NOT NULL,
    sub_stage_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    workflow_sub_stage_id UUID REFERENCES workflow_sub_stages(id) ON DELETE SET NULL,
    task_name VARCHAR(200) NOT NULL,
    task_order INT NOT NULL DEFAULT 1,
    duration_days INT NOT NULL DEFAULT 1,
    start_day_offset INT NOT NULL DEFAULT 0,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    default_assignee_role VARCHAR(50),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_subtasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_task_id UUID NOT NULL REFERENCES workflow_tasks(id) ON DELETE CASCADE,
    subtask_name VARCHAR(200) NOT NULL,
    subtask_order INT NOT NULL DEFAULT 1,
    duration_days INT NOT NULL DEFAULT 1,
    start_day_offset INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS workflow_conditions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    target_stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    condition_expression TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. PROJECTS & WORKFLOW EXECUTION
-- ============================================================================

CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_code VARCHAR(30) NOT NULL UNIQUE,
    project_name VARCHAR(200) NOT NULL,
    project_type VARCHAR(50) NOT NULL DEFAULT 'Client Project',
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    service_engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL,
    description TEXT,
    project_manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'In Progress',
    progress_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'Contributor',
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, employee_id)
);

CREATE TABLE IF NOT EXISTS project_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    workflow_template_id UUID REFERENCES workflow_templates(id) ON DELETE SET NULL,
    current_stage_id UUID REFERENCES workflow_stages(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_workflow_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_workflow_id UUID NOT NULL REFERENCES project_workflows(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES workflow_stages(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    sign_off_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. TASKS, SUBTASKS, ASSIGNMENTS & DISCUSSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_code VARCHAR(30) NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    project_workflow_stage_id UUID REFERENCES project_workflow_stages(id) ON DELETE SET NULL,
    title VARCHAR(250) NOT NULL,
    description TEXT,
    assigned_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    start_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'To Do',
    category_id VARCHAR(100),
    sub_category_id VARCHAR(100),
    milestone_id VARCHAR(100),
    milestone_title VARCHAR(200),
    stage_id VARCHAR(100),
    stage_title VARCHAR(200),
    sub_stage_id VARCHAR(100),
    sub_stage_title VARCHAR(200),
    whatsapp_enabled BOOLEAN DEFAULT true,
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
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES file_objects(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    previous_status VARCHAR(30),
    new_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. INVOICING, BILLING & PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoice_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    financial_year VARCHAR(10) NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT 'INV',
    next_number INT NOT NULL DEFAULT 1,
    padding INT NOT NULL DEFAULT 4,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(financial_year, prefix)
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    service_engagement_id UUID REFERENCES service_engagements(id) ON DELETE SET NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    outstanding_amount NUMERIC(12, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    pdf_file_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
    notes TEXT,
    terms_and_conditions TEXT,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    item_order INT NOT NULL DEFAULT 1,
    description TEXT NOT NULL,
    hsn_sac VARCHAR(20),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12, 2) NOT NULL,
    gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
    line_total NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12, 2) NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    transaction_reference VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'Cleared',
    recorded_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_note_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    reason TEXT NOT NULL,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    channel VARCHAR(30) NOT NULL DEFAULT 'Email',
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    status VARCHAR(30) NOT NULL DEFAULT 'Sent'
);

-- ============================================================================
-- 10. NOTIFICATIONS, AUDIT & SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    actor_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
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
    entity_id VARCHAR(100) NOT NULL,
    approval_type VARCHAR(50) NOT NULL,
    requested_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS office_geo_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_name VARCHAR(100) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMPTZ,
    check_out_time TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'Present',
    check_in_lat NUMERIC(10, 7),
    check_in_lng NUMERIC(10, 7),
    is_within_geo BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(employee_id, attendance_date)
);

-- ============================================================================
-- 11. PRACTICE TASK CATEGORIES, SUB-GROUPS, STATUSES & RECYCLE BIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS task_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    status_order INT NOT NULL DEFAULT 1,
    name VARCHAR(50) NOT NULL UNIQUE,
    label VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(30) NOT NULL DEFAULT 'slate',
    is_terminal BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_categories (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    color VARCHAR(30) NOT NULL DEFAULT 'violet',
    icon VARCHAR(50) NOT NULL DEFAULT 'Layers',
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_sub_categories (
    id VARCHAR(100) PRIMARY KEY,
    category_id VARCHAR(100) NOT NULL REFERENCES task_categories(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(30) NOT NULL,
    description TEXT,
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS universal_recycle_bin (
    id VARCHAR(100) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    entity_name VARCHAR(255) NOT NULL,
    entity_code VARCHAR(50),
    data JSONB NOT NULL,
    deleted_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    deleted_by_name VARCHAR(150),
    deleted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    permanent_delete_eligible_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    template_type VARCHAR(50) NOT NULL DEFAULT 'general',
    variables JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. ENCRYPTED CREDENTIAL VAULT & AUDIT TRAIL (AES-256-GCM READY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS vault_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portal_name TEXT NOT NULL,
    login_url TEXT,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    registered_email TEXT,
    registered_mobile TEXT,
    account_holder_name TEXT,
    category TEXT DEFAULT 'Taxation',
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT,
    assigned_employee_ids JSONB DEFAULT '[]'::jsonb,
    assigned_employee_names TEXT,
    notes TEXT,
    password_history JSONB DEFAULT '[]'::jsonb,
    last_password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    rotation_reminder_days INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_by_name TEXT
);

CREATE TABLE IF NOT EXISTS vault_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credential_id UUID,
    portal_name TEXT NOT NULL,
    action TEXT NOT NULL,
    performed_by_id UUID,
    performed_by_name TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details TEXT,
    client_name TEXT
);

-- ============================================================================
-- 13. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client_id ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_addresses_client_id ON client_addresses(client_id);
CREATE INDEX IF NOT EXISTS idx_client_bank_accounts_client_id ON client_bank_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_service_engagements_client_id ON service_engagements(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_employee ON tasks(assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_category_id ON tasks(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_emp ON task_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_vault_credentials_client ON vault_credentials(client_id);
CREATE INDEX IF NOT EXISTS idx_vault_audit_logs_cred ON vault_audit_logs(credential_id);

-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS) & DIRECT WEB ACCESS POLICIES
-- ============================================================================

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE designations ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_private_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_objects ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE workflow_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_sub_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_workflow_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE office_geo_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE universal_recycle_bin ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE vault_audit_logs ENABLE ROW LEVEL SECURITY;

-- Apply Open Access Policies to enable persistent read/write for all application modules
DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'roles', 'permissions', 'role_permissions', 'users', 'user_roles',
        'departments', 'designations', 'employees', 'employee_private_details',
        'teams', 'team_members', 'file_objects', 'clients', 'client_contacts',
        'client_addresses', 'client_registrations', 'client_bank_accounts', 'client_documents',
        'services', 'service_engagements', 'service_fee_records', 'workflow_templates',
        'workflow_template_versions', 'workflow_stages', 'workflow_milestones',
        'workflow_sub_stages', 'workflow_tasks', 'workflow_subtasks', 'workflow_conditions',
        'projects', 'project_assignments', 'project_milestones', 'project_workflows',
        'project_workflow_stages', 'tasks', 'task_assignments', 'task_comments',
        'task_attachments', 'task_status_history', 'invoice_sequences', 'invoices',
        'invoice_items', 'payments', 'payment_allocations', 'credit_notes',
        'payment_reminders', 'notifications', 'activity_logs', 'system_settings',
        'approval_records', 'office_geo_configs', 'attendance_records', 'task_statuses',
        'task_categories', 'task_sub_categories', 'universal_recycle_bin', 'whatsapp_templates',
        'vault_credentials', 'vault_audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Direct access to %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Direct access to %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;

-- ============================================================================
-- 15. ESSENTIAL CORE LOOKUPS ONLY (NO MOCK / NO FAKE DATA)
-- ============================================================================

-- Core System Roles
INSERT INTO roles (role_code, role_name, description, is_system_role)
VALUES 
    ('super_admin', 'Super Admin / Managing Partner', 'Unrestricted administrative access across entire firm', true),
    ('firm_admin', 'Firm Administrator', 'Administrative firm management without system-level override', true),
    ('employee', 'Professional Staff / Employee', 'Standard employee role for tasks, workflows, and attendance', true)
ON CONFLICT (role_code) DO NOTHING;

-- Standard Deliverable Task Statuses
INSERT INTO task_statuses (status_order, name, label, color, is_terminal)
VALUES
    (1, 'To Do', 'To Do', 'slate', false),
    (2, 'In Progress', 'In Progress', 'blue', false),
    (3, 'Pending', 'Pending', 'amber', false),
    (4, 'Under Review', 'Under Review', 'purple', false),
    (5, 'Completed', 'Completed', 'emerald', true),
    (6, 'Blocked', 'Blocked', 'rose', false)
ON CONFLICT (name) DO UPDATE SET 
    label = EXCLUDED.label, 
    color = EXCLUDED.color,
    status_order = EXCLUDED.status_order,
    is_terminal = EXCLUDED.is_terminal;

-- Standard Firm Practice Categories
INSERT INTO task_categories (id, name, code, description, color, icon, whatsapp_enabled)
VALUES
    ('cat-tax', 'Taxation & Compliance', 'TAX', 'Direct & Indirect Tax Filings, GST & Returns', 'violet', 'FileText', true),
    ('cat-audit', 'Audit & Assurance', 'AUD', 'Statutory, Internal, Tax & Special Audits', 'sky', 'ShieldCheck', true),
    ('cat-roc', 'Corporate & Secretarial', 'ROC', 'MCA, ROC, Entity Formations & Filings', 'amber', 'Briefcase', true),
    ('cat-acc', 'Accounting & Bookkeeping', 'ACC', 'Monthly Bookkeeping, Finalization & Payroll', 'emerald', 'Receipt', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    code = EXCLUDED.code, 
    color = EXCLUDED.color,
    icon = EXCLUDED.icon;

-- Standard Sub-categories
INSERT INTO task_sub_categories (id, category_id, name, code, description, whatsapp_enabled)
VALUES
    ('subcat-tax-gst', 'cat-tax', 'Indirect Tax (GST)', 'GST', 'GSTR-1, GSTR-3B, GSTR-9/9C Filings', true),
    ('subcat-income-tax', 'cat-tax', 'Direct Tax / Income Tax', 'ITR', 'ITR Filings, Advance Tax, Scrutiny', true),
    ('subcat-tds', 'cat-tax', 'TDS & TCS Returns', 'TDS', 'Form 24Q, 26Q, 27Q, 15CA/CB', true),
    ('subcat-stat-audit', 'cat-audit', 'Statutory Financial Audit', 'STAT', 'Companies Act Statutory Financial Audit', true),
    ('subcat-tax-audit', 'cat-audit', 'Tax Audit (Form 3CD)', '3CD', 'Income Tax Act 44AB Tax Audit', true),
    ('subcat-internal-audit', 'cat-audit', 'Internal & Operations Audit', 'INT', 'Risk, Internal Controls & Management Audits', true),
    ('subcat-roc-annual', 'cat-roc', 'Annual ROC Filings', 'ROCA', 'AOC-4, MGT-7, KYC Filings', true),
    ('subcat-roc-incorp', 'cat-roc', 'Entity Formation & Restructuring', 'INCP', 'Private Limited, LLP & Partnership Formation', true),
    ('subcat-bookkeeping', 'cat-acc', 'Monthly Bookkeeping & Finalization', 'BOOK', 'Ledger Finalization, P&L, Balance Sheet', true),
    ('subcat-payroll', 'cat-acc', 'Payroll, PF & ESI Processing', 'PAY', 'Monthly Payroll & Statutory Deductions', true)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name, 
    code = EXCLUDED.code;

-- Standard WhatsApp Templates (Placeholders ready for live production use)
INSERT INTO whatsapp_templates (id, name, content, template_type, variables, is_default)
VALUES
    ('tpl-due-reminder', 'Deliverable Due Reminder', '⏰ *REMINDER: TASK DUE SOON*
Dear {{client_name}},
This is an alert from our office regarding deliverable: *{{task_title}}*.
Scheduled Due Date: *{{due_date}}*.
Please share any remaining documents or approvals to ensure timely compliance.', 'task', '["client_name", "task_title", "due_date"]'::jsonb, true),
    ('tpl-doc-request', 'Document Submission Request', '📁 *PENDING DOCUMENTS REQUIRED*
Dear {{client_name}},
To proceed with your scheduled filing *{{task_title}}*, we kindly request the pending records.
Kindly send them via WhatsApp or email at your earliest convenience.', 'task', '["client_name", "task_title"]'::jsonb, false),
    ('tpl-filing-done', 'Filing & Deliverable Completed', '✅ *FILING COMPLETED SUCCESSFULLY*
Dear {{client_name}},
We are pleased to inform you that *{{task_title}}* has been successfully filed and completed.
Acknowledgment receipt has been archived to your client folder.', 'task', '["client_name", "task_title"]'::jsonb, false),
    ('tpl-general-comm', 'General Client Communication', '💼 *OFFICIAL FIRM COMMUNICATION*
Dear {{client_name}},
We hope this message finds you well. Regarding your ongoing practice services:
Please let us know if you need any assistance.', 'general', '["client_name"]'::jsonb, false)
ON CONFLICT (id) DO UPDATE SET 
    content = EXCLUDED.content, 
    variables = EXCLUDED.variables;

-- ============================================================================
-- END OF CLEAN PRODUCTION SCHEMA (ZERO MOCK DATA)
-- ============================================================================
