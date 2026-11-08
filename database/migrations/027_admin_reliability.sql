-- Persist successful cashier requests in the same transaction as the ledger.
-- The key belongs to one actor and one payload; retries cannot collect twice.
CREATE TABLE IF NOT EXISTS public.admin_payment_requests (
  actor_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  request_id UUID NOT NULL,
  payload JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (actor_id, request_id)
);
ALTER TABLE public.admin_payment_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_payment_requests FROM anon, authenticated;

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
