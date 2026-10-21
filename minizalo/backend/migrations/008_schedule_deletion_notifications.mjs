export const statements=[
  `DO $$ BEGIN IF to_regprocedure('public.miniapp_emit_notification(uuid,text,text,text,jsonb,text,text)') IS NULL THEN
    RAISE EXCEPTION 'Install the notification event migration before schedule deletion notifications';
  END IF; END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_schedule_deleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE entry record;
    BEGIN
      FOR entry IN SELECT e.id,e.student_id,c.id AS course_id,c.title
        FROM course_enrollments e JOIN courses c ON c.id=e.course_id
        WHERE e.batch_id=OLD.batch_id AND e.status IN ('ENROLLED','STUDYING','GRADUATED')
      LOOP
        PERFORM miniapp_emit_notification(entry.student_id,'Buổi học đã được hủy',
          concat_ws(' · ',entry.title,OLD.topic,OLD.session_date,OLD.start_time),'COURSE',
          jsonb_build_object('screen','academy','courseId',entry.course_id,'enrollmentId',entry.id,'tab','schedule'),
          'deleted-schedule:'||OLD.id||':'||entry.id);
      END LOOP;
      RETURN OLD;
    END $$`,
  `REVOKE ALL ON FUNCTION public.miniapp_schedule_deleted() FROM PUBLIC`,
  `DO $$ DECLARE role_name text; BEGIN FOR role_name IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.miniapp_schedule_deleted() FROM %I',role_name);
  END LOOP; END $$`,
  `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_schedule_deleted' AND tgrelid='public.batch_schedules'::regclass) THEN
    CREATE TRIGGER miniapp_schedule_deleted BEFORE DELETE ON public.batch_schedules FOR EACH ROW EXECUTE FUNCTION public.miniapp_schedule_deleted();
  END IF; END $$`,
];
