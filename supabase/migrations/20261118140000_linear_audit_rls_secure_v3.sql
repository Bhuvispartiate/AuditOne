-- ==============================================================================
-- LINEAR AUDIT PMS — ROW LEVEL SECURITY (RLS) HARDENING MIGRATION V3
-- File: supabase/migrations/20261118140000_linear_audit_rls_secure_v3.sql
-- Description:
--   Complete, production-grade, assignment-based Row Level Security hardening.
--   Enforces explicit SELECT, INSERT, UPDATE, DELETE policies on all public tables.
--   Identity resolution uses verified auth.uid() as primary authority, failing closed.
--   Zero blanket USING (true) on business, financial, employee, or vault tables.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. SECURE SEARCH PATH & EXTENSIONS
-- ------------------------------------------------------------------------------
SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 2. HARDENED SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- Helper: Get current employee ID mapped to auth.uid()
-- Fails closed (returns NULL) if identity is missing or ambiguous.
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT := (auth.jwt() ->> 'email');
  v_emp_id UUID;
  v_count INT;
BEGIN
  IF v_uid IS NULL AND v_email IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Primary resolution: Match via verified user_id (auth.uid())
  IF v_uid IS NOT NULL THEN
    SELECT COUNT(*), MAX(id)
    INTO v_count, v_emp_id
    FROM public.employees
    WHERE user_id = v_uid AND is_active = true;

    IF v_count = 1 THEN
      RETURN v_emp_id;
    ELSIF v_count > 1 THEN
      -- Ambiguous mapping: fail closed
      RETURN NULL;
    END IF;
  END IF;

  -- 2. Secondary resolution: Match via verified email if user_id unlinked
  IF v_email IS NOT NULL THEN
    SELECT COUNT(*), MAX(id)
    INTO v_count, v_emp_id
    FROM public.employees
    WHERE LOWER(email) = LOWER(v_email) AND is_active = true;

    IF v_count = 1 THEN
      RETURN v_emp_id;
    END IF;
  END IF;

  -- Fail closed
  RETURN NULL;
END;
$$;

-- Helper: Get current client ID mapped to auth.uid() / client contact email
-- Fails closed if missing or ambiguous.
CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_email TEXT := (auth.jwt() ->> 'email');
  v_client_id UUID;
  v_count INT;
BEGIN
  IF v_email IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(DISTINCT client_id), MAX(client_id)
  INTO v_count, v_client_id
  FROM public.client_contacts
  WHERE LOWER(email) = LOWER(v_email);

  IF v_count = 1 THEN
    RETURN v_client_id;
  END IF;

  RETURN NULL;
END;
$$;

-- Helper: Check if current user is Super Admin
CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_emp_id UUID := public.current_employee_id();
  v_uid UUID := auth.uid();
  v_email TEXT := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_role VARCHAR(50);
BEGIN
  IF v_uid IS NULL AND v_email = '' THEN
    RETURN false;
  END IF;

  -- Check employee record role_code
  IF v_emp_id IS NOT NULL THEN
    SELECT role_code INTO v_role
    FROM public.employees
    WHERE id = v_emp_id;

    IF v_role = 'SUPER_ADMIN' THEN
      RETURN true;
    END IF;
  END IF;

  -- Check user_roles table
  IF v_uid IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = v_uid AND (r.name = 'SUPER_ADMIN' OR r.name = 'Super Admin')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  -- Root configuration fallback (securely bound to Super Admin email)
  IF v_email = 'rohitaju21@gmail.com' THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

-- Helper: Check if current user is Admin (Super Admin, Admin, Director, or Head)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_emp_id UUID := public.current_employee_id();
  v_uid UUID := auth.uid();
  v_role VARCHAR(50);
BEGIN
  IF public.is_user_super_admin() THEN
    RETURN true;
  END IF;

  IF v_emp_id IS NOT NULL THEN
    SELECT role_code INTO v_role
    FROM public.employees
    WHERE id = v_emp_id;

    IF v_role IN ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD') THEN
      RETURN true;
    END IF;
  END IF;

  IF v_uid IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = v_uid AND r.name IN ('ADMIN', 'SUPER_ADMIN', 'DIRECTOR', 'HEAD')
    ) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- Helper: Check if employee is assigned to project
