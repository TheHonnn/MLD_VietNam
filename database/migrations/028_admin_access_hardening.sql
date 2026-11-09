-- Run after 027. Keep the background auto-release job on service_role only.
DO $$ BEGIN
  IF to_regprocedure('public.fn_release_completed_bookings(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.fn_release_completed_bookings(UUID) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.fn_release_completed_bookings(UUID) TO service_role;
  END IF;
  IF to_regprocedure('public.fn_edit_invoice_receipt(uuid,text,text,text,text)') IS NOT NULL THEN
    -- The older editor lacks a branch check; the complete editor below replaces it.
    REVOKE ALL ON FUNCTION public.fn_edit_invoice_receipt(UUID, TEXT, TEXT, TEXT, TEXT)
      FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.fn_sync_invoices_and_revenue()') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.fn_sync_invoices_and_revenue()
      FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.fn_sync_invoices_and_revenue() TO service_role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_is_super()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_active = TRUE AND role::text IN ('ADMIN', 'SUPER_ADMIN'));
$$;
REVOKE ALL ON FUNCTION public.admin_is_super() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_is_super() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_can_access_branch(p_branch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.is_active = TRUE
      AND (
        u.role::text IN ('ADMIN', 'SUPER_ADMIN')
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = u.id AND ur.branch_id = p_branch_id
        )
        OR EXISTS (
          SELECT 1 FROM public.staff_profiles sp
          WHERE sp.user_id = u.id AND sp.branch_id = p_branch_id
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.admin_can_access_branch(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_can_access_branch(UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_can_access_journal(p_booking_id UUID, p_package_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.admin_is_super()
    OR EXISTS (SELECT 1 FROM public.bookings b
      WHERE b.id = p_booking_id AND public.admin_can_access_branch(b.branch_id))
    OR EXISTS (SELECT 1 FROM public.invoices i
      WHERE i.user_package_id = p_package_id AND public.admin_can_access_branch(i.branch_id));
$$;
REVOKE ALL ON FUNCTION public.admin_can_access_journal(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_can_access_journal(UUID, UUID) TO authenticated, service_role;

ALTER TABLE public.treatment_journal ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='treatment_journal' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.treatment_journal', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Admin scoped treatment journal" ON public.treatment_journal
FOR ALL TO authenticated
USING (public.admin_can_access_journal(booking_id, user_package_id))
WITH CHECK (public.admin_can_access_journal(booking_id, user_package_id));
CREATE POLICY "Customer reads own treatment journal" ON public.treatment_journal
FOR SELECT TO authenticated USING (customer_id = auth.uid());

ALTER TABLE public.inventory_consumption_logs ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='inventory_consumption_logs' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.inventory_consumption_logs', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Admin scoped inventory consumption" ON public.inventory_consumption_logs
FOR ALL TO authenticated
USING (public.admin_can_access_branch(branch_id))
WITH CHECK (public.admin_can_access_branch(branch_id));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_roles' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Admin read own roles" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.admin_is_super());
CREATE POLICY "Admin manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.admin_is_super()) WITH CHECK (public.admin_is_super());

-- Migration 014 granted anonymous access and left permissive finance policies in
-- place. Replace every legacy policy so permissive policies cannot OR around the
-- branch checks below. The receipt editor RPCs remain SECURITY DEFINER.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.invoices, public.invoice_items,
  public.tuition_transactions FROM anon;
-- POS and tuition creation uses the validated backend transaction. No browser account may
-- mint a paid invoice, invoice item, or tuition transaction directly.
REVOKE INSERT, UPDATE, DELETE ON public.invoices, public.invoice_items,
  public.tuition_transactions FROM authenticated;
GRANT SELECT ON public.invoices, public.invoice_items,
  public.tuition_transactions TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_can_collect_finance(p_branch_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.admin_can_access_branch(p_branch_id) AND EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_active = TRUE
      AND u.role::text IN ('ADMIN', 'SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER')
  );
$$;
REVOKE ALL ON FUNCTION public.admin_can_collect_finance(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_can_collect_finance(UUID) TO authenticated, service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invoices' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoices', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Invoice owner or branch reads" ON public.invoices
FOR SELECT TO authenticated
USING (customer_id = auth.uid() OR public.admin_can_access_branch(branch_id));
CREATE POLICY "No direct invoice updates" ON public.invoices
AS RESTRICTIVE FOR UPDATE TO authenticated USING (FALSE) WITH CHECK (FALSE);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='invoice_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.invoice_items', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Invoice owner or branch reads items" ON public.invoice_items
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id
    AND (i.customer_id = auth.uid() OR public.admin_can_access_branch(i.branch_id)))
);
CREATE POLICY "No direct invoice item updates" ON public.invoice_items
AS RESTRICTIVE FOR UPDATE TO authenticated USING (FALSE) WITH CHECK (FALSE);

ALTER TABLE public.tuition_transactions ENABLE ROW LEVEL SECURITY;
DO $$ DECLARE p RECORD; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='tuition_transactions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tuition_transactions', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "Student or branch reads tuition" ON public.tuition_transactions
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.admin_can_access_branch(branch_id));
CREATE POLICY "No direct tuition writes" ON public.tuition_transactions
AS RESTRICTIVE FOR ALL TO authenticated USING (FALSE) WITH CHECK (FALSE);

-- Preserve the original delivery/notification transaction, but put a scoped
-- gate in front of it. The renamed implementation is never callable by API roles.
DO $$ BEGIN
  IF to_regprocedure('public.fn_send_home_care_guideline_unscoped(uuid,uuid,uuid,uuid,uuid)') IS NULL
     AND to_regprocedure('public.fn_send_home_care_guideline(uuid,uuid,uuid,uuid,uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.fn_send_home_care_guideline(UUID, UUID, UUID, UUID, UUID)
      RENAME TO fn_send_home_care_guideline_unscoped;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.fn_send_home_care_guideline_unscoped(UUID, UUID, UUID, UUID, UUID)
  FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.fn_send_home_care_guideline(
  p_customer_id UUID, p_guideline_id UUID, p_booking_id UUID DEFAULT NULL,
  p_treatment_journal_id UUID DEFAULT NULL, p_request_key UUID DEFAULT gen_random_uuid()
) RETURNS public.home_care_deliveries
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Cần đăng nhập để gửi hướng dẫn.' USING ERRCODE = '42501';
  END IF;
  IF NOT public.admin_is_super() THEN
    IF p_booking_id IS NULL AND p_treatment_journal_id IS NULL THEN
      RAISE EXCEPTION 'Nhân viên cần chọn lịch hẹn hoặc buổi trị liệu thuộc chi nhánh.' USING ERRCODE = '42501';
    END IF;
    IF p_booking_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.bookings b WHERE b.id=p_booking_id AND b.customer_id=p_customer_id
        AND public.admin_can_access_branch(b.branch_id)
    ) THEN
      RAISE EXCEPTION 'Lịch hẹn không thuộc chi nhánh được phân quyền.' USING ERRCODE = '42501';
    END IF;
    IF p_treatment_journal_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.treatment_journal j WHERE j.id=p_treatment_journal_id
        AND j.customer_id=p_customer_id
        AND public.admin_can_access_journal(j.booking_id,j.user_package_id)
    ) THEN
      RAISE EXCEPTION 'Buổi trị liệu không thuộc chi nhánh được phân quyền.' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN public.fn_send_home_care_guideline_unscoped(
    p_customer_id,p_guideline_id,p_booking_id,p_treatment_journal_id,p_request_key
  );
END;
$$;
REVOKE ALL ON FUNCTION public.fn_send_home_care_guideline(UUID, UUID, UUID, UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fn_send_home_care_guideline(UUID, UUID, UUID, UUID, UUID)
  TO authenticated;

-- Recreate privileged receipt editors with a branch check before every update.
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
  IF NOT public.admin_can_access_branch(v_invoice.branch_id) THEN
    RAISE EXCEPTION 'Không có quyền sửa biên lai ở chi nhánh này.' USING ERRCODE = '42501';
  END IF;
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
  IF NOT public.admin_can_access_branch(v_invoice.branch_id) THEN
    RAISE EXCEPTION 'Không có quyền sửa biên lai ở chi nhánh này.' USING ERRCODE = '42501';
  END IF;
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

