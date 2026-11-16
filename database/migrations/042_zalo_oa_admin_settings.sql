CREATE SCHEMA IF NOT EXISTS mld_private;
REVOKE ALL ON SCHEMA mld_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS mld_private.zalo_oa_settings (
    singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
    access_token text,
    template_id text NOT NULL,
    test_phone text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE mld_private.zalo_oa_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mld_private.zalo_oa_settings FROM PUBLIC, anon, authenticated;
