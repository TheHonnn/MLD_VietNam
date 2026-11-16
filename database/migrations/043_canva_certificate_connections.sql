CREATE SCHEMA IF NOT EXISTS mld_private;
REVOKE ALL ON SCHEMA mld_private FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS mld_private.canva_certificate_connections (
  admin_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  oauth_state text,
  oauth_verifier text,
  oauth_expires_at timestamptz,
  credentials text
);

ALTER TABLE mld_private.canva_certificate_connections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE mld_private.canva_certificate_connections FROM PUBLIC, anon, authenticated;
