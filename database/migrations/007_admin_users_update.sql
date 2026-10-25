-- Allow authenticated administrators to persist account edits. Existing read
-- policies and account data are retained. No customer/self-update policy added.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '20s';

CREATE OR REPLACE FUNCTION public.mld_can_update_accounts()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.users
        WHERE id = (SELECT auth.uid())
          AND is_active = TRUE
          AND role::text IN ('ADMIN', 'SUPER_ADMIN')
    );
$$;

REVOKE ALL ON FUNCTION public.mld_can_update_accounts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mld_can_update_accounts() TO authenticated;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
          AND policyname = 'MLD authenticated administrators update accounts'
    ) THEN
        CREATE POLICY "MLD authenticated administrators update accounts"
        ON public.users FOR UPDATE TO authenticated
        USING ((SELECT public.mld_can_update_accounts()))
        WITH CHECK ((SELECT public.mld_can_update_accounts()));
    END IF;
END;
$$;

GRANT UPDATE ON public.users TO authenticated;

COMMIT;
