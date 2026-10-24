-- ==============================================================================
-- ROLLBACK MIGRATION 000: THU HỒI CÁC HÀM TIỆN ÍCH XÁC THỰC BẢO MẬT
-- ==============================================================================

DROP FUNCTION IF EXISTS public.get_current_user_branch_id();
DROP FUNCTION IF EXISTS public.is_staff();
DROP FUNCTION IF EXISTS public.is_admin();
DROP FUNCTION IF EXISTS public.get_current_user_role();
