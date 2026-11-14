-- 038_system_settings.sql
-- Bảng cấu hình hệ thống tập trung cho MLD Vietnam (Web-Admin Settings)

CREATE TABLE IF NOT EXISTS public.system_settings (
    category VARCHAR(50) PRIMARY KEY, -- 'general', 'booking', 'pos', 'academy', 'integrations', 'security'
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_system_settings_updated_at ON public.system_settings(updated_at DESC);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated admin read system_settings" ON public.system_settings;
CREATE POLICY "Allow authenticated admin read system_settings" ON public.system_settings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SUPER_ADMIN', 'ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'INSTRUCTOR')
        )
    );

DROP POLICY IF EXISTS "Allow super_admin write system_settings" ON public.system_settings;
CREATE POLICY "Allow super_admin write system_settings" ON public.system_settings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('SUPER_ADMIN', 'ADMIN')
        )
    );

-- Khởi tạo dữ liệu mặc định (Seed data chuẩn cho các nhóm cấu hình MLD)
INSERT INTO public.system_settings (category, data, description) VALUES
('general', '{
    "company_name": "CÔNG TY CỔ PHẦN CHĂM SÓC SỨC KHỎE MLD VIỆT NAM",
    "short_name": "MLD Healthcare & Spa",
    "tax_code": "0318889999",
    "hotline": "1900 8888",
    "email": "contact@mldvietnam.vn",
    "website": "https://mldvietnam.vn",
    "headquarters_address": "Số 123 Đường Ba Tháng Hai, Phường 11, Quận 10, TP. Hồ Chí Minh",
    "operating_license": "GPHĐ-08992/SYT-GCH"
}'::jsonb, 'Thông tin pháp nhân và thương hiệu MLD'),

('booking', '{
    "open_time": "08:30",
    "close_time": "21:00",
    "slot_duration_minutes": 30,
    "max_late_minutes": 15,
    "buffer_time_minutes": 10,
    "allow_pick_technician": true,
    "cancel_deadline_hours": 2,
    "max_monthly_cancellations": 3
}'::jsonb, 'Quy chuẩn vận hành lịch hẹn trị liệu'),

('pos', '{
    "currency": "VND",
    "enable_cash": true,
    "enable_vietqr": true,
    "enable_card_pos": true,
    "enable_treatment_wallet": true,
    "enable_loyalty_points": true,
    "require_discount_reason": true,
    "receipt_header_text": "MLD HEALTHCARE & SPA - TRỊ LIỆU DẪN LƯU BẠCH HUYẾT",
    "receipt_footer_note": "Cảm ơn Quý khách đã tin tưởng dịch vụ MLD. Chúc Quý khách có một ngày thư thái!",
    "auto_print_receipt_on_payment": true
}'::jsonb, 'Cấu hình thu ngân POS và mẫu hóa đơn in nhiệt 80mm'),

('academy', '{
    "min_attendance_percent_to_graduate": 80,
    "max_allowed_absences": 3,
    "min_quiz_passing_score": 80,
    "max_quiz_retakes": 2,
    "certificate_signer_title": "GIÁM ĐỐC ĐÀO TẠO HỌC VIỆN",
    "certificate_code_prefix": "MLD-CERT"
}'::jsonb, 'Quy chuẩn đào tạo và cấp chứng chỉ MLD Academy'),

('integrations', '{
    "zns_enabled": false,
    "zns_oa_id": "",
    "zns_app_id": "",
    "cloud_storage_provider": "supabase",
    "cloud_storage_bucket": "documents",
    "sms_otp_provider": "disabled"
}'::jsonb, 'Cấu hình kết nối cổng Zalo ZNS và Cloud Storage'),

('security', '{
    "min_password_length": 8,
    "require_special_char": true,
    "session_timeout_minutes": 240,
    "max_login_attempts": 5,
    "enable_audit_logging": true
}'::jsonb, 'Chính sách bảo mật phiên làm việc và tài khoản quản trị')

ON CONFLICT (category) DO UPDATE
SET description = EXCLUDED.description;
