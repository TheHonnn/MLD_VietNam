-- ==============================================================================
-- PHASE 2B MIGRATION 003: THIẾT LẬP CHÍNH SÁCH LEAST PRIVILEGE CHO CÁC BẢNG CỐT LÕI
-- Nguyên tắc: Khách hàng chỉ xem/sửa dữ liệu của mình; Nhân viên theo chi nhánh; Quản trị toàn quyền
-- ==============================================================================

-- 1. DANH MỤC CÔNG KHAI (PUBLIC BROWSING - CHỈ CHO PHÉP XEM MỤC HOẠT ĐỘNG is_active = TRUE)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active branches" ON public.branches;
CREATE POLICY "Public can view active branches"
ON public.branches FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on branches" ON public.branches;
CREATE POLICY "Admin full control on branches"
ON public.branches FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services"
ON public.services FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on services" ON public.services;
CREATE POLICY "Admin full control on services"
ON public.services FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
CREATE POLICY "Public can view service categories"
ON public.service_categories FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on service categories" ON public.service_categories;
CREATE POLICY "Admin full control on service categories"
ON public.service_categories FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view active courses" ON public.courses;
CREATE POLICY "Public can view active courses"
ON public.courses FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admin full control on courses" ON public.courses;
CREATE POLICY "Admin full control on courses"
ON public.courses FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. HỒ SƠ NGƯỜI DÙNG (USERS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own profile or staff access" ON public.users;
CREATE POLICY "Users can view own profile or staff access"
ON public.users FOR SELECT
TO authenticated
USING (
    id = auth.uid() 
    OR public.is_admin()
    OR (
        public.is_staff()
        AND (
            role::TEXT = 'CUSTOMER'
            OR id IN (SELECT user_id FROM public.staff_profiles WHERE branch_id = public.get_current_user_branch_id())
        )
    )
);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.is_admin())
WITH CHECK (id = auth.uid() OR public.is_admin());

-- 3. ĐẶT LỊCH HẸN (BOOKINGS & BOOKING_ITEMS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
CREATE POLICY "Bookings select policy"
ON public.bookings FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
    OR (
        public.get_current_user_role() = 'TECHNICIAN'
        AND technician_id IN (SELECT id FROM public.technicians WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Customers and staff can insert bookings" ON public.bookings;
CREATE POLICY "Customers and staff can insert bookings"
ON public.bookings FOR INSERT
TO authenticated
WITH CHECK (
    customer_id = auth.uid() 
    OR public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
CREATE POLICY "Bookings update policy"
ON public.bookings FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
    OR (
        customer_id = auth.uid() 
        AND status IN ('PENDING', 'CONFIRMED')
    )
)
WITH CHECK (
    public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
    OR (
        customer_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Booking items visibility" ON public.booking_items;
CREATE POLICY "Booking items visibility"
ON public.booking_items FOR ALL
TO authenticated
USING (
    booking_id IN (SELECT id FROM public.bookings)
)
WITH CHECK (
    booking_id IN (SELECT id FROM public.bookings)
);

-- 4. HÓA ĐƠN & THU TIỀN (INVOICES & INVOICE_ITEMS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Invoices view policy" ON public.invoices;
CREATE POLICY "Invoices view policy"
ON public.invoices FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
CREATE POLICY "Staff can insert invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
CREATE POLICY "Staff can update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (
    public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
)
WITH CHECK (
    public.is_admin()
    OR (
        public.is_staff()
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Invoice items view policy" ON public.invoice_items;
CREATE POLICY "Invoice items view policy"
ON public.invoice_items FOR ALL
TO authenticated
USING (
    invoice_id IN (SELECT id FROM public.invoices)
)
WITH CHECK (
    invoice_id IN (SELECT id FROM public.invoices)
);

-- 5. HỒ SƠ NHÂN SỰ (STAFF_PROFILES)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff profiles view policy" ON public.staff_profiles;
CREATE POLICY "Staff profiles view policy"
ON public.staff_profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR (
        public.get_current_user_role() = 'BRANCH_MANAGER'
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Admin full control on staff profiles" ON public.staff_profiles;
CREATE POLICY "Admin full control on staff profiles"
ON public.staff_profiles FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 6. GIAO DỊCH HỌC PHÍ & GHI DANH (TUITION & ENROLLMENTS)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tuition transactions view policy" ON public.tuition_transactions;
CREATE POLICY "Tuition transactions view policy"
ON public.tuition_transactions FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
);

DROP POLICY IF EXISTS "Admin manage tuition transactions" ON public.tuition_transactions;
CREATE POLICY "Admin manage tuition transactions"
ON public.tuition_transactions FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_staff())
WITH CHECK (public.is_admin() OR public.is_staff());

DROP POLICY IF EXISTS "Course enrollments view policy" ON public.course_enrollments;
CREATE POLICY "Course enrollments view policy"
ON public.course_enrollments FOR SELECT
TO authenticated
USING (
    student_id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
);

-- 7. GÓI LIỆU TRÌNH KHÁCH HÀNG (USER_PACKAGES & TREATMENT_JOURNAL)
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "User packages view policy" ON public.user_packages;
CREATE POLICY "User packages view policy"
ON public.user_packages FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
);

DROP POLICY IF EXISTS "Staff manage user packages" ON public.user_packages;
CREATE POLICY "Staff manage user packages"
ON public.user_packages FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_staff())
WITH CHECK (public.is_admin() OR public.is_staff());

DROP POLICY IF EXISTS "Treatment journal view policy" ON public.treatment_journal;
CREATE POLICY "Treatment journal view policy"
ON public.treatment_journal FOR SELECT
TO authenticated
USING (
    customer_id = auth.uid()
    OR public.is_admin()
    OR public.is_staff()
);

DROP POLICY IF EXISTS "Staff manage treatment journal" ON public.treatment_journal;
CREATE POLICY "Staff manage treatment journal"
ON public.treatment_journal FOR ALL
TO authenticated
USING (public.is_admin() OR public.is_staff())
WITH CHECK (public.is_admin() OR public.is_staff());
