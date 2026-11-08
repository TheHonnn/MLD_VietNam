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
  ADD COLUMN IF NOT EXISTS image_url TEXT,
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

CREATE OR REPLACE FUNCTION public.fn_send_home_care_guideline(
  p_customer_id UUID,
  p_guideline_id UUID,
  p_booking_id UUID DEFAULT NULL,
  p_treatment_journal_id UUID DEFAULT NULL,
  p_request_key UUID DEFAULT gen_random_uuid()
) RETURNS public.home_care_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_guideline public.home_care_guidelines%ROWTYPE;
  v_delivery public.home_care_deliveries%ROWTYPE;
BEGIN
  SELECT role::TEXT INTO v_role FROM public.users
  WHERE id = v_actor AND is_active = TRUE;
  IF COALESCE(v_role, '') NOT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR') THEN
    RAISE EXCEPTION 'Không có quyền gửi hướng dẫn chăm sóc.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_guideline FROM public.home_care_guidelines
  WHERE id = p_guideline_id AND is_published = TRUE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hướng dẫn không tồn tại hoặc chưa được xuất bản.' USING ERRCODE = 'P0002';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_customer_id AND is_active
      AND role::TEXT IN ('CUSTOMER', 'STUDENT')) THEN
    RAISE EXCEPTION 'Khách hàng không hợp lệ.' USING ERRCODE = '22023';
  END IF;
  IF p_booking_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.bookings WHERE id=p_booking_id AND customer_id=p_customer_id
  ) THEN RAISE EXCEPTION 'Lịch hẹn không thuộc khách hàng.' USING ERRCODE = '22023'; END IF;
  IF p_treatment_journal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.treatment_journal WHERE id=p_treatment_journal_id AND customer_id=p_customer_id
  ) THEN RAISE EXCEPTION 'Buổi trị liệu không thuộc khách hàng.' USING ERRCODE = '22023'; END IF;

  INSERT INTO public.home_care_deliveries(
    customer_id, guideline_id, booking_id, treatment_journal_id,
    sent_by_id, channel, status, request_key, content_snapshot
  ) VALUES (
    p_customer_id, p_guideline_id, p_booking_id, p_treatment_journal_id,
    v_actor, 'IN_APP', 'SENT', p_request_key,
    jsonb_build_object('title', v_guideline.title, 'summary', v_guideline.summary,
      'content', v_guideline.content, 'steps', v_guideline.steps, 'media', v_guideline.media)
  ) ON CONFLICT (request_key) DO NOTHING
  RETURNING * INTO v_delivery;

  IF v_delivery.id IS NULL THEN
    SELECT * INTO v_delivery FROM public.home_care_deliveries WHERE request_key = p_request_key;
    RETURN v_delivery;
  END IF;

  INSERT INTO public.notifications(user_id, title, message, type, data)
  VALUES (
    p_customer_id,
    'Hướng dẫn chăm sóc sau trị liệu',
    v_guideline.title,
    'HOME_CARE_GUIDE',
    jsonb_build_object('guideline_id', p_guideline_id, 'delivery_id', v_delivery.id,
      'route', '/home-care-guidelines',
      'target', jsonb_build_object('screen', 'treatment', 'tab', 'care_guide', 'entityId', p_guideline_id))
  );
  RETURN v_delivery;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_send_home_care_guideline(UUID, UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_send_home_care_guideline(UUID, UUID, UUID, UUID, UUID) TO authenticated;

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
  ADD COLUMN IF NOT EXISTS source_session_status VARCHAR(30),
  ADD COLUMN IF NOT EXISTS treatment_journal_id UUID REFERENCES public.treatment_journal(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_commissions_treatment_session
  ON public.staff_commissions(treatment_journal_id, staff_id, commission_type)
  WHERE treatment_journal_id IS NOT NULL AND commission_type = 'TREATMENT_SESSION' AND reversal_of_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_commissions_reversal
  ON public.staff_commissions(reversal_of_id) WHERE reversal_of_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_record_treatment_session_commission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_staff_id UUID;
  v_technician_id UUID;
  v_staff_profile_id UUID;
  v_rate NUMERIC(5,2);
  v_branch_id UUID;
  v_base NUMERIC(14,2);
  v_original public.staff_commissions%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO v_original FROM public.staff_commissions
      WHERE treatment_journal_id = OLD.id AND commission_type = 'TREATMENT_SESSION' AND reversal_of_id IS NULL
      FOR UPDATE;
    IF FOUND THEN
      INSERT INTO public.staff_commissions(
        staff_id, branch_id, booking_id, commission_type, base_amount, percentage,
        commission_amount, status, cycle_month, notes, reversal_of_id, reversed_at,
        source_session_status, treatment_journal_id
      ) VALUES (
        v_original.staff_id, v_original.branch_id, v_original.booking_id, 'TREATMENT_SESSION',
        -v_original.base_amount, v_original.percentage, -v_original.commission_amount,
        'PENDING', to_char(CURRENT_DATE, 'YYYY-MM'),
        'Điều chỉnh đảo do buổi trị liệu bị xóa', v_original.id, CURRENT_TIMESTAMP,
        'REVERSED', OLD.id
      ) ON CONFLICT (reversal_of_id) WHERE reversal_of_id IS NOT NULL DO NOTHING;
      UPDATE public.staff_commissions SET reversed_at = CURRENT_TIMESTAMP, source_session_status = 'REVERSED'
        WHERE id = v_original.id;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND (OLD.technician_id IS DISTINCT FROM NEW.technician_id OR OLD.booking_id IS DISTINCT FROM NEW.booking_id) THEN
    IF EXISTS (SELECT 1 FROM public.staff_commissions WHERE treatment_journal_id = OLD.id AND commission_type = 'TREATMENT_SESSION' AND reversal_of_id IS NULL) THEN
      RAISE EXCEPTION 'Không thể đổi nhân viên hoặc lịch hẹn sau khi đã chốt hoa hồng buổi trị liệu.' USING ERRCODE = '23514';
    END IF;
  END IF;

  v_technician_id := NEW.technician_id;
  IF NEW.booking_id IS NOT NULL THEN
    SELECT COALESCE(v_technician_id, b.technician_id), b.branch_id
      INTO v_technician_id, v_branch_id FROM public.bookings b WHERE b.id=NEW.booking_id;
  END IF;
  IF v_technician_id IS NULL THEN RETURN NEW; END IF;
  SELECT t.user_id, t.staff_profile_id, t.branch_id
    INTO v_staff_id, v_staff_profile_id, v_branch_id
    FROM public.technicians t WHERE t.id = v_technician_id AND t.is_active;
  IF v_staff_id IS NULL AND v_staff_profile_id IS NOT NULL THEN
    SELECT sp.user_id INTO v_staff_id FROM public.staff_profiles sp WHERE sp.id = v_staff_profile_id;
  END IF;
  IF v_staff_id IS NULL THEN RETURN NEW; END IF;

  SELECT commission_rate INTO v_rate FROM public.staff_profiles
    WHERE (user_id = v_staff_id OR id = v_staff_profile_id) AND is_active;
  IF COALESCE(v_rate, 0) <= 0 THEN RETURN NEW; END IF;

  IF NEW.booking_id IS NOT NULL THEN
    SELECT b.branch_id,
      CASE WHEN COALESCE(SUM(all_items.price), 0) > 0
        THEN b.final_price * COALESCE(SUM(all_items.price) FILTER (WHERE all_items.technician_id = v_technician_id), 0) / SUM(all_items.price)
        ELSE 0 END
      INTO v_branch_id, v_base
      FROM public.bookings b
      LEFT JOIN public.booking_items all_items ON all_items.booking_id=b.id
      WHERE b.id=NEW.booking_id
      GROUP BY b.id, b.branch_id, b.final_price;
  ELSE
    v_base := 0;
  END IF;
  IF COALESCE(v_base, 0) <= 0 AND NEW.user_package_id IS NOT NULL THEN
    SELECT CASE WHEN up.total_sessions > 0 THEN COALESCE(tp.discount_price, tp.price) / up.total_sessions ELSE 0 END
      INTO v_base FROM public.user_packages up JOIN public.treatment_packages tp ON tp.id = up.package_id
      WHERE up.id = NEW.user_package_id;
  END IF;
  IF COALESCE(v_base, 0) <= 0 THEN RETURN NEW; END IF;

  INSERT INTO public.staff_commissions(
    staff_id, branch_id, booking_id, treatment_journal_id, commission_type,
    base_amount, percentage, commission_amount, status, cycle_month, notes, source_session_status
  ) VALUES (
    v_staff_id, v_branch_id, NEW.booking_id, NEW.id, 'TREATMENT_SESSION',
    v_base, v_rate, round(v_base * v_rate / 100), 'PENDING', to_char(CURRENT_DATE, 'YYYY-MM'),
    'Hoa hồng buổi trị liệu #' || NEW.session_number, 'COMPLETED'
  ) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_treatment_session_commission ON public.treatment_journal;
DROP TRIGGER IF EXISTS trg_treatment_session_commission_delete ON public.treatment_journal;
CREATE TRIGGER trg_treatment_session_commission
AFTER INSERT OR UPDATE OF technician_id, booking_id ON public.treatment_journal
FOR EACH ROW EXECUTE FUNCTION public.fn_record_treatment_session_commission();
CREATE TRIGGER trg_treatment_session_commission_delete
BEFORE DELETE ON public.treatment_journal
FOR EACH ROW EXECUTE FUNCTION public.fn_record_treatment_session_commission();

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
DROP POLICY IF EXISTS "Customers read own care deliveries" ON public.home_care_deliveries;
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

-- Reapply grade policies after adding assistant assignments: students see only
-- their own rows, and instructors see rows for classes they teach or assist.
DROP POLICY IF EXISTS "Students read own academic records" ON public.student_academic_records;
DROP POLICY IF EXISTS "Staff manage academic records" ON public.student_academic_records;
DROP POLICY IF EXISTS "Staff scoped grade access" ON public.student_academic_records;
DROP POLICY IF EXISTS "Staff scoped grade insert" ON public.student_academic_records;
DROP POLICY IF EXISTS "Staff scoped grade update" ON public.student_academic_records;
CREATE POLICY "Staff scoped grade access" ON public.student_academic_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
    OR EXISTS (SELECT 1 FROM public.course_enrollments e
      JOIN public.course_batches b ON b.id=e.batch_id
      JOIN public.instructors i ON i.id=b.instructor_id
      WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_enrollments e
      JOIN public.course_batch_assistants a ON a.batch_id=e.batch_id AND a.can_enter_grades
      JOIN public.instructors i ON i.id=a.instructor_id
      WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
  );
CREATE POLICY "Staff scoped grade insert" ON public.student_academic_records
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
    OR EXISTS (SELECT 1 FROM public.course_enrollments e
      JOIN public.course_batches b ON b.id=e.batch_id
      JOIN public.instructors i ON i.id=b.instructor_id
      WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_enrollments e
      JOIN public.course_batch_assistants a ON a.batch_id=e.batch_id AND a.can_enter_grades
      JOIN public.instructors i ON i.id=a.instructor_id
      WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
  );
CREATE POLICY "Staff scoped grade update" ON public.student_academic_records
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
    OR EXISTS (SELECT 1 FROM public.course_enrollments e JOIN public.course_batches b ON b.id=e.batch_id JOIN public.instructors i ON i.id=b.instructor_id WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_enrollments e JOIN public.course_batch_assistants a ON a.batch_id=e.batch_id AND a.can_enter_grades JOIN public.instructors i ON i.id=a.instructor_id WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
    OR EXISTS (SELECT 1 FROM public.course_enrollments e JOIN public.course_batches b ON b.id=e.batch_id JOIN public.instructors i ON i.id=b.instructor_id WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.course_enrollments e JOIN public.course_batch_assistants a ON a.batch_id=e.batch_id AND a.can_enter_grades JOIN public.instructors i ON i.id=a.instructor_id WHERE e.id=student_academic_records.enrollment_id AND i.user_id=auth.uid())
  );
CREATE POLICY "Students read own academic records"
  ON public.student_academic_records FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.course_enrollments e
    WHERE e.id=student_academic_records.enrollment_id AND e.student_id=auth.uid()));

