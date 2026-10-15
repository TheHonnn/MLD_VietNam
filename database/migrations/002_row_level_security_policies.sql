-- ==============================================================================
-- MLD VIỆT NAM - ROW LEVEL SECURITY (RLS) POLICIES & SECURITY ROLES
-- Bảo mật đa tầng: Khách hàng, Lễ tân chi nhánh, Kỹ thuật viên, Quản trị viên
-- ==============================================================================

-- 1. CÁC HÀM TIỆN ÍCH XÁC THỰC BẢO MẬT (SECURITY DEFINER FUNCTIONS)
-- ------------------------------------------------------------------------------

-- Lấy vai trò (Role) của người dùng đang đăng nhập
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Kiểm tra có phải Quản trị viên hệ thống (Admin / Super Admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Lấy Chi nhánh (branch_id) của Lễ tân / Quản lý / Kỹ thuật viên
CREATE OR REPLACE FUNCTION public.get_current_user_branch_id()
RETURNS UUID AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    -- Kiểm tra từ user_roles trước
    SELECT branch_id INTO v_branch_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND branch_id IS NOT NULL 
    LIMIT 1;

    -- Nếu chưa có thì lấy từ hồ sơ nhân sự staff_profiles
    IF v_branch_id IS NULL THEN
        SELECT branch_id INTO v_branch_id 
        FROM public.staff_profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;

    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. KÍCH HOẠT RLS TRÊN TẤT CẢ CÁC BẢNG CỐT LÕI
-- ------------------------------------------------------------------------------
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technician_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_tier_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_point_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_care_guidelines ENABLE ROW LEVEL SECURITY;

-- 3. CHÍNH SÁCH BẢO MẬT: DANH MỤC CÔNG KHAI (PUBLIC BROWSING)
-- Khách chưa đăng nhập hoặc đã đăng nhập đều xem được cơ sở, dịch vụ, bảng giá
-- ------------------------------------------------------------------------------

-- Branches (Chi nhánh)
DROP POLICY IF EXISTS "Public can view active branches" ON public.branches;
CREATE POLICY "Public can view active branches"
ON public.branches FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on branches" ON public.branches;
CREATE POLICY "Admin full control on branches"
ON public.branches FOR ALL
TO authenticated
USING (public.is_admin());

-- Services & Categories (Dịch vụ và Danh mục)
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on services" ON public.services;
CREATE POLICY "Admin full control on services"
ON public.services FOR ALL
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
CREATE POLICY "Public can view service categories"
ON public.service_categories FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on service categories" ON public.service_categories;
CREATE POLICY "Admin full control on service categories"
ON public.service_categories FOR ALL
TO authenticated
USING (public.is_admin());

-- Home care guidelines (Cẩm nang chăm sóc tại nhà)
DROP POLICY IF EXISTS "Public can view published guidelines" ON public.home_care_guidelines;
CREATE POLICY "Public can view published guidelines"
ON public.home_care_guidelines FOR SELECT
USING (is_published = TRUE);

-- 4. CHÍNH SÁCH BẢO MẬT: HỒ SƠ NGƯỜI DÙNG (USERS & SETTINGS)
-- ------------------------------------------------------------------------------

-- Khách hàng tự xem và chỉnh sửa thông tin của chính mình
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR public.is_admin()
    -- Lễ tân xem được thông tin khách hàng đến chi nhánh mình
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER')
        AND id IN (SELECT customer_id FROM public.bookings WHERE branch_id = public.get_current_user_branch_id())
    )
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

-- User Settings (Cài đặt app cá nhân)
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings"
ON public.user_settings FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- 5. CHÍNH SÁCH BẢO MẬT: ĐẶT LỊCH & ĐIỀU PHỐI (BOOKINGS & CHECKIN)
-- Quy tắc: Khách A chỉ xem lịch của khách A; Lễ tân Q3 xem lịch Q3; Admin xem tất cả
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
CREATE POLICY "Bookings select policy"
ON public.bookings FOR SELECT
TO authenticated
USING (
    -- 1. Khách hàng chỉ xem lịch hẹn của chính mình
    customer_id = auth.uid()
    -- 2. Quản trị viên xem tất cả
    OR public.is_admin()
    -- 3. Lễ tân / Quản lý chỉ xem lịch hẹn thuộc chi nhánh của mình
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER', 'CASHIER')
        AND branch_id = public.get_current_user_branch_id()
    )
    -- 4. Kỹ thuật viên xem lịch hẹn được phân công cho mình
    OR (
        public.get_current_user_role() = 'TECHNICIAN'
        AND technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
CREATE POLICY "Customers can create bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
    customer_id = auth.uid() 
    OR public.is_admin()
    OR public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER')
);

DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
CREATE POLICY "Bookings update policy"
ON public.bookings FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    -- Lễ tân chi nhánh được đổi trạng thái checkin/checkout/gán phòng
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'BRANCH_MANAGER')
        AND branch_id = public.get_current_user_branch_id()
    )
    -- Khách hàng chỉ được hủy/đổi giờ khi lịch chưa diễn ra
    OR (
        customer_id = auth.uid() 
        AND status IN ('PENDING', 'CONFIRMED')
    )
);

-- Booking items (Chi tiết các dịch vụ trong lịch hẹn)
DROP POLICY IF EXISTS "Booking items visibility" ON public.booking_items;
CREATE POLICY "Booking items visibility"
ON public.booking_items FOR SELECT
TO authenticated
USING (
    booking_id IN (SELECT id FROM public.bookings)
);

