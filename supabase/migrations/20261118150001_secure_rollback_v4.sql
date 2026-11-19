-- ==============================================================================
-- LINEAR AUDIT PMS — GENUINE PRE-MIGRATION ROLLBACK V4
-- File: supabase/migrations/20261118150001_secure_rollback_v4.sql
-- Description:
--   Restores the verified pre-hardening baseline state (20261114120000_direct_db_persistence_policies.sql).
--   - Drops all V4 RLS policies across all 64 public schema tables.
--   - Drops all V4 mutation guard triggers and trigger functions.
--   - Drops all V4 SECURITY DEFINER helper functions.
--   - Restores the exact pre-migration direct persistence policies.
-- ==============================================================================

BEGIN;

SET search_path = public, pg_temp;

-- ------------------------------------------------------------------------------
-- 1. DROP ALL V4 POLICIES ACROSS ALL PUBLIC TABLES
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
  END LOOP;

  -- Revert FORCE ROW LEVEL SECURITY
  FOR r IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys')
  ) LOOP
    EXECUTE format('ALTER TABLE public.%I NO FORCE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. DROP V4 COLUMN-GUARD TRIGGERS & TRIGGER FUNCTIONS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_guard_employee_update ON public.employees;
DROP FUNCTION IF EXISTS public.trg_guard_employee_update();

DROP TRIGGER IF EXISTS trg_guard_user_update ON public.users;
DROP FUNCTION IF EXISTS public.trg_guard_user_update();

DROP TRIGGER IF EXISTS trg_guard_task_update ON public.tasks;
DROP FUNCTION IF EXISTS public.trg_guard_task_update();

DROP TRIGGER IF EXISTS trg_guard_vault_update ON public.vault_credentials;
DROP FUNCTION IF EXISTS public.trg_guard_vault_update();

DROP TRIGGER IF EXISTS trg_guard_client_contact_update ON public.client_contacts;
DROP FUNCTION IF EXISTS public.trg_guard_client_contact_update();

DROP TRIGGER IF EXISTS trg_guard_project_update ON public.projects;
DROP FUNCTION IF EXISTS public.trg_guard_project_update();

DROP TRIGGER IF EXISTS trg_guard_file_update ON public.file_objects;
DROP FUNCTION IF EXISTS public.trg_guard_file_update();

-- ------------------------------------------------------------------------------
-- 3. DROP V4 SECURITY DEFINER HELPER FUNCTIONS
-- ------------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.can_user_access_file_entity(VARCHAR, UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.can_user_access_file_entity(VARCHAR, TEXT, UUID, UUID);
DROP FUNCTION IF EXISTS public.can_user_access_file_entity(VARCHAR, VARCHAR, UUID, UUID);
DROP FUNCTION IF EXISTS public.can_employee_access_vault(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_employee_project_manager_for_task(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_employee_assigned_to_task(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_employee_assigned_to_project(UUID, UUID);
DROP FUNCTION IF EXISTS public.is_user_admin();
DROP FUNCTION IF EXISTS public.is_user_super_admin();
DROP FUNCTION IF EXISTS public.current_client_id();
DROP FUNCTION IF EXISTS public.current_employee_id();

-- ------------------------------------------------------------------------------
-- 4. RESTORE PRE-MIGRATION BASELINE POLICIES
--    (Restoring 20261114120000_direct_db_persistence_policies.sql)
-- ------------------------------------------------------------------------------

-- 1. Clients & Contacts & Addresses & Registrations
CREATE POLICY "Direct access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to client_contacts" ON client_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to client_addresses" ON client_addresses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to client_registrations" ON client_registrations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to client_bank_accounts" ON client_bank_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to client_documents" ON client_documents FOR ALL USING (true) WITH CHECK (true);

-- 2. Services & Engagements
CREATE POLICY "Direct access to services" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to service_engagements" ON service_engagements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to service_fee_records" ON service_fee_records FOR ALL USING (true) WITH CHECK (true);

-- 3. Projects & Tasks & Comments
CREATE POLICY "Direct access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to project_assignments" ON project_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to project_workflows" ON project_workflows FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to project_workflow_stages" ON project_workflow_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to tasks" ON tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_assignments" ON task_assignments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_comments" ON task_comments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_attachments" ON task_attachments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_status_history" ON task_status_history FOR ALL USING (true) WITH CHECK (true);

-- 4. Workflow Templates & Stages
CREATE POLICY "Direct access to workflow_templates" ON workflow_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to workflow_template_versions" ON workflow_template_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to workflow_milestones" ON workflow_milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to workflow_stages" ON workflow_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to workflow_sub_stages" ON workflow_sub_stages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to workflow_tasks" ON workflow_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to workflow_conditions" ON workflow_conditions FOR ALL USING (true) WITH CHECK (true);

-- 5. Invoices & Payments & Finance
CREATE POLICY "Direct access to invoices" ON invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to invoice_items" ON invoice_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to invoice_sequences" ON invoice_sequences FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to payment_allocations" ON payment_allocations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to credit_notes" ON credit_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to payment_reminders" ON payment_reminders FOR ALL USING (true) WITH CHECK (true);

-- 6. Files, Categories, Settings & Universal Modules
CREATE POLICY "Direct access to file_objects" ON file_objects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_categories" ON task_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_sub_categories" ON task_sub_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to task_statuses" ON task_statuses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to universal_recycle_bin" ON universal_recycle_bin FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to whatsapp_templates" ON whatsapp_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to employee_private_details" ON employee_private_details FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to departments" ON departments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to designations" ON designations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to teams" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to team_members" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to activity_logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to office_geo_configs" ON office_geo_configs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to attendance_records" ON attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to user_roles" ON user_roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to roles" ON roles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to permissions" ON permissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Direct access to role_permissions" ON role_permissions FOR ALL USING (true) WITH CHECK (true);

COMMIT;
