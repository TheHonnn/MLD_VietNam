const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase6MobileGuidelinesTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 6: DỮ LIỆU ĐỘNG CẨM NANG MOBILE D09');
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
    console.log('--- TEST SUITE 1: Dữ Liệu Thực Cẩm Nang MLD (home_care_guidelines) ---');
    const guidelinesRes = await client.query('SELECT id, title, category, image_url, is_published FROM public.home_care_guidelines;');
    assert(guidelinesRes.rows.length > 0, `Nạp thành công ${guidelinesRes.rows.length} cẩm nang y khoa từ Supabase`);

    const allHaveTitle = guidelinesRes.rows.every(g => Boolean(g.title && g.title.trim()));
    assert(allHaveTitle, 'Tất cả tài liệu đều có tiêu đề hợp lệ chuẩn y khoa');

    const allHaveCategory = guidelinesRes.rows.every(g => Boolean(g.category && g.category.trim()));
    assert(allHaveCategory, 'Tất cả tài liệu đều được phân loại danh mục (Category) phục vụ bộ lọc');

    console.table(guidelinesRes.rows);

    console.log('\n===============================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 6:`);
    console.log(`   ĐẠT (PASS): ${passedTests} / ${totalTests} kiểm thử (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Lỗi kiểm thử Giai đoạn 6:', err);
  } finally {
    await client.end();
  }
}

runPhase6MobileGuidelinesTests();
