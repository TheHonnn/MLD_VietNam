-- ============================================================================
-- MIGRATION GIAI ĐOẠN 4: DUAL-RESOURCE ENGINE (6 GIƯỜNG × 6 KTV × CA 1 TIẾNG)
-- VÀ CƠ CHẾ AUTO-RELEASE & LEAST-BUSY DISPATCH
-- ============================================================================

-- 1. Hàm tự động giải phóng tài nguyên khi hết ca (Auto-Release Lifecycle)
-- Khi đồng hồ hệ thống vượt qua mốc kết thúc ca, tự động chuyển trạng thái COMPLETED
-- giải phóng giường và KTV cho slot tiếp theo.
CREATE OR REPLACE FUNCTION public.fn_auto_release_expired_bookings()
RETURNS TABLE (
  released_count INT,
  cancelled_count INT
) AS $$
DECLARE
  v_released INT := 0;
  v_cancelled INT := 0;
BEGIN
  -- 1. Cập nhật các booking đã hoàn tất ca (giờ kết thúc đã qua)
  -- Trạng thái CONFIRMED hoặc IN_SERVICE chuyển sang COMPLETED
  WITH completed_rows AS (
    UPDATE public.bookings
    SET status = 'COMPLETED',
        session_status = 'COMPLETED',
        checked_out_at = COALESCE(checked_out_at, NOW()),
        updated_at = NOW()
    WHERE status IN ('CONFIRMED', 'IN_SERVICE')
      AND (
        booking_date < CURRENT_DATE OR
        (booking_date = CURRENT_DATE AND end_time <= CURRENT_TIME)
      )
    RETURNING id, technician_id, booking_date, start_time
  )
  SELECT COUNT(*) INTO v_released FROM completed_rows;

  -- 2. Hủy các booking PENDING (chưa cọc/hết hạn giữ chỗ) đã qua giờ
  WITH cancelled_rows AS (
    UPDATE public.bookings
    SET status = 'CANCELLED',
        cancellation_reason = 'Hết hạn thanh toán cọc / Hết thời gian giữ chỗ ca',
        updated_at = NOW()
    WHERE status = 'PENDING'
      AND (
        booking_date < CURRENT_DATE OR
        (booking_date = CURRENT_DATE AND start_time <= CURRENT_TIME)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_cancelled FROM cancelled_rows;

  -- 3. Đồng bộ nhả cờ trong technician_slots
  UPDATE public.technician_slots
  SET status = 'AVAILABLE',
      held_by_user_id = null,
      hold_expires_at = null
  WHERE status = 'HOLD' AND hold_expires_at < NOW();

  RETURN QUERY SELECT v_released, v_cancelled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Thuật toán phân bổ tải cân bằng: Least-Busy Technician Dispatch
-- Khi khách đặt lịch ở chế độ "Để hệ thống chọn chuyên viên tốt nhất":
-- Quét KTV đang rảnh ở khung giờ đó, chọn KTV có tổng số ca đã nhận trong ngày là ít nhất
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
    -- Danh sách KTV đang đi làm tại chi nhánh và không nghỉ phép
    SELECT t.id, t.full_name::TEXT as name
    FROM public.technicians t
    WHERE t.branch_id = p_branch_id
      AND t.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1 FROM public.staff_leaves sl
        WHERE sl.staff_id = t.user_id
          AND sl.status = 'APPROVED'
          AND p_booking_date BETWEEN sl.start_date AND sl.end_date
      )
      -- Và không bị bận ca nào trùng khung giờ này
      AND NOT EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.technician_id = t.id
          AND b.booking_date = p_booking_date
          AND b.status IN ('CONFIRMED', 'IN_SERVICE', 'PENDING')
          AND (
            (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
            (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
            (b.start_time >= p_start_time AND b.end_time <= p_end_time)
          )
      )
  ),
  tech_loads AS (
    -- Đếm số ca đã nhận trong ngày hôm đó
    SELECT 
      at.id,
      at.name,
      COALESCE(COUNT(b.id), 0)::INT as total_sessions
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


-- 3. Cập nhật fn_check_slot_dual_availability với cơ chế tự động giải phóng trước khi đếm
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
  v_total_beds INT := 6; -- Cố định 6 giường trị liệu tiêu chuẩn (2 VIP + 4 Body)
  v_occupied_beds INT;
  v_free_beds INT;
  v_total_staff INT;
  v_busy_staff INT;
  v_free_staff INT;
  v_capacity INT;
BEGIN
  -- 1. Đếm số giường đang có booking trong khung giờ (chỉ tính booking đang active)
  SELECT COUNT(DISTINCT b.id)
  INTO v_occupied_beds
  FROM public.bookings b
  WHERE b.branch_id = p_branch_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('CONFIRMED', 'IN_SERVICE', 'PENDING')
    -- Bỏ qua nếu ngày hôm nay và ca đã kết thúc (auto-released)
    AND NOT (p_booking_date = CURRENT_DATE AND b.end_time <= CURRENT_TIME)
    AND (
      (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
      (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
      (b.start_time >= p_start_time AND b.end_time <= p_end_time)
    );

  v_free_beds := GREATEST(0, v_total_beds - v_occupied_beds);

  -- 2. Đếm số KTV đi làm tại chi nhánh và không nghỉ phép
  SELECT COUNT(DISTINCT t.id)
  INTO v_total_staff
  FROM public.technicians t
  WHERE t.branch_id = p_branch_id
    AND t.is_active = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM public.staff_leaves sl
      WHERE sl.staff_id = t.user_id
        AND sl.status = 'APPROVED'
        AND p_booking_date BETWEEN sl.start_date AND sl.end_date
    );

  -- Tối đa 6 KTV theo thiết kế
  v_total_staff := LEAST(6, v_total_staff);

  -- 3. Đếm số KTV đang bận phục vụ khách trong khung giờ
  SELECT COUNT(DISTINCT b.technician_id)
  INTO v_busy_staff
  FROM public.bookings b
  WHERE b.branch_id = p_branch_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('CONFIRMED', 'IN_SERVICE', 'PENDING')
    AND b.technician_id IS NOT NULL
    -- Bỏ qua nếu ca đã kết thúc
    AND NOT (p_booking_date = CURRENT_DATE AND b.end_time <= CURRENT_TIME)
    AND (
      (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
      (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
      (b.start_time >= p_start_time AND b.end_time <= p_end_time)
    );

  v_free_staff := GREATEST(0, v_total_staff - v_busy_staff);

  -- 4. Tính toán dung lượng phục vụ khả dụng = min(giường trống, KTV rảnh)
  v_capacity := LEAST(v_free_beds, v_free_staff);

  -- 5. Trả kết quả chi tiết
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


-- 4. Cập nhật fn_get_day_slots_dual_availability với 10 ca chuẩn 1 tiếng
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
  v_check RECORD;
  v_slots TIME[] := ARRAY[
    '09:00:00'::TIME, '10:00:00'::TIME, '11:00:00'::TIME,
    '13:30:00'::TIME, '14:30:00'::TIME, '15:30:00'::TIME,
    '16:30:00'::TIME, '17:30:00'::TIME, '18:30:00'::TIME,
    '19:30:00'::TIME
  ];
  v_start TIME;
  v_end TIME;
  v_idx INT := 0;
BEGIN
  FOREACH v_start IN ARRAY v_slots
  LOOP
    v_idx := v_idx + 1;
    v_end := v_start + INTERVAL '60 minutes';

    SELECT * INTO v_check FROM public.fn_check_slot_dual_availability(
      p_branch_id, p_booking_date, v_start, v_end
    );

    RETURN QUERY SELECT 
      to_char(v_start, 'HH24:MI') || '–' || to_char(v_end, 'HH24:MI'),
      v_start,
      v_end,
      v_check.is_available,
      v_check.free_beds,
      v_check.free_staff,
      v_check.remaining_capacity,
      CASE 
        WHEN v_check.is_available THEN ('Còn ' || v_check.remaining_capacity || ' chỗ')::TEXT
        ELSE v_check.reason
      END,
      v_idx;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 5. Hàm fn_release_completed_bookings hỗ trợ lọc theo chi nhánh tùy chọn
CREATE OR REPLACE FUNCTION public.fn_release_completed_bookings(p_branch_id UUID DEFAULT NULL)
RETURNS TABLE (
  released_count INT,
  message TEXT
) AS $$
DECLARE
  v_count INT := 0;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET status = 'COMPLETED',
        session_status = 'COMPLETED',
        checked_out_at = COALESCE(checked_out_at, NOW()),
        updated_at = NOW()
    WHERE status IN ('CONFIRMED', 'IN_SERVICE')
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (
        booking_date < CURRENT_DATE OR
        (booking_date = CURRENT_DATE AND end_time <= CURRENT_TIME)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN QUERY SELECT 
    v_count, 
    ('Đã tự động giải phóng ' || v_count || ' ca trị liệu hoàn tất (nhả giường & KTV).')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Thêm chỉ mục tăng tốc tra cứu Dual-Resource và Auto-Release
CREATE INDEX IF NOT EXISTS idx_bookings_drc_lookup 
ON public.bookings(branch_id, booking_date, start_time, end_time, status);

CREATE INDEX IF NOT EXISTS idx_bookings_release_lookup 
ON public.bookings(booking_date, end_time, status);

-- 7. Cập nhật quyền thực thi RPC cho service_role và authenticated
GRANT EXECUTE ON FUNCTION public.fn_auto_release_expired_bookings() TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_release_completed_bookings(UUID) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_dispatch_least_busy_technician(UUID, DATE, TIME, TIME) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_check_slot_dual_availability(UUID, DATE, TIME, TIME) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_day_slots_dual_availability(UUID, DATE) TO authenticated, service_role, anon;

