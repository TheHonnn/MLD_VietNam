-- ==============================================================================
-- 023_fix_rls_security_and_timezone_auto_release.sql
-- 1. Bảo mật RLS tuyệt đối cho treatment_journal, inventory_consumption_logs, user_roles
--    (Chặn anon truy cập trực tiếp qua REST API, chỉ cho phép authenticated & service_role)
-- 2. Cập nhật hàm fn_release_completed_bookings sử dụng múi giờ Việt Nam (Asia/Ho_Chi_Minh)
--    để tránh lỗi so sánh ngày giờ UTC ban đêm
-- ==============================================================================

-- 1. BẢO MẬT RLS: treatment_journal
REVOKE ALL ON public.treatment_journal FROM anon;
DROP POLICY IF EXISTS "Public read treatment_journal" ON public.treatment_journal;
DROP POLICY IF EXISTS "Staff manage treatment_journal" ON public.treatment_journal;

CREATE POLICY "Staff manage treatment_journal"
ON public.treatment_journal FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 2. BẢO MẬT RLS: inventory_consumption_logs
REVOKE ALL ON public.inventory_consumption_logs FROM anon;
DROP POLICY IF EXISTS "Public read inventory_consumption_logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Staff manage inventory_consumption_logs" ON public.inventory_consumption_logs;

CREATE POLICY "Staff manage inventory_consumption_logs"
ON public.inventory_consumption_logs FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 3. BẢO MẬT RLS: user_roles
REVOKE ALL ON public.user_roles FROM anon;
DROP POLICY IF EXISTS "Public read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Staff manage user_roles" ON public.user_roles;

CREATE POLICY "Staff manage user_roles"
ON public.user_roles FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 4. RPC AUTO-RELEASE VỚI MÚI GIỜ VIỆT NAM (Asia/Ho_Chi_Minh)
CREATE OR REPLACE FUNCTION public.fn_release_completed_bookings(p_branch_id UUID DEFAULT NULL)
RETURNS TABLE (
  released_count INT,
  message TEXT
) AS $$
DECLARE
  v_count INT := 0;
  v_vn_now TIMESTAMPTZ := NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh';
  v_vn_date DATE := v_vn_now::DATE;
  v_vn_time TIME := v_vn_now::TIME;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET status = 'COMPLETED',
        session_status = 'COMPLETED',
        checked_out_at = COALESCE(checked_out_at, NOW()),
        updated_at = NOW()
    WHERE status IN ('CONFIRMED', 'IN_SERVICE')
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (
        booking_date < v_vn_date OR
        (booking_date = v_vn_date AND end_time <= v_vn_time)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN QUERY SELECT 
    v_count, 
    ('Đã tự động giải phóng ' || v_count || ' ca trị liệu hoàn tất (nhả giường & KTV).')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fn_release_completed_bookings(UUID) TO authenticated, service_role, anon;

