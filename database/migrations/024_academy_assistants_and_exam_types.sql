ALTER TABLE course_batches
  ADD COLUMN IF NOT EXISTS assistant_instructor_id UUID REFERENCES instructors(id) ON DELETE SET NULL;

ALTER TABLE course_quizzes
  ADD COLUMN IF NOT EXISTS exam_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'course_quizzes_exam_type_check'
      AND conrelid = 'public.course_quizzes'::regclass
  ) THEN
    ALTER TABLE public.course_quizzes
      ADD CONSTRAINT course_quizzes_exam_type_check
      CHECK (exam_type IN ('ENTRY', 'EXIT', 'REGULAR'));
  END IF;
END $$;

ALTER TABLE public.student_academic_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.student_academic_records FROM anon;
DROP POLICY IF EXISTS "Public read student_academic_records" ON public.student_academic_records;
DROP POLICY IF EXISTS "Staff manage student_academic_records" ON public.student_academic_records;
DROP POLICY IF EXISTS "Students read own academic records" ON public.student_academic_records;
DROP POLICY IF EXISTS "Staff manage academic records" ON public.student_academic_records;

CREATE POLICY "Students read own academic records"
ON public.student_academic_records FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.course_enrollments enrollment
    WHERE enrollment.id = student_academic_records.enrollment_id
      AND enrollment.student_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.users user_account
    WHERE user_account.id = auth.uid()
      AND user_account.is_active = TRUE
      AND user_account.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR')
  )
);

CREATE POLICY "Staff manage academic records"
ON public.student_academic_records FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users user_account
    WHERE user_account.id = auth.uid()
      AND user_account.is_active = TRUE
      AND user_account.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users user_account
    WHERE user_account.id = auth.uid()
      AND user_account.is_active = TRUE
      AND user_account.role::TEXT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'RECEPTIONIST', 'TECHNICIAN', 'INSTRUCTOR')
  )
);

COMMENT ON COLUMN course_batches.assistant_instructor_id IS 'Giảng viên/trợ giảng hỗ trợ lớp';
COMMENT ON COLUMN course_quizzes.exam_type IS 'Phân loại đề thi: ENTRY đầu vào, EXIT đầu ra, REGULAR thường kỳ';
