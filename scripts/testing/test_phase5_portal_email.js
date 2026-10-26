const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase5PortalEmailTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 5: PORTAL CMS & KÊNH EMAIL TỰ ĐỘNG');
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
    // TEST SUITE 1: 4 MẪU EMAIL ĐÀO TẠO CHUẨN Y KHOA
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 1: Mẫu Email Đào Tạo Tự Động (email_templates) ---');
    const templatesRes = await client.query('SELECT id, name, subject, is_active FROM public.email_templates;');
    assert(templatesRes.rows.length >= 4, `Hệ thống nạp đủ ${templatesRes.rows.length} mẫu email nghiệp vụ y khoa`);

    const ids = templatesRes.rows.map(t => t.id);
    assert(ids.includes('COURSE_EXPIRY_WARNING'), 'Có mẫu email Cảnh báo thời hạn xem video bài giảng');
    assert(ids.includes('CONFIRMATION_ENROLLMENT'), 'Có mẫu email Xác nhận ghi danh & đặt cọc khóa học');
    assert(ids.includes('CLASS_SCHEDULE_REMINDER'), 'Có mẫu email Nhắc lịch học thực hành lâm sàng');
    assert(ids.includes('EXAM_RESULT_AND_CERTIFICATE'), 'Có mẫu email Thông báo kết quả thi & Cấp Giấy chứng nhận');

    // ------------------------------------------------------------------------
    // TEST SUITE 2: NHẬT KÝ GỬI EMAIL (email_logs)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 2: Ghi Nhận Nhật Ký Gửi Email (email_logs) ---');
    const insertLog = await client.query(`
      INSERT INTO public.email_logs (
        recipient_email, recipient_name, template_id, subject, body_html, status, sent_at
      ) VALUES (
        'hocvien.test@mldvietnam.vn', 'Học Viên Test', 'CONFIRMATION_ENROLLMENT',
        'MLD Việt Nam - Xác nhận đăng ký khóa học thành công', '<p>Nội dung xác nhận đăng ký khóa học</p>', 'SENT', CURRENT_TIMESTAMP
      ) RETURNING id, recipient_email, status;
    `);
    const createdLog = insertLog.rows[0];
    assert(createdLog && createdLog.id, 'Ghi nhận vết gửi email thành công vào bảng email_logs');
    assert(createdLog.status === 'SENT', 'Trạng thái gửi email ghi nhận là SENT');

    // Dọn dẹp log test
    await client.query('DELETE FROM public.email_logs WHERE id = $1;', [createdLog.id]);
    console.log('  🧹 Đã dọn dẹp bản ghi kiểm thử email log.\n');

    // ------------------------------------------------------------------------
    // TEST SUITE 3: NỘI DUNG CHIA SẺ PORTAL CMS (miniapp_shared_content)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 3: Quản Trị Nội Dung Portal CMS (miniapp_shared_content) ---');
    const sharedCount = await client.query('SELECT count(*) FROM public.miniapp_shared_content;');
    assert(Number(sharedCount.rows[0].count) >= 12, `Kho nội dung Portal CMS hoạt động (${sharedCount.rows[0].count} nội dung)`);

    console.log('\n===============================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 5:`);
    console.log(`   ĐẠT (PASS): ${passedTests} / ${totalTests} kiểm thử (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Lỗi kiểm thử Giai đoạn 5:', err);
  } finally {
    await client.end();
  }
}

runPhase5PortalEmailTests();
