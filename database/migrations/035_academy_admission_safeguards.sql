-- Admission uses reconciled funds only; terminal records cannot be reassigned.
BEGIN;
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
  v_paid := COALESCE(v_enrollment.amount_paid,0);
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
  IF v_enrollment.status::text IN ('GRADUATED','DROPPED')
     OR v_enrollment.student_status NOT IN ('APPROVED','ENROLLED')
     OR v_enrollment.access_status IN ('EXPIRED','SUSPENDED')
     OR v_enrollment.valid_until < NOW() THEN
    RAISE EXCEPTION 'Hồ sơ đã kết thúc, bảo lưu hoặc hết quyền học';
  END IF;
  IF v_enrollment.batch_id = p_batch_id THEN
    RETURN jsonb_build_object('success',TRUE,'batchId',p_batch_id,'status',v_enrollment.status);
  END IF;
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
COMMIT;
