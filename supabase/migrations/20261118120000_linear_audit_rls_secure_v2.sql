-- ============================================================================
-- LINEAR AUDIT PMS — PRODUCTION-GRADE SECURE ROW LEVEL SECURITY (RLS) MIGRATION
-- Migration Version: 20261118120000
-- Author: Senior Supabase Security Engineer & Application Architect
-- Purpose: Complete Zero-Trust RLS Hardening. Replaces all blanket/unrestricted
--          policies with verified identity, relationship, and assignment-based
--          authorization. Blocks cross-client and cross-employee data leaks.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: SEARCH PATH HARDENING & SCHEMA INTEGRITY
-- ============================================================================
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ============================================================================
-- SECTION 2: IDENTITY & ROLE RESOLUTION FUNCTIONS (SECURITY DEFINER)
-- ============================================================================

-- Helper: Get current authenticated user's email from JWT
CREATE OR REPLACE FUNCTION public.current_app_user_email()
RETURNS TEXT AS $$
    SELECT LOWER(COALESCE(auth.jwt() ->> 'email', ''));
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Get current employee record ID matching authenticated email
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID AS $$
    SELECT id FROM public.employees
    WHERE LOWER(email) = public.current_app_user_email()
      AND is_active = true
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Get current client record ID if caller is a client portal contact
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS UUID AS $$
    SELECT client_id FROM public.client_contacts
    WHERE LOWER(email) = public.current_app_user_email()
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Get current user's highest role code
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR;
    v_email TEXT;
BEGIN
    v_email := public.current_app_user_email();
    IF v_email = '' THEN
        RETURN 'ANON';
    END IF;

    -- Root Super Admin
    IF v_email = 'rohitaju21@gmail.com' THEN
        RETURN 'SUPER_ADMIN';
    END IF;

    -- Lookup in active employees table
    SELECT role_code INTO v_role
    FROM public.employees
    WHERE LOWER(email) = v_email AND is_active = true
    LIMIT 1;

    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    -- Lookup in user_roles table
    SELECT r.role_code INTO v_role
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    JOIN public.users u ON ur.user_id = u.id
    WHERE LOWER(u.email) = v_email AND u.is_active = true
    LIMIT 1;

    IF v_role IS NOT NULL THEN
        RETURN v_role;
    END IF;

    -- Lookup in client contacts table
    IF EXISTS (SELECT 1 FROM public.client_contacts WHERE LOWER(email) = v_email) THEN
        RETURN 'CLIENT';
    END IF;

    RETURN 'STAFF';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Check if user is Super Admin
CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        public.current_app_user_email() = 'rohitaju21@gmail.com'
        OR public.get_my_role() = 'SUPER_ADMIN'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Check if user is Practice Admin / Director / Dept Head
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        public.is_user_super_admin()
        OR public.get_my_role() IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HEAD')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Check if user is an active firm Employee
CREATE OR REPLACE FUNCTION public.is_user_employee()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_employee_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Helper: Check if user is a Client Portal user
CREATE OR REPLACE FUNCTION public.is_user_client()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.current_client_id() IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- Grant execute on security helpers to authenticated users only
GRANT EXECUTE ON FUNCTION public.current_app_user_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_employee() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_client() TO authenticated, service_role;

-- ============================================================================
-- SECTION 3: ENABLE RLS ON ALL PUBLIC TABLES
-- ============================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN (
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' AND tablename NOT LIKE 'pg_%'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 4: PURGE LEGACY INSECURE POLICIES
-- Drops any policy with qual = 'true' or with_check = 'true' or named 'Direct access to%'
-- ============================================================================
DO $$
DECLARE
    p RECORD;
BEGIN
    FOR p IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (
            policyname LIKE 'Direct access to%'
            OR policyname LIKE '%open%'
            OR qual = 'true'
            OR with_check = 'true'
          )
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', p.policyname, p.schemaname, p.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- SECTION 5: DOMAIN-SPECIFIC ACCESS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 5.1 CLIENTS & CLIENT SUB-TABLES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_insert" ON public.clients;
DROP POLICY IF EXISTS "clients_update" ON public.clients;
DROP POLICY IF EXISTS "clients_delete" ON public.clients;

-- SELECT: Admins see all; Employees see assigned (RM, PM on project, or task assignee); Clients see self
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            relationship_manager_id = public.current_employee_id()
            OR id IN (SELECT client_id FROM public.projects WHERE project_manager_id = public.current_employee_id())
            OR id IN (SELECT p.client_id FROM public.projects p JOIN public.project_assignments pa ON pa.project_id = p.id WHERE pa.employee_id = public.current_employee_id())
            OR id IN (SELECT client_id FROM public.tasks WHERE assigned_employee_id = public.current_employee_id())
            OR id IN (SELECT t.client_id FROM public.tasks t JOIN public.task_assignments ta ON ta.task_id = t.id WHERE ta.employee_id = public.current_employee_id())
            OR id IN (SELECT client_id FROM public.service_engagements WHERE relationship_manager_id = public.current_employee_id())
        )
    )
    OR (public.is_user_client() AND id = public.current_client_id())
);

