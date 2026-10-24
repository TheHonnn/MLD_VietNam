export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_staff_bookings (
 booking_id uuid PRIMARY KEY REFERENCES bookings(id),
 staff_id uuid NOT NULL REFERENCES users(id),
 branch_id uuid NOT NULL REFERENCES branches(id),
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`CREATE INDEX IF NOT EXISTS idx_miniapp_staff_bookings_actor ON miniapp_staff_bookings(staff_id,created_at)`,
`ALTER TABLE miniapp_staff_bookings ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_staff_bookings FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_staff_bookings FROM %I',r); END LOOP; END $$`
];
