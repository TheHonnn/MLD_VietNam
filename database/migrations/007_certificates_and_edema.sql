-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 007: GIẤY CHỨNG NHẬN CHUẨN Y KHOA & KIỂM TRA PHÙ
-- 1. Bổ sung trường cho student_certificates: date_of_birth, qr_image_url, signer_name, signer_title
-- 2. Tạo bảng quản lý kiểm tra phù bạch huyết lâm sàng: edema_assessments
-- 3. Row Level Security (RLS) & Seed Dữ liệu Chuẩn
-- ==============================================================================

-- 1. MỞ RỘNG BẢNG student_certificates
ALTER TABLE public.student_certificates 
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS qr_image_url TEXT,
  ADD COLUMN IF NOT EXISTS signer_name VARCHAR(100) DEFAULT 'Bác sĩ / Master Trainer Viện MLD',
  ADD COLUMN IF NOT EXISTS signer_title VARCHAR(100) DEFAULT 'Giám Đốc Đào Tạo Chuyên Môn';

ALTER TABLE public.student_certificates ALTER COLUMN enrollment_id DROP NOT NULL;
ALTER TABLE public.student_certificates ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE public.student_certificates ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE public.student_certificates ALTER COLUMN theory_score DROP NOT NULL;
ALTER TABLE public.student_certificates ALTER COLUMN practical_score DROP NOT NULL;


CREATE INDEX IF NOT EXISTS idx_student_certificates_code ON public.student_certificates(certificate_code);
CREATE INDEX IF NOT EXISTS idx_student_certificates_student ON public.student_certificates(student_id);

