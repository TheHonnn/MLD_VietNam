-- ==============================================================================
-- ROLLBACK MIGRATION 003: THU HỒI CÁC POLICY LEAST PRIVILEGE VỪA TẠO
-- ==============================================================================

DROP POLICY IF EXISTS "Public can view active branches" ON public.branches;
DROP POLICY IF EXISTS "Admin full control on branches" ON public.branches;
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
DROP POLICY IF EXISTS "Admin full control on services" ON public.services;
DROP POLICY IF EXISTS "Public can view service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Admin full control on service categories" ON public.service_categories;
DROP POLICY IF EXISTS "Public can view active courses" ON public.courses;
DROP POLICY IF EXISTS "Admin full control on courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view own profile or staff access" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Customers and staff can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Booking items visibility" ON public.booking_items;
DROP POLICY IF EXISTS "Invoices view policy" ON public.invoices;
DROP POLICY IF EXISTS "Staff can insert invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff can update invoices" ON public.invoices;
DROP POLICY IF EXISTS "Invoice items view policy" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff profiles view policy" ON public.staff_profiles;
DROP POLICY IF EXISTS "Admin full control on staff profiles" ON public.staff_profiles;
DROP POLICY IF EXISTS "Tuition transactions view policy" ON public.tuition_transactions;
DROP POLICY IF EXISTS "Admin manage tuition transactions" ON public.tuition_transactions;
DROP POLICY IF EXISTS "Course enrollments view policy" ON public.course_enrollments;
DROP POLICY IF EXISTS "User packages view policy" ON public.user_packages;
DROP POLICY IF EXISTS "Staff manage user packages" ON public.user_packages;
DROP POLICY IF EXISTS "Treatment journal view policy" ON public.treatment_journal;
DROP POLICY IF EXISTS "Staff manage treatment journal" ON public.treatment_journal;
