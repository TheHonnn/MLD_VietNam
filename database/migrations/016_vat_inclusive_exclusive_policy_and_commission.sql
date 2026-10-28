-- ============================================================================
-- MIGRATION 016: CHÍNH SÁCH THUẾ GTGT (OPTION B: GIÁ CHƯA GỒM VAT, CỘNG THÊM 8%)
-- VÀ TÍNH HOA HỒNG NHÂN SỰ TRÊN GIÁ TRỊ DỊCH VỤ TRƯỚC THUẾ (PRE-TAX BASE AMOUNT)
-- Project: MLD Việt Nam
-- ============================================================================

-- 1. CẬP NHẬT FUNCTION ĐỒNG BỘ HOA HỒNG DỰA TRÊN GIÁ TRƯỚC THUẾ (PRE-TAX BASE AMOUNT)
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
  v_base_amount NUMERIC;
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
      inv.subtotal,
      inv.pre_tax_amount,
      inv.vat_rate,
      inv.vat_amount,
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

    -- Tính hoa hồng trên giá trị dịch vụ trước thuế (không tính hoa hồng trên tiền thuế VAT của nhà nước)
    v_base_amount := COALESCE(NULLIF(r_inv.pre_tax_amount, 0), NULLIF(r_inv.subtotal, 0), r_inv.total_amount);

    IF r_inv.enrollment_id IS NOT NULL THEN
      -- Hoa hồng tuyển sinh / đào tạo khóa học: 5%
      v_comm_rate := 5.00;
      v_comm_amt := ROUND(v_base_amount * (v_comm_rate / 100.0), 0);
      v_comm_type := 'PACKAGE_UPSELL';
      v_staff_id := COALESCE(r_inv.instructor_user_id, v_default_staff_id);
      v_notes := 'Hoa hồng tuyển sinh 5% theo hóa đơn ' || r_inv.invoice_code;
    ELSE
      -- Hoa hồng trị liệu Spa trực tiếp: 10% trên giá dịch vụ thuần trước thuế
      v_comm_rate := 10.00;
      v_comm_amt := ROUND(v_base_amount * (v_comm_rate / 100.0), 0);
      v_comm_type := 'SERVICE_DIRECT';
      v_staff_id := COALESCE(r_inv.technician_id, v_default_staff_id);
      v_notes := 'Hoa hồng ca trị liệu 10% theo hóa đơn ' || r_inv.invoice_code || ' (Giá thuần: ' || to_char(v_base_amount, 'FM999G999G999') || 'đ)';
    END IF;

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
        v_base_amount,
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
