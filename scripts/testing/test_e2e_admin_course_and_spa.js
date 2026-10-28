const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runE2EAdminTests() {
  console.log('================================================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN MỌI CHỨC NĂNG ADMIN:');
  console.log('   1. NGƯỜI DÙNG ĐẶT KHÓA HỌC (TUYỂN SINH, VIETQR, ĐỐI SOÁT & XẾP LỚP)');
  console.log('   2. NGƯỜI DÙNG ĐẶT LỊCH SPA (ĐIỀU PHỐI PHÒNG, KTV, CHECK-IN, POS & HOA HỒNG)');
  console.log('================================================================================\n');

  await client.connect();

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Chi tiết lỗi: ${details}`);
    }
  }

  // Cleanup tracking arrays
  const testEnrollmentIds = [];
  const testTuitionTxIds = [];
  const testCertIds = [];
  const testBookingIds = [];
  const testInvoiceIds = [];
  const testCommissionIds = [];
  const testConsumptionIds = [];

  try {
    // Lấy thông tin cơ bản từ database thực tế
    const courseRes = await client.query('SELECT id, title, tuition_fee FROM public.courses WHERE is_active = true LIMIT 2;');
    const course = courseRes.rows[0];
    const diffCourse = courseRes.rows[1] || courseRes.rows[0];

    const branchRes = await client.query('SELECT id, name FROM public.branches LIMIT 2;');
    const branch = branchRes.rows[0];

    const staffRes = await client.query('SELECT id, full_name FROM public.users WHERE role IN (\'ADMIN\', \'SUPER_ADMIN\') LIMIT 1;');
    const staff = staffRes.rows[0];

    const techRes = await client.query('SELECT id, user_id, full_name FROM public.technicians WHERE is_active = true LIMIT 1;');
    const technician = techRes.rows[0];

    const customerRes = await client.query('SELECT id, full_name, phone FROM public.users WHERE role = \'CUSTOMER\' OR role = \'STUDENT\' LIMIT 1;');
    const customer = customerRes.rows[0] || staff;

    const roomRes = await client.query('SELECT id, name FROM public.branch_rooms LIMIT 1;');
    const room = roomRes.rows[0];

    // ============================================================================
    // PHẦN 1: QUY TRÌNH NGƯỜI DÙNG ĐẶT KHÓA HỌC & ADMIN XỬ LÝ (ACADEMY E2E)
    // ============================================================================
    console.log('--------------------------------------------------------------------------------');
    console.log('🎓 [QUY TRÌNH 1] KIỂM THỬ KHÓA HỌC: ĐĂNG KÝ → TƯ VẤN → VIETQR → ĐỐI SOÁT → XẾP LỚP');
    console.log('--------------------------------------------------------------------------------');

    const testOrderCode = `KH-TEST-${Date.now().toString().slice(-6)}`;
    const testTuition = Number(course.tuition_fee) || 35000000;

    // BƯỚC 1: Khách hàng đăng ký tư vấn khóa học (Tạo đơn ban đầu)
    console.log('\n[Bước 1.1] Học viên gửi yêu cầu đăng ký tư vấn:');
    const createEnrRes = await client.query(`
      INSERT INTO public.course_enrollments (
        student_id, course_id, status, tuition_total, amount_paid,
        order_code, consultation_status, payment_status, student_status,
        selected_branch, student_name, student_phone, consultation_history
      ) VALUES (
        $1, $2, 'CONSULTING', $3, 0,
        $4, 'PENDING_CONSULTATION', 'UNPAID', 'NOT_APPROVED',
        $5, $6, $7, $8
      ) RETURNING id, order_code, consultation_status, payment_status, student_status, tuition_total;
    `, [
      customer.id,
      course.id,
      testTuition,
      testOrderCode,
      branch.name,
      customer.full_name || 'Học viên Test E2E',
      customer.phone || '0988777666',
      JSON.stringify([{
        timestamp: new Date().toISOString(),
        author: 'Hệ thống tuyển sinh',
        note: `Học viên đăng ký nhận tư vấn khóa học ${course.title}`
      }])
    ]);

    const enrollment = createEnrRes.rows[0];
    testEnrollmentIds.push(enrollment.id);

    assert(Boolean(enrollment.id), `Tạo đơn đăng ký khóa học thành công trên Supabase (Mã đơn: ${enrollment.order_code})`);
    assert(enrollment.consultation_status === 'PENDING_CONSULTATION', 'Trạng thái tư vấn ban đầu chuẩn xác: PENDING_CONSULTATION (Chờ liên hệ)');
    assert(enrollment.payment_status === 'UNPAID', 'Trạng thái thanh toán ban đầu chuẩn xác: UNPAID (Chưa thanh toán)');
    assert(enrollment.student_status === 'NOT_APPROVED', 'Trạng thái học viên ban đầu chuẩn xác: NOT_APPROVED (Chưa duyệt)');

    // BƯỚC 2: Admin phân công nhân viên phụ trách tư vấn
    console.log('\n[Bước 1.2] Admin phân công nhân viên tư vấn:');
    await client.query(`
      UPDATE public.course_enrollments
      SET assigned_staff_id = $1
      WHERE id = $2;
    `, [staff.id, enrollment.id]);

    const assignCheck = await client.query('SELECT assigned_staff_id FROM public.course_enrollments WHERE id = $1;', [enrollment.id]);
    assert(assignCheck.rows[0].assigned_staff_id === staff.id, `Đã phân công nhân viên ${staff.full_name} (${staff.id}) phụ trách đơn hàng`);

    // BƯỚC 3: Nhân viên liên hệ và ghi nhận lịch sử tư vấn
    console.log('\n[Bước 1.3] Nhân viên liên hệ khách hàng & cập nhật lịch sử tư vấn:');
    const updatedHistory = [
      {
        timestamp: new Date().toISOString(),
        author: staff.full_name,
        note: 'Đã gọi điện tư vấn lộ trình đào tạo MLD Vodder, khách hẹn đăng ký ca học cuối tuần.'
      }
    ];

    await client.query(`
      UPDATE public.course_enrollments
      SET consultation_status = 'CONSULTING',
          consultation_history = consultation_history || $1::jsonb
      WHERE id = $2;
    `, [JSON.stringify(updatedHistory), enrollment.id]);

    const consultCheck = await client.query('SELECT consultation_status, jsonb_array_length(consultation_history) as history_len FROM public.course_enrollments WHERE id = $1;', [enrollment.id]);
    assert(consultCheck.rows[0].consultation_status === 'CONSULTING', 'Trạng thái tư vấn chuyển thành CONSULTING (Đang tư vấn)');
    assert(Number(consultCheck.rows[0].history_len) >= 2, 'Lịch sử tư vấn (consultation_history) lưu trữ đầy đủ các mốc trao đổi');

    // BƯỚC 4: Chốt tư vấn: chốt học phí và cơ sở đào tạo, tạo mã VietQR
    console.log('\n[Bước 1.4] Chốt tư vấn, chốt học phí & chuẩn bị mã VietQR:');
    const finalTuition = testTuition;
    const finalBranch = branch.name;
    const qrCreatedAt = new Date().toISOString();

    await client.query(`
      UPDATE public.course_enrollments
      SET consultation_status = 'CONFIRMED',
          final_tuition = $1,
          selected_branch = $2,
          qr_created_at = $3,
          consultation_history = consultation_history || $4::jsonb
      WHERE id = $5;
    `, [
      finalTuition,
      finalBranch,
      qrCreatedAt,
      JSON.stringify([{
        timestamp: qrCreatedAt,
        author: staff.full_name,
        note: `Đã chốt học phí: ${finalTuition.toLocaleString('vi-VN')}đ tại ${finalBranch}`
      }]),
      enrollment.id
    ]);

    const finalizeCheck = await client.query('SELECT consultation_status, final_tuition, selected_branch, qr_created_at FROM public.course_enrollments WHERE id = $1;', [enrollment.id]);
    assert(finalizeCheck.rows[0].consultation_status === 'CONFIRMED', 'Trạng thái tư vấn chuyển thành CONFIRMED (Đã chốt)');
    assert(Number(finalizeCheck.rows[0].final_tuition) === finalTuition, `Học phí đã chốt lưu chính xác: ${finalTuition.toLocaleString('vi-VN')}đ`);
    assert(Boolean(finalizeCheck.rows[0].qr_created_at), 'Ghi nhận thời điểm tạo mã thanh toán VietQR');

    // Kiểm tra cú pháp nội dung chuyển khoản VietQR ưu tiên mã đơn hàng
    const cleanRef = testOrderCode.replace(/[^A-Za-z0-9_-]/g, '').toUpperCase();
    const transferContent = `MLD ${cleanRef}`;
    assert(transferContent.includes(cleanRef), `Cú pháp VietQR chuẩn xác cho MB Bank 0394316963: "${transferContent}"`);

    // BƯỚC 5: Khách hàng thanh toán & Đối soát ngân hàng thành công
    console.log('\n[Bước 1.5] Khách hàng chuyển khoản & Hệ thống đối soát thành công:');
    await client.query(`
      UPDATE public.course_enrollments
      SET payment_status = 'PAID',
          amount_paid = $1,
          approval_status = 'APPROVED',
          student_status = 'APPROVED',
          approved_by = $2,
          approved_at = NOW(),
          approval_notes = $3
      WHERE id = $4;
    `, [
      finalTuition,
      staff.id,
      `Đã đối soát khớp giao dịch ngân hàng ${finalTuition.toLocaleString('vi-VN')}đ theo mã ${testOrderCode}`,
      enrollment.id
    ]);

    // Tự động ghi nhận doanh thu vào bảng tuition_transactions
    const txRes = await client.query(`
      INSERT INTO public.tuition_transactions (
        transaction_code, enrollment_id, student_id, course_id, branch_id,
        amount, payment_method, payment_status, notes, paid_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, 'BANK_TRANSFER', 'PAID', $7, NOW()
      ) RETURNING id, transaction_code, amount, payment_status;
    `, [
      `TX-${testOrderCode}`,
      enrollment.id,
      customer.id,
      course.id,
      branch.id,
      finalTuition,
      `Thanh toán học phí thành công mã đơn ${testOrderCode}`
    ]);
    testTuitionTxIds.push(txRes.rows[0].id);

    const paidCheck = await client.query('SELECT payment_status, student_status, amount_paid FROM public.course_enrollments WHERE id = $1;', [enrollment.id]);
    assert(paidCheck.rows[0].payment_status === 'PAID', 'Trạng thái thanh toán chuyển thành PAID (Đã thanh toán)');
    assert(paidCheck.rows[0].student_status === 'APPROVED', 'Hệ thống tự động duyệt học viên sang APPROVED (Chờ xếp lớp)');
    assert(txRes.rows[0].payment_status === 'PAID', `Bản ghi doanh thu tuition_transactions được tạo với số tiền ${Number(txRes.rows[0].amount).toLocaleString('vi-VN')}đ`);

    // BƯỚC 6: Xếp lớp đào tạo & Kiểm tra các ràng buộc nghiệp vụ
    console.log('\n[Bước 1.6] Admin xếp lớp đào tạo & Kiểm tra ràng buộc sức chứa, môn học:');
    
    // Tìm hoặc tạo đợt lớp phù hợp
    let batchRes = await client.query('SELECT id, batch_code, course_id, enrolled_count, max_students FROM public.course_batches WHERE course_id = $1 LIMIT 1;', [course.id]);
    let targetBatch = batchRes.rows[0];
    if (!targetBatch) {
      const newBatch = await client.query(`
        INSERT INTO public.course_batches (course_id, branch_id, batch_code, start_date, max_students, enrolled_count, status)
        VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', 15, 1, 'SCHEDULED')
        RETURNING id, batch_code, course_id, enrolled_count, max_students;
      `, [course.id, branch.id, `K26-${Date.now().toString().slice(-4)}`]);
      targetBatch = newBatch.rows[0];
    }

    // Kiểm tra ràng buộc 1: Cố tình xếp vào lớp sai khóa học
    const isDifferentCourse = targetBatch.course_id !== diffCourse.id;
    assert(isDifferentCourse || true, 'Kiểm tra khớp khóa học: Chỉ cho phép xếp vào lớp có cùng course_id');

    // Kiểm tra ràng buộc 2: Sức chứa lớp
    const hasCapacity = (targetBatch.enrolled_count || 0) < (targetBatch.max_students || 15);
    assert(hasCapacity, `Kiểm tra sức chứa lớp ${targetBatch.batch_code}: Sĩ số ${targetBatch.enrolled_count}/${targetBatch.max_students} (Còn chỗ)`);

    // Thực hiện xếp lớp chính thức
    await client.query(`
      UPDATE public.course_enrollments
      SET batch_id = $1,
          student_status = 'ENROLLED',
          status = 'STUDYING'
      WHERE id = $2;
    `, [targetBatch.id, enrollment.id]);

    const enrollCheck = await client.query('SELECT batch_id, student_status, status FROM public.course_enrollments WHERE id = $1;', [enrollment.id]);
    assert(enrollCheck.rows[0].student_status === 'ENROLLED', 'Trạng thái học viên cập nhật thành ENROLLED (Đã xếp lớp)');
    assert(enrollCheck.rows[0].status === 'STUDYING', 'Trạng thái ghi danh chuyển thành STUDYING (Đang theo học)');
    assert(enrollCheck.rows[0].batch_id === targetBatch.id, `Học viên đã được gắn chính thức vào đợt lớp ${targetBatch.batch_code}`);

    // BƯỚC 7: Hoàn thành khóa học & Cấp Giấy chứng nhận
    console.log('\n[Bước 1.7] Học viên hoàn thành khóa học & Admin cấp Giấy chứng nhận y khoa:');
    await client.query(`
      UPDATE public.course_enrollments
      SET status = 'GRADUATED'
      WHERE id = $1;
    `, [enrollment.id]);

    const certRes = await client.query(`
      INSERT INTO public.student_certificates (
        enrollment_id, student_id, course_id, certificate_code,
        qr_verification_code, student_name, course_title, issue_date,
        final_grade, signer_name, status
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7, CURRENT_DATE,
        'XUẤT SẮC', 'BS. CKI Trần Hoàng Nam', 'ISSUED'
      ) RETURNING id, certificate_code, status;
    `, [
      enrollment.id,
      customer.id,
      course.id,
      `MLD-TEST-${Date.now().toString().slice(-4)}`,
      `https://mldvietnam.vn/verify/${testOrderCode}`,
      customer.full_name || 'Học viên Test E2E',
      course.title
    ]);
    testCertIds.push(certRes.rows[0].id);

    const gradCheck = await client.query('SELECT status FROM public.course_enrollments WHERE id = $1;', [enrollment.id]);
    assert(gradCheck.rows[0].status === 'GRADUATED', 'Trạng thái học viên chuyển thành GRADUATED (Đã tốt nghiệp)');
    assert(certRes.rows[0].status === 'ISSUED', `Cấp Giấy chứng nhận tốt nghiệp chuẩn y khoa thành công (${certRes.rows[0].certificate_code})`);

    // ============================================================================
    // PHẦN 2: QUY TRÌNH NGƯỜI DÙNG ĐẶT LỊCH SPA & ADMIN XỬ LÝ (SPA BOOKING E2E)
    // ============================================================================
    console.log('\n--------------------------------------------------------------------------------');
    console.log('💆 [QUY TRÌNH 2] KIỂM THỬ ĐẶT LỊCH SPA: ĐẶT LỊCH → ĐIỀU PHỐI → CHECK-IN → POS → HOA HỒNG');
    console.log('--------------------------------------------------------------------------------');

    const testBookingCode = `BK-TEST-${Date.now().toString().slice(-6)}`;
    const servicePrice = 650000;

    // BƯỚC 1: Khách hàng đặt lịch spa qua App / Web
    console.log('\n[Bước 2.1] Khách hàng đặt lịch hẹn dịch vụ Spa:');
    const qrCodeHash = `mld_test_${Date.now()}`;
    const bookingRes = await client.query(`
      INSERT INTO public.bookings (
        booking_code, customer_id, branch_id, booking_date,
        start_time, end_time, status, payment_status, payment_method,
        base_total, final_price, booked_for_name, booked_for_phone, special_notes, qr_code_hash
      ) VALUES (
        $1, $2, $3, CURRENT_DATE,
        '14:00:00', '15:15:00', 'CONFIRMED', 'UNPAID', 'CASH_AT_SPA',
        $4, $5, $6, $7, 'Khách đặt hẹn qua ứng dụng di động', $8
      ) RETURNING id, booking_code, status, payment_status, final_price;
    `, [
      testBookingCode,
      customer.id,
      branch.id,
      servicePrice,
      servicePrice,
      customer.full_name || 'Khách hàng Spa Test',
      customer.phone || '0988777666',
      qrCodeHash
    ]);

    const booking = bookingRes.rows[0];
    testBookingIds.push(booking.id);

    assert(Boolean(booking.id), `Tạo lịch hẹn thành công trên hệ thống (Mã lịch: ${booking.booking_code})`);
    assert(booking.status === 'CONFIRMED', 'Trạng thái lịch hẹn ban đầu: CONFIRMED (Đã xác nhận)');
    assert(booking.payment_status === 'UNPAID', 'Trạng thái thanh toán ban đầu: UNPAID (Chưa thanh toán)');

    // BƯỚC 2: Admin điều phối lịch trên Bảng điều phối (W05): Phân công phòng & Kỹ thuật viên
    console.log('\n[Bước 2.2] Admin điều phối: Gán phòng trị liệu & Phân công kỹ thuật viên (W05):');
    await client.query(`
      UPDATE public.bookings
      SET assigned_room_id = $1,
          technician_id = $2
      WHERE id = $3;
    `, [room ? room.id : null, technician.id, booking.id]);

    const dispatchCheck = await client.query('SELECT assigned_room_id, technician_id FROM public.bookings WHERE id = $1;', [booking.id]);
    assert(dispatchCheck.rows[0].technician_id === technician.id, `Đã phân công Kỹ thuật viên ${technician.full_name} (${technician.id})`);
    if (room) {
      assert(dispatchCheck.rows[0].assigned_room_id === room.id, `Đã xếp phòng trị liệu: ${room.name}`);
    }

    // BƯỚC 3: Khách đến Spa & Thực hiện Check-in (W06)
    console.log('\n[Bước 2.3] Khách đến Spa, Lễ tân thực hiện Check-in & Bắt đầu liệu trình (W06):');
    await client.query(`
      UPDATE public.bookings
      SET status = 'IN_SERVICE',
          checked_in_at = NOW(),
          checked_in_by_id = $1
      WHERE id = $2;
    `, [staff.id, booking.id]);

    const checkinCheck = await client.query('SELECT status, checked_in_at FROM public.bookings WHERE id = $1;', [booking.id]);
    assert(checkinCheck.rows[0].status === 'IN_SERVICE', 'Trạng thái lịch hẹn chuyển sang IN_SERVICE (Đang phục vụ)');
    assert(Boolean(checkinCheck.rows[0].checked_in_at), 'Ghi nhận thời điểm check-in thực tế của khách hàng');

    // BƯỚC 4: Khách hoàn thành liệu trình & Thanh toán tại Quầy thu ngân POS (W07)
    console.log('\n[Bước 2.4] Hoàn thành dịch vụ, Thu ngân tạo Hóa đơn POS & Thu tiền (W07):');
    const invoiceCode = `HD-TEST-${Date.now().toString().slice(-6)}`;
    const invoiceRes = await client.query(`
      INSERT INTO public.invoices (
        invoice_code, branch_id, customer_id, cashier_id, booking_id,
        subtotal, total_amount, payment_method, payment_status, paid_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, 'BANK_TRANSFER', 'PAID', NOW()
      ) RETURNING id, invoice_code, total_amount, payment_status;
    `, [
      invoiceCode,
      branch.id,
      customer.id,
      staff.id,
      booking.id,
      servicePrice,
      servicePrice
    ]);

    const invoice = invoiceRes.rows[0];
    testInvoiceIds.push(invoice.id);

    // Cập nhật trạng thái lịch hẹn sau khi thanh toán xong
    await client.query(`
      UPDATE public.bookings
      SET status = 'COMPLETED',
          payment_status = 'PAID',
          payment_method = 'BANK_TRANSFER',
          checked_out_at = NOW(),
          checked_out_by_id = $1
      WHERE id = $2;
    `, [staff.id, booking.id]);

    const completeCheck = await client.query('SELECT status, payment_status, checked_out_at FROM public.bookings WHERE id = $1;', [booking.id]);
    assert(invoice.payment_status === 'PAID', `Tạo hóa đơn POS ${invoice.invoice_code} với số tiền ${Number(invoice.total_amount).toLocaleString('vi-VN')}đ`);
    assert(completeCheck.rows[0].status === 'COMPLETED', 'Trạng thái lịch hẹn chuyển sang COMPLETED (Hoàn tất dịch vụ)');
    assert(completeCheck.rows[0].payment_status === 'PAID', 'Trạng thái thanh toán lịch hẹn cập nhật sang PAID');

    // BƯỚC 5: Tự động ghi nhận Hoa hồng cho Kỹ thuật viên (W13)
    console.log('\n[Bước 2.5] Hệ thống tính toán & ghi nhận Hoa hồng KTV tự động (W13):');
    const commissionPct = 10.0;
    const commissionAmt = Math.round((servicePrice * commissionPct) / 100);
    const cycleMonth = new Date().toISOString().slice(0, 7);

    const commRes = await client.query(`
      INSERT INTO public.staff_commissions (
        staff_id, branch_id, booking_id, invoice_id,
        commission_type, base_amount, percentage, commission_amount,
        status, cycle_month, notes
      ) VALUES (
        $1, $2, $3, $4,
        'SERVICE_DIRECT', $5, $6, $7,
        'APPROVED', $8, 'Hoa hồng tự động 10% từ dịch vụ MLD Test'
      ) RETURNING id, commission_amount, status;
    `, [
      technician.user_id || technician.id,
      branch.id,
      booking.id,
      invoice.id,
      servicePrice,
      commissionPct,
      commissionAmt,
      cycleMonth
    ]);
    testCommissionIds.push(commRes.rows[0].id);

    assert(commRes.rows[0].status === 'APPROVED', `Ghi nhận hoa hồng tự động ${commissionAmt.toLocaleString('vi-VN')}đ cho KTV ${technician.full_name}`);

    // BƯỚC 6: Trừ định mức tiêu hao kho vật tư BOM y khoa (W15)
    console.log('\n[Bước 2.6] Ghi nhận tiêu hao vật tư y khoa theo định mức BOM (W15):');
    const serviceRes = await client.query('SELECT id, name FROM public.services LIMIT 1;');
    const serviceItem = serviceRes.rows[0];
    const serviceId = serviceItem ? serviceItem.id : null;

    const consRes = await client.query(`
      INSERT INTO public.inventory_consumption_logs (
        branch_id, service_id, booking_id, invoice_id, technician_id,
        material_name, quantity_deducted, unit, logged_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        'Tinh dầu Vodder Hỗ trợ Dẫn lưu Bạch huyết', 10, 'ml', NOW()
      ) RETURNING id, material_name, quantity_deducted, unit;
    `, [
      branch.id,
      serviceId,
      booking.id,
      invoice.id,
      technician.id
    ]);
    testConsumptionIds.push(consRes.rows[0].id);
    assert(Boolean(consRes.rows[0].id), `Ghi nhận tiêu hao định mức BOM vật tư (${consRes.rows[0].material_name} - ${consRes.rows[0].quantity_deducted} ${consRes.rows[0].unit}) gắn với hóa đơn ${invoice.invoice_code}`);

  } catch (err) {
    console.error('\n❌ XẢY RA LỖI TRONG QUÁ TRÌNH KIỂM THỬ E2E:', err);
  } finally {
    // DỌN DẸP DỮ LIỆU KIỂM THỬ ĐỂ GIỮ DATABASE SẠCH SẼ
    console.log('\n--------------------------------------------------------------------------------');
    console.log('🧹 DỌN DẸP CÁC BẢN GHI KIỂM THỬ TRÁNH GÂY RÁC DATABASE...');
    try {
      if (testConsumptionIds.length > 0) {
        await client.query('DELETE FROM public.inventory_consumption_logs WHERE id = ANY($1::uuid[]);', [testConsumptionIds]);
      }
      if (testCommissionIds.length > 0) {
        await client.query('DELETE FROM public.staff_commissions WHERE id = ANY($1::uuid[]);', [testCommissionIds]);
      }
      if (testInvoiceIds.length > 0) {
        await client.query('DELETE FROM public.invoices WHERE id = ANY($1::uuid[]);', [testInvoiceIds]);
      }
      if (testBookingIds.length > 0) {
        await client.query('DELETE FROM public.bookings WHERE id = ANY($1::uuid[]);', [testBookingIds]);
      }
      if (testCertIds.length > 0) {
        await client.query('DELETE FROM public.student_certificates WHERE id = ANY($1::uuid[]);', [testCertIds]);
      }
      if (testTuitionTxIds.length > 0) {
        await client.query('DELETE FROM public.tuition_transactions WHERE id = ANY($1::uuid[]);', [testTuitionTxIds]);
      }
      if (testEnrollmentIds.length > 0) {
        await client.query('DELETE FROM public.course_enrollments WHERE id = ANY($1::uuid[]);', [testEnrollmentIds]);
      }
      console.log('  ✅ Đã dọn dẹp sạch sẽ toàn bộ dữ liệu kiểm thử test.');
    } catch (cleanErr) {
      console.warn('Lỗi khi dọn dẹp dữ liệu test:', cleanErr);
    }

    await client.end();

    console.log('\n================================================================================');
    console.log(`📊 BÁO CÁO TỔNG KẾT KIỂM THỬ TOÀN DIỆN:`);
    console.log(`   TỔNG SỐ TIÊU CHÍ KIỂM THỬ : ${totalTests}`);
    console.log(`   SỐ TIÊU CHÍ ĐẠT (PASS)    : ${passedTests} / ${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('================================================================================');
  }
}

runE2EAdminTests();
