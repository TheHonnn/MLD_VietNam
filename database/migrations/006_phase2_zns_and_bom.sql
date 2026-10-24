-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 006: PHASE 2 ADVANCED OPERATIONS & AUTOMATION
-- 1. Quản lý Mẫu Kịch bản Zalo ZNS (zns_templates) & Nhật ký gửi tin (zns_logs)
-- 2. Quản lý Định mức Tiêu hao Vật tư / Dược mỹ phẩm (service_materials)
-- 3. Nhật ký Tiêu hao Kho Tự động (inventory_consumption_logs)
-- 4. Bảng kê Hoa hồng Kỹ thuật viên & Nhân sự (staff_commissions)
-- 5. Row Level Security (RLS) & Seed Dữ liệu Chuẩn
-- ==============================================================================

-- 1. BẢNG MẪU KỊCH BẢN ZALO ZNS (zns_templates)
CREATE TABLE IF NOT EXISTS public.zns_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    content_template TEXT NOT NULL,
    sample_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Trigger cập nhật updated_at cho zns_templates
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_zns_templates_updated_at') THEN
        CREATE TRIGGER trg_zns_templates_updated_at
        BEFORE UPDATE ON public.zns_templates
        FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;

-- 2. BẢNG NHẬT KÝ GỬI TIN ZALO ZNS (zns_logs)
CREATE TABLE IF NOT EXISTS public.zns_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(100),
    template_code VARCHAR(50) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    params_sent JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT', -- 'SENT', 'DELIVERED', 'FAILED'
    response_code VARCHAR(50) DEFAULT '0',
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zns_logs_phone ON public.zns_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_zns_logs_sent_at ON public.zns_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_zns_logs_template ON public.zns_logs(template_code);

-- 3. CẬP NHẬT RLS POLICIES CHO CÁC BẢNG PHASE 2
ALTER TABLE public.zns_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zns_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption_logs ENABLE ROW LEVEL SECURITY;

