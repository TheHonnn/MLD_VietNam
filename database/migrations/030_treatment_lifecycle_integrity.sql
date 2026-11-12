-- Khóa tính toàn vẹn cho vòng đời liệu trình.
-- Một lịch phục vụ chỉ sinh một nhật ký và một gói không thể có hai bản ghi cùng số buổi.

CREATE UNIQUE INDEX IF NOT EXISTS uq_treatment_journal_booking
  ON public.treatment_journal(booking_id)
  WHERE booking_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_treatment_journal_package_session
  ON public.treatment_journal(user_package_id, session_number)
  WHERE user_package_id IS NOT NULL;

ALTER TABLE public.user_packages
  DROP CONSTRAINT IF EXISTS user_packages_completed_sessions_bounds;

ALTER TABLE public.user_packages
  ADD CONSTRAINT user_packages_completed_sessions_bounds
  CHECK (completed_sessions >= 0 AND completed_sessions <= total_sessions);

CREATE INDEX IF NOT EXISTS idx_treatment_journal_package_date
  ON public.treatment_journal(user_package_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_packages_customer_status_expiry
  ON public.user_packages(customer_id, status, expires_at);
