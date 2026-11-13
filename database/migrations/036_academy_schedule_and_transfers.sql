-- Structured schedule validation and audited cross-branch transfers.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_assign_enrollment_batch(
  p_enrollment_id UUID,
  p_batch_id UUID,
  p_actor_id UUID,
  p_transfer_reason TEXT
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
  IF EXISTS (SELECT 1 FROM users WHERE id=p_actor_id AND role::text='BRANCH_MANAGER') AND (
    NOT EXISTS(SELECT 1 FROM staff_profiles WHERE user_id=p_actor_id AND is_active AND branch_id=v_batch.branch_id)
    OR (v_enrollment.batch_id IS NOT NULL AND NOT EXISTS(
      SELECT 1 FROM course_batches b JOIN staff_profiles s ON s.branch_id=b.branch_id
      WHERE b.id=v_enrollment.batch_id AND s.user_id=p_actor_id AND s.is_active))
  ) THEN RAISE EXCEPTION 'Chuyển lớp khác chi nhánh cần quản trị toàn hệ thống'; END IF;
  v_old_batch := v_enrollment.batch_id;
  IF v_old_batch IS NOT NULL AND v_old_batch IS DISTINCT FROM p_batch_id AND length(trim(COALESCE(p_transfer_reason,'')))<5 THEN
    RAISE EXCEPTION 'Cần lý do chuyển lớp ít nhất 5 ký tự';
  END IF;
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
      valid_until=CASE WHEN v_old_batch IS NULL THEN (v_batch.start_date::timestamp + INTERVAL '365 days') ELSE v_enrollment.valid_until END,
      selected_branch=(SELECT name FROM branches WHERE id=v_batch.branch_id)
  WHERE id=p_enrollment_id;

  INSERT INTO enrollment_status_history(enrollment_id,actor_id,event,from_state,to_state,reason)
  VALUES (p_enrollment_id,p_actor_id,CASE WHEN v_old_batch IS NULL THEN 'BATCH_ASSIGNED' ELSE 'BATCH_TRANSFERRED' END,
    jsonb_build_object('batchId',v_old_batch),
    jsonb_build_object('batchId',p_batch_id,'status',v_next_status),
    COALESCE(NULLIF(trim(p_transfer_reason),''),'Xếp lớp qua quy trình tuyển sinh'));
  INSERT INTO notifications(user_id,title,message,type,data)
  VALUES (v_enrollment.student_id,'Đã xếp lớp','Bạn đã được xếp vào lớp '||v_batch.batch_code,'ACADEMY',
    jsonb_build_object('enrollmentId',p_enrollment_id,'batchId',p_batch_id));
  RETURN jsonb_build_object('success',TRUE,'batchId',p_batch_id,'status',v_next_status);
END;
$$;
REVOKE ALL ON FUNCTION public.fn_assign_enrollment_batch(UUID,UUID,UUID,TEXT) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assign_enrollment_batch(UUID,UUID,UUID,TEXT) TO service_role;
CREATE OR REPLACE FUNCTION public.fn_assign_enrollment_batch(p_enrollment_id UUID,p_batch_id UUID,p_actor_id UUID)
RETURNS JSONB LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT public.fn_assign_enrollment_batch(p_enrollment_id,p_batch_id,p_actor_id,NULL::text);
$$;
REVOKE ALL ON FUNCTION public.fn_assign_enrollment_batch(UUID,UUID,UUID) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_assign_enrollment_batch(UUID,UUID,UUID) TO service_role;
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
  IF v_enrollment.status::text IN ('GRADUATED','DROPPED') THEN
    RAISE EXCEPTION 'Hồ sơ đã kết thúc';
  END IF;
  IF EXISTS(SELECT 1 FROM users WHERE id=p_actor_id AND role::text='BRANCH_MANAGER') AND NOT EXISTS(
    SELECT 1 FROM staff_profiles s JOIN course_batches b ON b.branch_id=s.branch_id
    WHERE s.user_id=p_actor_id AND s.is_active AND b.id=v_enrollment.batch_id
  ) THEN RAISE EXCEPTION 'Không có quyền xử lý hồ sơ chi nhánh khác'; END IF;
  IF NOT p_approve THEN
    UPDATE enrollment_change_requests SET status='REJECTED',reviewed_by=p_actor_id,review_note=p_review_note,reviewed_at=NOW() WHERE id=p_request_id;
    RETURN jsonb_build_object('success',TRUE,'status','REJECTED');
  END IF;

  CASE v_request.request_type
    WHEN 'HOLD' THEN
      UPDATE course_enrollments SET student_status='SUSPENDED',access_status='SUSPENDED' WHERE id=v_enrollment.id;
    WHEN 'RESUME' THEN
      IF v_enrollment.access_status <> 'SUSPENDED' THEN RAISE EXCEPTION 'Hồ sơ không ở trạng thái bảo lưu'; END IF;
      UPDATE course_enrollments SET student_status=CASE WHEN batch_id IS NULL THEN 'APPROVED' ELSE 'ENROLLED' END,
        access_status=CASE WHEN valid_until<NOW() THEN 'EXPIRED' ELSE 'ACTIVE' END WHERE id=v_enrollment.id;
    WHEN 'TRANSFER' THEN
      v_target_batch := NULLIF(v_request.request_data->>'targetBatchId','')::uuid;
      IF v_target_batch IS NULL THEN RAISE EXCEPTION 'Thiếu lớp chuyển đến'; END IF;
      PERFORM fn_assign_enrollment_batch(v_enrollment.id,v_target_batch,p_actor_id,v_request.reason);
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


-- Protect assignments through both dedicated RPCs and generic admin writes.
CREATE OR REPLACE FUNCTION public.fn_guard_academy_assignment_schedule()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.batch_id IS NULL OR NEW.status::text IN ('DROPPED','GRADUATED') OR NEW.student_status NOT IN ('ENROLLED') OR NEW.access_status IN ('SUSPENDED','EXPIRED') THEN RETURN NEW; END IF;
  PERFORM pg_advisory_xact_lock(hashtext('mld-academy-schedules'));
  IF NOT EXISTS(SELECT 1 FROM batch_schedules WHERE batch_id=NEW.batch_id AND session_date>=CURRENT_DATE) THEN
    RAISE EXCEPTION 'Lớp chưa có thời khóa biểu từng buổi sắp tới; hãy tạo ngày và giờ học trước khi xếp lớp';
  END IF;
  IF EXISTS(SELECT 1 FROM course_enrollments e
    WHERE e.student_id=NEW.student_id AND e.id<>NEW.id AND e.batch_id=NEW.batch_id
      AND e.status::text NOT IN ('DROPPED','GRADUATED') AND e.access_status NOT IN ('SUSPENDED','EXPIRED')) THEN
    RAISE EXCEPTION 'Học viên đã có hồ sơ trong lớp này';
  END IF;
  IF EXISTS(SELECT 1 FROM course_enrollments e
    JOIN batch_schedules old_s ON old_s.batch_id=e.batch_id
    JOIN batch_schedules new_s ON new_s.batch_id=NEW.batch_id AND new_s.session_date=old_s.session_date
    WHERE e.student_id=NEW.student_id AND e.id<>NEW.id AND e.status::text NOT IN ('DROPPED','GRADUATED')
      AND e.student_status='ENROLLED' AND e.access_status NOT IN ('SUSPENDED','EXPIRED')
      AND new_s.session_date>=CURRENT_DATE AND new_s.start_time<old_s.end_time AND old_s.start_time<new_s.end_time) THEN
    RAISE EXCEPTION 'Trùng lịch học với lớp khác của học viên';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_academy_assignment_schedule ON public.course_enrollments;
CREATE TRIGGER trg_academy_assignment_schedule BEFORE INSERT OR UPDATE OF batch_id,student_id,student_status,access_status ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_academy_assignment_schedule();

CREATE OR REPLACE FUNCTION public.fn_guard_academy_session_schedule()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('mld-academy-schedules'));
  IF NEW.end_time<=NEW.start_time THEN RAISE EXCEPTION 'Giờ kết thúc phải sau giờ bắt đầu'; END IF;
  IF NOT EXISTS(SELECT 1 FROM course_batches WHERE id=NEW.batch_id AND NEW.session_date BETWEEN start_date AND end_date) THEN
    RAISE EXCEPTION 'Ngày học nằm ngoài thời gian của lớp'; END IF;
  IF NEW.assigned_room_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM course_batches b JOIN branch_rooms r ON r.branch_id=b.branch_id
    WHERE b.id=NEW.batch_id AND r.id=NEW.assigned_room_id) THEN RAISE EXCEPTION 'Phòng học không thuộc chi nhánh của lớp'; END IF;
  IF EXISTS(SELECT 1 FROM batch_schedules s
    JOIN course_batches old_b ON old_b.id=s.batch_id JOIN course_batches new_b ON new_b.id=NEW.batch_id
    WHERE s.id<>NEW.id AND s.session_date=NEW.session_date
      AND s.start_time<NEW.end_time AND NEW.start_time<s.end_time
      AND old_b.status::text IN ('UPCOMING','OPEN_FOR_ENROLLMENT','IN_PROGRESS')
      AND (s.batch_id=NEW.batch_id OR (NEW.assigned_room_id IS NOT NULL AND s.assigned_room_id=NEW.assigned_room_id)
        OR (new_b.instructor_id IS NOT NULL AND new_b.instructor_id=old_b.instructor_id))) THEN
    RAISE EXCEPTION 'Trùng lịch lớp, phòng học hoặc giảng viên';
  END IF;
  IF EXISTS(SELECT 1 FROM course_enrollments target
    JOIN course_enrollments other ON other.student_id=target.student_id AND other.id<>target.id
    JOIN batch_schedules s ON s.batch_id=other.batch_id
    WHERE target.batch_id=NEW.batch_id AND target.student_status='ENROLLED' AND other.student_status='ENROLLED'
      AND target.status::text NOT IN ('DROPPED','GRADUATED') AND other.status::text NOT IN ('DROPPED','GRADUATED')
      AND target.access_status NOT IN ('SUSPENDED','EXPIRED') AND other.access_status NOT IN ('SUSPENDED','EXPIRED')
      AND s.id<>NEW.id AND s.session_date=NEW.session_date AND s.start_time<NEW.end_time AND NEW.start_time<s.end_time) THEN
    RAISE EXCEPTION 'Trùng lịch học của học viên khi cập nhật thời khóa biểu';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_academy_session_schedule ON public.batch_schedules;
CREATE TRIGGER trg_academy_session_schedule BEFORE INSERT OR UPDATE ON public.batch_schedules
FOR EACH ROW EXECUTE FUNCTION public.fn_guard_academy_session_schedule();

NOTIFY pgrst, 'reload schema';
COMMIT;
