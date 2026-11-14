BEGIN;
-- Reversed journals remain immutable history; their paid session can be reused.
DROP INDEX IF EXISTS public.uq_treatment_journal_package_session;
CREATE UNIQUE INDEX uq_treatment_journal_package_session
  ON public.treatment_journal(user_package_id,session_number)
  WHERE user_package_id IS NOT NULL AND is_reversed IS NOT TRUE;
COMMIT;
