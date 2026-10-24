-- ==============================================================================
-- ROLLBACK MIGRATION 002: TẠI SAO CẦN DỰ PHÒNG ROLLBACK
-- Mục đích: Khôi phục lại trạng thái cũ trong trường hợp khẩn cấp nếu Mobile/POS bị lỗi truy vấn
-- ==============================================================================

CREATE POLICY "Public Read users" ON public.users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read bookings" ON public.bookings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read invoices" ON public.invoices FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read staff_profiles" ON public.staff_profiles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read tuition_transactions" ON public.tuition_transactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read user_packages" ON public.user_packages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read booking_items" ON public.booking_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read branch_rooms" ON public.branch_rooms FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read course_batches" ON public.course_batches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read course_enrollments" ON public.course_enrollments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read instructors" ON public.instructors FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read invoice_items" ON public.invoice_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read student_attendance" ON public.student_attendance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read technician_shifts" ON public.technician_shifts FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read technician_slots" ON public.technician_slots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read technicians" ON public.technicians FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read treatment_journal" ON public.treatment_journal FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read treatment_packages" ON public.treatment_packages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read branches" ON public.branches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read services" ON public.services FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read service_categories" ON public.service_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read courses" ON public.courses FOR SELECT TO anon, authenticated USING (true);
