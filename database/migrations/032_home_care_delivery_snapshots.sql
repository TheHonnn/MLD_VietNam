BEGIN;
ALTER TABLE public.home_care_guidelines
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.home_care_deliveries ADD COLUMN IF NOT EXISTS guideline_version INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS uq_home_care_guideline_delivery
  ON public.home_care_deliveries(treatment_journal_id,guideline_id,guideline_version)
  WHERE guideline_version IS NOT NULL;
COMMIT;