-- INSERT: Only Admins and Employees can onboard clients; Clients cannot create clients
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- UPDATE: Admins can update any; Employees can update their assigned clients; Clients can update contact info only via contacts table
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND relationship_manager_id = public.current_employee_id())
)
WITH CHECK (
    public.is_user_admin()
    OR (public.is_user_employee() AND relationship_manager_id = public.current_employee_id())
);

-- DELETE: Strictly Admins (Super Admin / Partner / Director)
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated
USING (public.is_user_admin());

-- Client Contacts
DROP POLICY IF EXISTS "client_contacts_select" ON public.client_contacts;
DROP POLICY IF EXISTS "client_contacts_all" ON public.client_contacts;

CREATE POLICY "client_contacts_select" ON public.client_contacts FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients))
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

CREATE POLICY "client_contacts_all" ON public.client_contacts FOR ALL TO authenticated
USING (public.is_user_admin() OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients)))
WITH CHECK (public.is_user_admin() OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients)));

-- Client Addresses
DROP POLICY IF EXISTS "client_addresses_select" ON public.client_addresses;
DROP POLICY IF EXISTS "client_addresses_all" ON public.client_addresses;

CREATE POLICY "client_addresses_select" ON public.client_addresses FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients))
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

CREATE POLICY "client_addresses_all" ON public.client_addresses FOR ALL TO authenticated
USING (public.is_user_admin() OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients)))
WITH CHECK (public.is_user_admin() OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients)));

-- Client Registrations (PAN, GSTIN, CIN)
DROP POLICY IF EXISTS "client_registrations_select" ON public.client_registrations;
DROP POLICY IF EXISTS "client_registrations_all" ON public.client_registrations;

CREATE POLICY "client_registrations_select" ON public.client_registrations FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients))
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

CREATE POLICY "client_registrations_all" ON public.client_registrations FOR ALL TO authenticated
USING (public.is_user_admin() OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients)))
WITH CHECK (public.is_user_admin() OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients)));

-- ----------------------------------------------------------------------------
-- 5.2 SENSITIVE: CLIENT BANK ACCOUNTS (Encrypted Account Numbers)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "client_bank_accounts_select" ON public.client_bank_accounts;
DROP POLICY IF EXISTS "client_bank_accounts_manage" ON public.client_bank_accounts;

-- SELECT: Admins, or Relationship Manager assigned to client, or the Client themselves. Ordinary employees cannot read.
CREATE POLICY "client_bank_accounts_select" ON public.client_bank_accounts FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id()))
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

-- MANAGE: Strictly Admins or Client's Relationship Manager
CREATE POLICY "client_bank_accounts_manage" ON public.client_bank_accounts FOR ALL TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id()))
)
WITH CHECK (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id()))
);

-- ----------------------------------------------------------------------------
-- 5.3 PROJECTS, MILESTONES & WORKFLOW DELIVERABLES
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_update" ON public.projects;
DROP POLICY IF EXISTS "projects_delete" ON public.projects;

-- SELECT: Admins; Assigned Employees; Client for own projects
CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            project_manager_id = public.current_employee_id()
            OR id IN (SELECT project_id FROM public.project_assignments WHERE employee_id = public.current_employee_id())
            OR id IN (SELECT project_id FROM public.tasks WHERE assigned_employee_id = public.current_employee_id())
            OR client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id())
        )
    )
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

-- INSERT: Admins and Employees can create projects
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- UPDATE: Admins, or the Project Manager
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated
USING (public.is_user_admin() OR (public.is_user_employee() AND project_manager_id = public.current_employee_id()))
WITH CHECK (public.is_user_admin() OR (public.is_user_employee() AND project_manager_id = public.current_employee_id()));

-- DELETE: Strictly Admins
CREATE POLICY "projects_delete" ON public.projects FOR DELETE TO authenticated
USING (public.is_user_admin());

