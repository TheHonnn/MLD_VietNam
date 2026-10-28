-- ==============================================================================
-- MIGRATION 017: ENABLE REALTIME & AUTO-NOTIFY ADMIN ON APP BOOKINGS
-- Description:
-- 1. Enable Supabase Realtime publication for bookings, notifications, and invoices.
-- 2. Make notifications.user_id nullable to support broadcast/admin notifications.
-- 3. Create stored procedure & trigger fn_trg_notify_admin_on_booking to automatically
--    generate admin notifications whenever a customer books on the mobile app / miniapp.
-- 4. Ensure RLS policies allow reading broadcast & role-based notifications.
-- ==============================================================================

-- 1. Make user_id in notifications NULLABLE for system/admin broadcast
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
  -- Add bookings
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
  END IF;

  -- Add notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- Add invoices
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'invoices'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL for complete payload in realtime change events
ALTER TABLE public.bookings REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.invoices REPLICA IDENTITY FULL;

-- 3. Create Trigger Function to Auto-Notify Admin on New Booking
CREATE OR REPLACE FUNCTION public.fn_trg_notify_admin_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_cust_name TEXT;
  v_cust_phone TEXT;
  v_branch_name TEXT;
  v_service_name TEXT;
  v_notif_title TEXT;
  v_notif_message TEXT;
  v_notif_data JSONB;
  r_admin RECORD;
BEGIN
  -- Lấy tên & SĐT khách hàng
  IF NEW.booked_for_name IS NOT NULL AND NEW.booked_for_name <> '' THEN
    v_cust_name := NEW.booked_for_name;
  ELSE
    SELECT full_name INTO v_cust_name FROM public.users WHERE id = NEW.customer_id;
  END IF;
  v_cust_name := COALESCE(v_cust_name, 'Khách hàng MLD');

  IF NEW.booked_for_phone IS NOT NULL AND NEW.booked_for_phone <> '' THEN
    v_cust_phone := NEW.booked_for_phone;
  ELSE
    SELECT phone INTO v_cust_phone FROM public.users WHERE id = NEW.customer_id;
  END IF;

  -- Lấy tên chi nhánh
  SELECT name INTO v_branch_name FROM public.branches WHERE id = NEW.branch_id;
  v_branch_name := COALESCE(v_branch_name, 'MLD Spa');

  -- Lấy tên dịch vụ đầu tiên nếu có
  SELECT s.name INTO v_service_name 
  FROM public.booking_items bi 
  JOIN public.services s ON bi.service_id = s.id 
  WHERE bi.booking_id = NEW.id 
  LIMIT 1;
  v_service_name := COALESCE(v_service_name, 'Dịch vụ trị liệu Spa');

  v_notif_title := '⚡ Khách đặt lịch hẹn mới: ' || NEW.booking_code;
  v_notif_message := 'Khách ' || v_cust_name || 
                     CASE WHEN v_cust_phone IS NOT NULL AND v_cust_phone <> '' THEN ' (' || v_cust_phone || ')' ELSE '' END || 
                     ' vừa đặt lịch ' || v_service_name || 
                     ' ngày ' || to_char(NEW.booking_date, 'DD/MM/YYYY') || 
                     ' lúc ' || to_char(NEW.start_time, 'HH24:MI') || 
                     ' tại ' || v_branch_name || '.';

  v_notif_data := jsonb_build_object(
    'booking_id', NEW.id,
    'booking_code', NEW.booking_code,
    'branch_id', NEW.branch_id,
    'branch_name', v_branch_name,
    'customer_name', v_cust_name,
    'customer_phone', v_cust_phone,
    'booking_date', NEW.booking_date,
    'start_time', NEW.start_time,
    'status', NEW.status,
    'source', 'MOBILE_APP',
    'link', '/staff-schedule?booking=' || NEW.booking_code
  );

  -- 3.1. Insert broadcast notification (user_id IS NULL) cho toàn bộ web-admin
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    is_read,
    data,
    created_at
  ) VALUES (
    NULL,
    v_notif_title,
    v_notif_message,
    'BOOKING',
    false,
    v_notif_data,
    NOW()
  );

  -- 3.2. Đồng thời insert trực tiếp cho các tài khoản ADMIN, SUPER_ADMIN, RECEPTIONIST
  FOR r_admin IN 
    SELECT id FROM public.users 
    WHERE role IN ('ADMIN', 'SUPER_ADMIN', 'RECEPTIONIST') AND is_active = true
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      is_read,
      data,
      created_at
    ) VALUES (
      r_admin.id,
      v_notif_title,
      v_notif_message,
      'BOOKING',
      false,
      v_notif_data,
      NOW()
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn Trigger trên bảng public.bookings
DROP TRIGGER IF EXISTS trg_notify_admin_on_booking ON public.bookings;
CREATE TRIGGER trg_notify_admin_on_booking
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_notify_admin_on_booking();

-- 4. Bổ sung Trigger khi thanh toán Hóa đơn POS hoặc cập nhật lịch
CREATE OR REPLACE FUNCTION public.fn_trg_notify_admin_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_notif_title TEXT;
  v_notif_message TEXT;
  v_notif_data JSONB;
  r_admin RECORD;
BEGIN
  IF NEW.payment_status = 'PAID' AND (OLD IS NULL OR OLD.payment_status IS DISTINCT FROM 'PAID') THEN
    v_notif_title := '💰 Thu ngân: Hóa đơn đã thanh toán ' || NEW.invoice_code;
    v_notif_message := 'Hóa đơn ' || NEW.invoice_code || 
                       ' trị giá ' || replace(to_char(NEW.total_amount, 'FM999G999G999G990'), ',', '.') || 'đ' ||
                       ' đã thanh toán thành công qua ' || COALESCE(NEW.payment_method, 'tiền mặt/chuyển khoản') || '.';
    v_notif_data := jsonb_build_object(
      'invoice_id', NEW.id,
      'invoice_code', NEW.invoice_code,
      'booking_id', NEW.booking_id,
      'total_amount', NEW.total_amount,
      'payment_method', NEW.payment_method,
      'link', '/cashier-pos?invoice=' || NEW.invoice_code || '&receipt=true'
    );

    -- Insert broadcast
    INSERT INTO public.notifications (user_id, title, message, type, is_read, data, created_at)
    VALUES (NULL, v_notif_title, v_notif_message, 'PAYMENT', false, v_notif_data, NOW());

    -- Insert cho ADMIN / CASHIER
    FOR r_admin IN 
      SELECT id FROM public.users 
      WHERE role IN ('ADMIN', 'SUPER_ADMIN', 'CASHIER', 'BRANCH_MANAGER') AND is_active = true
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, is_read, data, created_at)
      VALUES (r_admin.id, v_notif_title, v_notif_message, 'PAYMENT', false, v_notif_data, NOW());
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_admin_on_invoice ON public.invoices;
CREATE TRIGGER trg_notify_admin_on_invoice
AFTER INSERT OR UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.fn_trg_notify_admin_on_invoice();

-- 5. Cập nhật Policy RLS cho public.notifications
DROP POLICY IF EXISTS "Public read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Staff manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow all manage notifications" ON public.notifications;

CREATE POLICY "Allow all read notifications"
ON public.notifications FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow all manage notifications"
ON public.notifications FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
