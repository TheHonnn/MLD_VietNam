-- Tách các cổng tư vấn, tài chính, duyệt nhập học và học tập.
ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS consultation_status VARCHAR(40) NOT NULL DEFAULT 'PENDING_CONSULTATION',
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(40) NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS student_status VARCHAR(40) NOT NULL DEFAULT 'NOT_APPROVED',
  ADD COLUMN IF NOT EXISTS required_deposit NUMERIC(12,2) NOT NULL DEFAULT 2000000,
  ADD COLUMN IF NOT EXISTS final_tuition NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consultation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS qr_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS order_code VARCHAR(60),
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_months INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_reason TEXT;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS minimum_attendance_rate NUMERIC(5,2) NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS minimum_theory_score NUMERIC(4,2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS minimum_practical_score NUMERIC(4,2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS require_full_payment_for_graduation BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE public.course_enrollments
SET required_deposit=LEAST(GREATEST(required_deposit,0),tuition_total),
    amount_paid=GREATEST(amount_paid,0);

WITH ranked AS (
  SELECT id,row_number() OVER(PARTITION BY student_id,course_id ORDER BY enrolled_at DESC,id DESC) AS position
  FROM public.course_enrollments
  WHERE status::text NOT IN ('GRADUATED','DROPPED')
)
UPDATE public.course_enrollments enrollment
SET status='DROPPED',
    approval_notes=concat_ws(E'\n',enrollment.approval_notes,'Tự động đóng hồ sơ trùng khi nâng cấp luồng tuyển sinh')
FROM ranked WHERE ranked.id=enrollment.id AND ranked.position>1;

ALTER TABLE public.course_enrollments
  DROP CONSTRAINT IF EXISTS chk_enrollment_required_deposit,
  ADD CONSTRAINT chk_enrollment_required_deposit CHECK (required_deposit>=0 AND required_deposit<=tuition_total),
  DROP CONSTRAINT IF EXISTS chk_enrollment_amount_paid,
  ADD CONSTRAINT chk_enrollment_amount_paid CHECK (amount_paid>=0);

CREATE OR REPLACE FUNCTION public.fn_normalize_enrollment_finance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.required_deposit := LEAST(GREATEST(COALESCE(NEW.required_deposit,0),0),NEW.tuition_total);
  NEW.amount_paid := GREATEST(COALESCE(NEW.amount_paid,0),0);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_normalize_enrollment_finance ON public.course_enrollments;
CREATE TRIGGER trg_normalize_enrollment_finance
BEFORE INSERT OR UPDATE OF tuition_total,required_deposit,amount_paid ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.fn_normalize_enrollment_finance();

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_student_course_enrollment
  ON public.course_enrollments(student_id,course_id)
  WHERE status NOT IN ('GRADUATED'::enrollment_status,'DROPPED'::enrollment_status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_issued_certificate_per_enrollment
  ON public.student_certificates(enrollment_id)
  WHERE status='ISSUED'::certificate_status;

UPDATE public.course_enrollments enrollment
SET required_deposit = COALESCE(course.deposit_amount, 2000000),
    final_tuition = COALESCE(enrollment.final_tuition, enrollment.tuition_total)
FROM public.courses course
WHERE course.id = enrollment.course_id;

CREATE INDEX IF NOT EXISTS idx_enrollment_workflow
  ON public.course_enrollments(consultation_status, payment_status, student_status, status);

CREATE TABLE IF NOT EXISTS public.enrollment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event VARCHAR(60) NOT NULL,
  from_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  to_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_enrollment_history_record
  ON public.enrollment_status_history(enrollment_id, created_at DESC);

ALTER TABLE public.enrollment_status_history ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enrollment_status_history FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_approve_enrollment(
  p_enrollment_id UUID,
  p_actor_id UUID,
  p_amount_paid NUMERIC DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment course_enrollments%ROWTYPE;
  v_course courses%ROWTYPE;
  v_paid NUMERIC;
  v_payment_status TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor_id AND role::text IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER')) THEN
    RAISE EXCEPTION 'Người thực hiện không có quyền duyệt nhập học';
  END IF;
  SELECT * INTO v_enrollment FROM course_enrollments WHERE id=p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ'; END IF;
  SELECT * INTO v_course FROM courses WHERE id=v_enrollment.course_id;
  v_paid := COALESCE(p_amount_paid,v_enrollment.amount_paid,0);
  IF v_enrollment.consultation_status <> 'CONFIRMED' THEN RAISE EXCEPTION 'Phải chốt tư vấn trước khi duyệt'; END IF;
  IF v_enrollment.student_status <> 'NOT_APPROVED' THEN RAISE EXCEPTION 'Hồ sơ đã được duyệt hoặc ghi danh'; END IF;
  IF v_paid < COALESCE(v_enrollment.required_deposit,v_course.deposit_amount,2000000) THEN
    RAISE EXCEPTION 'Chưa đủ mức cọc bắt buộc';
  END IF;
  v_payment_status := CASE WHEN v_paid>=v_enrollment.tuition_total THEN 'PAID' ELSE 'PARTIALLY_PAID' END;
  UPDATE course_enrollments SET
    status='DEPOSITED', approval_status='APPROVED', student_status='APPROVED',
    payment_status=v_payment_status, amount_paid=v_paid, approved_at=NOW(), approved_by=p_actor_id,
    approval_notes=COALESCE(NULLIF(p_notes,''),'Đã duyệt nhập học sau khi kiểm tra tư vấn và mức cọc')
  WHERE id=p_enrollment_id;
  INSERT INTO enrollment_status_history(enrollment_id,actor_id,event,from_state,to_state,reason)
  VALUES (p_enrollment_id,p_actor_id,'ADMISSION_APPROVED',
    jsonb_build_object('studentStatus',v_enrollment.student_status,'status',v_enrollment.status),
    jsonb_build_object('studentStatus','APPROVED','status','DEPOSITED','paymentStatus',v_payment_status),p_notes);
  INSERT INTO notifications(user_id,title,message,type,data)
  VALUES (v_enrollment.student_id,'Hồ sơ nhập học đã được duyệt','Hồ sơ của bạn đã được duyệt và đang chờ xếp lớp.','ACADEMY',
    jsonb_build_object('enrollmentId',p_enrollment_id,'status','APPROVED'));
  RETURN jsonb_build_object('success',TRUE,'status','DEPOSITED','paymentStatus',v_payment_status);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_approve_enrollment(UUID,UUID,NUMERIC,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_approve_enrollment(UUID,UUID,NUMERIC,TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_reconcile_enrollment_payment(
  p_enrollment_id UUID,
  p_actor_id UUID,
  p_amount_paid NUMERIC
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment course_enrollments%ROWTYPE;
  v_state TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor_id AND role::text IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER','CASHIER')) THEN
    RAISE EXCEPTION 'Người thực hiện không có quyền đối soát học phí';
  END IF;
  SELECT * INTO v_enrollment FROM course_enrollments WHERE id=p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ'; END IF;
  IF v_enrollment.consultation_status <> 'CONFIRMED' THEN RAISE EXCEPTION 'Phải chốt tư vấn trước khi đối soát học phí'; END IF;
  IF p_amount_paid < 0 THEN RAISE EXCEPTION 'Số tiền đối soát không hợp lệ'; END IF;
  v_state := CASE WHEN p_amount_paid<=0 THEN 'UNPAID' WHEN p_amount_paid>=v_enrollment.tuition_total THEN 'PAID' ELSE 'PARTIALLY_PAID' END;
  UPDATE course_enrollments SET amount_paid=p_amount_paid,payment_status=v_state WHERE id=p_enrollment_id;
  INSERT INTO enrollment_status_history(enrollment_id,actor_id,event,from_state,to_state,reason)
  VALUES (p_enrollment_id,p_actor_id,'PAYMENT_RECONCILED',
    jsonb_build_object('amountPaid',v_enrollment.amount_paid,'paymentStatus',v_enrollment.payment_status),
    jsonb_build_object('amountPaid',p_amount_paid,'paymentStatus',v_state),'Đối soát từ giao dịch gắn trực tiếp với hồ sơ');
  IF p_amount_paid IS DISTINCT FROM v_enrollment.amount_paid THEN
    INSERT INTO notifications(user_id,title,message,type,data)
    VALUES (v_enrollment.student_id,'Đã cập nhật học phí',
      'Hệ thống đã đối soát '||to_char(p_amount_paid,'FM999G999G999G990')||'đ cho hồ sơ của bạn.','PAYMENT',
      jsonb_build_object('enrollmentId',p_enrollment_id,'amountPaid',p_amount_paid,'paymentStatus',v_state));
  END IF;
  RETURN jsonb_build_object('success',TRUE,'amountPaid',p_amount_paid,'paymentStatus',v_state,
    'depositSatisfied',p_amount_paid>=v_enrollment.required_deposit);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_reconcile_enrollment_payment(UUID,UUID,NUMERIC) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_reconcile_enrollment_payment(UUID,UUID,NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.fn_finalize_enrollment_consultation(
  p_enrollment_id UUID,
  p_actor_id UUID,
  p_final_tuition NUMERIC,
  p_branch_name TEXT,
  p_note TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment course_enrollments%ROWTYPE;
  v_history JSONB;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor_id AND role::text IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER','RECEPTIONIST')) THEN
    RAISE EXCEPTION 'Người thực hiện không có quyền chốt tư vấn';
  END IF;
  SELECT * INTO v_enrollment FROM course_enrollments WHERE id=p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ'; END IF;
  IF v_enrollment.consultation_status='CANCELLED' THEN RAISE EXCEPTION 'Hồ sơ đã hủy'; END IF;
  IF p_final_tuition<=0 OR p_final_tuition<v_enrollment.required_deposit THEN
    RAISE EXCEPTION 'Học phí cuối cùng không hợp lệ hoặc thấp hơn mức cọc';
  END IF;
  v_history := COALESCE(v_enrollment.consultation_history,'[]'::jsonb) || jsonb_build_array(jsonb_build_object(
    'timestamp',NOW(),'authorId',p_actor_id,'note',COALESCE(NULLIF(p_note,''),'Đã chốt tư vấn và học phí')));
  UPDATE course_enrollments SET
    consultation_status='CONFIRMED', status=CASE WHEN status='PENDING_APPROVAL' THEN 'CONSULTING' ELSE status END,
    final_tuition=p_final_tuition, tuition_total=p_final_tuition, selected_branch=COALESCE(NULLIF(p_branch_name,''),selected_branch),
    consultation_history=v_history, qr_created_at=NOW()
  WHERE id=p_enrollment_id;
  INSERT INTO enrollment_status_history(enrollment_id,actor_id,event,from_state,to_state,reason)
  VALUES (p_enrollment_id,p_actor_id,'CONSULTATION_CONFIRMED',
    jsonb_build_object('consultationStatus',v_enrollment.consultation_status,'tuition',v_enrollment.tuition_total),
    jsonb_build_object('consultationStatus','CONFIRMED','tuition',p_final_tuition),p_note);
  INSERT INTO notifications(user_id,title,message,type,data)
  VALUES (v_enrollment.student_id,'Đã xác nhận tư vấn','Hồ sơ đã được xác nhận. Vui lòng hoàn tất khoản cọc để tiếp tục nhập học.','ACADEMY',
    jsonb_build_object('enrollmentId',p_enrollment_id,'finalTuition',p_final_tuition));
  RETURN jsonb_build_object('success',TRUE,'consultationStatus','CONFIRMED','finalTuition',p_final_tuition);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_finalize_enrollment_consultation(UUID,UUID,NUMERIC,TEXT,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_finalize_enrollment_consultation(UUID,UUID,NUMERIC,TEXT,TEXT) TO service_role;

-- Tốt nghiệp là thao tác nguyên tử và chỉ thành công khi đủ toàn bộ điều kiện.
CREATE OR REPLACE FUNCTION public.fn_graduate_enrollment(p_enrollment_id UUID, p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment course_enrollments%ROWTYPE;
  v_record student_academic_records%ROWTYPE;
  v_course courses%ROWTYPE;
  v_certificate_id UUID;
  v_code TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users WHERE id = p_actor_id AND role::text IN ('ADMIN', 'SUPER_ADMIN')
  ) THEN
    RAISE EXCEPTION 'Người thực hiện không có quyền xét tốt nghiệp';
  END IF;

  SELECT * INTO v_enrollment FROM course_enrollments WHERE id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ học viên'; END IF;
  SELECT * INTO v_course FROM courses WHERE id = v_enrollment.course_id;
  SELECT * INTO v_record FROM student_academic_records WHERE enrollment_id = p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Chưa có bảng điểm tổng hợp'; END IF;
  IF v_enrollment.batch_id IS NULL THEN RAISE EXCEPTION 'Học viên chưa được xếp lớp'; END IF;
  IF v_course.require_full_payment_for_graduation AND v_enrollment.amount_paid < v_enrollment.tuition_total THEN
    RAISE EXCEPTION 'Học viên còn công nợ học phí';
  END IF;
  IF v_enrollment.progress_percent < 100 OR v_enrollment.completed_lessons_count < v_course.total_lessons THEN
    RAISE EXCEPTION 'Học viên chưa hoàn thành toàn bộ bài học bắt buộc';
  END IF;
  IF v_record.attendance_rate < v_course.minimum_attendance_rate THEN
    RAISE EXCEPTION 'Tỷ lệ điểm danh chưa đạt yêu cầu khóa học';
  END IF;
  IF v_record.theory_score < v_course.minimum_theory_score OR v_record.practical_score < v_course.minimum_practical_score THEN
    RAISE EXCEPTION 'Điểm lý thuyết hoặc thực hành chưa đạt yêu cầu khóa học';
  END IF;

  SELECT id INTO v_certificate_id FROM student_certificates WHERE enrollment_id = p_enrollment_id AND status = 'ISSUED' LIMIT 1;
  IF v_certificate_id IS NULL THEN
    v_code := 'MLD-' || to_char(CURRENT_DATE, 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    INSERT INTO student_certificates(
      enrollment_id, student_id, course_id, certificate_code, qr_verification_code,
      student_name, course_title, theory_score, practical_score, final_grade
    ) VALUES (
      v_enrollment.id, v_enrollment.student_id, v_enrollment.course_id, v_code, v_code,
      COALESCE(v_enrollment.student_name, 'Học viên MLD'), v_course.title,
      v_record.theory_score, v_record.practical_score,
      CASE WHEN (v_record.theory_score + v_record.practical_score) / 2 >= 9 THEN 'XUẤT SẮC' ELSE 'GIỎI' END
    ) RETURNING id INTO v_certificate_id;
  END IF;

  UPDATE student_academic_records
  SET is_graduated = TRUE, graduation_date = CURRENT_DATE, certificate_id = v_certificate_id
  WHERE enrollment_id = p_enrollment_id;
  UPDATE course_enrollments
  SET status = 'GRADUATED', student_status = 'GRADUATED'
  WHERE id = p_enrollment_id;
  INSERT INTO enrollment_status_history(enrollment_id, actor_id, event, to_state, reason)
  VALUES (p_enrollment_id, p_actor_id, 'GRADUATED', jsonb_build_object('status', 'GRADUATED'), 'Đủ điều kiện và đã cấp chứng nhận');

  RETURN jsonb_build_object('success', TRUE, 'certificateId', v_certificate_id, 'certificateCode', v_code);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_graduate_enrollment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_graduate_enrollment(UUID, UUID) TO service_role;

-- Xếp/chuyển lớp có khóa hàng để không vượt sĩ số khi nhiều admin thao tác cùng lúc.
CREATE OR REPLACE FUNCTION public.fn_assign_enrollment_batch(
  p_enrollment_id UUID,
  p_batch_id UUID,
  p_actor_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enrollment course_enrollments%ROWTYPE;
  v_batch course_batches%ROWTYPE;
  v_old_batch UUID;
  v_next_status TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor_id AND role::text IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER')) THEN
    RAISE EXCEPTION 'Người thực hiện không có quyền xếp lớp';
  END IF;
  SELECT * INTO v_enrollment FROM course_enrollments WHERE id=p_enrollment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy hồ sơ'; END IF;
  SELECT * INTO v_batch FROM course_batches WHERE id=p_batch_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy lớp'; END IF;
  IF v_enrollment.student_status <> 'APPROVED' AND v_enrollment.batch_id IS NULL THEN
    RAISE EXCEPTION 'Hồ sơ chưa được duyệt nhập học';
  END IF;
  IF v_enrollment.course_id <> v_batch.course_id THEN RAISE EXCEPTION 'Lớp không thuộc khóa học đã đăng ký'; END IF;
  IF v_batch.status::text NOT IN ('UPCOMING','OPEN_FOR_ENROLLMENT','IN_PROGRESS') THEN
    RAISE EXCEPTION 'Lớp không còn nhận học viên';
  END IF;
  v_old_batch := v_enrollment.batch_id;
  IF v_old_batch IS DISTINCT FROM p_batch_id AND v_batch.enrolled_count >= v_batch.max_students THEN
    RAISE EXCEPTION 'Lớp đã đủ sĩ số';
  END IF;

  IF v_old_batch IS DISTINCT FROM p_batch_id THEN
    IF v_old_batch IS NOT NULL THEN
      UPDATE course_batches SET enrolled_count=GREATEST(0,enrolled_count-1) WHERE id=v_old_batch;
    END IF;
    UPDATE course_batches SET enrolled_count=enrolled_count+1 WHERE id=p_batch_id;
  END IF;
  v_next_status := CASE WHEN v_batch.status::text='IN_PROGRESS' OR v_batch.start_date<=CURRENT_DATE THEN 'STUDYING' ELSE 'ENROLLED' END;
  UPDATE course_enrollments
  SET batch_id=p_batch_id,
      student_status='ENROLLED',
      status=v_next_status::enrollment_status,
      valid_until=(v_batch.start_date::timestamp + INTERVAL '365 days')
  WHERE id=p_enrollment_id;

  INSERT INTO enrollment_status_history(enrollment_id,actor_id,event,from_state,to_state,reason)
  VALUES (p_enrollment_id,p_actor_id,CASE WHEN v_old_batch IS NULL THEN 'BATCH_ASSIGNED' ELSE 'BATCH_TRANSFERRED' END,
    jsonb_build_object('batchId',v_old_batch),
    jsonb_build_object('batchId',p_batch_id,'status',v_next_status),
    'Xếp lớp qua quy trình tuyển sinh');
  INSERT INTO notifications(user_id,title,message,type,data)
  VALUES (v_enrollment.student_id,'Đã xếp lớp','Bạn đã được xếp vào lớp '||v_batch.batch_code,'ACADEMY',
    jsonb_build_object('enrollmentId',p_enrollment_id,'batchId',p_batch_id));
  RETURN jsonb_build_object('success',TRUE,'batchId',p_batch_id,'status',v_next_status);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_assign_enrollment_batch(UUID,UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assign_enrollment_batch(UUID,UUID,UUID) TO service_role;

CREATE TABLE IF NOT EXISTS public.enrollment_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES public.course_enrollments(id) ON DELETE CASCADE,
  request_type VARCHAR(30) NOT NULL CHECK (request_type IN ('HOLD','RESUME','TRANSFER','WITHDRAWAL','REFUND','EXTENSION','RETEST')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  reason TEXT NOT NULL,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note TEXT,
  request_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_enrollment_change
  ON public.enrollment_change_requests(enrollment_id,request_type) WHERE status='PENDING';
CREATE INDEX IF NOT EXISTS idx_enrollment_change_queue
  ON public.enrollment_change_requests(status,request_type,requested_at);
ALTER TABLE public.enrollment_change_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.enrollment_change_requests FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.fn_resolve_enrollment_change_request(
  p_request_id UUID,
  p_actor_id UUID,
  p_approve BOOLEAN,
  p_review_note TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request enrollment_change_requests%ROWTYPE;
  v_enrollment course_enrollments%ROWTYPE;
  v_target_batch UUID;
  v_months INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id=p_actor_id AND role::text IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER')) THEN
    RAISE EXCEPTION 'Người thực hiện không có quyền duyệt yêu cầu';
  END IF;
  SELECT * INTO v_request FROM enrollment_change_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy yêu cầu'; END IF;
  IF v_request.status<>'PENDING' THEN RAISE EXCEPTION 'Yêu cầu đã được xử lý'; END IF;
  SELECT * INTO v_enrollment FROM course_enrollments WHERE id=v_request.enrollment_id FOR UPDATE;
  IF NOT p_approve THEN
    UPDATE enrollment_change_requests SET status='REJECTED',reviewed_by=p_actor_id,review_note=p_review_note,reviewed_at=NOW() WHERE id=p_request_id;
    RETURN jsonb_build_object('success',TRUE,'status','REJECTED');
  END IF;

  CASE v_request.request_type
    WHEN 'HOLD' THEN
      UPDATE course_enrollments SET student_status='SUSPENDED',access_status='SUSPENDED' WHERE id=v_enrollment.id;
    WHEN 'RESUME' THEN
      UPDATE course_enrollments SET student_status=CASE WHEN batch_id IS NULL THEN 'APPROVED' ELSE 'ENROLLED' END,
        access_status=CASE WHEN valid_until<NOW() THEN 'EXPIRED' ELSE 'ACTIVE' END WHERE id=v_enrollment.id;
    WHEN 'TRANSFER' THEN
      v_target_batch := NULLIF(v_request.request_data->>'targetBatchId','')::uuid;
      IF v_target_batch IS NULL THEN RAISE EXCEPTION 'Thiếu lớp chuyển đến'; END IF;
      PERFORM fn_assign_enrollment_batch(v_enrollment.id,v_target_batch,p_actor_id);
    WHEN 'WITHDRAWAL' THEN
      IF v_enrollment.batch_id IS NOT NULL THEN
        UPDATE course_batches SET enrolled_count=GREATEST(0,enrolled_count-1) WHERE id=v_enrollment.batch_id;
      END IF;
      UPDATE course_enrollments SET status='DROPPED',student_status='WITHDRAWN',access_status='EXPIRED',expired_at=NOW() WHERE id=v_enrollment.id;
    WHEN 'EXTENSION' THEN
      v_months := GREATEST(1,LEAST(24,COALESCE((v_request.request_data->>'months')::int,3)));
      UPDATE course_enrollments SET valid_until=GREATEST(valid_until,NOW())+(v_months||' months')::interval,
        extension_months=extension_months+v_months,extension_reason=v_request.reason,access_status='EXTENDED' WHERE id=v_enrollment.id;
    WHEN 'RETEST' THEN
      UPDATE course_enrollments SET student_status='AWAITING_RETEST' WHERE id=v_enrollment.id;
    WHEN 'REFUND' THEN
      NULL; -- Tiền chỉ được hoàn qua luồng thu ngân; phê duyệt này là điều kiện trước.
  END CASE;
  UPDATE enrollment_change_requests SET status='APPROVED',reviewed_by=p_actor_id,review_note=p_review_note,reviewed_at=NOW() WHERE id=p_request_id;
  INSERT INTO enrollment_status_history(enrollment_id,actor_id,event,from_state,to_state,reason)
  VALUES (v_enrollment.id,p_actor_id,v_request.request_type||'_APPROVED','{}'::jsonb,
    jsonb_build_object('requestId',p_request_id),COALESCE(p_review_note,v_request.reason));
  INSERT INTO notifications(user_id,title,message,type,data)
  VALUES (v_enrollment.student_id,'Yêu cầu học tập đã được xử lý','Yêu cầu '||v_request.request_type||' đã được phê duyệt.','ACADEMY',
    jsonb_build_object('enrollmentId',v_enrollment.id,'requestId',p_request_id,'requestType',v_request.request_type));
  RETURN jsonb_build_object('success',TRUE,'status','APPROVED','requestType',v_request.request_type);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_resolve_enrollment_change_request(UUID,UUID,BOOLEAN,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_resolve_enrollment_change_request(UUID,UUID,BOOLEAN,TEXT) TO service_role;

-- Một nguồn số liệu duy nhất cho dashboard; bộ đếm và danh sách dùng cùng trạng thái lưu trong DB.
CREATE OR REPLACE VIEW public.academy_enrollment_funnel AS
SELECT
  course.id AS course_id,
  course.title AS course_title,
  enrollment.selected_branch,
  count(*)::int AS total_applications,
  count(*) FILTER (WHERE enrollment.consultation_status='PENDING_CONSULTATION')::int AS pending_consultation,
  count(*) FILTER (WHERE enrollment.consultation_status='CONSULTING')::int AS consulting,
  count(*) FILTER (WHERE enrollment.consultation_status='CONFIRMED')::int AS consultation_confirmed,
  count(*) FILTER (WHERE enrollment.amount_paid>=enrollment.required_deposit AND enrollment.student_status='NOT_APPROVED')::int AS awaiting_approval,
  count(*) FILTER (WHERE enrollment.student_status='APPROVED' AND enrollment.batch_id IS NULL)::int AS awaiting_class,
  count(*) FILTER (WHERE enrollment.status='STUDYING')::int AS studying,
  count(*) FILTER (WHERE enrollment.status='GRADUATED')::int AS graduated,
  count(*) FILTER (WHERE enrollment.status='DROPPED')::int AS withdrawn,
  sum(enrollment.tuition_total)::numeric(16,2) AS contracted_tuition,
  sum(enrollment.amount_paid)::numeric(16,2) AS collected_tuition,
  sum(GREATEST(0,enrollment.tuition_total-enrollment.amount_paid))::numeric(16,2) AS outstanding_tuition,
  round(100.0*count(*) FILTER (WHERE enrollment.status='GRADUATED')/NULLIF(count(*),0),2) AS graduation_rate
FROM public.course_enrollments enrollment
JOIN public.courses course ON course.id=enrollment.course_id
GROUP BY course.id,course.title,enrollment.selected_branch;

REVOKE ALL ON public.academy_enrollment_funnel FROM anon,authenticated;
GRANT SELECT ON public.academy_enrollment_funnel TO service_role;
