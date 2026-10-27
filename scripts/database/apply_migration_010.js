const fs = require('fs');
const path = require('path');
const { Client } = require(path.join(__dirname, '../../backend/node_modules/pg'));

const connectionString = 'postgresql://postgres.wstvwushpwcdsmhpunvh:20051811buiH%40%40@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function applyMigration010() {
  console.log('=== ÁP DỤNG MIGRATION 010: BƯỚC 1 KHÓA BẢO VỆ KHẨN CẤP RLS ===\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();

  const sqlPath = path.join(__dirname, '../../database/migrations/010_step1_lock_zns_and_secure_medical_financial_rls.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    console.log('1. Đang thực thi SQL migration trên Supabase Cloud...');
    await client.query(sql);
    console.log('   ✅ Đã thực thi Migration 010 thành công!');

    // Kiểm tra lại bảng zns_config
    console.log('\n2. Kiểm tra trạng thái bảng zns_config:');
    const znsCheck = await client.query(`
      SELECT c.relrowsecurity, c.relforcerowsecurity 
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = 'zns_config';
    `);
    console.log('   * RLS enabled:', znsCheck.rows[0].relrowsecurity);

    const znsPols = await client.query(`
      SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'zns_config';
    `);
    console.log('   * Policies on zns_config:');
    znsPols.rows.forEach(p => console.log(`     - [${p.cmd}] "${p.policyname}" | Roles: ${JSON.stringify(p.roles)}`));

    // Kiểm tra lại các bảng y khoa & tài chính
    console.log('\n3. Kiểm tra các bảng Y khoa & Tài chính:');
    const tables = ['edema_assessments', 'treatment_journal', 'invoices', 'tuition_transactions', 'staff_commissions', 'inventory_consumption_logs', 'student_certificates', 'users'];
    for (const t of tables) {
      const pols = await client.query(`
        SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = $1;
      `, [t]);
      const anonPols = pols.rows.filter(p => p.roles.includes('anon'));
      const hasAnonWrite = anonPols.some(p => ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(p.cmd));
      console.log(`   * [${t}] Policies: ${pols.rows.length} | Có quyền GHI cho anon: ${hasAnonWrite ? '❌ CÓ (NGUY HIỂM)' : '✅ KHÔNG (ĐÃ CHẶN 100%)'}`);
    }

  } catch (err) {
    console.error('❌ Lỗi khi thực thi Migration 010:', err);
    throw err;
  } finally {
    await client.end();
  }
}

applyMigration010().catch(console.error);
