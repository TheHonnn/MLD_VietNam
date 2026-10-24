export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_course_access (
 enrollment_id uuid PRIMARY KEY REFERENCES course_enrollments(id),
 expires_at timestamptz,
 is_suspended boolean NOT NULL DEFAULT false,
 reason text NOT NULL CHECK(length(trim(reason))>0),
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`ALTER TABLE miniapp_course_access ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_course_access FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_course_access FROM %I',r); END LOOP; END $$`
];