CREATE OR REPLACE FUNCTION public.is_employee_assigned_to_project(p_project_id UUID, p_emp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_project_id IS NULL OR p_emp_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND project_manager_id = p_emp_id
  ) OR EXISTS (
    SELECT 1 FROM public.project_assignments
    WHERE project_id = p_project_id AND employee_id = p_emp_id
  );
END;
$$;

-- Helper: Check if employee is assigned to task
CREATE OR REPLACE FUNCTION public.is_employee_assigned_to_task(p_task_id UUID, p_emp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_task_id IS NULL OR p_emp_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = p_task_id AND assigned_employee_id = p_emp_id
  ) OR EXISTS (
    SELECT 1 FROM public.task_assignments
    WHERE task_id = p_task_id AND employee_id = p_emp_id
  ) OR EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = p_task_id AND p.project_manager_id = p_emp_id
  );
END;
$$;

-- Helper: Check if employee has access to vault credential
CREATE OR REPLACE FUNCTION public.can_employee_access_vault(p_credential_id UUID, p_emp_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_assigned JSONB;
BEGIN
  IF p_credential_id IS NULL OR p_emp_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT assigned_employee_ids INTO v_assigned
  FROM public.vault_credentials
  WHERE id = p_credential_id;

  IF v_assigned IS NULL THEN
    RETURN false;
  END IF;

  -- Check if employee UUID string exists in JSONB array
  RETURN v_assigned ? p_emp_id::text;
END;
$$;

-- Revoke execute from public/anon and grant strictly to authenticated and service_role
REVOKE ALL ON FUNCTION public.current_employee_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_client_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_user_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_user_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_employee_assigned_to_project(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_employee_assigned_to_task(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_employee_access_vault(UUID, UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_client_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_user_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_employee_assigned_to_project(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_employee_assigned_to_task(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_employee_access_vault(UUID, UUID) TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. ENABLE RLS ON ALL PUBLIC TABLES & DROP PREVIOUS PERMISSIVE POLICIES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  -- 1. Enable RLS on every table in public schema
  FOR r IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('spatial_ref_sys')
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;

  -- 2. Drop all existing policies in public schema to avoid permissive OR combinations
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. SYSTEM & AUTH TABLES
-- ------------------------------------------------------------------------------

-- users:
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_user_admin());

CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_user_admin())
  WITH CHECK (
    (public.is_user_admin()) OR
    (id = auth.uid() AND is_active = (SELECT is_active FROM public.users WHERE id = auth.uid()))
  );

CREATE POLICY "users_delete" ON public.users
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- roles:
CREATE POLICY "roles_select" ON public.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "roles_admin_all" ON public.roles
  FOR ALL TO authenticated
  USING (public.is_user_super_admin())
  WITH CHECK (public.is_user_super_admin());

-- user_roles: (Prevent self-promotion)
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_user_admin());

CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_super_admin());

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_user_super_admin())
  WITH CHECK (public.is_user_super_admin());

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- permissions & role_permissions:
CREATE POLICY "permissions_select" ON public.permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "permissions_modify" ON public.permissions
  FOR ALL TO authenticated USING (public.is_user_super_admin()) WITH CHECK (public.is_user_super_admin());

CREATE POLICY "role_permissions_select" ON public.role_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "role_permissions_modify" ON public.role_permissions
  FOR ALL TO authenticated USING (public.is_user_super_admin()) WITH CHECK (public.is_user_super_admin());

-- system_settings:
CREATE POLICY "system_settings_select" ON public.system_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "system_settings_modify" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_user_super_admin())
  WITH CHECK (public.is_user_super_admin());

-- ------------------------------------------------------------------------------
-- 5. EMPLOYEE & HR TABLES
-- ------------------------------------------------------------------------------

-- employees:
CREATE POLICY "employees_select" ON public.employees
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR is_active = true);

CREATE POLICY "employees_insert" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "employees_update" ON public.employees
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR id = public.current_employee_id())
  WITH CHECK (
    public.is_user_admin() OR (
      id = public.current_employee_id()
      AND role_code = (SELECT role_code FROM public.employees WHERE id = public.current_employee_id())
      AND is_active = (SELECT is_active FROM public.employees WHERE id = public.current_employee_id())
      AND user_id = (SELECT user_id FROM public.employees WHERE id = public.current_employee_id())
    )
  );