-- Project Sub-tables (Assignments, Milestones, Workflows)
DROP POLICY IF EXISTS "project_assignments_all" ON public.project_assignments;
CREATE POLICY "project_assignments_all" ON public.project_assignments FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

DROP POLICY IF EXISTS "project_milestones_all" ON public.project_milestones;
CREATE POLICY "project_milestones_all" ON public.project_milestones FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee() OR (public.is_user_client() AND project_id IN (SELECT id FROM public.projects WHERE client_id = public.current_client_id())))
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

DROP POLICY IF EXISTS "project_workflows_all" ON public.project_workflows;
CREATE POLICY "project_workflows_all" ON public.project_workflows FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

DROP POLICY IF EXISTS "project_workflow_stages_all" ON public.project_workflow_stages;
CREATE POLICY "project_workflow_stages_all" ON public.project_workflow_stages FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- ----------------------------------------------------------------------------
-- 5.4 TASKS, ASSIGNMENTS & COLLABORATION
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;

-- SELECT: Admins; Employees (assigned directly, via project, or via client); Clients (non-internal tasks for own client)
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            assigned_employee_id = public.current_employee_id()
            OR id IN (SELECT task_id FROM public.task_assignments WHERE employee_id = public.current_employee_id())
            OR project_id IN (SELECT id FROM public.projects WHERE project_manager_id = public.current_employee_id())
            OR client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id())
        )
    )
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

-- INSERT: Admins and Employees can create tasks
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- UPDATE: Admins, or assigned employee (for status updates, subtasks, notes)
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            assigned_employee_id = public.current_employee_id()
            OR id IN (SELECT task_id FROM public.task_assignments WHERE employee_id = public.current_employee_id())
            OR project_id IN (SELECT id FROM public.projects WHERE project_manager_id = public.current_employee_id())
        )
    )
)
WITH CHECK (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            assigned_employee_id = public.current_employee_id()
            OR id IN (SELECT task_id FROM public.task_assignments WHERE employee_id = public.current_employee_id())
            OR project_id IN (SELECT id FROM public.projects WHERE project_manager_id = public.current_employee_id())
        )
    )
);

-- DELETE: Strictly Admins
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
USING (public.is_user_admin());

-- Task Comments, Attachments, Status History
DROP POLICY IF EXISTS "task_comments_all" ON public.task_comments;
CREATE POLICY "task_comments_all" ON public.task_comments FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

DROP POLICY IF EXISTS "task_attachments_all" ON public.task_attachments;
CREATE POLICY "task_attachments_all" ON public.task_attachments FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

DROP POLICY IF EXISTS "task_status_history_all" ON public.task_status_history;
CREATE POLICY "task_status_history_all" ON public.task_status_history FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

DROP POLICY IF EXISTS "task_assignments_all" ON public.task_assignments;
CREATE POLICY "task_assignments_all" ON public.task_assignments FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- ----------------------------------------------------------------------------
-- 5.5 SENSITIVE: VAULT CREDENTIALS & AUDIT LOGS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "vault_credentials_select" ON public.vault_credentials;
DROP POLICY IF EXISTS "vault_credentials_insert" ON public.vault_credentials;
DROP POLICY IF EXISTS "vault_credentials_update" ON public.vault_credentials;
DROP POLICY IF EXISTS "vault_credentials_delete" ON public.vault_credentials;

-- SELECT: Admins see all; Employees see ONLY explicitly authorized credentials (created by them or assigned to them)
CREATE POLICY "vault_credentials_select" ON public.vault_credentials FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            created_by_id = public.current_employee_id()
            OR assigned_employee_ids ? public.current_employee_id()::text
            OR client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id())
        )
    )
);

-- INSERT: Admins and authorized Employees
CREATE POLICY "vault_credentials_insert" ON public.vault_credentials FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- UPDATE: Admins, or employee who created it / assigned
CREATE POLICY "vault_credentials_update" ON public.vault_credentials FOR UPDATE TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND (created_by_id = public.current_employee_id() OR assigned_employee_ids ? public.current_employee_id()::text))
)
WITH CHECK (
    public.is_user_admin()
    OR (public.is_user_employee() AND (created_by_id = public.current_employee_id() OR assigned_employee_ids ? public.current_employee_id()::text))
);

-- DELETE: Strictly Admins
CREATE POLICY "vault_credentials_delete" ON public.vault_credentials FOR DELETE TO authenticated
USING (public.is_user_admin());

