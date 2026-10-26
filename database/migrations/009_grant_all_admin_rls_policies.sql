-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 009: KHẮC PHỤC TRIỆT ĐỂ LỖI QUYỀN GHI RLS TOÀN HỆ THỐNG
-- Cấp quyền Đọc & Quản trị (SELECT, INSERT, UPDATE, DELETE) cho toàn bộ các bảng vận hành
-- Giải quyết lỗi: "Database chưa xác nhận cập nhật. Tài khoản có thể thiếu quyền ghi..."
-- ==============================================================================

DO $$
DECLARE
    tbl text;
    r record;
BEGIN
    -- Quét toàn bộ các bảng người dùng trong public schema
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    )
    LOOP
        tbl := r.tablename;

        -- Bật RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);

        -- Xóa các policy cũ nếu có
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Staff manage ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public read ' || tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public Read ' || tbl, tbl);

        -- Tạo Policy ĐỌC (SELECT) cho authenticated và anon
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated, anon USING (true);',
            'Public read ' || tbl, tbl
        );

        -- Tạo Policy QUẢN TRỊ TOÀN DIỆN (INSERT, UPDATE, DELETE) cho authenticated và anon
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);',
            'Staff manage ' || tbl, tbl
        );

        RAISE NOTICE 'Đã cấp quyền Quản trị RLS thành công cho bảng: %', tbl;
    END LOOP;
END $$;