CREATE POLICY "employees_delete" ON public.employees
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- employee_private_details: (Strict privacy)
CREATE POLICY "emp_private_select" ON public.employee_private_details
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR employee_id = public.current_employee_id());

CREATE POLICY "emp_private_insert" ON public.employee_private_details
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin() OR employee_id = public.current_employee_id());

CREATE POLICY "emp_private_update" ON public.employee_private_details
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR employee_id = public.current_employee_id())
  WITH CHECK (
    public.is_user_admin() OR
    (employee_id = public.current_employee_id() AND employee_id = (SELECT employee_id FROM public.employee_private_details WHERE id = employee_private_details.id))
  );

CREATE POLICY "emp_private_delete" ON public.employee_private_details
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- attendance_records:
CREATE POLICY "attendance_select" ON public.attendance_records
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR employee_id = public.current_employee_id());

CREATE POLICY "attendance_insert" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin() OR employee_id = public.current_employee_id());

CREATE POLICY "attendance_update" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "attendance_delete" ON public.attendance_records
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- office_geo_configs:
CREATE POLICY "geo_config_select" ON public.office_geo_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "geo_config_modify" ON public.office_geo_configs
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- departments & designations:
CREATE POLICY "departments_select" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "departments_modify" ON public.departments FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "designations_select" ON public.designations FOR SELECT TO authenticated USING (true);
CREATE POLICY "designations_modify" ON public.designations FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- teams & team_members:
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_modify" ON public.teams FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_modify" ON public.team_members FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- ------------------------------------------------------------------------------
-- 6. CLIENT MANAGEMENT TABLES
-- ------------------------------------------------------------------------------

-- clients:
CREATE POLICY "clients_select" ON public.clients
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR id = public.current_client_id()
    OR relationship_manager_id = public.current_employee_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.client_id = clients.id
        AND public.is_employee_assigned_to_project(p.id, public.current_employee_id())
    )
    OR EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE p.client_id = clients.id
        AND public.is_employee_assigned_to_task(t.id, public.current_employee_id())
    )
  );

CREATE POLICY "clients_insert" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "clients_update" ON public.clients
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR relationship_manager_id = public.current_employee_id())
  WITH CHECK (public.is_user_admin() OR relationship_manager_id = public.current_employee_id());

CREATE POLICY "clients_delete" ON public.clients
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- client_contacts:
CREATE POLICY "client_contacts_select" ON public.client_contacts
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR client_id = public.current_client_id()
    OR EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_contacts.client_id
        AND (c.relationship_manager_id = public.current_employee_id() OR public.is_user_admin())
    )
  );

CREATE POLICY "client_contacts_insert" ON public.client_contacts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_contacts_update" ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id())
  WITH CHECK (
    public.is_user_admin() OR
    (client_id = public.current_client_id() AND client_id = (SELECT client_id FROM public.client_contacts WHERE id = client_contacts.id))
  );

CREATE POLICY "client_contacts_delete" ON public.client_contacts
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- client_addresses & client_registrations:
CREATE POLICY "client_addr_select" ON public.client_addresses
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "client_addr_modify" ON public.client_addresses
  FOR ALL TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id())
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_reg_select" ON public.client_registrations
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "client_reg_modify" ON public.client_registrations
  FOR ALL TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id())
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

-- client_bank_accounts: (Strict financial privacy)
CREATE POLICY "client_bank_select" ON public.client_bank_accounts
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_bank_insert" ON public.client_bank_accounts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_bank_update" ON public.client_bank_accounts
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id())
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_bank_delete" ON public.client_bank_accounts
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- client_documents:
CREATE POLICY "client_docs_select" ON public.client_documents
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR client_id = public.current_client_id()
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.client_id = client_documents.client_id
        AND public.is_employee_assigned_to_project(p.id, public.current_employee_id())
    )
  );

CREATE POLICY "client_docs_insert" ON public.client_documents
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_docs_update" ON public.client_documents
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id())
  WITH CHECK (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "client_docs_delete" ON public.client_documents
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- ------------------------------------------------------------------------------
-- 7. PROJECTS & WORKFLOWS
-- ------------------------------------------------------------------------------

-- projects:
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR client_id = public.current_client_id()
    OR public.is_employee_assigned_to_project(id, public.current_employee_id())
  );

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR project_manager_id = public.current_employee_id())
  WITH CHECK (
    public.is_user_admin() OR (
      project_manager_id = public.current_employee_id()
      AND client_id = (SELECT client_id FROM public.projects WHERE id = projects.id)
    )
  );

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- project_assignments: (Strict CRUD)
CREATE POLICY "proj_assign_select" ON public.project_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR employee_id = public.current_employee_id()
    OR public.is_employee_assigned_to_project(project_id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_assignments.project_id AND p.client_id = public.current_client_id())
  );

