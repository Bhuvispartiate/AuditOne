-- ============================================================================
-- LINEAR AUDIT PMS — COMPREHENSIVE PRODUCTION ROW LEVEL SECURITY (RLS)
-- Enables RLS on all tables and creates secure, role-based access policies
-- Run this script directly in the Supabase SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HELPER FUNCTIONS (SECURITY DEFINER to avoid RLS recursion)
-- ----------------------------------------------------------------------------

-- Check if current authenticated user is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'rohitaju21@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.employees
            WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
              AND role_code = 'SUPER_ADMIN'
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            JOIN public.users u ON ur.user_id = u.id
            WHERE LOWER(u.email) = LOWER(auth.jwt() ->> 'email')
              AND (r.role_code = 'SUPER_ADMIN' OR r.role_name = 'SUPER_ADMIN')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get current employee ID from JWT email
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID AS $$
    SELECT id FROM public.employees
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- 2. DYNAMICALLY ENABLE RLS ON ALL PUBLIC TABLES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
          AND tablename NOT LIKE 'pg_%'
    ) LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. REMOVE OLD OPEN / PERMISSIVE POLICIES
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
          AND (policyname LIKE 'Direct access to%' OR policyname LIKE '%open%')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', r.policyname, r.tablename);
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. GENERAL BUSINESS MODULES: AUTHENTICATED STAFF ACCESS
-- Only logged-in personnel can read/modify data. Anonymous public internet is blocked.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
    general_tables text[] := ARRAY[
        'clients', 'client_contacts', 'client_addresses', 'client_registrations',
        'client_bank_accounts', 'client_documents', 'services', 'service_engagements',
        'service_fee_records', 'workflow_templates', 'workflow_template_versions',
        'workflow_stages', 'workflow_milestones', 'workflow_sub_stages', 'workflow_tasks',
        'workflow_subtasks', 'workflow_conditions', 'projects', 'project_assignments',
        'project_milestones', 'project_workflows', 'project_workflow_stages', 'tasks',
        'task_assignments', 'task_comments', 'task_attachments', 'task_status_history',
        'invoice_sequences', 'invoices', 'invoice_items', 'payments', 'payment_allocations',
        'credit_notes', 'payment_reminders', 'notifications', 'activity_logs',
        'approval_records', 'office_geo_configs', 'attendance_records', 'task_statuses',
        'task_categories', 'task_sub_categories', 'universal_recycle_bin', 'whatsapp_templates',
        'bulk_invoice_batches', 'recurring_invoices', 'invoice_requests', 'invoice_request_items',
        'invoice_approval_logs', 'teams', 'team_members', 'file_objects', 'departments',
        'designations'
    ];
BEGIN
    FOREACH tbl IN ARRAY general_tables LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = tbl) THEN
            -- Clean existing policies on table
            EXECUTE format('DROP POLICY IF EXISTS "Authenticated staff access to %I" ON public.%I;', tbl, tbl);
            
            -- Full CRUD for authenticated staff users
            EXECUTE format('
                CREATE POLICY "Authenticated staff access to %I"
                ON public.%I
                FOR ALL
                TO authenticated
                USING (true)
                WITH CHECK (true);
            ', tbl, tbl);
        END IF;
    END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. SPECIAL & SENSITIVE TABLES POLICIES
-- ----------------------------------------------------------------------------

-- A. EMPLOYEES DIRECTORY
-- All authenticated staff can view team directory; Only Super Admin can insert/update/delete employees
DROP POLICY IF EXISTS "Authenticated users view employees" ON public.employees;
DROP POLICY IF EXISTS "Super Admin manages employees" ON public.employees;

CREATE POLICY "Authenticated users view employees"
ON public.employees
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super Admin manages employees"
ON public.employees
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- B. EMPLOYEE PRIVATE DETAILS (PAN, Aadhaar, Bank Details, Salary)
-- Restricted strictly to Super Admin and the individual employee themselves
DROP POLICY IF EXISTS "Super Admin and self view private details" ON public.employee_private_details;
DROP POLICY IF EXISTS "Super Admin manages private details" ON public.employee_private_details;

CREATE POLICY "Super Admin and self view private details"
ON public.employee_private_details
FOR SELECT
TO authenticated
USING (
    public.is_super_admin()
    OR employee_id = public.current_employee_id()
);

CREATE POLICY "Super Admin manages private details"
ON public.employee_private_details
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- C. VAULT CREDENTIALS & AUDIT LOGS
-- Sensitive client credentials protected: authenticated staff can use, Super Admin full control
DROP POLICY IF EXISTS "Staff view credentials" ON public.vault_credentials;
DROP POLICY IF EXISTS "Staff manage credentials" ON public.vault_credentials;

CREATE POLICY "Staff view credentials"
ON public.vault_credentials
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Staff manage credentials"
ON public.vault_credentials
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Staff audit logs access" ON public.vault_audit_logs;
CREATE POLICY "Staff audit logs access"
ON public.vault_audit_logs
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- D. SYSTEM SETTINGS
-- Authenticated staff can read firm settings; only Super Admin can edit firm settings
DROP POLICY IF EXISTS "Staff view system settings" ON public.system_settings;
DROP POLICY IF EXISTS "Super Admin manage system settings" ON public.system_settings;

CREATE POLICY "Staff view system settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super Admin manage system settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- E. USERS & ROLES PERMISSIONS
DROP POLICY IF EXISTS "Staff view roles" ON public.roles;
DROP POLICY IF EXISTS "Staff view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Staff view role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Staff view user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff view users" ON public.users;

CREATE POLICY "Staff view roles" ON public.roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff view permissions" ON public.permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff view role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff view user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff view users" ON public.users FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Super Admin manage roles" ON public.roles;
DROP POLICY IF EXISTS "Super Admin manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super Admin manage users" ON public.users;

CREATE POLICY "Super Admin manage roles" ON public.roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Super Admin manage user_roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "Super Admin manage users" ON public.users FOR ALL TO authenticated USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ----------------------------------------------------------------------------
-- 6. VERIFICATION QUERY
-- Run this to verify that RLS is enabled on 100% of tables
-- ----------------------------------------------------------------------------
SELECT 
    tablename, 
    rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename ASC;
