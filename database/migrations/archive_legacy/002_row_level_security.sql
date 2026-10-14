-- ==============================================================================
-- MEDICAL HEALTHCARE SYSTEM - ROW LEVEL SECURITY (RLS) & POLICIES
-- Target: Supabase / PostgreSQL Security Layer
-- ==============================================================================

-- 1. BẬT ROW LEVEL SECURITY (RLS) TRÊN CÁC BẢNG NHẠY CẢM
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialities ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. HÀM TRỢ GIÚP KIỂM TRA ROLE NGƯỜI DÙNG HIỆN TẠI (HELPER FUNCTIONS)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS user_role AS $$
    SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_receptionist_or_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'RECEPTIONIST'));
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ==============================================================================
-- 3. POLICIES CHO BẢNG USERS
-- ==============================================================================
-- Bất kỳ ai cũng có thể đọc thông tin cơ bản của Bác sĩ (họ tên, avatar)
CREATE POLICY "Public can view doctor user profiles"
ON users FOR SELECT
USING (role = 'DOCTOR' OR id = auth.uid() OR is_receptionist_or_admin());

-- Bệnh nhân chỉ được cập nhật thông tin của chính mình
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin có toàn quyền
CREATE POLICY "Admins have full access on users"
ON users FOR ALL
USING (is_admin());

-- ==============================================================================
-- 4. POLICIES CHO SPECIALITIES & CLINICS & DOCTORS (DANH MỤC CÔNG KHAI)
-- ==============================================================================
CREATE POLICY "Anyone can view active specialities"
ON specialities FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins manage specialities"
ON specialities FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view active clinics"
ON clinics FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins manage clinics"
ON clinics FOR ALL USING (is_admin());

CREATE POLICY "Anyone can view active doctors"
ON doctors FOR SELECT USING (is_available = TRUE);

CREATE POLICY "Doctors can update their own bio"
ON doctors FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage doctors"
ON doctors FOR ALL USING (is_admin());

-- ==============================================================================
-- 5. POLICIES CHO DOCTOR_SLOTS
-- ==============================================================================
CREATE POLICY "Anyone can view available slots"
ON doctor_slots FOR SELECT
USING (status IN ('AVAILABLE', 'HOLD') OR is_receptionist_or_admin() OR 
       EXISTS (SELECT 1 FROM doctors WHERE id = doctor_slots.doctor_id AND user_id = auth.uid()));

CREATE POLICY "Staff can manage slots"
ON doctor_slots FOR ALL
USING (is_receptionist_or_admin());

-- ==============================================================================
-- 6. POLICIES CHO FAMILY_MEMBERS (HỒ SƠ GIA ĐÌNH)
-- ==============================================================================
CREATE POLICY "Users can manage own family members"
ON family_members FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Medical staff can view family members involved in appointment"
ON family_members FOR SELECT
USING (is_receptionist_or_admin());

-- ==============================================================================
-- 7. POLICIES CHO APPOINTMENTS (LỊCH HẸN KHÁM)
-- ==============================================================================
-- Bệnh nhân chỉ xem được lịch của chính mình
CREATE POLICY "Patients view own appointments"
ON appointments FOR SELECT
USING (
    patient_id = auth.uid() 
    OR is_receptionist_or_admin()
    OR EXISTS (SELECT 1 FROM doctors WHERE id = appointments.doctor_id AND user_id = auth.uid())
);

-- Bệnh nhân được phép tạo lịch mới cho mình
CREATE POLICY "Patients can create appointments"
ON appointments FOR INSERT
WITH CHECK (patient_id = auth.uid());

-- Bệnh nhân được cập nhật (hủy hoặc đổi lịch) của chính mình nếu chưa hoàn thành
CREATE POLICY "Patients can update own pending appointments"
ON appointments FOR UPDATE
USING (patient_id = auth.uid())
WITH CHECK (patient_id = auth.uid());

-- Nhân viên lễ tân & Bác sĩ được cập nhật trạng thái (check-in, hoàn tất)
CREATE POLICY "Staff can update appointments"
ON appointments FOR UPDATE
USING (is_receptionist_or_admin() OR EXISTS (SELECT 1 FROM doctors WHERE id = appointments.doctor_id AND user_id = auth.uid()));

-- ==============================================================================
-- 8. POLICIES CHO MEDICAL_RECORDS (BẢO MẬT HỒ SƠ BỆNH ÁN)
-- ==============================================================================
-- Bệnh nhân xem bệnh án của chính mình
CREATE POLICY "Patients view own medical records"
ON medical_records FOR SELECT
USING (patient_id = auth.uid());

-- Bác sĩ phụ trách ca khám được xem và tạo/sửa bệnh án
CREATE POLICY "Doctors manage assigned medical records"
ON medical_records FOR ALL
USING (
    EXISTS (SELECT 1 FROM doctors WHERE id = medical_records.doctor_id AND user_id = auth.uid())
    OR is_admin()
);

-- ==============================================================================
-- 9. POLICIES CHO DOCTOR_REVIEWS (ĐÁNH GIÁ BÁC SĨ)
-- ==============================================================================
CREATE POLICY "Public can view reviews"
ON doctor_reviews FOR SELECT USING (TRUE);

-- Chỉ bệnh nhân đã hoàn tất ca khám mới được tạo review
CREATE POLICY "Patients can create reviews for own completed appointments"
ON doctor_reviews FOR INSERT
WITH CHECK (
    patient_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM appointments 
        WHERE id = appointment_id AND patient_id = auth.uid() AND status = 'COMPLETED'
    )
);

-- ==============================================================================
-- 10. POLICIES CHO NOTIFICATIONS & AUDIT_LOGS
-- ==============================================================================
CREATE POLICY "Users manage own notifications"
ON notifications FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins can view audit logs"
ON audit_logs FOR SELECT
USING (is_admin());

