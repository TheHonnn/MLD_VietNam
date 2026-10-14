-- ==============================================================================
-- MLD VIỆT NAM - ROW LEVEL SECURITY (RLS) & POLICIES
-- Target: Supabase / PostgreSQL Security Layer
-- Version: 3.0.0
-- ==============================================================================

-- 1. BẬT ROW LEVEL SECURITY (RLS) TRÊN CÁC BẢNG
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. HÀM KIỂM TRA ROLE NGƯỜI DÙNG
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 3. POLICIES CHO BẢNG USERS
-- ==============================================================================
CREATE POLICY "Users can view own profile or public staff"
ON users FOR SELECT
USING (id = auth.uid() OR role IN ('TECHNICIAN', 'INSTRUCTOR', 'STAFF') OR is_staff_or_admin());

CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins have full access on users"
ON users FOR ALL
USING (is_admin());

-- ==============================================================================
-- 4. POLICIES CHO DANH MỤC CÔNG KHAI (BRANCHES, SERVICES, PACKAGES, COURSES)
-- ==============================================================================
CREATE POLICY "Public can view active branches"
ON branches FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view active service categories"
ON service_categories FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view active services"
ON services FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view active technicians"
ON technicians FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Public can view technician slots"
ON technician_slots FOR SELECT USING (TRUE);

CREATE POLICY "Public can view active treatment packages"
ON treatment_packages FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view active course categories"
ON course_categories FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view active instructors"
ON instructors FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view active courses"
ON courses FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public can view course batches"
ON course_batches FOR SELECT USING (TRUE);

CREATE POLICY "Public can view active coupons"
ON coupons FOR SELECT USING (is_active = TRUE AND valid_to >= CURRENT_TIMESTAMP);

CREATE POLICY "Public can view reviews"
ON reviews FOR SELECT USING (TRUE);

-- ==============================================================================
-- 5. POLICIES CHO BOOKINGS & GÓI LIỆU TRÌNH (DỮ LIỆU CÁ NHÂN KHÁCH HÀNG)
-- ==============================================================================
CREATE POLICY "Customers can view own bookings"
ON bookings FOR SELECT
USING (customer_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Customers can create bookings"
ON bookings FOR INSERT
WITH CHECK (customer_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Customers can update own bookings"
ON bookings FOR UPDATE
USING (customer_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Customers can view own packages"
ON user_packages FOR SELECT
USING (customer_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Customers can view own treatment journal"
ON treatment_journal FOR SELECT
USING (customer_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Students can view own enrollments"
ON course_enrollments FOR SELECT
USING (student_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Students can enroll courses"
ON course_enrollments FOR INSERT
WITH CHECK (student_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Users can view own point transactions"
ON point_transactions FOR SELECT
USING (user_id = auth.uid() OR is_staff_or_admin());

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can write reviews for own bookings"
ON reviews FOR INSERT
WITH CHECK (customer_id = auth.uid());

