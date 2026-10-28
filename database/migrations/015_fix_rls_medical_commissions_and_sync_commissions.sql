-- ============================================================================
-- MIGRATION 015: TOÀN DIỆN HÓA RLS & ĐỒNG BỘ HOA HỒNG KTV / HỒ SƠ Y KHOA
-- Project: MLD Việt Nam
-- ============================================================================

-- 1. CẤP QUYỀN TRUY VẤN VÀ THAO TÁC CHO CÁC BẢNG Y KHOA, HOA HỒNG & MINIAPP
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.edema_assessments TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_commissions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.treatment_journal TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.inventory_consumption_logs TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.zalo_identities TO anon, authenticated;

-- Cấp quyền cho tất cả các bảng miniapp
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'miniapp_%'
    LOOP
        EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.%I TO anon, authenticated;', t);
    END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 2. CẤU HÌNH RLS POLICIES CHO edema_assessments (HỒ SƠ KHÁM PHÙ NỀ)
ALTER TABLE public.edema_assessments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read edema_assessments" ON public.edema_assessments;
DROP POLICY IF EXISTS "Authenticated read edema_assessments" ON public.edema_assessments;
DROP POLICY IF EXISTS "Staff manage edema_assessments" ON public.edema_assessments;

CREATE POLICY "Public read edema_assessments"
ON public.edema_assessments FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage edema_assessments"
ON public.edema_assessments FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. CẤU HÌNH RLS POLICIES CHO staff_commissions (HOA HỒNG KTV & NHÂN SỰ)
ALTER TABLE public.staff_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read staff_commissions" ON public.staff_commissions;
DROP POLICY IF EXISTS "Authenticated read staff_commissions" ON public.staff_commissions;
DROP POLICY IF EXISTS "Staff read/write commissions" ON public.staff_commissions;
DROP POLICY IF EXISTS "Staff manage staff_commissions" ON public.staff_commissions;

CREATE POLICY "Public read staff_commissions"
ON public.staff_commissions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage staff_commissions"
ON public.staff_commissions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. CẤU HÌNH RLS POLICIES CHO treatment_journal (NHẬT KÝ ĐIỀU TRỊ LÂM SÀNG)
ALTER TABLE public.treatment_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read treatment_journal" ON public.treatment_journal;
DROP POLICY IF EXISTS "Authenticated read treatment_journal" ON public.treatment_journal;
DROP POLICY IF EXISTS "Treatment journal visibility" ON public.treatment_journal;
DROP POLICY IF EXISTS "Technicians can write treatment journal" ON public.treatment_journal;
DROP POLICY IF EXISTS "Staff manage treatment_journal" ON public.treatment_journal;

CREATE POLICY "Public read treatment_journal"
ON public.treatment_journal FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage treatment_journal"
ON public.treatment_journal FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. CẤU HÌNH RLS POLICIES CHO inventory_consumption_logs (TIÊU HAO VẬT TƯ BOM)
ALTER TABLE public.inventory_consumption_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read inventory_consumption_logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Authenticated read inventory_consumption_logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Staff read/write consumption_logs" ON public.inventory_consumption_logs;
DROP POLICY IF EXISTS "Staff manage inventory_consumption_logs" ON public.inventory_consumption_logs;

CREATE POLICY "Public read inventory_consumption_logs"
ON public.inventory_consumption_logs FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage inventory_consumption_logs"
ON public.inventory_consumption_logs FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. CẤU HÌNH RLS POLICIES CHO zalo_identities & miniapp_%
ALTER TABLE public.zalo_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read zalo_identities" ON public.zalo_identities;
DROP POLICY IF EXISTS "Staff manage zalo_identities" ON public.zalo_identities;

CREATE POLICY "Public read zalo_identities"
ON public.zalo_identities FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage zalo_identities"
ON public.zalo_identities FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name LIKE 'miniapp_%'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Public read ' || t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', 'Staff manage ' || t, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true);', 'Public read ' || t, t);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);', 'Staff manage ' || t, t);
    END LOOP;
END $$;

-- 6.5 ĐỒNG BỘ TÀI KHOẢN GIẢNG VIÊN VÀO BẢNG USERS ĐẢM BẢO TOÀN VẸN RÀNG BUỘC FK
INSERT INTO public.users (
  id,
  full_name,
  phone,
  email,
  role,
  avatar_url,
  referral_code,
  is_active
) VALUES (
  '2af0c0f3-b9fa-4867-8613-0c383f540614',
  'ThS.BS Lâm Xuân Trường',
  '0988776655',
  'truong.mld@academy.vn',
  'INSTRUCTOR',
  'https://wstvwushpwcdsmhpunvh.supabase.co/storage/v1/object/public/avatars/instructor_1793035540524_azky4.jpg',
  'REF_TRUONG_MLD_01',
  true
) ON CONFLICT (id) DO UPDATE SET role = 'INSTRUCTOR';

UPDATE public.instructors 
SET user_id = '2af0c0f3-b9fa-4867-8613-0c383f540614' 
WHERE id = '2af0c0f3-b9fa-4867-8613-0c383f540614';

