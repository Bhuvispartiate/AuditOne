-- ============================================================================
-- PMS FINANCE & INVOICE MANAGEMENT - DDL SCHEMA / MIGRATION SCRIPT
-- Pure DDL Script: Zero Mock Data, Zero INSERT statements.
-- Safe to run on new or existing Supabase PostgreSQL databases.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TASK MANAGEMENT - BILLING INTEGRATION COLUMNS
-- ============================================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_billable BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billed_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pending_approval_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billing_status VARCHAR(50) NOT NULL DEFAULT 'To Be Billed';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS billing_description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';

-- Constraint on billing_status
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_tasks_billing_status'
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT chk_tasks_billing_status 
            CHECK (billing_status IN ('To Be Billed', 'Partially Billed', 'Billed'));
    END IF;
END $$;

-- Indexes for task billing queries
CREATE INDEX IF NOT EXISTS idx_tasks_billing ON tasks(is_billable, billing_status);
CREATE INDEX IF NOT EXISTS idx_tasks_billable_client ON tasks(client_id, is_billable, status);

-- ============================================================================
-- 2. BULK INVOICE BATCHES
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_invoice_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(100) NOT NULL UNIQUE,
    batch_name VARCHAR(255),
    total_clients INT NOT NULL DEFAULT 0,
    total_tasks INT NOT NULL DEFAULT 0,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_APPROVAL',
    created_by_id UUID,
    created_by_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bulk_batches_status ON bulk_invoice_batches(status);

-- ============================================================================
-- 3. RECURRING INVOICES (RETAINERS - INDEPENDENT OF TASKS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    profile_name VARCHAR(255) NOT NULL,
    frequency VARCHAR(50) NOT NULL DEFAULT 'MONTHLY',
    billing_day INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    auto_generate BOOLEAN NOT NULL DEFAULT false,
    require_approval BOOLEAN NOT NULL DEFAULT true,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by_id UUID,
    created_by_name VARCHAR(150),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Frequency & status constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recurring_frequency') THEN
        ALTER TABLE recurring_invoices ADD CONSTRAINT chk_recurring_frequency 
            CHECK (frequency IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_recurring_status') THEN
        ALTER TABLE recurring_invoices ADD CONSTRAINT chk_recurring_status 
            CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_client ON recurring_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_date ON recurring_invoices(next_billing_date, status);

-- ============================================================================
-- 4. INVOICE REQUESTS (APPROVAL PIPELINE FOR SINGLE, BULK, & RECURRING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(100) NOT NULL UNIQUE,
    request_type VARCHAR(50) NOT NULL DEFAULT 'SINGLE', -- 'SINGLE', 'BULK', 'RECURRING'
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    bulk_batch_id UUID REFERENCES bulk_invoice_batches(id) ON DELETE SET NULL,
    recurring_profile_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending Approval',
    subtotal NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    cgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_gst NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    place_of_supply VARCHAR(100) DEFAULT 'Tamil Nadu',
    is_interstate BOOLEAN DEFAULT false,
    notes TEXT,
    terms_conditions TEXT,
    rejection_reason TEXT,
    generated_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    generated_invoice_number VARCHAR(100),
    requested_by_id UUID,
    requested_by_name VARCHAR(150),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_by UUID,
    approved_by_name VARCHAR(150),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist in case table was created earlier with fewer fields
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS request_type VARCHAR(50) DEFAULT 'SINGLE';
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS bulk_batch_id UUID REFERENCES bulk_invoice_batches(id) ON DELETE SET NULL;
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS recurring_profile_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL;
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE invoice_requests ADD COLUMN IF NOT EXISTS grand_total NUMERIC(15,2) DEFAULT 0.00;

CREATE INDEX IF NOT EXISTS idx_invoice_requests_client ON invoice_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_status ON invoice_requests(status);
CREATE INDEX IF NOT EXISTS idx_invoice_requests_batch ON invoice_requests(bulk_batch_id);

-- ============================================================================
-- 5. INVOICE REQUEST ITEMS (LINKED TO TASKS OR RECURRING SERVICES)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_request_id UUID NOT NULL REFERENCES invoice_requests(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    task_code VARCHAR(50),
    task_title VARCHAR(250),
    description TEXT NOT NULL,
    sac_code VARCHAR(50) DEFAULT '998222',
    billable_task_total NUMERIC(15,2) DEFAULT 0.00,
    billable_task_remaining NUMERIC(15,2) DEFAULT 0.00,
    quantity NUMERIC(10,2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    cgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Defensive schema upgrade: if invoice_request_items already existed, ensure columns exist
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS invoice_request_id UUID REFERENCES invoice_requests(id) ON DELETE CASCADE;
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS task_code VARCHAR(50);
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS task_title VARCHAR(250);
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS sac_code VARCHAR(50) DEFAULT '998222';
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS billable_task_total NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS billable_task_remaining NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0.00;
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 18.00;
ALTER TABLE invoice_request_items ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0.00;

-- Safe index creation using the canonical column invoice_request_id
CREATE INDEX IF NOT EXISTS idx_req_items_invoice_req ON invoice_request_items(invoice_request_id);
CREATE INDEX IF NOT EXISTS idx_req_items_task ON invoice_request_items(task_id);

-- ============================================================================
-- 6. INVOICE APPROVAL AUDIT LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_request_id UUID NOT NULL REFERENCES invoice_requests(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'SUBMITTED', 'APPROVED', 'REJECTED', 'INVOICE_GENERATED'
    actor_id UUID,
    actor_name VARCHAR(150) NOT NULL,
    actor_role VARCHAR(100) DEFAULT 'Admin',
    notes TEXT,
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Defensive schema upgrade: ensure invoice_request_id exists
ALTER TABLE invoice_approval_logs ADD COLUMN IF NOT EXISTS invoice_request_id UUID REFERENCES invoice_requests(id) ON DELETE CASCADE;
ALTER TABLE invoice_approval_logs ADD COLUMN IF NOT EXISTS actor_name VARCHAR(150);
ALTER TABLE invoice_approval_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_approval_logs_invoice_req ON invoice_approval_logs(invoice_request_id);

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) & DIRECT WEB ACCESS POLICIES
-- ============================================================================
ALTER TABLE bulk_invoice_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_approval_logs ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl text;
    tbls text[] := ARRAY[
        'bulk_invoice_batches',
        'recurring_invoices',
        'invoice_requests',
        'invoice_request_items',
        'invoice_approval_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tbls LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Direct access to %I" ON %I;', tbl, tbl);
        EXECUTE format('CREATE POLICY "Direct access to %I" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl, tbl);
    END LOOP;
END $$;
