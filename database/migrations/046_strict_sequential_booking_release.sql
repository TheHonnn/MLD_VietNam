CREATE OR REPLACE FUNCTION public.fn_release_completed_bookings(p_branch_id UUID DEFAULT NULL)
RETURNS TABLE (
  released_count INT,
  message TEXT
) AS $$
DECLARE
  v_count INT := 0;
  v_vn_date DATE := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::DATE;
  v_vn_time TIME := (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::TIME;
BEGIN
  WITH updated AS (
    UPDATE public.bookings
    SET status = 'COMPLETED',
        checked_out_at = COALESCE(checked_out_at, NOW()),
        updated_at = NOW()
    WHERE status = 'IN_SERVICE'
      AND session_status = 'COMPLETED'
      AND payment_status = 'PAID'
      AND (p_branch_id IS NULL OR branch_id = p_branch_id)
      AND (
        booking_date < v_vn_date OR
        (booking_date = v_vn_date AND end_time <= v_vn_time)
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;

  RETURN QUERY SELECT
    v_count,
    ('Đã hoàn tất đóng ca ' || v_count || ' lịch đã đủ chuyên môn và thanh toán.')::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF to_regprocedure('public.fn_release_completed_bookings(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.fn_release_completed_bookings(UUID) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.fn_release_completed_bookings(UUID) TO service_role;
  END IF;
END $$;
