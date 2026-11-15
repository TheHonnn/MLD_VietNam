BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.get_smtp_credentials()') IS NOT NULL THEN
        REVOKE EXECUTE ON FUNCTION public.get_smtp_credentials()
            FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION public.get_smtp_credentials() TO service_role;
    END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
