CREATE TABLE IF NOT EXISTS public.zns_config (
    id TEXT PRIMARY KEY DEFAULT 'default',
    oa_id TEXT NOT NULL DEFAULT '2849182390192830192',
    app_id TEXT NOT NULL DEFAULT '4928109283019283',
    app_secret TEXT NOT NULL DEFAULT '',
    access_token TEXT NOT NULL DEFAULT '',
    refresh_token TEXT NOT NULL DEFAULT '',
    webhook_url TEXT NOT NULL DEFAULT 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
    is_live_mode BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.zns_config
    ADD COLUMN IF NOT EXISTS webhook_url TEXT NOT NULL DEFAULT 'https://wstvwushpwcdsmhpunvh.supabase.co/functions/v1/zalo-webhook',
    ADD COLUMN IF NOT EXISTS is_live_mode BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO public.zns_config (id, oa_id, app_id, app_secret, access_token, refresh_token, is_live_mode)
VALUES ('default', '2849182390192830192', '4928109283019283', '', '', '', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.zns_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    content_template TEXT NOT NULL,
    sample_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO public.zns_templates (template_code, name, description, content_template, sample_params, is_active)
VALUES
    ('BOOKING_CONFIRMATION', 'Xác nhận đặt lịch hẹn MLD', 'Gửi khi khách đặt lịch thành công', 'Xin chào {{customer_name}}, lịch hẹn {{booking_code}} tại {{branch_name}} lúc {{booking_time}} ngày {{booking_date}} đã được xác nhận.', '{"customer_name":"Nguyễn Văn A","booking_code":"BK-001","branch_name":"MLD Quận 3","booking_time":"10:00","booking_date":"20/11/2026"}'::jsonb, TRUE),
    ('TREATMENT_REMINDER', 'Nhắc lịch trị liệu & chăm sóc', 'Gửi nhắc lịch trước giờ hẹn', 'MLD Việt Nam nhắc lịch hẹn {{booking_code}} của quý khách {{customer_name}} vào lúc {{booking_time}} ngày {{booking_date}}.', '{"customer_name":"Nguyễn Văn A","booking_code":"BK-001","booking_time":"10:00","booking_date":"20/11/2026"}'::jsonb, TRUE)
ON CONFLICT (template_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.zns_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(100),
    template_code VARCHAR(50) NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    params_sent JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'SENT',
    response_code VARCHAR(50) DEFAULT '0',
    error_message TEXT,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_zns_logs_phone ON public.zns_logs(recipient_phone);
CREATE INDEX IF NOT EXISTS idx_zns_logs_sent_at ON public.zns_logs(sent_at DESC);

CREATE OR REPLACE FUNCTION public.fn_dispatch_least_busy_technician(
  p_branch_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS TABLE (
  technician_id UUID,
  full_name TEXT,
  sessions_today INT
) AS $$
BEGIN
  RETURN QUERY
  WITH available_techs AS (
    SELECT t.id, t.full_name::TEXT AS name
    FROM public.technicians t
    WHERE t.branch_id = p_branch_id
      AND t.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_leaves sl
        WHERE (sl.staff_id = t.staff_profile_id OR sl.staff_id = t.user_id)
          AND sl.status = 'APPROVED'
          AND p_booking_date BETWEEN sl.start_date AND sl.end_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.technician_id = t.id
          AND b.booking_date = p_booking_date
          AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'PENDING')
          AND (
            (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
            (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
            (b.start_time >= p_start_time AND b.end_time <= p_end_time)
          )
      )
  ),
  tech_loads AS (
    SELECT
      at.id,
      at.name,
      COALESCE(COUNT(b.id), 0)::INT AS total_sessions
    FROM available_techs at
    LEFT JOIN public.bookings b ON b.technician_id = at.id
      AND b.booking_date = p_booking_date
      AND b.status NOT IN ('CANCELLED')
    GROUP BY at.id, at.name
  )
  SELECT
    tl.id,
    tl.name,
    tl.total_sessions
  FROM tech_loads tl
  ORDER BY tl.total_sessions ASC, tl.id ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_check_slot_dual_availability(
  p_branch_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS TABLE (
  is_available BOOLEAN,
  total_beds INT,
  occupied_beds INT,
  free_beds INT,
  total_staff_on_duty INT,
  busy_staff INT,
  free_staff INT,
  remaining_capacity INT,
  reason TEXT
) AS $$
DECLARE
  v_total_beds INT := 0;
  v_occupied_beds INT;
  v_free_beds INT;
  v_total_staff INT;
  v_busy_staff INT;
  v_free_staff INT;
  v_capacity INT;
BEGIN
  SELECT COALESCE(COUNT(r.id), 0)::INT
  INTO v_total_beds
  FROM public.branch_rooms r
  WHERE r.branch_id = p_branch_id
    AND r.is_available = TRUE
    AND r.room_type NOT IN ('ACADEMY_CLASSROOM', 'PRACTICE_LAB');

  IF v_total_beds <= 0 THEN
    v_total_beds := 6;
  END IF;

  SELECT COUNT(DISTINCT b.id)
  INTO v_occupied_beds
  FROM public.bookings b
  WHERE b.branch_id = p_branch_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'PENDING')
    AND NOT (p_booking_date = CURRENT_DATE AND b.end_time <= CURRENT_TIME)
    AND (
      (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
      (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
      (b.start_time >= p_start_time AND b.end_time <= p_end_time)
    );

  v_free_beds := GREATEST(0, v_total_beds - v_occupied_beds);

  SELECT COUNT(DISTINCT t.id)
  INTO v_total_staff
  FROM public.technicians t
  WHERE t.branch_id = p_branch_id
    AND t.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_leaves sl
      WHERE (sl.staff_id = t.staff_profile_id OR sl.staff_id = t.user_id)
        AND sl.status = 'APPROVED'
        AND p_booking_date BETWEEN sl.start_date AND sl.end_date
    );

  SELECT COUNT(DISTINCT b.technician_id)
  INTO v_busy_staff
  FROM public.bookings b
  WHERE b.branch_id = p_branch_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'PENDING')
    AND b.technician_id IS NOT NULL
    AND NOT (p_booking_date = CURRENT_DATE AND b.end_time <= CURRENT_TIME)
    AND (
      (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
      (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
      (b.start_time >= p_start_time AND b.end_time <= p_end_time)
    );

  v_free_staff := GREATEST(0, v_total_staff - v_busy_staff);
  v_capacity := LEAST(v_free_beds, v_free_staff);

  IF v_capacity > 0 THEN
    RETURN QUERY SELECT
      TRUE, v_total_beds, v_occupied_beds, v_free_beds,
      v_total_staff, v_busy_staff, v_free_staff,
      v_capacity, 'Còn chỗ'::TEXT;
  ELSE
    IF v_free_beds <= 0 THEN
      RETURN QUERY SELECT
        FALSE, v_total_beds, v_occupied_beds, v_free_beds,
        v_total_staff, v_busy_staff, v_free_staff,
        0, 'Hết giường trống'::TEXT;
    ELSE
      RETURN QUERY SELECT
        FALSE, v_total_beds, v_occupied_beds, v_free_beds,
        v_total_staff, v_busy_staff, v_free_staff,
        0, 'Hết chuyên viên phục vụ'::TEXT;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.fn_dispatch_least_busy_technician(UUID, DATE, TIME, TIME) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_check_slot_dual_availability(UUID, DATE, TIME, TIME) TO authenticated, service_role, anon;
