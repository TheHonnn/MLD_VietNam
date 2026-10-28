ALTER TABLE public.treatment_journal
  ADD COLUMN IF NOT EXISTS treatment_start_time TIME,
  ADD COLUMN IF NOT EXISTS treatment_end_time TIME;