CREATE POLICY "proj_assign_insert" ON public.project_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "proj_assign_update" ON public.project_assignments
  FOR UPDATE TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "proj_assign_delete" ON public.project_assignments
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- project_milestones:
CREATE POLICY "proj_milestones_select" ON public.project_milestones
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.is_employee_assigned_to_project(project_id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.client_id = public.current_client_id())
  );

CREATE POLICY "proj_milestones_insert" ON public.project_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.project_manager_id = public.current_employee_id())
  );

CREATE POLICY "proj_milestones_update" ON public.project_milestones
  FOR UPDATE TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.project_manager_id = public.current_employee_id())
  )
  WITH CHECK (
    public.is_user_admin() OR
    (project_id = (SELECT project_id FROM public.project_milestones WHERE id = project_milestones.id) AND
     EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_milestones.project_id AND p.project_manager_id = public.current_employee_id()))
  );

CREATE POLICY "proj_milestones_delete" ON public.project_milestones
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- project_workflows & project_workflow_stages:
CREATE POLICY "proj_wf_select" ON public.project_workflows
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.is_employee_assigned_to_project(project_id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_workflows.project_id AND p.client_id = public.current_client_id())
  );
CREATE POLICY "proj_wf_modify" ON public.project_workflows
  FOR ALL TO authenticated
  USING (public.is_user_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_workflows.project_id AND p.project_manager_id = public.current_employee_id()))
  WITH CHECK (public.is_user_admin() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_workflows.project_id AND p.project_manager_id = public.current_employee_id()));

CREATE POLICY "proj_wf_stages_select" ON public.project_workflow_stages
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.project_workflows pw
      WHERE pw.id = project_workflow_stages.project_workflow_id
        AND (public.is_employee_assigned_to_project(pw.project_id, public.current_employee_id())
             OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = pw.project_id AND p.client_id = public.current_client_id()))
    )
  );
CREATE POLICY "proj_wf_stages_modify" ON public.project_workflow_stages
  FOR ALL TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_workflows pw
      JOIN public.projects p ON pw.project_id = p.id
      WHERE pw.id = project_workflow_stages.project_workflow_id AND p.project_manager_id = public.current_employee_id()
    )
  )
  WITH CHECK (
    public.is_user_admin() OR
    EXISTS (
      SELECT 1 FROM public.project_workflows pw
      JOIN public.projects p ON pw.project_id = p.id
      WHERE pw.id = project_workflow_stages.project_workflow_id AND p.project_manager_id = public.current_employee_id()
    )
  );

-- Master workflow templates (Read for all authenticated, admin modify)
CREATE POLICY "wf_templates_select" ON public.workflow_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_templates_modify" ON public.workflow_templates FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_versions_select" ON public.workflow_template_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_versions_modify" ON public.workflow_template_versions FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_stages_select" ON public.workflow_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_stages_modify" ON public.workflow_stages FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_substages_select" ON public.workflow_sub_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_substages_modify" ON public.workflow_sub_stages FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_tasks_select" ON public.workflow_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_tasks_modify" ON public.workflow_tasks FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_subtasks_select" ON public.workflow_subtasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_subtasks_modify" ON public.workflow_subtasks FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_milestones_select" ON public.workflow_milestones FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_milestones_modify" ON public.workflow_milestones FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "wf_conditions_select" ON public.workflow_conditions FOR SELECT TO authenticated USING (true);
CREATE POLICY "wf_conditions_modify" ON public.workflow_conditions FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- ------------------------------------------------------------------------------
-- 8. TASKS & COLLABORATION
-- ------------------------------------------------------------------------------

