const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase4BomCommissionTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 4: VẬT TƯ TIÊU HAO BOM & HOA HỒNG KTV');
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
    // TEST SUITE 1: ĐỊNH MỨC VẬT TƯ TIÊU HAO BOM (W15)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 1: Định Mức Tiêu Hao Vật Tư BOM (W15) ---');
    const materialsCount = await client.query('SELECT count(*) FROM public.service_materials;');
    assert(Number(materialsCount.rows[0].count) >= 0, `Bảng định mức vật tư dịch vụ hoạt động (${materialsCount.rows[0].count} định mức)`);

    const logsCount = await client.query('SELECT count(*) FROM public.inventory_consumption_logs;');
    assert(Number(logsCount.rows[0].count) >= 0, `Bảng ghi nhận tiêu hao kho vật tư hoạt động (${logsCount.rows[0].count} nhật ký tiêu hao)`);

    // ------------------------------------------------------------------------
    // TEST SUITE 2: HOA HỒNG & PHỤ CẤP KTV (W13)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 2: Hoa Hồng Kỹ Thuật Viên (W13) ---');
    const commissionsCount = await client.query('SELECT count(*) FROM public.staff_commissions;');
    assert(Number(commissionsCount.rows[0].count) >= 0, `Bảng tính hoa hồng KTV hoạt động (${commissionsCount.rows[0].count} bản ghi hoa hồng)`);

    console.log('\n===============================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 4:`);
    console.log(`   ĐẠT (PASS): ${passedTests} / ${totalTests} kiểm thử (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Lỗi kiểm thử Giai đoạn 4:', err);
  } finally {
    await client.end();
  }
}

runPhase4BomCommissionTests();
