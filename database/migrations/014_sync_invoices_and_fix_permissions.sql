-- ============================================================================
-- MIGRATION 014: PERMISSION FIX & AUTOMATED INVOICE REVENUE SYNCHRONIZATION
-- Project: MLD Việt Nam
-- ============================================================================

-- 1. CẤP QUYỀN TRUY VẤN VÀ THAO TÁC CHO ROLE ANON & AUTHENTICATED
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoice_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tuition_transactions TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 2. CẤU HÌNH LẠI CHÍNH SÁCH BẢO MẬT RLS (ROW-LEVEL SECURITY) CHO BẢNG INVOICES
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Authenticated read invoices" ON public.invoices;
DROP POLICY IF EXISTS "Staff manage invoices" ON public.invoices;

CREATE POLICY "Public read invoices"
ON public.invoices FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage invoices"
ON public.invoices FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. CẤU HÌNH LẠI CHÍNH SÁCH RLS CHO BẢNG INVOICE_ITEMS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Staff manage invoice_items" ON public.invoice_items;

CREATE POLICY "Public read invoice_items"
ON public.invoice_items FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage invoice_items"
ON public.invoice_items FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. CẤU HÌNH LẠI CHÍNH SÁCH RLS CHO BẢNG TUITION_TRANSACTIONS
ALTER TABLE public.tuition_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read tuition_transactions" ON public.tuition_transactions;
DROP POLICY IF EXISTS "Authenticated read tuition_transactions" ON public.tuition_transactions;
DROP POLICY IF EXISTS "Staff manage tuition_transactions" ON public.tuition_transactions;

CREATE POLICY "Public read tuition_transactions"
ON public.tuition_transactions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Staff manage tuition_transactions"
ON public.tuition_transactions FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. FUNCTION ĐỒNG BỘ DOANH THU & HÓA ĐƠN THỜI GIAN THỰC (TWO-WAY SYNC)
CREATE OR REPLACE FUNCTION public.fn_sync_invoices_and_revenue()
RETURNS TABLE (
  synced_enrollment_invoices INT,
  synced_booking_invoices INT,
  synced_tuition_transactions INT,
  total_synced_amount NUMERIC
) AS $$
DECLARE
  v_enr_count INT := 0;
  v_bk_count INT := 0;
  v_tt_count INT := 0;
  v_total_amt NUMERIC := 0;
  v_branch_id UUID := 'aaaaaaaa-0001-0001-0001-000000000001';
  r_enr RECORD;
  r_bk RECORD;
  v_inv_id UUID;