-- 7. FUNCTION ĐỒNG BỘ HOA HỒNG TỰ ĐỘNG CHO GIẢNG VIÊN VÀ KTV (COMMISSION AUTO-SYNC)
CREATE OR REPLACE FUNCTION public.fn_sync_staff_commissions()
RETURNS TABLE (
  synced_commissions_count INT,
  total_commission_amount NUMERIC
) AS $$
DECLARE
  v_count INT := 0;
  v_total NUMERIC := 0;
  v_default_staff_id UUID;
  r_inv RECORD;
  v_comm_rate NUMERIC;
  v_comm_amt NUMERIC;
  v_staff_id UUID;
  v_comm_type VARCHAR(50);
  v_cycle_month VARCHAR(7);
  v_notes TEXT;
BEGIN
  -- Lấy 1 nhân sự phụ trách làm mặc định nếu không có người chỉ định cụ thể
  SELECT id INTO v_default_staff_id 
  FROM public.users 
  WHERE role::text IN ('INSTRUCTOR', 'TECHNICIAN', 'ADMIN', 'SUPER_ADMIN') 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- Nếu không có nhân sự nào, lấy bất kỳ user
  IF v_default_staff_id IS NULL THEN
    SELECT id INTO v_default_staff_id FROM public.users LIMIT 1;
  END IF;

  -- Quét các hóa đơn đã thanh toán nhưng chưa có hoa hồng
  FOR r_inv IN
    SELECT 
      inv.id as invoice_id,
      inv.branch_id,
      inv.booking_id,
      inv.enrollment_id,
      inv.total_amount,
      inv.paid_at,
      inv.invoice_code,
      ce.batch_id,
      COALESCE(ins.user_id, cb.instructor_id) as instructor_user_id,
      b.technician_id
    FROM public.invoices inv
    LEFT JOIN public.course_enrollments ce ON inv.enrollment_id = ce.id
    LEFT JOIN public.course_batches cb ON ce.batch_id = cb.id
    LEFT JOIN public.instructors ins ON cb.instructor_id = ins.id
    LEFT JOIN public.bookings b ON inv.booking_id = b.id
    WHERE inv.payment_status = 'PAID'
      AND inv.total_amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_commissions sc WHERE sc.invoice_id = inv.id
      )
  LOOP
    v_cycle_month := to_char(COALESCE(r_inv.paid_at, NOW()), 'YYYY-MM');

    IF r_inv.enrollment_id IS NOT NULL THEN
      -- Hoa hồng tuyển sinh / đào tạo khóa học: 5%
      v_comm_rate := 5.00;
      v_comm_amt := ROUND(r_inv.total_amount * (v_comm_rate / 100.0), 0);
      v_comm_type := 'PACKAGE_UPSELL';
      v_staff_id := COALESCE(r_inv.instructor_user_id, v_default_staff_id);
      v_notes := 'Hoa hồng tuyển sinh 5% theo hóa đơn ' || r_inv.invoice_code;
    ELSE
      -- Hoa hồng trị liệu Spa trực tiếp: 10%
      v_comm_rate := 10.00;
      v_comm_amt := ROUND(r_inv.total_amount * (v_comm_rate / 100.0), 0);
      v_comm_type := 'SERVICE_DIRECT';
      v_staff_id := COALESCE(r_inv.technician_id, v_default_staff_id);
      v_notes := 'Hoa hồng ca trị liệu 10% theo hóa đơn ' || r_inv.invoice_code;
    END IF;

    -- Đảm bảo staff_id luôn tồn tại trong users để thỏa mãn FK constraint
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_staff_id) THEN
      v_staff_id := v_default_staff_id;
    END IF;

    IF v_staff_id IS NOT NULL AND v_comm_amt > 0 THEN
      INSERT INTO public.staff_commissions (
        staff_id,
        branch_id,
        booking_id,
        invoice_id,
        commission_type,
        base_amount,
        percentage,
        commission_amount,
        status,
        cycle_month,
        notes,
        created_at
      ) VALUES (
        v_staff_id,
        r_inv.branch_id,
        r_inv.booking_id,
        r_inv.invoice_id,
        v_comm_type,
        r_inv.total_amount,
        v_comm_rate,
        v_comm_amt,
        'APPROVED',
        v_cycle_month,
        v_notes,
        COALESCE(r_inv.paid_at, NOW())
      );

      v_count := v_count + 1;
      v_total := v_total + v_comm_amt;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_count, v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. TỰ ĐỘNG KÍCH HOẠT ĐỒNG BỘ HOA HỒNG KHI CÓ HÓA ĐƠN MỚI
CREATE OR REPLACE FUNCTION public.fn_trg_sync_invoice_commissions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS DISTINCT FROM 'PAID' OR TG_OP = 'INSERT') THEN
    PERFORM public.fn_sync_staff_commissions();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_invoice_commissions ON public.invoices;
CREATE TRIGGER trg_sync_invoice_commissions
AFTER INSERT OR UPDATE OF payment_status ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_sync_invoice_commissions();

-- 9. THỰC THI ĐỒNG BỘ NGAY LẬP TỨC CHO CÁC HÓA ĐƠN HIỆN HÀNH
SELECT * FROM public.fn_sync_staff_commissions();
