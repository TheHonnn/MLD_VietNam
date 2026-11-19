ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS discount_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_invoices_coupon_id ON public.invoices(coupon_id);

INSERT INTO public.system_settings(category, data, description)
VALUES(
  'loyalty',
  '{"earn_amount_per_point":10000,"redeem_value_per_point":100,"max_redeem_percent_per_order":30,"point_expiry_months":12}'::jsonb,
  'Chính sách điểm thưởng và quy đổi'
)
ON CONFLICT (category) DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_get_day_slots_dual_availability(
  p_branch_id UUID,
  p_booking_date DATE
)
RETURNS TABLE (
  slot_time TEXT,
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN,
  free_beds INT,
  free_staff INT,
  remaining_capacity INT,
  status_text TEXT,
  recommended_order INT
) AS $$
DECLARE
  v_slots TIME[] := ARRAY[]::TIME[];
  v_custom_json JSONB;
  v_amenities JSONB;
  v_open TIME;
  v_close TIME;
  v_slot_minutes INT := 30;
  v_booking_cfg JSONB;
  v_total_beds INT := 0;
  v_total_staff INT := 0;
  v_slot TIME;
  v_end TIME;
  v_occ_beds INT;
  v_busy_staff INT;
  v_free_beds INT;
  v_free_staff INT;
  v_cap INT;
  v_idx INT := 1;
  v_elem TEXT;
  v_item TEXT;
  v_default_slots TIME[] := ARRAY[
    '09:00:00'::TIME, '10:00:00'::TIME, '11:00:00'::TIME,
    '13:30:00'::TIME, '14:30:00'::TIME, '15:30:00'::TIME,
    '16:30:00'::TIME, '17:30:00'::TIME, '18:30:00'::TIME,
    '19:30:00'::TIME
  ];
BEGIN
  SELECT b.custom_time_slots, b.amenities, b.opening_time, b.closing_time
  INTO v_custom_json, v_amenities, v_open, v_close
  FROM public.branches b
  WHERE b.id = p_branch_id;

  IF v_custom_json IS NOT NULL AND jsonb_typeof(v_custom_json) = 'array' AND jsonb_array_length(v_custom_json) > 0 THEN
    FOR v_elem IN SELECT jsonb_array_elements_text(v_custom_json) LOOP
      v_item := trim(v_elem);
      IF v_item ~ '^\d{2}:\d{2}(:\d{2})?$' THEN
        v_slots := array_append(v_slots, (CASE WHEN length(v_item) = 5 THEN v_item || ':00' ELSE v_item END)::TIME);
      END IF;
    END LOOP;
  END IF;

  IF coalesce(array_length(v_slots, 1), 0) = 0 AND v_amenities IS NOT NULL AND jsonb_typeof(v_amenities) = 'array' THEN
    SELECT x INTO v_elem FROM jsonb_array_elements_text(v_amenities) x WHERE x LIKE 'SLOTS:%' LIMIT 1;
    IF v_elem IS NOT NULL THEN
      FOR v_item IN SELECT trim(part) FROM unnest(string_to_array(substring(v_elem FROM 7), ',')) part LOOP
        IF v_item ~ '^\d{2}:\d{2}(:\d{2})?$' THEN
          v_slots := array_append(v_slots, (CASE WHEN length(v_item) = 5 THEN v_item || ':00' ELSE v_item END)::TIME);
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF coalesce(array_length(v_slots, 1), 0) = 0 THEN
    SELECT s.data INTO v_booking_cfg FROM public.system_settings s WHERE s.category = 'booking' LIMIT 1;
    IF v_booking_cfg IS NOT NULL AND (v_booking_cfg->>'open_time') ~ '^\d{2}:\d{2}' AND (v_booking_cfg->>'close_time') ~ '^\d{2}:\d{2}' THEN
      v_open := ((v_booking_cfg->>'open_time') || ':00')::TIME;
      v_close := ((v_booking_cfg->>'close_time') || ':00')::TIME;
      IF (v_booking_cfg->>'slot_duration_minutes') ~ '^\d+$' THEN
        v_slot_minutes := GREATEST(15, LEAST(120, (v_booking_cfg->>'slot_duration_minutes')::INT));
      END IF;
      v_slot := v_open;
      WHILE v_slot + make_interval(mins => 60) <= v_close AND coalesce(array_length(v_slots, 1), 0) < 48 LOOP
        v_slots := array_append(v_slots, v_slot);
        v_slot := v_slot + make_interval(mins => v_slot_minutes);
      END LOOP;
    END IF;
  END IF;

  IF coalesce(array_length(v_slots, 1), 0) = 0 THEN
    v_slots := v_default_slots;
  END IF;

  SELECT coalesce(sum(r.bed_capacity), 0)::INT
  INTO v_total_beds
  FROM public.branch_rooms r
  WHERE r.branch_id = p_branch_id AND r.is_available = TRUE;

  IF v_total_beds = 0 THEN
    SELECT count(*)::INT INTO v_total_beds FROM public.branch_beds bb WHERE bb.branch_id = p_branch_id AND bb.is_active = TRUE;
  END IF;

  SELECT count(*)::INT
  INTO v_total_staff
  FROM public.technicians t
  WHERE t.branch_id = p_branch_id
    AND t.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_leaves sl
      WHERE sl.staff_id = t.staff_profile_id
        AND sl.status = 'APPROVED'
        AND p_booking_date BETWEEN sl.start_date AND sl.end_date
    );

  FOREACH v_slot IN ARRAY v_slots LOOP
    v_end := v_slot + interval '60 minutes';
    SELECT count(*)::INT
    INTO v_occ_beds
    FROM public.bookings bk
    WHERE bk.branch_id = p_branch_id
      AND bk.booking_date = p_booking_date
      AND bk.status::text NOT IN ('CANCELLED', 'NO_SHOW')
      AND bk.start_time < v_end
      AND bk.end_time > v_slot;

    SELECT count(DISTINCT bk.technician_id)::INT
    INTO v_busy_staff
    FROM public.bookings bk
    WHERE bk.branch_id = p_branch_id
      AND bk.booking_date = p_booking_date
      AND bk.technician_id IS NOT NULL
      AND bk.status::text NOT IN ('CANCELLED', 'NO_SHOW')
      AND bk.start_time < v_end
      AND bk.end_time > v_slot;

    v_free_beds := GREATEST(0, v_total_beds - coalesce(v_occ_beds, 0));
    v_free_staff := GREATEST(0, v_total_staff - coalesce(v_busy_staff, 0));
    v_cap := LEAST(v_free_beds, v_free_staff);

    slot_time := to_char(v_slot, 'HH24:MI');
    start_time := v_slot;
    end_time := v_end;
    is_available := (v_cap > 0);
    free_beds := v_free_beds;
    free_staff := v_free_staff;
    remaining_capacity := v_cap;
    status_text := CASE
      WHEN v_cap > 0 THEN 'Còn ' || v_cap || ' chỗ'
      WHEN v_free_beds <= 0 THEN 'Hết giường'
      ELSE 'Kín KTV'
    END;
    recommended_order := v_idx;
    v_idx := v_idx + 1;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION public.fn_get_day_slots_dual_availability(UUID, DATE) TO anon, authenticated, service_role;
