-- ==============================================================================
-- MIGRATION 005: BỔ SUNG QUYỀN RLS VÀ TIỆN ÍCH QUẢN LÝ DỊCH VỤ & GÓI LIỆU TRÌNH
-- Hệ sinh thái MLD Việt Nam
-- ==============================================================================

-- 1. Cập nhật hàm tiện ích xác thực Quản trị viên và Nhân sự
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    v_email := auth.jwt() ->> 'email';
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE (id = auth.uid() OR (v_email IS NOT NULL AND email = v_email))
          AND role::TEXT IN ('ADMIN', 'SUPER_ADMIN') 
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
DECLARE
    v_email TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    v_email := auth.jwt() ->> 'email';
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE (id = auth.uid() OR (v_email IS NOT NULL AND email = v_email))
          AND role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR')
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Chính sách RLS cho bảng Dịch vụ (services)
DROP POLICY IF EXISTS "Public Read services" ON public.services;
DROP POLICY IF EXISTS "Admin full control on services" ON public.services;
DROP POLICY IF EXISTS "Staff manage services" ON public.services;

CREATE POLICY "Public Read services" ON public.services
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Staff manage services" ON public.services
  FOR ALL TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 3. Chính sách RLS cho bảng Danh mục Dịch vụ (service_categories)
DROP POLICY IF EXISTS "Public Read service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Admin full control on service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Staff manage service_categories" ON public.service_categories;

CREATE POLICY "Public Read service_categories" ON public.service_categories
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Staff manage service_categories" ON public.service_categories
  FOR ALL TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 4. Chính sách RLS cho bảng Gói liệu trình (treatment_packages)
DROP POLICY IF EXISTS "Public Read treatment_packages" ON public.treatment_packages;
DROP POLICY IF EXISTS "Admin full control on treatment_packages" ON public.treatment_packages;
DROP POLICY IF EXISTS "Staff manage treatment_packages" ON public.treatment_packages;

CREATE POLICY "Public Read treatment_packages" ON public.treatment_packages
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Staff manage treatment_packages" ON public.treatment_packages
  FOR ALL TO authenticated, anon
  USING (true)
  WITH CHECK (true);

-- 5. Cấu hình khóa ngoại hỗ trợ Xóa vĩnh viễn (Hard Delete) dịch vụ
-- Đảm bảo khi xóa hẳn dịch vụ không bị chặn bởi khóa ngoại
ALTER TABLE public.booking_items ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE public.booking_items DROP CONSTRAINT IF EXISTS booking_items_service_id_fkey;
ALTER TABLE public.booking_items ADD CONSTRAINT booking_items_service_id_fkey 
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;

ALTER TABLE public.miniapp_favorite_services DROP CONSTRAINT IF EXISTS miniapp_favorite_services_service_id_fkey;
ALTER TABLE public.miniapp_favorite_services ADD CONSTRAINT miniapp_favorite_services_service_id_fkey 
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_technician_services DROP CONSTRAINT IF EXISTS miniapp_technician_services_service_id_fkey;
ALTER TABLE public.miniapp_technician_services ADD CONSTRAINT miniapp_technician_services_service_id_fkey 
  FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;