BEGIN
  -- 1. Đồng bộ học phí từ course_enrollments có payment_status = 'PAID' sang invoices
  FOR r_enr IN
    SELECT 
      ce.id as enrollment_id,
      ce.student_id,
      ce.course_id,
      ce.tuition_total,
      ce.amount_paid,
      ce.enrolled_at,
      ce.order_code,
      c.title as course_title,
      v_branch_id as branch_id
    FROM public.course_enrollments ce
    JOIN public.courses c ON ce.course_id = c.id
    WHERE ce.payment_status = 'PAID'
      AND ce.amount_paid > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.invoices inv WHERE inv.enrollment_id = ce.id
      )
  LOOP
    INSERT INTO public.invoices (
      invoice_code,
      branch_id,
      customer_id,
      enrollment_id,
      subtotal,
      discount_amount,
      points_redeemed_amount,
      vat_amount,
      total_amount,
      payment_method,
      payment_status,
      paid_at
    ) VALUES (
      'HD-HP-' || COALESCE(r_enr.order_code, to_char(COALESCE(r_enr.enrolled_at, NOW()), 'YYYYMM')) || '-' || SUBSTRING(r_enr.enrollment_id::TEXT FROM 1 FOR 6),
      v_branch_id,
      r_enr.student_id,
      r_enr.enrollment_id,
      r_enr.tuition_total,
      0,
      0,
      0,
      r_enr.amount_paid,
      'BANK_TRANSFER',
      'PAID',
      COALESCE(r_enr.enrolled_at, NOW())
    ) RETURNING id INTO v_inv_id;

    -- Tạo invoice_item tương ứng
    INSERT INTO public.invoice_items (
      invoice_id,
      item_type,
      item_name,
      quantity,
      unit_price,
      amount
    ) VALUES (
      v_inv_id,
      'COURSE',
      'Học phí: ' || r_enr.course_title,
      1,
      r_enr.amount_paid,
      r_enr.amount_paid
    );

    v_enr_count := v_enr_count + 1;
    v_total_amt := v_total_amt + r_enr.amount_paid;

    -- Đồng bộ sang tuition_transactions nếu chưa có
    IF NOT EXISTS (SELECT 1 FROM public.tuition_transactions WHERE enrollment_id = r_enr.enrollment_id) THEN
      INSERT INTO public.tuition_transactions (
        transaction_code,
        enrollment_id,
        student_id,
        course_id,
        branch_id,
        transaction_type,
        amount,
        payment_method,
        payment_status,
        receipt_number,
        notes,
        paid_at
      ) VALUES (
        'TT-' || COALESCE(r_enr.order_code, to_char(COALESCE(r_enr.enrolled_at, NOW()), 'YYYYMM')) || '-' || SUBSTRING(r_enr.enrollment_id::TEXT FROM 1 FOR 6),
        r_enr.enrollment_id,
        r_enr.student_id,
        r_enr.course_id,
        v_branch_id,
        'FULL_PAYMENT',
        r_enr.amount_paid,
        'BANK_TRANSFER',
        'PAID',
        'REC-' || COALESCE(r_enr.order_code, to_char(COALESCE(r_enr.enrolled_at, NOW()), 'YYYYMM')) || '-' || SUBSTRING(r_enr.enrollment_id::TEXT FROM 1 FOR 6),
        'Quyết toán học phí khóa học ' || r_enr.course_title,
        COALESCE(r_enr.enrolled_at, NOW())
      );
      v_tt_count := v_tt_count + 1;
    END IF;
  END LOOP;

  -- 2. Đồng bộ các lịch hẹn trị liệu bookings có payment_status = 'PAID' sang invoices
  FOR r_bk IN
    SELECT 
      b.id as booking_id,
      b.booking_code,
      b.branch_id,
      b.customer_id,
      b.base_total,
      b.final_price,
      b.payment_method,
      b.booking_date,
      b.start_time,
      COALESCE(
        (SELECT s.name FROM public.booking_items bi JOIN public.services s ON bi.service_id = s.id WHERE bi.booking_id = b.id LIMIT 1),
        'Dịch vụ Trị liệu Dẫn lưu MLD'
      ) as service_name
    FROM public.bookings b
    WHERE b.payment_status = 'PAID'
      AND b.final_price > 0
      AND NOT EXISTS (
        SELECT 1 FROM public.invoices inv WHERE inv.booking_id = b.id
      )
  LOOP
    INSERT INTO public.invoices (
      invoice_code,
      branch_id,
      customer_id,
      booking_id,
      subtotal,
      discount_amount,
      points_redeemed_amount,
      vat_amount,
      total_amount,
      payment_method,
      payment_status,
      paid_at
    ) VALUES (
      'HD-SPA-' || COALESCE(r_bk.booking_code, to_char(NOW(), 'YYYYMM')) || '-' || SUBSTRING(r_bk.booking_id::TEXT FROM 1 FOR 6),
      COALESCE(r_bk.branch_id, v_branch_id),
      r_bk.customer_id,
      r_bk.booking_id,
      COALESCE(r_bk.base_total, r_bk.final_price),
      0,
      0,
      0,
      r_bk.final_price,
      COALESCE(r_bk.payment_method, 'CASH_AT_SPA'),
      'PAID',
      (r_bk.booking_date || ' ' || COALESCE(r_bk.start_time, '09:00:00'))::TIMESTAMPTZ
    ) RETURNING id INTO v_inv_id;

    INSERT INTO public.invoice_items (
      invoice_id,
      item_type,
      item_name,
      quantity,
      unit_price,
      amount
    ) VALUES (
      v_inv_id,
      'SERVICE',
      r_bk.service_name,
      1,
      r_bk.final_price,
      r_bk.final_price
    );

    v_bk_count := v_bk_count + 1;
    v_total_amt := v_total_amt + r_bk.final_price;
  END LOOP;

  RETURN QUERY SELECT v_enr_count, v_bk_count, v_tt_count, v_total_amt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. TẠO TRIGGER TỰ ĐỘNG KÍCH HOẠT ĐỒNG BỘ
CREATE OR REPLACE FUNCTION public.fn_trg_sync_enrollment_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS DISTINCT FROM 'PAID' OR TG_OP = 'INSERT') THEN
    PERFORM public.fn_sync_invoices_and_revenue();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_enrollment_invoice ON public.course_enrollments;
CREATE TRIGGER trg_sync_enrollment_invoice
AFTER INSERT OR UPDATE OF payment_status ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_sync_enrollment_invoice();

CREATE OR REPLACE FUNCTION public.fn_trg_sync_booking_invoice()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'PAID' AND (OLD.payment_status IS DISTINCT FROM 'PAID' OR TG_OP = 'INSERT') THEN
    PERFORM public.fn_sync_invoices_and_revenue();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_booking_invoice ON public.bookings;
CREATE TRIGGER trg_sync_booking_invoice
AFTER INSERT OR UPDATE OF payment_status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_sync_booking_invoice();

-- 7. THỰC THI ĐỒNG BỘ NGAY LẬP TỨC CHO DỮ LIỆU HIỆN CÓ
SELECT * FROM public.fn_sync_invoices_and_revenue();
