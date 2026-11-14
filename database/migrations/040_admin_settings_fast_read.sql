-- Allow the settings screen to read without waiting for the Render backend.
CREATE OR REPLACE FUNCTION public.admin_read_system_settings()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    account_role text;
BEGIN
    SELECT role::text INTO account_role
    FROM public.users
    WHERE id = auth.uid() AND is_active = true;

    IF account_role IS NULL OR account_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
        RAISE EXCEPTION 'Tài khoản chưa được cấp quyền xem cài đặt.' USING ERRCODE = '42501';
    END IF;

    RETURN (
        SELECT coalesce(jsonb_object_agg(category, jsonb_build_object(
            'data', CASE
                WHEN account_role = 'ADMIN' AND category = 'integrations'
                    AND coalesce(data->>'zns_app_secret', '') <> ''
                THEN jsonb_set(data, '{zns_app_secret}', '"********"'::jsonb)
                ELSE data
            END,
            'description', description,
            'updated_at', updated_at
        )), '{}'::jsonb)
        FROM public.system_settings
        WHERE category IN ('general','booking','pos','academy','integrations','security')
    );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_read_system_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_read_system_settings() TO authenticated;
NOTIFY pgrst, 'reload schema';
