-- Bind member-only document checks to the authenticated Supabase user and
-- replace public treatment-journal IDs with revocable, expiring share tokens.

ALTER TABLE public.treatment_journal
  ADD COLUMN IF NOT EXISTS share_token_hash TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS share_revoked_at TIMESTAMPTZ;

ALTER TABLE public.courses
  ALTER COLUMN certificate_title SET DEFAULT 'Chứng nhận Kỹ thuật viên Spa MLD';

ALTER TABLE public.certificate_templates
  ALTER COLUMN title_text SET DEFAULT 'CHỨNG NHẬN TỐT NGHIỆP';

CREATE OR REPLACE FUNCTION public.fn_check_student_document_access(
    p_student_id UUID,
    p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_doc RECORD;
    v_enrollment RECORD;
BEGIN
    SELECT * INTO v_doc
    FROM public.miniapp_shared_content
    WHERE id = p_document_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('can_access', FALSE, 'can_download', FALSE, 'reason', 'Tài liệu không tồn tại');
    END IF;

    IF UPPER(v_doc.access_level) = 'PUBLIC' THEN
        RETURN jsonb_build_object(
            'can_access', TRUE,
            'can_download', COALESCE(v_doc.allow_download, TRUE),
            'reason', 'Tài liệu công khai'
        );
    END IF;

    IF UPPER(v_doc.access_level) = 'FREE_TRIAL' THEN
        RETURN jsonb_build_object(
            'can_access', TRUE,
            'can_download', COALESCE(v_doc.allow_download, FALSE),
            'reason', 'Tài liệu đọc thử'
        );
    END IF;

    IF auth.uid() IS NULL OR p_student_id IS DISTINCT FROM auth.uid() THEN
        RETURN jsonb_build_object('can_access', FALSE, 'can_download', FALSE, 'reason', 'Vui lòng đăng nhập đúng tài khoản học viên');
    END IF;

    IF v_doc.course_id IS NOT NULL THEN
        SELECT * INTO v_enrollment
        FROM public.course_enrollments
        WHERE student_id = auth.uid()
          AND course_id = v_doc.course_id
          AND approval_status = 'APPROVED'
        ORDER BY enrolled_at DESC
        LIMIT 1;
    ELSE
        SELECT * INTO v_enrollment
        FROM public.course_enrollments
        WHERE student_id = auth.uid()
          AND approval_status = 'APPROVED'
        ORDER BY enrolled_at DESC
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('can_access', FALSE, 'can_download', FALSE, 'reason', 'Tài liệu chỉ dành cho học viên đã được duyệt');
    END IF;

    IF COALESCE(v_doc.require_full_payment, TRUE)
       AND COALESCE(v_enrollment.amount_paid, 0) < COALESCE(v_enrollment.tuition_total, 0) THEN
        RETURN jsonb_build_object('can_access', TRUE, 'can_download', FALSE, 'reason', 'Bạn được xem trực tuyến; cần hoàn tất học phí để tải tệp');
    END IF;

    RETURN jsonb_build_object(
        'can_access', TRUE,
        'can_download', COALESCE(v_doc.allow_download, FALSE),
        'reason', CASE WHEN COALESCE(v_doc.allow_download, FALSE) THEN 'Đủ điều kiện xem và tải giáo trình' ELSE 'Tài liệu chỉ cho phép xem trực tuyến' END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_check_student_document_access(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_check_student_document_access(UUID, UUID) TO anon, authenticated, service_role;