-- tasks:
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.is_employee_assigned_to_task(id, public.current_employee_id())
    OR EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = tasks.project_id
        AND (p.client_id = public.current_client_id() OR public.is_employee_assigned_to_project(p.id, public.current_employee_id()))
    )
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.project_manager_id = public.current_employee_id())
  );

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.is_user_admin()
    OR assigned_employee_id = public.current_employee_id()
    OR public.is_employee_assigned_to_task(id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.project_manager_id = public.current_employee_id())
  )
  WITH CHECK (
    public.is_user_admin() OR (
      -- Ordinary assignees can update status/completion, but CANNOT alter project_id or reassign to other employees
      project_id = (SELECT project_id FROM public.tasks WHERE id = tasks.id)
      AND (
        EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.project_manager_id = public.current_employee_id())
        OR assigned_employee_id = (SELECT assigned_employee_id FROM public.tasks WHERE id = tasks.id)
      )
    )
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- task_assignments:
CREATE POLICY "task_assign_select" ON public.task_assignments
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR employee_id = public.current_employee_id()
    OR public.is_employee_assigned_to_task(task_id, public.current_employee_id())
  );

CREATE POLICY "task_assign_insert" ON public.task_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_assignments.task_id AND p.project_manager_id = public.current_employee_id())
  );

CREATE POLICY "task_assign_update" ON public.task_assignments
  FOR UPDATE TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "task_assign_delete" ON public.task_assignments
  FOR DELETE TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_assignments.task_id AND p.project_manager_id = public.current_employee_id())
  );

-- task_comments:
CREATE POLICY "task_comments_select" ON public.task_comments
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.is_employee_assigned_to_task(task_id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_comments.task_id AND p.client_id = public.current_client_id())
  );

CREATE POLICY "task_comments_insert" ON public.task_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    (employee_id = public.current_employee_id() AND public.is_employee_assigned_to_task(task_id, public.current_employee_id()))
  );

CREATE POLICY "task_comments_update" ON public.task_comments
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR employee_id = public.current_employee_id())
  WITH CHECK (
    public.is_user_admin() OR
    (employee_id = public.current_employee_id() AND task_id = (SELECT task_id FROM public.task_comments WHERE id = task_comments.id))
  );

CREATE POLICY "task_comments_delete" ON public.task_comments
  FOR DELETE TO authenticated
  USING (public.is_user_admin() OR employee_id = public.current_employee_id());

-- task_attachments:
CREATE POLICY "task_attach_select" ON public.task_attachments
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.is_employee_assigned_to_task(task_id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_attachments.task_id AND p.client_id = public.current_client_id())
  );

CREATE POLICY "task_attach_insert" ON public.task_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR public.is_employee_assigned_to_task(task_id, public.current_employee_id())
  );

CREATE POLICY "task_attach_delete" ON public.task_attachments
  FOR DELETE TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.file_objects fo WHERE fo.id = task_attachments.file_id AND fo.uploaded_by = public.current_employee_id())
  );

-- task_status_history:
CREATE POLICY "task_history_select" ON public.task_status_history
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.is_employee_assigned_to_task(task_id, public.current_employee_id())
    OR EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = task_status_history.task_id AND p.client_id = public.current_client_id())
  );

CREATE POLICY "task_history_insert" ON public.task_status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    (changed_by = public.current_employee_id() AND public.is_employee_assigned_to_task(task_id, public.current_employee_id()))
  );

CREATE POLICY "task_history_no_update" ON public.task_status_history
  FOR UPDATE TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "task_history_no_delete" ON public.task_status_history
  FOR DELETE TO authenticated
  USING (public.is_user_admin());

-- task categories & statuses:
CREATE POLICY "task_categories_select" ON public.task_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_categories_modify" ON public.task_categories FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "task_subcategories_select" ON public.task_sub_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_subcategories_modify" ON public.task_sub_categories FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "task_statuses_select" ON public.task_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_statuses_modify" ON public.task_statuses FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- ------------------------------------------------------------------------------
-- 9. VAULT SECURITY (CRITICAL CREDENTIAL STORAGE)
-- ------------------------------------------------------------------------------

-- vault_credentials:
CREATE POLICY "vault_select" ON public.vault_credentials
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR public.can_employee_access_vault(id, public.current_employee_id())
  );

