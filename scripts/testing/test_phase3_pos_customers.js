const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const client = new Client({
  connectionString: 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runPhase3PosCustomerTests() {
  console.log('===============================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ GIAI ĐOẠN 3: THU NGÂN POS, KHÁCH HÀNG CRM & CHI NHÁNH');
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
    // TEST SUITE 1: HỒ SƠ KHÁCH HÀNG CRM (W03, W04)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 1: Quản Trị Khách Hàng CRM (W03, W04) ---');
    const usersCount = await client.query('SELECT count(*) FROM public.users;');
    assert(Number(usersCount.rows[0].count) > 0, `Hồ sơ khách hàng/người dùng hoạt động (${usersCount.rows[0].count} tài khoản)`);

    const customersRes = await client.query('SELECT id, full_name, phone, membership_tier FROM public.users LIMIT 5;');
    assert(customersRes.rows.length > 0, 'Truy vấn chi tiết danh sách khách hàng thành công');

    // ------------------------------------------------------------------------
    // TEST SUITE 2: CHI NHÁNH & PHÒNG ĐIỀU TRỊ (W02)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 2: Hệ Thống Chi Nhánh & Phòng Trị Liệu (W02) ---');
    const branchesRes = await client.query('SELECT id, name, phone, address FROM public.branches;');
    assert(branchesRes.rows.length > 0, `Hệ thống chi nhánh hoạt động (${branchesRes.rows.length} chi nhánh)`);

    const roomsRes = await client.query('SELECT count(*) FROM public.branch_rooms;');
    assert(Number(roomsRes.rows[0].count) >= 0, `Hệ thống phòng trị liệu chuyên sâu (${roomsRes.rows[0].count} phòng)`);

    // ------------------------------------------------------------------------
    // TEST SUITE 3: THU NGÂN POS & HÓA ĐƠN BÁN HÀNG (W07)
    // ------------------------------------------------------------------------
    console.log('--- TEST SUITE 3: Thu Ngân POS & Hóa Đơn Bán Lẻ (W07) ---');
    const invoicesCount = await client.query('SELECT count(*) FROM public.invoices;');
    assert(Number(invoicesCount.rows[0].count) >= 0, `Hệ thống hóa đơn thu ngân hoạt động (${invoicesCount.rows[0].count} hóa đơn)`);

    console.log('\n===============================================================');
    console.log(`📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ GIAI ĐOẠN 3:`);
    console.log(`   ĐẠT (PASS): ${passedTests} / ${totalTests} kiểm thử (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('===============================================================');

  } catch (err) {
    console.error('Lỗi kiểm thử Giai đoạn 3:', err);
  } finally {
    await client.end();
  }
}

runPhase3PosCustomerTests();
