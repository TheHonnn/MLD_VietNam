-- ==============================================================================
-- MLD VIETNAM - MIGRATION 019: DOCUMENT & CURRICULUM ACCESS & DOWNLOAD PERMISSIONS
-- Phân hệ: Phân quyền tải và truy cập Giáo trình / Tài liệu PDF Học viện MLD
-- Yêu cầu: Kiểm soát bản quyền, phân quyền tải theo Khóa học, Lớp học, Học phí
-- ==============================================================================

-- 1. Bổ sung các cột phân quyền truy cập và tải giáo trình vào bảng miniapp_shared_content
ALTER TABLE public.miniapp_shared_content
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS allow_download BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS require_full_payment BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allowed_roles JSONB DEFAULT '["STUDENT", "INSTRUCTOR", "ADMIN"]'::jsonb,
  ADD COLUMN IF NOT EXISTS watermark_text VARCHAR(150) DEFAULT 'MLD ACADEMY - BẢN QUYỀN ĐÀO TẠO';

-- 2. Tạo Index tối ưu hóa việc tra cứu giáo trình theo khóa học
CREATE INDEX IF NOT EXISTS idx_shared_content_course_id ON public.miniapp_shared_content(course_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_allow_download ON public.miniapp_shared_content(allow_download);

-- 3. Tạo function kiểm tra quyền tải giáo trình của học viên (RPC Function)
CREATE OR REPLACE FUNCTION public.fn_check_student_document_access(
    p_student_id UUID,
    p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_doc RECORD;
    v_enrollment RECORD;
    v_result JSONB;
BEGIN
    -- 1. Lấy thông tin tài liệu
    SELECT * INTO v_doc FROM public.miniapp_shared_content WHERE id = p_document_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('can_access', FALSE, 'can_download', FALSE, 'reason', 'Tài liệu không tồn tại');
    END IF;

    -- 2. Nếu tài liệu công khai (PUBLIC)
    IF UPPER(v_doc.access_level) = 'PUBLIC' THEN
        RETURN jsonb_build_object(
            'can_access', TRUE,
            'can_download', COALESCE(v_doc.allow_download, TRUE),
            'reason', 'Tài liệu công khai'
        );
    END IF;

    -- 3. Nếu tài liệu đọc thử (FREE_TRIAL)
    IF UPPER(v_doc.access_level) = 'FREE_TRIAL' THEN
        RETURN jsonb_build_object(
            'can_access', TRUE,
            'can_download', COALESCE(v_doc.allow_download, FALSE),
            'reason', 'Tài liệu đọc thử'
        );
    END IF;

    -- 4. Nếu tài liệu dành riêng cho học viên (MEMBERS_ONLY hoặc COURSE_ENROLLED)
    -- Kiểm tra hồ sơ học viên
    IF p_student_id IS NULL THEN
        RETURN jsonb_build_object(
            'can_access', FALSE,
            'can_download', FALSE,
            'reason', 'Vui lòng đăng nhập tài khoản học viên để truy cập giáo trình này'
        );
    END IF;

    -- 5. Nếu tài liệu gắn với khóa học cụ thể (v_doc.course_id IS NOT NULL)
    IF v_doc.course_id IS NOT NULL THEN
        SELECT * INTO v_enrollment 
        FROM public.course_enrollments 
        WHERE student_id = p_student_id 
          AND course_id = v_doc.course_id
          AND approval_status = 'APPROVED'
        ORDER BY enrolled_at DESC 
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'can_access', FALSE,
                'can_download', FALSE,
                'reason', 'Giáo trình này chỉ dành riêng cho học viên đã đăng ký và được duyệt khóa học tương ứng'
            );
        END IF;

        -- Kiểm tra điều kiện học phí nếu tài liệu yêu cầu
        IF COALESCE(v_doc.require_full_payment, TRUE) THEN
            IF COALESCE(v_enrollment.payment_status, '') != 'PAID' AND COALESCE(v_enrollment.amount_paid, 0) < COALESCE(v_enrollment.final_tuition, v_enrollment.tuition_total, 0) THEN
                RETURN jsonb_build_object(
                    'can_access', TRUE,
                    'can_download', FALSE,
                    'reason', 'Bạn được xem giáo trình trực tuyến. Vui lòng hoàn tất học phí để tải file PDF về máy'
                );
            END IF;
        END IF;

        -- Đủ điều kiện khóa học và học phí
        RETURN jsonb_build_object(
            'can_access', TRUE,
            'can_download', COALESCE(v_doc.allow_download, FALSE),
            'reason', CASE WHEN COALESCE(v_doc.allow_download, FALSE) THEN 'Đủ điều kiện xem và tải giáo trình' ELSE 'Giáo trình bảo mật - chỉ cho phép đọc trực tuyến' END
        );
    ELSE
        -- Tài liệu chung cho mọi học viên đã có ít nhất 1 khóa học được duyệt
        SELECT * INTO v_enrollment 
        FROM public.course_enrollments 
        WHERE student_id = p_student_id 
          AND approval_status = 'APPROVED'
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'can_access', FALSE,
                'can_download', FALSE,
                'reason', 'Giáo trình này chỉ dành riêng cho học viên chính thức của Học viện MLD'
            );
        END IF;

        RETURN jsonb_build_object(
            'can_access', TRUE,
            'can_download', COALESCE(v_doc.allow_download, FALSE),
            'reason', CASE WHEN COALESCE(v_doc.allow_download, FALSE) THEN 'Đủ điều kiện xem và tải giáo trình' ELSE 'Giáo trình bảo mật - chỉ cho phép đọc trực tuyến' END
        );
    END IF;
END;
$$;