-- Quyền đọc công khai / nội bộ cho zns_templates
DROP POLICY IF EXISTS "Public read zns_templates" ON public.zns_templates;
CREATE POLICY "Public read zns_templates"
ON public.zns_templates FOR SELECT
TO anon, authenticated
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Staff manage zns_templates" ON public.zns_templates;
CREATE POLICY "Staff manage zns_templates"
ON public.zns_templates FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Quyền cho zns_logs
DROP POLICY IF EXISTS "Staff manage zns_logs" ON public.zns_logs;
CREATE POLICY "Staff manage zns_logs"
ON public.zns_logs FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Quyền cho staff_commissions
DROP POLICY IF EXISTS "Staff read/write commissions" ON public.staff_commissions;
CREATE POLICY "Staff read/write commissions"
ON public.staff_commissions FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Quyền cho service_materials
DROP POLICY IF EXISTS "Staff read/write service_materials" ON public.service_materials;
CREATE POLICY "Staff read/write service_materials"
ON public.service_materials FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- Quyền cho inventory_consumption_logs
DROP POLICY IF EXISTS "Staff read/write consumption_logs" ON public.inventory_consumption_logs;
CREATE POLICY "Staff read/write consumption_logs"
ON public.inventory_consumption_logs FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 4. SEED 4 MẪU KỊCH BẢN ZALO ZNS CHUẨN Y KHOA MLD
INSERT INTO public.zns_templates (template_code, name, description, content_template, sample_params, is_active)
VALUES
(
    'BOOKING_CONFIRMATION',
    'Xác nhận đặt lịch hẹn MLD Vietnam',
    'Tự động gửi ngay khi khách hàng hoặc lễ tân tạo lịch hẹn thành công',
    'Kính gửi Quý khách {customer_name}, Viện Trị liệu MLD Việt Nam xin thông báo lịch hẹn dịch vụ [{service_name}] của Quý khách đã được xác nhận thành công lúc {booking_time} ngày {booking_date} tại {branch_name}. KTV phụ trách: {staff_name}. Mã QR Check-in: {checkin_code}. Trân trọng cảm ơn Quý khách!',
    '{"customer_name": "Nguyễn Thị Mai", "service_name": "Dẫn lưu bạch huyết vùng bụng", "booking_time": "14:00", "booking_date": "24/10/2026", "branch_name": "MLD Nam Kỳ Khởi Nghĩa", "staff_name": "KTV Lê Hoài An", "checkin_code": "MLD-8821"}'::jsonb,
    TRUE
),
(
    'BOOKING_REMINDER',
    'Nhắc hẹn trước giờ trị liệu (2 tiếng)',
    'Tự động kích hoạt trước ca hẹn 2 tiếng để giảm thiểu tỷ lệ khách quên lịch (No-show)',
    'Chào Chị {customer_name}, KTV {staff_name} và phòng trị liệu tại {branch_name} đã sẵn sàng đón Chị vào lúc {booking_time} hôm nay. Chúc Chị có một buổi trị liệu dẫn lưu bạch huyết thật thư thái và hiệu quả!',
    '{"customer_name": "Trần Thu Trang", "staff_name": "KTV Phạm Thảo Vy", "branch_name": "MLD Nam Kỳ Khởi Nghĩa", "booking_time": "16:00"}'::jsonb,
    TRUE
),
(
    'POST_TREATMENT_CARE',
    'Dặn dò & Chăm sóc sau trị liệu dẫn lưu bạch huyết (24h)',
    'Tự động gửi sau khi KTV bấm Kết ca trị liệu 24 giờ để nâng cao sự an tâm và gắn kết của khách',
    'Bác sĩ MLD dặn dò: Sau liệu trình [{service_name}], cơ thể đang trong chu trình đào thải độc tố tự nhiên qua hệ bạch huyết. Quý khách vui lòng uống đủ 2 lít nước ấm, hạn chế đồ uống có cồn và tắm nước quá nóng trong 24 giờ nhé!',
    '{"customer_name": "Hoàng Yến", "service_name": "Dẫn lưu bạch huyết giảm phù tay"}'::jsonb,
    TRUE
),
(
    'RECALL_VISIT',
    'Nhắc tái khám & duy trì liệu trình định kỳ (14 ngày)',
    'Tự động kích hoạt sau 14 ngày kể từ buổi gần nhất để kích cầu quay lại duy trì chu kỳ liệu trình',
    'Chào Chị {customer_name}, đã 14 ngày kể từ buổi trị liệu dẫn lưu bạch huyết gần nhất tại MLD. Để duy trì sự thanh thoát cho vóc dáng và tuần hoàn dịch mô tối ưu, Chị hãy đặt lịch buổi tiếp theo trong tuần này nhé!',
    '{"customer_name": "Đặng Minh Tâm"}'::jsonb,
    TRUE
)
ON CONFLICT (template_code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    content_template = EXCLUDED.content_template,
    sample_params = EXCLUDED.sample_params,
    updated_at = CURRENT_TIMESTAMP;

-- 5. SEED ĐỊNH MỨC NGUYÊN VẬT LIỆU (BOM) CHO CÁC DỊCH VỤ TRỊ LIỆU
-- Dịch vụ 1: Dẫn lưu bạch huyết giảm phù tay (db29e3c0-c659-492c-8aef-a7d8abc772a3)
INSERT INTO public.service_materials (service_id, material_name, dosage_per_session, unit, notes)
VALUES
    ('db29e3c0-c659-492c-8aef-a7d8abc772a3', 'Tinh dầu dẫn lưu bạch huyết y khoa MLD', 20.00, 'ml', 'Dầu chuyên dụng chiết xuất thảo dược organic'),
    ('db29e3c0-c659-492c-8aef-a7d8abc772a3', 'Khăn spa tiệt trùng y tế dùng 1 lần', 1.00, 'cái', 'Khăn tiệt trùng nhiệt độ cao'),
    ('db29e3c0-c659-492c-8aef-a7d8abc772a3', 'Túi trà thảo mộc detox tiếp đón', 1.00, 'gói', 'Trà tim sen hoa cúc thanh lọc')
ON CONFLICT DO NOTHING;

-- Dịch vụ 2: Dẫn lưu bạch huyết vùng bụng (9e82989e-0ebe-4156-8ffb-9ae8087215f1)
INSERT INTO public.service_materials (service_id, material_name, dosage_per_session, unit, notes)
VALUES
    ('9e82989e-0ebe-4156-8ffb-9ae8087215f1', 'Tinh dầu dẫn lưu bạch huyết thải độc bụng', 25.00, 'ml', 'Thẩm thấu qua da, kích thích nhu động đại tràng'),
    ('9e82989e-0ebe-4156-8ffb-9ae8087215f1', 'Gel đắp ấm thảo dược dưỡng ấm tử cung', 30.00, 'ml', 'Gel ấm ngải cứu gừng tươi'),
    ('9e82989e-0ebe-4156-8ffb-9ae8087215f1', 'Khăn spa tiệt trùng y tế dùng 1 lần', 1.00, 'cái', 'Khăn tiệt trùng nhiệt độ cao')
ON CONFLICT DO NOTHING;

-- Dịch vụ 3: Dẫn lưu bạch huyết vùng chân (235166f2-66c9-4231-bbe1-af91b48fc67c)
INSERT INTO public.service_materials (service_id, material_name, dosage_per_session, unit, notes)
VALUES
    ('235166f2-66c9-4231-bbe1-af91b48fc67c', 'Tinh dầu dẫn lưu chi dưới giảm sưng phù', 30.00, 'ml', 'Đặc trị suy giãn tĩnh mạch và tích nước bắp chân'),
    ('235166f2-66c9-4231-bbe1-af91b48fc67c', 'Muối khoáng ngâm chân thảo mộc y học cổ truyền', 50.00, 'gram', 'Muối hồng Hymalaya kết hợp quế hồi'),
    ('235166f2-66c9-4231-bbe1-af91b48fc67c', 'Khăn spa tiệt trùng y tế dùng 1 lần', 2.00, 'cái', 'Khăn tiệt trùng nhiệt độ cao')
ON CONFLICT DO NOTHING;

-- Dịch vụ 4: Dẫn lưu bạch huyết vùng lưng (6a75b767-971b-4aed-85ec-e42d57997e9f)
INSERT INTO public.service_materials (service_id, material_name, dosage_per_session, unit, notes)
VALUES
    ('6a75b767-971b-4aed-85ec-e42d57997e9f', 'Tinh dầu thông kinh lạc vùng lưng', 30.00, 'ml', 'Giải tỏa áp lực cột sống thắt lưng'),
    ('6a75b767-971b-4aed-85ec-e42d57997e9f', 'Đá nóng bazan núi lửa chườm kinh lạc', 4.00, 'viên', 'Giữ nhiệt 45 độ C'),
    ('6a75b767-971b-4aed-85ec-e42d57997e9f', 'Khăn spa tiệt trùng y tế dùng 1 lần', 2.00, 'cái', 'Khăn tiệt trùng nhiệt độ cao')
ON CONFLICT DO NOTHING;

-- Dịch vụ 5: Dẫn lưu mạch huyết vùng đầu, mặt, cổ (3fc31bdd-7b70-4c51-a815-20bc9caaa941)
INSERT INTO public.service_materials (service_id, material_name, dosage_per_session, unit, notes)
VALUES
    ('3fc31bdd-7b70-4c51-a815-20bc9caaa941', 'Serum dẫn lưu bạch huyết mặt & cổ', 15.00, 'ml', 'Thon gọn hàm V-line, giảm nọng cằm'),
    ('3fc31bdd-7b70-4c51-a815-20bc9caaa941', 'Mặt nạ phục hồi sinh học collagen', 1.00, 'miếng', 'Dưỡng ẩm chuyên sâu sau trị liệu'),
    ('3fc31bdd-7b70-4c51-a815-20bc9caaa941', 'Bông tẩy trang y tế tiệt trùng', 4.00, 'miếng', 'Bông cotton 100%')
ON CONFLICT DO NOTHING;

-- 6. SEED DỮ LIỆU HOA HỒNG MẪU (staff_commissions) CHO THÁNG 10/2026
INSERT INTO public.staff_commissions (
    staff_id, branch_id, commission_type, base_amount, percentage, commission_amount, status, cycle_month, notes
)
VALUES
    -- KTV Lê Hoài An
    ('7ab40597-207a-4c70-8662-70f4f8607c35', 'aaaaaaaa-0001-0001-0001-000000000001', 'SERVICE_DIRECT', 450000.00, 10.00, 45000.00, 'APPROVED', '2026-10', 'Ca trị liệu Dẫn lưu bạch huyết vùng bụng'),
    ('7ab40597-207a-4c70-8662-70f4f8607c35', 'aaaaaaaa-0001-0001-0001-000000000001', 'PACKAGE_UPSELL', 4500000.00, 5.00, 225000.00, 'APPROVED', '2026-10', 'Tư vấn bán gói Combo Dẫn lưu 10 buổi'),
    ('7ab40597-207a-4c70-8662-70f4f8607c35', 'aaaaaaaa-0001-0001-0001-000000000001', 'CSAT_BONUS', 50000.00, 100.00, 50000.00, 'PAID', '2026-10', 'Khách hàng đánh giá 5 sao ca chiều'),

    -- KTV Phạm Thảo Vy
    ('097ef776-4afe-4a25-9927-910b9ab55e59', 'aaaaaaaa-0001-0001-0001-000000000001', 'SERVICE_DIRECT', 450000.00, 12.00, 54000.00, 'APPROVED', '2026-10', 'KTV Bậc 2 - Ca Dẫn lưu giảm phù tay'),
    ('097ef776-4afe-4a25-9927-910b9ab55e59', 'aaaaaaaa-0001-0001-0001-000000000001', 'SERVICE_DIRECT', 450000.00, 12.00, 54000.00, 'PENDING_APPROVAL', '2026-10', 'Ca Dẫn lưu vùng chân cuối ngày'),

    -- KTV Võ Hoàng Yến
    ('bf9c4730-3f30-45c2-8d74-bb4859cc4d96', 'aaaaaaaa-0001-0001-0001-000000000001', 'SERVICE_DIRECT', 450000.00, 10.00, 45000.00, 'APPROVED', '2026-10', 'Ca Dẫn lưu mạch huyết đầu mặt cổ'),
    ('bf9c4730-3f30-45c2-8d74-bb4859cc4d96', 'aaaaaaaa-0001-0001-0001-000000000001', 'PACKAGE_UPSELL', 3500000.00, 5.00, 175000.00, 'PENDING_APPROVAL', '2026-10', 'Tư vấn gói Phục hồi sau sinh'),

    -- KTV Nguyễn Thu Hà
    ('741f42e2-001f-47de-9ce7-a9340fccc616', 'aaaaaaaa-0001-0001-0001-000000000002', 'SERVICE_DIRECT', 450000.00, 10.00, 45000.00, 'PAID', '2026-10', 'Ca Dẫn lưu toàn thân cơ sở 2'),
    ('741f42e2-001f-47de-9ce7-a9340fccc616', 'aaaaaaaa-0001-0001-0001-000000000002', 'SERVICE_DIRECT', 450000.00, 10.00, 45000.00, 'APPROVED', '2026-10', 'Ca trị liệu thông kinh lạc lưng')
ON CONFLICT DO NOTHING;

-- 7. SEED NHẬT KÝ GỬI TIN MẪU (zns_logs)
INSERT INTO public.zns_logs (
    recipient_phone, recipient_name, template_code, params_sent, status, response_code
)
VALUES
    ('0901234567', 'Nguyễn Thị Mai', 'BOOKING_CONFIRMATION', '{"service": "Dẫn lưu bạch huyết vùng bụng", "time": "14:00 24/10"}'::jsonb, 'SENT', '0'),
    ('0912345678', 'Trần Thu Trang', 'BOOKING_REMINDER', '{"ktv": "Lê Hoài An", "branch": "Nam Kỳ Khởi Nghĩa"}'::jsonb, 'DELIVERED', '0'),
    ('0987654321', 'Hoàng Yến', 'POST_TREATMENT_CARE', '{"advice": "Uống 2L nước ấm, nghỉ ngơi"}'::jsonb, 'DELIVERED', '0')
ON CONFLICT DO NOTHING;
