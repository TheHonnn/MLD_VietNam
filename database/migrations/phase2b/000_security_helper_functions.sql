-- ==============================================================================
-- PHASE 2B MIGRATION 000: BỔ SUNG CÁC HÀM TIỆN ÍCH XÁC THỰC BẢO MẬT
-- Mục đích: Hỗ trợ Row Level Security (RLS) đánh giá vai trò và chi nhánh người dùng
-- Chú ý: Sử dụng SECURITY DEFINER và SET search_path = public để chống leo thang đặc quyền
-- ==============================================================================

-- 1. Lấy vai trò (Role) của tài khoản đang đăng nhập
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN 'ANON';
    END IF;
    SELECT role::TEXT INTO v_role FROM public.users WHERE id = auth.uid();
    RETURN COALESCE(v_role, 'ANON');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. Kiểm tra tài khoản có phải Quản trị viên (Admin / Super Admin) hay không
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role::TEXT IN ('ADMIN', 'SUPER_ADMIN') AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 3. Kiểm tra tài khoản có phải là Nhân sự vận hành (Staff) hay không
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
          AND role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR')
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 4. Lấy Chi nhánh (branch_id) của nhân viên đang đăng nhập
CREATE OR REPLACE FUNCTION public.get_current_user_branch_id()
RETURNS UUID AS $$
DECLARE
    v_branch_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN NULL;
    END IF;

    -- Kiểm tra từ phân quyền chi nhánh user_roles
    SELECT branch_id INTO v_branch_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND branch_id IS NOT NULL 
    LIMIT 1;

    -- Nếu chưa có thì kiểm tra từ hồ sơ nhân sự staff_profiles
    IF v_branch_id IS NULL THEN
        SELECT branch_id INTO v_branch_id 
        FROM public.staff_profiles 
        WHERE user_id = auth.uid() 
        LIMIT 1;
    END IF;

    RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;
