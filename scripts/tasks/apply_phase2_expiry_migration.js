const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const sql = `
-- 1. Function tự động tính valid_until = enrolled_at + 365 days khi ghi danh
CREATE OR REPLACE FUNCTION public.fn_set_enrollment_validity_period()
RETURNS TRIGGER AS $$
BEGIN
  -- Nếu chưa có valid_until và có enrolled_at, gán đúng 365 ngày
  IF NEW.valid_until IS NULL THEN
    NEW.valid_until := COALESCE(NEW.enrolled_at, NOW()) + INTERVAL '365 days';
  END IF;
  
  -- Xác định access_status theo thời hạn nếu không phải trạng thái EXTENDED
  IF NEW.access_status IS DISTINCT FROM 'EXTENDED' THEN
    IF NOW() > NEW.valid_until THEN
      NEW.access_status := 'EXPIRED';
      NEW.expired_at := COALESCE(NEW.expired_at, NEW.valid_until);
    ELSIF NEW.valid_until - NOW() <= INTERVAL '30 days' THEN
      NEW.access_status := 'EXPIRING_SOON';
    ELSE
      NEW.access_status := 'ACTIVE';
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

-- 2. Cron Procedure quét hết hạn toàn bộ học viên
CREATE OR REPLACE FUNCTION public.fn_expire_enrollments_cron()
RETURNS TABLE (
  expired_count INT,
  expiring_soon_count INT,
  active_count INT
) AS $$
DECLARE
  v_expired INT := 0;
  v_soon INT := 0;
  v_active INT := 0;
BEGIN
  -- Cập nhật các bản ghi chưa có valid_until
  UPDATE public.course_enrollments
  SET valid_until = COALESCE(enrolled_at, NOW()) + INTERVAL '365 days'
  WHERE valid_until IS NULL;

  -- 1. Chuyển sang EXPIRED nếu đã quá 365 ngày
  WITH updated_expired AS (
    UPDATE public.course_enrollments
    SET 
      access_status = 'EXPIRED',
      expired_at = COALESCE(expired_at, NOW())
    WHERE NOW() > valid_until
      AND access_status != 'EXPIRED'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired FROM updated_expired;

  -- 2. Đánh dấu EXPIRING_SOON nếu còn <= 30 ngày và chưa hết hạn
  WITH updated_soon AS (
    UPDATE public.course_enrollments
    SET access_status = 'EXPIRING_SOON'
    WHERE NOW() <= valid_until
      AND valid_until - NOW() <= INTERVAL '30 days'
      AND access_status = 'ACTIVE'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_soon FROM updated_soon;

  -- 3. Đếm số học viên còn active
  SELECT COUNT(*) INTO v_active
  FROM public.course_enrollments
  WHERE access_status IN ('ACTIVE', 'EXPIRING_SOON', 'EXTENDED')
    AND NOW() <= valid_until;

  RETURN QUERY SELECT v_expired, v_soon, v_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Procedure Gia hạn khóa học cho học viên
CREATE OR REPLACE FUNCTION public.fn_extend_enrollment(
  p_enrollment_id UUID,
  p_extension_months INT,
  p_reason TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  new_valid_until TIMESTAMPTZ,
  message TEXT
) AS $$
DECLARE
  v_cur_valid TIMESTAMPTZ;
  v_new_valid TIMESTAMPTZ;
BEGIN
  SELECT valid_until INTO v_cur_valid
  FROM public.course_enrollments
  WHERE id = p_enrollment_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TIMESTAMPTZ, 'Không tìm thấy hồ sơ học viên'::TEXT;
    RETURN;
  END IF;

  -- Nếu đã hết hạn thì tính từ NOW, nếu chưa hết hạn thì cộng nối tiếp từ valid_until cũ
  IF v_cur_valid < NOW() THEN
    v_new_valid := NOW() + (p_extension_months || ' months')::INTERVAL;
  ELSE
    v_new_valid := v_cur_valid + (p_extension_months || ' months')::INTERVAL;
  END IF;

  UPDATE public.course_enrollments
  SET 
    valid_until = v_new_valid,
    extension_months = COALESCE(extension_months, 0) + p_extension_months,
    extension_reason = p_reason,
    access_status = 'EXTENDED',
    expired_at = NULL
  WHERE id = p_enrollment_id;

  RETURN QUERY SELECT TRUE, v_new_valid, ('Gia hạn thành công +' || p_extension_months || ' tháng đến ' || to_char(v_new_valid, 'DD/MM/YYYY'))::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();

  console.log('Applying Phase 2 Expiry Migrations (Triggers, Sweeper, Extension)...');
  await client.query(sql);

  console.log('Running initial sweep via fn_expire_enrollments_cron()...');
  const res = await client.query('SELECT * FROM public.fn_expire_enrollments_cron();');
  console.log('Sweep result:', res.rows[0]);

  console.log('Phase 2 Migration executed successfully!');
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
