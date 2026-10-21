const tables=['bookings','course_enrollments','quiz_submissions','student_academic_records','student_certificates','batch_schedules','student_attendance','user_packages','treatment_journal','support_tickets','reviews','invoices','tuition_transactions','point_transactions','user_vouchers','courses','course_batches','course_chapters','course_lessons','course_quizzes','quiz_questions'];
export const notificationStatements=[
  `CREATE OR REPLACE FUNCTION miniapp_status_label(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT CASE value
    WHEN 'PENDING' THEN 'Chờ xử lý' WHEN 'CONFIRMED' THEN 'Đã xác nhận' WHEN 'CHECKED_IN' THEN 'Đã check-in' WHEN 'IN_SERVICE' THEN 'Đang thực hiện'
    WHEN 'COMPLETED' THEN 'Đã hoàn thành' WHEN 'CANCELLED' THEN 'Đã hủy' WHEN 'NO_SHOW' THEN 'Không đến' WHEN 'CONSULTING' THEN 'Chờ tư vấn'
    WHEN 'DEPOSITED' THEN 'Đã đặt cọc' WHEN 'ENROLLED' THEN 'Đã ghi danh' WHEN 'STUDYING' THEN 'Đang học' WHEN 'GRADUATED' THEN 'Đã tốt nghiệp'
    WHEN 'DROPPED' THEN 'Đã ngừng học' WHEN 'ACTIVE' THEN 'Đang sử dụng' WHEN 'EXPIRED' THEN 'Đã hết hạn' WHEN 'ISSUED' THEN 'Đã cấp'
    WHEN 'REVOKED' THEN 'Đã thu hồi' WHEN 'PAID' THEN 'Đã thanh toán' WHEN 'UNPAID' THEN 'Chưa thanh toán' WHEN 'PARTIAL' THEN 'Thanh toán một phần'
    WHEN 'REFUNDED' THEN 'Đã hoàn tiền' WHEN 'RESOLVED' THEN 'Đã giải quyết' WHEN 'PRESENT' THEN 'Có mặt' WHEN 'ABSENT' THEN 'Vắng mặt'
    WHEN 'AVAILABLE' THEN 'Khả dụng' WHEN 'USED' THEN 'Đã sử dụng' ELSE COALESCE(value,'') END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_emit_notification(owner_id uuid,heading text,body text,kind text,destination jsonb,source_key text,channel text DEFAULT 'activity') RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    BEGIN
      INSERT INTO notifications(user_id,title,message,type,data,created_at) VALUES(owner_id,heading,COALESCE(body,''),kind,
        jsonb_build_object('target',destination,'entityId',destination->>'entityId','sourceKey',source_key,'channel',channel,'eventSequence',nextval('miniapp_notification_sequence')),clock_timestamp());
    END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_capture_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    #variable_conflict use_variable
    DECLARE d jsonb:=to_jsonb(NEW); old_d jsonb; owner_id uuid; course_id uuid; enrollment_id uuid; entry record;
      heading text; body text; kind text:='SYSTEM'; channel text:='activity'; destination jsonb; source text;
    BEGIN
      IF TG_OP='UPDATE' THEN
        old_d:=to_jsonb(OLD);
        IF (d-'updated_at') IS NOT DISTINCT FROM (old_d-'updated_at') THEN RETURN NEW; END IF;
      END IF;
      source:=(CASE TG_TABLE_NAME WHEN 'bookings' THEN 'booking' WHEN 'course_enrollments' THEN 'enrollment' WHEN 'quiz_submissions' THEN 'quiz'
        WHEN 'student_academic_records' THEN 'results' WHEN 'student_certificates' THEN 'certificate' WHEN 'user_packages' THEN 'package'
        WHEN 'treatment_journal' THEN 'journal' WHEN 'support_tickets' THEN 'support' WHEN 'reviews' THEN 'review' WHEN 'invoices' THEN 'invoice'
        WHEN 'tuition_transactions' THEN 'tuition' WHEN 'point_transactions' THEN 'points' WHEN 'user_vouchers' THEN 'voucher' WHEN 'student_attendance' THEN 'attendance' ELSE TG_TABLE_NAME END)||':'||(d->>'id');
      IF TG_TABLE_NAME IN ('courses','course_batches','course_chapters','course_lessons','course_quizzes','quiz_questions','batch_schedules') THEN
        IF TG_TABLE_NAME='courses' THEN course_id:=(d->>'id')::uuid;
        ELSIF TG_TABLE_NAME='course_lessons' THEN SELECT ch.course_id INTO course_id FROM course_chapters ch WHERE ch.id=(d->>'chapter_id')::uuid;
        ELSIF TG_TABLE_NAME='quiz_questions' THEN SELECT q.course_id INTO course_id FROM course_quizzes q WHERE q.id=(d->>'quiz_id')::uuid;
        ELSIF TG_TABLE_NAME='batch_schedules' THEN SELECT cb.course_id INTO course_id FROM course_batches cb WHERE cb.id=(d->>'batch_id')::uuid;
        ELSE course_id:=(d->>'course_id')::uuid; END IF;
        FOR entry IN SELECT e.id,e.student_id,c.title FROM course_enrollments e JOIN courses c ON c.id=e.course_id
          WHERE e.course_id=course_id AND e.status IN ('ENROLLED','STUDYING','GRADUATED')
          AND (TG_TABLE_NAME NOT IN ('batch_schedules','course_batches') OR e.batch_id=CASE WHEN TG_TABLE_NAME='course_batches' THEN (d->>'id')::uuid ELSE (d->>'batch_id')::uuid END)
        LOOP
          PERFORM miniapp_emit_notification(entry.student_id,CASE WHEN TG_TABLE_NAME IN ('batch_schedules','course_batches') THEN 'Lịch học đã cập nhật' ELSE 'Nội dung khóa học đã cập nhật' END,
            entry.title||CASE WHEN d->>'topic' IS NOT NULL THEN ' · '||(d->>'topic') ELSE '' END||COALESCE(' · '||(d->>'session_date'),'')||COALESCE(' · '||(d->>'start_time'),'')||CASE WHEN d->>'status' IS NOT NULL THEN ' · '||miniapp_status_label(d->>'status') ELSE '' END,'COURSE',
            jsonb_build_object('screen','academy','courseId',course_id,'enrollmentId',entry.id,'entityId',d->>'id','tab',CASE WHEN TG_TABLE_NAME IN ('batch_schedules','course_batches') THEN 'schedule' ELSE 'content' END),CASE WHEN TG_TABLE_NAME='batch_schedules' THEN 'schedule:'||(d->>'id')||':'||entry.id ELSE 'content:'||entry.id END);
        END LOOP;
        RETURN NEW;
      END IF;
      IF TG_TABLE_NAME='bookings' THEN
        owner_id:=NEW.customer_id; heading:='Lịch hẹn: '||miniapp_status_label(d->>'status');
        body:=concat_ws(' · ',d->>'booking_code',d->>'booking_date',d->>'start_time',d->>'cancellation_reason'); kind:='BOOKING';
        destination:=jsonb_build_object('screen','booking','entityId',NEW.id);
      ELSIF TG_TABLE_NAME IN ('course_enrollments','quiz_submissions','student_academic_records','student_certificates','tuition_transactions','student_attendance') THEN
        enrollment_id:=CASE WHEN TG_TABLE_NAME='course_enrollments' THEN (d->>'id')::uuid ELSE (d->>'enrollment_id')::uuid END;
        SELECT e.student_id,e.course_id,c.title INTO owner_id,course_id,body FROM course_enrollments e JOIN courses c ON c.id=e.course_id WHERE e.id=enrollment_id;
        IF TG_TABLE_NAME IN ('tuition_transactions','student_certificates') AND (d->>'student_id')::uuid IS DISTINCT FROM owner_id THEN RETURN NEW; END IF;
        kind:='COURSE'; destination:=jsonb_build_object('screen','academy','entityId',d->>'id','courseId',course_id,'enrollmentId',enrollment_id,'tab','content');
        IF TG_TABLE_NAME='course_enrollments' THEN
          heading:='Khóa học: '||miniapp_status_label(d->>'status');
          SELECT body||COALESCE(' · '||b.batch_code,'') INTO body FROM course_enrollments e LEFT JOIN course_batches b ON b.id=e.batch_id WHERE e.id=enrollment_id;
          body:=body||' · Đã thanh toán '||replace(to_char((d->>'amount_paid')::numeric,'FM999G999G999G990'),',','.')||'đ · Tiến độ '||(d->>'progress_percent')||'%'||CASE WHEN (d->>'progress_percent')::integer=100 THEN ' · Đã hoàn thành nội dung học' ELSE '' END;
        ELSIF TG_TABLE_NAME='quiz_submissions' THEN heading:='Kết quả bài trắc nghiệm'; body:=body||' · '||trim(trailing '.' from trim(trailing '0' from (d->>'score')))||'/10'||CASE WHEN d->>'instructor_feedback' IS NOT NULL THEN ' · '||(d->>'instructor_feedback') ELSE '' END; destination:=destination||jsonb_build_object('tab','exam','quizId',d->>'quiz_id');
        ELSIF TG_TABLE_NAME='student_academic_records' THEN heading:='Kết quả và đánh giá học tập'; body:=body||' · Lý thuyết '||(d->>'theory_score')||'/10 · Thực hành '||(d->>'practical_score')||'/10'; destination:=destination||'{"tab":"results"}';
        ELSIF TG_TABLE_NAME='student_certificates' THEN heading:='Chứng chỉ: '||miniapp_status_label(d->>'status'); body:=body||' · '||(d->>'certificate_code')||COALESCE(' · '||(d->>'revocation_reason'),''); destination:=destination||'{"tab":"results"}';
        ELSIF TG_TABLE_NAME='student_attendance' THEN heading:='Điểm danh: '||miniapp_status_label(d->>'status'); destination:=destination||'{"tab":"schedule"}';
        ELSE heading:='Học phí: '||miniapp_status_label(d->>'payment_status'); body:=body||' · '||(d->>'transaction_code')||' · '||replace(to_char((d->>'amount')::numeric,'FM999G999G999G990'),',','.')||'đ'; destination:=destination||'{"tab":"payment"}'; END IF;
      ELSIF TG_TABLE_NAME='user_packages' THEN
        owner_id:=NEW.customer_id; heading:='Liệu trình: '||miniapp_status_label(d->>'status');
        SELECT p.name INTO body FROM treatment_packages p WHERE p.id=NEW.package_id;
        body:=body||' · '||(d->>'completed_sessions')||'/'||(d->>'total_sessions')||' buổi'; kind:='TREATMENT'; destination:=jsonb_build_object('screen','treatment','tab','packages','entityId',NEW.id);
      ELSIF TG_TABLE_NAME='treatment_journal' THEN owner_id:=NEW.customer_id; heading:='Nhật ký chăm sóc đã cập nhật'; body:='Buổi '||(d->>'session_number')||' · '||(d->>'session_date')||COALESCE(' · '||(d->>'specialist_advice'),''); kind:='TREATMENT'; destination:=jsonb_build_object('screen','treatment','tab','journal','entityId',NEW.id);
      ELSIF TG_TABLE_NAME='support_tickets' THEN owner_id:=NEW.customer_id; heading:=CASE WHEN NEW.admin_reply IS NOT NULL THEN 'Phản hồi yêu cầu hỗ trợ' ELSE 'Hỗ trợ: '||miniapp_status_label(d->>'status') END; body:=NEW.subject||COALESCE(' · '||NEW.admin_reply,''); channel:='system'; destination:=jsonb_build_object('screen','treatment','tab','support','entityId',NEW.id);
      ELSIF TG_TABLE_NAME='reviews' THEN
        IF NEW.branch_reply IS NULL OR (TG_OP='UPDATE' AND NEW.branch_reply IS NOT DISTINCT FROM OLD.branch_reply) THEN RETURN NEW; END IF;
        owner_id:=NEW.customer_id; heading:='Phản hồi đánh giá của bạn'; body:=NEW.branch_reply; channel:='system'; destination:=jsonb_build_object('screen','treatment','tab','journal','entityId',NEW.id,'bookingId',NEW.booking_id);
      ELSIF TG_TABLE_NAME='invoices' THEN owner_id:=NEW.customer_id; heading:='Hóa đơn: '||miniapp_status_label(d->>'payment_status'); body:=NEW.invoice_code||' · '||NEW.total_amount; channel:='system'; destination:=jsonb_build_object('screen','profile','tab','payments','entityId',NEW.id);
      ELSIF TG_TABLE_NAME='point_transactions' THEN owner_id:=NEW.user_id; heading:='Biến động điểm thưởng'; body:=NEW.points_change||' điểm · '||NEW.description; channel:='system'; destination:=jsonb_build_object('screen','profile','tab','points','entityId',NEW.id);
      ELSIF TG_TABLE_NAME='user_vouchers' THEN owner_id:=NEW.user_id; heading:='Voucher: '||miniapp_status_label(d->>'status'); SELECT c.code INTO body FROM coupons c WHERE c.id=NEW.coupon_id; channel:='promotion'; destination:=jsonb_build_object('screen','profile','tab','vouchers','entityId',NEW.id);
      END IF;
      IF owner_id IS NOT NULL AND heading IS NOT NULL THEN PERFORM miniapp_emit_notification(owner_id,heading,body,kind,destination,source,channel); END IF;
      RETURN NEW;
    END $$`,
  ...['miniapp_emit_notification(uuid,text,text,text,jsonb,text,text)','miniapp_capture_event()','miniapp_guard_quiz_link()','miniapp_package_journal()','miniapp_release_package()','miniapp_guard_package_count()'].flatMap(signature=>[
    `REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC`,
    `DO $$ DECLARE role_name text; BEGIN FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION public.${signature} FROM %I',role_name);
      END LOOP; END $$`,
  ]),
  ...tables.map(table=>`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_event_${table}') THEN CREATE TRIGGER miniapp_event_${table} AFTER INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION miniapp_capture_event(); END IF; END $$`),
];
