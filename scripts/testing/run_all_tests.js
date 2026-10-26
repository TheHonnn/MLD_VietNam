const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  { name: 'Giai đoạn 1: Chuyên môn Y khoa & Cấp Giấy chứng nhận (W16, W17, W06)', file: 'test_phase1_medical.js' },
  { name: 'Giai đoạn 2: Học viện Đào tạo, Trắc nghiệm Quiz & Video DRM (W11, W08, W09, W10)', file: 'test_phase2_academy.js' },
  { name: 'Giai đoạn 3: Thu ngân POS & Doanh thu, Khách hàng CRM (W07, W03, W04, W02)', file: 'test_phase3_pos_customers.js' },
  { name: 'Giai đoạn 4: Kho Định mức Tiêu hao BOM & Hoa hồng KTV (W15, W13)', file: 'test_phase4_bom_commissions.js' },
  { name: 'Giai đoạn 5: Quản trị Nội dung Portal CMS & Kênh Email Tự động (W18, Email)', file: 'test_phase5_portal_email.js' },
  { name: 'Giai đoạn 6: Mobile Flutter & Dữ liệu Thực Cẩm nang Y khoa (D09, Supabase)', file: 'test_phase6_mobile_guidelines.js' },
];

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
  console.log('🎉 TOÀN BỘ 6 GIAI ĐOẠN KIỂM THỬ TRÊN NHÁNH DEVELOP ĐỀU ĐẠT CHUẨN 100%!');
} else {
  console.log('⚠️ CÓ GIAI ĐOẠN CHƯA ĐẠT CHUẨN. CẦN KIỂM TRA LẠI.');
}