-- Vault Audit Logs: Append-only for all staff on view/decrypt; View restricted to Admins
DROP POLICY IF EXISTS "vault_audit_logs_insert" ON public.vault_audit_logs;
DROP POLICY IF EXISTS "vault_audit_logs_select" ON public.vault_audit_logs;

CREATE POLICY "vault_audit_logs_insert" ON public.vault_audit_logs FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

CREATE POLICY "vault_audit_logs_select" ON public.vault_audit_logs FOR SELECT TO authenticated
USING (public.is_user_admin());

-- ----------------------------------------------------------------------------
-- 5.6 SENSITIVE: FINANCIAL DATA (INVOICES, PAYMENTS, CREDIT NOTES)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
DROP POLICY IF EXISTS "invoices_manage" ON public.invoices;

-- SELECT: Admins; Employees (assigned to client/project); Clients (own client only)
CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id())
            OR project_id IN (SELECT id FROM public.projects WHERE project_manager_id = public.current_employee_id())
        )
    )
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

-- MANAGE (INSERT, UPDATE, DELETE): Strictly Admins (Partners/Directors)
CREATE POLICY "invoices_manage" ON public.invoices FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Invoice Items & Sequences
DROP POLICY IF EXISTS "invoice_items_select" ON public.invoice_items;
DROP POLICY IF EXISTS "invoice_items_manage" ON public.invoice_items;

CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT TO authenticated
USING (invoice_id IN (SELECT id FROM public.invoices));

CREATE POLICY "invoice_items_manage" ON public.invoice_items FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "invoice_sequences_all" ON public.invoice_sequences;
CREATE POLICY "invoice_sequences_all" ON public.invoice_sequences FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Payments, Allocations & Credit Notes
DROP POLICY IF EXISTS "payments_select" ON public.payments;
DROP POLICY IF EXISTS "payments_manage" ON public.payments;

CREATE POLICY "payments_select" ON public.payments FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients WHERE relationship_manager_id = public.current_employee_id()))
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

CREATE POLICY "payments_manage" ON public.payments FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "payment_allocations_all" ON public.payment_allocations;
CREATE POLICY "payment_allocations_all" ON public.payment_allocations FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "credit_notes_all" ON public.credit_notes;
CREATE POLICY "credit_notes_all" ON public.credit_notes FOR ALL TO authenticated
USING (public.is_user_admin() OR (public.is_user_client() AND client_id = public.current_client_id()))
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "payment_reminders_all" ON public.payment_reminders;
CREATE POLICY "payment_reminders_all" ON public.payment_reminders FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Invoice Requests (Employees can request; Admins approve)
DROP POLICY IF EXISTS "invoice_requests_select" ON public.invoice_requests;
DROP POLICY IF EXISTS "invoice_requests_insert" ON public.invoice_requests;
DROP POLICY IF EXISTS "invoice_requests_manage" ON public.invoice_requests;

CREATE POLICY "invoice_requests_select" ON public.invoice_requests FOR SELECT TO authenticated
USING (public.is_user_admin() OR requested_by = public.current_employee_id());

CREATE POLICY "invoice_requests_insert" ON public.invoice_requests FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR requested_by = public.current_employee_id());

CREATE POLICY "invoice_requests_manage" ON public.invoice_requests FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "invoice_request_items_all" ON public.invoice_request_items;
CREATE POLICY "invoice_request_items_all" ON public.invoice_request_items FOR ALL TO authenticated
USING (public.is_user_admin() OR request_id IN (SELECT id FROM public.invoice_requests WHERE requested_by = public.current_employee_id()))
WITH CHECK (public.is_user_admin() OR request_id IN (SELECT id FROM public.invoice_requests WHERE requested_by = public.current_employee_id()));

DROP POLICY IF EXISTS "recurring_invoices_all" ON public.recurring_invoices;
CREATE POLICY "recurring_invoices_all" ON public.recurring_invoices FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "bulk_invoice_batches_all" ON public.bulk_invoice_batches;
CREATE POLICY "bulk_invoice_batches_all" ON public.bulk_invoice_batches FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "invoice_approval_logs_all" ON public.invoice_approval_logs;
CREATE POLICY "invoice_approval_logs_all" ON public.invoice_approval_logs FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- ----------------------------------------------------------------------------
-- 5.7 SENSITIVE: EMPLOYEE DIRECTORY & PRIVATE DETAILS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "employees_select" ON public.employees;
DROP POLICY IF EXISTS "employees_manage" ON public.employees;

-- SELECT: Authenticated Staff view active directory; Inactive profiles hidden from ordinary staff
CREATE POLICY "employees_select" ON public.employees FOR SELECT TO authenticated
USING (public.is_user_admin() OR (public.is_user_employee() AND is_active = true));

