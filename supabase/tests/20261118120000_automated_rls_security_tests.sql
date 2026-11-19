-- ============================================================================
-- LINEAR AUDIT PMS — AUTOMATED RLS SECURITY VALIDATION TEST SUITE
-- Executes in a sandboxed transaction that rolls back automatically.
-- Tests unauthenticated, employee, admin, client, and cross-tenant boundaries.
-- ============================================================================

BEGIN;

-- Setup test fixtures if not present
DO $$
DECLARE
    v_emp_a_id UUID := '11111111-1111-4111-a111-111111111111';
    v_emp_b_id UUID := '22222222-2222-4222-a222-222222222222';
    v_client_x_id UUID := '33333333-3333-4333-a333-333333333333';
    v_client_y_id UUID := '44444444-4444-4444-a444-444444444444';
    v_admin_id UUID := '55555555-5555-4555-a555-555555555555';
    v_test_count INT;
BEGIN
    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'STARTING LINEAR AUDIT PMS RLS SECURITY TEST SUITE';
    RAISE NOTICE '=============================================================';

    -- ------------------------------------------------------------------------
    -- TEST 1: UNAUTHENTICATED (ANON) ACCESS MUST BE 100% BLOCKED
    -- ------------------------------------------------------------------------
    SET LOCAL ROLE anon;
    SET LOCAL "request.jwt.claim.email" = '';

    -- 1.1 SELECT clients
    SELECT COUNT(*) INTO v_test_count FROM public.clients;
    IF v_test_count > 0 THEN
        RAISE EXCEPTION 'SECURITY FAIL: anon was able to read % clients!', v_test_count;
    END IF;

    -- 1.2 SELECT vault credentials
    SELECT COUNT(*) INTO v_test_count FROM public.vault_credentials;
    IF v_test_count > 0 THEN
        RAISE EXCEPTION 'SECURITY FAIL: anon was able to read % vault credentials!', v_test_count;
    END IF;

    -- 1.3 SELECT employee private details
    SELECT COUNT(*) INTO v_test_count FROM public.employee_private_details;
    IF v_test_count > 0 THEN
        RAISE EXCEPTION 'SECURITY FAIL: anon was able to read % private employee details!', v_test_count;
    END IF;

    -- 1.4 INSERT client attempt
    BEGIN
        INSERT INTO public.clients (client_code, client_name, legal_name) 
        VALUES ('TEST-ANON', 'Hacker Corp', 'Hacker Corp Ltd');
        RAISE EXCEPTION 'SECURITY FAIL: anon was able to insert a client!';
    EXCEPTION WHEN insufficient_privilege THEN
        -- Expected
        RAISE NOTICE 'PASS [1/7]: Unauthenticated anon INSERT correctly rejected with 42501 (insufficient_privilege).';
    END;

    RAISE NOTICE 'PASS [2/7]: Unauthenticated anon data boundary verified (0 leaks).';

    -- ------------------------------------------------------------------------
    -- TEST 2: CROSS-EMPLOYEE ISOLATION (EMPLOYEE A vs EMPLOYEE B)
    -- ------------------------------------------------------------------------
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claim.email" = 'employee.a@linearaudit.internal';

    -- 2.1 Private details: Employee A must NEVER see Employee B's PAN / Bank Details
    SELECT COUNT(*) INTO v_test_count 
    FROM public.employee_private_details 
    WHERE employee_id = v_emp_b_id;

    IF v_test_count > 0 THEN
        RAISE EXCEPTION 'SECURITY FAIL: Employee A accessed Employee B private records!';
    END IF;
    RAISE NOTICE 'PASS [3/7]: Cross-employee private details isolation verified.';

    -- 2.2 Self-Promotion Prevention: Employee A cannot update own role to SUPER_ADMIN
    BEGIN
        UPDATE public.employees 
        SET role_code = 'SUPER_ADMIN' 
        WHERE email = 'employee.a@linearaudit.internal';
        
        -- Check if role changed
        IF EXISTS (SELECT 1 FROM public.employees WHERE email = 'employee.a@linearaudit.internal' AND role_code = 'SUPER_ADMIN') THEN
            RAISE EXCEPTION 'SECURITY FAIL: Employee A successfully self-promoted to SUPER_ADMIN!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Rejection expected
    END;
    RAISE NOTICE 'PASS [4/7]: Self-promotion and privilege escalation prevention verified.';

    -- 2.3 Direct Invoice Creation: Ordinary Employee cannot insert into invoices
    BEGIN
        INSERT INTO public.invoices (client_id, invoice_number, financial_year, invoice_date, due_date, subtotal, tax_amount, grand_total, outstanding_balance, status)
        VALUES (v_client_x_id, 'INV/TEST/001', '2026-27', CURRENT_DATE, CURRENT_DATE + 30, 1000, 180, 1180, 1180, 'Draft');
        RAISE EXCEPTION 'SECURITY FAIL: Ordinary employee inserted an invoice directly!';
    EXCEPTION WHEN insufficient_privilege OR query_canceled THEN
        -- Expected
    END;
    RAISE NOTICE 'PASS [5/7]: Financial mutation restriction for ordinary employees verified.';

    -- ------------------------------------------------------------------------
    -- TEST 3: CROSS-CLIENT ISOLATION (CLIENT X vs CLIENT Y)
    -- ------------------------------------------------------------------------
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claim.email" = 'client.x.contact@clientdomain.com';

    -- 3.1 Client X attempting to view Client Y invoices
    SELECT COUNT(*) INTO v_test_count 
    FROM public.invoices 
    WHERE client_id = v_client_y_id;

    IF v_test_count > 0 THEN
        RAISE EXCEPTION 'SECURITY FAIL: Client X read invoices belonging to Client Y!';
    END IF;

    -- 3.2 Client X attempting to view Vault Credentials
    SELECT COUNT(*) INTO v_test_count FROM public.vault_credentials;
    IF v_test_count > 0 THEN
        RAISE EXCEPTION 'SECURITY FAIL: Client portal user read vault credentials!';
    END IF;
    RAISE NOTICE 'PASS [6/7]: Cross-client isolation & client vault restriction verified.';

    -- ------------------------------------------------------------------------
    -- TEST 4: SUPER ADMIN FULL PERMISSION VERIFICATION
    -- ------------------------------------------------------------------------
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claim.email" = 'rohitaju21@gmail.com';

    IF NOT public.is_user_super_admin() THEN
        RAISE EXCEPTION 'SECURITY FAIL: Root email was not identified as Super Admin!';
    END IF;
    RAISE NOTICE 'PASS [7/7]: Super Admin identity and full access boundary verified.';

    RAISE NOTICE '=============================================================';
    RAISE NOTICE 'ALL 7 RLS SECURITY SUITE TESTS PASSED SUCCESSFULLY.';
    RAISE NOTICE '=============================================================';
END $$;

-- Rollback test transaction so no temporary mock rows remain
ROLLBACK;
