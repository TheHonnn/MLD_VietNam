ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS student_code VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_code
  ON public.users(student_code)
  WHERE student_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fn_promote_student_on_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.student_code IS NOT NULL THEN
    NEW.student_code := NULLIF(TRIM(NEW.student_code), '');
  END IF;
  IF NEW.student_code IS NOT NULL AND NEW.role = 'CUSTOMER' THEN
    NEW.role := 'STUDENT';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_promote_student_on_code ON public.users;
CREATE TRIGGER trg_promote_student_on_code
BEFORE INSERT OR UPDATE OF student_code ON public.users
FOR EACH ROW EXECUTE FUNCTION public.fn_promote_student_on_code();

ALTER TABLE public.home_products
  ADD COLUMN IF NOT EXISTS treatment_package_group VARCHAR(100);

UPDATE public.home_products
SET treatment_package_group = CASE
  WHEN LOWER(category) LIKE '%băng ép%'
    OR LOWER(category) LIKE '%tất vớ%'
    OR LOWER(category) LIKE '%áp lực%' THEN 'Chăm sóc mở rộng'
  WHEN LOWER(category) LIKE '%dụng cụ%'
    OR LOWER(category) LIKE '%tài liệu%' THEN 'Chăm sóc toàn diện'
  ELSE 'Chăm sóc khu trú'
END
WHERE treatment_package_group IS NULL OR TRIM(treatment_package_group) = '';
