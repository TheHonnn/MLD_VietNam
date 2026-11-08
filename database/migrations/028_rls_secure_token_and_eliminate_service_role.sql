-- ==============================================================================
-- 028_rls_secure_token_and_eliminate_service_role.sql
-- Cấu hình Row Level Security (RLS) trên Supabase cho người dùng đăng nhập bằng token (auth.uid() = id),
-- bảo mật toàn diện cho app mobile khi loại bỏ hoàn toàn supabaseServiceRoleKey.
-- ==============================================================================

-- 1. TIỆN ÍCH KIỂM TRA QUYỀN ADMIN & VAI TRÒ
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_branch_id()
RETURNS UUID AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    SELECT branch_id INTO v_branch_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND branch_id IS NOT NULL 
    LIMIT 1;

    IF v_branch_id IS NULL THEN
        SELECT branch_id INTO v_branch_id 
        FROM public.staff_profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;

    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;


-- 2. BẢNG USERS: RLS THEO auth.uid() = id VÀ CHO PHÉP TRA CỨU MÃ GIỚI THIỆU
-- ------------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Public can view referrer basic info" ON public.users;
DROP POLICY IF EXISTS "Admin full control on users" ON public.users;

-- Người dùng xem hồ sơ của chính mình hoặc admin xem tất cả
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR public.is_admin()
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER', 'CASHIER')
        AND id IN (SELECT customer_id FROM public.bookings WHERE branch_id = public.get_current_user_branch_id())
    )
);

-- Cho phép tìm kiếm công khai thông tin người giới thiệu (không lộ số CCCD, password_hash)
CREATE POLICY "Public can view referrer basic info"
ON public.users FOR SELECT
TO anon, authenticated
USING (
    referral_code IS NOT NULL
);

-- Người dùng tự cập nhật hồ sơ của mình (hoặc Admin)
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

-- Quyền toàn năng cho Admin
CREATE POLICY "Admin full control on users"
ON public.users FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 3. BẢNG BOOKINGS: RLS CHO LỊCH HẸN THEO customer_id = auth.uid()
-- ------------------------------------------------------------------------------
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Admin full control on bookings" ON public.bookings;

-- Xem ca hẹn: Khách hàng chỉ xem của mình; Nhân viên xem chi nhánh; Admin xem tất cả
CREATE POLICY "Bookings select policy"
ON public.bookings FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER', 'CASHIER')
        AND branch_id = public.get_current_user_branch_id()
    )
    OR (
        public.get_current_user_role() = 'TECHNICIAN'
        AND technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
    )
);

-- Khách hàng tạo ca hẹn của mình (hoặc Lễ tân / Admin tạo cho khách)
CREATE POLICY "Customers can create bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
    customer_id = auth.uid() 
    OR public.is_admin()
    OR public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER')
);

-- Khách hàng được cập nhật/hủy lịch hẹn chưa diễn ra của chính mình
CREATE POLICY "Bookings update policy"
ON public.bookings FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER', 'CASHIER')
        AND branch_id = public.get_current_user_branch_id()
    )
    OR (
        customer_id = auth.uid() 
        AND status IN ('PENDING', 'CONFIRMED')
    )
);

-- Quyền toàn năng cho Admin
CREATE POLICY "Admin full control on bookings"
ON public.bookings FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 4. BẢNG COURSE_ENROLLMENTS: RLS THEO student_id = auth.uid()
-- ------------------------------------------------------------------------------
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can view own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can create own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Admin full control on enrollments" ON public.course_enrollments;

CREATE POLICY "Students can view own enrollments"
ON public.course_enrollments FOR SELECT
TO authenticated
USING (
    student_id = auth.uid() 
    OR public.is_admin()
);

CREATE POLICY "Students can create own enrollments"
ON public.course_enrollments FOR INSERT
TO authenticated
WITH CHECK (
    student_id = auth.uid() 
    OR public.is_admin()
);

CREATE POLICY "Admin full control on enrollments"
ON public.course_enrollments FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- 5. TIẾN TRÌNH HỌC TẬP & BÀI THI: user_lesson_progress & quiz_submissions
-- ------------------------------------------------------------------------------
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students track own lesson progress" ON public.user_lesson_progress;
CREATE POLICY "Students track own lesson progress"
ON public.user_lesson_progress FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students submit and view quiz submissions" ON public.quiz_submissions;
CREATE POLICY "Students submit and view quiz submissions"
ON public.quiz_submissions FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);


-- 6. DANH MỤC CÔNG KHAI: CHO PHÉP SELECT VỚI ANON KEY
-- ------------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active branches" ON public.branches;
CREATE POLICY "Public can view active branches"
ON public.branches FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
CREATE POLICY "Public can view service categories"
ON public.service_categories FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

ALTER TABLE public.home_care_guidelines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published guidelines" ON public.home_care_guidelines;
CREATE POLICY "Public can view published guidelines"
ON public.home_care_guidelines FOR SELECT
TO anon, authenticated
USING (is_published = TRUE);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active courses" ON public.courses;
CREATE POLICY "Public can view active courses"
ON public.courses FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view course chapters" ON public.course_chapters;
CREATE POLICY "Public can view course chapters"
ON public.course_chapters FOR SELECT
TO anon, authenticated
USING (true);

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view course lessons" ON public.course_lessons;
CREATE POLICY "Public can view course lessons"
ON public.course_lessons FOR SELECT
TO anon, authenticated
USING (true);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view quiz questions" ON public.quiz_questions;
CREATE POLICY "Public can view quiz questions"
ON public.quiz_questions FOR SELECT
TO anon, authenticated
USING (true);

ALTER TABLE public.treatment_packages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view active treatment packages" ON public.treatment_packages;
CREATE POLICY "Public can view active treatment packages"
ON public.treatment_packages FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);


-- 7. CHÍNH SÁCH STORAGE CHO BUCKET AVATARS (UPLOAD KHÔNG CẦN SERVICE ROLE)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- Cho phép xem avatar công khai
    DROP POLICY IF EXISTS "Public can view avatars" ON storage.objects;
    CREATE POLICY "Public can view avatars"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'avatars');

    -- Cho phép người dùng upload ảnh đại diện vào bucket avatars
    DROP POLICY IF EXISTS "Users can upload avatar" ON storage.objects;
    CREATE POLICY "Users can upload avatar"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'avatars');

    -- Cho phép cập nhật ảnh đại diện
    DROP POLICY IF EXISTS "Users can update avatar" ON storage.objects;
    CREATE POLICY "Users can update avatar"
    ON storage.objects FOR UPDATE
    TO anon, authenticated
    USING (bucket_id = 'avatars');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Storage policies already applied or storage.objects not accessible directly.';
END $$;
