DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_status') THEN
    CREATE TYPE shift_status AS ENUM ('OPEN', 'CLOSED', 'RECONCILED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cashier_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  cashier_id UUID NOT NULL REFERENCES public.users(id),
  shift_code VARCHAR(50) UNIQUE NOT NULL,
  opening_cash NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (opening_cash >= 0),
  closing_cash NUMERIC(14, 2) DEFAULT 0,
  system_cash NUMERIC(14, 2) DEFAULT 0,
  card_sales NUMERIC(14, 2) DEFAULT 0,
  transfer_sales NUMERIC(14, 2) DEFAULT 0,
  total_sales NUMERIC(14, 2) DEFAULT 0,
  discrepancy_amount NUMERIC(14, 2) DEFAULT 0,
  status shift_status NOT NULL DEFAULT 'OPEN',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_branch_status ON public.cashier_shifts(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_cashier_shifts_cashier ON public.cashier_shifts(cashier_id);

ALTER TABLE public.cashier_shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff manage cashier_shifts" ON public.cashier_shifts;
CREATE POLICY "Staff manage cashier_shifts" ON public.cashier_shifts
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('CASHIER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('CASHIER', 'ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER')
  ));

ALTER TABLE public.tuition_transactions
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS shift_id UUID REFERENCES public.cashier_shifts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pre_tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(4, 2) NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS printed_count INT NOT NULL DEFAULT 0 CHECK (printed_count >= 0);
CREATE INDEX IF NOT EXISTS idx_invoices_shift ON public.invoices(shift_id);