DROP POLICY IF EXISTS "Public read course_batch_assistants" ON public.course_batch_assistants;
DROP POLICY IF EXISTS "Staff manage course_batch_assistants" ON public.course_batch_assistants;
DROP POLICY IF EXISTS "Assigned instructors read course assistants" ON public.course_batch_assistants;
CREATE POLICY "Staff manage course_batch_assistants" ON public.course_batch_assistants
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active
      AND u.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER'))
  );
CREATE POLICY "Assigned instructors read course assistants" ON public.course_batch_assistants
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.instructors i
      JOIN public.course_batches b ON b.instructor_id=i.id
      WHERE b.id=course_batch_assistants.batch_id AND i.user_id=auth.uid())
    OR EXISTS (SELECT 1 FROM public.instructors i
      WHERE i.id=course_batch_assistants.instructor_id AND i.user_id=auth.uid())
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

-- Receipt text is edited only through the audited RPC; payment operations use
-- their dedicated, validated backend workflow.
DROP POLICY IF EXISTS "No direct invoice updates" ON public.invoices;
CREATE POLICY "No direct invoice updates" ON public.invoices
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (FALSE) WITH CHECK (FALSE);
DROP POLICY IF EXISTS "No direct invoice item updates" ON public.invoice_items;
CREATE POLICY "No direct invoice item updates" ON public.invoice_items
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (FALSE) WITH CHECK (FALSE);
