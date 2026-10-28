-- ============================================================================
-- MIGRATION 011: ACADEMY 1-YEAR LIFECYCLE & SPA DUAL-RESOURCE ENGINE (6 BEDS × 6 STAFF)
-- Project: MLD Việt Nam
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HỌC VIÊN: BỔ SUNG CÁC TRƯỜNG THỜI HẠN 1 NĂM VÀO BẢNG course_enrollments
-- ----------------------------------------------------------------------------

ALTER TABLE public.course_enrollments
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS access_status VARCHAR(30) DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS extension_months INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS extension_reason TEXT,
  ADD COLUMN IF NOT EXISTS last_expiry_notified_at TIMESTAMPTZ;

-- Tạo chỉ mục tối ưu cho việc quét học viên hết hạn
CREATE INDEX IF NOT EXISTS idx_course_enrollments_access_status_valid_until 
ON public.course_enrollments (access_status, valid_until);

-- Điền dữ liệu thực tế cho các bản ghi hiện có
UPDATE public.course_enrollments
SET 
  valid_until = COALESCE(valid_until, enrolled_at + INTERVAL '365 days', NOW() + INTERVAL '365 days'),
  access_status = CASE 
    WHEN (COALESCE(valid_until, enrolled_at + INTERVAL '365 days', NOW() + INTERVAL '365 days') < NOW()) THEN 'EXPIRED'
    ELSE 'ACTIVE'
  END,
  expired_at = CASE 
    WHEN (COALESCE(valid_until, enrolled_at + INTERVAL '365 days', NOW() + INTERVAL '365 days') < NOW()) 
    THEN COALESCE(valid_until, enrolled_at + INTERVAL '365 days', NOW())
    ELSE NULL
  END
WHERE valid_until IS NULL;

-- Trigger Function: Tự động tính hạn 365 ngày khi tạo/sửa bản ghi ghi danh
CREATE OR REPLACE FUNCTION public.fn_set_enrollment_validity_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Tự động tính valid_until = 365 ngày kể từ ngày enrolled_at nếu chưa được gán
  IF NEW.valid_until IS NULL THEN
    NEW.valid_until := COALESCE(NEW.enrolled_at, NOW()) + INTERVAL '365 days';
  END IF;

  -- Kiểm tra trạng thái hết hạn dựa trên mốc thời gian thực
  IF NEW.access_status <> 'EXTENDED' THEN
    IF NOW() > NEW.valid_until THEN
      NEW.access_status := 'EXPIRED';
      NEW.expired_at := COALESCE(NEW.expired_at, NEW.valid_until);
    ELSE
      NEW.access_status := 'ACTIVE';
      NEW.expired_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_enrollment_validity ON public.course_enrollments;
CREATE TRIGGER trg_set_enrollment_validity
BEFORE INSERT OR UPDATE ON public.course_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.fn_set_enrollment_validity_period();

