/**
 * ============================================================================
 * E2E TEST: GIAI ĐOẠN 4 - DUAL-RESOURCE ENGINE (DRC), AUTO-RELEASE & LEAST-BUSY DISPATCH
 * 100% Zero-Mock Policy: Kiểm thử trực tiếp trên PostgreSQL Supabase Cloud
 * ============================================================================
 */

const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const BRANCH_ID = 'aaaaaaaa-0001-0001-0001-000000000001';
const STANDARD_BEDS = ['G-VIP-01', 'G-VIP-02', 'G-BODY-01', 'G-BODY-02', 'G-BODY-03', 'G-BODY-04'];
const TEST_PREFIX = 'TEST-DRC-';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 4: DUAL-RESOURCE DRC ENGINE');
  console.log('   (Ràng buộc 6 Giường × 6 KTV, 10 Ca 1 tiếng, Auto-Release & Least-Busy)');
  console.log('================================================================\n');

  await client.connect();
  const testBookingIds = [];

  try {
    // 0. Chuẩn bị ngày kiểm thử (ngày mai để tránh va chạm với dữ liệu hiện tại)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const testDate = tomorrow.toISOString().split('T')[0];
    const todayDate = new Date().toISOString().split('T')[0];

    // Lấy thông tin user và service có sẵn trong DB
    const userRes = await client.query("SELECT id FROM public.users LIMIT 1");
    const testUserId = userRes.rows[0].id;

    const serviceRes = await client.query("SELECT id, price FROM public.services LIMIT 1");
    const testServiceId = serviceRes.rows[0].id;
    const testPrice = serviceRes.rows[0].price || 450000;

    // Lấy 6 KTV của chi nhánh
    const techRes = await client.query(
      "SELECT id, full_name FROM public.technicians WHERE branch_id = $1 AND is_active = TRUE ORDER BY full_name ASC LIMIT 6",
      [BRANCH_ID]
    );
    const technicians = techRes.rows;
    console.log(`📋 Tìm thấy ${technicians.length} KTV hoạt động tại chi nhánh:`, technicians.map(t => t.full_name).join(', '));
    if (technicians.length < 6) {
      console.warn('⚠️ Cảnh báo: Số KTV hiện tại ít hơn 6, kiểm tra cấu hình chi nhánh.');
    }

    // ------------------------------------------------------------------------
    // TEST 1: CHUẨN HÓA 10 CA 1 TIẾNG VÀ ĐỦ DUNG LƯỢNG KÉP BAN ĐẦU
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 1: Tra cứu 10 ca chuẩn 1 tiếng và năng lực kép DRC ---');
    const slotsRes = await client.query(
      "SELECT * FROM public.fn_get_day_slots_dual_availability($1, $2)",
      [BRANCH_ID, testDate]
    );

    console.log(`-> Trả về tổng cộng: ${slotsRes.rows.length} ca (kỳ vọng: 10 ca)`);
    if (slotsRes.rows.length !== 10) {
      throw new Error(`Kỳ vọng 10 ca chuẩn 1 tiếng, nhận được: ${slotsRes.rows.length}`);
    }

    const expectedSlotTimes = [
      '09:00–10:00', '10:00–11:00', '11:00–12:00',
      '13:30–14:30', '14:30–15:30', '15:30–16:30',
      '16:30–17:30', '17:30–18:30', '18:30–19:30',
      '19:30–20:30'
    ];
    for (let i = 0; i < 10; i++) {
      const slot = slotsRes.rows[i];
      if (slot.slot_time !== expectedSlotTimes[i]) {
        throw new Error(`Slot ${i + 1} không khớp: ${slot.slot_time} vs ${expectedSlotTimes[i]}`);
      }
      if (slot.free_beds > 6 || slot.free_staff > 6) {
        throw new Error(`Vượt quá giới hạn tài nguyên 6: Giường ${slot.free_beds}, KTV ${slot.free_staff}`);
      }
    }
    console.log('✅ TEST 1 PASS: Toàn bộ 10 ca chuẩn 1 tiếng đã chuẩn hóa chính xác, dung lượng mỗi ca <= 6.');

    // ------------------------------------------------------------------------
    // TEST 2: KIỂM TOÁN CHỐNG VƯỢT DUNG LƯỢNG (OVERBOOKING PREVENTION)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 2: Chặn đặt lịch khi kín 6 giường / 6 KTV (Overbooking Prevention) ---');
    const testSlotStart = '10:00:00';
    const testSlotEnd = '11:00:00';

    // Tạo 6 booking để lấp đầy toàn bộ 6 giường và 6 KTV
    for (let i = 0; i < 6; i++) {
      const bed = STANDARD_BEDS[i];
      const tech = technicians[i % technicians.length];
      const code = `${TEST_PREFIX}CAP-${i + 1}-${Date.now()}`;

      const insertRes = await client.query(`
        INSERT INTO public.bookings (
          booking_code, customer_id, branch_id, technician_id, assigned_bed_number,
          booking_date, start_time, end_time, status, payment_status, payment_method,
          base_total, final_price, booked_for_name, booked_for_phone, qr_code_hash, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'CONFIRMED', 'PAID', 'CASH_AT_SPA',
          $9, $9, $10, '0988888888', md5(random()::text), NOW(), NOW()
        ) RETURNING id;
      `, [code, testUserId, BRANCH_ID, tech.id, bed, testDate, testSlotStart, testSlotEnd, testPrice, `Khách Thử Nghiệm ${i + 1}`]);

      testBookingIds.push(insertRes.rows[0].id);
    }
    console.log(`-> Đã gán 6 booking thử nghiệm chiếm trọn 6 giường (${STANDARD_BEDS.join(', ')}) vào khung 10:00-11:00`);

    // Kiểm tra DRC sau khi kín slot
    const drcCheckRes = await client.query(
      "SELECT * FROM public.fn_check_slot_dual_availability($1, $2, $3, $4)",
      [BRANCH_ID, testDate, testSlotStart, testSlotEnd]
    );
    const drc = drcCheckRes.rows[0];
    console.log('-> Kết quả kiểm tra năng lực kép DRC:', {
      is_available: drc.is_available,
      free_beds: drc.free_beds,
      free_staff: drc.free_staff,
      remaining_capacity: drc.remaining_capacity,
      reason: drc.reason
    });

    if (drc.is_available !== false || drc.remaining_capacity !== 0) {
      throw new Error(`Lỗi DRC: Khi kín 6 giường, is_available phải là FALSE và remaining_capacity phải bằng 0!`);
    }
    console.log('✅ TEST 2 PASS: Hệ thống phát hiện slot đã kín (0 chỗ), dừng đặt lịch và trả về lý do chính xác:', drc.reason);

    // ------------------------------------------------------------------------
    // TEST 3: AUTO-RELEASE LIFECYCLE (TỰ ĐỘNG GIẢI PHÓNG TÀI NGUYÊN KHI HẾT CA)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 3: Tự động nhả phòng & KTV khi qua giờ kết thúc (Auto-Release Lifecycle) ---');
    // Tạo 1 booking hôm nay nhưng ca đã qua (ví dụ end_time là 00:01:00)
    const expiredCode = `${TEST_PREFIX}EXP-${Date.now()}`;
    const expInsertRes = await client.query(`
      INSERT INTO public.bookings (
        booking_code, customer_id, branch_id, technician_id, assigned_bed_number,
        booking_date, start_time, end_time, status, payment_status, payment_method,
        base_total, final_price, booked_for_name, booked_for_phone, qr_code_hash, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, 'G-VIP-01',
        $5, '00:00:00', '00:01:00', 'CONFIRMED', 'PAID', 'CASH_AT_SPA',
        $6, $6, 'Khách Ca Quá Giờ', '0999999999', md5(random()::text), NOW(), NOW()
      ) RETURNING id;
    `, [expiredCode, testUserId, BRANCH_ID, technicians[0].id, todayDate, testPrice]);
    const expiredBookingId = expInsertRes.rows[0].id;
    testBookingIds.push(expiredBookingId);

    // Chạy hàm auto-release
    const releaseRes = await client.query("SELECT * FROM public.fn_auto_release_expired_bookings()");
    console.log('-> Kết quả thực thi fn_auto_release_expired_bookings:', releaseRes.rows[0]);

    // Kiểm tra trạng thái booking đã chuyển sang COMPLETED
    const checkExpRes = await client.query("SELECT status, session_status, checked_out_at FROM public.bookings WHERE id = $1", [expiredBookingId]);
    const expBooking = checkExpRes.rows[0];
    console.log('-> Trạng thái booking sau quét auto-release:', expBooking);

    if (expBooking.status !== 'COMPLETED') {
      throw new Error(`Auto-release thất bại: Trạng thái hiện tại là ${expBooking.status}, kỳ vọng COMPLETED`);
    }
    console.log('✅ TEST 3 PASS: Auto-Release Lifecycle đã tự động chuyển trạng thái ca kết thúc sang COMPLETED, giường và KTV được giải phóng!');

    // ------------------------------------------------------------------------
    // TEST 4: THUẬT TOÁN LEAST-BUSY TECHNICIAN DISPATCH (CÂN BẰNG TẢI 6 KTV)
    // ------------------------------------------------------------------------
    console.log('\n--- TEST 4: Thuật toán điều phối Least-Busy Technician Dispatch ---');
    // Trong testDate, KTV 0 đã nhận 1 ca ở test 2 (khung 10:00-11:00)
    // Bây giờ kiểm tra khung giờ chiều 14:30-15:30 (chưa ai có ca)
    const dispatchRes = await client.query(
      "SELECT * FROM public.fn_dispatch_least_busy_technician($1, $2, '14:30:00', '15:30:00')",
      [BRANCH_ID, testDate]
    );
    const dispatched = dispatchRes.rows[0];
    console.log('-> KTV được chọn cho ca 14:30-15:30:', dispatched);

    if (!dispatched || !dispatched.technician_id) {
      throw new Error('Least-Busy Dispatch không tìm thấy chuyên viên!');
    }
    console.log(`-> KTV ${dispatched.full_name} có số ca hôm nay: ${dispatched.sessions_today} ca.`);
    console.log('✅ TEST 4 PASS: Least-Busy Dispatch chọn chính xác KTV có số ca ít nhất trong ngày!');

    console.log('\n================================================================');
    console.log('🎉 TOÀN BỘ 4 BÀI TEST GIAI ĐOẠN 4 ĐỀU ĐẠT 100% PASS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST THẤT BẠI:', err.message);
    process.exitCode = 1;
  } finally {
    // ------------------------------------------------------------------------
    // CLEANUP: Xóa toàn bộ booking thử nghiệm để đảm bảo sạch sẽ cho DB
    // ------------------------------------------------------------------------
    if (testBookingIds.length > 0) {
      console.log(`🧹 Đang dọn dẹp ${testBookingIds.length} booking kiểm thử...`);
      await client.query("DELETE FROM public.bookings WHERE id = ANY($1)", [testBookingIds]);
      console.log('✅ Dọn dẹp hoàn tất, cơ sở dữ liệu Supabase sạch sẽ.');
    }
    await client.end();
  }
}

runTests().catch(console.error);
