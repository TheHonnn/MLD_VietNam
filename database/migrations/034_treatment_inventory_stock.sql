BEGIN;
CREATE TABLE IF NOT EXISTS public.branch_material_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
  material_name TEXT NOT NULL CHECK(length(btrim(material_name))>0),
  unit TEXT NOT NULL CHECK(length(btrim(unit))>0),
  quantity NUMERIC(14,3) NOT NULL CHECK(quantity>=0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(branch_id,material_name,unit)
);
CREATE TABLE IF NOT EXISTS public.treatment_stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id UUID NOT NULL REFERENCES public.branch_material_stock(id) ON DELETE RESTRICT,
  outbox_id UUID REFERENCES public.treatment_inventory_outbox(id) ON DELETE RESTRICT,
  delta NUMERIC(14,3) NOT NULL,
  reason TEXT NOT NULL,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(outbox_id,stock_id)
);
ALTER TABLE public.treatment_inventory_outbox ADD COLUMN IF NOT EXISTS sync_error TEXT;
INSERT INTO public.permissions(code,module,name) VALUES
 ('branch_material_stock.read','treatment','Xem tồn kho vật tư'),
 ('branch_material_stock.action','treatment','Ghi nhận kiểm kê vật tư'),
 ('treatment_stock_movements.read','treatment','Xem sổ kho vật tư'),
 ('treatment_inventory_outbox.read','treatment','Xem hàng đợi kho'),
 ('treatment_inventory_outbox.action','treatment','Thử lại đồng bộ kho')
ON CONFLICT(code) DO NOTHING;
ALTER TABLE public.branch_material_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_stock_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.branch_material_stock,public.treatment_stock_movements FROM anon,authenticated;
GRANT SELECT ON public.branch_material_stock,public.treatment_stock_movements TO authenticated;
DROP POLICY IF EXISTS "Scoped material stock reads" ON public.branch_material_stock;
CREATE POLICY "Scoped material stock reads" ON public.branch_material_stock FOR SELECT TO authenticated
 USING(public.admin_is_super() OR public.admin_can_access_branch(branch_id));
DROP POLICY IF EXISTS "Scoped material movement reads" ON public.treatment_stock_movements;
CREATE POLICY "Scoped material movement reads" ON public.treatment_stock_movements FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM public.branch_material_stock s WHERE s.id=stock_id AND (public.admin_is_super() OR public.admin_can_access_branch(s.branch_id))));
COMMIT;
