-- ==============================================================================
-- PHASE 2B MIGRATION 002: THU HỒI CÁC POLICY CÔNG KHAI "QUAL: TRUE" TRÊN CÁC BẢNG NHẠY CẢM
-- Mục đích: Đóng triệt để lỗ hổng anon đọc toàn bộ thông tin khách hàng, hóa đơn, lịch hẹn
-- ==============================================================================

DROP POLICY IF EXISTS "Public Read users" ON public.users;
DROP POLICY IF EXISTS "Public Read bookings" ON public.bookings;
DROP POLICY IF EXISTS "Public Read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Public Read staff_profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Public Read tuition_transactions" ON public.tuition_transactions;
DROP POLICY IF EXISTS "Public Read user_packages" ON public.user_packages;
DROP POLICY IF EXISTS "Public Read booking_items" ON public.booking_items;
DROP POLICY IF EXISTS "Public Read branch_rooms" ON public.branch_rooms;
DROP POLICY IF EXISTS "Public Read course_batches" ON public.course_batches;
DROP POLICY IF EXISTS "Public Read course_enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Public Read instructors" ON public.instructors;
DROP POLICY IF EXISTS "Public Read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Public Read student_attendance" ON public.student_attendance;
DROP POLICY IF EXISTS "Public Read technician_shifts" ON public.technician_shifts;
DROP POLICY IF EXISTS "Public Read technician_slots" ON public.technician_slots;
DROP POLICY IF EXISTS "Public Read technicians" ON public.technicians;
DROP POLICY IF EXISTS "Public Read treatment_journal" ON public.treatment_journal;
DROP POLICY IF EXISTS "Public Read treatment_packages" ON public.treatment_packages;

-- Lưu ý: Các bảng danh mục công khai (branches, services, service_categories, courses) 
-- sẽ được chuẩn hóa điều kiện (is_active = true) tại migration 003.
DROP POLICY IF EXISTS "Public Read branches" ON public.branches;
DROP POLICY IF EXISTS "Public Read services" ON public.services;
DROP POLICY IF EXISTS "Public Read service_categories" ON public.service_categories;
DROP POLICY IF EXISTS "Public Read courses" ON public.courses;
