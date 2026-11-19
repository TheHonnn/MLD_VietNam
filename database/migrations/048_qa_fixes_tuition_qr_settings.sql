ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS pending_pos_qr JSONB;

CREATE INDEX IF NOT EXISTS idx_course_enrollments_order_code
  ON public.course_enrollments(order_code)
  WHERE order_code IS NOT NULL;
