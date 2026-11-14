-- Add missing Portal tables without inserting or replacing business content.
-- Re-runnable; also replaces unsafe policies from the legacy Portal migration.
CREATE TABLE IF NOT EXISTS public.portal_contacts (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'primary_mld_contacts',
    hotline_support VARCHAR(50) NOT NULL DEFAULT '',
    hotline_training VARCHAR(50) NOT NULL DEFAULT '',
    zalo_oa_url TEXT NOT NULL DEFAULT '',
    messenger_url TEXT NOT NULL DEFAULT '',
    fanpage_url TEXT NOT NULL DEFAULT '',
    tiktok_url TEXT NOT NULL DEFAULT '',
    youtube_url TEXT DEFAULT '',
    working_hours VARCHAR(150) NOT NULL DEFAULT '',
    headquarters_address TEXT NOT NULL DEFAULT '',
    consultation_badge_text VARCHAR(100) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.portal_taxonomies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'TARGET_AUDIENCE' hoặc 'TARGET_NEED'
    code VARCHAR(100) NOT NULL, -- Mã định danh duy nhất trong nhóm (VD: 'BEGINNER', 'SPA_PRO')
    name VARCHAR(200) NOT NULL, -- Tên hiển thị (VD: 'Người mới bắt đầu', 'Đang làm nghề')
    description TEXT, -- Mô tả hiển thị trên thẻ chọn (phụ đề App)
    icon_name VARCHAR(100) DEFAULT 'person',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_portal_taxonomies_type_code UNIQUE (type, code)
);

CREATE TABLE IF NOT EXISTS public.support_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(100) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.legal_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) UNIQUE NOT NULL, -- 'privacy_policy', 'terms_of_service', 'refund_policy'
    title VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    content_markdown TEXT NOT NULL,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.portal_contacts ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='portal_contacts' LOOP
 EXECUTE format('DROP POLICY %I ON public.portal_contacts',p.policyname);
 END LOOP;
END $$;
REVOKE ALL ON public.portal_contacts FROM anon, authenticated;
GRANT SELECT ON public.portal_contacts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portal_contacts TO authenticated;
GRANT ALL ON public.portal_contacts TO service_role;
CREATE POLICY "Portal public read" ON public.portal_contacts FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "Portal admin manage" ON public.portal_contacts FOR ALL TO authenticated
 USING (public.admin_is_super()) WITH CHECK (public.admin_is_super());

ALTER TABLE public.portal_taxonomies ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='portal_taxonomies' LOOP
 EXECUTE format('DROP POLICY %I ON public.portal_taxonomies',p.policyname);
 END LOOP;
END $$;
REVOKE ALL ON public.portal_taxonomies FROM anon, authenticated;
GRANT SELECT ON public.portal_taxonomies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portal_taxonomies TO authenticated;
GRANT ALL ON public.portal_taxonomies TO service_role;
CREATE POLICY "Portal public read" ON public.portal_taxonomies FOR SELECT TO anon, authenticated USING (is_active = TRUE);
CREATE POLICY "Portal admin manage" ON public.portal_taxonomies FOR ALL TO authenticated
 USING (public.admin_is_super()) WITH CHECK (public.admin_is_super());

ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='support_faqs' LOOP
 EXECUTE format('DROP POLICY %I ON public.support_faqs',p.policyname);
 END LOOP;
END $$;
REVOKE ALL ON public.support_faqs FROM anon, authenticated;
GRANT SELECT ON public.support_faqs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.support_faqs TO authenticated;
GRANT ALL ON public.support_faqs TO service_role;
CREATE POLICY "Portal public read" ON public.support_faqs FOR SELECT TO anon, authenticated USING (is_active = TRUE);
CREATE POLICY "Portal admin manage" ON public.support_faqs FOR ALL TO authenticated
 USING (public.admin_is_super()) WITH CHECK (public.admin_is_super());

ALTER TABLE public.legal_policies ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='legal_policies' LOOP
 EXECUTE format('DROP POLICY %I ON public.legal_policies',p.policyname);
 END LOOP;
END $$;
REVOKE ALL ON public.legal_policies FROM anon, authenticated;
GRANT SELECT ON public.legal_policies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.legal_policies TO authenticated;
GRANT ALL ON public.legal_policies TO service_role;
CREATE POLICY "Portal public read" ON public.legal_policies FOR SELECT TO anon, authenticated USING (is_published = TRUE);
CREATE POLICY "Portal admin manage" ON public.legal_policies FOR ALL TO authenticated
 USING (public.admin_is_super()) WITH CHECK (public.admin_is_super());

NOTIFY pgrst, 'reload schema';
