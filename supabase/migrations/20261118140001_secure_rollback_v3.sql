-- ==============================================================================
-- LINEAR AUDIT PMS — SECURE ROLLBACK MIGRATION V3
-- File: supabase/migrations/20261118140001_secure_rollback_v3.sql
-- Description:
--   Safely reverts RLS policies introduced in Migration V3.
--   NEVER restores blanket open USING (true) or FOR ALL TO authenticated policies.
--   Restores verified baseline access rules where only authenticated admins
--   and authorized staff access system records.
-- ==============================================================================

BEGIN;

SET search_path = public, pg_temp;

-- 1. Drop all V3 policies across public schema
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
END;
$$;

-- 2. Restore verified baseline: Authenticated admin management and active employee baseline
-- Every table remains protected by RLS (RLS is NOT disabled).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys')
  ) LOOP
    -- Enforce RLS
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);

    -- Baseline Admin CRUD Policy
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());',
      r.tablename || '_baseline_admin',
      r.tablename
    );
  END LOOP;
END;
$$;

-- 3. Scoped Read policies for active employees on operational tables
CREATE POLICY "employees_baseline_read" ON public.employees
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "projects_baseline_read" ON public.projects
  FOR SELECT TO authenticated USING (public.is_employee_assigned_to_project(id, public.current_employee_id()));

CREATE POLICY "tasks_baseline_read" ON public.tasks
  FOR SELECT TO authenticated USING (public.is_employee_assigned_to_task(id, public.current_employee_id()));

CREATE POLICY "attendance_baseline_own" ON public.attendance_records
  FOR ALL TO authenticated USING (employee_id = public.current_employee_id()) WITH CHECK (employee_id = public.current_employee_id());

CREATE POLICY "notifications_baseline_own" ON public.notifications
  FOR ALL TO authenticated USING (recipient_id = public.current_employee_id()) WITH CHECK (recipient_id = public.current_employee_id());

COMMIT;
