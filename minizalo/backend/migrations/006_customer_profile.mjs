export const version='006_customer_profile';
export const statements=[`CREATE TABLE IF NOT EXISTS miniapp_customer_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id),
  preferred_branch_id uuid REFERENCES branches(id),
  skin_type varchar(150) NOT NULL DEFAULT '',
  health_notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT miniapp_health_notes_length CHECK (length(health_notes)<=10000)
)`,
`ALTER TABLE miniapp_customer_profiles ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_customer_profiles FROM PUBLIC`,
`DO $$ DECLARE role_name text; BEGIN
  FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    EXECUTE format('REVOKE ALL ON TABLE miniapp_customer_profiles FROM %I',role_name);
  END LOOP;
END $$`];
