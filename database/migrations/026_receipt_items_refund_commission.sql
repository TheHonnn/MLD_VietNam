ALTER TABLE public.invoice_edit_history
  ADD COLUMN IF NOT EXISTS invoice_item_id UUID REFERENCES public.invoice_items(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.fn_edit_invoice_item_receipt(
  p_invoice_id UUID,
  p_item_id UUID,
  p_item_name TEXT,
  p_reason TEXT
) RETURNS public.invoice_items
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_role TEXT;
  v_invoice public.invoices%ROWTYPE;
  v_item public.invoice_items%ROWTYPE;
  v_before_name TEXT;
BEGIN
  IF v_actor IS NULL OR length(trim(COALESCE(p_reason, ''))) < 3
     OR length(trim(COALESCE(p_item_name, ''))) < 1
     OR length(p_item_name) > 250 THEN
    RAISE EXCEPTION 'Tên hàng/dịch vụ hoặc lý do sửa không hợp lệ.' USING ERRCODE = '22023';
  END IF;

  SELECT role::TEXT INTO v_role FROM public.users WHERE id = v_actor AND is_active = TRUE;
  IF COALESCE(v_role, '') NOT IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER') THEN
    RAISE EXCEPTION 'Không có quyền sửa biên lai.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_invoice FROM public.invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy biên lai.' USING ERRCODE = 'P0002'; END IF;
  IF v_invoice.shift_id IS NOT NULL AND v_role NOT IN ('ADMIN', 'SUPER_ADMIN')
     AND EXISTS (SELECT 1 FROM public.cashier_shifts WHERE id = v_invoice.shift_id AND closed_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Ca đã chốt. Chỉ quản trị viên được sửa mô tả biên lai.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item FROM public.invoice_items WHERE id = p_item_id AND invoice_id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Dòng hàng không thuộc biên lai.' USING ERRCODE = '22023'; END IF;
  v_before_name := v_item.item_name;

  UPDATE public.invoice_items SET item_name = trim(p_item_name)
  WHERE id = p_item_id RETURNING * INTO v_item;
  INSERT INTO public.invoice_edit_history(invoice_id, invoice_item_id, actor_id, reason, before_data, after_data)
  VALUES (
    p_invoice_id, p_item_id, v_actor, trim(p_reason),
    jsonb_build_object('item_name', v_before_name),
    jsonb_build_object('item_name', v_item.item_name)
  );
  RETURN v_item;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_edit_invoice_item_receipt(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_edit_invoice_item_receipt(UUID, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_edit_invoice_receipt_complete(
  p_invoice_id UUID,
  p_customer_name TEXT,
  p_description TEXT,
  p_notes TEXT,
  p_reason TEXT,
  p_items JSONB DEFAULT '[]'::jsonb
) RETURNS public.invoices
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_invoice public.invoices%ROWTYPE;
  v_role TEXT;
  v_shift_closed BOOLEAN := FALSE;
  v_before JSONB;
  v_after JSONB;
  v_item JSONB;
  v_item_id UUID;
  v_item_name TEXT;
  v_old_name TEXT;
BEGIN
  IF v_actor IS NULL OR length(trim(COALESCE(p_reason, ''))) < 3
     OR jsonb_typeof(COALESCE(p_items, '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'Cần đăng nhập, nhập lý do sửa và gửi danh sách dòng hàng hợp lệ.' USING ERRCODE = '22023';
  END IF;

  SELECT role::TEXT INTO v_role FROM public.users WHERE id=v_actor AND is_active=TRUE;
  IF COALESCE(v_role,'') NOT IN ('ADMIN','SUPER_ADMIN','BRANCH_MANAGER','CASHIER') THEN
    RAISE EXCEPTION 'Không có quyền sửa biên lai.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_invoice FROM public.invoices WHERE id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy biên lai.' USING ERRCODE = 'P0002'; END IF;
  IF v_invoice.shift_id IS NOT NULL THEN
    SELECT closed_at IS NOT NULL INTO v_shift_closed FROM public.cashier_shifts WHERE id=v_invoice.shift_id;
  END IF;
  IF v_shift_closed AND v_role NOT IN ('ADMIN','SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Ca đã chốt. Chỉ quản trị viên được sửa mô tả biên lai.' USING ERRCODE = '42501';
  END IF;

  v_before := jsonb_build_object('receipt_customer_name',v_invoice.receipt_customer_name,
    'receipt_description',v_invoice.receipt_description,'receipt_notes',v_invoice.receipt_notes);
  v_after := jsonb_build_object('receipt_customer_name',NULLIF(trim(p_customer_name),''),
    'receipt_description',NULLIF(trim(p_description),''),'receipt_notes',NULLIF(trim(p_notes),''));
  UPDATE public.invoices SET receipt_customer_name=v_after->>'receipt_customer_name',
    receipt_description=v_after->>'receipt_description',receipt_notes=v_after->>'receipt_notes'
    WHERE id=p_invoice_id RETURNING * INTO v_invoice;
  INSERT INTO public.invoice_edit_history(invoice_id,actor_id,reason,before_data,after_data)
    VALUES(p_invoice_id,v_actor,trim(p_reason),v_before,v_after);

  FOR v_item IN SELECT value FROM jsonb_array_elements(COALESCE(p_items,'[]'::jsonb)) LOOP
    IF jsonb_typeof(v_item) <> 'object' OR v_item->>'id' IS NULL
       OR length(trim(COALESCE(v_item->>'itemName',''))) NOT BETWEEN 1 AND 250 THEN
      RAISE EXCEPTION 'Thông tin dòng hàng không hợp lệ.' USING ERRCODE = '22023';
    END IF;
    v_item_id := (v_item->>'id')::uuid;
    v_item_name := trim(v_item->>'itemName');
    SELECT item_name INTO v_old_name FROM public.invoice_items WHERE id=v_item_id AND invoice_id=p_invoice_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Dòng hàng không thuộc biên lai.' USING ERRCODE = '22023'; END IF;
    IF v_old_name IS DISTINCT FROM v_item_name THEN
      UPDATE public.invoice_items SET item_name=v_item_name WHERE id=v_item_id;
      INSERT INTO public.invoice_edit_history(invoice_id,invoice_item_id,actor_id,reason,before_data,after_data)
      VALUES(p_invoice_id,v_item_id,v_actor,trim(p_reason),jsonb_build_object('item_name',v_old_name),jsonb_build_object('item_name',v_item_name));
    END IF;
  END LOOP;
  RETURN v_invoice;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_edit_invoice_receipt_complete(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_edit_invoice_receipt_complete(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

CREATE OR REPLACE FUNCTION public.fn_reverse_invoice_commissions_on_refund()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_commission public.staff_commissions%ROWTYPE;
BEGIN
  IF OLD.payment_status IS DISTINCT FROM 'REFUNDED'
     AND NEW.payment_status = 'REFUNDED'
     AND COALESCE(NEW.refund_amount, 0) >= NEW.total_amount THEN
    FOR v_commission IN
      SELECT sc.* FROM public.staff_commissions sc
      WHERE sc.reversal_of_id IS NULL
        AND (sc.invoice_id = NEW.id OR (NEW.booking_id IS NOT NULL AND sc.booking_id = NEW.booking_id))
        AND sc.commission_amount > 0
        AND NOT EXISTS (SELECT 1 FROM public.staff_commissions rev WHERE rev.reversal_of_id = sc.id)
      FOR UPDATE
    LOOP
      INSERT INTO public.staff_commissions(
        staff_id, branch_id, booking_id, invoice_id, commission_type, base_amount,
        percentage, commission_amount, status, cycle_month, notes, reversal_of_id,
        reversed_at, source_session_status, treatment_journal_id
      ) VALUES (
        v_commission.staff_id, v_commission.branch_id, v_commission.booking_id, NEW.id,
        v_commission.commission_type, -v_commission.base_amount, v_commission.percentage,
        -v_commission.commission_amount, 'PENDING', to_char(CURRENT_DATE, 'YYYY-MM'),
        'Điều chỉnh đảo do hoàn tiền hóa đơn ' || NEW.invoice_code, v_commission.id,
        CURRENT_TIMESTAMP, 'REFUNDED', v_commission.treatment_journal_id
      ) ON CONFLICT (reversal_of_id) WHERE reversal_of_id IS NOT NULL DO NOTHING;

      UPDATE public.staff_commissions SET reversed_at = CURRENT_TIMESTAMP, source_session_status = 'REFUNDED'
      WHERE id = v_commission.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_invoice_commissions_on_refund ON public.invoices;
CREATE TRIGGER trg_reverse_invoice_commissions_on_refund
AFTER UPDATE OF payment_status, refund_amount ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_reverse_invoice_commissions_on_refund();
