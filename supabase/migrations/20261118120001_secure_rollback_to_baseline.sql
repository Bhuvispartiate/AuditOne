-- ============================================================================
-- LINEAR AUDIT PMS — SECURE ROLLBACK TO BASELINE SCHEMA (MIGRATION 20261118120001)
-- Safe, audited rollback that restores previous verified functional state.
-- NEVER recreates blanket USING(true) policies.
-- Keeps RLS enabled on all tables and maintains strict anon denial.
-- ============================================================================

BEGIN;

-- Step 1: Ensure RLS remains enabled on all tables (No table is ever exposed publicly)
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

-- Step 2: Ensure anon has zero read/write access
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- Step 3: Re-verify Super Admin and Admin functions
CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        LOWER(COALESCE(auth.jwt() ->> 'email', '')) = 'rohitaju21@gmail.com'
        OR EXISTS (
            SELECT 1 FROM public.employees
            WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
              AND role_code = 'SUPER_ADMIN'
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        public.is_user_super_admin()
        OR EXISTS (
            SELECT 1 FROM public.employees
            WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
              AND role_code IN ('SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'HEAD')
        )
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

COMMIT;
