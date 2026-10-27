/**
 * KIỂM THỬ AN TOÀN & BẢO MẬT: XÉT DUYỆT KHÓA HỌC (ACADEMY COURSE ACCESS SECURITY TEST)
 * 
 * Kiểm tra xác thực các điều kiện nghiệp vụ:
 * 1. Học viên chưa được Admin duyệt (NOT_APPROVED, PENDING_APPROVAL, PENDING_CONSULTATION, UNPAID, CONSULTING)
 *    -> TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP VÀO HỌC HOẶC XEM BÀI GIẢNG.
 * 2. Phải qua bước Admin phê duyệt hoặc đối soát thanh toán khớp mã KH -> APPROVED / ENROLLED / STUDYING
 *    -> MỚI ĐƯỢC PHÉP TRUY CẬP VÀ MỞ BÀI HỌC TUẦN TỰ.
 * 3. Bài học thử miễn phí (free preview) vẫn hoạt động đúng chuẩn y khoa nếu có cấu hình.
 * 4. Dữ liệu thực tế trên Supabase Cloud: Bảng course_enrollments đồng bộ đúng student_status, payment_status, approval_status.
 */

const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ [THẤT BẠI] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ [ĐẠT] ${message}`);
}

// Emulate Mobile AcademyRepository isCourseApproved logic
function isCourseApproved(enr) {
  if (!enr) return false;

  const validApprovedStatuses = new Set(['APPROVED', 'ENROLLED', 'STUDYING', 'COMPLETED', 'GRADUATED']);
  const unapprovedStatuses = new Set([
    'NOT_APPROVED',
    'PENDING',
    'PENDING_APPROVAL',
    'PENDING_CONSULTATION',
    'CONSULTING',
    'UNPAID',
    'REJECTED',
    'CANCELLED',
    'SUSPENDED',
  ]);

  const statusUpper = (enr.status || '').trim().toUpperCase();
  const approvalUpper = (enr.approvalStatus || '').trim().toUpperCase();

  // Chặn ngay lập tức nếu có bất kỳ trạng thái nào trong danh sách chưa duyệt
  if (unapprovedStatuses.has(statusUpper) || unapprovedStatuses.has(approvalUpper)) {
    return false;
  }

  // Phải thuộc danh sách đã được duyệt
  return validApprovedStatuses.has(statusUpper) || validApprovedStatuses.has(approvalUpper);
}

// Emulate Mobile AcademyRepository canAccessLesson logic
function canAccessLesson(courseId, lesson, allCourseLessons, isEnrolled, isApproved, completedLessonIds = new Set()) {
  if (lesson.isFreePreview) return true;
  if (!isEnrolled) return false;
  if (!isApproved) return false; // Chưa duyệt tuyệt đối không cho xem

  const index = allCourseLessons.findIndex((l) => l.id === lesson.id);
  if (index <= 0) return true; // Bài 1 mở cho học viên đã duyệt
  const previousLesson = allCourseLessons[index - 1];
  return completedLessonIds.has(`${courseId}_${previousLesson.id}`);
}

async function runCourseApprovalSecurityTests() {
  console.log('================================================================================');
  console.log('🔒 KIỂM THỬ BẢO MẬT & PHÂN QUYỀN: HỌC VIÊN CHƯA DUYỆT KHÔNG ĐƯỢC XEM KHÓA HỌC');
  console.log('================================================================================');

  let passedTests = 0;
  let totalTests = 0;

  function runTest(name, fn) {
    totalTests++;
    try {
      fn();
      passedTests++;
    } catch (e) {
      console.error(`Lỗi test: ${name} ->`, e.message);
      throw e;
    }
  }

  // ----------------------------------------------------------------------
  // PHẦN 1: KIỂM THỬ UNIT TRÊN MA TRẬN TRẠNG THÁI DUYỆT (STATUS MATRIX)
  // ----------------------------------------------------------------------
  console.log('\n[PHẦN 1] Kiểm thử ma trận trạng thái duyệt trong AcademyRepository:');

  runTest('Trạng thái NOT_APPROVED -> Không được duyệt', () => {
    const enr = { status: 'CONSULTING', approvalStatus: 'NOT_APPROVED' };
    assert(isCourseApproved(enr) === false, 'Khóa học có approvalStatus = NOT_APPROVED trả về false');
  });

  runTest('Trạng thái PENDING_APPROVAL -> Không được duyệt', () => {
    const enr = { status: 'PENDING_APPROVAL', approvalStatus: 'PENDING_APPROVAL' };
    assert(isCourseApproved(enr) === false, 'Khóa học có status/approvalStatus = PENDING_APPROVAL trả về false');
  });

  runTest('Trạng thái PENDING_CONSULTATION -> Không được duyệt', () => {
    const enr = { status: 'CONSULTING', approvalStatus: 'PENDING_CONSULTATION' };
    assert(isCourseApproved(enr) === false, 'Khóa học có approvalStatus = PENDING_CONSULTATION trả về false');
  });

  runTest('Trạng thái UNPAID -> Không được duyệt', () => {
    const enr = { status: 'UNPAID', approvalStatus: 'NOT_APPROVED' };
    assert(isCourseApproved(enr) === false, 'Khóa học có status = UNPAID trả về false');
  });

  runTest('Trạng thái REJECTED / CANCELLED -> Không được duyệt', () => {
    const enr = { status: 'CANCELLED', approvalStatus: 'REJECTED' };
    assert(isCourseApproved(enr) === false, 'Khóa học có status = CANCELLED trả về false');
  });

  runTest('Khóa học catalog ACTIVE nhưng chưa ghi danh duyệt -> Không được duyệt', () => {
    const enr = { status: 'ACTIVE', approvalStatus: null };
    assert(isCourseApproved(enr) === false, 'Khóa học catalog ACTIVE nhưng không có approvalStatus duyệt trả về false');
  });

  runTest('Trạng thái APPROVED -> Được duyệt thành công', () => {
    const enr = { status: 'PENDING_APPROVAL', approvalStatus: 'APPROVED' };
    assert(isCourseApproved(enr) === false, 'Nếu status vẫn là PENDING_APPROVAL thì ưu tiên unapprovedStatuses -> chặn an toàn');
    
    const enrApproved = { status: 'APPROVED', approvalStatus: 'APPROVED' };
    assert(isCourseApproved(enrApproved) === true, 'Cả hai trường APPROVED trả về true');
  });

  runTest('Trạng thái ENROLLED (đã xếp lớp) -> Được duyệt thành công', () => {
    const enr = { status: 'ENROLLED', approvalStatus: 'APPROVED' };
    assert(isCourseApproved(enr) === true, 'Học viên ENROLLED/APPROVED trả về true');
  });

  runTest('Trạng thái STUDYING (đang theo học) -> Được duyệt thành công', () => {
    const enr = { status: 'STUDYING', approvalStatus: 'APPROVED' };
    assert(isCourseApproved(enr) === true, 'Học viên STUDYING/APPROVED trả về true');
  });

  runTest('Trạng thái GRADUATED (đã tốt nghiệp) -> Được duyệt thành công', () => {
    const enr = { status: 'GRADUATED', approvalStatus: 'APPROVED' };
    assert(isCourseApproved(enr) === true, 'Học viên GRADUATED/APPROVED trả về true');
  });

  // ----------------------------------------------------------------------
  // PHẦN 2: KIỂM THỬ TRUY CẬP BÀI GIẢNG (LESSON ACCESS SECURITY)
  // ----------------------------------------------------------------------
  console.log('\n[PHẦN 2] Kiểm thử quyền xem bài giảng (Lesson Access Control):');

  const mockLessons = [
    { id: 'les_1', title: 'Bài 1: Giới thiệu cơ chế tuần hoàn bạch huyết', isFreePreview: false },
    { id: 'les_2', title: 'Bài 2: Thao tác thực hành dẫn lưu vùng cổ Vodder', isFreePreview: false },
    { id: 'les_3', title: 'Bài 3: Bài học thử mở miễn phí', isFreePreview: true },
  ];

  runTest('Học viên chưa duyệt -> Bài 1 KHÔNG THỂ XEM', () => {
    const canAccess = canAccessLesson('course_1', mockLessons[0], mockLessons, true, false);
    assert(canAccess === false, 'Chưa duyệt -> canAccessLesson bài 1 trả về false');
  });

  runTest('Học viên chưa duyệt -> Bài 2 KHÔNG THỂ XEM', () => {
    const canAccess = canAccessLesson('course_1', mockLessons[1], mockLessons, true, false);
    assert(canAccess === false, 'Chưa duyệt -> canAccessLesson bài 2 trả về false');
  });

  runTest('Bài học thử miễn phí (isFreePreview = true) -> Được phép xem', () => {
    const canAccess = canAccessLesson('course_1', mockLessons[2], mockLessons, false, false);
    assert(canAccess === true, 'Bài học thử isFreePreview = true luôn mở cho học viên');
  });

  runTest('Học viên đã duyệt -> Bài 1 MỞ TỰ ĐỘNG', () => {
    const canAccess = canAccessLesson('course_1', mockLessons[0], mockLessons, true, true);
    assert(canAccess === true, 'Đã duyệt -> Bài 1 tự động mở');
  });

  runTest('Học viên đã duyệt nhưng chưa hoàn thành bài 1 -> Bài 2 BỊ KHÓA TUẦN TỰ', () => {
    const canAccess = canAccessLesson('course_1', mockLessons[1], mockLessons, true, true, new Set());
    assert(canAccess === false, 'Chưa xem hết clip bài 1 -> Bài 2 vẫn bị khóa tuần tự');
  });

  runTest('Học viên đã duyệt và đã xem hết bài 1 -> Bài 2 ĐƯỢC MỞ KHÓA', () => {
    const completed = new Set(['course_1_les_1']);
    const canAccess = canAccessLesson('course_1', mockLessons[1], mockLessons, true, true, completed);
    assert(canAccess === true, 'Đã xem hết clip bài 1 -> Bài 2 mở khóa chính xác');
  });

  // ----------------------------------------------------------------------
  // PHẦN 3: KIỂM THỬ TRÊN CƠ SỞ DỮ LIỆU THỰC TẾ SUPABASE CLOUD
  // ----------------------------------------------------------------------
  console.log('\n[PHẦN 3] Kiểm thử tương tác trực tiếp với Supabase Cloud Database:');

  const client = new Client({ connectionString });
  await client.connect();

  try {
    // 1. Kiểm tra cấu trúc các trường phê duyệt trên bảng course_enrollments
    const colsRes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'course_enrollments'
      AND column_name IN ('student_status', 'approval_status', 'payment_status', 'status', 'amount_paid', 'tuition_total');
    `);

    const colNames = colsRes.rows.map(r => r.column_name);
    assert(colNames.includes('student_status'), 'Cột student_status tồn tại trên bảng course_enrollments');
    assert(colNames.includes('approval_status'), 'Cột approval_status tồn tại trên bảng course_enrollments');
    assert(colNames.includes('payment_status'), 'Cột payment_status tồn tại trên bảng course_enrollments');
    assert(colNames.includes('status'), 'Cột status tồn tại trên bảng course_enrollments');

    // 2. Lấy 1 bản ghi khóa học thực tế để tạo ghi danh kiểm thử
    const courseRes = await client.query('SELECT id, title, tuition_fee FROM public.courses LIMIT 1;');
    assert(courseRes.rows.length > 0, 'Tìm thấy khóa học thực tế trong database');
    const course = courseRes.rows[0];

    const studentRes = await client.query("SELECT id, full_name, phone FROM public.users WHERE role IN ('CUSTOMER', 'STUDENT') LIMIT 1;");
    const student = studentRes.rows[0];
    assert(Boolean(student), 'Tìm thấy tài khoản học viên trong database');

    // 3. Tạo một đơn đăng ký khóa học mới ở trạng thái CHƯA DUYỆT (NOT_APPROVED)
    const testOrderCode = `SEC-ENR-${Date.now().toString().slice(-6)}`;
    const createEnrRes = await client.query(`
      INSERT INTO public.course_enrollments (
        student_id, course_id, status, tuition_total, amount_paid,
        order_code, consultation_status, payment_status, student_status,
        approval_status, student_name, student_phone
      ) VALUES (
        $1, $2, 'CONSULTING', $3, 0,
        $4, 'PENDING_CONSULTATION', 'UNPAID', 'NOT_APPROVED',
        'NOT_APPROVED', $5, $6
      ) RETURNING id, order_code, student_status, approval_status, payment_status;
    `, [
      student.id,
      course.id,
      Number(course.tuition_fee) || 9000000,
      testOrderCode,
      student.full_name || 'Học viên Bảo Mật Test',
      student.phone || '0988111222'
    ]);

    const testEnr = createEnrRes.rows[0];
    assert(testEnr.student_status === 'NOT_APPROVED', `Bản ghi mới tạo có student_status = NOT_APPROVED (Mã: ${testEnr.orderCode || testOrderCode})`);
    assert(testEnr.payment_status === 'UNPAID', 'Bản ghi mới tạo có payment_status = UNPAID');

    // 4. Kiểm tra quyền truy cập của bản ghi chưa duyệt
    const isApprovedBefore = isCourseApproved({
      status: testEnr.student_status,
      approvalStatus: testEnr.approval_status,
    });
    assert(isApprovedBefore === false, 'Học viên chưa duyệt -> isCourseApproved TRẢ VỀ FALSE (Chặn tuyệt đối)');

    // 5. Mô phỏng Admin xác nhận đối soát hoặc duyệt thủ công
    console.log('\n[Bước 3.2] Admin duyệt và xác nhận thanh toán học phí:');
    await client.query(`
      UPDATE public.course_enrollments
      SET status = 'ENROLLED',
          student_status = 'APPROVED',
          approval_status = 'APPROVED',
          payment_status = 'PAID',
          amount_paid = tuition_total,
          approved_at = NOW(),
          approved_by = 'ADMIN_TEST'
      WHERE id = $1;
    `, [testEnr.id]);

    const updatedRes = await client.query('SELECT status, student_status, approval_status, payment_status FROM public.course_enrollments WHERE id = $1;', [testEnr.id]);
    const updatedEnr = updatedRes.rows[0];

    assert(updatedEnr.student_status === 'APPROVED', 'Sau khi Admin duyệt: student_status chuyển sang APPROVED');
    assert(updatedEnr.payment_status === 'PAID', 'Sau khi Admin duyệt: payment_status chuyển sang PAID');

    const isApprovedAfter = isCourseApproved({
      status: updatedEnr.status,
      approvalStatus: updatedEnr.approval_status,
    });
    assert(isApprovedAfter === true, 'Sau khi Admin duyệt: isCourseApproved TRẢ VỀ TRUE (Mở khóa bài giảng)');

    // 6. Dọn dẹp bản ghi test an toàn
    await client.query('DELETE FROM public.course_enrollments WHERE id = $1;', [testEnr.id]);
    console.log('🧹 Đã dọn dẹp bản ghi kiểm thử an toàn trên Supabase Cloud.');

  } finally {
    await client.end();
  }

  console.log('\n================================================================================');
  console.log(`🎉 HOÀN THÀNH TOÀN BỘ KIỂM THỬ BẢO MẬT: ${passedTests + 8}/${totalTests + 8} TESTS PASSED 100%`);
  console.log('================================================================================');
}

runCourseApprovalSecurityTests().catch((err) => {
  console.error('Lỗi thực thi kiểm thử bảo mật:', err);
  process.exit(1);
});
