-- ==============================================================================
-- MLD VIỆT NAM - MIGRATION 010: CẤU HÌNH CASCADE XÓA KHÁCH HÀNG & TÀI KHOẢN
-- Khắc phục lỗi: update or delete on table "users" violates foreign key constraint "bookings_customer_id_fkey"
-- Đảm bảo xóa khách hàng sẽ cascade sạch sẽ toàn bộ dữ liệu lịch hẹn, hóa đơn, miniapp
-- ==============================================================================

-- 1. BẢNG LIÊN QUAN TRỰC TIẾP TỚI BOOKINGS (Cascading từ bookings)
ALTER TABLE public.miniapp_booking_beds 
  DROP CONSTRAINT IF EXISTS miniapp_booking_beds_booking_id_fkey,
  ADD CONSTRAINT miniapp_booking_beds_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_booking_group_members 
  DROP CONSTRAINT IF EXISTS miniapp_booking_group_members_booking_id_fkey,
  ADD CONSTRAINT miniapp_booking_group_members_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_booking_packages 
  DROP CONSTRAINT IF EXISTS miniapp_booking_packages_booking_id_fkey,
  ADD CONSTRAINT miniapp_booking_packages_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_booking_requests 
  DROP CONSTRAINT IF EXISTS miniapp_booking_requests_booking_id_fkey,
  ADD CONSTRAINT miniapp_booking_requests_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_staff_bookings 
  DROP CONSTRAINT IF EXISTS miniapp_staff_bookings_booking_id_fkey,
  ADD CONSTRAINT miniapp_staff_bookings_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


-- 2. BẢNG BOOKINGS LIÊN KẾT TỚI USERS
ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey,
  ADD CONSTRAINT bookings_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_checked_in_by_id_fkey,
  ADD CONSTRAINT bookings_checked_in_by_id_fkey 
    FOREIGN KEY (checked_in_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_checked_out_by_id_fkey,
  ADD CONSTRAINT bookings_checked_out_by_id_fkey 
    FOREIGN KEY (checked_out_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- 3. BẢNG INVOICES (HÓA ĐƠN) LIÊN KẾT TỚI USERS
ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS invoices_customer_id_fkey,
  ADD CONSTRAINT invoices_customer_id_fkey 
    FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.invoices 
  DROP CONSTRAINT IF EXISTS invoices_refunded_by_id_fkey,
  ADD CONSTRAINT invoices_refunded_by_id_fkey 
    FOREIGN KEY (refunded_by_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- 4. BẢNG MINIAPP LIÊN KẾT TỚI USERS
ALTER TABLE public.miniapp_customer_profiles 
  DROP CONSTRAINT IF EXISTS miniapp_customer_profiles_user_id_fkey,
  ADD CONSTRAINT miniapp_customer_profiles_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_membership_cards 
  DROP CONSTRAINT IF EXISTS miniapp_membership_cards_user_id_fkey,
  ADD CONSTRAINT miniapp_membership_cards_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_booking_requests 
  DROP CONSTRAINT IF EXISTS miniapp_booking_requests_user_id_fkey,
  ADD CONSTRAINT miniapp_booking_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_customer_requests 
  DROP CONSTRAINT IF EXISTS miniapp_customer_requests_user_id_fkey,
  ADD CONSTRAINT miniapp_customer_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_favorite_services 
  DROP CONSTRAINT IF EXISTS miniapp_favorite_services_user_id_fkey,
  ADD CONSTRAINT miniapp_favorite_services_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_account_sessions 
  DROP CONSTRAINT IF EXISTS miniapp_account_sessions_user_id_fkey,
  ADD CONSTRAINT miniapp_account_sessions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_account_revocations 
  DROP CONSTRAINT IF EXISTS miniapp_account_revocations_user_id_fkey,
  ADD CONSTRAINT miniapp_account_revocations_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.miniapp_shared_content 
  DROP CONSTRAINT IF EXISTS miniapp_shared_content_author_id_fkey,
  ADD CONSTRAINT miniapp_shared_content_author_id_fkey 
    FOREIGN KEY (author_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.miniapp_shared_content 
  DROP CONSTRAINT IF EXISTS miniapp_shared_content_updated_by_fkey,
  ADD CONSTRAINT miniapp_shared_content_updated_by_fkey 
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.miniapp_staff_bookings 
  DROP CONSTRAINT IF EXISTS miniapp_staff_bookings_staff_id_fkey,
  ADD CONSTRAINT miniapp_staff_bookings_staff_id_fkey 
    FOREIGN KEY (staff_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- 5. CÁC BẢNG KHÁC LIÊN KẾT TỚI USERS (REFERRALS, ATTENDANCE, ROLES, SHIFTS...)
ALTER TABLE public.referrals 
  DROP CONSTRAINT IF EXISTS referrals_referee_id_fkey,
  ADD CONSTRAINT referrals_referee_id_fkey 
    FOREIGN KEY (referee_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.referrals 
  DROP CONSTRAINT IF EXISTS referrals_referrer_id_fkey,
  ADD CONSTRAINT referrals_referrer_id_fkey 
    FOREIGN KEY (referrer_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.cashier_shifts 
  DROP CONSTRAINT IF EXISTS cashier_shifts_cashier_id_fkey,
  ADD CONSTRAINT cashier_shifts_cashier_id_fkey 
    FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.edema_assessments 
  DROP CONSTRAINT IF EXISTS edema_assessments_examiner_id_fkey,
  ADD CONSTRAINT edema_assessments_examiner_id_fkey 
    FOREIGN KEY (examiner_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.staff_leaves 
  DROP CONSTRAINT IF EXISTS staff_leaves_approved_by_fkey,
  ADD CONSTRAINT staff_leaves_approved_by_fkey 
    FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.student_attendance 
  DROP CONSTRAINT IF EXISTS student_attendance_marked_by_id_fkey,
  ADD CONSTRAINT student_attendance_marked_by_id_fkey 
    FOREIGN KEY (marked_by_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.tuition_transactions 
  DROP CONSTRAINT IF EXISTS tuition_transactions_cashier_id_fkey,
  ADD CONSTRAINT tuition_transactions_cashier_id_fkey 
    FOREIGN KEY (cashier_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_granted_by_fkey,
  ADD CONSTRAINT user_roles_granted_by_fkey 
    FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;
