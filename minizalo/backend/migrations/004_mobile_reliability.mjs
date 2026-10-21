export const version = '004_mobile_reliability';
export const statements = [
  `CREATE TABLE IF NOT EXISTS miniapp_lesson_quizzes (
    lesson_id uuid PRIMARY KEY REFERENCES course_lessons(id),
    quiz_id uuid NOT NULL REFERENCES course_quizzes(id), created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS miniapp_quiz_attempts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES course_enrollments(id),
    quiz_id uuid NOT NULL REFERENCES course_quizzes(id), started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
    expires_at timestamptz NOT NULL, questions jsonb NOT NULL, draft_answers jsonb NOT NULL DEFAULT '{}',passing_score numeric(4,2) NOT NULL,
    submission_id uuid UNIQUE REFERENCES quiz_submissions(id), submitted_at timestamptz,
    CHECK(expires_at>started_at))`,
  `CREATE INDEX IF NOT EXISTS miniapp_attempts_owner ON miniapp_quiz_attempts(enrollment_id,quiz_id,started_at)`,
  `CREATE TABLE IF NOT EXISTS miniapp_lesson_playbacks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), enrollment_id uuid NOT NULL REFERENCES course_enrollments(id),
    lesson_id uuid NOT NULL REFERENCES course_lessons(id), media_url text NOT NULL, duration_seconds integer NOT NULL CHECK(duration_seconds>0),
    last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(), last_position double precision NOT NULL DEFAULT 0,
    covered_ranges jsonb NOT NULL DEFAULT '[]', expires_at timestamptz NOT NULL DEFAULT (clock_timestamp()+interval '24 hours'))`,
  `CREATE INDEX IF NOT EXISTS miniapp_playback_owner ON miniapp_lesson_playbacks(enrollment_id,lesson_id)`,
  `CREATE TABLE IF NOT EXISTS miniapp_booking_packages (
    booking_id uuid PRIMARY KEY REFERENCES bookings(id), user_package_id uuid NOT NULL REFERENCES user_packages(id),
    state text NOT NULL DEFAULT 'RESERVED' CHECK(state IN ('RESERVED','CONSUMED','RELEASED')),
    journal_id uuid UNIQUE REFERENCES treatment_journal(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp())`,
  `CREATE INDEX IF NOT EXISTS miniapp_package_reservations ON miniapp_booking_packages(user_package_id,state)`,
  `CREATE TABLE IF NOT EXISTS miniapp_package_baselines(user_package_id uuid PRIMARY KEY REFERENCES user_packages(id),legacy_sessions integer NOT NULL CHECK(legacy_sessions>=0))`,
  `CREATE TABLE IF NOT EXISTS miniapp_schema_versions(version text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT clock_timestamp())`,
  `CREATE SEQUENCE IF NOT EXISTS miniapp_notification_sequence`,
  `CREATE INDEX IF NOT EXISTS miniapp_notifications_owner ON notifications(user_id,created_at DESC,id DESC)`,
  `CREATE OR REPLACE FUNCTION miniapp_guard_quiz_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    BEGIN
      IF NOT EXISTS(SELECT 1 FROM course_lessons l JOIN course_chapters ch ON ch.id=l.chapter_id JOIN course_quizzes q ON q.course_id=ch.course_id
        WHERE l.id=NEW.lesson_id AND q.id=NEW.quiz_id AND l.lesson_type='QUIZ') THEN RAISE EXCEPTION 'Quiz must belong to the same course as its QUIZ lesson'; END IF;
      RETURN NEW;
    END $$`,
  `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_quiz_link_guard') THEN
    CREATE TRIGGER miniapp_quiz_link_guard BEFORE INSERT OR UPDATE ON miniapp_lesson_quizzes FOR EACH ROW EXECUTE FUNCTION miniapp_guard_quiz_link(); END IF; END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_package_journal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE link miniapp_booking_packages%ROWTYPE; owned user_packages%ROWTYPE; used integer; reserved integer; legacy integer;
    BEGIN
      IF NEW.user_package_id IS NOT NULL AND EXISTS(SELECT 1 FROM miniapp_package_baselines WHERE user_package_id=NEW.user_package_id) THEN
        SELECT * INTO owned FROM user_packages WHERE id=NEW.user_package_id FOR UPDATE;
        IF owned.customer_id IS DISTINCT FROM NEW.customer_id THEN RAISE EXCEPTION 'Journal customer does not own this package'; END IF;
      END IF;
      IF TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM miniapp_booking_packages WHERE journal_id=OLD.id AND state='CONSUMED')
        AND (NEW.booking_id IS DISTINCT FROM OLD.booking_id OR NEW.user_package_id IS DISTINCT FROM OLD.user_package_id OR NEW.customer_id<>OLD.customer_id)
        THEN RAISE EXCEPTION 'A consumed package journal cannot be reassigned'; END IF;
      SELECT * INTO link FROM miniapp_booking_packages WHERE booking_id=NEW.booking_id FOR UPDATE;
      IF FOUND THEN
        IF NEW.user_package_id IS DISTINCT FROM link.user_package_id OR NOT EXISTS(SELECT 1 FROM bookings WHERE id=NEW.booking_id AND customer_id=NEW.customer_id)
          THEN RAISE EXCEPTION 'Journal does not match the reserved customer package'; END IF;
        IF link.state='RELEASED' THEN RAISE EXCEPTION 'Package reservation was released'; END IF;
        IF link.journal_id IS NOT NULL AND link.journal_id<>NEW.id THEN RAISE EXCEPTION 'Package session already has a journal'; END IF;
        UPDATE miniapp_booking_packages SET state='CONSUMED',journal_id=NEW.id WHERE booking_id=NEW.booking_id;
        UPDATE user_packages SET completed_sessions=GREATEST(completed_sessions,(SELECT legacy_sessions FROM miniapp_package_baselines WHERE user_package_id=link.user_package_id)+(SELECT count(*) FROM treatment_journal WHERE user_package_id=link.user_package_id)) WHERE id=link.user_package_id;
      END IF;
      IF owned.id IS NOT NULL THEN
        SELECT legacy_sessions INTO legacy FROM miniapp_package_baselines WHERE user_package_id=owned.id;
        SELECT GREATEST(owned.completed_sessions,legacy+count(*)::int) INTO used FROM treatment_journal WHERE user_package_id=owned.id;
        SELECT count(*)::int INTO reserved FROM miniapp_booking_packages WHERE user_package_id=owned.id AND state='RESERVED';
        IF used+reserved>owned.total_sessions THEN RAISE EXCEPTION 'Package sessions are exhausted or reserved by another booking'; END IF;
        UPDATE user_packages SET completed_sessions=used WHERE id=owned.id;
      END IF;
      RETURN NEW;
    END $$`,
  `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_package_journal_link') THEN
    CREATE TRIGGER miniapp_package_journal_link AFTER INSERT OR UPDATE ON treatment_journal FOR EACH ROW EXECUTE FUNCTION miniapp_package_journal(); END IF; END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_release_package() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    BEGIN
      IF NEW.status IN ('CANCELLED','NO_SHOW') AND NEW.status IS DISTINCT FROM OLD.status THEN
        IF EXISTS(SELECT 1 FROM miniapp_booking_packages WHERE booking_id=NEW.id AND state='CONSUMED') THEN RAISE EXCEPTION 'Consumed sessions require the shared correction workflow'; END IF;
        UPDATE miniapp_booking_packages SET state='RELEASED' WHERE booking_id=NEW.id AND state='RESERVED';
      END IF;
      IF OLD.status IN ('CANCELLED','NO_SHOW') AND NEW.status NOT IN ('CANCELLED','NO_SHOW') AND EXISTS(SELECT 1 FROM miniapp_booking_packages WHERE booking_id=NEW.id AND state='RELEASED')
        THEN RAISE EXCEPTION 'A released package booking must be reserved again'; END IF;
      RETURN NEW;
    END $$`,
  `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_package_booking_status') THEN
    CREATE TRIGGER miniapp_package_booking_status BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION miniapp_release_package(); END IF; END $$`,
  `CREATE OR REPLACE FUNCTION miniapp_guard_package_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
    DECLARE legacy integer;
    BEGIN
      SELECT legacy_sessions INTO legacy FROM miniapp_package_baselines WHERE user_package_id=NEW.id;
      IF FOUND THEN
        NEW.completed_sessions:=GREATEST(NEW.completed_sessions,legacy+(SELECT count(*) FROM treatment_journal WHERE user_package_id=NEW.id));
        IF NEW.completed_sessions>=NEW.total_sessions AND NEW.status IN ('ACTIVE','COMPLETED') THEN NEW.status:='COMPLETED'; END IF;
      END IF;
      RETURN NEW;
    END $$`,
  `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='miniapp_package_counter_guard') THEN CREATE TRIGGER miniapp_package_counter_guard BEFORE UPDATE ON user_packages FOR EACH ROW EXECUTE FUNCTION miniapp_guard_package_count(); END IF; END $$`,
  ...['miniapp_lesson_quizzes','miniapp_quiz_attempts','miniapp_lesson_playbacks','miniapp_booking_packages','miniapp_package_baselines','miniapp_schema_versions'].map(table=>`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`),
];