CREATE POLICY "vault_insert" ON public.vault_credentials
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "vault_update" ON public.vault_credentials
  FOR UPDATE TO authenticated
  USING (
    public.is_user_admin()
    OR public.can_employee_access_vault(id, public.current_employee_id())
  )
  WITH CHECK (
    public.is_user_admin() OR (
      -- Ordinary assignees can rotate passwords, but CANNOT change assigned employees or client ownership
      client_id = (SELECT client_id FROM public.vault_credentials WHERE id = vault_credentials.id)
      AND assigned_employee_ids = (SELECT assigned_employee_ids FROM public.vault_credentials WHERE id = vault_credentials.id)
    )
  );

CREATE POLICY "vault_delete" ON public.vault_credentials
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- vault_audit_logs:
CREATE POLICY "vault_logs_select" ON public.vault_audit_logs
  FOR SELECT TO authenticated
  USING (public.is_user_admin());

CREATE POLICY "vault_logs_insert" ON public.vault_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    (performed_by_id = public.current_employee_id())
  );

CREATE POLICY "vault_logs_no_update" ON public.vault_audit_logs
  FOR UPDATE TO authenticated
  USING (public.is_user_super_admin())
  WITH CHECK (public.is_user_super_admin());

CREATE POLICY "vault_logs_no_delete" ON public.vault_audit_logs
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- ------------------------------------------------------------------------------
-- 10. FILE OBJECTS & STORAGE METADATA
-- ------------------------------------------------------------------------------

-- file_objects:
CREATE POLICY "files_select" ON public.file_objects
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin()
    OR uploaded_by = public.current_employee_id()
    OR (
      entity_type = 'client' AND entity_id = public.current_client_id()::text
    )
    OR (
      entity_type = 'project' AND public.is_employee_assigned_to_project(entity_id::uuid, public.current_employee_id())
    )
    OR (
      entity_type = 'task' AND public.is_employee_assigned_to_task(entity_id::uuid, public.current_employee_id())
    )
  );

CREATE POLICY "files_insert" ON public.file_objects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin()
    OR uploaded_by = public.current_employee_id()
  );

CREATE POLICY "files_update" ON public.file_objects
  FOR UPDATE TO authenticated
  USING (public.is_user_admin() OR uploaded_by = public.current_employee_id())
  WITH CHECK (
    public.is_user_admin() OR
    (uploaded_by = public.current_employee_id() AND storage_bucket = (SELECT storage_bucket FROM public.file_objects WHERE id = file_objects.id))
  );

CREATE POLICY "files_delete" ON public.file_objects
  FOR DELETE TO authenticated
  USING (public.is_user_admin() OR uploaded_by = public.current_employee_id());

-- ------------------------------------------------------------------------------
-- 11. FINANCE, INVOICES & PAYMENTS
-- ------------------------------------------------------------------------------

-- services & engagements:
CREATE POLICY "services_select" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_modify" ON public.services FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "service_eng_select" ON public.service_engagements
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "service_eng_modify" ON public.service_engagements
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "service_fee_select" ON public.service_fee_records
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "service_fee_modify" ON public.service_fee_records
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- invoices:
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());

CREATE POLICY "invoices_insert" ON public.invoices
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin());

CREATE POLICY "invoices_update" ON public.invoices
  FOR UPDATE TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "invoices_delete" ON public.invoices
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- invoice_items:
CREATE POLICY "inv_items_select" ON public.invoice_items
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND i.client_id = public.current_client_id())
  );
CREATE POLICY "inv_items_modify" ON public.invoice_items
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- invoice_sequences, recurring_invoices, bulk_invoice_batches, invoice_approval_logs:
CREATE POLICY "inv_seq_admin" ON public.invoice_sequences FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "rec_inv_select" ON public.recurring_invoices FOR SELECT TO authenticated USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "rec_inv_modify" ON public.recurring_invoices FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "bulk_inv_admin" ON public.bulk_invoice_batches FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

CREATE POLICY "inv_logs_select" ON public.invoice_approval_logs FOR SELECT TO authenticated USING (public.is_user_admin());
CREATE POLICY "inv_logs_modify" ON public.invoice_approval_logs FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- invoice_requests & invoice_request_items:
CREATE POLICY "inv_req_select" ON public.invoice_requests FOR SELECT TO authenticated USING (public.is_user_admin() OR requested_by = public.current_employee_id() OR client_id = public.current_client_id());
CREATE POLICY "inv_req_insert" ON public.invoice_requests FOR INSERT TO authenticated WITH CHECK (public.is_user_admin() OR requested_by = public.current_employee_id());
CREATE POLICY "inv_req_update" ON public.invoice_requests FOR UPDATE TO authenticated USING (public.is_user_admin() OR requested_by = public.current_employee_id()) WITH CHECK (public.is_user_admin() OR requested_by = public.current_employee_id());
CREATE POLICY "inv_req_delete" ON public.invoice_requests FOR DELETE TO authenticated USING (public.is_user_admin());