-- Function quét và tự động khóa học viên hết hạn
CREATE OR REPLACE FUNCTION public.fn_revoke_expired_enrollments()
RETURNS TABLE (
  revoked_count INT
) AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.course_enrollments
  SET 
    access_status = 'EXPIRED',
    expired_at = NOW()
  WHERE valid_until < NOW() 
    AND access_status NOT IN ('EXPIRED', 'EXTENDED');

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ----------------------------------------------------------------------------
-- 2. ĐỘI NGŨ CHUYÊN VIÊN: ĐẢM BẢO ĐỦ 6 KTV TẠI TRỤ SỞ ĐỂ ĐÁP ỨNG 6 GIƯỜNG CỐ ĐỊNH
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_branch_id UUID := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_current_count INT;
BEGIN
  SELECT COUNT(*) INTO v_current_count
  FROM public.technicians
  WHERE branch_id = v_branch_id AND is_active = TRUE;

  -- Bổ sung KTV chuyên môn chuẩn MLD nếu cơ sở chưa đủ 6 KTV
  IF v_current_count < 6 THEN
    INSERT INTO public.technicians (id, branch_id, full_name, title, avatar_url, experience_years, rating_avg, review_count, specialties, bio, is_active, created_at, updated_at)
    VALUES
      (
        'cccccccc-0001-0001-0001-000000000003',
        v_branch_id,
        'Nguyễn Hoàng Yến',
        'Chuyên viên Trị liệu Vodder LV2',
        'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?w=400',
        4,
        4.9,
        86,
        '["Dẫn lưu toàn thân", "Giảm phù nề sau phẫu thuật", "Massage đầu dưỡng sinh"]'::jsonb,
        'Chuyên viên tay nghề cao đào tạo chính quy theo phương pháp Vodder chuẩn quốc tế.',
        TRUE,
        NOW(),
        NOW()
      ),
      (
        'cccccccc-0001-0001-0001-000000000004',
        v_branch_id,
        'Đặng Mai Phương',
        'Chuyên viên Trị liệu Mạch Bạch Huyết',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        3,
        4.8,
        64,
        '["Dẫn lưu chi dưới", "Chăm sóc da sau xâm lấn", "Trị liệu cổ vai gáy"]'::jsonb,
        'Tốt nghiệp xuất sắc khóa đào tạo chuyên sâu MLD, phong cách tận tâm, chu đáo.',
        TRUE,
        NOW(),
        NOW()
      ),
      (
        'cccccccc-0001-0001-0001-000000000005',
        v_branch_id,
        'Phạm Thùy Linh',
        'Chuyên viên Trị liệu Phù Nề Hậu Phẫu',
        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
        5,
        5.0,
        112,
        '["Dẫn lưu hậu phẫu tạo hình", "Phục hồi lưu thông dịch", "Kỹ thuật Vodder áp lực nhẹ"]'::jsonb,
        'Kinh nghiệm 5 năm chăm sóc phục hồi cho khách hàng hậu phẫu thẩm mỹ.',
        TRUE,
        NOW(),
        NOW()
      ),
      (
        'cccccccc-0001-0001-0001-000000000006',
        v_branch_id,
        'Vũ Bích Ngọc',
        'Chuyên viên Phục Hồi Chức Năng Lâm Sàng',
        'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=400',
        4,
        4.9,
        95,
        '["Dẫn lưu giải độc cơ thể", "Xoa bóp phục hồi chuyên sâu", "Trị liệu thư giãn dưỡng sinh"]'::jsonb,
        'Đạt chứng chỉ Master Practitioner MLD, kỹ thuật tay chuẩn xác, mềm mại.',
        TRUE,
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO UPDATE SET 
      full_name = EXCLUDED.full_name,
      title = EXCLUDED.title,
      is_active = TRUE;
  END IF;
END $$;


-- ----------------------------------------------------------------------------
-- 3. BỘ ĐIỀU PHỐI ĐẶT LỊCH SPA DUAL-RESOURCE (6 GIƯỜNG × 6 KTV × CA 1 TIẾNG)
-- ----------------------------------------------------------------------------

-- Function tính toán độ khả dụng kép của 1 khung giờ
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
  v_total_beds INT := 6; -- Cố định 6 giường trị liệu tiêu chuẩn
  v_occupied_beds INT;
  v_free_beds INT;
  v_total_staff INT;
  v_busy_staff INT;
  v_free_staff INT;
  v_capacity INT;
BEGIN
  -- 1. Đếm số giường đang có booking trong khung giờ
  SELECT COUNT(DISTINCT b.id)
  INTO v_occupied_beds
  FROM public.bookings b
  WHERE b.branch_id = p_branch_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('CONFIRMED', 'IN_SERVICE', 'PENDING')
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

  -- Tối đa 6 KTV
  v_total_staff := LEAST(6, v_total_staff);

  -- 3. Đếm số KTV đang phục vụ khách trong khung giờ
  SELECT COUNT(DISTINCT b.technician_id)
  INTO v_busy_staff
  FROM public.bookings b
  WHERE b.branch_id = p_branch_id
    AND b.booking_date = p_booking_date
    AND b.status IN ('CONFIRMED', 'IN_SERVICE', 'PENDING')
    AND b.technician_id IS NOT NULL
    AND (
      (b.start_time <= p_start_time AND b.end_time > p_start_time) OR
      (b.start_time < p_end_time AND b.end_time >= p_end_time) OR
      (b.start_time >= p_start_time AND b.end_time <= p_end_time)
    );

  v_free_staff := GREATEST(0, v_total_staff - v_busy_staff);

  -- 4. Tính toán dung lượng phục vụ khả dụng
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

-- Function lấy danh sách tất cả các slot 1 tiếng kèm trạng thái chi tiết
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
  v_slot RECORD;
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

-- Quyền thực thi RPC cho service_role và authenticated
GRANT EXECUTE ON FUNCTION public.fn_set_enrollment_validity_period() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_revoke_expired_enrollments() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_check_slot_dual_availability(UUID, DATE, TIME, TIME) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_day_slots_dual_availability(UUID, DATE) TO anon, authenticated, service_role;