-- 6. CHÍNH SÁCH BẢO MẬT: HÓA ĐƠN & VÍ TIỀN (INVOICES & POINTS)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Invoices view policy" ON public.invoices;
CREATE POLICY "Invoices view policy"
ON public.invoices FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'CASHIER', 'BRANCH_MANAGER')
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Staff can update invoice payment" ON public.invoices;
CREATE POLICY "Staff can update invoice payment"
ON public.invoices FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (
        public.get_current_user_role() IN ('RECEPTIONIST', 'CASHIER', 'BRANCH_MANAGER')
        AND branch_id = public.get_current_user_branch_id()
    )
);

-- Điểm thưởng (Point Transactions)
DROP POLICY IF EXISTS "Users can view own points history" ON public.point_transactions;
CREATE POLICY "Users can view own points history"
ON public.point_transactions FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- Ví Voucher cá nhân (User Vouchers)
DROP POLICY IF EXISTS "Users can view own vouchers" ON public.user_vouchers;
CREATE POLICY "Users can view own vouchers"
ON public.user_vouchers FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- 7. CHÍNH SÁCH BẢO MẬT: LIỆU TRÌNH ĐIỀU TRỊ (TREATMENT & JOURNALS)
-- ------------------------------------------------------------------------------

-- Gói liệu trình khách sở hữu
DROP POLICY IF EXISTS "Users can view own packages" ON public.user_packages;
CREATE POLICY "Users can view own packages"
ON public.user_packages FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid() 
    OR public.is_admin()
    OR public.get_current_user_role() IN ('RECEPTIONIST', 'TECHNICIAN', 'BRANCH_MANAGER')
);

-- Nhật ký điều trị (Hình ảnh trước sau & lời khuyên chuyên gia)
DROP POLICY IF EXISTS "Treatment journal visibility" ON public.treatment_journal;
CREATE POLICY "Treatment journal visibility"
ON public.treatment_journal FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid() 
    OR public.is_admin()
    OR public.get_current_user_role() IN ('RECEPTIONIST', 'TECHNICIAN', 'BRANCH_MANAGER')
);

DROP POLICY IF EXISTS "Technicians can write treatment journal" ON public.treatment_journal;
CREATE POLICY "Technicians can write treatment journal"
ON public.treatment_journal FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin() 
    OR public.get_current_user_role() IN ('TECHNICIAN', 'RECEPTIONIST')
);

-- 8. CHÍNH SÁCH BẢO MẬT: HỌC VIỆN ĐÀO TẠO (ACADEMY LMS & ATTENDANCE)
-- ------------------------------------------------------------------------------

-- Đăng ký khóa học (Enrollments)
DROP POLICY IF EXISTS "Students can view own enrollments" ON public.course_enrollments;
CREATE POLICY "Students can view own enrollments"
ON public.course_enrollments FOR SELECT
TO authenticated
USING (student_id = auth.uid() OR public.is_admin());

-- Điểm danh học viên (Attendance)
DROP POLICY IF EXISTS "Students view own attendance" ON public.student_attendance;
CREATE POLICY "Students view own attendance"
ON public.student_attendance FOR SELECT
TO authenticated
USING (
    enrollment_id IN (SELECT id FROM public.course_enrollments WHERE student_id = auth.uid())
    OR public.is_admin()
    OR public.get_current_user_role() = 'INSTRUCTOR'
);

-- Chứng chỉ điện tử (Tra cứu công khai bằng mã QR hoặc học viên xem của mình)
DROP POLICY IF EXISTS "Certificates public qr or student" ON public.student_certificates;
CREATE POLICY "Certificates public qr or student"
ON public.student_certificates FOR SELECT
USING (
    status = 'ISSUED' -- Cho phép bất kỳ ai quét mã QR chứng chỉ để xác thực công khai
    OR (auth.uid() IS NOT NULL AND student_id = auth.uid())
    OR public.is_admin()
);

-- 9. THÔNG BÁO VÀ HỖ TRỢ (NOTIFICATIONS & TICKETS)
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can mark own notification read" ON public.notifications;
CREATE POLICY "Users can mark own notification read"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own support tickets" ON public.support_tickets;
CREATE POLICY "Users can manage own support tickets"
ON public.support_tickets FOR ALL
TO authenticated
USING (customer_id = auth.uid() OR public.is_admin());

-- 10. TỐI ƯU HÓA CHỈ MỤC TRUY VẤN CAO ĐỘ (HIGH PERFORMANCE COMPOSITE INDEXES)
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_bookings_customer_date_status 
ON public.bookings (customer_id, booking_date DESC, status);

CREATE INDEX IF NOT EXISTS idx_bookings_branch_dispatch 
ON public.bookings (branch_id, booking_date, start_time, status);

CREATE INDEX IF NOT EXISTS idx_technician_slots_concurrency 
ON public.technician_slots (branch_id, slot_date, status, start_time);

CREATE INDEX IF NOT EXISTS idx_invoices_customer_status 
ON public.invoices (customer_id, payment_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_wallet 
ON public.user_vouchers (user_id, status, expires_at);

CREATE INDEX IF NOT EXISTS idx_treatment_journal_customer 
ON public.treatment_journal (customer_id, session_date DESC);

