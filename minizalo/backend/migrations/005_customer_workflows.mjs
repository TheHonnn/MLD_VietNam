export const version='005_customer_workflows';
export const statements=[
  `CREATE TABLE IF NOT EXISTS miniapp_booking_requests(user_id uuid NOT NULL REFERENCES users(id),request_key uuid NOT NULL,
    request_hash text NOT NULL,booking_id uuid NOT NULL REFERENCES bookings(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,request_key))`,
  `CREATE TABLE IF NOT EXISTS miniapp_favorite_services(user_id uuid NOT NULL REFERENCES users(id),service_id uuid NOT NULL REFERENCES services(id),
    is_favorite boolean NOT NULL DEFAULT true,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(user_id,service_id))`,
  `CREATE TABLE IF NOT EXISTS miniapp_technician_services(technician_id uuid NOT NULL REFERENCES technicians(id),service_id uuid NOT NULL REFERENCES services(id),
    is_active boolean NOT NULL DEFAULT true,PRIMARY KEY(technician_id,service_id))`,
  `CREATE TABLE IF NOT EXISTS miniapp_quiz_limits(enrollment_id uuid NOT NULL REFERENCES course_enrollments(id),quiz_id uuid NOT NULL REFERENCES course_quizzes(id),
    max_attempts integer NOT NULL CHECK(max_attempts BETWEEN 1 AND 50),reason text NOT NULL CHECK(length(trim(reason))>0),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(enrollment_id,quiz_id))`,
  ...['miniapp_booking_requests','miniapp_favorite_services','miniapp_technician_services','miniapp_quiz_limits'].map(t=>`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`),
  `CREATE OR REPLACE FUNCTION miniapp_sync_learning(course_uuid uuid,target_enrollment uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE entry record;
    BEGIN
      FOR entry IN SELECT id FROM course_enrollments WHERE course_id=course_uuid AND (target_enrollment IS NULL OR id=target_enrollment) ORDER BY id FOR UPDATE LOOP
        INSERT INTO user_lesson_progress(enrollment_id,lesson_id,is_completed,completed_at)
          SELECT entry.id,l.id,EXISTS(SELECT 1 FROM quiz_submissions s WHERE s.enrollment_id=entry.id AND s.quiz_id=COALESCE(link.quiz_id,
            CASE WHEN (SELECT count(*) FROM course_quizzes WHERE course_id=course_uuid)=1 AND (SELECT count(*) FROM course_lessons ql JOIN course_chapters qc ON qc.id=ql.chapter_id WHERE qc.course_id=course_uuid AND ql.lesson_type='QUIZ')=1 THEN (SELECT id FROM course_quizzes WHERE course_id=course_uuid LIMIT 1) END) AND s.passed),NULL
          FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id LEFT JOIN miniapp_lesson_quizzes link ON link.lesson_id=l.id WHERE ch.course_id=course_uuid AND l.lesson_type='QUIZ'
          ON CONFLICT(enrollment_id,lesson_id) DO UPDATE SET is_completed=EXCLUDED.is_completed,completed_at=CASE WHEN EXCLUDED.is_completed THEN COALESCE(user_lesson_progress.completed_at,clock_timestamp()) ELSE NULL END;
        UPDATE user_lesson_progress SET completed_at=clock_timestamp() WHERE enrollment_id=entry.id AND is_completed AND completed_at IS NULL;
        UPDATE course_enrollments SET completed_lessons_count=stats.completed,progress_percent=CASE WHEN stats.total>0 THEN floor(stats.completed*100.0/stats.total) ELSE 0 END FROM
          (SELECT count(*)::int AS total,count(*) FILTER(WHERE COALESCE(p.is_completed,false))::int AS completed FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id
            LEFT JOIN user_lesson_progress p ON p.lesson_id=l.id AND p.enrollment_id=entry.id WHERE ch.course_id=course_uuid) stats WHERE id=entry.id;
      END LOOP;
    END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_learning_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE row_data jsonb; course_uuid uuid; enrollment_uuid uuid;
    BEGIN
      IF TG_TABLE_SCHEMA<>'public' THEN RAISE EXCEPTION 'Invalid learning trigger source'; END IF;
      FOR row_data IN SELECT DISTINCT value FROM jsonb_array_elements(CASE WHEN TG_OP='UPDATE' THEN jsonb_build_array(to_jsonb(OLD),to_jsonb(NEW)) WHEN TG_OP='DELETE' THEN jsonb_build_array(to_jsonb(OLD)) ELSE jsonb_build_array(to_jsonb(NEW)) END) LOOP
        enrollment_uuid:=NULL;
        IF TG_TABLE_NAME='quiz_submissions' THEN enrollment_uuid:=(row_data->>'enrollment_id')::uuid; SELECT course_id INTO course_uuid FROM course_enrollments WHERE id=enrollment_uuid;
        ELSIF TG_TABLE_NAME='miniapp_lesson_quizzes' THEN SELECT ch.course_id INTO course_uuid FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id WHERE l.id=(row_data->>'lesson_id')::uuid;
        ELSIF TG_TABLE_NAME='course_lessons' THEN SELECT course_id INTO course_uuid FROM course_chapters WHERE id=(row_data->>'chapter_id')::uuid;
        ELSE course_uuid:=(row_data->>'course_id')::uuid; END IF;
        IF course_uuid IS NOT NULL THEN PERFORM miniapp_sync_learning(course_uuid,enrollment_uuid); END IF;
      END LOOP;
      RETURN NULL;
    END $$`,
  ...['quiz_submissions','miniapp_lesson_quizzes','course_lessons','course_chapters','course_quizzes'].map(table=>`DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_learning_${table}') THEN CREATE TRIGGER miniapp_learning_${table} AFTER INSERT OR UPDATE OR DELETE ON ${table} FOR EACH ROW EXECUTE FUNCTION miniapp_learning_change(); END IF; END $$`),
  ...['miniapp_sync_learning(uuid,uuid)','miniapp_learning_change()'].flatMap(signature=>[
    `REVOKE ALL ON FUNCTION public.${signature} FROM PUBLIC`,
    `DO $$ DECLARE role_name text; BEGIN FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP EXECUTE format('REVOKE ALL ON FUNCTION public.${signature} FROM %I',role_name); END LOOP; END $$`,
  ]),
];