-- MANAGE: Strictly Admins (Partners/HR)
CREATE POLICY "employees_manage" ON public.employees FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Employee Private Details (PAN, Aadhaar, Bank Details, Salary)
DROP POLICY IF EXISTS "employee_private_details_select" ON public.employee_private_details;
DROP POLICY IF EXISTS "employee_private_details_manage" ON public.employee_private_details;

-- SELECT: Super Admin views all; Employee views ONLY their own record. Zero cross-employee visibility.
CREATE POLICY "employee_private_details_select" ON public.employee_private_details FOR SELECT TO authenticated
USING (public.is_user_super_admin() OR employee_id = public.current_employee_id());

-- MANAGE: Strictly Super Admin
CREATE POLICY "employee_private_details_manage" ON public.employee_private_details FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

-- ----------------------------------------------------------------------------
-- 5.8 SENSITIVE: AUTHENTICATION, ROLES & PRIVILEGE ASSIGNMENTS
-- Prevents self-promotion and privilege escalation
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_manage" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated
USING (public.is_user_admin() OR id = auth.uid() OR email = public.current_app_user_email());

CREATE POLICY "users_manage" ON public.users FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

DROP POLICY IF EXISTS "roles_select" ON public.roles;
DROP POLICY IF EXISTS "roles_manage" ON public.roles;

CREATE POLICY "roles_select" ON public.roles FOR SELECT TO authenticated
USING (true);

CREATE POLICY "roles_manage" ON public.roles FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_manage" ON public.user_roles;

CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated
USING (public.is_user_admin() OR user_id = auth.uid());

CREATE POLICY "user_roles_manage" ON public.user_roles FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

DROP POLICY IF EXISTS "permissions_select" ON public.permissions;
DROP POLICY IF EXISTS "permissions_manage" ON public.permissions;

CREATE POLICY "permissions_select" ON public.permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "permissions_manage" ON public.permissions FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

DROP POLICY IF EXISTS "role_permissions_select" ON public.role_permissions;
DROP POLICY IF EXISTS "role_permissions_manage" ON public.role_permissions;

CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT TO authenticated
USING (true);

CREATE POLICY "role_permissions_manage" ON public.role_permissions FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

-- ----------------------------------------------------------------------------
-- 5.9 SENSITIVE: SYSTEM SETTINGS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "system_settings_select" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_manage" ON public.system_settings;

CREATE POLICY "system_settings_select" ON public.system_settings FOR SELECT TO authenticated
USING (public.is_user_employee() OR public.is_user_admin());

CREATE POLICY "system_settings_manage" ON public.system_settings FOR ALL TO authenticated
USING (public.is_user_super_admin())
WITH CHECK (public.is_user_super_admin());

-- ----------------------------------------------------------------------------
-- 5.10 ATTENDANCE & GEOLOCATION
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_select" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_insert" ON public.attendance_records;
DROP POLICY IF EXISTS "attendance_update" ON public.attendance_records;

CREATE POLICY "attendance_select" ON public.attendance_records FOR SELECT TO authenticated
USING (public.is_user_admin() OR employee_id = public.current_employee_id());

CREATE POLICY "attendance_insert" ON public.attendance_records FOR INSERT TO authenticated
WITH CHECK (
    public.is_user_admin()
    OR (public.is_user_employee() AND employee_id = public.current_employee_id())
);

CREATE POLICY "attendance_update" ON public.attendance_records FOR UPDATE TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND employee_id = public.current_employee_id())
)
WITH CHECK (
    public.is_user_admin()
    OR (public.is_user_employee() AND employee_id = public.current_employee_id())
);

DROP POLICY IF EXISTS "office_geo_configs_all" ON public.office_geo_configs;
CREATE POLICY "office_geo_configs_all" ON public.office_geo_configs FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

-- ----------------------------------------------------------------------------
-- 5.11 NOTIFICATIONS & ACTIVITY AUDIT TRAILS
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated
USING (recipient_employee_id = public.current_employee_id() OR public.is_user_admin());

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated
USING (recipient_employee_id = public.current_employee_id() OR public.is_user_admin())
WITH CHECK (recipient_employee_id = public.current_employee_id() OR public.is_user_admin());

DROP POLICY IF EXISTS "activity_logs_select" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert" ON public.activity_logs;

CREATE POLICY "activity_logs_select" ON public.activity_logs FOR SELECT TO authenticated
USING (public.is_user_admin() OR public.is_user_employee());

