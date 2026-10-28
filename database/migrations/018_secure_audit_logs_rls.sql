-- ==============================================================================
-- Migration 018: Thắt chặt an ninh RLS cho bảng audit_logs
-- Ngăn chặn tuyệt đối anon key (chưa xác thực) truy cập nhật ký kiểm toán hệ thống
-- ==============================================================================

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff manage audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated insert audit_logs" ON public.audit_logs;

-- Chỉ cho phép người dùng đăng nhập có vai trò ADMIN / SUPER_ADMIN đọc audit_logs
CREATE POLICY "Admin read audit_logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Cho phép authenticated tạo audit log
CREATE POLICY "Authenticated insert audit_logs" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);
