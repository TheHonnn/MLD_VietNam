export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_course_audiences (
 course_id uuid PRIMARY KEY REFERENCES courses(id),
 audience text NOT NULL CHECK(audience IN ('BEGINNER','PRACTITIONER')),
 reason text NOT NULL CHECK(length(trim(reason))>0),
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`ALTER TABLE miniapp_course_audiences ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_course_audiences FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_course_audiences FROM %I',r); END LOOP; END $$`
];
