export const version='007_audit_integrity';
const tables=['miniapp_customer_requests','miniapp_course_delivery','miniapp_membership_cards'];
export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_customer_requests (
 user_id uuid NOT NULL REFERENCES users(id), scope varchar(40) NOT NULL,
 request_key uuid NOT NULL, payload_hash char(64) NOT NULL, resource_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_id,scope,request_key), CHECK(scope IN ('support','consultation'))
)`,
`CREATE TABLE IF NOT EXISTS miniapp_course_delivery (
 course_id uuid PRIMARY KEY REFERENCES courses(id),
 delivery_format varchar(20) NOT NULL CHECK(delivery_format IN ('ONLINE','ONSITE','HYBRID')),
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE TABLE IF NOT EXISTS miniapp_membership_cards (
 user_id uuid PRIMARY KEY REFERENCES users(id), card_code varchar(100) NOT NULL UNIQUE CHECK(length(trim(card_code))>0),
 expires_at timestamptz, is_active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
...tables.flatMap(table=>[
 `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`,
 `REVOKE ALL ON TABLE ${table} FROM PUBLIC`,
 `DO $$ DECLARE role_name text; BEGIN
 FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
 EXECUTE format('REVOKE ALL ON TABLE ${table} FROM %I',role_name);
 END LOOP; END $$`
])];
