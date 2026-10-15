-- PROPOSAL: shared database owner must review and apply. Never run on startup.
-- Does not modify any existing customer or require nullable phone numbers.
BEGIN;
CREATE TABLE IF NOT EXISTS public.zalo_identities (
    zalo_app_id VARCHAR(64) NOT NULL CHECK (zalo_app_id ~ '^[0-9]+$'),
    zalo_user_id VARCHAR(64) NOT NULL CHECK (zalo_user_id ~ '^[0-9]+$'),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (zalo_app_id, zalo_user_id),
    UNIQUE (zalo_app_id, user_id)
);
ALTER TABLE public.zalo_identities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.zalo_identities FROM PUBLIC;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE ALL ON public.zalo_identities FROM anon;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON public.zalo_identities FROM authenticated;
    END IF;
END $$;
COMMIT;
-- Grant SELECT, INSERT only to the trusted backend DB role if it is not owner.
-- Existing customer linkage must be performed by an authorized operator after
-- verifying account ownership. Never accept a client-supplied UUID for linking.