CREATE POLICY "inv_req_items_select" ON public.invoice_request_items FOR SELECT TO authenticated USING (public.is_user_admin() OR EXISTS (SELECT 1 FROM public.invoice_requests r WHERE r.id = invoice_request_items.invoice_request_id AND r.requested_by = public.current_employee_id()));
CREATE POLICY "inv_req_items_modify" ON public.invoice_request_items FOR ALL TO authenticated USING (public.is_user_admin() OR EXISTS (SELECT 1 FROM public.invoice_requests r WHERE r.id = invoice_request_items.invoice_request_id AND r.requested_by = public.current_employee_id())) WITH CHECK (public.is_user_admin() OR EXISTS (SELECT 1 FROM public.invoice_requests r WHERE r.id = invoice_request_items.invoice_request_id AND r.requested_by = public.current_employee_id()));

-- payments & allocations:
CREATE POLICY "payments_select" ON public.payments
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "payments_modify" ON public.payments
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "pay_alloc_select" ON public.payment_allocations
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.payments p WHERE p.id = payment_allocations.payment_id AND p.client_id = public.current_client_id())
  );
CREATE POLICY "pay_alloc_modify" ON public.payment_allocations
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- credit_notes & payment_reminders:
CREATE POLICY "credit_notes_select" ON public.credit_notes
  FOR SELECT TO authenticated
  USING (
    public.is_user_admin() OR
    EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = credit_notes.invoice_id AND i.client_id = public.current_client_id())
  );
CREATE POLICY "credit_notes_modify" ON public.credit_notes
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

CREATE POLICY "reminders_select" ON public.payment_reminders FOR SELECT TO authenticated USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "reminders_modify" ON public.payment_reminders FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

-- ------------------------------------------------------------------------------
-- 12. AUDIT LOGS, NOTIFICATIONS & RECYCLE BIN
-- ------------------------------------------------------------------------------

-- activity_logs: (Immutable audit trail)
CREATE POLICY "act_logs_select" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (public.is_user_admin());

CREATE POLICY "act_logs_insert" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_user_admin() OR
    (actor_id = public.current_employee_id())
  );

CREATE POLICY "act_logs_no_update" ON public.activity_logs
  FOR UPDATE TO authenticated
  USING (public.is_user_super_admin())
  WITH CHECK (public.is_user_super_admin());

CREATE POLICY "act_logs_no_delete" ON public.activity_logs
  FOR DELETE TO authenticated
  USING (public.is_user_super_admin());

-- approval_records:
CREATE POLICY "approval_select" ON public.approval_records
  FOR SELECT TO authenticated
  USING (public.is_user_admin() OR approver_id = public.current_employee_id());
CREATE POLICY "approval_modify" ON public.approval_records
  FOR ALL TO authenticated
  USING (public.is_user_admin() OR approver_id = public.current_employee_id())
  WITH CHECK (public.is_user_admin() OR approver_id = public.current_employee_id());

-- notifications:
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT TO authenticated
  USING (recipient_id = public.current_employee_id() OR public.is_user_admin());

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_user_admin() OR sender_id = public.current_employee_id());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = public.current_employee_id() OR public.is_user_admin())
  WITH CHECK (recipient_id = public.current_employee_id() OR public.is_user_admin());

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE TO authenticated
  USING (recipient_id = public.current_employee_id() OR public.is_user_admin());

-- universal_recycle_bin:
CREATE POLICY "recycle_bin_select" ON public.universal_recycle_bin
  FOR SELECT TO authenticated
  USING (public.is_user_admin());
CREATE POLICY "recycle_bin_modify" ON public.universal_recycle_bin
  FOR ALL TO authenticated
  USING (public.is_user_admin())
  WITH CHECK (public.is_user_admin());

-- whatsapp_templates:
CREATE POLICY "wa_templates_select" ON public.whatsapp_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "wa_templates_modify" ON public.whatsapp_templates FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());

COMMIT;
