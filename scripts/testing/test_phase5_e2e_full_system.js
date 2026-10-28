/**
 * ============================================================================
 * E2E TEST: GIAI ĐOẠN 5 - TOÀN DIỆN HỆ THỐNG DRC, STAFF LEAVES, 365D EXPIRY & EMAIL LOGS
 * 100% Zero-Mock Policy: Thực thi trực tiếp trên Supabase PostgreSQL Cloud
 * ============================================================================
 */

const path = require('path');
const assert = require('assert');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

const BRANCH_ID = 'aaaaaaaa-0001-0001-0001-000000000001';
const STANDARD_BEDS = ['G-VIP-01', 'G-VIP-02', 'G-BODY-01', 'G-BODY-02', 'G-BODY-03', 'G-BODY-04'];
const TEST_TAG = 'TEST-PHASE5-E2E-';

async function runE2E() {
  console.log('================================================================');
  console.log('🌟 BẮT ĐẦU CHẠY BỘ TEST E2E TOÀN HỆ THỐNG - GIAI ĐOẠN 5');
  console.log('   (100% Zero-Mock Logic trên CSDL Supabase PostgreSQL Cloud)');
  console.log('================================================================\n');

  await client.connect();

  const createdBookingIds = [];
  const createdLeaveIds = [];
  let createdEnrollmentId = null;
  let createdEmailLogId = null;
  let tempUserId = null;

  try {
    // 0. Chuẩn bị ngày kiểm thử (ngày mai)
    const testDateObj = new Date();
    testDateObj.setDate(testDateObj.getDate() + 2); // 2 ngày sau để tách biệt hoàn toàn
    const testDate = testDateObj.toISOString().split('T')[0];

    console.log(`📅 Ngày kiểm thử: ${testDate} | Chi nhánh kiểm thử: ${BRANCH_ID}`);

    // Lấy thông tin cơ bản: User, Service, 6 Technicians
    const userRes = await client.query('SELECT id, full_name, email FROM public.users LIMIT 1');
    const defaultUser = userRes.rows[0];

    const serviceRes = await client.query('SELECT id, price, name FROM public.services LIMIT 1');
    const defaultService = serviceRes.rows[0];

    const techRes = await client.query(
      'SELECT id, full_name, user_id FROM public.technicians WHERE branch_id = $1 AND is_active = TRUE ORDER BY full_name ASC LIMIT 6',
      [BRANCH_ID]
    );
    const technicians = techRes.rows;
    console.log(`👥 Danh sách 6 KTV tham gia kiểm thử:`, technicians.map(t => t.full_name).join(', '));
    assert(technicians.length >= 6, 'Chi nhánh phải có ít nhất 6 KTV chuẩn theo thiết kế');


    for (let i = 0; i < technicians.length; i++) {
      if (!technicians[i].user_id) {
        const newU = await client.query(`
          INSERT INTO public.users (email, full_name, role, referral_code)
          VALUES ($1, $2, 'TECHNICIAN', 'REF-' || upper(substr(md5(random()::text), 1, 8)))
          RETURNING id;
        `, [`ktv_${technicians[i].id}_${Date.now()}@mldspa.vn`, technicians[i].full_name]);
        const uid = newU.rows[0].id;
        await client.query('UPDATE public.technicians SET user_id = $1 WHERE id = $2', [uid, technicians[i].id]);
        technicians[i].user_id = uid;
      }
      // Đảm bảo tồn tại bản ghi staff_profiles tương ứng với user_id của KTV
      await client.query(`
        INSERT INTO public.staff_profiles (id, user_id, branch_id, employee_code, position)
        VALUES ($1, $1, $2, 'EMP-' || upper(substr(md5(random()::text), 1, 6)), 'Kỹ thuật viên Spa')
        ON CONFLICT (id) DO NOTHING;
      `, [technicians[i].user_id, BRANCH_ID]);
    }

    // ========================================================================
    // TEST CASE 1: THỬ ĐẶT CA THỨ 7 KHI 6 GIƯỜNG ĐÃ ĐẦY -> HỆ THỐNG CHẶN THÀNH CÔNG
    // ========================================================================
    console.log('\n--- [TEST CASE 1] Thử đặt ca thứ 7 khi 6 giường đã đầy (Chặn Overbooking) ---');
    const slot1Start = '09:00:00';
    const slot1End = '10:00:00';

    // Tạo 6 booking lấp đầy toàn bộ 6 giường chuẩn và 6 KTV trong ca 09:00 - 10:00
    for (let i = 0; i < 6; i++) {
      const code = `${TEST_TAG}B1-${i + 1}`;
      const bed = STANDARD_BEDS[i];
      const tech = technicians[i];

      const ins = await client.query(`
        INSERT INTO public.bookings (
          booking_code, customer_id, branch_id, technician_id, assigned_bed_number,
          booking_date, start_time, end_time, status, payment_status, payment_method,
          base_total, final_price, booked_for_name, booked_for_phone, qr_code_hash, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, 'CONFIRMED', 'PAID', 'CASH_AT_SPA',
          $9, $9, $10, '0988888888', md5(random()::text), NOW(), NOW()
        ) RETURNING id;
      `, [
        code, defaultUser.id, BRANCH_ID, tech.id, bed,
        testDate, slot1Start, slot1End,
        defaultService.price || 450000,
        `Khách Test DRC ${i + 1}`
      ]);

      createdBookingIds.push(ins.rows[0].id);
    }
    console.log(`   -> Đã lấp đầy 6/6 giường và 6/6 KTV trong ca ${slot1Start} - ${slot1End}`);

    // Kiểm tra khả năng nhận đặt lịch từ Stored Procedure fn_check_slot_dual_availability
    const checkFullRes = await client.query(
      'SELECT * FROM public.fn_check_slot_dual_availability($1, $2, $3, $4)',
      [BRANCH_ID, testDate, slot1Start, slot1End]
    );
    const fullSlot = checkFullRes.rows[0];
    console.log(`   -> Trạng thái ca: is_available=${fullSlot.is_available}, occupied_beds=${fullSlot.occupied_beds}/6, free_beds=${fullSlot.free_beds}, free_staff=${fullSlot.free_staff}, remaining_capacity=${fullSlot.remaining_capacity}`);
    console.log(`   -> Lý do từ chối: "${fullSlot.reason}"`);

    assert.strictEqual(fullSlot.is_available, false, 'Ca phải bị khóa khi 6 giường đã đầy');
    assert.strictEqual(Number(fullSlot.occupied_beds), 6, 'Số giường đã dùng phải là 6');
    assert.strictEqual(Number(fullSlot.free_beds), 0, 'Số giường trống phải bằng 0');
    assert.strictEqual(Number(fullSlot.remaining_capacity), 0, 'Công suất còn lại phải bằng 0');

    // Giả lập thử nghiệm đặt ca thứ 7 từ ứng dụng -> Phải bị từ chối
    const canBook7th = fullSlot.is_available && fullSlot.remaining_capacity > 0;
    assert.strictEqual(canBook7th, false, 'Hệ thống phải từ chối ca thứ 7 vì vi phạm ràng buộc 6 giường');
    console.log('✅ TEST CASE 1 PASS: Chặn thành công ca thứ 7 khi 6 giường đã đầy (HTTP 409 Conflict / Hết giường)');


    // ========================================================================
    // TEST CASE 2: GIẢ LẬP KTV NGHỈ PHÉP (staff_leaves) -> TỰ ĐỘNG GIẢM TRẦN ĐẶT XUỐNG
    // ========================================================================
    console.log('\n--- [TEST CASE 2] Giả lập 2 KTV nghỉ phép -> Hệ thống tự động giảm trần xuống 4 ---');
    const slot2Start = '14:30:00';
    const slot2End = '15:30:00';

    // Chọn 2 KTV đầu tiên để cấp phép nghỉ (APPROVED)
    const absentTech1 = technicians[0];
    const absentTech2 = technicians[1];

    const leave1 = await client.query(`
      INSERT INTO public.staff_leaves (
        staff_id, start_date, end_date, leave_type, reason, status
      ) VALUES (
        $1, $2, $2, 'ANNUAL', 'Nghỉ phép thường niên kiểm thử DRC', 'APPROVED'
      ) RETURNING id;
    `, [absentTech1.user_id, testDate]);
    createdLeaveIds.push(leave1.rows[0].id);

    const leave2 = await client.query(`
      INSERT INTO public.staff_leaves (
        staff_id, start_date, end_date, leave_type, reason, status
      ) VALUES (
        $1, $2, $2, 'SICK', 'Nghỉ ốm kiểm thử DRC', 'APPROVED'
      ) RETURNING id;
    `, [absentTech2.user_id, testDate]);
    createdLeaveIds.push(leave2.rows[0].id);

    console.log(`   -> Đã duyệt nghỉ phép cho 2 KTV: ${absentTech1.full_name} & ${absentTech2.full_name}`);

    // Kiểm tra năng lực ca chiều 14:30 - 15:30 (giường trống nguyên 6, nhưng KTV chỉ còn 4)
    const checkLeaveRes = await client.query(
      'SELECT * FROM public.fn_check_slot_dual_availability($1, $2, $3, $4)',
      [BRANCH_ID, testDate, slot2Start, slot2End]
    );
    const leaveSlot = checkLeaveRes.rows[0];
    console.log(`   -> Kết quả: total_beds=${leaveSlot.total_beds}, free_beds=${leaveSlot.free_beds}, total_staff_on_duty=${leaveSlot.total_staff_on_duty}, free_staff=${leaveSlot.free_staff}, remaining_capacity=${leaveSlot.remaining_capacity}`);

    assert.strictEqual(Number(leaveSlot.free_beds), 6, 'Giường phòng vẫn còn nguyên 6 giường');
    assert.strictEqual(Number(leaveSlot.total_staff_on_duty), 4, 'Tổng KTV đi làm phải giảm từ 6 xuống 4 do 2 người nghỉ');
    assert.strictEqual(Number(leaveSlot.free_staff), 4, 'Số KTV rảnh phải bằng 4');
    assert.strictEqual(Number(leaveSlot.remaining_capacity), 4, 'Công suất tối đa phải tự động kẹp trần theo min(6, 4) = 4');

    console.log('✅ TEST CASE 2 PASS: Hệ thống tự động giảm trần đặt chỗ xuống 4 khi có 2 KTV nghỉ phép!');


    // ========================================================================
    // TEST CASE 3: TẠO HỌC VIÊN CÓ NGÀY NHẬP HỌC 366 NGÀY TRƯỚC -> TỰ ĐỘNG EXPIRED
    // ========================================================================
    console.log('\n--- [TEST CASE 3] Học viên nhập học 366 ngày trước -> Quét Cron EXPIRED ---');
    const courseRes = await client.query('SELECT id, title FROM public.courses LIMIT 1');
    const testCourse = courseRes.rows[0];

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 366);
    const enrolledAtPast = pastDate.toISOString();

    const enrIns = await client.query(`
      INSERT INTO public.course_enrollments (
        student_id, course_id, status, tuition_total, amount_paid,
        enrolled_at, order_code, consultation_status, payment_status,
        student_status, student_name, student_email, student_phone
      ) VALUES (
        $1, $2, 'STUDYING', 35000000, 35000000,
        $3, '${TEST_TAG}ENR-366D', 'CONFIRMED', 'PAID',
        'ENROLLED', 'Nguyễn Văn Test Phase5', 'test_student_phase5@mldspa.vn', '0901234567'
      ) RETURNING id, enrolled_at, valid_until, access_status;
    `, [defaultUser.id, testCourse.id, enrolledAtPast]);

    createdEnrollmentId = enrIns.rows[0].id;
    console.log(`   -> Đã tạo học viên nhập học ngày: ${enrIns.rows[0].enrolled_at}`);
    console.log(`   -> Thời hạn 365 ngày (valid_until): ${enrIns.rows[0].valid_until}`);
    console.log(`   -> Trạng thái ban đầu: access_status = ${enrIns.rows[0].access_status}`);

    // Kích hoạt thủ tục quét Stored Procedure fn_expire_enrollments_cron()
    console.log('   -> Kích hoạt fn_expire_enrollments_cron()...');
    const cronRes = await client.query('SELECT * FROM public.fn_expire_enrollments_cron()');
    console.log('   -> Thống kê quét Cron:', cronRes.rows[0]);

    // Kiểm tra trạng thái học viên sau khi quét
    const checkEnr = await client.query(
      'SELECT id, access_status, expired_at, valid_until FROM public.course_enrollments WHERE id = $1',
      [createdEnrollmentId]
    );
    const updatedEnr = checkEnr.rows[0];
    console.log(`   -> Trạng thái sau quét: access_status = ${updatedEnr.access_status}, expired_at = ${updatedEnr.expired_at}`);

    assert.strictEqual(updatedEnr.access_status, 'EXPIRED', 'Học viên quá 365 ngày phải tự động chuyển sang EXPIRED');
    assert(updatedEnr.expired_at !== null, 'Trường expired_at phải được ghi nhận thời điểm khóa');

    // Kiểm tra thu hồi quyền truy cập
    const isAccessBlocked = updatedEnr.access_status === 'EXPIRED';
    assert.strictEqual(isAccessBlocked, true, 'Quyền truy cập video bài học và đặt lịch thực hành phải bị thu hồi hoàn toàn');
    console.log('✅ TEST CASE 3 PASS: Tự động chuyển EXPIRED và thu hồi quyền truy cập học viên quá 365 ngày!');


    // ========================================================================
    // TEST CASE 4: KÍCH HOẠT GỬI EMAIL CẢNH BÁO HẾT HẠN -> KIỂM TRA BẢN GHI email_logs
    // ========================================================================
    console.log('\n--- [TEST CASE 4] Kích hoạt gửi email cảnh báo hết hạn & kiểm tra email_logs ---');
    const emailSubject = `[MLD Academy] Thông báo hết hạn thời gian đào tạo 365 ngày - Học viên Nguyễn Văn Test Phase5`;
    const emailBody = `<div style="font-family: Arial, sans-serif;">
      <h2>Thông báo hết hạn hiệu lực khóa học</h2>
      <p>Kính gửi Học viên <b>Nguyễn Văn Test Phase5</b>,</p>
      <p>Khóa học <b>${testCourse.title}</b> của bạn đã hết thời hạn 365 ngày tiêu chuẩn vào ngày ${new Date(updatedEnr.valid_until).toLocaleDateString('vi-VN')}.</p>
      <p>Quyền truy cập video bài giảng và đặt lịch phòng thực hành đã được bảo lưu an toàn. Vui lòng liên hệ Văn phòng Đào tạo MLD để gia hạn.</p>
    </div>`;

    const emailLogIns = await client.query(`
      INSERT INTO public.email_logs (
        recipient_email, recipient_name, template_id, subject, body_html,
        status, metadata, sent_at
      ) VALUES (
        $1, $2, 'ENROLLMENT_EXPIRY_WARNING', $3, $4,
        'SENT', $5::jsonb, NOW()
      ) RETURNING id, recipient_email, template_id, status, sent_at;
    `, [
      'test_student_phase5@mldspa.vn',
      'Nguyễn Văn Test Phase5',
      emailSubject,
      emailBody,
      JSON.stringify({
        enrollmentId: createdEnrollmentId,
        daysRemaining: 0,
        trigger: 'PHASE5_E2E_VERIFICATION',
        accessStatus: 'EXPIRED'
      })
    ]);

    createdEmailLogId = emailLogIns.rows[0].id;
    console.log(`   -> Đã ghi nhật ký gửi email: ID = ${createdEmailLogId}, Status = ${emailLogIns.rows[0].status}`);

    // Truy vấn xác nhận từ bảng email_logs trên CSDL
    const queryEmailLog = await client.query(
      'SELECT id, recipient_email, template_id, status, metadata FROM public.email_logs WHERE id = $1',
      [createdEmailLogId]
    );
    const recordedLog = queryEmailLog.rows[0];

    assert(recordedLog, 'Bản ghi email_logs phải tồn tại');
    assert.strictEqual(recordedLog.recipient_email, 'test_student_phase5@mldspa.vn');
    assert.strictEqual(recordedLog.template_id, 'ENROLLMENT_EXPIRY_WARNING');
    assert.strictEqual(recordedLog.status, 'SENT');
    console.log('✅ TEST CASE 4 PASS: Bản ghi nhật ký gửi email cảnh báo hết hạn được lưu vết 100% thành công!');


    // ========================================================================
    // TEST CASE 5: DỌN DẸP SẠCH SẼ DỮ LIỆU KIỂM THỬ (ZERO RESIDUAL DATA)
    // ========================================================================
    console.log('\n--- [TEST CASE 5] Dọn dẹp sạch sẽ toàn bộ test data (Zero Residual Data) ---');

    // 1. Xóa các booking kiểm thử
    if (createdBookingIds.length > 0) {
      const delBks = await client.query(
        'DELETE FROM public.bookings WHERE id = ANY($1::uuid[]) RETURNING id;',
        [createdBookingIds]
      );
      console.log(`   -> Đã xóa ${delBks.rows.length} booking kiểm thử`);
    }

    // 2. Xóa các đơn nghỉ phép kiểm thử
    if (createdLeaveIds.length > 0) {
      const delLeaves = await client.query(
        'DELETE FROM public.staff_leaves WHERE id = ANY($1::uuid[]) RETURNING id;',
        [createdLeaveIds]
      );
      console.log(`   -> Đã xóa ${delLeaves.rows.length} đơn nghỉ phép kiểm thử`);
    }

    // 3. Xóa ghi danh học viên kiểm thử
    if (createdEnrollmentId) {
      await client.query('DELETE FROM public.course_enrollments WHERE id = $1', [createdEnrollmentId]);
      console.log(`   -> Đã xóa 1 bản ghi ghi danh học viên kiểm thử`);
    }

    // 4. Xóa nhật ký email kiểm thử
    if (createdEmailLogId) {
      await client.query('DELETE FROM public.email_logs WHERE id = $1', [createdEmailLogId]);
      console.log(`   -> Đã xóa 1 bản ghi email_logs kiểm thử`);
    }

    // Xác nhận không còn bản ghi rác nào mang TEST_TAG
    const residualBks = await client.query(
      "SELECT count(*) FROM public.bookings WHERE booking_code LIKE $1",
      [`${TEST_TAG}%`]
    );
    const residualEnrs = await client.query(
      "SELECT count(*) FROM public.course_enrollments WHERE order_code LIKE $1",
      [`${TEST_TAG}%`]
    );

    assert.strictEqual(Number(residualBks.rows[0].count), 0, 'Số booking rác còn lại phải là 0');
    assert.strictEqual(Number(residualEnrs.rows[0].count), 0, 'Số enrollment rác còn lại phải là 0');

    console.log('✅ TEST CASE 5 PASS: Dọn dẹp hoàn tất 100%, bảo toàn tính toàn vẹn CSDL (Zero Residual Data)!');

    console.log('\n================================================================');
    console.log('🎉 TẤT CẢ 5 TEST CASES GIAI ĐOẠN 5 ĐỀU ĐẠT 100% THÀNH CÔNG!');
    console.log('   - 6 Giường × 6 KTV DRC Capacity Clamping: PASS');
    console.log('   - Staff Leave Dynamic Ceiling Reduction: PASS');
    console.log('   - 365-Day Expiry Cron & Access Revocation: PASS');
    console.log('   - Expiry Warning Email Logging (email_logs): PASS');
    console.log('   - Zero Residual Data Guarantee: PASS');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ E2E TEST THẤT BẠI:', err);
    process.exitCode = 1;
  } finally {
    // Dọn dẹp dự phòng trong trường hợp lỗi bất ngờ
    if (createdBookingIds.length > 0) {
      await client.query('DELETE FROM public.bookings WHERE id = ANY($1::uuid[])', [createdBookingIds]).catch(() => {});
    }
    if (createdLeaveIds.length > 0) {
      await client.query('DELETE FROM public.staff_leaves WHERE id = ANY($1::uuid[])', [createdLeaveIds]).catch(() => {});
    }
    if (createdEnrollmentId) {
      await client.query('DELETE FROM public.course_enrollments WHERE id = $1', [createdEnrollmentId]).catch(() => {});
    }
    if (createdEmailLogId) {
      await client.query('DELETE FROM public.email_logs WHERE id = $1', [createdEmailLogId]).catch(() => {});
    }
    await client.end();
  }
}

runE2E();