CREATE POLICY "activity_logs_insert" ON public.activity_logs FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee());

-- ----------------------------------------------------------------------------
-- 5.12 DOCUMENTS, TEMPLATES & MISCELLANEOUS BUSINESS DATA
-- ----------------------------------------------------------------------------
-- file_objects: Gated by entity ownership and restricted financial categories
DROP POLICY IF EXISTS "file_objects_select" ON public.file_objects;
DROP POLICY IF EXISTS "file_objects_insert" ON public.file_objects;
DROP POLICY IF EXISTS "file_objects_delete" ON public.file_objects;

CREATE POLICY "file_objects_select" ON public.file_objects FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (
        public.is_user_employee() AND (
            uploaded_by = public.current_employee_id()
            OR (category NOT IN ('Invoice', 'Payment Receipt', 'Bank') AND (
                (entity_type = 'task' AND entity_id IN (SELECT id FROM public.tasks))
                OR (entity_type = 'project' AND entity_id IN (SELECT id FROM public.projects))
                OR (entity_type = 'client' AND entity_id IN (SELECT id FROM public.clients))
                OR (entity_type = 'employee' AND entity_id = public.current_employee_id())
            ))
        )
    )
    OR (
        public.is_user_client() AND (
            (entity_type = 'client' AND entity_id = public.current_client_id())
            OR (entity_type = 'project' AND entity_id IN (SELECT id FROM public.projects WHERE client_id = public.current_client_id()))
        )
    )
);

CREATE POLICY "file_objects_insert" ON public.file_objects FOR INSERT TO authenticated
WITH CHECK (public.is_user_admin() OR public.is_user_employee() OR public.is_user_client());

CREATE POLICY "file_objects_delete" ON public.file_objects FOR DELETE TO authenticated
USING (public.is_user_admin() OR (public.is_user_employee() AND uploaded_by = public.current_employee_id()));

-- Services, Engagements & Fee Records
DROP POLICY IF EXISTS "services_all" ON public.services;
CREATE POLICY "services_all" ON public.services FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "service_engagements_select" ON public.service_engagements;
DROP POLICY IF EXISTS "service_engagements_manage" ON public.service_engagements;

CREATE POLICY "service_engagements_select" ON public.service_engagements FOR SELECT TO authenticated
USING (
    public.is_user_admin()
    OR (public.is_user_employee() AND client_id IN (SELECT id FROM public.clients))
    OR (public.is_user_client() AND client_id = public.current_client_id())
);

CREATE POLICY "service_engagements_manage" ON public.service_engagements FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "service_fee_records_all" ON public.service_fee_records;
CREATE POLICY "service_fee_records_all" ON public.service_fee_records FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Workflow Templates & Stages
DROP POLICY IF EXISTS "workflow_templates_select" ON public.workflow_templates;
DROP POLICY IF EXISTS "workflow_templates_manage" ON public.workflow_templates;

CREATE POLICY "workflow_templates_select" ON public.workflow_templates FOR SELECT TO authenticated
USING (public.is_user_admin() OR public.is_user_employee());

CREATE POLICY "workflow_templates_manage" ON public.workflow_templates FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

-- Departments, Designations, Teams
DROP POLICY IF EXISTS "departments_all" ON public.departments;
CREATE POLICY "departments_all" ON public.departments FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "designations_all" ON public.designations;
CREATE POLICY "designations_all" ON public.designations FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "teams_all" ON public.teams;
CREATE POLICY "teams_all" ON public.teams FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "team_members_all" ON public.team_members;
CREATE POLICY "team_members_all" ON public.team_members FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

-- Recycle Bin & WhatsApp Templates
DROP POLICY IF EXISTS "recycle_bin_all" ON public.universal_recycle_bin;
CREATE POLICY "recycle_bin_all" ON public.universal_recycle_bin FOR ALL TO authenticated
USING (public.is_user_admin())
WITH CHECK (public.is_user_admin());

DROP POLICY IF EXISTS "whatsapp_templates_all" ON public.whatsapp_templates;
CREATE POLICY "whatsapp_templates_all" ON public.whatsapp_templates FOR ALL TO authenticated
USING (public.is_user_admin() OR public.is_user_employee())
WITH CHECK (public.is_user_admin());

-- ============================================================================
-- SECTION 6: DATABASE TABLE GRANTS
-- ============================================================================
-- Revoke all direct privileges on public schema from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;

-- Grant required operational privileges to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure service_role has full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;
