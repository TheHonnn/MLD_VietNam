ALTER TABLE public.home_products
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_home_products_active ON public.home_products (is_active, sort_order);
