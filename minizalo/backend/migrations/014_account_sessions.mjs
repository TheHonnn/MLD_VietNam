export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_account_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES users(id),
 token_hash text NOT NULL UNIQUE CHECK(length(token_hash)=64),
 device_label text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_seen_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz
)`,
`CREATE INDEX IF NOT EXISTS idx_miniapp_account_sessions_owner ON miniapp_account_sessions(user_id,last_seen_at DESC)`,
`CREATE TABLE IF NOT EXISTS miniapp_account_revocations (
 user_id uuid PRIMARY KEY REFERENCES users(id),
 revoked_before timestamptz NOT NULL
)`,
`ALTER TABLE miniapp_account_sessions ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE miniapp_account_revocations ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_account_sessions,miniapp_account_revocations FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_account_sessions,miniapp_account_revocations FROM %I',r); END LOOP; END $$`
];
