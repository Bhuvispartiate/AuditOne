-- ==============================================================================
-- LINEAR AUDIT PMS — AUTOMATED RLS SECURITY TEST SUITE V4 (SELF-CONTAINED)
-- File: supabase/tests/20261118150000_automated_rls_security_tests_v4.sql
-- Description:
--   Self-contained pre-flight verification:
--   Applies V4 policies inside transaction, runs all 6 security test groups,
--   and executes ROLLBACK to ensure zero persistent changes.
-- ==============================================================================

BEGIN;

-- 1. SECURE SEARCH PATH & COMPATIBILITY
SET search_path = public, pg_temp;

ALTER TABLE public.client_contacts ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_contacts_user_id ON public.client_contacts(user_id) WHERE user_id IS NOT NULL;
ALTER TABLE public.task_attachments ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS recipient_employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;
ALTER TABLE public.approval_records ADD COLUMN IF NOT EXISTS approver_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;
ALTER TABLE public.project_assignments ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Contributor';

-- 2. HARDENED IDENTITY & ROLE RESOLUTION FUNCTIONS
CREATE OR REPLACE FUNCTION public.current_employee_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); v_emp_id UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT id INTO v_emp_id FROM public.employees WHERE user_id = v_uid AND is_active = true LIMIT 1;
  RETURN v_emp_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_client_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid(); v_client_id UUID;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT client_id INTO v_client_id FROM public.client_contacts WHERE user_id = v_uid LIMIT 1;
  RETURN v_client_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_uid AND (r.code = 'SUPER_ADMIN' OR r.name = 'SUPER_ADMIN')
  ) OR EXISTS (
    SELECT 1 FROM public.employees e WHERE e.user_id = v_uid AND e.role_code = 'SUPER_ADMIN' AND e.is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF public.is_user_super_admin() THEN RETURN true; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_uid AND (r.code IN ('ADMIN', 'PRACTICE_ADMIN', 'MANAGING_PARTNER') OR r.name IN ('ADMIN', 'PRACTICE_ADMIN', 'MANAGING_PARTNER'))
  ) OR EXISTS (
    SELECT 1 FROM public.employees e WHERE e.user_id = v_uid AND e.role_code IN ('ADMIN', 'PRACTICE_ADMIN', 'MANAGING_PARTNER') AND e.is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_employee_assigned_to_project(p_project_id UUID, p_emp_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_project_id IS NULL OR p_emp_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.project_assignments WHERE project_id = p_project_id AND employee_id = p_emp_id)
      OR EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND project_manager_id = p_emp_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_employee_assigned_to_task(p_task_id UUID, p_emp_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_task_id IS NULL OR p_emp_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM public.tasks WHERE id = p_task_id AND assigned_employee_id = p_emp_id)
      OR EXISTS (SELECT 1 FROM public.task_assignments WHERE task_id = p_task_id AND employee_id = p_emp_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_employee_project_manager_for_task(p_task_id UUID, p_emp_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_task_id IS NULL OR p_emp_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = p_task_id AND p.project_manager_id = p_emp_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_employee_access_vault(p_credential_id UUID, p_emp_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
DECLARE v_assigned JSONB;
BEGIN
  IF p_credential_id IS NULL OR p_emp_id IS NULL THEN RETURN false; END IF;
  SELECT assigned_employee_ids INTO v_assigned FROM public.vault_credentials WHERE id = p_credential_id;
  IF v_assigned IS NULL THEN RETURN false; END IF;
  RETURN v_assigned ? p_emp_id::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_access_file_entity(p_entity_type VARCHAR, p_entity_id UUID, p_emp_id UUID, p_client_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_entity_type IS NULL OR p_entity_id IS NULL THEN RETURN false; END IF;
  IF p_entity_type = 'client' THEN
    RETURN (p_client_id IS NOT NULL AND p_entity_id = p_client_id) OR
           EXISTS (SELECT 1 FROM public.clients WHERE id = p_entity_id AND relationship_manager_id = p_emp_id);
  ELSIF p_entity_type = 'project' THEN
    RETURN public.is_employee_assigned_to_project(p_entity_id, p_emp_id) OR
           EXISTS (SELECT 1 FROM public.projects WHERE id = p_entity_id AND client_id = p_client_id);
  ELSIF p_entity_type = 'task' THEN
    RETURN public.is_employee_assigned_to_task(p_entity_id, p_emp_id) OR
           EXISTS (SELECT 1 FROM public.tasks t JOIN public.projects p ON t.project_id = p.id WHERE t.id = p_entity_id AND p.client_id = p_client_id);
  ELSIF p_entity_type = 'employee' THEN
    RETURN (p_emp_id IS NOT NULL AND p_entity_id = p_emp_id);
  END IF;
  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.can_user_access_file_entity(p_entity_type VARCHAR, p_entity_id TEXT, p_emp_id UUID, p_client_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public, pg_temp AS $$
BEGIN
  IF p_entity_id IS NULL THEN RETURN false; END IF;
  BEGIN
    RETURN public.can_user_access_file_entity(p_entity_type, p_entity_id::uuid, p_emp_id, p_client_id);
  EXCEPTION WHEN OTHERS THEN RETURN false;
  END;
END;
$$;

-- 3. MUTATION GUARD TRIGGERS
CREATE OR REPLACE FUNCTION public.trg_guard_employee_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_user_admin() THEN
    IF OLD.role_code IS DISTINCT FROM NEW.role_code THEN RAISE EXCEPTION 'Access Denied: Ordinary employees cannot alter role_code.'; END IF;
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN RAISE EXCEPTION 'Access Denied: Ordinary employees cannot alter is_active status.'; END IF;
    IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Access Denied: Ordinary employees cannot alter user_id binding.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_employee_update ON public.employees;
CREATE TRIGGER trg_guard_employee_update BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.trg_guard_employee_update();

CREATE OR REPLACE FUNCTION public.trg_guard_task_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_emp_id UUID := public.current_employee_id();
  v_is_admin BOOLEAN := public.is_user_admin();
  v_is_pm BOOLEAN := public.is_employee_project_manager_for_task(OLD.id, v_emp_id);
BEGIN
  IF NOT v_is_admin AND NOT v_is_pm THEN
    IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN RAISE EXCEPTION 'Access Denied: Assignees cannot move tasks to another project.'; END IF;
    IF OLD.assigned_employee_id IS DISTINCT FROM NEW.assigned_employee_id THEN RAISE EXCEPTION 'Access Denied: Assignees cannot reassign tasks.'; END IF;
    IF OLD.due_date IS DISTINCT FROM NEW.due_date THEN RAISE EXCEPTION 'Access Denied: Assignees cannot alter due_date.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_task_update ON public.tasks;
CREATE TRIGGER trg_guard_task_update BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.trg_guard_task_update();

-- 4. ENABLE & FORCE RLS ON ALL PUBLIC TABLES
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('spatial_ref_sys')) LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;

  FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END;
$$;

-- 5. APPLY HARDENED POLICIES
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (public.is_user_admin() OR id = public.current_client_id() OR relationship_manager_id = public.current_employee_id() OR EXISTS (SELECT 1 FROM public.projects p WHERE p.client_id = clients.id AND public.is_employee_assigned_to_project(p.id, public.current_employee_id())));
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (public.is_user_admin());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (public.is_user_admin() OR relationship_manager_id = public.current_employee_id()) WITH CHECK (public.is_user_admin() OR relationship_manager_id = public.current_employee_id());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (public.is_user_super_admin());

CREATE POLICY "vault_select" ON public.vault_credentials FOR SELECT TO authenticated USING (public.is_user_super_admin() OR public.can_employee_access_vault(id, public.current_employee_id()));
CREATE POLICY "vault_insert" ON public.vault_credentials FOR INSERT TO authenticated WITH CHECK (public.is_user_super_admin() OR public.is_user_admin());
CREATE POLICY "vault_update" ON public.vault_credentials FOR UPDATE TO authenticated USING (public.is_user_super_admin() OR public.can_employee_access_vault(id, public.current_employee_id())) WITH CHECK (public.is_user_super_admin() OR public.can_employee_access_vault(id, public.current_employee_id()));
CREATE POLICY "vault_delete" ON public.vault_credentials FOR DELETE TO authenticated USING (public.is_user_super_admin());

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT TO authenticated WITH CHECK (public.is_user_admin());
CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE TO authenticated USING (public.is_user_admin()) WITH CHECK (public.is_user_admin());
CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE TO authenticated USING (public.is_user_super_admin());

CREATE POLICY "act_logs_select" ON public.activity_logs FOR SELECT TO authenticated USING (public.is_user_admin());
CREATE POLICY "act_logs_insert" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (public.is_user_admin() OR (COALESCE(actor_id, employee_id) = public.current_employee_id()));
CREATE POLICY "act_logs_update" ON public.activity_logs FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "act_logs_delete" ON public.activity_logs FOR DELETE TO authenticated USING (false);

CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (public.is_user_admin() OR client_id = public.current_client_id() OR public.is_employee_assigned_to_project(id, public.current_employee_id()));
CREATE POLICY "project_assignments_select" ON public.project_assignments FOR SELECT TO authenticated USING (public.is_user_admin() OR employee_id = public.current_employee_id() OR public.is_employee_assigned_to_project(project_id, public.current_employee_id()));

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (public.is_user_admin() OR public.is_employee_assigned_to_task(id, public.current_employee_id()) OR public.is_employee_assigned_to_project(project_id, public.current_employee_id()) OR EXISTS (SELECT 1 FROM public.projects p WHERE p.id = tasks.project_id AND p.client_id = public.current_client_id()));
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (public.is_user_admin() OR public.is_employee_assigned_to_task(id, public.current_employee_id()) OR public.is_employee_project_manager_for_task(id, public.current_employee_id())) WITH CHECK (public.is_user_admin() OR public.is_employee_assigned_to_task(id, public.current_employee_id()) OR public.is_employee_project_manager_for_task(id, public.current_employee_id()));

CREATE POLICY "client_bank_select" ON public.client_bank_accounts FOR SELECT TO authenticated USING (public.is_user_admin() OR client_id = public.current_client_id());
CREATE POLICY "emp_private_select" ON public.employee_private_details FOR SELECT TO authenticated USING (public.is_user_admin() OR employee_id = public.current_employee_id());
CREATE POLICY "employees_update" ON public.employees FOR UPDATE TO authenticated USING (public.is_user_admin() OR user_id = auth.uid()) WITH CHECK (public.is_user_admin() OR user_id = auth.uid());

-- 6. RUN VERIFICATION TESTS
CREATE OR REPLACE FUNCTION public.test_set_auth_context(
    p_uid UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'authenticated'
)
RETURNS VOID LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
  IF p_uid IS NULL THEN
    PERFORM set_config('request.jwt.claims', '{}', true);
    PERFORM set_config('role', 'anon', true);
  ELSE
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_uid::text, 'email', p_email, 'role', p_role)::text, true);
    PERFORM set_config('role', p_role, true);
  END IF;
END;
$$;

DO $$
DECLARE
  c_super_admin_uid  UUID := '11111111-1111-1111-1111-111111111111';
  c_admin_uid        UUID := '22222222-2222-2222-2222-222222222222';
  c_emp_assigned_uid UUID := '33333333-3333-3333-3333-333333333333';
  c_emp_unassigned_uid UUID := '44444444-4444-4444-4444-444444444444';
  c_client_1_uid     UUID := '55555555-5555-5555-5555-555555555551';
  c_client_2_uid     UUID := '55555555-5555-5555-5555-555555555552';

  c_super_admin_email CONSTANT TEXT := 'rls_test_superadmin@linearpmstest.internal';
  c_admin_email       CONSTANT TEXT := 'rls_test_admin@linearpmstest.internal';
  c_emp_assigned_email CONSTANT TEXT := 'rls_test_assigned@linearpmstest.internal';
  c_emp_unassigned_email CONSTANT TEXT := 'rls_test_unassigned@linearpmstest.internal';
  c_client_1_email    CONSTANT TEXT := 'rls_test_alice@acmetest.internal';
  c_client_2_email    CONSTANT TEXT := 'rls_test_bob@competitortest.internal';

  v_emp_super_id     UUID := '11111111-aaaa-bbbb-cccc-111111111111';
  v_emp_admin_id     UUID := '22222222-aaaa-bbbb-cccc-222222222222';
  v_emp_assigned_id  UUID := '33333333-aaaa-bbbb-cccc-333333333333';
  v_emp_unassigned_id UUID := '44444444-aaaa-bbbb-cccc-444444444444';

  v_client_1_id      UUID := '77777777-aaaa-bbbb-cccc-777777777771';
  v_client_2_id      UUID := '77777777-aaaa-bbbb-cccc-777777777772';

  v_proj_1_id        UUID := '99999999-aaaa-bbbb-cccc-999999999991';
  v_proj_2_id        UUID := '99999999-aaaa-bbbb-cccc-999999999992';

  v_task_1_id        UUID := 'aaaaaaaa-aaaa-bbbb-cccc-aaaaaaaaaaa1';
  v_task_2_id        UUID := 'aaaaaaaa-aaaa-bbbb-cccc-aaaaaaaaaaa2';

  v_vault_1_id       UUID := 'bbbbbbbb-aaaa-bbbb-cccc-bbbbbbbbbbb1';
  v_vault_2_id       UUID := 'bbbbbbbb-aaaa-bbbb-cccc-bbbbbbbbbbb2';

  v_inv_1_id         UUID := 'cccccccc-aaaa-bbbb-cccc-ccccccccccc1';
  v_inv_2_id         UUID := 'cccccccc-aaaa-bbbb-cccc-ccccccccccc2';

  v_act_log_id       UUID := 'dddddddd-aaaa-bbbb-cccc-ddddddddddd1';

  v_role_super_admin_id UUID;
  v_role_admin_id       UUID;

  v_count            INT;
  v_caught_exception BOOLEAN;
  v_task_status      VARCHAR(30);
BEGIN
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'RUNNING IN-LINE RLS VERIFICATION TESTS';
  RAISE NOTICE '====================================================================';

  -- FIXTURES
  SELECT id INTO v_role_super_admin_id FROM public.roles WHERE code = 'SUPER_ADMIN' OR name = 'SUPER_ADMIN' LIMIT 1;
  IF v_role_super_admin_id IS NULL THEN
    INSERT INTO public.roles (name, code) VALUES ('SUPER_ADMIN', 'SUPER_ADMIN') RETURNING id INTO v_role_super_admin_id;
  END IF;

  SELECT id INTO v_role_admin_id FROM public.roles WHERE code = 'ADMIN' OR name = 'ADMIN' LIMIT 1;
  IF v_role_admin_id IS NULL THEN
    INSERT INTO public.roles (name, code) VALUES ('ADMIN', 'ADMIN') RETURNING id INTO v_role_admin_id;
  END IF;

  INSERT INTO public.users (id, email, full_name, is_active) VALUES
    (c_super_admin_uid, c_super_admin_email, 'Super Admin Root', true),
    (c_admin_uid, c_admin_email, 'Practice Admin', true),
    (c_emp_assigned_uid, c_emp_assigned_email, 'Assigned Auditor', true),
    (c_emp_unassigned_uid, c_emp_unassigned_email, 'Unassigned Staff', true),
    (c_client_1_uid, c_client_1_email, 'Alice Acme', true),
    (c_client_2_uid, c_client_2_email, 'Bob Competitor', true)
  ON CONFLICT (id) DO UPDATE SET is_active = true, email = EXCLUDED.email;

  INSERT INTO public.user_roles (user_id, role_id) VALUES
    (c_super_admin_uid, v_role_super_admin_id),
    (c_admin_uid, v_role_admin_id)
  ON CONFLICT DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'full_name' AND is_generated = 'ALWAYS') THEN
    INSERT INTO public.employees (id, employee_code, user_id, first_name, last_name, email, mobile_number, role_code, is_active) VALUES
      (v_emp_super_id, 'TEST-EMP-001', c_super_admin_uid, 'Super', 'Admin', c_super_admin_email, '+91 9999900001', 'SUPER_ADMIN', true),
      (v_emp_admin_id, 'TEST-EMP-002', c_admin_uid, 'Practice', 'Admin', c_admin_email, '+91 9999900002', 'ADMIN', true),
      (v_emp_assigned_id, 'TEST-EMP-003', c_emp_assigned_uid, 'Assigned', 'Auditor', c_emp_assigned_email, '+91 9999900003', 'STAFF', true),
      (v_emp_unassigned_id, 'TEST-EMP-004', c_emp_unassigned_uid, 'Unassigned', 'Staff', c_emp_unassigned_email, '+91 9999900004', 'STAFF', true)
    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, role_code = EXCLUDED.role_code, is_active = true, email = EXCLUDED.email;
  ELSE
    INSERT INTO public.employees (id, employee_code, user_id, first_name, last_name, full_name, email, mobile_number, role_code, is_active) VALUES
      (v_emp_super_id, 'TEST-EMP-001', c_super_admin_uid, 'Super', 'Admin', 'Super Admin Root', c_super_admin_email, '+91 9999900001', 'SUPER_ADMIN', true),
      (v_emp_admin_id, 'TEST-EMP-002', c_admin_uid, 'Practice', 'Admin', 'Practice Admin', c_admin_email, '+91 9999900002', 'ADMIN', true),
      (v_emp_assigned_id, 'TEST-EMP-003', c_emp_assigned_uid, 'Assigned', 'Auditor', 'Assigned Auditor', c_emp_assigned_email, '+91 9999900003', 'STAFF', true),
      (v_emp_unassigned_id, 'TEST-EMP-004', c_emp_unassigned_uid, 'Unassigned', 'Staff', 'Unassigned Staff', c_emp_unassigned_email, '+91 9999900004', 'STAFF', true)
    ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, role_code = EXCLUDED.role_code, is_active = true, email = EXCLUDED.email;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employee_private_details' AND column_name = 'pan') THEN
    EXECUTE 'INSERT INTO public.employee_private_details (id, employee_id, pan, bank_name) VALUES
      (''33333333-eeee-ffff-0000-111111111111'', $1, ''TESTPAN001'', ''HDFC Bank''),
      (''44444444-eeee-ffff-0000-222222222222'', $2, ''TESTPAN002'', ''ICICI Bank'') ON CONFLICT (id) DO NOTHING'
    USING v_emp_assigned_id, v_emp_unassigned_id;
  ELSE
    EXECUTE 'INSERT INTO public.employee_private_details (id, employee_id, bank_name, account_number_encrypted, ifsc_code, account_holder_name) VALUES
      (''33333333-eeee-ffff-0000-111111111111'', $1, ''HDFC Bank'', ''ENC_ACC_1'', ''HDFC0001'', ''Assigned Auditor''),
      (''44444444-eeee-ffff-0000-222222222222'', $2, ''ICICI Bank'', ''ENC_ACC_2'', ''ICIC0002'', ''Unassigned Staff'') ON CONFLICT (id) DO NOTHING'
    USING v_emp_assigned_id, v_emp_unassigned_id;
  END IF;

  INSERT INTO public.clients (id, client_code, client_name, legal_name, constitution, status) VALUES
    (v_client_1_id, 'TEST-CL-001', 'Acme Audit Client', 'Acme Corp Ltd', 'Private Limited', 'Active'),
    (v_client_2_id, 'TEST-CL-002', 'Competitor Client', 'Competitor Inc', 'Private Limited', 'Active')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.client_contacts (id, client_id, user_id, contact_person, mobile_number, email, is_primary) VALUES
    ('77777777-1111-2222-3333-777777777771', v_client_1_id, c_client_1_uid, 'Alice Acme', '+91 9888800001', c_client_1_email, true),
    ('77777777-1111-2222-3333-777777777772', v_client_2_id, c_client_2_uid, 'Bob Competitor', '+91 9888800002', c_client_2_email, true)
  ON CONFLICT (id) DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email;

  INSERT INTO public.client_bank_accounts (id, client_id, bank_name, account_number_encrypted, ifsc_code) VALUES
    ('77777777-bbbb-1111-2222-333333333331', v_client_1_id, 'Citibank N.A.', 'ENC_TEST_ACC_001', 'CITI0000001'),
    ('77777777-bbbb-1111-2222-333333333332', v_client_2_id, 'HSBC India', 'ENC_TEST_ACC_002', 'HSBC0000002')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.projects (id, project_code, project_name, project_type, client_id, status, due_date) VALUES
    (v_proj_1_id, 'TEST-PR-001', 'Acme Statutory Audit', 'Client Project', v_client_1_id, 'In Progress', CURRENT_DATE + 30),
    (v_proj_2_id, 'TEST-PR-002', 'Competitor Tax Review', 'Client Project', v_client_2_id, 'In Progress', CURRENT_DATE + 30)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.project_assignments (id, project_id, employee_id) VALUES
    ('99999999-1111-2222-3333-444444444441', v_proj_1_id, v_emp_assigned_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.tasks (id, task_code, project_id, title, assigned_employee_id, status, due_date) VALUES
    (v_task_1_id, 'TEST-TK-001', v_proj_1_id, 'Audit Revenue Cycle', v_emp_assigned_id, 'In Progress', CURRENT_DATE + 7),
    (v_task_2_id, 'TEST-TK-002', v_proj_2_id, 'Competitor Due Diligence', v_emp_unassigned_id, 'In Progress', CURRENT_DATE + 7)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.vault_credentials (id, portal_name, username, password_encrypted, client_id, assigned_employee_ids) VALUES
    (v_vault_1_id, 'Acme GST Portal', 'acme_gst', 'enc_pass_1', v_client_1_id, json_build_array(v_emp_assigned_id::text)::jsonb),
    (v_vault_2_id, 'Competitor Secret Portal', 'comp_it', 'enc_pass_2', v_client_2_id, '[]'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'financial_year') THEN
    EXECUTE 'INSERT INTO public.invoices (id, invoice_number, financial_year, client_id, due_date, place_of_supply, client_legal_name, client_address, grand_total, status)
      VALUES ($1, ''TEST-INV-001'', ''2025-26'', $2, CURRENT_DATE + 30, ''State'', ''Acme Legal'', ''Address 1'', 85000, ''Draft''),
             ($3, ''TEST-INV-002'', ''2025-26'', $4, CURRENT_DATE + 30, ''State'', ''Comp Legal'', ''Address 2'', 150000, ''Draft'') ON CONFLICT (id) DO NOTHING'
    USING v_inv_1_id, v_client_1_id, v_inv_2_id, v_client_2_id;
  ELSE
    EXECUTE 'INSERT INTO public.invoices (id, invoice_number, client_id, due_date, total_amount, status)
      VALUES ($1, ''TEST-INV-001'', $2, CURRENT_DATE + 30, 85000, ''Draft''),
             ($3, ''TEST-INV-002'', $4, CURRENT_DATE + 30, 150000, ''Draft'') ON CONFLICT (id) DO NOTHING'
    USING v_inv_1_id, v_client_1_id, v_inv_2_id, v_client_2_id;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activity_logs' AND column_name = 'actor_name') THEN
    EXECUTE 'INSERT INTO public.activity_logs (id, actor_id, actor_name, action, entity_type, entity_id) VALUES ($1, $2, ''Practice Admin'', ''CREATE_PROJECT'', ''project'', $3) ON CONFLICT (id) DO NOTHING'
    USING v_act_log_id, v_emp_admin_id, v_proj_1_id::text;
  ELSE
    EXECUTE 'INSERT INTO public.activity_logs (id, employee_id, action, entity_type, entity_id) VALUES ($1, $2, ''CREATE_PROJECT'', ''project'', $3) ON CONFLICT (id) DO NOTHING'
    USING v_act_log_id, v_emp_admin_id, v_proj_1_id;
  END IF;

  -- TEST 1: ANON
  PERFORM public.test_set_auth_context(NULL, NULL, 'anon');
  SELECT COUNT(*) INTO v_count FROM public.clients;
  IF v_count > 0 THEN RAISE EXCEPTION 'FAIL 1.1: Anon read % clients', v_count; END IF;
  SELECT COUNT(*) INTO v_count FROM public.vault_credentials;
  IF v_count > 0 THEN RAISE EXCEPTION 'FAIL 1.2: Anon read % vault credentials', v_count; END IF;
  SELECT COUNT(*) INTO v_count FROM public.invoices;
  IF v_count > 0 THEN RAISE EXCEPTION 'FAIL 1.3: Anon read % invoices', v_count; END IF;
  SELECT COUNT(*) INTO v_count FROM public.activity_logs;
  IF v_count > 0 THEN RAISE EXCEPTION 'FAIL 1.4: Anon read % activity logs', v_count; END IF;
  RAISE NOTICE '✓ TEST GROUP 1 PASSED: Unauthenticated actor completely blocked.';

  -- TEST 2: ASSIGNED VS UNASSIGNED EMPLOYEE
  PERFORM public.test_set_auth_context(c_emp_assigned_uid, c_emp_assigned_email, 'authenticated');
  SELECT COUNT(*) INTO v_count FROM public.projects WHERE id = v_proj_1_id;
  IF v_count != 1 THEN RAISE EXCEPTION 'FAIL 2.1: Assigned employee cannot see Project 1'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.projects WHERE id = v_proj_2_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 2.2: Assigned employee saw unassigned Project 2!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.vault_credentials WHERE id = v_vault_1_id;
  IF v_count != 1 THEN RAISE EXCEPTION 'FAIL 2.3: Assigned employee cannot see Vault 1'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.vault_credentials WHERE id = v_vault_2_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 2.4: Assigned employee saw Vault 2!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.client_bank_accounts;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 2.5: Ordinary employee saw client bank accounts!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.invoices;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 2.6: Ordinary employee saw invoices!'; END IF;

  PERFORM public.test_set_auth_context(c_emp_unassigned_uid, c_emp_unassigned_email, 'authenticated');
  SELECT COUNT(*) INTO v_count FROM public.projects WHERE id = v_proj_1_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 2.7: Unassigned employee saw Project 1!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.vault_credentials WHERE id = v_vault_1_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 2.8: Unassigned employee saw Vault 1!'; END IF;
  RAISE NOTICE '✓ TEST GROUP 2 PASSED: Employee assignment and boundary isolation verified.';

  -- TEST 3: CLIENT TENANT ISOLATION
  PERFORM public.test_set_auth_context(c_client_1_uid, c_client_1_email, 'authenticated');
  SELECT COUNT(*) INTO v_count FROM public.clients WHERE id = v_client_1_id;
  IF v_count != 1 THEN RAISE EXCEPTION 'FAIL 3.1: Client 1 cannot view own record'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.clients WHERE id = v_client_2_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 3.2: Client 1 saw Client 2 record!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.invoices WHERE id = v_inv_1_id;
  IF v_count != 1 THEN RAISE EXCEPTION 'FAIL 3.3: Client 1 cannot view own Invoice 1'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.invoices WHERE id = v_inv_2_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 3.4: Client 1 saw Client 2 invoice!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.client_bank_accounts WHERE client_id = v_client_1_id;
  IF v_count != 1 THEN RAISE EXCEPTION 'FAIL 3.5: Client 1 cannot view own bank account'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.client_bank_accounts WHERE client_id = v_client_2_id;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 3.6: Client 1 saw Client 2 bank account!'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.employee_private_details;
  IF v_count != 0 THEN RAISE EXCEPTION 'FAIL 3.7: Client saw employee private details!'; END IF;
  RAISE NOTICE '✓ TEST GROUP 3 PASSED: Cross-client isolation verified with zero leakage.';

  -- TEST 4: COLUMN PROTECTION (TRIGGERS)
  PERFORM public.test_set_auth_context(c_emp_assigned_uid, c_emp_assigned_email, 'authenticated');
  v_caught_exception := false;
  BEGIN
    UPDATE public.employees SET role_code = 'SUPER_ADMIN' WHERE id = v_emp_assigned_id;
  EXCEPTION WHEN OTHERS THEN v_caught_exception := true; END;
  IF NOT v_caught_exception THEN RAISE EXCEPTION 'FAIL 4.1: Ordinary employee self-promoted role_code!'; END IF;

  v_caught_exception := false;
  BEGIN
    UPDATE public.tasks SET project_id = v_proj_2_id WHERE id = v_task_1_id;
  EXCEPTION WHEN OTHERS THEN v_caught_exception := true; END;
  IF NOT v_caught_exception THEN RAISE EXCEPTION 'FAIL 4.2: Ordinary assignee changed task project_id!'; END IF;

  v_caught_exception := false;
  BEGIN
    UPDATE public.tasks SET assigned_employee_id = v_emp_unassigned_id WHERE id = v_task_1_id;
  EXCEPTION WHEN OTHERS THEN v_caught_exception := true; END;
  IF NOT v_caught_exception THEN RAISE EXCEPTION 'FAIL 4.3: Ordinary assignee reallocated task assigned_employee_id!'; END IF;

  UPDATE public.tasks SET status = 'Completed', completed_at = now() WHERE id = v_task_1_id;
  SELECT status INTO v_task_status FROM public.tasks WHERE id = v_task_1_id;
  IF v_task_status != 'Completed' THEN RAISE EXCEPTION 'FAIL 4.4: Legitimate task status update did not persist!'; END IF;
  RAISE NOTICE '✓ TEST GROUP 4 PASSED: Column-level protection and trigger immutability verified.';

  -- TEST 5: AUDIT LOG APPEND-ONLY
  PERFORM public.test_set_auth_context(c_super_admin_uid, c_super_admin_email, 'authenticated');
  UPDATE public.activity_logs SET action = 'TAMPERED' WHERE id = v_act_log_id;
  SELECT COUNT(*) INTO v_count FROM public.activity_logs WHERE id = v_act_log_id AND action = 'TAMPERED';
  IF v_count > 0 THEN RAISE EXCEPTION 'FAIL 5.1: Activity log was mutated!'; END IF;
  DELETE FROM public.activity_logs WHERE id = v_act_log_id;
  SELECT COUNT(*) INTO v_count FROM public.activity_logs WHERE id = v_act_log_id;
  IF v_count = 0 THEN RAISE EXCEPTION 'FAIL 5.2: Activity log was deleted!'; END IF;
  RAISE NOTICE '✓ TEST GROUP 5 PASSED: Audit trails are strictly append-only.';

  -- TEST 6: SUPER ADMIN OBSERVABILITY
  SELECT COUNT(*) INTO v_count FROM public.clients;
  IF v_count < 2 THEN RAISE EXCEPTION 'FAIL 6.1: Super Admin cannot see all clients'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.vault_credentials;
  IF v_count < 2 THEN RAISE EXCEPTION 'FAIL 6.2: Super Admin cannot see all credentials'; END IF;
  SELECT COUNT(*) INTO v_count FROM public.invoices;
  IF v_count < 2 THEN RAISE EXCEPTION 'FAIL 6.3: Super Admin cannot see all invoices'; END IF;
  RAISE NOTICE '✓ TEST GROUP 6 PASSED: Super Admin holds verified system observability.';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'ALL RLS SECURITY TESTS PASSED (6/6 TEST SUITES)';
  RAISE NOTICE '====================================================================';
END;
$$;

-- Always roll back the test transaction to ensure zero fixture leakage
ROLLBACK;
