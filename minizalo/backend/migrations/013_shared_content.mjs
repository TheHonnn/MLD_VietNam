export const statements=[
`CREATE TABLE IF NOT EXISTS miniapp_shared_content (
 id uuid PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN ('COMMUNITY','DOCUMENT')),
 title text NOT NULL CHECK(length(btrim(title)) BETWEEN 1 AND 200),
 summary text NOT NULL DEFAULT '',
 content_text text NOT NULL DEFAULT '',
 image_url text,
 attachments jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(attachments)='array'),
 status text NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','ARCHIVED')),
 author_id uuid NOT NULL REFERENCES users(id),
 updated_by uuid NOT NULL REFERENCES users(id),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 payload_hash text NOT NULL,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(status<>'PUBLISHED' OR published_at IS NOT NULL)
)`,
`CREATE INDEX IF NOT EXISTS idx_miniapp_shared_content_feed ON miniapp_shared_content(kind,status,created_at DESC,id DESC)`,
`ALTER TABLE miniapp_shared_content ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON TABLE miniapp_shared_content FROM PUBLIC`,
`DO $$ DECLARE r text; BEGIN FOR r IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP EXECUTE format('REVOKE ALL ON TABLE miniapp_shared_content FROM %I',r); END LOOP; END $$`
];
