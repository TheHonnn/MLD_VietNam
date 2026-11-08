-- Commission attribution for successful course and treatment package payments.
ALTER TABLE public.staff_commissions
  ADD COLUMN IF NOT EXISTS tuition_transaction_id UUID
    REFERENCES public.tuition_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_package_id UUID
    REFERENCES public.user_packages(id) ON DELETE SET NULL;

ALTER TABLE public.user_packages
  ADD COLUMN IF NOT EXISTS commission_staff_id UUID
    REFERENCES public.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_commissions_tuition_transaction
  ON public.staff_commissions(tuition_transaction_id)
  WHERE tuition_transaction_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_commissions_user_package
  ON public.staff_commissions(user_package_id)
  WHERE user_package_id IS NOT NULL;
