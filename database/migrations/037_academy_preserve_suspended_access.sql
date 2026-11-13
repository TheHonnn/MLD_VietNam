-- Preserve explicit holds when the legacy validity trigger calculates access.
BEGIN;
CREATE OR REPLACE FUNCTION public.fn_set_enrollment_validity_period()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.valid_until IS NULL THEN NEW.valid_until:=COALESCE(NEW.enrolled_at,NOW())+INTERVAL '365 days'; END IF;
  IF NEW.status::text='DROPPED' OR NEW.student_status='WITHDRAWN' THEN
    NEW.access_status:='EXPIRED'; RETURN NEW;
  END IF;
  IF NEW.student_status='SUSPENDED' OR NEW.access_status='SUSPENDED' THEN
    NEW.access_status:='SUSPENDED'; RETURN NEW;
  END IF;
  IF NOW()>NEW.valid_until THEN
    NEW.access_status:='EXPIRED'; NEW.expired_at:=COALESCE(NEW.expired_at,NEW.valid_until);
  ELSIF NEW.access_status='EXTENDED' THEN
    NEW.expired_at:=NULL;
  ELSIF NEW.valid_until-NOW()<=INTERVAL '30 days' THEN
    NEW.access_status:='EXPIRING_SOON'; NEW.expired_at:=NULL;
  ELSE NEW.access_status:='ACTIVE'; NEW.expired_at:=NULL;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_set_enrollment_validity ON public.course_enrollments;
DROP TRIGGER IF EXISTS trg_00_set_enrollment_validity ON public.course_enrollments;
CREATE TRIGGER trg_00_set_enrollment_validity BEFORE INSERT OR UPDATE ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.fn_set_enrollment_validity_period();
COMMIT;
