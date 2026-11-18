ALTER TYPE public.enrollment_status ADD VALUE IF NOT EXISTS 'NOT_GRADUATED';
ALTER TYPE public.enrollment_status ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS consultation_history JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS target_audience VARCHAR(150);
