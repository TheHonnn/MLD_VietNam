-- ==============================================================================
-- PHASE 2B MIGRATION 001: KÍCH HOẠT RLS CHO 3 BẢNG ĐANG BỊ TẮT BẢO VỆ
-- Bảng bị ảnh hưởng: staff_commissions, inventory_consumption_logs, service_materials
-- ==============================================================================

-- 1. Kích hoạt Row Level Security
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_materials ENABLE ROW LEVEL SECURITY;

-- 2. Thiết lập chính sách bảo vệ cho staff_commissions (Hoa hồng nhân viên)
DROP POLICY IF EXISTS "Staff can view own commissions" ON public.staff_commissions;
CREATE POLICY "Staff can view own commissions"
ON public.staff_commissions FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR technician_id IN (
        SELECT id FROM public.technicians WHERE user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Admin full control on commissions" ON public.staff_commissions;
CREATE POLICY "Admin full control on commissions"
ON public.staff_commissions FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Thiết lập chính sách bảo vệ cho inventory_consumption_logs (Nhật ký xuất kho vật tư)
DROP POLICY IF EXISTS "Staff can view branch consumption logs" ON public.inventory_consumption_logs;
CREATE POLICY "Staff can view branch consumption logs"
ON public.inventory_consumption_logs FOR SELECT
TO authenticated
USING (
    public.is_admin()
    OR (
        public.is_staff() 
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Staff can insert branch consumption logs" ON public.inventory_consumption_logs;
CREATE POLICY "Staff can insert branch consumption logs"
ON public.inventory_consumption_logs FOR INSERT
TO authenticated
WITH CHECK (
    public.is_admin()
    OR (
        public.is_staff() 
        AND branch_id = public.get_current_user_branch_id()
    )
);

DROP POLICY IF EXISTS "Admin full control on consumption logs" ON public.inventory_consumption_logs;
CREATE POLICY "Admin full control on consumption logs"
ON public.inventory_consumption_logs FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Thiết lập chính sách bảo vệ cho service_materials (Định mức vật tư dịch vụ - BOM)
DROP POLICY IF EXISTS "Staff can view service materials" ON public.service_materials;
CREATE POLICY "Staff can view service materials"
ON public.service_materials FOR SELECT
TO authenticated
USING (public.is_staff() OR public.is_admin());

DROP POLICY IF EXISTS "Admin full control on service materials" ON public.service_materials;
CREATE POLICY "Admin full control on service materials"
ON public.service_materials FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
