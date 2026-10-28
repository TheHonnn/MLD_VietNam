const { execSync } = require('child_process');
const path = require('path');

const defaultScripts = [
  { name: 'Giai đoạn 1: Chuyên môn Y khoa & Cấp Giấy chứng nhận (W16, W17, W06)', file: 'test_phase1_medical.js' },
  { name: 'Giai đoạn 2: Học viện Đào tạo, Trắc nghiệm Quiz & Video DRM (W11, W08, W09, W10)', file: 'test_phase2_academy.js' },
  { name: 'Giai đoạn 3: Thu ngân POS & Doanh thu, Khách hàng CRM (W07, W03, W04, W02)', file: 'test_phase3_pos_customers.js' },
  { name: 'Giai đoạn 4: Kho Định mức Tiêu hao BOM & Hoa hồng KTV (W15, W13)', file: 'test_phase4_bom_commissions.js' },
  { name: 'Giai đoạn 5: Quản trị Nội dung Portal CMS & Kênh Email Tự động (W18, Email)', file: 'test_phase5_portal_email.js' },
  { name: 'Giai đoạn 6: Mobile Flutter & Dữ liệu Thực Cẩm nang Y khoa (D09, Supabase)', file: 'test_phase6_mobile_guidelines.js' },
  { name: 'Giai đoạn 7: E2E Nghiệp vụ Admin Đặt Khóa học & Đặt lịch Spa Thực địa (W08, W05, W06, W07, W13, W15)', file: 'test_e2e_admin_course_and_spa.js' },
  { name: 'Giai đoạn 8: Vận hành Thật Doanh nghiệp - Zalo Cloud API, PDF Ký số & Excel XLSX (W14, W07, W16, W12)', file: 'test_step2_real_operations.js' },
  { name: 'Giai đoạn 9: Bảo mật Phân quyền Khóa học - Chặn Tuyệt đối Học viên Chưa Duyệt (Academy Security)', file: 'test_course_approval_security.js' },
  { name: 'Giai đoạn 10: Nghiệm thu Đầu cuối UAT 2 Kịch bản Thực địa (Học viện & Spa 100% Live DB)', file: 'test_step3_uat_acceptance.js' },
  { name: 'Giai đoạn 11: Kiểm thử An ninh RLS - Chặn Tuyệt đối Anon Key Đọc/Ghi Dữ liệu Nhạy cảm (PostgREST Security Audit)', file: 'test_step1_rls_security_verification.js' },
  { name: 'Giai đoạn 12: Tự động Refresh Zalo Token (OAuth v4) & Webhook Ngân Hàng Tự Động (E2E Bank Reconcile)', file: 'test_bank_webhook_and_zalo_refresh.js' },
  { name: 'Giai đoạn 13: Học viện - Vòng đời Khóa học 1 Năm, Tự động Khóa 365 Ngày & Gia hạn (Academy 365d Expiry)', file: 'test_phase2_365d_expiry.js' },
  { name: 'Giai đoạn 14: Tự động hóa 3 Email Templates Chuẩn & Ghi Log Thực địa (Email Notification & Audit Logs)', file: 'test_phase3_email_integration.js' },
  { name: 'Giai đoạn 15: Spa - Dual-Resource Capacity 6 Giường × 6 KTV, Ca 1 Tiếng, Auto-Release & Least-Busy (Spa DRC)', file: 'test_phase5_e2e_full_acceptance.js' },
  { name: 'Giai đoạn 16: E2E Đồng nhất Người dùng & Web-Admin - Bảo toàn Lý do Hủy & Giải phóng Tài nguyên', file: 'test_e2e_admin_user_consistency.js' },
];

const scripts = process.env.TEST_SCRIPTS_OVERRIDE
  ? JSON.parse(process.env.TEST_SCRIPTS_OVERRIDE)
  : defaultScripts;

console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
console.log('║       MLD VIỆT NAM - BÁO CÁO TỔNG HỢP KIỂM THỬ THỰC ĐỊA TRÊN DEVELOP               ║');
console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

let allSuccess = true;

scripts.forEach((s, idx) => {
  const filePath = path.join(__dirname, s.file);
  try {
    const out = execSync(`node "${filePath}"`, { stdio: 'pipe' }).toString();
    console.log(`[P${idx + 1}] ${s.name}`);
    console.log(out.trim());
    console.log('--------------------------------------------------------------------------------\n');
  } catch (err) {
    allSuccess = false;
    console.error(`❌ [ERROR] Lỗi khi chạy ${s.name}:`);
    if (err.stdout) console.error(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    console.log('--------------------------------------------------------------------------------\n');
  }
});

if (allSuccess) {
  console.log('🎉 TOÀN BỘ 16 GIAI ĐOẠN KIỂM THỬ TRÊN NHÁNH DEVELOP ĐỀU ĐẠT CHUẨN 100%!');
  process.exit(0);
} else {
  console.error('⚠️ CÓ GIAI ĐOẠN CHƯA ĐẠT CHUẨN. CẦN KIỂM TRA LẠI.');
  process.exit(1);
}

