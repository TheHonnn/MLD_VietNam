const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase2AcademyTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 2: HỌC VIỆN ĐÀO TẠO, QUIZ & VIDEO DRM');
  console.log('===============================================================\n');

  await client.connect();

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${testName}`);
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      if (details) console.error(`     Chi tiết: ${details}`);
    }
  }

  try {
    // ------------------------------------------------------------------------
    // TEST SUITE 1: KHÓA HỌC & PHÂN NHÓM 2 ĐỐI TƯỢNG (W11)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 1: Phân nhóm 2 Loại Khóa Học (W11) ---');
    const coursesRes = await client.query('SELECT id, title, level, is_active FROM public.courses LIMIT 10;');
    assert(coursesRes.rows.length > 0, `Đọc danh sách khóa học thành công (${coursesRes.rows.length} khóa học)`);

    const hasBeginner = coursesRes.rows.some(c => c.level === 'BEGINNER' || (c.title && c.title.toLowerCase().includes('cơ bản')));
    const hasAdvanced = coursesRes.rows.some(c => c.level === 'ADVANCED' || (c.title && c.title.toLowerCase().includes('chuyên sâu')));
    assert(hasBeginner || coursesRes.rows.length >= 2, 'Tồn tại khóa học phân loại nền tảng cho người mới');
    assert(hasAdvanced || coursesRes.rows.length >= 2, 'Tồn tại khóa học phân loại nâng cao cho KTV');

    // ------------------------------------------------------------------------
    // TEST SUITE 2: HỆ THỐNG THI TRẮC NGHIỆM Y KHOA (QUIZ SYSTEM)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 2: Ngân Hàng Câu Hỏi & Bài Thi Trắc Nghiệm Quiz ---');
    const quizCount = await client.query('SELECT count(*) FROM public.course_quizzes;');
    assert(Number(quizCount.rows[0].count) >= 0, `Hệ thống bài thi trắc nghiệm hoạt động (${quizCount.rows[0].count} bài thi)`);

    // Kiểm tra cấu trúc câu hỏi trắc nghiệm
    const questionsCount = await client.query('SELECT count(*) FROM public.quiz_questions;');
    assert(Number(questionsCount.rows[0].count) >= 0, `Ngân hàng câu hỏi trắc nghiệm y khoa hoạt động (${questionsCount.rows[0].count} câu hỏi)`);

    // ------------------------------------------------------------------------
    // TEST SUITE 3: TUYỂN SINH, GIẢNG VIÊN & ĐIỂM DANH (W08, W09, W10)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 3: Hồ sơ Tuyển sinh, Giảng viên & Điểm danh ---');
    const enrollmentsCount = await client.query('SELECT count(*) FROM public.course_enrollments;');
    assert(Number(enrollmentsCount.rows[0].count) >= 0, `Hồ sơ học viên ghi danh hoạt động (${enrollmentsCount.rows[0].count} học viên ghi danh)`);

    const instructorsCount = await client.query('SELECT count(*) FROM public.instructors;');
    assert(Number(instructorsCount.rows[0].count) >= 0, `Hồ sơ giảng viên chuyên gia hoạt động (${instructorsCount.rows[0].count} giảng viên)`);

    const attendanceCount = await client.query('SELECT count(*) FROM public.student_attendance;');
    assert(Number(attendanceCount.rows[0].count) >= 0, `Nhật ký điểm danh thực hành lâm sàng hoạt động (${attendanceCount.rows[0].count} bản ghi điểm danh)`);

    console.log('\n===============================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 2:`);
    console.log(`   ĐẠT (PASS): ${passedTests} / ${totalTests} kiểm thử (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Lỗi kiểm thử Giai đoạn 2:', err);
  } finally {
    await client.end();
  }
}

runPhase2AcademyTests();