-- 2. TẠO BẢNG ĐĂNG KÝ & KIỂM TRA PHÙ BẠCH HUYẾT LÂM SÀNG (edema_assessments)
CREATE TABLE IF NOT EXISTS public.edema_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name VARCHAR(150) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    examiner_id UUID REFERENCES public.users(id),
    assessment_date DATE NOT NULL,
    time_slot VARCHAR(30) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'WAITING_CONFIRMATION', -- WAITING_CONFIRMATION, CONFIRMED, CANCELLED, COMPLETED
    result VARCHAR(30) NOT NULL DEFAULT 'PENDING',              -- PENDING, PASSED, FAILED, NEEDS_FOLLOW_UP
    stage_level VARCHAR(30),                                   -- Giai đoạn: Stage 0, Stage I, Stage II, Stage III
    circumference_measurements JSONB DEFAULT '{}'::jsonb,       -- Số đo chu vi các điểm sưng phù (cm)
    clinical_notes TEXT,                                       -- Nhận định lâm sàng của chuyên gia
    certificate_issued_id UUID REFERENCES public.student_certificates(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_edema_assess_date ON public.edema_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_edema_assess_status ON public.edema_assessments(status);
CREATE INDEX IF NOT EXISTS idx_edema_assess_branch ON public.edema_assessments(branch_id);

-- Trigger updated_at
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_edema_assessments_updated_at') THEN
        CREATE TRIGGER trg_edema_assessments_updated_at
        BEFORE UPDATE ON public.edema_assessments
        FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();
    END IF;
END $$;

-- 3. CẬP NHẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.edema_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read edema_assessments" ON public.edema_assessments;
CREATE POLICY "Public read edema_assessments"
ON public.edema_assessments FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Staff manage edema_assessments" ON public.edema_assessments;
CREATE POLICY "Staff manage edema_assessments"
ON public.edema_assessments FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Public read student_certificates" ON public.student_certificates;
CREATE POLICY "Public read student_certificates"
ON public.student_certificates FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Staff manage student_certificates" ON public.student_certificates;
CREATE POLICY "Staff manage student_certificates"
ON public.student_certificates FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 4. SEED DỮ LIỆU GIẤY CHỨNG NHẬN MẪU CHUẨN Y KHOA (student_certificates)
INSERT INTO public.student_certificates (
    id, enrollment_id, student_id, course_id, student_name, date_of_birth, course_title, certificate_code, qr_verification_code, issue_date, theory_score, practical_score, final_grade, status, signer_name, signer_title
)
VALUES
    (
        '55555555-0001-0001-0001-000000000001',
        '88888888-0001-0001-0001-000000000001',
        '26e0bc2d-ce98-4ce4-ae18-3b581b1c916e',
        '30303030-0001-0001-0001-000000000001',
        'Nguyễn Thị Mai',
        '1995-05-18',
        'Kỹ Thuật Dẫn Lưu Bạch Huyết Chuyên Sâu (MLD Advanced)',
        'MLD-GCN-2026-0881',
        'https://mldvietnam.vn/verify/MLD-GCN-2026-0881',
        '2026-10-15',
        9.5,
        9.8,
        'XUẤT SẮC',
        'ISSUED',
        'BS. CKI Trần Hoàng Nam',
        'Chủ Tịch Hội Đồng Y Khoa MLD'
    ),
    (
        '55555555-0001-0001-0001-000000000002',
        '88888888-0001-0001-0001-000000000002',
        'a4299039-eae5-4e3e-9277-83b3c1059057',
        '30303030-0001-0001-0001-000000000002',
        'Trần Thu Trang',
        '1992-11-24',
        'Trị Liệu Thoát Phù & Phục Hồi Sau Phẫu Thuật',
        'MLD-GCN-2026-0882',
        'https://mldvietnam.vn/verify/MLD-GCN-2026-0882',
        '2026-10-18',
        8.5,
        9.0,
        'GIỎI',
        'ISSUED',
        'Master Trainer Thảo Ngọc',
        'Giám Đốc Đào Tạo Chuyên Môn'
    ),
    (
        '55555555-0001-0001-0001-000000000003',
        '88888888-0001-0001-0001-000000000003',
        'bbbbbbbb-0001-0001-0001-000000000005',
        '30303030-0001-0001-0001-000000000001',
        'Phạm Hoàng Oanh',
        '1998-03-09',
        'Thực Hành Lâm Sàng Đánh Giá & Phân Loại Phù Bạch Huyết',
        'MLD-GCN-2026-0883',
        'https://mldvietnam.vn/verify/MLD-GCN-2026-0883',
        '2026-10-22',
        9.0,
        9.5,
        'XUẤT SẮC',
        'ISSUED',
        'BS. CKI Trần Hoàng Nam',
        'Chủ Tịch Hội Đồng Y Khoa MLD'
    )

ON CONFLICT (id) DO UPDATE
SET student_name = EXCLUDED.student_name,
    date_of_birth = EXCLUDED.date_of_birth,
    course_title = EXCLUDED.course_title,
    certificate_code = EXCLUDED.certificate_code,
    qr_verification_code = EXCLUDED.qr_verification_code,
    issue_date = EXCLUDED.issue_date,
    final_grade = EXCLUDED.final_grade,
    status = EXCLUDED.status;

-- 5. SEED DỮ LIỆU ĐĂNG KÝ KIỂM TRA PHÙ BẠCH HUYẾT LÂM SÀNG (edema_assessments)
INSERT INTO public.edema_assessments (
    id, customer_name, customer_phone, branch_id, assessment_date, time_slot, status, result, stage_level, circumference_measurements, clinical_notes
)
VALUES
    (
        '66666666-0001-0001-0001-000000000001',
        'Lê Thị Ánh Tuyết',
        '0912345678',
        'aaaaaaaa-0001-0001-0001-000000000001',
        '2026-10-28',
        '09:00 - 10:00',
        'WAITING_CONFIRMATION',
        'PENDING',
        'Stage I',
        '{"cang_tay_trai": "24.5cm", "cang_tay_phai": "22.0cm", "chenh_lech": "+2.5cm"}'::jsonb,
        'Khách có dấu hiệu phù hồi phục sau phẫu thuật ngực 3 tháng. Cần đo áp lực và kiểm tra lưu thông hạch nách.'
    ),
    (
        '66666666-0001-0001-0001-000000000002',
        'Đoàn Bảo Ngọc',
        '0988776655',
        'aaaaaaaa-0001-0001-0001-000000000001',
        '2026-10-26',
        '14:00 - 15:00',
        'CONFIRMED',
        'PENDING',
        'Stage II',
        '{"bap_chan_trai": "38.0cm", "bap_chan_phai": "34.0cm", "chenh_lech": "+4.0cm"}'::jsonb,
        'Phù ấn lõm không hồi phục nhanh, có xơ cứng bì nhẹ. Đã xếp lịch khám cùng Bác sĩ Nam.'
    ),
    (
        '66666666-0001-0001-0001-000000000003',
        'Phạm Hoàng Oanh',
        '0909123456',
        'aaaaaaaa-0001-0001-0001-000000000002',
        '2026-10-22',
        '10:30 - 11:30',
        'COMPLETED',
        'PASSED',
        'Stage 0',
        '{"tay_trai": "21.5cm", "tay_phai": "21.5cm", "chenh_lech": "0cm"}'::jsonb,
        'Học viên thực hành đo lâm sàng chính xác, đạt chuẩn kỹ thuật dẫn lưu Vodder quốc tế. Đã cấp GCN MLD-GCN-2026-0883.'
    )
ON CONFLICT (id) DO NOTHING;
