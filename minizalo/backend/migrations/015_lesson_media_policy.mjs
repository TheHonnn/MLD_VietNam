export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_lesson_media_policy (
 lesson_id uuid PRIMARY KEY REFERENCES course_lessons(id),
 media_url text NOT NULL CHECK(length(media_url) BETWEEN 1 AND 4000),
 allow_public_embed boolean NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 1 AND 1000),
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
)`,
`ALTER TABLE miniapp_lesson_media_policy ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_lesson_media_policy FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_lesson_media_policy FROM %I',r); END LOOP; END $$`
];
