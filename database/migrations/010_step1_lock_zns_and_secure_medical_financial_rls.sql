-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 010: BƯỚC 1 - KHÓA BẢO VỆ KHẨN CẤP RLS
-- 1. Khóa bảng zns_config (chống lộ bí mật App Secret & Access Token Zalo OA)
-- 2. Loại bỏ hoàn toàn quyền GHI (INSERT, UPDATE, DELETE, TRUNCATE) của role `anon`
--    trên các bảng Tài chính, Y khoa & Người dùng
-- 3. Chặn quyền ĐỌC trái phép của role `anon` trên Bệnh án y khoa & Hóa đơn tài chính
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PHẦN 1: KHÓA BẢO VỆ BẢNG zns_config
-- ------------------------------------------------------------------------------
ALTER TABLE public.zns_config ENABLE ROW LEVEL SECURITY;

-- Thu hồi toàn bộ quyền của anon và authenticated (tránh lộ qua REST API công khai)
REVOKE ALL ON TABLE public.zns_config FROM anon;
REVOKE ALL ON TABLE public.zns_config FROM authenticated;

-- Đảm bảo service_role và postgres có toàn quyền
GRANT ALL ON TABLE public.zns_config TO service_role, postgres;
GRANT SELECT, UPDATE ON TABLE public.zns_config TO authenticated;

-- Xóa các policy cũ
DROP POLICY IF EXISTS "Public read zns_config" ON public.zns_config;
DROP POLICY IF EXISTS "Public Read zns_config" ON public.zns_config;
DROP POLICY IF EXISTS "Staff manage zns_config" ON public.zns_config;
DROP POLICY IF EXISTS "Service role full control on zns_config" ON public.zns_config;
DROP POLICY IF EXISTS "Authenticated manage zns_config" ON public.zns_config;

-- Tạo policy: Chỉ service_role (Backend) và authenticated (Admin đã đăng nhập)
CREATE POLICY "Service role full control on zns_config"
ON public.zns_config FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated manage zns_config"
ON public.zns_config FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- PHẦN 2: LOẠI BỎ QUYỀN GHI & ĐỌC TRÁI PHÉP CỦA `anon` TRÊN CÁC BẢNG TÀI CHÍNH & Y KHOA
-- ------------------------------------------------------------------------------

DO $$
DECLARE
    -- Nhóm bảng y khoa & tài chính tối mật (Chặn cả ĐỌC và GHI đối với anon)
    strictly_private_tables text[] := ARRAY[
        'edema_assessments',
        'treatment_journal',
        'invoices',
        'tuition_transactions',
        'staff_commissions',
        'inventory_consumption_logs'
    ];

    -- Nhóm bảng cần giữ SELECT cho khách (xác thực chứng chỉ, tra cứu tài khoản) nhưng CHẶN TOÀN BỘ GHI đối với anon
    write_protected_tables text[] := ARRAY[
        'student_certificates',
        'users',
        'user_roles',
        'user_settings'
    ];

    tbl text;
BEGIN
    -- 1. Xử lý nhóm bảng tối mật (Chặn hoàn toàn anon cả SELECT, INSERT, UPDATE, DELETE)
    FOREACH tbl IN ARRAY strictly_private_tables
    LOOP
        -- Thu hồi toàn bộ quyền từ anon
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon;', tbl);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated, service_role, postgres;', tbl);

        -- Xóa các policy cũ mở toang
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Staff manage ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Staff read/write ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public read ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public Read ' || tbl, tbl);
        IF tbl = 'staff_commissions' THEN
            EXECUTE 'DROP POLICY IF EXISTS "Staff read/write commissions" ON public.staff_commissions;';
        END IF;
        IF tbl = 'inventory_consumption_logs' THEN
            EXECUTE 'DROP POLICY IF EXISTS "Staff read/write consumption_logs" ON public.inventory_consumption_logs;';
        END IF;

        -- Tạo Policy mới: CHỈ DÀNH CHO authenticated và service_role
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
            'Authenticated read ' || tbl, tbl
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
            'Staff manage ' || tbl, tbl
        );

        RAISE NOTICE 'Đã khóa bảo vệ tối mật thành công cho bảng: %', tbl;
    END LOOP;

    -- 2. Xử lý nhóm bảng bảo vệ quyền ghi (Giữ SELECT cho anon, nhưng chặn INSERT, UPDATE, DELETE, TRUNCATE)
    FOREACH tbl IN ARRAY write_protected_tables
    LOOP
        -- Thu hồi quyền GHI từ anon
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.%I FROM anon;', tbl);
        -- Đảm bảo anon chỉ có SELECT
        EXECUTE format('GRANT SELECT ON TABLE public.%I TO anon;', tbl);
        EXECUTE format('GRANT ALL ON TABLE public.%I TO authenticated, service_role, postgres;', tbl);

        -- Xóa policy Staff manage cũ vốn cấp cho anon
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Staff manage ' || tbl, tbl);

        -- Tạo Policy GHI: CHỈ DÀNH CHO authenticated
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);',
            'Staff manage ' || tbl, tbl
        );

        RAISE NOTICE 'Đã khóa quyền ghi anon thành công cho bảng: %', tbl;
    END LOOP;
END $$;
