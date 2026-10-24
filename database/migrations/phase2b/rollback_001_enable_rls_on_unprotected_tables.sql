-- ==============================================================================
-- ROLLBACK MIGRATION 001: THU HỒI CHÍNH SÁCH VÀ TẮT RLS TRÊN 3 BẢNG KHO/HOA HỒNG
-- ==============================================================================

DROP POLICY IF EXISTS "Staff can view own commissions" ON public.staff_commissions;
DROP POLICY IF EXISTS "Admin full control on commissions" ON public.staff_commissions;
DROP POLICY IF EXISTS "Staff can view branch consumption logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Staff can insert branch consumption logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Admin full control on consumption logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Staff can view service materials" ON public.service_materials;
DROP POLICY IF EXISTS "Admin full control on service materials" ON public.service_materials;

ALTER TABLE public.staff_commissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_materials DISABLE ROW LEVEL SECURITY;
