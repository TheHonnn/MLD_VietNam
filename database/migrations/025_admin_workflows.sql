-- Supporting data for receipt corrections, product galleries, care delivery,
-- flexible departments, class assistants, grade history, and visit commissions.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS receipt_customer_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS receipt_description TEXT,
  ADD COLUMN IF NOT EXISTS receipt_notes TEXT;

CREATE TABLE IF NOT EXISTS public.invoice_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  before_data JSONB NOT NULL,
  after_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_invoice_edit_history_invoice
  ON public.invoice_edit_history(invoice_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.fn_edit_invoice_receipt(
  p_invoice_id UUID,
  p_customer_name TEXT,
  p_description TEXT,
  p_notes TEXT,
  p_reason TEXT
) RETURNS public.invoices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_invoice public.invoices%ROWTYPE;
  v_role TEXT;
  v_shift_closed BOOLEAN := FALSE;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF v_actor IS NULL OR length(trim(COALESCE(p_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Cần đăng nhập và nhập lý do sửa tối thiểu 3 ký tự.' USING ERRCODE = '22023';
  END IF;

  SELECT role::TEXT INTO v_role FROM public.users
  WHERE id = v_actor AND is_active = TRUE;
  IF COALESCE(v_role, '') NOT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER') THEN
    RAISE EXCEPTION 'Không có quyền sửa biên lai.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy biên lai.' USING ERRCODE = 'P0002';
  END IF;

  IF v_invoice.shift_id IS NOT NULL THEN
    SELECT closed_at IS NOT NULL INTO v_shift_closed
    FROM public.cashier_shifts WHERE id = v_invoice.shift_id;
  END IF;
  IF v_shift_closed AND v_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Ca đã chốt. Chỉ quản trị viên được sửa thông tin mô tả.' USING ERRCODE = '42501';
  END IF;

  v_before := jsonb_build_object(
    'receipt_customer_name', v_invoice.receipt_customer_name,
    'receipt_description', v_invoice.receipt_description,
    'receipt_notes', v_invoice.receipt_notes
  );
  v_after := jsonb_build_object(
    'receipt_customer_name', NULLIF(trim(p_customer_name), ''),
    'receipt_description', NULLIF(trim(p_description), ''),
    'receipt_notes', NULLIF(trim(p_notes), '')
  );

  UPDATE public.invoices
  SET receipt_customer_name = v_after->>'receipt_customer_name',
      receipt_description = v_after->>'receipt_description',
      receipt_notes = v_after->>'receipt_notes'
  WHERE id = p_invoice_id
  RETURNING * INTO v_invoice;

  INSERT INTO public.invoice_edit_history(invoice_id, actor_id, reason, before_data, after_data)
  VALUES (p_invoice_id, v_actor, trim(p_reason), v_before, v_after);

  RETURN v_invoice;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_edit_invoice_receipt(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_edit_invoice_receipt(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

ALTER TABLE public.home_products
  ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE public.home_products
SET image_urls = jsonb_build_array(image_url)
WHERE image_url IS NOT NULL
  AND image_urls = '[]'::jsonb;

ALTER TABLE public.home_care_guidelines
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS media JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.home_care_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  guideline_id UUID NOT NULL REFERENCES public.home_care_guidelines(id) ON DELETE RESTRICT,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  treatment_journal_id UUID REFERENCES public.treatment_journal(id) ON DELETE SET NULL,
  sent_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  channel VARCHAR(30) NOT NULL DEFAULT 'IN_APP',
  status VARCHAR(30) NOT NULL DEFAULT 'SENT',
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(30),
  request_key UUID UNIQUE,
  content_snapshot JSONB NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  opened_at TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_home_care_deliveries_customer
  ON public.home_care_deliveries(customer_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_home_care_deliveries_booking
  ON public.home_care_deliveries(booking_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO public.departments(code, name, sort_order) VALUES
  ('RECEPTION', 'Lễ tân', 10),
  ('CASHIER', 'Thu ngân', 20),
  ('THERAPY_MASSAGE', 'Trị liệu & Massage', 30),
  ('SKINCARE', 'Chăm sóc da', 40),
  ('ACADEMY_TRAINING', 'Đào tạo', 50),
  ('CUSTOMER_SERVICE', 'Chăm sóc khách hàng', 60),
  ('ADMINISTRATION', 'Hành chính', 70)
ON CONFLICT (code) DO NOTHING;
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL;
UPDATE public.staff_profiles profile
SET department_id = department.id
FROM public.departments department
WHERE profile.department_id IS NULL
  AND profile.department::TEXT = department.code;

CREATE TABLE IF NOT EXISTS public.course_batch_assistants (
  batch_id UUID NOT NULL REFERENCES public.course_batches(id) ON DELETE CASCADE,
  instructor_id UUID NOT NULL REFERENCES public.instructors(id) ON DELETE CASCADE,
  can_mark_attendance BOOLEAN NOT NULL DEFAULT TRUE,
  can_enter_grades BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_by_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (batch_id, instructor_id)
);
INSERT INTO public.course_batch_assistants(batch_id, instructor_id)
SELECT id, assistant_instructor_id FROM public.course_batches
WHERE assistant_instructor_id IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE public.staff_commissions
  ADD COLUMN IF NOT EXISTS reversal_of_id UUID REFERENCES public.staff_commissions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reversed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source_session_status VARCHAR(30);
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_commissions_treatment_session
  ON public.staff_commissions(booking_id, staff_id, commission_type)
  WHERE booking_id IS NOT NULL AND commission_type = 'TREATMENT_SESSION';

CREATE TABLE IF NOT EXISTS public.student_academic_record_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_record_id UUID NOT NULL REFERENCES public.student_academic_records(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  before_data JSONB NOT NULL,
  after_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_academic_record_history_record
  ON public.student_academic_record_history(academic_record_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_submissions_attempts
  ON public.quiz_submissions(enrollment_id, quiz_id, submitted_at DESC);

-- Restrict invoice descriptions to explicit fields; payment amounts remain immutable
-- through the receipt editing workflow after payment or shift close.
ALTER TABLE public.invoice_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_care_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_academic_record_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_batch_assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read invoice_edit_history" ON public.invoice_edit_history;
DROP POLICY IF EXISTS "Staff manage invoice_edit_history" ON public.invoice_edit_history;
CREATE POLICY "Staff manage invoice_edit_history" ON public.invoice_edit_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'))
  );

DROP POLICY IF EXISTS "Public read home_care_deliveries" ON public.home_care_deliveries;
DROP POLICY IF EXISTS "Staff manage home_care_deliveries" ON public.home_care_deliveries;
CREATE POLICY "Staff manage home_care_deliveries" ON public.home_care_deliveries
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR'))
  );
CREATE POLICY "Customers read own care deliveries" ON public.home_care_deliveries
  FOR SELECT TO authenticated USING (customer_id = auth.uid());

DROP POLICY IF EXISTS "Public read student_academic_record_history" ON public.student_academic_record_history;
DROP POLICY IF EXISTS "Staff manage student_academic_record_history" ON public.student_academic_record_history;
CREATE POLICY "Staff manage student_academic_record_history" ON public.student_academic_record_history
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'INSTRUCTOR'))
  );

DROP POLICY IF EXISTS "Public read course_batch_assistants" ON public.course_batch_assistants;
DROP POLICY IF EXISTS "Staff manage course_batch_assistants" ON public.course_batch_assistants;
CREATE POLICY "Staff manage course_batch_assistants" ON public.course_batch_assistants
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
  );

DROP POLICY IF EXISTS "Public read departments" ON public.departments;
DROP POLICY IF EXISTS "Staff manage departments" ON public.departments;
CREATE POLICY "Public read departments" ON public.departments
  FOR SELECT TO authenticated USING (is_active = TRUE);
CREATE POLICY "Staff manage departments" ON public.departments
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN'))
  );

GRANT SELECT ON public.invoice_edit_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.home_care_deliveries TO authenticated;
GRANT SELECT ON public.student_academic_record_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_batch_assistants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
